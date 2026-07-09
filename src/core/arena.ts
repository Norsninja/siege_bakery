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

/** THE DESSERT SPOT (plans/13 §3 rulings): the arena owns WHERE the
 * dessert sits — the axis both towns rotate about, plinth to center still
 * 18 m. WHAT sits there is a DessertSpec row (core/dessert.ts), bound per
 * deal; this file has no idea how many tiers it has. */
export const CAKE_Z = -CROSS_HALF - 18; // -30

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
  /** THE SHOP STALL (plans/13 §5 as amended 2026-07-09): against the
   * side wall, HALFWAY between pantry and machine — the visionary's
   * placement: running around is part of the fun, so the stall shares
   * the ferry leg. Greybox anchor like pantry/plinth; the feel pass
   * moves it. */
  shop: Vec3;
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
  // Against the −x side wall (inner face −7.75; the gate owns +x), at
  // z=0 — the exact midpoint of the pantry (z=12) ↔ machine (z=−12) leg.
  shop: { x: -(ARENA_HALF_WIDTH - 0.85), y: 0.75, z: 0 },
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
    shop: rotateAboutCake(TOWN0.shop),
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
/** The shop stall's counter (plans/13 §5 amendment): depth off the wall
 * × counter height × width along the wall. A solid like the pantry —
 * bakers lean on it, wild bounces rest on it, both replicas agree. */
export const SHOP_HALF: Vec3 = { x: 0.6, y: 0.75, z: 1.1 };

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

/** Build the ARENA STATICS every simulation agrees on: ground, walls,
 * pantries, plinths — built ONCE per world. The dessert's colliders left
 * this function with the spec refactor (plans/13 §3): they are per-deal
 * state, built and torn down through DessertGeometry.buildColliders by
 * whoever owns the deal. */
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
    // The shop stall's counter (plans/13 §5 amendment). A static like
    // pantry/plinth: it sits against the side wall at z=0, far off every
    // plinth→cake firing line — the measured envelopes never cross it.
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(SHOP_HALF.x, SHOP_HALF.y, SHOP_HALF.z)
        .setTranslation(t.shop.x, t.shop.y, t.shop.z),
    );
  }
}
