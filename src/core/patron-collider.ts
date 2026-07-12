/**
 * THE PATRON COLLIDER (plans/15 item 16; plans/21 §0's FIRST NAMED
 * core/ exception) — the giant at the table, as physics.
 *
 * Wild shots (and frosting) can hit HIM: per-species coarse capsule
 * sets, authored as named markers in each rig .blend and exported by
 * script (project/blender/collider-scripts/) into the CHECKED-IN
 * table below. core/ runs headless and cannot read GLBs through
 * three.js — the collider is DATA in code, never mesh. Coarse is
 * correct (ruled): comedy physics needs "the bounce lands on the
 * body," not mesh accuracy; the generic one-capsule proposal is DEAD
 * (a bounce off a shape that doesn't match the body reads as a
 * FORCEFIELD).
 *
 * BOTH WORLDS BUILD THIS (sync-shots-not-surfaces): the Room's world
 * is scoring truth, but every client simulates every broadcast shot
 * locally — a capsule existing on one side only would fork the
 * trajectory itself, not just the paint. Each world owns a
 * PatronColliderRig and reconciles it every tick against
 * game/cast.ts's patronAtMark — the same pure answer everywhere, so
 * the two worlds can never disagree about the shape at the mark.
 * Known ~one-round-trip residue at the flip edges (a shot in flight
 * AT the giant on the verdict tick bounces on one side, passes on the
 * other): the dessert's own per-deal collider swap ships the same
 * race; order's over, nothing scores, accepted.
 *
 * AUTHORED AT RULED HEIGHT, ALWAYS: the ogre GLB ships 21 m and the
 * client scales it 36/21 at load — the export script bakes the ruled
 * scale in, or the table lies 40% short. Capsules are Y-aligned in
 * PATRON SPACE (+y up, +z the way he faces); the builder rotates by
 * the mark's yaw and translates to the mark. A species absent from
 * the table builds NOTHING (assetless-boot culture: shots pass
 * through, exactly yesterday's behavior, until the fleet authors it).
 */
import RAPIER from "@dimforge/rapier3d-compat";
import { PATRON_COLLISION_GROUPS } from "./constants";

/** THE MARK — where the table patron stands (the ogre's ruled post,
 * game coords; every species faces the cake from the same mark).
 * Moved here from client/cast.ts with item 16: the capsules and the
 * renderer must place the giant from ONE number. */
export const TABLE_POS = { x: 21, z: -30 } as const;
export const TABLE_YAW = -Math.PI / 2;

/** One coarse capsule in patron space: offset from the mark's ground
 * point (meters, RULED height), Y-aligned, +z the facing. */
export interface PatronCapsule {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly halfHeight: number;
  readonly radius: number;
}

/** Species → capsule set (3–6 shapes, ruled). Rows are exported by
 * project/blender/collider-scripts/export-patron-colliders.py from
 * col_* markers in each rig .blend — regenerate, never hand-tune
 * numbers without moving the markers (the script is the recipe,
 * make-sfx culture). Absent species = no collider yet (fleet lane). */
export const PATRON_COLLIDERS: Record<string, readonly PatronCapsule[]> = {
  // ogre: exported by collider-scripts/export-patron-colliders.py
  // (markers in ogre-rig.blend, --scale 1.71429 baked in). Torso radii
  // deliberately EXCLUDE the spread arms — a capsule fat enough to eat
  // the knife arm would eat honest misses; arm capsules are an
  // eye-pass door (rows hold 3–6).
  ogre: [
    { x: 0.0, y: 9.0, z: 0.0, halfHeight: 0.5, radius: 8.5 }, // haunches
    { x: 0.0, y: 16.0, z: 1.4, halfHeight: 1.5, radius: 9.5 }, // belly
    { x: 0.0, y: 24.5, z: 0.0, halfHeight: 0.8, radius: 9.5 }, // chest
    { x: 0.0, y: 31.0, z: 2.0, halfHeight: 0.8, radius: 4.5 }, // head
  ],
};

/** Place one authored capsule at the mark: rotate patron space by the
 * mark's yaw (Y-rotation, three.js convention: local +z maps to
 * (sin θ, 0, cos θ)), then translate. Pure — pinned in tests. */
export function capsuleWorldCenter(
  c: PatronCapsule,
  yaw: number = TABLE_YAW,
  mark: { x: number; z: number } = TABLE_POS,
): { x: number; y: number; z: number } {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return {
    x: mark.x + c.x * cos + c.z * sin,
    y: c.y,
    z: mark.z - c.x * sin + c.z * cos,
  };
}

/**
 * One world's patron colliders, reconciled — never edge-wired. Call
 * reconcile() every tick with patronAtMark's answer; the rig tears
 * down and rebuilds only when the answer CHANGES (a string compare
 * per tick otherwise). Late joiners, seam jumps, and every lifecycle
 * edge fall out of the poll for free (the polling-seam culture).
 */
export class PatronColliderRig {
  private colliders: RAPIER.Collider[] = [];
  private handles = new Set<number>();
  /** The species last ASKED for (not built — an absent table row must
   * not re-attempt the build every tick). */
  private asked: string | null = null;

  /** Which species' capsules stand in the world right now (smoke +
   * test seam); null when the mark is empty or the row is unauthored. */
  get species(): string | null {
    return this.colliders.length > 0 ? this.asked : null;
  }

  /** Is this collider handle one of the patron's capsules? The
   * interpreter for Impact.otherHandle — "the shot hit the GIANT". */
  has(handle: number): boolean {
    return this.handles.has(handle);
  }

  reconcile(world: RAPIER.World, species: string | null): void {
    if (species === this.asked) return;
    this.asked = species;
    for (const c of this.colliders) world.removeCollider(c, false);
    this.colliders = [];
    this.handles.clear();
    if (species === null) return;
    const capsules = PATRON_COLLIDERS[species];
    if (!capsules) return; // unauthored species: shots pass, honestly
    for (const cap of capsules) {
      const p = capsuleWorldCenter(cap);
      const collider = world.createCollider(
        RAPIER.ColliderDesc.capsule(cap.halfHeight, cap.radius)
          .setTranslation(p.x, p.y, p.z)
          // Giants are firm but fleshy: a topping bonks and drops, it
          // doesn't ricochet into the next town.
          .setRestitution(0.2)
          .setFriction(0.9)
          .setCollisionGroups(PATRON_COLLISION_GROUPS),
      );
      this.colliders.push(collider);
      this.handles.add(collider.handle);
    }
  }
}
