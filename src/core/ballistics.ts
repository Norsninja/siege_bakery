/**
 * Ballistics — the machine's Shot becomes a launch. Pure math, core/ law.
 *
 * The catapult arm has a FIXED elevation; tension clicks buy launch speed.
 * That single knob makes power the whole dead-reckoning game: more clicks =
 * farther AND harder. With the greybox layout (plinth to cake-center 18m),
 * the click ladder lands roughly: 6 = cake front, 7 = cake middle, 8 = long.
 * Tuning verdicts belong to the Step 4 playtest; pin nothing but the shape.
 */

/** The arm's NATURAL elevation above horizontal, degrees — the throw the
 * machine makes on a level frame (tilt 0 = today's exact feel). The
 * elevation screw (plans/04) tilts the frame, ADDING degrees on top. */
export const LAUNCH_ELEVATION_DEG = 55;
/** speed = BASE + PER_CLICK * clicks (m/s), for clicks >= 1. */
export const LAUNCH_SPEED_BASE = 4;
export const LAUNCH_SPEED_PER_CLICK = 1.5;
/** Zero tension still "fires": the topping flops out of the bucket. */
export const FLOP_SPEED = 1.2;

/** Impact speed at or above this splats; below it, the topping places.
 * Sits so that the minimum power reaching the cake top places, and any
 * overkill splats. Playtest-tunable. */
export const SPLAT_SPEED = 13;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function launchSpeed(tensionClicks: number): number {
  if (tensionClicks <= 0) return FLOP_SPEED;
  return LAUNCH_SPEED_BASE + LAUNCH_SPEED_PER_CLICK * tensionClicks;
}

/**
 * Launch velocity for a shot. traverseDeg 0 fires -Z (the machine's base
 * facing, same convention as baker yaw); positive traverse turns left
 * (toward -X), matching a three.js rotation.y of the same angle.
 *
 * tiltDeg is the frame tilt from the elevation screw; total elevation =
 * 55° + tilt. Past 90° the cosine goes negative and the machine gently
 * throws BACKWARDS over its own crew — mistakes execute.
 */
export function launchVelocity(
  traverseDeg: number,
  tensionClicks: number,
  tiltDeg = 0,
): Vec3 {
  const speed = launchSpeed(tensionClicks);
  const yaw = (traverseDeg * Math.PI) / 180;
  const el = ((LAUNCH_ELEVATION_DEG + tiltDeg) * Math.PI) / 180;
  const horizontal = speed * Math.cos(el);
  return {
    x: horizontal * -Math.sin(yaw),
    y: speed * Math.sin(el),
    z: horizontal * -Math.cos(yaw),
  };
}

/**
 * Where the topping leaves the machine: above the arm, nudged toward the
 * throw so the projectile clears the machine's own greybox. base is the
 * machine's floor point (top of the plinth).
 */
export function launchOrigin(base: Vec3, traverseDeg: number): Vec3 {
  const yaw = (traverseDeg * Math.PI) / 180;
  return {
    x: base.x + 0.2 * -Math.sin(yaw),
    y: base.y + 1.2,
    z: base.z + 0.2 * -Math.cos(yaw),
  };
}
