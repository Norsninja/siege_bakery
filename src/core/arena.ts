/**
 * The greybox arena — ONE definition of the level, shared by everyone.
 *
 * Client visuals, client movement colliders, the Room's authoritative
 * physics, and the ballistics tests all read these constants; nobody
 * duplicates geometry. When Blender becomes the level editor this file is
 * what its export replaces.
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

/** The machine's floor point: top of the plinth. */
export const MACHINE_BASE: Vec3 = { x: 0, y: 1, z: -CROSS_HALF };
export const PANTRY_POS: Vec3 = { x: 0, y: 0.75, z: CROSS_HALF };
export const PANTRY_HALF: Vec3 = { x: 2, y: 0.75, z: 0.5 };
export const PLINTH_POS: Vec3 = { x: 0, y: 0.5, z: -CROSS_HALF };
export const PLINTH_HALF: Vec3 = { x: 1, y: 0.5, z: 1 };
export const BAKER_SPAWN: Vec3 = { x: 0, y: 1.2, z: CROSS_HALF - 2 };

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
export const WALLS: WallDef[] = [
  { hx: 0.25, hy: WALL_HEIGHT / 2, hz: ARENA_HALF_LENGTH, x: -ARENA_HALF_WIDTH, z: 0 },
  { hx: 0.25, hy: WALL_HEIGHT / 2, hz: ARENA_HALF_LENGTH, x: ARENA_HALF_WIDTH, z: 0 },
  { hx: ARENA_HALF_WIDTH, hy: WALL_HEIGHT / 2, hz: 0.25, x: 0, z: -ARENA_HALF_LENGTH },
  { hx: ARENA_HALF_WIDTH, hy: WALL_HEIGHT / 2, hz: 0.25, x: 0, z: ARENA_HALF_LENGTH },
];

/** Build the static world every simulation agrees on. */
export function buildArenaColliders(world: RAPIER.World): void {
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(40, 0.1, 40).setTranslation(0, -0.1, 0),
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
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(PANTRY_HALF.x, PANTRY_HALF.y, PANTRY_HALF.z)
      .setTranslation(PANTRY_POS.x, PANTRY_POS.y, PANTRY_POS.z),
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(PLINTH_HALF.x, PLINTH_HALF.y, PLINTH_HALF.z)
      .setTranslation(PLINTH_POS.x, PLINTH_POS.y, PLINTH_POS.z),
  );
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

/** Scoring geometry: is a rest position ON the cake (any tier's top)? */
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
