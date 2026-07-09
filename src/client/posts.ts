/**
 * THE GUN CREW (plans/14, experiment 2026-07-08) — crew POSTS around the
 * machine replace crosshair grips + E-chords for OPERATING it. Real siege
 * crews were gunner, loader, and winch-men; our machine has exactly those
 * seams:
 *
 *   GUNNER'S POST — the LEFT rear flank, sighting down the throw (feel
 *     test 2026-07-08: dead-center puts the throwing arm in your face,
 *     the right rear stares into the draw spool — one clear-view spot,
 *     wheel side). A/D wheel, W/S screw, F lever. The aiming instrument
 *     (arc ladder) lives on its HUD panel.
 *   WINCH POST — the machine's right flank, at the drum. W or Space
 *     winds, S unwinds (the post grammar: W/S is always more/less; no
 *     Ctrl — the browser owns Ctrl+W — and no chords, ever).
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

/** Post spots in MACHINE-LOCAL space (traverse-0 fires -Z local; +X is
 * the machine's right flank seen from the gunner), each with its OWN
 * mannable radius. The gunner's two flank spots use a tight radius so a
 * dead band survives behind the arm (|x| < ~0.4 gets no invitation —
 * the view there is the arm, feel test 2026-07-08); the winch keeps the
 * comfortable 1.2 the first test liked. scene.ts draws a flagstone per
 * spot from this same table — zones you can SEE beat zones you remember. */
export const POST_SPOTS: readonly {
  post: Post;
  x: number;
  z: number;
  r: number;
}[] = [
  // LEFT flank only (feel test round 2, 2026-07-08): the right rear
  // stares into the draw spool — the machine's own body blocks that
  // sightline, so the spot came out. The wheel lives on the left
  // anyway; the gunner works from the wheel side.
  { post: "gunner", x: -1.0, z: 1.6, r: 0.6 },
  { post: "winch", x: 1.5, z: -0.55, r: 1.2 },
];

export interface PostAnchor {
  post: Post;
  x: number;
  z: number;
  r: number;
}

/** World-space anchors for a town's machine: local offsets rotated by the
 * town's facing (same Y-rotation convention as launchVelocity/baker yaw). */
export function postAnchors(base: Vec3, facingDeg: number): PostAnchor[] {
  const rad = (facingDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return POST_SPOTS.map((l) => ({
    post: l.post,
    x: base.x + l.x * c + l.z * s,
    z: base.z - l.x * s + l.z * c,
    r: l.r,
  }));
}

/** Which post (if any) a baker standing at (x, z) can man — the anchor
 * whose zone the baker is deepest inside (distance minus radius). */
export function postAt(
  pos: { x: number; z: number },
  anchors: readonly PostAnchor[],
): Post | null {
  let best: Post | null = null;
  let bestDepth = 0;
  for (const a of anchors) {
    const dx = pos.x - a.x;
    const dz = pos.z - a.z;
    const depth = Math.sqrt(dx * dx + dz * dz) - a.r;
    if (depth <= 0 && depth <= bestDepth) {
      bestDepth = depth;
      best = a.post;
    }
  }
  return best;
}

/** THE ONE KEY TABLE (plans/15 item 5, constraint b — the UI pass,
 * 2026-07-09): every key a post honors, named ONCE. postOp READS this
 * table and the post panel (hud.postPanel) RENDERS its keycaps from it,
 * so the HUD physically cannot show a key the machine ignores — the
 * W/S = more/less law (plans/14) cannot drift between hand and eye.
 * `label` is the keycap the panel draws for that code. (KeyF's edge is
 * tracked in input.ts and gated on the manned post in main — the fire
 * cap below is the same key by law; move both together.) */
export interface PostKey {
  code: string;
  label: string;
}
export const POST_KEYS = {
  gunner: {
    wheelLeft: [{ code: "KeyA", label: "A" }],
    wheelRight: [{ code: "KeyD", label: "D" }],
    screwUp: [{ code: "KeyW", label: "W" }],
    screwDown: [{ code: "KeyS", label: "S" }],
    fire: [{ code: "KeyF", label: "F" }],
  },
  winch: {
    wind: [
      { code: "KeyW", label: "W" },
      { code: "Space", label: "SPACE" },
    ],
    unwind: [{ code: "KeyS", label: "S" }],
  },
} as const satisfies Record<Post, Record<string, readonly PostKey[]>>;

const anyHeld = (
  keys: ReadonlySet<string>,
  list: readonly PostKey[],
): boolean => list.some((k) => keys.has(k.code));

/** Held machine intent from the manned post + held keys. Opposing keys
 * cancel (A+D, W+S, wind+unwind) — the machine is honest, same as the
 * grip law. The gunner cannot crank and the winch cannot aim: one body,
 * one job. The post grammar: W/S is always MORE/LESS — elevation at the
 * gunner, tension at the winch (Space stays as wind, the habit the
 * first feel test formed). Reads POST_KEYS — the one table above. */
export function postOp(post: Post | null, keys: ReadonlySet<string>): HeldOp {
  const g = POST_KEYS.gunner;
  const w = POST_KEYS.winch;
  const left = anyHeld(keys, g.wheelLeft);
  const right = anyHeld(keys, g.wheelRight);
  const up = anyHeld(keys, g.screwUp);
  const down = anyHeld(keys, g.screwDown);
  const wind = anyHeld(keys, w.wind);
  const unwind = anyHeld(keys, w.unwind);
  return {
    turn: post === "gunner" ? (left && !right ? 1 : right && !left ? -1 : 0) : 0,
    screw: post === "gunner" ? (up && !down ? 1 : down && !up ? -1 : 0) : 0,
    crank:
      post === "winch" ? (wind && !unwind ? 1 : unwind && !wind ? -1 : 0) : 0,
  };
}
