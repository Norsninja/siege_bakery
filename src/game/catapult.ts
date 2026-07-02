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
