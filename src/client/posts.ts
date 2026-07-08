/**
 * THE GUN CREW (plans/14, experiment 2026-07-08) — crew POSTS around the
 * machine replace crosshair grips + E-chords for OPERATING it. Real siege
 * crews were gunner, loader, and winch-men; our machine has exactly those
 * seams:
 *
 *   GUNNER'S POST — behind the frame, sighting down the throw. A/D wheel,
 *     W/S screw, F lever. The aiming instrument (arc ladder) lives on its
 *     HUD panel.
 *   WINCH POST — the machine's right flank, at the drum. Hold Space.
 *   The BUCKET stays a walk-up crosshair interaction — the loader is the
 *     runner, and the pantry loop is sacred.
 *
 * THE LAW THIS PROTECTS (the discussion's core): ONE BODY, ONE JOB AT A
 * TIME. Co-op division of labor comes from FLOOR SPACE (posts are in
 * different places), not from input awkwardness. A solo baker sprinting
 * between posts IS solo hard mode, visibly and comically.
 *
 * THE LAW THIS RESPECTS: aim is MACHINE state — A/D integrates the same
 * 30°/s wheel rate, W/S the same 0.15s/notch screw. The camera is free
 * (a gentle snap toward the throw on manning, then yours); the reticle
 * NEVER aims.
 *
 * Pure functions; the wire is untouched — posts derive the same HeldOp
 * the grips did. ROLLBACK: revert the one commit; input.ts keeps the
 * superseded grip law intact underneath.
 */
import type { Vec3 } from "../core/ballistics";
import type { HeldOp } from "../game/protocol";

export type Post = "gunner" | "winch";

/** Stand this close to a post anchor to man it (E). Comfortable greybox
 * zones; the two anchors sit ~2.6m apart so they can never both claim. */
export const POST_RADIUS_M = 1.2;

/** Post anchors in MACHINE-LOCAL space (traverse-0 fires -Z local; +X is
 * the machine's right flank seen from the gunner). Gunner behind the
 * frame on the throw axis; winch beside the drum (scene.ts puts the drum
 * at local +0.8, the handle outboard of it). */
const LOCAL: readonly { post: Post; x: number; z: number }[] = [
  { post: "gunner", x: 0, z: 1.6 },
  { post: "winch", x: 1.5, z: -0.55 },
];

export interface PostAnchor {
  post: Post;
  x: number;
  z: number;
}

/** World-space anchors for a town's machine: local offsets rotated by the
 * town's facing (same Y-rotation convention as launchVelocity/baker yaw). */
export function postAnchors(base: Vec3, facingDeg: number): PostAnchor[] {
  const rad = (facingDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return LOCAL.map((l) => ({
    post: l.post,
    x: base.x + l.x * c + l.z * s,
    z: base.z - l.x * s + l.z * c,
  }));
}

/** Which post (if any) a baker standing at (x, z) can man — nearest
 * anchor within POST_RADIUS_M. */
export function postAt(
  pos: { x: number; z: number },
  anchors: readonly PostAnchor[],
): Post | null {
  let best: Post | null = null;
  let bestD2 = POST_RADIUS_M * POST_RADIUS_M;
  for (const a of anchors) {
    const dx = pos.x - a.x;
    const dz = pos.z - a.z;
    const d2 = dx * dx + dz * dz;
    if (d2 <= bestD2) {
      bestD2 = d2;
      best = a.post;
    }
  }
  return best;
}

/** Held machine intent from the manned post + held keys. Opposing keys
 * cancel (A+D, W+S) — the machine is honest, same as the grip law. The
 * gunner cannot crank and the winch cannot aim: one body, one job. */
export function postOp(post: Post | null, keys: ReadonlySet<string>): HeldOp {
  return {
    turn:
      post === "gunner"
        ? keys.has("KeyA") && !keys.has("KeyD")
          ? 1
          : keys.has("KeyD") && !keys.has("KeyA")
            ? -1
            : 0
        : 0,
    screw:
      post === "gunner"
        ? keys.has("KeyW") && !keys.has("KeyS")
          ? 1
          : keys.has("KeyS") && !keys.has("KeyW")
            ? -1
            : 0
        : 0,
    crank: post === "winch" && keys.has("Space"),
  };
}
