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
  CAKE_SAMPLES,
  FrostingField,
  splatRadius,
  splatSamples,
  STICKY_NEAR_M,
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

export class FrostingView {
  private readonly field = new FrostingField();
  private readonly blobs: THREE.InstancedMesh;
  private readonly groundSplats: THREE.Mesh[] = [];
  /** Monotonic — the stagger must keep cycling once the FIFO is full
   * (audit 2026-07-03: array length pins at the cap, so length%7 froze
   * and every post-cap disc z-fought at the same height). */
  private splatCount = 0;

  constructor(private readonly scene: THREE.Scene) {
    this.blobs = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.35, 10, 8),
      // White base + per-instance color (fudge paints dark, plans/10).
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
      CAKE_SAMPLES.length,
    );
    this.blobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const base = new THREE.Color(FROSTING_COLOR);
    for (let i = 0; i < CAKE_SAMPLES.length; i++) this.blobs.setColorAt(i, base);
    scene.add(this.blobs);
    this.refresh();
  }

  /** A paint topping landed in the local sim — same paint law as the Room
   * (the topping's own splat spec: fudge runs down walls, plans/10). */
  paintImpact(topping: string, pos: Vec3, speed: number): void {
    const spec = TOPPINGS[topping]?.splat;
    this.field.paint(pos, speed, spec);
    const color = new THREE.Color(PAINT_COLORS[topping] ?? FROSTING_COLOR);
    for (const i of splatSamples(pos, speed, spec)) this.blobs.setColorAt(i, color);
    if (this.blobs.instanceColor) this.blobs.instanceColor.needsUpdate = true;
    if (pos.y < GROUND_SPLAT_BELOW_Y) this.addGroundSplat(pos, speed, topping);
    this.refresh();
  }

  /** The welcome snapshot: the painted cake as it lies (late join/refresh). */
  restore(coats: number[]): void {
    if (!this.field.restore(coats))
      // Version skew: the server's census disagrees with this build's.
      // Starting clean is correct; starting SILENTLY clean was the trap.
      console.warn(
        `frosting snapshot refused: ${coats.length} coats vs ${CAKE_SAMPLES.length} samples — client/server build mismatch?`,
      );
    this.refresh();
  }

  /** A fresh deal: the fresh cake wheels out naked. */
  reset(): void {
    this.field.reset();
    this.refresh();
  }

  /** Sticky-frosting oracle for the local sim (plans/10 addendum): is
   * there wet paint here to grip a grain? Same field the blobs render. */
  stickyNear(pos: Vec3): boolean {
    return this.field.frostedNear(pos, STICKY_NEAR_M);
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
    for (let i = 0; i < CAKE_SAMPLES.length; i++) {
      const s = CAKE_SAMPLES[i]!;
      const coats = this.field.coatAt(i);
      const k = coats > 0 ? 0.8 + 0.25 * Math.min(coats, 3) : 0;
      // Flatten along the surface normal: lying on tops, clinging to walls.
      nrm.set(s.normal.x, s.normal.y, s.normal.z);
      q.setFromUnitVectors(up, nrm);
      p.set(
        s.pos.x + s.normal.x * 0.02,
        s.pos.y + s.normal.y * 0.02,
        s.pos.z + s.normal.z * 0.02,
      );
      sc.set(k, k * 0.4, k);
      m.compose(p, q, sc);
      this.blobs.setMatrixAt(i, m);
    }
    this.blobs.instanceMatrix.needsUpdate = true;
  }
}
