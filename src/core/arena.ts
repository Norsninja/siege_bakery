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

/** The TEST CAKE (slice 3, plans/05): three concentric square tiers at the
 * old cake spot — plinth to center still 18 m. Dimensions are the winner of
 * the headless ballistics study (research/03-tier-ladder-study.mts): every
 * tier reachable, notch 0 reads one-click-per-tier (6 → tier 2, 7 → tier 3),
 * and notch 1 + full crank is the tier-clearing crown shot that cannot
 * overshoot (the winch clamps at 8). Top tier half = the retired peak
 * zone's 2.25, honored verbatim — "on top" now has honest geometry. */
export const CAKE_Z = -CROSS_HALF - 18; // -30

export interface CakeTier {
  /** x/z half-extent (tiers are square and concentric on CAKE_Z). */
  half: number;
  bottom: number;
  top: number;
}

export const CAKE_TIERS: readonly CakeTier[] = [
  { half: 4, bottom: 0, top: 2 },
  { half: 3, bottom: 2, top: 3.5 },
  { half: 2.25, bottom: 3.5, top: 5 },
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
      RAPIER.ColliderDesc.cuboid(t.half, hy, t.half).setTranslation(
        0,
        t.bottom + hy,
        CAKE_Z,
      ),
    );
  }
}

/**
 * Which tier a rest position sits ON — the TOPMOST tier whose footprint
 * holds it at (or a wedge-slack 0.1 below) its top level. A topping on the
 * tier-2 ledge pressed against the tier-3 wall is on tier 2; a topping atop
 * another topping still reads the tier under the stack. null = not on the
 * cake. Scoring truth is REST position; this is its geometry oracle.
 */
export function tierOf(pos: Vec3): number | null {
  for (let i = CAKE_TIERS.length - 1; i >= 0; i--) {
    const t = CAKE_TIERS[i]!;
    if (
      Math.abs(pos.x) <= t.half &&
      Math.abs(pos.z - CAKE_Z) <= t.half &&
      pos.y > t.top - 0.1
    )
      return i;
  }
  return null;
}

/** Scoring geometry: is a rest position ON the cake (any tier's top)? */
export function isOnCake(pos: Vec3): boolean {
  return tierOf(pos) !== null;
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
