/**
 * The Room, headless — two scripted clients play the actual game over the
 * actual protocol with no transport at all. If this passes, "two tabs, one
 * cake" is a wiring exercise, not a physics gamble.
 */
import { describe, it, expect, beforeAll } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { Room } from "./room";
import { READY_CIRCLE } from "../core/arena";
import {
  CREW_LABOR,
  FLOOR_COVERAGE,
  FLOURISH_BONUS_COINS,
  ORDER_RESET_TICKS,
  ORDER_SECONDS,
  PATRON_LOOK_EVERY,
  READY_COUNTDOWN_TICKS,
  RUNOVER_TICKS,
  TOWN2_PRICE,
} from "../game/tuning";
import {
  createCatapult,
  CRANK_TICKS_PER_CLICK,
  SCREW_TICKS_PER_NOTCH,
  TENSION_MAX_CLICKS,
} from "../game/catapult";
import { rungRow, type Rung } from "../game/campaign";
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

/** THE RUN CONTAINER preamble (plans/13 slice 1): a Room boots into the
 * LOBBY — the order neither ticks nor scores until every joined baker
 * stands in the ready circle through the countdown. Order-lifecycle
 * tests ready up first; machine-only tests need not (the lobby is a
 * sandbox: machines crank and fire fine). NOTE the poses STAY in the
 * circle afterward — so when a run ends, the still-gathered crew starts
 * the next one automatically after RUNOVER_TICKS + the countdown; the
 * post-loss tests lean on exactly that (it is the intended party flow). */
function readyUp(room: Room, ...clients: FakeClient[]): void {
  for (const c of clients)
    room.onMessage(c.id, {
      t: "pose",
      pose: { x: READY_CIRCLE.x, y: 1.2, z: READY_CIRCLE.z, yaw: 0 },
    });
  run(room, READY_COUNTDOWN_TICKS + 2);
}

/** THE RUNG-3 SEAM (plans/13 slice 4): re-anchor a live test onto THE
 * ANCHOR. The ladder deals cake-1 at rung 1 now, but the pinned physics
 * scripts (the 6-click tier-2 landing, the 13-arc frost line, the burst
 * economy) were all measured on cake-3 under the standing order — which
 * IS rung 3, verbatim (the anchor law). Replays the Room's own nextRung
 * deal sequence (rung write → dealFresh(row) → redealDessert) through
 * privates; broadcasts are skipped — the next scored/order message
 * carries the live checks. Call after readyUp. */
function jumpToRung(room: Room, rung: number): void {
  const r = room as unknown as {
    run: { rung: number };
    flow: { dealFresh(row: Rung): void; activeCrew: number };
    redealDessert(): void;
  };
  r.run.rung = rung;
  // THE ANCHOR IS FULL LABOR (the lone hero amendment, plans/13 §5): the
  // pinned physics scripts were measured on the standing order BEFORE the
  // crew handicap existed — the seam deals the anchor ticket verbatim,
  // however many bakers the test connected. Lone-hero pricing has its own
  // pins (order-flow.test + THE LONE HERO suite below).
  r.flow.activeCrew = 2;
  r.flow.dealFresh(rungRow(rung));
  r.redealDessert();
}

// ---------------------------------------------------------------------------
// THE SEAMS (jumpToRung's cousins — grown file-wide with slice 5): these
// build the STATE a rule runs on — coverage, grains, a resting cherry, an
// active second town — through privates, because driving each physically
// re-runs the whole WIN script per test. The TRIGGERS stay real: every
// evaluation happens on a genuine landing tick (one weak lime lob), every
// purchase on a genuine `buy` message. Physics truth lives in the unit
// pins; these pin the Room's orchestration.
// ---------------------------------------------------------------------------
interface SeamVec {
  x: number;
  y: number;
  z: number;
}
interface RoomSeams {
  frosting: {
    paint(pos: SeamVec, speed: number): number;
    coverage(): number;
    snapshot(): number[];
  };
  dessert: {
    samples: ReadonlyArray<{ pos: SeamVec }>;
    tierOf(pos: SeamVec): number | null;
    topTier: number;
  };
  settled: Array<{ topping: string; pos: SeamVec; onCake: boolean; stuck?: true }>;
  run: { rung: number; purse: number };
  towns: unknown[];
  flow: { activeTowns: number; order: { ticksLeft: number; status: string } };
}
const seams = (room: Room): RoomSeams => room as unknown as RoomSeams;

/** Paint the deal's cake to `coverage` — ABSOLUTE fraction of the WHOLE
 * cake (plans/22 step 4; the star tiers grade absolute coverage now). */
function seamPaint(room: Room, coverage: number): void {
  const s = seams(room);
  for (const sample of s.dessert.samples) {
    if (s.frosting.coverage() >= coverage) return;
    s.frosting.paint(sample.pos, 20);
  }
}

/** Rest `n` sprinkle grains on painted skin (meets on-frosting rows). */
function seamSprinkles(room: Room, n: number): void {
  const s = seams(room);
  const coats = s.frosting.snapshot();
  const spots = s.dessert.samples.filter((_, i) => coats[i]! > 0).slice(0, n);
  for (const spot of spots)
    s.settled.push({ topping: "sprinkles", pos: { ...spot.pos }, onCake: true, stuck: true });
}

/** Rest a cherry on the deal's summit. */
function seamCherry(room: Room): void {
  const s = seams(room);
  const summit = s.dessert.samples.find(
    (sm) => s.dessert.tierOf(sm.pos) === s.dessert.topTier,
  )!;
  s.settled.push({ topping: "cherry", pos: { ...summit.pos }, onCake: true });
}

/** One weak lime lob — the REAL landing tick every evaluation needs
 * (the decoy fires anyway, lands anyway: floor mess, honest trigger). */
function fireLime(room: Room, c: FakeClient, wait = 400): void {
  room.onMessage(c.id, { t: "load", topping: "lime" });
  run(room, 1);
  room.onMessage(c.id, { t: "op", turn: 0, screw: 0, crank: 1 });
  run(room, CRANK_TICKS_PER_CLICK);
  room.onMessage(c.id, { t: "op", turn: 0, screw: 0, crank: 0 });
  run(room, 1);
  room.onMessage(c.id, { t: "lever" });
  run(room, wait);
}

/** THE TOWN-2 SEAM (slice 5): the stall purchase is separator-gated and
 * purse-priced now (plans/13 §5 amendment), so tests that just need a
 * two-town room build one through privates. The purchase LAW has its own
 * suite (THE STALL below) — the honest wire path is exercised there. */
function seamTown2(room: Room): void {
  const s = seams(room);
  s.towns.push({ machine: createCatapult(), crankTicks: 0, screwTicks: 0 });
  s.flow.activeTowns = s.towns.length;
}

/** Run the order to THE BUZZER (plans/22 step 3): the order concludes only
 * at clock-expiry now (no instant win on rows-met), so force the clock to
 * its last tick and run through the "ended" beat — concludeOrder renders
 * the verdict. Bounded against a stray patience bump (a look nudging the
 * clock); a plain drain settles in one tick. */
function seamBuzzer(room: Room): void {
  const s = seams(room);
  s.flow.order.ticksLeft = 1;
  let guard = 0;
  while (s.flow.order.status === "running" && guard++ < 2000) room.tick();
}

/** Seam-win the LIVE rung: paint to `coverage` (absolute — 0.4 clears the
 * 3★ tier, plans/22 step 4), rest the sprinkle row (+slack covers a nag),
 * land one real lime (a genuine landing keeps the ledger honest), then ring
 * the buzzer — the order is graded at the clock now, never on rows-met. */
function seamWin(room: Room, c: FakeClient, coverage = 0.4): void {
  const s = seams(room);
  seamPaint(room, coverage);
  const grains = rungRow(s.run.rung).asks.sprinkles;
  if (grains > 0) seamSprinkles(room, grains + 10);
  fireLime(room, c);
  seamBuzzer(room);
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
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
    room.onMessage(b.id, { t: "op", turn: 0, screw: 0, crank: 1 });
    // A few extra ticks so the 15Hz machine broadcast lands after the click.
    run(room, CRANK_TICKS_PER_CLICK + 4);
    const m = a.last("machine");
    expect(m?.state.tensionClicks).toBe(1); // not 2
  });

  it("the unwind over the wire: crank -1 lets a click out; wind against unwind stalls (plans/14)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
    run(room, CRANK_TICKS_PER_CLICK * 2 + 4);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
    run(room, 1);
    expect(a.last("machine")?.state.tensionClicks).toBe(2);
    // Alice lets one click out — same held seconds down as up.
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: -1 });
    run(room, CRANK_TICKS_PER_CLICK + 4);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
    run(room, 1);
    expect(a.last("machine")?.state.tensionClicks).toBe(1);
    // One winds, one unwinds: the ratchet fights to a stall — honest.
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
    room.onMessage(b.id, { t: "op", turn: 0, screw: 0, crank: -1 });
    run(room, CRANK_TICKS_PER_CLICK * 2 + 4);
    expect(a.last("machine")?.state.tensionClicks).toBe(1);
  });

  it("opposite traverse turns cancel out", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    room.onMessage(a.id, { t: "op", turn: 1, screw: 0, crank: 0 });
    room.onMessage(b.id, { t: "op", turn: -1, screw: 0, crank: 0 });
    run(room, 120);
    expect(a.last("machine")?.state.traverseDeg).toBe(0);
  });

  it("the elevation screw works over the wire and tilts the frame", () => {
    const room = new Room();
    const a = connect(room, "alice");
    room.onMessage(a.id, { t: "op", turn: 0, screw: 1, crank: 0 });
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
    readyUp(room, a, b);
    room.onMessage(a.id, { t: "load", topping: "cherry" });
    room.onMessage(b.id, { t: "op", turn: 0, screw: 0, crank: 1 });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(b.id, { t: "op", turn: 0, screw: 0, crank: 0 });
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
    readyUp(room, a);
    jumpToRung(room, 3); // the burst economy's pins live on the anchor
    const fire = (topping: string): void => {
      room.onMessage(a.id, { t: "load", topping });
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
      run(room, CRANK_TICKS_PER_CLICK * 6);
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
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
    readyUp(room, a);
    jumpToRung(room, 3); // the burst pins live on the anchor
    const fire = (topping: string): void => {
      room.onMessage(a.id, { t: "load", topping });
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
      run(room, CRANK_TICKS_PER_CLICK * 6);
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
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
    // ANCHORED ON RUNG 3 since the stand re-ruling (2026-07-12): the
    // lobby's practice target is a thin BOARD now — the 6-click arc
    // that used to smack the interim cylinder falls short of it. The
    // property under test is phase-agnostic; the sibling test above
    // proves this exact recipe grips on the anchor cake.
    const room = new Room();
    const a = connect(room, "alice");
    readyUp(room, a);
    jumpToRung(room, 3);
    const fire = (topping: string): void => {
      room.onMessage(a.id, { t: "load", topping });
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
      run(room, CRANK_TICKS_PER_CLICK * 6);
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
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
      readyUp(room, a); // replayed input like everything else (plans/13)
      const fire = (topping: string): void => {
        room.onMessage(a.id, { t: "load", topping });
        room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
        run(room, CRANK_TICKS_PER_CLICK * 6);
        room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
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

  it("two Rooms, identical inputs INCLUDING buy+pick, converge — the towns spine rides the message stream", () => {
    // The towns extension of the convergence law, REWORKED for slice 5
    // (plans/13 §5 amendment): buy and pickTown are INPUTS (they ride
    // onMessage), so two replicas fed the same script must debit the same
    // purse, grow the same towns array, honor the same pick, and replay
    // the same town-1 shot onto the same shared cake. The script IS the
    // campaign's teaching arc: two passed orders fund the purchase (the
    // seams paint; the wins, the pay, and every message are honest wire).
    // A LONE baker runs it since the lone hero amendment (plans/13 §5):
    // the realm pays its hero in full — her own two wins fund the fort —
    // and every deal here prices REACH × LABOR over real wire, the only
    // Room test that watches the composition leave the building.
    const play = () => {
      const room = new Room();
      const a = connect(room, "alice");
      readyUp(room, a); // the ready-up is itself replayed input (poses)
      seamWin(room, a); // rung 1, 3★: +25 (pay column 10 + 3×5)
      run(room, ORDER_RESET_TICKS + 10); // the linger ends; rung 2 deals
      seamWin(room, a); // rung 2, 3★: +35 — the purse holds 60
      // THE PURCHASE and the pick, both inside the won separator — the
      // stall's hours. A second buy in the same window must bounce off
      // `owned` without touching the purse (no double debit).
      room.onMessage(a.id, { t: "buy", item: "town2" });
      room.onMessage(a.id, { t: "buy", item: "town2" });
      room.onMessage(a.id, { t: "pickTown", town: 1 });
      run(room, ORDER_RESET_TICKS + 10); // rung 3: two towns, one dwarf
      // Fire town 1's 6-click frost at the RUNNING two-town order — the
      // real play situation, no linger-timing dependence.
      room.onMessage(a.id, { t: "load", topping: "frosting" });
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
      run(room, CRANK_TICKS_PER_CLICK * 6);
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
      room.onMessage(a.id, { t: "lever" });
      run(room, 600);
      return {
        shot: a.last("shot"),
        town: a.last("town"),
        runWire: a.last("run"),
        w: connect(room, "peek").last("welcome"),
      };
    };
    const A = play();
    const B = play();
    // The pick was honored identically...
    expect(A.town).toEqual(B.town);
    expect(A.town?.town).toBe(1);
    // ...the town-1 shot event matches to the byte (town, params, seed)...
    expect(A.shot).toEqual(B.shot);
    expect(A.shot?.town).toBe(1);
    // ...and a late joiner's whole world matches byte-for-byte.
    expect(A.w?.machines).toEqual(B.w?.machines);
    expect(A.w?.frosting).toEqual(B.w?.frosting);
    expect(A.w?.toppings).toEqual(B.w?.toppings);
    expect(A.w?.stuck).toEqual(B.w?.stuck);
    expect(A.w?.checks).toEqual(B.w?.checks);
    // Non-vacuous: both towns are live, the purse debited exactly once
    // (60 earned − 50 = 10, the second buy refused untouched), the fresh
    // deal is priced for two TOWNS × one PAIR OF HANDS (REACH × LABOR,
    // stamped on the ticket), and the town-1 frost painted the cake.
    expect(A.w?.machines).toHaveLength(2);
    expect(A.w?.yourTown).toBe(0); // joiners always start home
    expect(A.runWire?.purse).toBe(60 - TOWN2_PRICE);
    expect(A.w?.run.purse).toBe(60 - TOWN2_PRICE);
    const frost = A.w?.order.requirements.find(
      (r) => r.kind === "frost-coverage",
    ) as { floorCoverage?: number } | undefined;
    // The frost floor is flat + absolute now (plans/22 step 4): the second
    // town buys par + reach, never a higher coverage bar.
    expect(frost?.floorCoverage).toBe(FLOOR_COVERAGE);
    expect(A.w?.order.hands).toBe(1); // the ticket wears its pricing
    expect(A.w?.frosting.some((c) => c > 0)).toBe(true);
  });

  describe("THE STALL (plans/13 §5 as amended 2026-07-09 — slice 5)", () => {
    it("shop hours: buys bounce off the lobby, a running order, a run-ending linger, and the catalog — untouched, undebited", () => {
      const room = new Room();
      const a = connect(room, "alice");
      // THE CORE LAW (plans/11 §1) survives the stall: ONE town, always,
      // until a purchase — and a fresh second machine when it comes (the
      // convergence test drives the honest arc; this suite the refusals).
      expect(seams(room).towns.length).toBe(1);
      // LOBBY: no shop hours (and no purse — it zeroes at run start).
      room.onMessage(a.id, { t: "buy", item: "town2" });
      expect(seams(room).towns.length).toBe(1);
      readyUp(room, a);
      seams(room).run.purse = 999; // funded beyond doubt: the GATE refuses
      // MID-ORDER: gates-law parity — buying while the order runs is not
      // a thing.
      room.onMessage(a.id, { t: "buy", item: "town2" });
      expect(seams(room).towns.length).toBe(1);
      expect(seams(room).run.purse).toBe(999); // never debited
      // THE CATALOG is the whitelist: fudge is pantry, not shop.
      room.onMessage(a.id, { t: "buy", item: "fudge" });
      expect(seams(room).towns.length).toBe(1);
      // A RUN-ENDING LINGER sells nothing: inventory dies with the run —
      // the key would be dead before it ever turned. Burn rung 1 out.
      let guard = 0;
      while (
        (a.last("order")?.order.status ?? "running") === "running" &&
        guard++ < (ORDER_SECONDS + 60) * 60
      )
        room.tick();
      expect(a.last("order")?.order.status).toBe("lost");
      room.onMessage(a.id, { t: "buy", item: "town2" });
      expect(seams(room).towns.length).toBe(1);
      expect(seams(room).run.purse).toBe(999);
    });

    it("a poor crew is refused honestly: no funds, no fort, purse intact", () => {
      const room = new Room();
      const a = connect(room, "alice");
      readyUp(room, a);
      seamWin(room, a); // rung 1, 3★: the purse holds 25 — under the 50
      expect(a.last("run")?.purse).toBe(25);
      room.onMessage(a.id, { t: "buy", item: "town2" }); // the won linger: hours OPEN
      expect(seams(room).towns.length).toBe(1); // ...but 25 < 50
      expect(seams(room).run.purse).toBe(25); // nothing was taken
    });

    it("PAY rides the conclusion tick: base + stars × perStar on the run wire (§5's column, live at last)", () => {
      const room = new Room();
      const a = connect(room, "alice");
      readyUp(room, a);
      jumpToRung(room, 3);
      seamPaint(room, 0.25); // 2★ (0.18 ≤ cov < 0.35)
      seamSprinkles(room, 70);
      fireLime(room, a); // a real landing keeps the ledger honest
      seamBuzzer(room); // the clock renders the verdict now (plans/22)
      expect(a.all("order").some((m) => m.order.status === "won")).toBe(true);
      const pay = rungRow(3).pay;
      expect(a.last("run")?.purse).toBe(pay.base + 2 * pay.perStar);
    });

    it("THE FLOURISH PAYS: the coda adds its bonus on top of the column", () => {
      const room = new Room();
      const a = connect(room, "alice");
      readyUp(room, a);
      jumpToRung(room, 3);
      seamPaint(room, 0.25);
      seamSprinkles(room, 70);
      seamCherry(room); // the cherry rests → coda stamped at the buzzer
      fireLime(room, a);
      seamBuzzer(room);
      const end = a.all("order").find((m) => m.order.status === "won");
      expect(end?.judgment?.flourish).toBe(true);
      const pay = rungRow(3).pay;
      expect(a.last("run")?.purse).toBe(
        pay.base + 2 * pay.perStar + FLOURISH_BONUS_COINS,
      );
    });

    it("INVENTORY DIES WITH THE RUN: the next start re-locks town 2, zeroes the purse, re-addresses the crew home", () => {
      const room = new Room();
      const a = connect(room, "alice");
      // A duo keeps the re-lock pins TOWNS-pure (full labor): "priced
      // solo again" below means one TOWN, not one baker.
      const b = connect(room, "bob");
      readyUp(room, a, b);
      seamTown2(room);
      seamWin(room, a); // rung 1 won — the linger opens the pick window
      room.onMessage(a.id, { t: "pickTown", town: 1 });
      expect(a.last("town")?.town).toBe(1);
      seams(room).run.purse = 42; // a visible balance to die with the run
      run(room, ORDER_RESET_TICKS + 10); // rung 2 deals (duo-priced — 2 towns)
      // Burn rung 2 to death: the run ends; the report and the lobby still
      // tell the finished story's balance (the purse dies at the START).
      let guard = 0;
      while (
        (a.last("order")?.order.status ?? "running") === "running" &&
        guard++ < (ORDER_SECONDS + 60) * 60
      )
        room.tick();
      expect(a.last("order")?.order.status).toBe("lost");
      run(room, ORDER_RESET_TICKS + 20);
      const over = a.all("run").find((m) => m.phase === "runover");
      expect(over?.purse).toBe(42); // the report keeps the story's balance
      // The pose never left the circle: lobby → countdown → auto-restart.
      run(room, RUNOVER_TICKS + READY_COUNTDOWN_TICKS + 30);
      const w = connect(room, "peek").last("welcome");
      expect(w?.run.phase).toBe("running");
      expect(w?.run.rung).toBe(1);
      expect(w?.machines).toHaveLength(1); // town 2 re-locked
      expect(w?.run.purse).toBeUndefined(); // the purse died at the start
      // Alice was re-addressed home at the boundary, through the same
      // town word a pick uses — BEFORE the fresh deal and the run word.
      expect(a.all("town").pop()?.town).toBe(0);
      const frost = w?.order.requirements.find(
        (r) => r.kind === "frost-coverage",
      ) as { floorCoverage?: number } | undefined;
      expect(frost?.floorCoverage).toBe(FLOOR_COVERAGE); // flat + absolute now
    });
  });

  describe("THE LONE HERO (plans/13 §5 amendment): every deal prices its labor from the roster", () => {
    const frostOf = (o: {
      requirements: Array<{ kind: string; floorCoverage?: number }>;
    }): { floorCoverage?: number } | undefined =>
      o.requirements.find((r) => r.kind === "frost-coverage");

    it("a lone baker's run stamps hands: 1; the frost floor stays FLAT (relief is grains + clock now)", () => {
      const room = new Room();
      const a = connect(room, "alice");
      readyUp(room, a);
      const order = a.all("order").find((m) => m.fresh);
      expect(order?.order.hands).toBe(1);
      // The frost floor is town/labor-independent now (plans/22 step 4) —
      // solo relief lives in the grain ask + the clock (step 6), not here.
      expect(frostOf(order!.order)?.floorCoverage).toBe(FLOOR_COVERAGE);
    });

    it("a duo's run deals the same FLAT floor, stamped hands: 2 — zero drift for the friend test", () => {
      const room = new Room();
      const a = connect(room, "alice");
      const b = connect(room, "bob");
      readyUp(room, a, b);
      const order = b.all("order").find((m) => m.fresh);
      expect(order?.order.hands).toBe(2);
      expect(frostOf(order!.order)?.floorCoverage).toBe(FLOOR_COVERAGE);
    });

    it("a mid-order joiner never retro-prices the ticket; the NEXT deal reads the grown crew", () => {
      const room = new Room();
      const a = connect(room, "alice");
      readyUp(room, a);
      // Bob arrives mid-order: the welcome carries the lone ticket as it
      // was dealt (towns law verbatim — a joiner waits for the next deal).
      const b = connect(room, "bob");
      expect(b.last("welcome")?.order.hands).toBe(1);
      expect(frostOf(b.last("welcome")!.order)?.floorCoverage).toBe(FLOOR_COVERAGE);
      // Win the rung; the climb's fresh deal prices the duo at the table.
      seamWin(room, a);
      run(room, ORDER_RESET_TICKS + 10);
      const msgs = a.all("order");
      const fresh = msgs
        .slice(msgs.findIndex((m) => m.order.status !== "running") + 1)
        .find((m) => m.order.status === "running");
      expect(fresh?.order.hands).toBe(2);
      expect(frostOf(fresh!.order)?.floorCoverage).toBe(FLOOR_COVERAGE);
    });

    it("grains scale with labor too: the lone rung-2 ticket asks half the sprinkles (ceil)", () => {
      const room = new Room();
      const a = connect(room, "alice");
      readyUp(room, a);
      seamWin(room, a);
      run(room, ORDER_RESET_TICKS + 10); // rung 2 deals, lone-priced
      const msgs = a.all("order");
      const fresh = msgs
        .slice(msgs.findIndex((m) => m.order.status !== "running") + 1)
        .find((m) => m.order.status === "running");
      const grains = fresh?.order.requirements.find(
        (r) => r.kind === "on-frosting",
      ) as { needed?: number } | undefined;
      expect(grains?.needed).toBe(
        Math.ceil(rungRow(2).asks.sprinkles * CREW_LABOR[1]!), // 40 → 14
      );
    });

    it("PAY IS FULL — the realm pays its hero the same column (no lone-hero discount)", () => {
      const room = new Room();
      const a = connect(room, "alice");
      readyUp(room, a);
      seamWin(room, a); // 3★ on the half-labor ticket — honest stars
      const pay = rungRow(1).pay;
      expect(a.last("run")?.purse).toBe(pay.base + 3 * pay.perStar);
    });
  });

  it("pickTown: LOCKED while running, open at order end, dormant forts unpickable, junk ignored (plans/11 §5)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    readyUp(room, a);
    const townOf = (): number =>
      (room as unknown as { roster: { townOf(id: number): number } }).roster.townOf(a.id);
    seamTown2(room);
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
    readyUp(room, a);
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
    readyUp(room, a, b);
    type TownPeek = { machine: { tensionClicks: number; traverseDeg: number } };
    const towns = (): TownPeek[] =>
      (room as unknown as { towns: TownPeek[] }).towns;
    seamTown2(room);
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
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
    room.onMessage(b.id, { t: "op", turn: 1, screw: 0, crank: 1 });
    run(room, CRANK_TICKS_PER_CLICK * 2);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
    room.onMessage(b.id, { t: "op", turn: 0, screw: 0, crank: 0 });
    expect(towns()[0]!.machine.tensionClicks).toBe(2); // bob's, town 0
    expect(towns()[1]!.machine.tensionClicks).toBe(2); // alice's, town 1
    expect(towns()[0]!.machine.traverseDeg).toBeGreaterThan(0); // bob turned
    expect(towns()[1]!.machine.traverseDeg).toBe(0); // alice didn't
  });

  it("the wire knows WHERE FROM: a town-1 shot carries its town and lands on the SHARED cake (step 6)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    readyUp(room, a);
    jumpToRung(room, 3); // the 6-click landing + 248-tick rest were measured on the anchor
    seamTown2(room);
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
    // rotated — all inside the linger window (crank 270t + flight ≈ 520t;
    // ORDER_RESET_TICKS must stay above ~530 or this squeeze breaks — the
    // towns convergence test below covers the honest post-deal path).
    room.onMessage(a.id, { t: "load", topping: "cherry" });
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
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

  it("PAR rises to the two-town workload at the NEXT deal, never mid-order (plans/11 §6)", () => {
    // Coverage is town-INDEPENDENT now (plans/22 step 4): the second town
    // buys par + reach, never a higher coverage bar — so PAR is what watches
    // the deal boundary (the of-potential 0.42→0.75 rise is retired).
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    readyUp(room, a, b);
    // Activate MID-ORDER (seam): the running order keeps the ticket it was
    // dealt — the ask follows at the NEXT deal.
    seamTown2(room);
    run(room, 60); // a clock correction carries the (unchanged) order
    const running = a.last("order") ?? a.last("welcome");
    const frostRow = (o: { requirements: Array<{ kind: string; floorCoverage?: number }> }) =>
      o.requirements.find((r) => r.kind === "frost-coverage");
    // The floor is flat, running and fresh alike; PAR is the town dial.
    expect(frostRow(running!.order)?.floorCoverage).toBe(FLOOR_COVERAGE);
    expect(running!.order.parShots).toBe(rungRow(1).parShots.solo);
    // WIN the order and ride the linger to rung 2's fresh cake.
    seamWin(room, a);
    run(room, ORDER_RESET_TICKS + 10);
    const msgs = a.all("order");
    const fresh = msgs
      .slice(msgs.findIndex((m) => m.order.status !== "running") + 1)
      .find((m) => m.order.status === "running");
    // The fresh deal is priced for two towns — par jumps to the duo column.
    expect(frostRow(fresh!.order)?.floorCoverage).toBe(FLOOR_COVERAGE);
    expect(fresh!.order.parShots).toBe(rungRow(2).parShots.duo);
  });

  it("late joiners are welcomed with the world as it lies (F2, plans/06)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    // Land one cherry (the pinned 6-click tier-2 shot), then fire a second
    // and join Carol MID-FLIGHT: the welcome must carry the settled topping
    // and NOT the one still in the air (its own `shot` event announced it).
    room.onMessage(a.id, { t: "load", topping: "cherry" });
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
    room.onMessage(a.id, { t: "lever" });
    run(room, 600); // flight + rest
    room.onMessage(a.id, { t: "load", topping: "lime" });
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
    room.onMessage(a.id, { t: "lever" });
    run(room, 30); // the lime is airborne
    const carol = connect(room, "carol");
    const w = carol.last("welcome");
    expect(w?.toppings).toHaveLength(1);
    expect(w?.toppings[0]?.topping).toBe("cherry");
    // The LOBBY holds the PRACTICE TARGET now (item 25, entry 5): the
    // old 6-click cake-1 arc glances the narrower plank column and
    // rests on the floor beside it (y ≈ 0.3) — the welcome still
    // carries the topping exactly where it lies, which is the pin.
    expect(w?.toppings[0]?.y).toBeGreaterThanOrEqual(0);
    expect(w?.toppings[0]?.y).toBeLessThan(1);
  });

  it("a frosting glob scores at IMPACT and paints the welcome snapshot (plans/07)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    readyUp(room, a);
    room.onMessage(a.id, { t: "load", topping: "frosting" });
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
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
    readyUp(room, a);
    room.onMessage(a.id, { t: "load", topping: "fudge" });
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
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
    readyUp(room, a);
    const fire = (topping: string): void => {
      room.onMessage(a.id, { t: "load", topping });
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
      run(room, CRANK_TICKS_PER_CLICK * 6);
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
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
    const peek = connect(room, "peek");
    const pw = peek.last("welcome");
    expect(pw?.frosting.some((c) => c > 0)).toBe(true);
    expect(pw?.toppings.map((t) => t.topping).sort()).toEqual(["cherry", "lime"]);
    // Peek must stand in the circle too — the auto-restart gate needs
    // EVERYONE (plans/13); an unposed lurker would hold the lobby forever.
    room.onMessage(peek.id, {
      t: "pose",
      pose: { x: READY_CIRCLE.x, y: 1.2, z: READY_CIRCLE.z, yaw: 0 },
    });
    // Lose (the burn ends it early), then through the linger, the RUN-OVER
    // report, and the auto-restart's fresh deal (the poses never left the
    // circle — plans/13, see readyUp's note).
    run(room, (ORDER_SECONDS + 20) * 60);
    const msgs = a.all("order");
    const endIdx = msgs.findIndex((m) => m.order.status !== "running");
    const fresh = msgs.slice(endIdx + 1).find((m) => m.fresh);
    expect(fresh).toBeDefined();
    expect(fresh?.order.status).toBe("running");
    // The fresh-cake law: the dessert left with everything ON it; the
    // floor lime remains — the bakery gets messier, the cake never does.
    const bob = connect(room, "bob");
    expect(bob.last("welcome")?.frosting.every((c) => c === 0)).toBe(true);
    expect(bob.last("welcome")?.toppings.map((t) => t.topping)).toEqual(["lime"]);
  });

  it("the clock is authoritative and RELIABLE — patience no longer burns it (plans/22 step 6)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    readyUp(room, a);
    // The order deals rung 1 solo, so its base is the reliable clock times
    // the tutorial's soloClock stretch — no patience drain, no earned time
    // (an untouched machine paints nothing). Tick one at a time until it
    // ends, counting how long it ACTUALLY survived.
    const base = Math.round(rungRow(1).clockSeconds * rungRow(1).soloClock * 60);
    let elapsed = 0;
    const cap = base + 60 * 60; // a generous ceiling; it must end first
    while (elapsed < cap) {
      room.tick();
      elapsed++;
      const om = a.last("order");
      if (om && om.order.status !== "running") break;
    }
    const ended = a.last("order");
    expect(ended?.order.status).toBe("lost");
    expect(ended?.order.ticksLeft).toBe(0);
    // The clock died: the verdict rides along, and it's the sad kind.
    expect(ended?.judgment?.met).toBe(false);
    expect(ended?.judgment?.stars).toBe(0);
    // THE INVERSION (plans/22 step 6): the reliable clock ran its FULL base
    // — patience no longer steals seconds. Under the old lie the Giant's
    // grumbles burned ~60s (3600 ticks) off; now the order dies at its base
    // (± the one-tick deal/observe fencepost). A residual drain would miss
    // by hundreds of ticks — this pins that it's gone.
    expect(Math.abs(elapsed - base)).toBeLessThanOrEqual(1);
    // And everyone still heard the Giant on the way down (voice unchanged;
    // his impatience is dormant now, captured for the realm's favor, step 8).
    expect(a.all("patron").length).toBeGreaterThan(2);
  });

  it("a LOST order ends the RUN: report, lobby, and the still-gathered crew starts anew with a clean slate (plans/13)", () => {
    // The campaign re-pin (2026-07-08) of "a finished order lingers, then
    // the patron orders again": a loss no longer redeals — the run ends.
    // The next order comes from the NEXT RUN, which the crew (whose poses
    // never left the circle) starts automatically after the report.
    const room = new Room();
    const a = connect(room, "alice");
    readyUp(room, a);
    run(room, (ORDER_SECONDS + 20) * 60); // lose → linger → report → new run
    const msgs = a.all("order");
    const endIdx = msgs.findIndex((m) => m.order.status !== "running");
    expect(endIdx).toBeGreaterThanOrEqual(0);
    // The container walked its whole loop, in order: the run died on rung
    // 1, the report held, the lobby gathered, the next run began.
    const phases = a.all("run").map((m) => m.phase);
    const over = phases.indexOf("runover");
    expect(over).toBeGreaterThanOrEqual(0);
    expect(a.all("run").find((m) => m.phase === "runover")?.rung).toBe(1);
    expect(phases.slice(over)).toContain("lobby");
    expect(phases.slice(phases.indexOf("lobby", over))).toContain("running");
    // NO fresh deal rode the loss itself — the sad cake stayed on display
    // through the report; the deal is the NEXT run's.
    const fresh = msgs.slice(endIdx + 1).find((m) => m.order.status === "running");
    expect(fresh).toBeDefined();
    expect(fresh?.fresh).toBe(true);
    // The ledger reset with the run: the new deal counts fresh deliveries.
    expect(fresh?.checks.every((c) => c.current === 0)).toBe(true);
  });

  it("the Patron looks on cadence and everyone hears the same words", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    readyUp(room, a, b);
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

  it("the WIN path over protocol: frost → sprinkles → WON → the ladder climbs to the cupcake (audit 2026-07-03; slice 4)", () => {
    // The O2 scripted playthrough, re-bodied as a permanent Room test —
    // the only Room-level ending pinned before this was loss-by-clock.
    // RE-ANCHORED TO RUNG 3 (slice 4): the ladder deals cake-1 at rung 1
    // now, and this script's 13 arcs are the anchor's greedy pick list.
    // Same PHYSICS as today's standing order — but graded under ABSOLUTE
    // coverage now (plans/22 step 4): these 13 arcs land a 2★ (~24% of the
    // whole cake), and the order runs to the BUZZER (no crown shot; the
    // flourish is a whole-order bonus, judged at conclusion).
    const room = new Room();
    const a = connect(room, "alice");
    readyUp(room, a);
    jumpToRung(room, 3);
    const op = (turn: -1 | 0 | 1, screw: -1 | 0 | 1, crank: -1 | 0 | 1): void =>
      room.onMessage(a.id, { t: "op", turn, screw, crank });
    const crankTo = (clicks: number): void => {
      op(0, 0, 1);
      run(room, CRANK_TICKS_PER_CLICK * clicks);
      op(0, 0, 0);
      run(room, 1);
    };
    // One held stint per notch. VERNIER RE-PIN (2026-07-08, research/13):
    // the script's arcs were cut at the old 15° notch; 15° = 6 × 2.5°
    // exactly, so `notches: 6` reproduces the identical physics.
    const screw = (dir: -1 | 1, notches = 1): void => {
      for (let i = 0; i < notches; i++) {
        op(0, dir, 0);
        run(room, SCREW_TICKS_PER_NOTCH + 2);
        op(0, 0, 0);
        run(room, 1);
      }
    };
    const turnTicks = (dir: -1 | 1, ticks: number): void => {
      op(dir, 0, 0);
      run(room, ticks);
      op(0, 0, 0);
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
    screw(1, 6); // +15° — the old notch-1 half of the pick list
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
    screw(-1, 6); // back level
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
    // NO crown row ever appears (the flourish amendment — patron rule 3
    // deleted; the desire returns optional in 4b). The rows are met, but
    // the order runs to the buzzer now (plans/22 step 3): ring it, and the
    // cake is graded exactly as it lies — the same rows, the same verdict.
    expect(lastChecks().some((c) => c.req.kind === "crown")).toBe(false);
    seamBuzzer(room);
    const end = a.all("order").find((m) => m.order.status === "won");
    expect(end).toBeDefined();
    expect(end?.judgment?.accepted).toBe(true);
    // Stars from the ABSOLUTE coverage tiers (plans/22 step 4): these 13
    // arcs cover ~24% of the WHOLE cake — past the 2★ floor (0.18), shy of
    // 3★ (0.35). The old of-potential 0.566 → 1★ is retired.
    expect(end?.judgment?.stars).toBe(2);
    expect(end?.judgment?.coverage).toBeGreaterThanOrEqual(0.18);
    expect(end?.judgment?.coverage).toBeLessThan(0.35);
    // The greatness bar (2★) WAS crossed, so the Giant revealed his desire
    // mid-run — but the cherry never landed, so no coda.
    expect(end?.order.desire).toMatchObject({ revealed: true, met: false });
    expect(end?.judgment?.flourish).toBeUndefined();
    // The linger passes; the fresh deal starts honestly unmet — and the
    // WON order climbs the ladder: the same run, rung 4 — THE CUPCAKE
    // (the ladder live, plans/13 slice 4: the deal carries the climbed
    // rung and its OWN ticket). (Find the fresh AFTER the win — the
    // ready-up's own deal is fresh too, at the top of the inbox.)
    run(room, ORDER_RESET_TICKS + 100);
    const wonAt = a.inbox.indexOf(end!);
    const fresh = a.inbox
      .slice(wonAt)
      .find((m) => m.t === "order" && m.fresh) as
      | Extract<ServerMsg, { t: "order" }>
      | undefined;
    expect(fresh?.order.status).toBe("running");
    expect(fresh?.rung).toBe(4); // rung 3 won → the cupcake deals
    // One baker played this script: the clock prices hands too (THE
    // CLOCK RELIEF, item 26 + addendum — the row stays verbatim; solo
    // relief is per-rung now, and rung 4 (past the tutorial) runs the
    // honest row, soloClock 1.0 — no stretch).
    expect(rungRow(4).soloClock).toBe(1.0);
    expect(fresh?.order.ticksLeft).toBe(rungRow(4).clockSeconds * 60);
    expect(fresh?.order.parShots).toBe(rungRow(4).parShots.solo);
    // The CLIMB is a live deal, and one baker played this script: the
    // anchor seam pinned rung 3 at full labor, but the ladder prices the
    // roster's truth — the cupcake asks the lone hero half its grains
    // (plans/13 §5, REACH × LABOR).
    expect(
      fresh?.order.requirements.find((r) => r.kind === "on-frosting"),
    ).toMatchObject({
      needed: Math.ceil(rungRow(4).asks.sprinkles * CREW_LABOR[1]!),
    });
    expect(fresh?.checks.every((c) => c.current === 0 && !c.met)).toBe(true);
    const climbed = a.all("run").find((m) => m.rung === 4);
    expect(climbed?.phase).toBe("running"); // no lobby between rungs
  });

  it("a joiner mid-banner is welcomed with the verdict (audit 2026-07-03)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    readyUp(room, a);
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
    expect(w?.run.phase).toBe("running"); // the linger is still the rung's
    // A joiner mid-REPORT gets the runover phase AND the frozen verdict
    // (the sad cake is still on display under the run report).
    run(room, ORDER_RESET_TICKS);
    const dana = connect(room, "dana");
    expect(dana.last("welcome")?.run.phase).toBe("runover");
    expect(dana.last("welcome")?.judgment).toBeDefined();
    // Once the NEXT run's fresh order deals, welcomes stop carrying a
    // verdict. The gate needs EVERYONE — carol and dana joined without
    // poses, so the whole crew stands in the circle together.
    run(room, RUNOVER_TICKS);
    readyUp(room, a, carol, dana);
    const dave = connect(room, "dave");
    expect(dave.last("welcome")?.order.status).toBe("running");
    expect(dave.last("welcome")?.judgment).toBeUndefined();
    expect(dave.last("welcome")?.run.phase).toBe("running");
  });

  it("a mid-banner welcome serves the FROZEN verdict, not a re-judgment (audit 2026-07-07 S-MED-1)", () => {
    // Machines still fire during the linger and the ledger stays live. The
    // welcome must serve the verdict the room's banner shows — captured at
    // the moment the order ended — not re-judge the post-verdict world.
    const room = new Room();
    const a = connect(room, "alice");
    readyUp(room, a);
    // Wind full tension while the order runs (tension persists), then let
    // the patience-burned clock kill it — the stale-glob test's recipe.
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
    let guard = 0;
    while (
      (a.last("order")?.order.status ?? "running") === "running" &&
      guard++ < (ORDER_SECONDS + 10) * 60
    )
      room.tick();
    const frozen = a.all("order").find((m) => m.judgment)?.judgment;
    expect(frozen).toBeDefined(); // the ended broadcast carried the verdict
    // Linger play: a 6-click frost glob lands on the DEAD order's cake.
    room.onMessage(a.id, { t: "load", topping: "frosting" });
    run(room, 1);
    room.onMessage(a.id, { t: "lever" });
    run(room, 300); // impact ~170 ticks out — lands well inside the linger
    // Non-vacuous: the linger paint really moved the live re-judgment…
    const live = (
      room as unknown as { judgeNow(): { score: number } }
    ).judgeNow();
    expect(live.score).not.toBe(frozen!.score);
    // …and the mid-banner joiner still gets the frozen one, byte-for-byte.
    const carol = connect(room, "carol");
    expect(carol.last("welcome")?.judgment).toEqual(frozen);
  });

  it("an honored pick OPENS the picker's hands — held crank and queued crates stay behind (audit 2026-07-07 S-MED-2)", () => {
    // Intent routes purely by member town: before the reset, a picker's
    // held crank and queued loads teleported to the NEW machine and drove
    // it with nobody standing there. Now position-as-pick makes real picks
    // happen, so the rule is live, not latent.
    const room = new Room();
    const a = connect(room, "alice");
    readyUp(room, a);
    seamTown2(room);
    // Hands full at town 0: crank HELD (never released) + a crate queued.
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
    run(room, CRANK_TICKS_PER_CLICK * 2);
    room.onMessage(a.id, { t: "load", topping: "cherry" });
    // The patron burns the order out; the pick lands in the linger.
    let guard = 0;
    while (
      (a.last("order")?.order.status ?? "running") === "running" &&
      guard++ < (ORDER_SECONDS + 10) * 60
    )
      room.tick();
    room.onMessage(a.id, { t: "pickTown", town: 1 });
    run(room, CRANK_TICKS_PER_CLICK * 2); // held crank WOULD wind town 1 here
    expect(a.last("town")?.town).toBe(1); // the pick was honored...
    const w = connect(room, "peek").last("welcome");
    // ...but the hands let go: town 1's machine is untouched (no tension,
    // no partial crank, nothing loaded — the queued cherry died too)...
    expect(w?.machines[1]?.machine.tensionClicks).toBe(0);
    expect(w?.machines[1]?.crankTicks).toBe(0);
    expect(w?.machines[1]?.machine.loaded).toBeNull();
    // ...and town 0 keeps what was already WOUND (tension is the machine's,
    // not the member's). Non-vacuous: the held crank ground town 0 to FULL
    // tension during the order burn — the hold was real right up to the
    // pick that opened it.
    expect(w?.machines[0]?.machine.tensionClicks).toBe(TENSION_MAX_CLICKS);
  });

  it("a glob fired before the next deal cannot paint the NEXT order (audit 2026-07-03; campaign re-timed 2026-07-08)", () => {
    const room = new Room();
    const a = connect(room, "alice");
    readyUp(room, a);
    // Wind full tension while the order still runs — tension persists.
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
    // Let the patience-burned clock kill the order.
    let guard = 0;
    while (
      (a.last("order")?.order.status ?? "running") === "running" &&
      guard++ < (ORDER_SECONDS + 10) * 60
    )
      room.tick();
    expect(a.last("order")?.order.status).toBe("lost");
    // A loss ends the run, so THE NEXT DEAL is the next run's (linger +
    // report + the auto-restart countdown — the pose never left the
    // circle). Fire a frosting glob timed to be IN FLIGHT when that deal
    // lands (~80 ticks before it; 6-click impact is ~170 ticks out).
    // Relative to the boundary sum so the geometry survives any retune.
    run(room, ORDER_RESET_TICKS + RUNOVER_TICKS + READY_COUNTDOWN_TICKS - 80);
    room.onMessage(a.id, { t: "load", topping: "frosting" });
    run(room, 1);
    room.onMessage(a.id, { t: "lever" });
    run(room, 500); // the deal (~79 ticks) then the stale glob lands
    // The fresh AFTER the loss — the ready-up's own deal is fresh too.
    const oMsgs = a.all("order");
    const lostIdx = oMsgs.findIndex((m) => m.order.status !== "running");
    const fresh = oMsgs.slice(lostIdx + 1).find((m) => m.fresh);
    expect(fresh).toBeDefined();
    // The stale glob scored nothing: no delivery after the fresh deal...
    const freshAt = a.inbox.indexOf(fresh!);
    expect(a.inbox.slice(freshAt).filter((m) => m.t === "scored")).toEqual([]);
    // ...and the authoritative field is still the fresh cake's, clean.
    const peek = connect(room, "peek");
    expect(peek.last("welcome")?.frosting.every((c) => c === 0)).toBe(true);
  });

  // THE RUN CONTAINER's own laws (plans/13 slice 1) — the ready gate and
  // the lobby sandbox. The ladder/run-over paths are pinned above, woven
  // into the lifecycle tests they re-shaped.
  describe("the run container: lobby, ready circle, sandbox (plans/13)", () => {
    const inCircle = { x: READY_CIRCLE.x, y: 1.2, z: READY_CIRCLE.z, yaw: 0 };

    it("a Room boots into the LOBBY: the clock is frozen and nothing scores — but the machines are a SANDBOX", () => {
      const room = new Room();
      const a = connect(room, "alice");
      const w = a.last("welcome");
      expect(w?.run.phase).toBe("lobby");
      expect(w?.run.rung).toBe(0);
      expect(w?.run.readyOf).toBe(1);
      // Warmup: load, crank, FIRE — the shot flies (comedy is legal)...
      room.onMessage(a.id, { t: "load", topping: "cherry" });
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 1 });
      run(room, CRANK_TICKS_PER_CLICK * 6);
      room.onMessage(a.id, { t: "op", turn: 0, screw: 0, crank: 0 });
      room.onMessage(a.id, { t: "lever" });
      run(room, 600);
      expect(a.last("shot")).toBeDefined();
      // ...but NOTHING scores, the Patron never looks, the clock is frozen.
      expect(a.all("scored")).toEqual([]);
      expect(a.all("patron")).toEqual([]);
      const peek = connect(room, "peek").last("welcome");
      // The dormant order is the next run's rung 1 — cake-1's short
      // clock since the ladder went live (plans/13 slice 4), untouched
      // by the sandbox ticks above.
      expect(peek?.order.ticksLeft).toBe(rungRow(1).clockSeconds * 60);
    });

    it("the ready gate: the census speaks, the countdown arms, stepping out cancels, holding through starts rung 1", () => {
      const room = new Room();
      const a = connect(room, "alice");
      const b = connect(room, "bob");
      // One in the circle: census only, no countdown.
      room.onMessage(a.id, { t: "pose", pose: inCircle });
      run(room, 2);
      expect(a.last("run")?.phase).toBe("lobby");
      expect(a.last("run")?.readyIn).toBe(1);
      expect(a.last("run")?.readyOf).toBe(2);
      // Both in: the countdown arms and says how long.
      room.onMessage(b.id, { t: "pose", pose: inCircle });
      run(room, 2);
      expect(a.last("run")?.phase).toBe("countdown");
      expect(a.last("run")?.countdownTicks).toBeGreaterThan(0);
      // Alice steps out mid-count: CANCELED — the honest gate.
      room.onMessage(a.id, { t: "pose", pose: { ...inCircle, x: 0, z: 10 } });
      run(room, 2);
      expect(a.last("run")?.phase).toBe("lobby");
      // Both hold it to zero: rung 1 deals fresh, the run is live.
      room.onMessage(a.id, { t: "pose", pose: inCircle });
      run(room, READY_COUNTDOWN_TICKS + 3);
      expect(a.last("run")?.phase).toBe("running");
      expect(a.last("run")?.rung).toBe(1);
      const fresh = a.all("order").find((m) => m.fresh);
      expect(fresh?.order.status).toBe("running");
    });

    it("a joiner mid-countdown cancels it — the gate needs EVERYONE", () => {
      const room = new Room();
      const a = connect(room, "alice");
      room.onMessage(a.id, { t: "pose", pose: inCircle });
      run(room, 2);
      expect(a.last("run")?.phase).toBe("countdown");
      connect(room, "late"); // no pose yet — cannot be standing anywhere
      run(room, 2);
      expect(a.last("run")?.phase).toBe("lobby");
    });

    it("a LEAVER mid-countdown does not cancel — the gate needs everyone PRESENT, and the count holds for those who stayed", () => {
      // The gate reads the CONNECTED roster (review 2026-07-08 session 3):
      // a dropped friend must not hold the run hostage — the count holds,
      // the run starts, and the party law hands them a mid-run rejoin.
      // (Cancel-on-leave would only re-arm from 3s anyway; holding is the
      // same gate, smoother.) The LAST leaver still cancels: an empty
      // circle is nobody ready, not everybody.
      const room = new Room();
      const a = connect(room, "alice");
      const b = connect(room, "bob");
      room.onMessage(a.id, { t: "pose", pose: inCircle });
      room.onMessage(b.id, { t: "pose", pose: inCircle });
      run(room, 2);
      expect(a.last("run")?.phase).toBe("countdown");
      room.leave(b.id);
      run(room, 2);
      expect(a.last("run")?.phase).toBe("countdown");
      run(room, READY_COUNTDOWN_TICKS + 3);
      expect(a.last("run")?.phase).toBe("running");
      expect(a.last("run")?.rung).toBe(1);
    });

    it("the LAST leaver mid-countdown cancels — an empty room never starts a run", () => {
      const room = new Room();
      const a = connect(room, "alice");
      room.onMessage(a.id, { t: "pose", pose: inCircle });
      run(room, 2);
      expect(a.last("run")?.phase).toBe("countdown");
      room.leave(a.id);
      run(room, READY_COUNTDOWN_TICKS + 3);
      // Nobody's left to hear a broadcast; ask the next joiner's welcome.
      const late = connect(room, "late");
      expect(late.last("welcome")?.run.phase).toBe("lobby");
      expect(late.last("welcome")?.run.rung).toBe(0);
    });
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

  describe("THE FLOURISH AT THE BUZZER (plans/22 step 3 — the finish window's home)", () => {
    // The flourish's home moved with the flip (plans/22 §2.9): there is no
    // finish window anymore — you have the WHOLE clock to crown the cake,
    // and the coda is stamped from the ledger at the buzzer like everything
    // else. These build state through THE SEAMS (coverage past the
    // greatness bar, a met sprinkle row, a cherry at rest on the summit);
    // the reveal still rides a genuine patron look, the verdict the clock.
    // (Step 5 deletes the dead window machinery; the behaviour tested here
    // is already live as of the flip.)

    it("a revealed-but-unlanded flourish still WINS at the buzzer, without the coda", () => {
      const room = new Room();
      const a = connect(room, "alice");
      readyUp(room, a);
      jumpToRung(room, 3);
      // Coverage past the greatness bar → the Giant's next look REVEALS.
      seamPaint(room, 0.25); // 2★ — past the greatness bar (star2 0.18)
      run(room, 3 * PATRON_LOOK_EVERY + 5);
      expect(
        a.all("patron").some((m) => m.text.includes("A CHERRY. ON THE VERY TOP.")),
      ).toBe(true);
      expect(a.last("order")?.order.desire?.revealed).toBe(true);
      // Meet the sprinkle row but never land the cherry. At the buzzer the
      // cake passes (rows met, good coverage) → WON, but the coda is absent
      // (the flourish is ledger-judged — no cherry, no crown).
      seamSprinkles(room, 70);
      seamBuzzer(room);
      const end = a.all("order").find((m) => m.order.status === "won");
      expect(end).toBeDefined();
      expect(end?.judgment?.accepted).toBe(true);
      expect(end?.judgment?.flourish).toBeUndefined();
      // The ladder climbs from the conclusion as ever: linger, then the cupcake.
      run(room, ORDER_RESET_TICKS + 100);
      const wonAt = a.inbox.indexOf(end!);
      const fresh = a.inbox
        .slice(wonAt)
        .find((m) => m.t === "order" && m.fresh) as
        | Extract<ServerMsg, { t: "order" }>
        | undefined;
      expect(fresh?.rung).toBe(4);
    });

    it("the flourish at the buzzer: a cherry on the summit earns the coda", () => {
      const room = new Room();
      const a = connect(room, "alice");
      readyUp(room, a);
      jumpToRung(room, 3);
      seamPaint(room, 0.25); // 2★ — past the greatness bar (star2 0.18)
      run(room, 3 * PATRON_LOOK_EVERY + 5); // the reveal fires
      seamSprinkles(room, 70);
      seamCherry(room); // the crown rests → crownedWith true at the buzzer
      seamBuzzer(room);
      const end = a.all("order").find((m) => m.order.status === "won");
      expect(end).toBeDefined();
      expect(end?.judgment?.flourish).toBe(true);
      expect(end?.order.desire?.met).toBe(true);
    });

    it("the coda needs no reveal: a resting cherry crowns the cake even unrevealed (physical truth beats presentation)", () => {
      const room = new Room();
      const a = connect(room, "alice");
      readyUp(room, a);
      jumpToRung(room, 3);
      // Below the 2★ tier: the reveal never fires (cov < star2 0.18) — but
      // the cherry is already resting on the summit when the buzzer rings.
      seamPaint(room, 0.12);
      seamCherry(room);
      seamSprinkles(room, 70);
      seamBuzzer(room);
      const end = a.all("order").find((m) => m.order.status === "won");
      expect(end).toBeDefined();
      expect(end?.judgment?.flourish).toBe(true);
      expect(end?.order.desire?.met).toBe(true);
      expect(end?.order.desire?.revealed).toBe(false); // the offer never fired
    });

    it("ULTRA MASTER BAKER OF THE REALMS: the top-rung triumph with the coda, on the wire", () => {
      const room = new Room();
      const a = connect(room, "alice");
      readyUp(room, a);
      jumpToRung(room, 7); // cake-6 — the summit no shipped combo reaches
      seamPaint(room, 0.25); // past the pass floor (rung 7, flat 0.08)
      seamCherry(room); // …but the seam rests the impossible cherry
      seamSprinkles(room, 90);
      seamBuzzer(room);
      const end = a.all("order").find((m) => m.order.status === "won");
      expect(end?.judgment?.flourish).toBe(true);
      // The linger passes: the TOP rung won → runover in TRIUMPH, and the
      // coda upgrades the crown (§1: same wire idiom as `won`).
      run(room, ORDER_RESET_TICKS + 50);
      const over = a.all("run").find((m) => m.phase === "runover");
      expect(over?.won).toBe(true);
      expect(over?.ultra).toBe(true);
      // The report ends: the lobby starts clean — no lingering crown.
      run(room, RUNOVER_TICKS + 50);
      const lobby = a.all("run").filter((m) => m.phase === "lobby").pop();
      expect(lobby?.won).toBeUndefined();
      expect(lobby?.ultra).toBeUndefined();
    });
  });

  describe("THE PATRON AT THE MARK (plans/15 item 16): the collider rides the sim's own answer", () => {
    const rig = (room: Room): { species: string | null } =>
      (room as unknown as { patronRig: { species: string | null } }).patronRig;

    it("the lobby's mark is EMPTY (entry 5); the live order stands him up; the verdict clears him; the next lobby empties again", () => {
      const room = new Room();
      const a = connect(room, "alice");
      // THE TRAINING LOBBY (item 25, entry 5 razed the interim rule):
      // the table is empty pre-run — the practice target owns the
      // lobby's physics; the founding patron waits on the bench.
      run(room, 2);
      expect(rig(room).species).toBeNull();
      // A live rung 1: the founding patron stands his order.
      readyUp(room, a);
      expect(rig(room).species).toBe("ogre");
      // The clock dies — poll for the verdict, never a fixed tick count
      // (the relief stretched the solo clock; patience burns shrink it).
      let guard = 0;
      while (
        !a.all("order").some((m) => m.judgment) &&
        guard++ < (ORDER_SECONDS + 120) * 60
      )
        room.tick();
      expect(a.all("order").some((m) => m.judgment)).toBe(true);
      // The verdict clears the mark (the reconcile rides the next tick's
      // top): the walk theatre plays through the linger with the capsules
      // DOWN (ruled residue: a shot passes through the departing giant).
      run(room, 2);
      expect(rig(room).species).toBeNull();
      run(room, 60); // deep in the linger: still down
      expect(rig(room).species).toBeNull();
      // Runover holds the empty mark; the NEXT lobby holds it empty too
      // (entry 5 — both worlds agree; the client mirrors this exactly).
      // Poll for a FRESH lobby word (the boot lobby's own broadcasts are
      // already in the inbox).
      const lobbiesBefore = a.all("run").filter((m) => m.phase === "lobby").length;
      guard = 0;
      while (
        a.all("run").filter((m) => m.phase === "lobby").length <= lobbiesBefore &&
        guard++ < ORDER_RESET_TICKS + RUNOVER_TICKS + 600
      )
        room.tick();
      expect(
        a.all("run").filter((m) => m.phase === "lobby").length,
      ).toBeGreaterThan(lobbiesBefore);
      run(room, 2);
      expect(rig(room).species).toBeNull();
    });
  });

  describe("THE TRAINING LOBBY (plans/15 item 25): the practice target rides the run boundary", () => {
    const spec = (room: Room): string =>
      (room as unknown as { dessert: { spec: { id: string } } }).dessert.spec
        .id;

    it("boot stands the plank; the first deal swaps in rung 1's cake; the next lobby restores the plank", () => {
      const room = new Room();
      const a = connect(room, "alice");
      // No cake before the order — the boot mark holds the target.
      expect(spec(room)).toBe("practice");
      // ALL-IN: the dessert arrives WITH the first deal (startRun).
      readyUp(room, a);
      expect(spec(room)).toBe("cake-1");
      // The run dies (untended rung 1 burns out), the report plays, and
      // the lobby's fresh word rides the SAME tick the target returns.
      const lobbiesBefore = a.all("run").filter((m) => m.phase === "lobby").length;
      let guard = 0;
      while (
        a.all("run").filter((m) => m.phase === "lobby").length <= lobbiesBefore &&
        guard++ < (rungRow(1).clockSeconds + 120) * 60
      ) {
        room.tick();
        // Runover keeps the FINAL cake on display under the report.
        const phase = (room as unknown as { run: { phase: string } }).run
          .phase;
        if (phase === "runover") expect(spec(room)).toBe("cake-1");
      }
      expect(
        a.all("run").filter((m) => m.phase === "lobby").length,
      ).toBeGreaterThan(lobbiesBefore);
      expect(spec(room)).toBe("practice");
    });
  });
});
