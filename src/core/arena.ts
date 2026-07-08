/**
 * The greybox arena — ONE definition of the level, shared by everyone.
 *
 * Client visuals, client movement colliders, the Room's authoritative
 * physics, and the ballistics tests all read these constants; nobody
 * duplicates geometry. When Blender becomes the level editor this file is
 * what its export replaces.
 *
 * TWO FORTS, ONE CAKE (the towns slice, plans/11 §3): the arena is two
 * bounded enclosures besieging a giant cake in the no-man's-land between
 * them. Town 1 is the 180° ROTATION of town 0 about the cake axis —
 * research/11's proven transform, a rotation NOT a mirror, so each crew's
 * "left is left". Each enclosure is FULLY walled; the front wall (facing
 * the cake) has a GATE opening on the run centerline. (Plans/11 §3's
 * "open mouth = sightline glue" is DEPRECATED — visionary, 2026-07-07: a
 * 1m wall never blocked the 1.5m eye line or the arcs; the front came
 * back for the switch-between-orders law. The gate's FENCE — closed while
 * an order runs — is client-side baker-only physics, client/gates.ts;
 * this file only owns the geometry.) The greybox enclosure is a
 * placeholder keyed to the town's anchors: a later Blender pass drops
 * town models onto the SAME `TOWNS` coordinates without touching game
 * logic.
 *
 * core/ law: deterministic, may import Rapier, no DOM, no three.js.
 */
import RAPIER from "@dimforge/rapier3d-compat";
import { ARENA_CROSSING_M } from "./baker";
import type { Vec3 } from "./ballistics";

export const CROSS_HALF = ARENA_CROSSING_M / 2; // 12
export const ARENA_HALF_LENGTH = CROSS_HALF + 1; // walls just past endpoints
export const ARENA_HALF_WIDTH = 8;
export const WALL_HEIGHT = 1;

/** The cake: three concentric ROUND tiers at the old cake spot — plinth to
 * center still 18 m. Square (plans/05) went cylindrical at the front of the
 * frosting slice (plans/07 phase R) so the coverage census is built once
 * against final geometry. Radii = the pinned square half-extents verbatim:
 * the cylinder study (research/04-cylinder-tier-study.mts) confirmed the
 * centerline settle ladder survives unchanged (6 → tier 2, 7 → tier 3,
 * notch 1 + full crank = the tier-clearing crown shot that cannot overshoot)
 * and the curved ledges still catch at moderate traverse (±8°); the summit
 * demands a centered shot, which is the crown earning its name. */
export const CAKE_Z = -CROSS_HALF - 18; // -30

export interface CakeTier {
  /** x/z radius (tiers are cylinders, concentric on CAKE_Z). */
  radius: number;
  bottom: number;
  top: number;
}

export const CAKE_TIERS: readonly CakeTier[] = [
  { radius: 4, bottom: 0, top: 2 },
  { radius: 3, bottom: 2, top: 3.5 },
  { radius: 2.25, bottom: 3.5, top: 5 },
];

/** Index of the summit tier — where a crown must rest (game/judgment). */
export const TOP_TIER = CAKE_TIERS.length - 1;

export interface WallDef {
  hx: number;
  hy: number;
  hz: number;
  x: number;
  z: number;
}

/** 180° rotation about the cake axis: (x, z) → (−x, 2·CAKE_Z − z). */
function rotateAboutCake(p: Vec3): Vec3 {
  return { x: -p.x, y: p.y, z: 2 * CAKE_Z - p.z };
}

/** Walls are axis-aligned cuboids; under a 180° rotation the half-extents
 * survive and only the center moves. */
function rotateWall(w: WallDef): WallDef {
  return { ...w, x: -w.x, z: 2 * CAKE_Z - w.z };
}

/** The gate opening in each town's front wall: half-width of the gap the
 * crew runs through when switching towns between orders. Wide enough for
 * the 0.35-radius baker with room to spare, narrow enough that the front
 * reads as a wall with a doorway, not a missing wall. */
export const GATE_HALF_WIDTH = 1.5;
/** The doorway sits BESIDE the machine (local +x), never behind it: the
 * plinth (x −1..1, z −13..−11) owns the wall's center — a centerline gate
 * would open onto the machine's back (measured: the first gate build put
 * it there and the plinth, not the fence, blocked every crossing). The
 * 180° rotation carries the gate to each fort's SAME local side. */
const GATE_X = 4;

/** Town 0's enclosure: side walls + back wall + a GATED front wall toward
 * the cake (the original single-town footprint, front restored 2026-07-07
 * with a doorway — the towns slice had retired it whole; see header). */
const TOWN0_WALLS: readonly WallDef[] = [
  { hx: 0.25, hy: WALL_HEIGHT / 2, hz: ARENA_HALF_LENGTH, x: -ARENA_HALF_WIDTH, z: 0 },
  { hx: 0.25, hy: WALL_HEIGHT / 2, hz: ARENA_HALF_LENGTH, x: ARENA_HALF_WIDTH, z: 0 },
  { hx: ARENA_HALF_WIDTH, hy: WALL_HEIGHT / 2, hz: 0.25, x: 0, z: ARENA_HALF_LENGTH },
  // The front wall's two unequal flanks; the gap between them is the gate.
  {
    hx: (GATE_X - GATE_HALF_WIDTH + ARENA_HALF_WIDTH) / 2,
    hy: WALL_HEIGHT / 2,
    hz: 0.25,
    x: (GATE_X - GATE_HALF_WIDTH - ARENA_HALF_WIDTH) / 2,
    z: -ARENA_HALF_LENGTH,
  },
  {
    hx: (ARENA_HALF_WIDTH - GATE_X - GATE_HALF_WIDTH) / 2,
    hy: WALL_HEIGHT / 2,
    hz: 0.25,
    x: (GATE_X + GATE_HALF_WIDTH + ARENA_HALF_WIDTH) / 2,
    z: -ARENA_HALF_LENGTH,
  },
];

/** One fort: the anchors a crew's whole world hangs on. The sim never
 * knows whether a town is five grey cuboids or a detailed Blender model —
 * only these coordinates (plans/11 §3). */
export interface Town {
  /** The machine's floor point: top of the plinth. */
  base: Vec3;
  pantry: Vec3;
  plinth: Vec3;
  spawn: Vec3;
  /** Machine facing, degrees: 0 fires −Z (town 0's throw toward the cake);
   * 180 fires +Z (town 1's). Composes with traverse — both Y-rotations. */
  facingDeg: number;
  /** Center of the gate opening in the front wall (ground plane). The
   * fort interior lies on the pantry's side of this point. */
  gate: { x: number; z: number };
  /** Side + back + gated-front walls (the gate gap has no wall). */
  walls: readonly WallDef[];
}

const TOWN0: Town = {
  base: { x: 0, y: 1, z: -CROSS_HALF },
  pantry: { x: 0, y: 0.75, z: CROSS_HALF },
  plinth: { x: 0, y: 0.5, z: -CROSS_HALF },
  spawn: { x: 0, y: 1.2, z: CROSS_HALF - 2 },
  facingDeg: 0,
  gate: { x: GATE_X, z: -ARENA_HALF_LENGTH },
  walls: TOWN0_WALLS,
};

/** THE TOWNS TABLE (plans/11 §3). [0] is the original town; [1] its 180°
 * rotation about the cake axis (pantry at z=−72, machine at z=−48, back
 * wall at z=−73). BOTH forts always exist physically — an uncrewed fort is
 * scenery (plans/09 §3); whether town 1's machine is CREWED is `activeTowns`
 * runtime state (server), never geometry. */
export const TOWNS: readonly Town[] = [
  TOWN0,
  {
    base: rotateAboutCake(TOWN0.base),
    pantry: rotateAboutCake(TOWN0.pantry),
    plinth: rotateAboutCake(TOWN0.plinth),
    spawn: rotateAboutCake(TOWN0.spawn),
    facingDeg: 180,
    gate: { x: -TOWN0.gate.x, z: 2 * CAKE_Z - TOWN0.gate.z },
    walls: TOWN0_WALLS.map(rotateWall),
  },
];

/** THE READY CIRCLE (the campaign lobby, plans/13 slice 1): stand-here
 * furniture in town 0 — the run starts when every connected baker stands
 * inside and holds through the countdown. Off the spawn→pantry and
 * spawn→machine lines (spawn z=10, pantry z=12, the run centerline x=0);
 * sized for four 0.35-radius bakers with breathing room. Greybox
 * placement — the feel pass moves it (plans/13 §9). */
export const READY_CIRCLE = { x: -3, z: CROSS_HALF - 4, r: 1.6 };

/** Is a ground position inside the ready circle? (Poses are the truth the
 * server reads — client-authoritative, riding the message stream, inside
 * the determinism fence like every input.) */
export function inReadyCircle(pos: { x: number; z: number }): boolean {
  const dx = pos.x - READY_CIRCLE.x;
  const dz = pos.z - READY_CIRCLE.z;
  return Math.sqrt(dx * dx + dz * dz) <= READY_CIRCLE.r;
}

// The single-town names, kept as TOWNS[0] aliases — research scripts and
// the pre-towns codebase import these; nothing churns (plans/11 §3).
export const MACHINE_BASE: Vec3 = TOWNS[0]!.base;
export const PANTRY_POS: Vec3 = TOWNS[0]!.pantry;
export const PLINTH_POS: Vec3 = TOWNS[0]!.plinth;
export const BAKER_SPAWN: Vec3 = TOWNS[0]!.spawn;
/** Prop half-extents, shared by every town's pantry/plinth. */
export const PANTRY_HALF: Vec3 = { x: 2, y: 0.75, z: 0.5 };
export const PLINTH_HALF: Vec3 = { x: 1, y: 0.5, z: 1 };

/** Every wall in the arena — both enclosures, flattened. Renderers and
 * research scripts loop this exactly as before. */
export const WALLS: readonly WallDef[] = TOWNS.flatMap((t) => t.walls);

/** The ground slab spans BOTH forts and the no-man's-land between them:
 * centered on the cake axis (z=−30), reaching past town 1's back wall
 * (z=−73) and town 0's (z=+13) with the same 5m margin each way. The old
 * origin-centered 40-half slab ended at z=−40 — short of town 1 entirely
 * (research/11 had to lay its own extra slab to study long shots). */
export const GROUND_HALF_X = 40;
export const GROUND_HALF_Z = 48;
export const GROUND_CENTER_Z = CAKE_Z;

/** Build the static world every simulation agrees on. */
export function buildArenaColliders(world: RAPIER.World): void {
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(GROUND_HALF_X, 0.1, GROUND_HALF_Z)
      .setTranslation(0, -0.1, GROUND_CENTER_Z),
  );
  for (const w of WALLS) {
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(w.hx, w.hy, w.hz).setTranslation(
        w.x,
        WALL_HEIGHT / 2,
        w.z,
      ),
    );
  }
  for (const t of TOWNS) {
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(PANTRY_HALF.x, PANTRY_HALF.y, PANTRY_HALF.z)
        .setTranslation(t.pantry.x, t.pantry.y, t.pantry.z),
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(PLINTH_HALF.x, PLINTH_HALF.y, PLINTH_HALF.z)
        .setTranslation(t.plinth.x, t.plinth.y, t.plinth.z),
    );
  }
  for (const t of CAKE_TIERS) {
    const hy = (t.top - t.bottom) / 2;
    world.createCollider(
      RAPIER.ColliderDesc.cylinder(hy, t.radius).setTranslation(
        0,
        t.bottom + hy,
        CAKE_Z,
      ),
    );
  }
}

/**
 * Which tier a rest position sits ON — the TOPMOST tier whose disc holds it
 * at (or a wedge-slack 0.1 below) its top level. A topping on the tier-2
 * ledge pressed against the tier-3 wall is on tier 2; a topping atop
 * another topping still reads the tier under the stack. null = not on the
 * cake. Scoring truth is REST position; this is its geometry oracle.
 */
export function tierOf(pos: Vec3): number | null {
  for (let i = CAKE_TIERS.length - 1; i >= 0; i--) {
    const t = CAKE_TIERS[i]!;
    if (Math.hypot(pos.x, pos.z - CAKE_Z) <= t.radius && pos.y > t.top - 0.1)
      return i;
  }
  return null;
}

/** Scoring geometry: is a rest position part of the dessert — on a tier
 * top? (The 2026-07-05 skin widening for wall-stuck grain BODIES reverted
 * with the conversion law, plans/10 §8: stuck sprinkles are surface
 * RECORDS now, not bodies, so no body ever legitimately rests off-tier
 * yet on the dessert.) */
export function isOnCake(pos: Vec3): boolean {
  return tierOf(pos) !== null;
}

/** Analytic distance from a point to the TIER STACK (the union of the cake
 * cylinders) — the sprinkle proximity fuse (plans/10). Zero inside a tier.
 * sqrt/mul/add ONLY (no hypot): clients REPLAY bursts from the shot event's
 * seed, so the fuse must agree across engines to the bit (the cross-engine
 * honesty law, core/frosting.ts header). */
export function distanceToCake(pos: Vec3): number {
  const dzc = pos.z - CAKE_Z;
  const radial = Math.sqrt(pos.x * pos.x + dzc * dzc);
  let best = Infinity;
  for (const t of CAKE_TIERS) {
    const dr = radial > t.radius ? radial - t.radius : 0;
    const dy =
      pos.y < t.bottom ? t.bottom - pos.y : pos.y > t.top ? pos.y - t.top : 0;
    const d = Math.sqrt(dr * dr + dy * dy);
    if (d < best) best = d;
  }
  return best;
}

/** Nearest point ON the tier stack's skin, with its outward normal — the
 * conversion law's placement oracle (plans/10 §8): a gripped grain's
 * record is its skin point (scoring truth: tierOf works on it) and the
 * client perches the sprinkle visual along the normal, atop the frosting
 * blob. sqrt/mul/div only — exactly rounded, cross-engine identical, like
 * distanceToCake above. For a point INSIDE a tier (contact penetration,
 * rare) the shallower of wall/top wins — never a downward normal. */
export function cakeSurface(pos: Vec3): { point: Vec3; normal: Vec3 } {
  const dzc = pos.z - CAKE_Z;
  const radial = Math.sqrt(pos.x * pos.x + dzc * dzc);
  // Radial direction; dead-center tie-break is +x (deterministic, and a
  // grain exactly on the axis cannot grip a wall anyway).
  const dirx = radial > 0 ? pos.x / radial : 1;
  const dirz = radial > 0 ? dzc / radial : 0;
  let best: { d: number; point: Vec3; normal: Vec3 } | null = null;
  for (const t of CAKE_TIERS) {
    let cand: { d: number; point: Vec3; normal: Vec3 };
    const inR = radial <= t.radius;
    const inY = pos.y >= t.bottom && pos.y <= t.top;
    if (inR && inY) {
      // Inside the cylinder: project to the shallower face (wall or top).
      const wallPen = t.radius - radial;
      const topPen = t.top - pos.y;
      cand =
        topPen <= wallPen
          ? {
              d: 0,
              point: { x: pos.x, y: t.top, z: pos.z },
              normal: { x: 0, y: 1, z: 0 },
            }
          : {
              d: 0,
              point: {
                x: t.radius * dirx,
                y: pos.y,
                z: CAKE_Z + t.radius * dirz,
              },
              normal: { x: dirx, y: 0, z: dirz },
            };
    } else {
      // Outside: clamp to the solid cylinder — the nearest skin point —
      // and the normal is the offset direction (top, wall, or rim blend).
      const cr = inR ? radial : t.radius;
      const cy = pos.y < t.bottom ? t.bottom : pos.y > t.top ? t.top : pos.y;
      const point: Vec3 = { x: cr * dirx, y: cy, z: CAKE_Z + cr * dirz };
      const dx = pos.x - point.x;
      const dy = pos.y - point.y;
      const dz = pos.z - point.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      cand = {
        d,
        point,
        normal:
          d > 0
            ? { x: dx / d, y: dy / d, z: dz / d }
            : { x: dirx, y: 0, z: dirz },
      };
    }
    if (best === null || cand.d < best.d) best = cand;
  }
  return { point: best!.point, normal: best!.normal };
}

/** Named scoring zones orders can demand. "peak" retired with the box cake
 * (plans/05) — the crown requirement took its job, and the tiers themselves
 * are the zones now: order vocabulary like "2 × cherry on the MIDDLE TIER". */
export type ZoneId = "cake" | "tier1" | "tier2" | "tier3";

const ZONE_TIER: Record<Exclude<ZoneId, "cake">, number> = {
  tier1: 0,
  tier2: 1,
  tier3: 2,
};

export function isInZone(zone: ZoneId, pos: Vec3): boolean {
  const tier = tierOf(pos);
  if (tier === null) return false;
  return zone === "cake" || tier === ZONE_TIER[zone];
}
