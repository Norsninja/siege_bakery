/**
 * The frosting on screen (plans/07). One instanced blob per census sample
 * point, scale 0 while unpainted, swelling slightly with coats — the player
 * sees EXACTLY what the census sees, the greybox virtue.
 *
 * Owns the client's LOCAL FrostingField: painted from the local sim's
 * impact events (the deterministic twin of the Room's field — sync-shots-
 * not-surfaces), restored whole from the welcome snapshot, licked clean on
 * a fresh deal. Scoring truth stays with the room's messages; this is what
 * the player SEES.
 */
import * as THREE from "three";
import { CAKE_SAMPLES, FrostingField } from "../core/frosting";
import type { Vec3 } from "../core/ballistics";

const FROSTING_COLOR = 0xfff0f5;

export class FrostingView {
  private readonly field = new FrostingField();
  private readonly blobs: THREE.InstancedMesh;

  constructor(scene: THREE.Scene) {
    this.blobs = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.35, 10, 8),
      new THREE.MeshStandardMaterial({ color: FROSTING_COLOR }),
      CAKE_SAMPLES.length,
    );
    this.blobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.blobs);
    this.refresh();
  }

  /** A frosting glob landed in the local sim — same paint law as the Room. */
  paintImpact(pos: Vec3, speed: number): void {
    this.field.paint(pos, speed);
    this.refresh();
  }

  /** The welcome snapshot: the painted cake as it lies (late join/refresh). */
  restore(coats: number[]): void {
    this.field.restore(coats);
    this.refresh();
  }

  /** A fresh deal: the Giant licked the cake clean. */
  reset(): void {
    this.field.reset();
    this.refresh();
  }

  private refresh(): void {
    const m = new THREE.Matrix4();
    for (let i = 0; i < CAKE_SAMPLES.length; i++) {
      const s = CAKE_SAMPLES[i]!;
      const coats = this.field.coatAt(i);
      const scale = coats > 0 ? 0.8 + 0.25 * Math.min(coats, 3) : 0;
      m.makeScale(scale, scale * 0.4, scale); // a flattened blob, not a ball
      m.setPosition(s.x, s.y + 0.02, s.z);
      this.blobs.setMatrixAt(i, m);
    }
    this.blobs.instanceMatrix.needsUpdate = true;
  }
}
