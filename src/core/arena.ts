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
export const CAKE_POS: Vec3 = { x: 0, y: 1.5, z: -CROSS_HALF - 18 };
export const CAKE_HALF: Vec3 = { x: 4, y: 1.5, z: 4 };
export const PANTRY_POS: Vec3 = { x: 0, y: 0.75, z: CROSS_HALF };
export const PANTRY_HALF: Vec3 = { x: 2, y: 0.75, z: 0.5 };
export const PLINTH_POS: Vec3 = { x: 0, y: 0.5, z: -CROSS_HALF };
export const PLINTH_HALF: Vec3 = { x: 1, y: 0.5, z: 1 };
export const BAKER_SPAWN: Vec3 = { x: 0, y: 1.2, z: CROSS_HALF - 2 };

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
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(CAKE_HALF.x, CAKE_HALF.y, CAKE_HALF.z)
      .setTranslation(CAKE_POS.x, CAKE_POS.y, CAKE_POS.z),
  );
}

/** Scoring geometry: is a rest position ON the cake? (top surface, with a
 * little slack below it so wedged-against-the-lip cases don't count). */
export function isOnCake(pos: Vec3): boolean {
  return (
    Math.abs(pos.x - CAKE_POS.x) <= CAKE_HALF.x &&
    Math.abs(pos.z - CAKE_POS.z) <= CAKE_HALF.z &&
    pos.y > CAKE_POS.y + CAKE_HALF.y - 0.1
  );
}

/** Named scoring zones orders can demand (slice 2). "cake" = anywhere on
 * the top; "peak" = the top-center square — the FUTURE TOP TIER's
 * footprint (visionary, 2026-07-03: the real rule is the CROWN — cherry
 * as uppermost topping; peak is its stand-in until the cake goes three
 * tiers and "on top" gets honest geometry). */
export type ZoneId = "cake" | "peak";
export const PEAK_HALF = 2.25;

export function isInZone(zone: ZoneId, pos: Vec3): boolean {
  if (zone === "cake") return isOnCake(pos);
  return (
    isOnCake(pos) &&
    Math.abs(pos.x - CAKE_POS.x) <= PEAK_HALF &&
    Math.abs(pos.z - CAKE_POS.z) <= PEAK_HALF
  );
}
