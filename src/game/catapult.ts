/**
 * The catapult machine — pure state, pure transitions. game/ law: imports
 * core/ only, runs headless, no three.js, no DOM.
 *
 * This is the future network-sync boundary (plans/01, Step 2): clients send
 * INTENTS (crank, turn, load, fire), the authority applies these functions
 * and broadcasts the resulting state. Nothing here knows about rendering,
 * raycasts, or hold-to-operate timing — the client owns "how long you hold
 * E per click", these functions own what a click legally does.
 *
 * Design law (do not re-litigate): aim is MACHINE state, not camera state.
 * First-person is not FPS aiming — you crank this thing.
 * Mistakes execute, they never block: fire() always releases, even empty,
 * even at zero tension. Wrong topping loads and fires like any other.
 */

import { FIXED_DT } from "../core/constants";

/** Traverse (yaw) limits, degrees, relative to the machine's base facing. */
export const TRAVERSE_MIN_DEG = -60;
export const TRAVERSE_MAX_DEG = 60;
/** How fast holding the traverse wheel turns the machine. */
export const TRAVERSE_DEG_PER_SECOND = 30;

/** Tension ratchets up in discrete clicks — dead reckoning depends on
 * repeatable, countable power settings, not an analog slider.
 *
 * 10 since the towns slice (DECISION 1, plans/11 §6): a GLOBAL FLAT power
 * increase whose purpose is TOLL GEOMETRY, not reach reward — centered
 * and untilted, click 10 is the overshoot/toll shot that parks on the
 * OTHER town's plinth. Never purchased, never per-rung; on a one-town
 * table it is inert self-mess, honest. [AMENDED 2026-07-08: "click 10
 * adds zero coverage" was true of the 15° tilt ladder; under the vernier
 * (research/11 re-run) click 10 + fine tilt buys ~9pt of real one-town
 * reach. The toll geometry and DECISION 1's purpose stand.] The order's
 * ask did NOT rise with it (Option B, 2026-07-07): the authored ask
 * table in game/tuning.ts held at today's workload. */
export const TENSION_MAX_CLICKS = 10;
/** Real seconds of cranking per click — winching is WORK; this pacing is
 * where the "takes real seconds" pressure comes from. Client enforces it. */
export const CRANK_SECONDS_PER_CLICK = 0.75;

/** The elevation screw AT THE FRONT tilts the frame back in notches
 * (plans/04): notch 0 is the machine's natural throw — today's exact
 * feel — and each notch steepens the arc by 2.5°. THE VERNIER (DECIDED
 * 2026-07-07, measured research/13, blessed 2026-07-08): draw clicks
 * stay COARSE — the click economy is load-bearing — and elevation is
 * the FINE control. One notch moves the landing ~0.4–1.3m in the money
 * band; adjacent clicks land 1.8–8m apart, so 3–7 notches walk one
 * click gap. Ballistics adds the tilt to the arm's base elevation (55°);
 * 18 notches keep the full 45° throw of the old table: notch 14 (el 90°)
 * drops the shot on your own plinth, 15+ throw gently backwards over
 * the crew. Mistakes execute. */
export const TILT_DEG_PER_NOTCH = 2.5;
export const TILT_MAX_NOTCH = 18;
/** Real seconds of screwing per notch — the fine dial turns quick: a
 * 2–4 notch correction is 0.3–0.6s, a full-ladder sweep 2.7s of held
 * work (more total than the old 3×0.5s table, on purpose — the vernier
 * is dialed in small moves). 9 ticks at 60Hz; the clunk survives. */
export const SCREW_SECONDS_PER_NOTCH = 0.15;

export interface CatapultState {
  /** Machine yaw in degrees, clamped to traverse limits. */
  traverseDeg: number;
  /** Frame tilt, 0..TILT_MAX_NOTCH notches of TILT_DEG_PER_NOTCH each. */
  tiltNotch: number;
  /** Stored power, 0..TENSION_MAX_CLICKS. */
  tensionClicks: number;
  /** Topping id sitting in the bucket, or null when empty. */
  loaded: string | null;
}

/** What leaves the machine when the lever is pulled. */
export interface Shot {
  topping: string;
  traverseDeg: number;
  tiltNotch: number;
  tensionClicks: number;
}

export function createCatapult(): CatapultState {
  return { traverseDeg: 0, tiltNotch: 0, tensionClicks: 0, loaded: null };
}

/** Turn the traverse wheel by deltaDeg, clamped to the machine's limits. */
export function turnTraverse(
  state: CatapultState,
  deltaDeg: number,
): CatapultState {
  const traverseDeg = Math.min(
    TRAVERSE_MAX_DEG,
    Math.max(TRAVERSE_MIN_DEG, state.traverseDeg + deltaDeg),
  );
  return { ...state, traverseDeg };
}

/** One ratchet click of the tension winch. Clamped at max — cranking a
 * fully-wound machine does nothing (the ratchet just clacks). */
export function crankTension(state: CatapultState): CatapultState {
  return {
    ...state,
    tensionClicks: Math.min(TENSION_MAX_CLICKS, state.tensionClicks + 1),
  };
}

/** One notch of the elevation screw, clamped at both ends. */
export function turnScrew(state: CatapultState, dir: -1 | 1): CatapultState {
  return {
    ...state,
    tiltNotch: Math.min(TILT_MAX_NOTCH, Math.max(0, state.tiltNotch + dir)),
  };
}

/**
 * Put a topping in the bucket. Any topping loads — wrong ammo is a mistake
 * that EXECUTES. But a full bucket is physics, not a rule: loading onto an
 * already-loaded machine is a no-op (fire first).
 */
export function loadTopping(
  state: CatapultState,
  topping: string,
): CatapultState {
  if (state.loaded !== null) return state;
  return { ...state, loaded: topping };
}

/**
 * Pull the release lever. ALWAYS releases: the arm slams, tension resets.
 * Empty bucket → shot is null (a dry fire — the cranking was wasted, which
 * is the comedy). Zero tension still "fires": the shot carries 0 clicks and
 * ballistics (Step 3) will flop it out of the bucket.
 */
export function fire(state: CatapultState): {
  state: CatapultState;
  shot: Shot | null;
} {
  const shot: Shot | null =
    state.loaded === null
      ? null
      : {
          topping: state.loaded,
          traverseDeg: state.traverseDeg,
          tiltNotch: state.tiltNotch,
          tensionClicks: state.tensionClicks,
        };
  return {
    state: { ...state, tensionClicks: 0, loaded: null },
    shot,
  };
}

// ---------------------------------------------------------------------------
// Operating the machine, one fixed tick at a time.
//
// The transitions above say what a click legally does; tickMachine says how
// held intent BECOMES clicks. This is the whole "operated machine" feel in
// data form: cranking takes real held ticks, turning integrates a rate.
// The client (and later, the server applying remote intents) calls this once
// per fixed tick and renders whatever comes back.
// ---------------------------------------------------------------------------

/** Held ticks of winching per tension click (45 at 60Hz / 0.75s). */
export const CRANK_TICKS_PER_CLICK = Math.round(
  CRANK_SECONDS_PER_CLICK / FIXED_DT,
);
/** Held ticks of screwing per tilt notch (9 at 60Hz / 0.15s). */
export const SCREW_TICKS_PER_NOTCH = Math.round(
  SCREW_SECONDS_PER_NOTCH / FIXED_DT,
);
/** Traverse degrees per held tick (0.5° at 60Hz / 30° per second). */
export const TRAVERSE_DEG_PER_TICK = TRAVERSE_DEG_PER_SECOND * FIXED_DT;

/**
 * One tick of operator intent. Plain flat data — the future wire format for
 * "what this player is doing to the machine right now".
 */
export interface MachineIntent {
  /** Traverse wheel: -1 (right), 0, +1 (left), while engaged. */
  turn: -1 | 0 | 1;
  /** Elevation screw: -1 (lower), 0, +1 (raise), while engaged. */
  screw: -1 | 0 | 1;
  /** Winch engaged this tick (hold-to-crank). */
  crank: boolean;
  /** Release lever pulled this tick (edge, not hold). */
  pullLever: boolean;
  /** Topping shoved into the bucket this tick (edge), or null. */
  load: string | null;
}

// Frozen: shared idle constants get spread (`{...IDLE_INTENT}`), never
// mutated — one careless `merged.turn = 1` on the reference would poison
// every consumer (audit 2026-07-07).
export const IDLE_INTENT: MachineIntent = Object.freeze({
  turn: 0,
  screw: 0,
  crank: false,
  pullLever: false,
  load: null,
});

export interface MachineTickResult {
  state: CatapultState;
  /** Progress toward the next tension click, 0..CRANK_TICKS_PER_CLICK-1.
   * Thread this back into the next tick; render it as winch motion. */
  crankTicks: number;
  /** SIGNED progress toward the next tilt notch (positive raising,
   * negative lowering). Thread back like crankTicks; render as the screw
   * handle turning. */
  screwTicks: number;
  /** Non-null exactly when the lever released a loaded bucket this tick. */
  shot: Shot | null;
}

/**
 * Advance the machine by one fixed tick of operator intent.
 *
 * Crank law: letting go of the winch mid-click LOSES the partial progress —
 * winching is committed work, not a resumable meter. A full machine stops
 * accumulating (the ratchet just clacks).
 *
 * Screw law mirrors it: letting go drops partial progress, reversing
 * direction restarts it, and at either limit the screw just clacks.
 */
export function tickMachine(
  state: CatapultState,
  crankTicks: number,
  intent: MachineIntent,
  screwTicks = 0,
): MachineTickResult {
  let s = state;
  if (intent.load !== null) s = loadTopping(s, intent.load);
  if (intent.turn !== 0)
    s = turnTraverse(s, intent.turn * TRAVERSE_DEG_PER_TICK);

  let screw = 0;
  const screwCanMove =
    intent.screw > 0 ? s.tiltNotch < TILT_MAX_NOTCH : s.tiltNotch > 0;
  if (intent.screw !== 0 && screwCanMove) {
    screw =
      (Math.sign(screwTicks) === intent.screw ? screwTicks : 0) + intent.screw;
    if (Math.abs(screw) >= SCREW_TICKS_PER_NOTCH) {
      s = turnScrew(s, intent.screw);
      screw = 0;
    }
  }

  let progress = 0;
  if (intent.crank && s.tensionClicks < TENSION_MAX_CLICKS) {
    progress = crankTicks + 1;
    if (progress >= CRANK_TICKS_PER_CLICK) {
      s = crankTension(s);
      progress = 0;
    }
  }

  if (intent.pullLever) {
    const released = fire(s);
    return {
      state: released.state,
      crankTicks: progress,
      screwTicks: screw,
      shot: released.shot,
    };
  }
  return { state: s, crankTicks: progress, screwTicks: screw, shot: null };
}
