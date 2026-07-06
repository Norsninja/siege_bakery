/**
 * Stuck sprinkles on screen — THE CONVERSION LAW's render half (plans/10
 * §8). A gripped grain stops being a physics body and becomes a surface
 * record: this view instances a capsule per record, PERCHED on the crest
 * of the frosting blob at its grip point (blobCrest — the same math the
 * blobs render with, so the sprinkle sits ON the picture of the frosting,
 * half-nestled, never swallowed). Capsules lie tangent to the surface,
 * fanned by a golden-angle twist per index — confetti, not a picket line.
 *
 * Records leave two ways, both mirrored from the Room's ledger law:
 * BURIAL (a later tag-matched splat whose footprint covers the grip —
 * "if they are not on top, they are IN the cake") and the FRESH CAKE
 * (clear()). They never move otherwise — knockability was retired with
 * the freeze-in-place mechanism.
 *
 * Scoring truth stays with the room's messages; these instances are what
 * the player SEES, fed by the local deterministic sim (and the welcome's
 * stuck list on late join).
 */
import * as THREE from "three";
import { splatCovers, type SplatSpec } from "../core/frosting";
import { TOPPINGS } from "../game/toppings";
import type { Vec3 } from "../core/ballistics";
import { blobCrest } from "./frosting-view";
import { GRAIN_PALETTE } from "./shots-view";

/** Plenty for one order (asks are ~60; two players overfiring stay well
 * under). Beyond it new grips go unrendered (counted fine — scoring is
 * the Room's) until the fresh cake clears the board. */
const MAX_STUCK = 1024;

/** Golden angle — successive grips twist apart however many share a blob. */
const TWIST = 2.399963229728653;

interface StuckEntry {
  pos: Vec3; // grip point on the skin
  normal: Vec3;
  coats: number; // coat level AT GRIP — the perch height it was dressed for
}

export class SprinklesView {
  private readonly entries: StuckEntry[] = [];
  private readonly mesh: THREE.InstancedMesh;

  constructor(scene: THREE.Scene) {
    const grain = TOPPINGS["sprinkles"]?.burst?.grain ?? {
      radius: 0.045,
      halfHeight: 0.055,
      restitution: 0.3,
    };
    this.mesh = new THREE.InstancedMesh(
      new THREE.CapsuleGeometry(grain.radius, grain.halfHeight * 2, 2, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
      MAX_STUCK,
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    // The instance set starts empty and grows at the cake, 30m from the
    // origin — the auto bounding sphere (computed while empty) would cull
    // every sprinkle the moment the origin leaves the frustum. One mesh,
    // tiny geometry: skipping the cull outright is cheaper than
    // recomputing bounds per grip. (Found live, 2026-07-06: 40 instances
    // verified by matrix positions, zero visible on screen.)
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  /** A grain gripped in the local sim (or arrived on the welcome list). */
  add(pos: Vec3, normal: Vec3, coats: number): void {
    if (this.entries.length >= MAX_STUCK) return;
    this.entries.push({ pos, normal, coats });
    this.rebuild();
  }

  /** A tag-matched paint impact landed: bury every record its splat
   * footprint covers — the mirror of the Room's ledger filter. */
  buryBy(impact: Vec3, speed: number, spec?: SplatSpec): void {
    const before = this.entries.length;
    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (splatCovers(this.entries[i]!.pos, impact, speed, spec))
        this.entries.splice(i, 1);
    }
    if (this.entries.length !== before) this.rebuild();
  }

  /** The fresh cake wheels out: the sprinkles left with the dessert. */
  clear(): void {
    this.entries.length = 0;
    this.rebuild();
  }

  private rebuild(): void {
    const m = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);
    const nrm = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const helper = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const twist = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const color = new THREE.Color();
    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i]!;
      nrm.set(e.normal.x, e.normal.y, e.normal.z);
      // A tangent frame: capsules LIE on the surface (their long axis is
      // the geometry's Y, so Y maps to a tangent), twisted per index.
      helper.set(Math.abs(nrm.y) < 0.9 ? 0 : 1, Math.abs(nrm.y) < 0.9 ? 1 : 0, 0);
      tangent.crossVectors(nrm, helper).normalize();
      twist.setFromAxisAngle(nrm, i * TWIST);
      tangent.applyQuaternion(twist);
      q.setFromUnitVectors(up, tangent);
      const perch = blobCrest(Math.max(1, e.coats));
      p.set(
        e.pos.x + e.normal.x * perch,
        e.pos.y + e.normal.y * perch,
        e.pos.z + e.normal.z * perch,
      );
      m.compose(p, q, one);
      this.mesh.setMatrixAt(i, m);
      color.setHex(GRAIN_PALETTE[i % GRAIN_PALETTE.length]!);
      this.mesh.setColorAt(i, color);
    }
    this.mesh.count = this.entries.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
