/**
 * Catapult machine state — pure functions, exhaustively cheap to test.
 * This state is the future network-sync boundary; these tests pin its law.
 */
import { describe, it, expect } from "vitest";
import {
  createCatapult,
  turnTraverse,
  crankTension,
  turnScrew,
  loadTopping,
  fire,
  tickMachine,
  TRAVERSE_MIN_DEG,
  TRAVERSE_MAX_DEG,
  TENSION_MAX_CLICKS,
  TILT_MAX_NOTCH,
  CRANK_TICKS_PER_CLICK,
  SCREW_TICKS_PER_NOTCH,
  TRAVERSE_DEG_PER_TICK,
  IDLE_INTENT,
  type CatapultState,
} from "./catapult";

describe("catapult machine state", () => {
  it("starts centered, level, slack, and empty", () => {
    expect(createCatapult()).toEqual({
      traverseDeg: 0,
      tiltNotch: 0,
      tensionClicks: 0,
      loaded: null,
    });
  });

  it("traverse turns and clamps at both limits", () => {
    let s = createCatapult();
    s = turnTraverse(s, 25);
    expect(s.traverseDeg).toBe(25);
    s = turnTraverse(s, -40);
    expect(s.traverseDeg).toBe(-15);
    s = turnTraverse(s, -999);
    expect(s.traverseDeg).toBe(TRAVERSE_MIN_DEG);
    s = turnTraverse(s, 999);
    expect(s.traverseDeg).toBe(TRAVERSE_MAX_DEG);
  });

  it("tension ratchets up one click at a time and clamps at max", () => {
    let s = createCatapult();
    s = crankTension(s);
    expect(s.tensionClicks).toBe(1);
    for (let i = 0; i < 50; i++) s = crankTension(s);
    expect(s.tensionClicks).toBe(TENSION_MAX_CLICKS);
  });

  it("loads any topping into an empty bucket — wrong ammo included", () => {
    const s = loadTopping(createCatapult(), "cherry");
    expect(s.loaded).toBe("cherry");
    // Wrong topping for the order still loads. Mistakes execute.
    const wrong = loadTopping(createCatapult(), "anchovy");
    expect(wrong.loaded).toBe("anchovy");
  });

  it("loading a full bucket is a no-op, not a swap", () => {
    const s = loadTopping(createCatapult(), "cherry");
    const again = loadTopping(s, "sprinkles");
    expect(again.loaded).toBe("cherry");
  });

  it("fire releases the shot with the machine's aim and power, then resets", () => {
    let s = createCatapult();
    s = turnTraverse(s, 30);
    for (let i = 0; i < 5; i++) s = crankTension(s);
    s = loadTopping(s, "cherry");
    s = turnScrew(s, 1);
    const { state, shot } = fire(s);
    expect(shot).toEqual({
      topping: "cherry",
      traverseDeg: 30,
      tiltNotch: 1,
      tensionClicks: 5,
    });
    expect(state.tensionClicks).toBe(0);
    expect(state.loaded).toBeNull();
    expect(state.traverseDeg).toBe(30); // aim survives firing
    expect(state.tiltNotch).toBe(1); // so does the frame tilt
  });

  it("dry fire (empty bucket) still releases: no shot, tension wasted", () => {
    let s = createCatapult();
    for (let i = 0; i < 4; i++) s = crankTension(s);
    const { state, shot } = fire(s);
    expect(shot).toBeNull();
    expect(state.tensionClicks).toBe(0);
  });

  it("zero-tension fire still produces a shot (the flop is ballistics' job)", () => {
    const s = loadTopping(createCatapult(), "cherry");
    const { shot } = fire(s);
    expect(shot).toEqual({
      topping: "cherry",
      traverseDeg: 0,
      tiltNotch: 0,
      tensionClicks: 0,
    });
  });

  it("the screw notches up and down and clamps at both ends", () => {
    let s = createCatapult();
    s = turnScrew(s, 1);
    expect(s.tiltNotch).toBe(1);
    // Overshoot the ladder by 2 in each direction — the loop must clear
    // the whole 19-position vernier, not a hardcoded count.
    for (let i = 0; i < TILT_MAX_NOTCH + 2; i++) s = turnScrew(s, 1);
    expect(s.tiltNotch).toBe(TILT_MAX_NOTCH);
    for (let i = 0; i < TILT_MAX_NOTCH + 2; i++) s = turnScrew(s, -1);
    expect(s.tiltNotch).toBe(0);
  });

  it("holding the screw for SCREW_TICKS_PER_NOTCH raises exactly one notch", () => {
    let s = createCatapult();
    let screw = 0;
    const raise = { ...IDLE_INTENT, screw: 1 as const };
    for (let i = 0; i < SCREW_TICKS_PER_NOTCH - 1; i++) {
      ({ state: s, screwTicks: screw } = tickMachine(s, 0, raise, screw));
      expect(s.tiltNotch).toBe(0); // not yet
    }
    ({ state: s, screwTicks: screw } = tickMachine(s, 0, raise, screw));
    expect(s.tiltNotch).toBe(1);
    expect(screw).toBe(0);
  });

  it("letting go of the screw drops partial progress; reversing restarts it", () => {
    let s = createCatapult();
    let screw = 0;
    const raise = { ...IDLE_INTENT, screw: 1 as const };
    const lower = { ...IDLE_INTENT, screw: -1 as const };
    for (let i = 0; i < SCREW_TICKS_PER_NOTCH - 5; i++)
      ({ state: s, screwTicks: screw } = tickMachine(s, 0, raise, screw));
    // Walk away one tick: progress gone.
    ({ state: s, screwTicks: screw } = tickMachine(s, 0, IDLE_INTENT, screw));
    expect(screw).toBe(0);
    // Near-notch raising progress does not bank toward lowering.
    s = turnScrew(s, 1); // sit at notch 1 so lowering is legal
    for (let i = 0; i < SCREW_TICKS_PER_NOTCH - 5; i++)
      ({ state: s, screwTicks: screw } = tickMachine(s, 0, raise, screw));
    ({ state: s, screwTicks: screw } = tickMachine(s, 0, lower, screw));
    expect(screw).toBe(-1); // restarted, one tick the other way
    expect(s.tiltNotch).toBe(1);
  });

  it("at either limit the screw just clacks — no banked progress", () => {
    let s = createCatapult(); // notch 0: lowering is a no-op
    let screw = 0;
    const lower = { ...IDLE_INTENT, screw: -1 as const };
    for (let i = 0; i < SCREW_TICKS_PER_NOTCH * 2; i++)
      ({ state: s, screwTicks: screw } = tickMachine(s, 0, lower, screw));
    expect(s.tiltNotch).toBe(0);
    expect(screw).toBe(0);
  });

  it("holding the winch for CRANK_TICKS_PER_CLICK yields exactly one click", () => {
    let s = createCatapult();
    let progress = 0;
    const crank = { ...IDLE_INTENT, crank: 1 as const };
    for (let i = 0; i < CRANK_TICKS_PER_CLICK - 1; i++) {
      ({ state: s, crankTicks: progress } = tickMachine(s, progress, crank));
      expect(s.tensionClicks).toBe(0); // not yet
    }
    ({ state: s, crankTicks: progress } = tickMachine(s, progress, crank));
    expect(s.tensionClicks).toBe(1);
    expect(progress).toBe(0);
  });

  it("letting go of the winch loses partial crank progress", () => {
    let s = createCatapult();
    let progress = 0;
    const crank = { ...IDLE_INTENT, crank: 1 as const };
    for (let i = 0; i < CRANK_TICKS_PER_CLICK - 5; i++)
      ({ state: s, crankTicks: progress } = tickMachine(s, progress, crank));
    // Walk away for one tick — the pawl drops, progress is gone.
    ({ state: s, crankTicks: progress } = tickMachine(s, progress, IDLE_INTENT));
    expect(progress).toBe(0);
    for (let i = 0; i < CRANK_TICKS_PER_CLICK - 1; i++) {
      ({ state: s, crankTicks: progress } = tickMachine(s, progress, crank));
    }
    expect(s.tensionClicks).toBe(0); // still needs the full hold again
  });

  it("a fully-wound machine stops accumulating crank progress", () => {
    let s: CatapultState = {
      traverseDeg: 0,
      tiltNotch: 0,
      tensionClicks: TENSION_MAX_CLICKS,
      loaded: null,
    };
    let progress = 0;
    const crank = { ...IDLE_INTENT, crank: 1 as const };
    for (let i = 0; i < CRANK_TICKS_PER_CLICK * 2; i++)
      ({ state: s, crankTicks: progress } = tickMachine(s, progress, crank));
    expect(s.tensionClicks).toBe(TENSION_MAX_CLICKS);
    expect(progress).toBe(0);
  });

  it("the unwind (plans/14): a held click DOWN costs the same seconds, clamps at slack", () => {
    let s: CatapultState = {
      traverseDeg: 0,
      tiltNotch: 0,
      tensionClicks: 2,
      loaded: null,
    };
    let progress = 0;
    const unwind = { ...IDLE_INTENT, crank: -1 as const };
    for (let i = 0; i < CRANK_TICKS_PER_CLICK - 1; i++) {
      ({ state: s, crankTicks: progress } = tickMachine(s, progress, unwind));
      expect(s.tensionClicks).toBe(2); // not yet — held work both ways
    }
    ({ state: s, crankTicks: progress } = tickMachine(s, progress, unwind));
    expect(s.tensionClicks).toBe(1);
    expect(progress).toBe(0);
    // Reversing direction restarts the click: unwind progress does not
    // bank toward winding (mirrors the screw's reversal law).
    const wind = { ...IDLE_INTENT, crank: 1 as const };
    for (let i = 0; i < CRANK_TICKS_PER_CLICK - 5; i++)
      ({ state: s, crankTicks: progress } = tickMachine(s, progress, unwind));
    ({ state: s, crankTicks: progress } = tickMachine(s, progress, wind));
    expect(progress).toBe(1); // restarted, one tick the other way
    expect(s.tensionClicks).toBe(1);
    // At slack the ratchet just clacks.
    s = { ...s, tensionClicks: 0 };
    progress = 0;
    for (let i = 0; i < CRANK_TICKS_PER_CLICK * 2; i++)
      ({ state: s, crankTicks: progress } = tickMachine(s, progress, unwind));
    expect(s.tensionClicks).toBe(0);
    expect(progress).toBe(0);
  });

  it("holding the traverse wheel integrates the turn rate and clamps", () => {
    let s = createCatapult();
    const left = { ...IDLE_INTENT, turn: 1 as const };
    for (let i = 0; i < 60; i++) ({ state: s } = tickMachine(s, 0, left));
    expect(s.traverseDeg).toBeCloseTo(60 * TRAVERSE_DEG_PER_TICK, 5);
    for (let i = 0; i < 600; i++) ({ state: s } = tickMachine(s, 0, left));
    expect(s.traverseDeg).toBe(TRAVERSE_MAX_DEG);
  });

  it("load + lever in one tick loads first, then fires that topping", () => {
    const r = tickMachine(createCatapult(), 0, {
      turn: 0,
      screw: 0,
      crank: 0,
      pullLever: true,
      load: "cherry",
    });
    expect(r.shot?.topping).toBe("cherry");
    expect(r.state.loaded).toBeNull();
  });

  it("transitions never mutate their input state", () => {
    const s0 = loadTopping(crankTension(createCatapult()), "cherry");
    const frozen = JSON.stringify(s0);
    turnTraverse(s0, 10);
    crankTension(s0);
    loadTopping(s0, "sprinkles");
    fire(s0);
    expect(JSON.stringify(s0)).toBe(frozen);
  });
});
