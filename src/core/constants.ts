/**
 * Simulation-wide constants. core/ law: deterministic, headless, no DOM.
 */

/** Fixed simulation timestep. 60Hz, decoupled from rendering (client) and
 * from wall-clock (server). Everything that steps the sim uses this. */
export const FIXED_DT = 1 / 60;

/** Standard gravity for every physics world in the game. */
export const GRAVITY = { x: 0, y: -9.81, z: 0 };
