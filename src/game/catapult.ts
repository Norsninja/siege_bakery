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
 * repeatable, countable power settings, not an analog slider. */
export const TENSION_MAX_CLICKS = 8;
/** Real seconds of cranking per click — winching is WORK; this pacing is
 * where the "takes real seconds" pressure comes from. Client enforces it. */
export const CRANK_SECONDS_PER_CLICK = 0.75;

export interface CatapultState {
  /** Machine yaw in degrees, clamped to traverse limits. */
  traverseDeg: number;
  /** Stored power, 0..TENSION_MAX_CLICKS. */
  tensionClicks: number;
  /** Topping id sitting in the bucket, or null when empty. */
  loaded: string | null;
}

/** What leaves the machine when the lever is pulled. */
export interface Shot {
  topping: string;
  traverseDeg: number;
  tensionClicks: number;
}

export function createCatapult(): CatapultState {
  return { traverseDeg: 0, tensionClicks: 0, loaded: null };
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
/** Traverse degrees per held tick (0.5° at 60Hz / 30° per second). */
export const TRAVERSE_DEG_PER_TICK = TRAVERSE_DEG_PER_SECOND * FIXED_DT;

/**
 * One tick of operator intent. Plain flat data — the future wire format for
 * "what this player is doing to the machine right now".
 */
export interface MachineIntent {
  /** Traverse wheel: -1 (right), 0, +1 (left), while engaged. */
  turn: -1 | 0 | 1;
  /** Winch engaged this tick (hold-to-crank). */
  crank: boolean;
  /** Release lever pulled this tick (edge, not hold). */
  pullLever: boolean;
  /** Topping shoved into the bucket this tick (edge), or null. */
  load: string | null;
}

export const IDLE_INTENT: MachineIntent = {
  turn: 0,
  crank: false,
  pullLever: false,
  load: null,
};

export interface MachineTickResult {
  state: CatapultState;
  /** Progress toward the next tension click, 0..CRANK_TICKS_PER_CLICK-1.
   * Thread this back into the next tick; render it as winch motion. */
  crankTicks: number;
  /** Non-null exactly when the lever released a loaded bucket this tick. */
  shot: Shot | null;
}

/**
 * Advance the machine by one fixed tick of operator intent.
 *
 * Crank law: letting go of the winch mid-click LOSES the partial progress —
 * winching is committed work, not a resumable meter. A full machine stops
 * accumulating (the ratchet just clacks).
 */
export function tickMachine(
  state: CatapultState,
  crankTicks: number,
  intent: MachineIntent,
): MachineTickResult {
  let s = state;
  if (intent.load !== null) s = loadTopping(s, intent.load);
  if (intent.turn !== 0)
    s = turnTraverse(s, intent.turn * TRAVERSE_DEG_PER_TICK);

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
    return { state: released.state, crankTicks: progress, shot: released.shot };
  }
  return { state: s, crankTicks: progress, shot: null };
}
