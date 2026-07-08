/**
 * The frosting on screen (plans/07 + wall amendment). One instanced blob per
 * census sample point, scale 0 while unpainted, swelling slightly with
 * coats, flattened AGAINST its surface normal — dollops lie on tier tops
 * and cling to the walls, and the player sees EXACTLY what the census sees,
 * the greybox virtue. Low impacts also leave a flattened GROUND SPLAT
 * (visionary playtest note, 2026-07-03) — pure décor: floor frosting is
 * mess in the ledger and never coverage, but a shot the game eats without
 * a mark reads as a bug, not a miss.
 *
 * Owns the client's LOCAL FrostingField: painted from the local sim's
 * impact events (the deterministic twin of the Room's field — sync-shots-
 * not-surfaces), restored whole from the welcome snapshot, cleared when
 * the fresh cake wheels out. Ground splats persist across deals like the
 * floor litter does (the crew's mess, not the dessert's — fresh-cake law)
 * and are FIFO-capped; they are not on the wire, so a late joiner starts
 * with a clean floor — accepted, they are décor. Scoring truth stays with
 * the room's messages.
 */
import * as THREE from "three";
import {
  FrostingField,
  splatRadius,
  splatSamples,
  STICKY_NEAR_M,
  type FrostSample,
} from "../core/frosting";
import { TOPPINGS } from "../game/toppings";
import type { Vec3 } from "../core/ballistics";
import { removeAndDispose } from "./scene";

const FROSTING_COLOR = 0xfff0f5;
/** Paint colors by topping (fudge renders dark — plans/10 §4). The census
 * field itself is color-blind; this is per-instance dressing. The welcome
 * snapshot carries no color, so restored paint renders classic — accepted
 * décor gap, same class as the floor splats not crossing the wire. */
const PAINT_COLORS: Record<string, number> = {
  frosting: FROSTING_COLOR,
  fudge: 0x4a2c17,
};
const GROUND_SPLAT_MAX = 40;
/** Impacts below this height splat the floor (the arena ground is y 0). */
const GROUND_SPLAT_BELOW_Y = 0.6;

/** The blob's render geometry, named ONCE so the crest math and the mesh
 * cannot drift (audit 2026-07-06: these were bare literals in three places —
 * blobCrest, the SphereGeometry, and refresh's lift+squash — "single source"
 * by convention only). Change one here and both the picture and the perch
 * follow. */
export const BLOB_LIFT = 0.02; // clearance off the skin along the normal
export const BLOB_GEO_RADIUS = 0.35; // the InstancedMesh sphere radius
export const BLOB_SQUASH = 0.4; // flatten factor along the normal

/** Blob swell factor at a coat level — THE one source of the blob's size
 * (refresh() below scales instances by it; sprinkles-view perches stuck
 * sprinkles on the crest it implies, plans/10 §8). */
export function blobScale(coats: number): number {
  return coats > 0 ? 0.8 + 0.25 * Math.min(coats, 3) : 0;
}

/** How far the blob VISUAL protrudes along its surface normal at a coat
 * level: the lift plus the flattened sphere's half-extent (radius × squash).
 * The render contract of the conversion law hangs on this matching refresh()
 * — a stuck sprinkle placed here sits ON the picture of the frosting,
 * half-nestled, never swallowed (the cogency review's measured failure:
 * grain centers at 0.045 vs blob crests at 0.147–0.217). Both sites now
 * derive from the constants above, so the match is structural. */
export function blobCrest(coats: number): number {
  return BLOB_LIFT + BLOB_GEO_RADIUS * blobScale(coats) * BLOB_SQUASH;
}

export class FrostingView {
  private field: FrostingField;
  private samples: readonly FrostSample[];
  private blobs: THREE.InstancedMesh;
  private readonly groundSplats: THREE.Mesh[] = [];
  /** Monotonic — the stagger must keep cycling once the FIFO is full
   * (audit 2026-07-03: array length pins at the cap, so length%7 froze
   * and every post-cap disc z-fought at the same height). */
  private splatCount = 0;

  constructor(
    private readonly scene: THREE.Scene,
    samples: readonly FrostSample[],
  ) {
    this.samples = samples;
    this.field = new FrostingField(samples);
    this.blobs = this.buildBlobs();
    this.refresh();
  }

  /** One InstancedMesh per census — sized to the DEAL's samples (spec
   * refactor, plans/13 §3). */
  private buildBlobs(): THREE.InstancedMesh {
    const blobs = new THREE.InstancedMesh(
      new THREE.SphereGeometry(BLOB_GEO_RADIUS, 10, 8),
      // White base + per-instance color (fudge paints dark, plans/10).
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
      this.samples.length,
    );
    blobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const base = new THREE.Color(FROSTING_COLOR);
    for (let i = 0; i < this.samples.length; i++) blobs.setColorAt(i, base);
    this.scene.add(blobs);
    return blobs;
  }

  /** THE DESSERT REBIND (plans/13 §3): the fresh deal's census replaces
   * this one — new field (naked cake), new instancing. Ground splats
   * persist across deals like the floor litter does (the crew's mess,
   * not the dessert's — fresh-cake law). Replaces the old reset(). */
  bindDessert(samples: readonly FrostSample[]): void {
    removeAndDispose(this.blobs);
    this.samples = samples;
    this.field = new FrostingField(samples);
    this.blobs = this.buildBlobs();
    this.refresh();
  }

  /** A paint topping landed in the local sim — same paint law as the Room
   * (the topping's own splat spec: fudge runs down walls, plans/10). */
  paintImpact(topping: string, pos: Vec3, speed: number): void {
    const spec = TOPPINGS[topping]?.splat;
    this.field.paint(pos, speed, spec);
    const color = new THREE.Color(PAINT_COLORS[topping] ?? FROSTING_COLOR);
    for (const i of splatSamples(this.samples, pos, speed, spec))
      this.blobs.setColorAt(i, color);
    if (this.blobs.instanceColor) this.blobs.instanceColor.needsUpdate = true;
    if (pos.y < GROUND_SPLAT_BELOW_Y) this.addGroundSplat(pos, speed, topping);
    this.refresh();
  }

  /** The welcome snapshot: the painted cake as it lies (late join/refresh). */
  restore(coats: number[]): void {
    if (!this.field.restore(coats))
      // Version/spec skew: the server's census disagrees with this one —
      // a build mismatch, or the dessert rebind didn't happen before the
      // snapshot (the boot-order law's tripwire, plans/13 §3). Starting
      // clean is correct; starting SILENTLY clean was the trap.
      console.warn(
        `frosting snapshot refused: ${coats.length} coats vs ${this.samples.length} samples — client/server build or spec mismatch?`,
      );
    this.refresh();
  }

  /** The conversion law's paint oracle for the local sim (plans/10 §8):
   * is there wet paint here to grip a grain? Same field the blobs render. */
  stickyNear(pos: Vec3): boolean {
    return this.field.frostedNear(pos, STICKY_NEAR_M);
  }

  /** Coat level near a grip point — the sprinkle perch reads the blob it
   * lands on (plans/10 §8). */
  coatsNear(pos: Vec3): number {
    return this.field.coatsNear(pos);
  }

  private addGroundSplat(pos: Vec3, speed: number, topping = "frosting"): void {
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(
        splatRadius(speed, TOPPINGS[topping]?.splat) * 0.8,
        20,
      ),
      new THREE.MeshStandardMaterial({
        color: PAINT_COLORS[topping] ?? FROSTING_COLOR,
      }),
    );
    disc.rotation.x = -Math.PI / 2;
    // Stagger heights a hair so overlapping splats don't z-fight.
    disc.position.set(pos.x, 0.02 + (this.splatCount++ % 7) * 0.004, pos.z);
    this.scene.add(disc);
    this.groundSplats.push(disc);
    if (this.groundSplats.length > GROUND_SPLAT_MAX)
      removeAndDispose(this.groundSplats.shift()!);
  }

  private refresh(): void {
    const m = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);
    const nrm = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    for (let i = 0; i < this.samples.length; i++) {
      const s = this.samples[i]!;
      const coats = this.field.coatAt(i);
      const k = blobScale(coats);
      // Flatten along the surface normal: lying on tops, clinging to walls.
      nrm.set(s.normal.x, s.normal.y, s.normal.z);
      q.setFromUnitVectors(up, nrm);
      p.set(
        s.pos.x + s.normal.x * BLOB_LIFT,
        s.pos.y + s.normal.y * BLOB_LIFT,
        s.pos.z + s.normal.z * BLOB_LIFT,
      );
      sc.set(k, k * BLOB_SQUASH, k);
      m.compose(p, q, sc);
      this.blobs.setMatrixAt(i, m);
    }
    this.blobs.instanceMatrix.needsUpdate = true;
  }
}
