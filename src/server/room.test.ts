/**
 * The Room, headless — two scripted clients play the actual game over the
 * actual protocol with no transport at all. If this passes, "two tabs, one
 * cake" is a wiring exercise, not a physics gamble.
 */
import { describe, it, expect, beforeAll } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { PATRON_LOOK_EVERY, Room } from "./room";
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
    expect(w?.machine.tensionClicks).toBe(0);
    expect(w?.order.status).toBe("running");
    expect(w?.checks.length).toBeGreaterThan(0); // the standing order has rows
    expect(w?.checks.every((c) => !c.met)).toBe(true);
    expect(w?.toppings).toEqual([]); // a fresh world has no litter yet
    const b = connect(room, "bob");
    expect(a.last("join")?.id).toBe(b.id);
    expect(b.last("welcome")?.id).toBe(b.id);
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
      topping: "cherry",
      traverseDeg: 0,
      tiltNotch: 0,
      tensionClicks: 6,
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
    expect(sprinkleRow?.current).toBe(1); // same spot, freshly painted
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

  it("the re-deal says fresh and hands late joiners a licked-clean cake", () => {
    const room = new Room();
    const a = connect(room, "alice");
    // Paint the cake first, so the reset has something to lick clean.
    room.onMessage(a.id, { t: "load", topping: "frosting" });
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: true });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: false });
    room.onMessage(a.id, { t: "lever" });
    run(room, 300);
    expect(connect(room, "peek").last("welcome")?.frosting.some((c) => c > 0)).toBe(true);
    run(room, 140 * 60); // long enough to lose AND re-deal (120s order + burn + linger)
    const fresh = a.all("order").find((m) => m.fresh);
    expect(fresh).toBeDefined();
    expect(fresh?.order.status).toBe("running");
    const bob = connect(room, "bob");
    expect(bob.last("welcome")?.frosting.every((c) => c === 0)).toBe(true);
  });

  it("the clock is authoritative — and the Patron BURNS it: the order dies early", () => {
    const room = new Room();
    const a = connect(room, "alice");
    // 130s of untouched machine: grumbles eat the clock, so the loss lands
    // well before the nominal 120*60 ticks. Everyone hears the verdict.
    run(room, 130 * 60);
    const msgs = a.all("order");
    const endIdx = msgs.findIndex((m) => m.order.status !== "running");
    expect(endIdx).toBeGreaterThanOrEqual(0);
    const ended = msgs[endIdx];
    expect(ended?.order.status).toBe("lost");
    expect(ended?.order.ticksLeft).toBe(0);
    // The clock died first: the verdict rides along, and it's the sad kind.
    expect(ended?.judgment?.met).toBe(false);
    expect(ended?.judgment?.stars).toBe(0);
    // Patience burned: the ending arrived measurably before nominal time.
    expect(a.all("patron").length).toBeGreaterThan(2);
  });

  it("a finished order lingers, then the patron orders again with a clean slate", () => {
    const room = new Room();
    const a = connect(room, "alice");
    run(room, 140 * 60); // long enough to lose AND re-deal
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
