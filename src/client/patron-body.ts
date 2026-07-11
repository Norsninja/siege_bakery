/**
 * THE PATRON'S BODY (plans/16 slice 2) — drives the ogre's bones.
 *
 * The GLB ships with its skin LIVE (ogre-rig.blend exports armature +
 * weights, no baked clips); this module is the one place that touches
 * the skeleton. Today: the breathing idle. The look-lean (patron
 * message beat) and the three verdict poses land here in the
 * choreography act — as bone-rotation targets this class lerps to,
 * driven by the same broadcasts the flash lines already ride.
 *
 * Laws: client-only juice — frame-driven phase, no wall clock; a
 * rig-less root (fallback primitive, missing skin) makes every call a
 * no-op, per the assetless-boot law.
 */
import * as THREE from "three";

/** Breathing: slow chest heave with the head riding a beat behind.
 * Phase advances per render frame (the ghosts' walk-bob precedent). */
const BREATH_PER_FRAME = 0.026; // ~one breath every 4s at 60fps
const CHEST_HEAVE_RAD = 0.015;
const HEAD_NOD_RAD = 0.008;

export class PatronBody {
  private readonly bones = new Map<string, THREE.Object3D>();
  /** glTF bones carry their REST orientation in the node rotation —
   * every drive is an OFFSET from this, never an overwrite (found live:
   * chest rests at x=0.044; clobbering it bent him at the waist). */
  private readonly restX = new Map<string, number>();
  private phase = 0;

  constructor(root: THREE.Object3D) {
    root.traverse((o) => {
      if ((o as THREE.Bone).isBone) {
        this.bones.set(o.name, o);
        this.restX.set(o.name, o.rotation.x);
      }
    });
  }

  /** True when the loaded model actually carries the skeleton. */
  get rigged(): boolean {
    return this.bones.has("chest");
  }

  /** Per render frame: the idle. Nothing else — resist the rabbit hole
   * (plans/16 slice 2: a breathing loop, the brain provides the rest). */
  update(): void {
    if (!this.rigged) return;
    this.phase += BREATH_PER_FRAME;
    const chest = this.bones.get("chest");
    const head = this.bones.get("head");
    if (chest)
      chest.rotation.x =
        (this.restX.get("chest") ?? 0) + CHEST_HEAVE_RAD * Math.sin(this.phase);
    if (head)
      head.rotation.x =
        (this.restX.get("head") ?? 0) +
        HEAD_NOD_RAD * Math.sin(this.phase - 0.9);
  }
}
