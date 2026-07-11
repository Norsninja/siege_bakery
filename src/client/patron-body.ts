/**
 * THE PATRON'S BODY (plans/16 slice 2) — drives the ogre's bones.
 *
 * The GLB ships with its skin LIVE (ogre-rig.blend exports armature +
 * weights, no baked clips); this module is the one place that touches
 * the skeleton. The CHOREOGRAPHY ACT lives here: the breathing idle,
 * the look-lean when a patron line lands, and the three verdict poses
 * when the order ends — all driven by POLLING MatchView each frame
 * (not NetFx events): the ogre loads async and a mid-banner joiner
 * gets the verdict via `welcome`, so state recovery beats events.
 *
 * Laws: client-only juice — frame-driven phase and holds, no wall
 * clock; a rig-less root (fallback primitive, missing skin) makes
 * every call a no-op, per the assetless-boot law. Face never changes:
 * the grin is texture-baked — verdicts are BODY theatre (plans/16).
 */
import * as THREE from "three";
import type { Judgment } from "../game/judgment";

const deg = (d: number): number => (d * Math.PI) / 180;

/** Breathing: slow chest heave with the head riding a beat behind.
 * Phase advances per render frame (the ghosts' walk-bob precedent).
 * Rides ADDITIVELY on top of whatever pose holds — he never goes
 * corpse-still mid-theatre. */
const BREATH_PER_FRAME = 0.026; // ~one breath every 4s at 60fps
const CHEST_HEAVE_RAD = 0.015;
const HEAD_NOD_RAD = 0.008;

/** HEAD-TURN CEILING (Blender audition 2026-07-11, ogre-rig.blend):
 * the ogre has no neck — auto-weight deformation stays clean through
 * 50° of head-Y twist; the real limit is his own raised knife at the
 * chin past ~55°. Keep any turn at or under this. */
export const HEAD_TURN_MAX_RAD = deg(35);
/** The look-lean's turn ingredient (NEW this act — the blessed recipe
 * carried no Y). +Y turned him toward his RIGHT (knife hand) in the
 * audition; sign and size are one-constant tunables for the eye pass. */
const LOOK_TURN_RAD = deg(20);

export type PoseName = "lean" | "delighted" | "refused" | "hungry";
type AxisOffsets = { x?: number; y?: number; z?: number };

/** The pose recipes of record (plans/16 slice 2 status block) —
 * degrees→radians, XYZ euler OFFSETS FROM REST per bone. Auditioned
 * clean in Blender renders; blessed by the visionary. Only bones with
 * rot_mode XYZ in the rig are driven (spine/chest/head/upper arms).
 * BONE NAMES ARE THE RUNTIME'S, not Blender's: GLTFLoader sanitizes
 * node names for PropertyBinding, so the rig's `upper_arm.L` arrives
 * as `upper_armL` (found live 2026-07-11 — the dotted names silently
 * drove nothing). */
export const POSES: Record<PoseName, Record<string, AxisOffsets>> = {
  lean: {
    spine: { x: deg(14) },
    head: { x: deg(8), y: LOOK_TURN_RAD, z: deg(25) },
  },
  delighted: {
    chest: { x: deg(-10) },
    head: { x: deg(-18) },
    upper_armL: { x: deg(-40), z: deg(-15) },
    upper_armR: { x: deg(-40), z: deg(15) },
  },
  refused: {
    spine: { z: deg(28) },
    chest: { x: deg(-6), z: deg(10) },
    head: { x: deg(-14), z: deg(18) },
  },
  hungry: {
    spine: { x: deg(16) },
    chest: { x: deg(10) },
    head: { x: deg(24) },
    upper_armL: { x: deg(18) },
    upper_armR: { x: deg(18) },
  },
};

/** Every bone any pose touches — offsets ease back to zero (= rest)
 * when no pose holds, so idle needs the full list too. */
const DRIVEN_BONES = [
  "spine",
  "chest",
  "head",
  "upper_armL",
  "upper_armR",
] as const;

/** The banner's exact two-gate read (hud.ts precedent): accepted →
 * DELIGHTED; every row met but score refused → REFUSED, the insulting
 * kind; a row unmet → the patron goes HUNGRY. */
export function verdictPose(
  j: Pick<Judgment, "met" | "accepted">,
): Exclude<PoseName, "lean"> {
  if (j.accepted) return "delighted";
  return j.met ? "refused" : "hungry";
}

/** Frame-counted holds (no wall clock). The verdict hold then RELAXES
 * THROUGH THE LINGER — the banner stays, the body eases back to the
 * idle so the next deal finds him breathing at his post. */
const LEAN_HOLD_FRAMES = 150; // ~2.5s at 60fps
const VERDICT_HOLD_FRAMES = 240; // ~4s
/** Snap-and-hold for verdicts: fast enough to read as a snap, no
 * teleport. Leans and every relax ease gently. */
const SNAP_LERP = 0.15;
const EASE_LERP = 0.05;

export class PatronBody {
  private readonly bones = new Map<string, THREE.Object3D>();
  /** glTF bones carry their REST orientation in the node rotation —
   * every drive is an OFFSET from this, never an overwrite (found live:
   * chest rests at x=0.044; clobbering it bent him at the waist). */
  private readonly rest = new Map<string, { x: number; y: number; z: number }>();
  /** Current pose offsets, eased toward the active pose (or zero). */
  private readonly offsets = new Map<string, { x: number; y: number; z: number }>();
  private phase = 0;
  private mode: "idle" | PoseName = "idle";
  private holdFrames = 0;
  /** Patron-line edge detection. The FIRST update adopts the standing
   * seq silently — a stale nag must not replay when the model lands
   * late; a verdict, by contrast, is standing STATE and does play. */
  private lastSeq: number | null = null;
  private seqAdopted = false;
  private lastJudgment: Judgment | null = null;

  constructor(root: THREE.Object3D) {
    root.traverse((o) => {
      if ((o as THREE.Bone).isBone) {
        this.bones.set(o.name, o);
        this.rest.set(o.name, {
          x: o.rotation.x,
          y: o.rotation.y,
          z: o.rotation.z,
        });
        this.offsets.set(o.name, { x: 0, y: 0, z: 0 });
      }
    });
  }

  /** True when the loaded model actually carries the skeleton. */
  get rigged(): boolean {
    return this.bones.has("chest");
  }

  /** The current theatrical beat — for the smoke driver and tests. */
  get act(): "idle" | PoseName {
    return this.mode;
  }

  /**
   * Per render frame. `patronSeq` is view.lastPatron?.seq (a change =
   * a new nag → look-lean); `verdict` is view.verdict (non-null while
   * an ended order lingers → snap the matching pose, hold, relax).
   * A patron line arriving during a verdict NEVER yanks him out of it
   * (visionary ruling 2026-07-11) — the seq is adopted, not acted on.
   */
  update(patronSeq: number | null = null, verdict: Judgment | null = null): void {
    if (!this.rigged) return;

    // Verdict edges — reference identity: net-handlers stores a fresh
    // Judgment per ended order and nulls it on the fresh deal.
    if (verdict !== this.lastJudgment) {
      this.lastJudgment = verdict;
      if (verdict) {
        this.mode = verdictPose(verdict);
        this.holdFrames = VERDICT_HOLD_FRAMES;
      } else if (this.mode !== "idle" && this.mode !== "lean") {
        this.mode = "idle"; // fresh deal mid-hold: straighten up
      }
    }

    // Patron-line edges.
    if (!this.seqAdopted) {
      this.seqAdopted = true;
      this.lastSeq = patronSeq;
    } else if (patronSeq !== this.lastSeq) {
      this.lastSeq = patronSeq;
      if (this.mode === "idle" || this.mode === "lean") {
        this.mode = "lean"; // a fresh nag restarts the lean
        this.holdFrames = LEAN_HOLD_FRAMES;
      }
    }

    // Hold countdown → relax.
    if (this.mode !== "idle" && --this.holdFrames <= 0) this.mode = "idle";

    // Ease offsets toward the active pose (zero = rest) and apply,
    // breathing riding additively on chest/head X.
    const pose = this.mode === "idle" ? null : POSES[this.mode];
    const rate =
      this.mode !== "idle" && this.mode !== "lean" ? SNAP_LERP : EASE_LERP;
    this.phase += BREATH_PER_FRAME;
    const breath = CHEST_HEAVE_RAD * Math.sin(this.phase);
    const nod = HEAD_NOD_RAD * Math.sin(this.phase - 0.9);
    for (const name of DRIVEN_BONES) {
      const bone = this.bones.get(name);
      const rest = this.rest.get(name);
      const cur = this.offsets.get(name);
      if (!bone || !rest || !cur) continue;
      const tgt = pose?.[name];
      cur.x += ((tgt?.x ?? 0) - cur.x) * rate;
      cur.y += ((tgt?.y ?? 0) - cur.y) * rate;
      cur.z += ((tgt?.z ?? 0) - cur.z) * rate;
      const extraX = name === "chest" ? breath : name === "head" ? nod : 0;
      bone.rotation.set(
        rest.x + cur.x + extraX,
        rest.y + cur.y,
        rest.z + cur.z,
      );
    }
  }
}
