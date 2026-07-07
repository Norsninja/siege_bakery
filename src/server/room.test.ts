/**
 * The Room, headless — two scripted clients play the actual game over the
 * actual protocol with no transport at all. If this passes, "two tabs, one
 * cake" is a wiring exercise, not a physics gamble.
 */
import { describe, it, expect, beforeAll } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { Room } from "./room";
import { ORDER_SECONDS, PATRON_LOOK_EVERY } from "../game/tuning";
import { CRANK_TICKS_PER_CLICK, SCREW_TICKS_PER_NOTCH } from "../game/catapult";
import type { ServerMsg } from "../game/protocol";

interface FakeClient {
  id: number;
  inbox: ServerMsg[];
  /** Last message of a given type, if any. */
  last<T extends ServerMsg["t"]>(t: T): Extract<ServerMsg, { t: T }> | undefined;
  all<T extends ServerMsg["t"]>(t: T): Array<Extract<ServerMsg, { t: T }>>;
}

function connect(room: Room, name: string): FakeClient {
  const inbox: ServerMsg[] = [];
  const id = room.join((m) => inbox.push(m), name);
  return {
    id,
    inbox,
    last: (t) => inbox.filter((m) => m.t === t).pop() as never,
    all: (t) => inbox.filter((m) => m.t === t) as never,
  };
}

function run(room: Room, ticks: number): void {
  for (let i = 0; i < ticks; i++) room.tick();
}

describe("Room: the match, headless over protocol", () => {
  beforeAll(async () => {
    await RAPIER.init();
  });

  it("welcomes joiners with a full snapshot; tells the others", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const w = a.last("welcome");
    expect(w?.id).toBe(a.id);
    expect(w?.machines).toHaveLength(1); // dormant town 2: one machine
    expect(w?.machines[0]!.machine.tensionClicks).toBe(0);
    expect(w?.yourTown).toBe(0);
    expect(w?.order.status).toBe("running");
    expect(w?.checks.length).toBeGreaterThan(0); // the standing order has rows
    expect(w?.checks.every((c) => !c.met)).toBe(true);
    expect(w?.toppings).toEqual([]); // a fresh world has no litter yet
    const b = connect(room, "bob");
    expect(a.last("join")?.id).toBe(b.id);
    expect(b.last("welcome")?.id).toBe(b.id);
  });

  it("a nameless joiner (the ws driver) gets a fantasy name, deterministically", () => {
    const nameOf = (): string | undefined => {
      const room = new Room();
      const a = connect(room, "alice"); // a named host
      room.join(() => {}); // the driver joins with NO name (server/main.ts)
      return a.last("join")?.name;
    };
    const n1 = nameOf();
    const n2 = nameOf();
    expect(n1).toBeDefined();
    expect(n1).not.toMatch(/^baker /); // the "baker N" placeholder is retired
    expect(n1).toContain(" "); // "<First> <epithet…>"
    expect(n2).toBe(n1); // seeded stream → two replicas agree
  });

  it("relays poses to the other player, not back to the sender", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    room.onMessage(a.id, { t: "pose", pose: { x: 1, y: 0.86, z: 5, yaw: 0.3 } });
    run(room, 3);
    const bp = b.last("poses");
    expect(bp?.poses).toEqual([{ id: a.id, x: 1, y: 0.86, z: 5, yaw: 0.3 }]);
    // Alice has no pose from Bob yet, so she gets no poses message at all.
    expect(a.last("poses")).toBeUndefined();
  });

  it("two people cranking together is still one winch rate", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: true });
    room.onMessage(b.id, { t: "op", turn: 0, screw: 0, crank: true });
    // A few extra ticks so the 15Hz machine broadcast lands after the click.
    run(room, CRANK_TICKS_PER_CLICK + 4);
    const m = a.last("machine");
    expect(m?.state.tensionClicks).toBe(1); // not 2
  });

  it("opposite traverse turns cancel out", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    room.onMessage(a.id, { t: "op", turn: 1, screw: 0, crank: false });
    room.onMessage(b.id, { t: "op", turn: -1, screw: 0, crank: false });
    run(room, 120);
    expect(a.last("machine")?.state.traverseDeg).toBe(0);
  });

  it("the elevation screw works over the wire and tilts the frame", () => {
    const room = new Room();
    const a = connect(room, "alice");
    room.onMessage(a.id, { t: "op", turn: 0, screw: 1, crank: false });
    run(room, SCREW_TICKS_PER_NOTCH + 4);
    expect(a.last("machine")?.state.tiltNotch).toBe(1);
  });

  it("load edge is consumed once, not re-applied after firing", () => {
    const room = new Room();
    const a = connect(room, "alice");
    room.onMessage(a.id, { t: "load", topping: "cherry" });
    run(room, 2);
    expect(a.last("machine")?.state.loaded ?? null).toBeNull(); // 15Hz not due yet
    run(room, 4);
    expect(a.last("machine")?.state.loaded).toBe("cherry");
    room.onMessage(a.id, { t: "lever" });
    run(room, 6);
    expect(a.last("machine")?.state.loaded).toBeNull(); // fired, and no re-load
  });

  it("two bakers loading at once: nobody's topping evaporates (audit 2026-07-03)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    room.onMessage(a.id, { t: "load", topping: "cherry" });
    room.onMessage(b.id, { t: "load", topping: "lime" });
    run(room, 6);
    // First-joined wins the tie...
    expect(a.last("machine")?.state.loaded).toBe("cherry");
    room.onMessage(a.id, { t: "lever" });
    run(room, 6);
    // ...and Bob's lime was REJECTED, not destroyed: it enters the moment
    // the bucket empties.
    expect(a.last("machine")?.state.loaded).toBe("lime");
  });

  it("the full co-op shot: load, crank to 6, fire → shot broadcast → authoritative score", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    room.onMessage(a.id, { t: "load", topping: "cherry" });
    room.onMessage(b.id, { t: "op", turn: 0, screw: 0, crank: true });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(b.id, { t: "op", turn: 0, screw: 0, crank: false });
    room.onMessage(a.id, { t: "lever" });
    run(room, 1);
    const shotA = a.last("shot");
    const shotB = b.last("shot");
    expect(shotA).toEqual({
      t: "shot",
      town: 0, // WHERE FROM — replicas replay from TOWNS[town] (plans/11 §4)
      topping: "cherry",
      traverseDeg: 0,
      tiltNotch: 0,
      tensionClicks: 6,
      // The reserved seed S (plans/10) — minted per shot; replicas replay
      // bursts from it. Value is the Room's seeded stream, not pinned here.
      seed: expect.any(Number) as number,
    });
    expect(shotB).toEqual(shotA); // everyone spawns the same deterministic lob
    run(room, 600); // flight + skid + rest detection
    const scored = b.last("scored");
    expect(scored?.topping).toBe("cherry");
    expect(scored?.onCake).toBe(true); // 6 clicks is the pinned scoring window
    // The honest order has NO standing cherry row (the crown demand is the
    // only cherry row that ever exists, plans/07): the cherry rests on the
    // cake and counts for nothing — mistakes execute, they never block.
    expect(scored?.checks.every((c) => c.current === 0)).toBe(true);
    expect(scored?.order.status).toBe("running");
  });

  it("a sprinkle bag counts once the ground under it is frosted (plans/07)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const fire = (topping: string): void => {
      room.onMessage(a.id, { t: "load", topping });
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: true });
      run(room, CRANK_TICKS_PER_CLICK * 6);
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: false });
      room.onMessage(a.id, { t: "lever" });
      run(room, 600); // to rest (paint scores earlier; extra ticks harmless)
    };
    // Frost the tier-2 landing first, then drop sprinkles on the same arc —
    // the decorating order IS the strategy (frost first, then sprinkle).
    fire("frosting");
    const frostRow = a
      .last("scored")
      ?.checks.find((c) => c.req.kind === "frost-coverage");
    expect(frostRow?.current).toBeGreaterThan(0);
    fire("sprinkles");
    const sprinkleRow = a
      .last("scored")
      ?.checks.find((c) => c.req.kind === "on-frosting");
    // A BURST (plans/10) under the CONVERSION LAW (§8): one 40-grain pop
    // over the fresh splat and EVERY grain grips — 40/40 as surface
    // records, none left as bodies (pinned, deterministic; re-pin with
    // the density pick). The grip gate costs nothing on a clean burst:
    // the floor-crescent fix only ever refused floor impacts.
    expect(sprinkleRow?.current).toBe(40);
    // BATCHING (plans/10 §5): 40 grips are NOT 40 broadcasts — same-tick,
    // same-fate grips fold into one `scored` carrying a count. They cluster
    // over a handful of impact ticks (deterministically 7 messages here),
    // never forty, and the counts sum to the full 40. Without batching this
    // reads 40 single messages and the length assertion fails.
    const sprinkleScored = a.all("scored").filter((m) => m.topping === "sprinkles");
    expect(sprinkleScored.length).toBeLessThan(10);
    expect(sprinkleScored.some((m) => (m.count ?? 1) > 1)).toBe(true);
    expect(sprinkleScored.reduce((n, m) => n + (m.count ?? 1), 0)).toBe(40);
    // All 40 records ride the welcome (perch data for late joiners).
    const peek = connect(room, "peek").last("welcome");
    expect(peek?.stuck).toHaveLength(40);
    expect(peek?.stuck.every((s) => s.topping === "sprinkles")).toBe(true);
    // Each record carries the coats it gripped ON — non-zero (it stuck to
    // paint), so a late joiner rebuilds the FIXED perch height instead of
    // re-measuring a blob that may have grown since (plans/10 §8: no wizard
    // raises sprinkles). The full grip-vs-restore divergence needs a
    // frost-near-not-over geometry that's impractical to stage headless; this
    // guards the field is populated from the grip, not sent as 0.
    expect(peek?.stuck.every((s) => s.coats >= 1)).toBe(true);
  });

  it("burial un-counts: frosting over stuck sprinkles removes them — they are IN the cake (plans/10 §8)", () => {
    // THE BURIAL LAW, his words: "if they are not on top, they are
    // covered, and not on the cake — they would be IN the cake." This
    // replaces the retired knockability pin: the sprinkle eraser is now
    // paint over them, displacement traceable to the shot that did it.
    const room = new Room();
    const a = connect(room, "alice");
    const fire = (topping: string): void => {
      room.onMessage(a.id, { t: "load", topping });
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: true });
      run(room, CRANK_TICKS_PER_CLICK * 6);
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: false });
      room.onMessage(a.id, { t: "lever" });
      run(room, 600);
    };
    fire("frosting"); // paint the 6-click landing zone
    fire("sprinkles"); // burst over it → grips + nearby settles
    const before = a
      .last("scored")
      ?.checks.find((c) => c.req.kind === "on-frosting")?.current;
    expect(before).toBe(40); // the burst pin (see the test above)
    fire("frosting"); // the SAME arc: the splat covers the gripped patch
    const after = a
      .last("scored")
      ?.checks.find((c) => c.req.kind === "on-frosting")?.current;
    expect(after).toBe(2); // 38 buried under the fresh coat; 2 outside its
    // footprint survive on the patch edge (pinned, deterministic)
  });

  it("a stuck record's coats are LOCKED at grip — later frosting near it never re-raises the perch (plans/10 §8)", () => {
    // The anti-wizard property: a sprinkle sits at the height of the blob it
    // GRIPPED; frosting added near it later (not over it) must not float it up.
    // The welcome must report GRIP-time coats, not a value re-measured from the
    // current field. Isolated directly (a near-not-over SHOT is impractical to
    // aim — the splat radius 0.6 exceeds the 0.45 coats window, so anything
    // close enough to raise coats also buries): grip, then grow the field AT
    // the grip point WITHOUT the shot pipeline, so the burial filter never runs
    // and the record survives.
    const room = new Room();
    const a = connect(room, "alice");
    const fire = (topping: string): void => {
      room.onMessage(a.id, { t: "load", topping });
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: true });
      run(room, CRANK_TICKS_PER_CLICK * 6);
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: false });
      room.onMessage(a.id, { t: "lever" });
      run(room, 600);
    };
    fire("frosting"); // a 2-coat dollop on the landing zone
    fire("sprinkles"); // grip on it
    const first = connect(room, "one").last("welcome")?.stuck ?? [];
    expect(first.length).toBeGreaterThan(0);
    const g = first[0]!;
    const gripCoats = g.coats;
    // Grow the frosting right at the grip point (bypassing burial). A splat
    // there adds coats to the samples the record reads.
    const frosting = (room as unknown as {
      frosting: {
        paint(p: { x: number; y: number; z: number }, s: number): number;
        coatsNear(p: { x: number; y: number; z: number }): number;
      };
    }).frosting;
    frosting.paint({ x: g.x, y: g.y, z: g.z }, 5);
    const grown = frosting.coatsNear({ x: g.x, y: g.y, z: g.z });
    expect(grown).toBeGreaterThan(gripCoats); // the field really did grow — not vacuous
    // A joiner arriving NOW must still perch at the GRIP height, not the grown
    // one. Re-measuring would report `grown`; the stored grip value is the law.
    const later = connect(room, "two").last("welcome")?.stuck ?? [];
    expect(later[0]?.coats).toBe(gripCoats);
  });

  it("two independent rooms, identical inputs, CONVERGE (sync-shots-not-surfaces)", () => {
    // The friend-test foundation: the cake is never sent as a surface, only
    // as shot EVENTS (impact P, velocity V, seed S) — so any two replicas fed
    // the same shots must reconstruct the identical cake. Here two fresh Rooms
    // (each mints seeds from the same seeded stream) play the SAME script —
    // frost, a seeded sprinkle burst that grips, then a frosting glob that
    // BURIES part of it — and a late joiner's welcome must match byte-for-byte.
    // A single unseeded value, Map-order dependence, or the bury/add ordering
    // bug would split them.
    const play = (): Extract<ServerMsg, { t: "welcome" }> | undefined => {
      const room = new Room();
      const a = connect(room, "alice");
      const fire = (topping: string): void => {
        room.onMessage(a.id, { t: "load", topping });
        room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: true });
        run(room, CRANK_TICKS_PER_CLICK * 6);
        room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: false });
        room.onMessage(a.id, { t: "lever" });
        run(room, 600);
      };
      fire("frosting");
      fire("sprinkles"); // seeded burst → grips as records
      fire("frosting"); // buries part of the grip patch
      return connect(room, "peek").last("welcome");
    };
    const wA = play();
    const wB = play();
    expect(wA?.frosting).toEqual(wB?.frosting); // the scored surface
    expect(wA?.stuck).toEqual(wB?.stuck); // the sprinkle records + normals
    expect(wA?.toppings).toEqual(wB?.toppings); // the litter/obstacles
    expect(wA?.checks).toEqual(wB?.checks); // the checklist both would show
    // ...and it actually exercised the machinery, not two empty cakes.
    expect(wA?.frosting.some((c) => c > 0)).toBe(true);
    expect((wA?.stuck.length ?? 0)).toBeGreaterThan(0);
  });

  it("the second town is DORMANT until the unlockTown2 INPUT — idempotent, capped, town 0 untouched (plans/11 §1)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    type TownPeek = {
      machine: { tensionClicks: number; loaded: string | null };
      crankTicks: number;
    };
    const towns = (): TownPeek[] =>
      (room as unknown as { towns: TownPeek[] }).towns;
    // THE CORE LAW: the default is ONE town, always.
    expect(towns().length).toBe(1);
    room.onMessage(a.id, { t: "unlockTown2" });
    expect(towns().length).toBe(2);
    const second = towns()[1];
    // A fresh, unwound machine — never a copy of town 0's.
    expect(second!.machine.tensionClicks).toBe(0);
    expect(second!.machine.loaded).toBe(null);
    // Idempotent AND capped at the arena's town count.
    room.onMessage(a.id, { t: "unlockTown2" });
    room.onMessage(a.id, { t: "unlockTown2" });
    expect(towns().length).toBe(2);
    expect(towns()[1]).toBe(second); // repeats never re-create it
    // Town 0's play is untouched by activation: cranking winds ITS winch;
    // the crewless town 1 idles (owner-implicit filtering is step 5).
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: true });
    run(room, CRANK_TICKS_PER_CLICK * 3);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: false });
    expect(towns()[0]!.machine.tensionClicks).toBe(3);
    expect(towns()[1]!.machine.tensionClicks).toBe(0);
  });

  it("pickTown: LOCKED while running, open at order end, dormant forts unpickable, junk ignored (plans/11 §5)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const townOf = (): number =>
      (room as unknown as { roster: { townOf(id: number): number } }).roster.townOf(a.id);
    room.onMessage(a.id, { t: "unlockTown2" });
    // A running order locks the crew — you committed.
    room.onMessage(a.id, { t: "pickTown", town: 1 });
    expect(townOf()).toBe(0);
    // Run the clock out (the Giant burns it early; generous ceiling).
    let elapsed = 0;
    const cap = (ORDER_SECONDS + 60) * 60;
    while (elapsed < cap) {
      room.tick();
      elapsed++;
      const om = a.last("order");
      if (om && om.order.status !== "running") break;
    }
    expect(a.last("order")?.order.status).not.toBe("running");
    // The window is open. Junk is ignored whole, like any wire input —
    // and that includes a REAL town index the fort count doesn't reach.
    room.onMessage(a.id, { t: "pickTown", town: 5 });
    room.onMessage(a.id, { t: "pickTown", town: -1 });
    room.onMessage(a.id, { t: "pickTown", town: 0.5 });
    expect(townOf()).toBe(0);
    // The honest pick is honored; picking home again is honored too.
    room.onMessage(a.id, { t: "pickTown", town: 1 });
    expect(townOf()).toBe(1);
    room.onMessage(a.id, { t: "pickTown", town: 0 });
    expect(townOf()).toBe(0);
  });

  it("a DORMANT town cannot be crewed: pickTown 1 before unlock is refused", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const townOf = (): number =>
      (room as unknown as { roster: { townOf(id: number): number } }).roster.townOf(a.id);
    // Reach the open window WITHOUT unlocking.
    let elapsed = 0;
    const cap = (ORDER_SECONDS + 60) * 60;
    while (elapsed < cap) {
      room.tick();
      elapsed++;
      const om = a.last("order");
      if (om && om.order.status !== "running") break;
    }
    room.onMessage(a.id, { t: "pickTown", town: 1 });
    expect(townOf()).toBe(0); // the fort exists as scenery; the CREW slot doesn't
  });

  it("owner-implicit routing: two crews, two winches, one tick (plans/11 §4)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    type TownPeek = { machine: { tensionClicks: number; traverseDeg: number } };
    const towns = (): TownPeek[] =>
      (room as unknown as { towns: TownPeek[] }).towns;
    room.onMessage(a.id, { t: "unlockTown2" });
    // Alice moves to town 1 through the order-end window.
    let elapsed = 0;
    const cap = (ORDER_SECONDS + 60) * 60;
    while (elapsed < cap) {
      room.tick();
      elapsed++;
      const om = a.last("order");
      if (om && om.order.status !== "running") break;
    }
    room.onMessage(a.id, { t: "pickTown", town: 1 });
    // Both crank at once — each winds ONLY their own winch; and bob turns
    // his traverse while alice holds hers straight.
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: true });
    room.onMessage(b.id, { t: "op", turn: 1, screw: 0, crank: true });
    run(room, CRANK_TICKS_PER_CLICK * 2);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: false });
    room.onMessage(b.id, { t: "op", turn: 0, screw: 0, crank: false });
    expect(towns()[0]!.machine.tensionClicks).toBe(2); // bob's, town 0
    expect(towns()[1]!.machine.tensionClicks).toBe(2); // alice's, town 1
    expect(towns()[0]!.machine.traverseDeg).toBeGreaterThan(0); // bob turned
    expect(towns()[1]!.machine.traverseDeg).toBe(0); // alice didn't
  });

  it("the wire knows WHERE FROM: a town-1 shot carries its town and lands on the SHARED cake (step 6)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    room.onMessage(a.id, { t: "unlockTown2" });
    // Reach the pick window (the Giant burns the clock early).
    let elapsed = 0;
    const cap = (ORDER_SECONDS + 60) * 60;
    while (elapsed < cap) {
      room.tick();
      elapsed++;
      const om = a.last("order");
      if (om && om.order.status !== "running") break;
    }
    room.onMessage(a.id, { t: "pickTown", town: 1 });
    // A late joiner's welcome now carries BOTH machines; joiners start home.
    const peek = connect(room, "peek");
    expect(peek.last("welcome")?.machines).toHaveLength(2);
    expect(peek.last("welcome")?.yourTown).toBe(0);
    // Alice fires her fort's 6-click cake shot — the pinned scoring window,
    // rotated — all inside the linger window (crank 270t + flight ≈ 520t
    // of the 600t linger).
    room.onMessage(a.id, { t: "load", topping: "cherry" });
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: true });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: false });
    room.onMessage(a.id, { t: "lever" });
    run(room, 1);
    const shot = a.last("shot");
    expect(shot?.town).toBe(1); // where from — the replay origin
    expect(shot?.tensionClicks).toBe(6);
    // ...and the Room's own copy lands ON the shared cake: the rotated
    // fort fires TOWARD the middle (facing through the whole room path),
    // resting on the FAR hemisphere — town 1's near side.
    run(room, 248);
    type Settled = { topping: string; onCake: boolean; pos: { z: number } };
    const cherry = (room as unknown as { settled: Settled[] }).settled.find(
      (s) => s.topping === "cherry",
    );
    expect(cherry?.onCake).toBe(true);
    expect(cherry!.pos.z).toBeLessThan(-30); // beyond the cake axis
  });

  it("late joiners are welcomed with the world as it lies (F2, plans/06)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    // Land one cherry (the pinned 6-click tier-2 shot), then fire a second
    // and join Carol MID-FLIGHT: the welcome must carry the settled topping
    // and NOT the one still in the air (its own `shot` event announced it).
    room.onMessage(a.id, { t: "load", topping: "cherry" });
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: true });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: false });
    room.onMessage(a.id, { t: "lever" });
    run(room, 600); // flight + rest
    room.onMessage(a.id, { t: "load", topping: "lime" });
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: true });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: false });
    room.onMessage(a.id, { t: "lever" });
    run(room, 30); // the lime is airborne
    const carol = connect(room, "carol");
    const w = carol.last("welcome");
    expect(w?.toppings).toHaveLength(1);
    expect(w?.toppings[0]?.topping).toBe("cherry");
    // Resting on the middle tier, where the pinned ladder put it.
    expect(w?.toppings[0]?.y).toBeGreaterThan(3.4);
  });

  it("a frosting glob scores at IMPACT and paints the welcome snapshot (plans/07)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    room.onMessage(a.id, { t: "load", topping: "frosting" });
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: true });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: false });
    room.onMessage(a.id, { t: "lever" });
    run(room, 300); // flight to impact — no rest wait for paint
    const scored = a.last("scored");
    expect(scored?.topping).toBe("frosting");
    expect(scored?.onCake).toBe(true); // the 6-click arc splats the tiers
    // The glob was consumed: a late joiner inherits PAINT, not a body.
    const carol = connect(room, "carol");
    const w = carol.last("welcome");
    expect(w?.toppings).toEqual([]);
    expect(w?.frosting.some((c) => c > 0)).toBe(true);
  });

  it("fudge is a real pantry row: it loads, flies, and PAINTS (plans/10 §4)", () => {
    // The shipped fudge row's shape is unit-pinned (game/toppings.test.ts);
    // this proves it is WIRED end-to-end — isPaint('fudge'), consumed on
    // impact, painting the field under its own splat law — a legal
    // shelf-fudge load that no test fired before (audit 2026-07-06).
    const room = new Room();
    const a = connect(room, "alice");
    room.onMessage(a.id, { t: "load", topping: "fudge" });
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: true });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: false });
    room.onMessage(a.id, { t: "lever" });
    run(room, 300);
    const scored = a.last("scored");
    expect(scored?.topping).toBe("fudge");
    expect(scored?.onCake).toBe(true); // consumed on impact, painted the tier
    const carol = connect(room, "carol");
    expect(carol.last("welcome")?.frosting.some((c) => c > 0)).toBe(true);
  });

  it("the re-deal wheels out a FRESH CAKE: paint and on-cake solids go, floor litter stays", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const fire = (topping: string): void => {
      room.onMessage(a.id, { t: "load", topping });
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: true });
      run(room, CRANK_TICKS_PER_CLICK * 6);
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: false });
      room.onMessage(a.id, { t: "lever" });
      run(room, 600);
    };
    // Dress the DOOMED cake: paint, a resting cherry on the tiers — and a
    // dry-release lime FLOP onto the floor (the crew's mess).
    fire("frosting");
    fire("cherry");
    room.onMessage(a.id, { t: "load", topping: "lime" });
    run(room, 6);
    room.onMessage(a.id, { t: "lever" }); // zero tension: flops by the plinth
    run(room, 600);
    const peek = connect(room, "peek").last("welcome");
    expect(peek?.frosting.some((c) => c > 0)).toBe(true);
    expect(peek?.toppings.map((t) => t.topping).sort()).toEqual(["cherry", "lime"]);
    run(room, (ORDER_SECONDS + 20) * 60); // lose (burn ends it early) AND re-deal
    const fresh = a.all("order").find((m) => m.fresh);
    expect(fresh).toBeDefined();
    expect(fresh?.order.status).toBe("running");
    // The fresh-cake law: the dessert left with everything ON it; the
    // floor lime remains — the bakery gets messier, the cake never does.
    const bob = connect(room, "bob");
    expect(bob.last("welcome")?.frosting.every((c) => c === 0)).toBe(true);
    expect(bob.last("welcome")?.toppings.map((t) => t.topping)).toEqual(["lime"]);
  });

  it("the clock is authoritative — and the Patron BURNS it: the order dies EARLY", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const nominal = ORDER_SECONDS * 60;
    // Untouched machine: no player, no mess — the Giant just grumbles, and
    // each grumble burns PATIENCE_BURN_GRUMBLE_S off the clock. Tick one at
    // a time until the order ends, counting how long it ACTUALLY survived.
    let elapsed = 0;
    const cap = nominal + 60 * 60; // a generous ceiling; it must end first
    while (elapsed < cap) {
      room.tick();
      elapsed++;
      const om = a.last("order");
      if (om && om.order.status !== "running") break;
    }
    const ended = a.last("order");
    expect(ended?.order.status).toBe("lost");
    expect(ended?.order.ticksLeft).toBe(0);
    // The clock died first: the verdict rides along, and it's the sad kind.
    expect(ended?.judgment?.met).toBe(false);
    expect(ended?.judgment?.stars).toBe(0);
    // THE REAL PREDICATE (audit 2026-07-06): patience was burned, so the
    // order died MEASURABLY before nominal — deterministically 240s of the
    // nominal 300 (60s burned). The OLD assertion (patron.length > 2)
    // passed on the 12s look cadence alone and never measured "early":
    // delete the burning and `elapsed` is exactly `nominal`, which this now
    // catches. 30s is the safe floor against the seeded whim variance.
    expect(elapsed).toBeLessThan(nominal - 30 * 60);
    // ...but it did not die instantly for some unrelated reason.
    expect(elapsed).toBeGreaterThan(60 * 60);
    // And everyone still heard the Giant on the way down.
    expect(a.all("patron").length).toBeGreaterThan(2);
  });

  it("a finished order lingers, then the patron orders again with a clean slate", () => {
    const room = new Room();
    const a = connect(room, "alice");
    run(room, (ORDER_SECONDS + 20) * 60); // long enough to lose AND re-deal
    const msgs = a.all("order");
    const endIdx = msgs.findIndex((m) => m.order.status !== "running");
    expect(endIdx).toBeGreaterThanOrEqual(0);
    const fresh = msgs.slice(endIdx + 1).find((m) => m.order.status === "running");
    expect(fresh).toBeDefined();
    // The ledger reset with the order: a fresh deal counts fresh deliveries.
    expect(fresh?.checks.every((c) => c.current === 0)).toBe(true);
  });

  it("the Patron looks on cadence and everyone hears the same words", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    run(room, PATRON_LOOK_EVERY - 2);
    expect(a.all("patron")).toHaveLength(0); // he hasn't looked yet
    run(room, 4);
    expect(a.all("patron")).toHaveLength(1);
    const heardA = a.last("patron");
    const heardB = b.last("patron");
    expect(heardA?.text.length).toBeGreaterThan(0);
    expect(heardB).toEqual(heardA); // one voice, every ear
    // The amended/corrected order follows the voice immediately.
    expect(a.last("order")?.order.status).toBe("running");
    run(room, PATRON_LOOK_EVERY);
    expect(a.all("patron")).toHaveLength(2);
    expect(a.all("patron")[1]?.seq).toBe(2);
  });

  it("leavers stop receiving; the rest are told", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    room.leave(b.id);
    expect(a.last("leave")?.id).toBe(b.id);
    const before = b.inbox.length;
    run(room, 10);
    expect(b.inbox.length).toBe(before);
    expect(room.memberCount()).toBe(1);
  });

  it("the WIN path over protocol: frost → sprinkles → demand → crown → WON → fresh deal (audit 2026-07-03)", () => {
    // The O2 scripted playthrough, re-bodied as a permanent Room test —
    // the only Room-level ending pinned before this was loss-by-clock.
    const room = new Room();
    const a = connect(room, "alice");
    const op = (turn: -1 | 0 | 1, screw: -1 | 0 | 1, crank: boolean): void =>
      room.onMessage(a.id, { t: "op", turn, screw, crank });
    const crankTo = (clicks: number): void => {
      op(0, 0, true);
      run(room, CRANK_TICKS_PER_CLICK * clicks);
      op(0, 0, false);
      run(room, 1);
    };
    const screw = (dir: -1 | 1): void => {
      op(0, dir, false);
      run(room, SCREW_TICKS_PER_NOTCH + 2);
      op(0, 0, false);
      run(room, 1);
    };
    const turnTicks = (dir: -1 | 1, ticks: number): void => {
      op(dir, 0, false);
      run(room, ticks);
      op(0, 0, false);
      run(room, 1);
    };
    const fire = (topping: string, clicks: number, wait: number): void => {
      room.onMessage(a.id, { t: "load", topping });
      run(room, 1);
      crankTo(clicks);
      room.onMessage(a.id, { t: "lever" });
      run(room, wait); // paint scores ~170 ticks out; solids need rest
    };
    const lastChecks = () => {
      for (let i = a.inbox.length - 1; i >= 0; i--) {
        const m = a.inbox[i]!;
        if (m.t === "order" || m.t === "scored" || m.t === "welcome")
          return m.checks;
      }
      return [];
    };
    // Traverse bookkeeping: the wheel moves 0.5°/tick, so degrees → ticks
    // is exact. The script tracks where it left the wheel.
    let trav = 0;
    const turnTo = (deg: number): void => {
      const ticks = Math.round((deg - trav) * 2);
      if (ticks !== 0) turnTicks(ticks > 0 ? 1 : -1, Math.abs(ticks));
      trav = deg;
    };
    // The decorating line: the first 13 greedy picks of the ceiling study
    // (research/06) — the small-splat economy's pass needs ~139 of 661
    // samples (frac 0.5 × potential 0.42), and these 13 arcs union past
    // it (measured 0.566 effective). MANY SHOTS IS THE GAME now (plans/08);
    // re-run the study and re-cut this table when splats or census move.
    // BURIAL CHOREOGRAPHY (the conversion law, plans/10 §8, replacing the
    // old live-truth ordering note): sprinkles fire AFTER the whole frost
    // line, because a later glob whose splat covers a stuck sprinkle
    // BURIES it — the record leaves, the count drops ("if they are not on
    // top, they are IN the cake"). Sprinkles-last IS the strategy now.
    turnTo(-1.5);
    fire("frosting", 6, 300);
    turnTo(-1);
    fire("frosting", 7, 300);
    turnTo(-3);
    fire("frosting", 5, 300);
    turnTo(-8.5);
    fire("frosting", 6, 300);
    turnTo(5.5);
    fire("frosting", 7, 300);
    screw(1); // the notch-1 half of the pick list
    turnTo(10);
    fire("frosting", 8, 300);
    turnTo(8);
    fire("frosting", 7, 300);
    turnTo(6);
    fire("frosting", 8, 300);
    turnTo(-0.5);
    fire("frosting", 8, 300);
    fire("frosting", 7, 300);
    turnTo(-6);
    fire("frosting", 8, 300);
    turnTo(-8);
    fire("frosting", 7, 300);
    turnTo(-10.5);
    fire("frosting", 8, 300);
    expect(lastChecks().find((c) => c.req.kind === "frost-coverage")?.met).toBe(
      true,
    );
    // The sky is clear and every splat is down: NOW the sprinkles (burial
    // choreography above). Burst 1 on the center's rich paint, burst 2 on
    // the flank's — two good bursts IS the economy (game/tuning.ts).
    screw(-1);
    turnTo(-1.5);
    fire("sprinkles", 6, 650);
    // Burst 1 on the center's rich paint: 40/40 grip (pinned — with
    // sprinkles fired LAST there are no fly-by wakes and no burials;
    // stuck records cannot be shoved at all). One burst alone can't meet
    // the 60-grain ask.
    expect(lastChecks().find((c) => c.req.kind === "on-frosting")?.current).toBe(
      40,
    );
    turnTo(-8.5);
    fire("sprinkles", 6, 650);
    // Burst 2 on the flank: cumulative 80 of the ask (pinned — a perfect
    // two-burst delivery) — two good bursts IS the economy (tuning.ts).
    expect(lastChecks().find((c) => c.req.kind === "on-frosting")?.current).toBe(
      80,
    );
    expect(lastChecks().find((c) => c.req.kind === "on-frosting")?.met).toBe(
      true,
    );
    // The Giant demanded his crown along the way — progress-triggered at
    // a LOOK (12s cadence): the two burst waits span more than one look
    // window, so by here the demand has certainly landed.
    expect(lastChecks().some((c) => c.req.kind === "crown")).toBe(true);
    screw(1);
    turnTo(0);
    fire("cherry", 8, 650); // the tier-clearing crown shot
    const end = a.all("order").find((m) => m.order.status === "won");
    expect(end).toBeDefined();
    expect(end?.judgment?.accepted).toBe(true);
    // Stars come from the coverage tiers now (plans/08): meeting the ask
    // is a PASS — one star. The upper tiers are the ceiling's asymptote.
    expect(end?.judgment?.stars).toBe(1);
    expect(end?.judgment?.effectiveCoverage).toBeGreaterThanOrEqual(0.5);
    // The linger passes; the fresh deal starts honestly unmet.
    run(room, 700);
    const fresh = a.all("order").find((m) => m.fresh);
    expect(fresh?.order.status).toBe("running");
    expect(fresh?.checks.every((c) => c.current === 0 && !c.met)).toBe(true);
  });

  it("a joiner mid-banner is welcomed with the verdict (audit 2026-07-03)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    let guard = 0;
    while (
      (a.last("order")?.order.status ?? "running") === "running" &&
      guard++ < (ORDER_SECONDS + 10) * 60
    )
      room.tick();
    run(room, 100); // deep in the linger — the banner is up
    const carol = connect(room, "carol");
    const w = carol.last("welcome");
    expect(w?.order.status).toBe("lost");
    expect(w?.judgment?.met).toBe(false); // the verdict rides the welcome
    expect(w?.judgment?.stars).toBe(0);
    // Once the fresh order deals, welcomes stop carrying a verdict.
    run(room, 600);
    const dave = connect(room, "dave");
    expect(dave.last("welcome")?.order.status).toBe("running");
    expect(dave.last("welcome")?.judgment).toBeUndefined();
  });

  it("a glob fired during the linger cannot paint the NEXT order (audit 2026-07-03)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    // Wind full tension while the order still runs — tension persists.
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: true });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: false });
    // Let the patience-burned clock kill the order.
    let guard = 0;
    while (
      (a.last("order")?.order.status ?? "running") === "running" &&
      guard++ < (ORDER_SECONDS + 10) * 60
    )
      room.tick();
    expect(a.last("order")?.order.status).toBe("lost");
    // Deep in the 600-tick linger, fire a frosting glob timed to be IN
    // FLIGHT when the room deals fresh (6-click impact is ~170 ticks out).
    run(room, 520);
    room.onMessage(a.id, { t: "load", topping: "frosting" });
    run(room, 1);
    room.onMessage(a.id, { t: "lever" });
    run(room, 500); // re-deal (~79 ticks) then the stale glob lands
    const fresh = a.all("order").find((m) => m.fresh);
    expect(fresh).toBeDefined();
    // The stale glob scored nothing: no delivery after the fresh deal...
    const freshAt = a.inbox.indexOf(fresh!);
    expect(a.inbox.slice(freshAt).filter((m) => m.t === "scored")).toEqual([]);
    // ...and the authoritative field is still the fresh cake's, clean.
    const peek = connect(room, "peek");
    expect(peek.last("welcome")?.frosting.every((c) => c === 0)).toBe(true);
  });

  // The wire is typed but the internet is not (checkpoint audit 2026-07-03):
  // the friend test exposes the room to every port-scanner on earth, so the
  // Room's field boundary is part of the match rules now.
  describe("hostile wire input stops at the Room's boundary", () => {
    it("a malformed pose is dropped whole; junk fields never ride the relay", () => {
      const room = new Room();
      const a = connect(room, "alice");
      const b = connect(room, "bob");
      room.onMessage(a.id, { t: "pose" } as never); // no pose at all
      room.onMessage(a.id, { t: "pose", pose: { x: NaN, y: 0, z: 0, yaw: 0 } });
      run(room, 6);
      expect(b.last("poses")).toBeUndefined(); // neither one survived
      room.onMessage(a.id, {
        t: "pose",
        pose: { x: 1, y: 2, z: 3, yaw: 0.5, junk: "x".repeat(64) } as never,
      });
      run(room, 3);
      // Exactly the four known fields relay — nothing a client packed in.
      expect(b.last("poses")?.poses).toEqual([
        { id: a.id, x: 1, y: 2, z: 3, yaw: 0.5 },
      ]);
    });

    it("an off-table load never reaches the bucket (or the eternal ledger)", () => {
      const room = new Room();
      const a = connect(room, "alice");
      for (const topping of ["__proto__", "toString", "anvil", 7 as never])
        room.onMessage(a.id, { t: "load", topping: topping as string });
      run(room, 6);
      expect(a.last("machine")?.state.loaded ?? null).toBeNull();
    });

    it("garbage op fields normalize to idle, not to motion", () => {
      const room = new Room();
      const a = connect(room, "alice");
      room.onMessage(a.id, {
        t: "op",
        turn: 5,
        screw: -9,
        crank: "yes",
      } as never);
      run(room, 120);
      const m = a.last("machine");
      expect(m?.state.traverseDeg).toBe(0);
      expect(m?.state.tiltNotch).toBe(0);
      expect(m?.state.tensionClicks).toBe(0);
    });
  });
});
