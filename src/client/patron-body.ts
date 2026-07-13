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
import { mulberry32 } from "../core/rng";

const deg = (d: number): number => (d * Math.PI) / 180;

/** Breathing: slow chest heave with the head riding a beat behind.
 * Phase advances per render frame (the ghosts' walk-bob precedent).
 * Rides ADDITIVELY on top of whatever pose holds — he never goes
 * corpse-still mid-theatre. */
const BREATH_PER_FRAME = 0.026; // ~one breath every 4s at 60fps
const CHEST_HEAVE_RAD = 0.015;
const HEAD_NOD_RAD = 0.008;
/** THE WING SETTLE (plans/19 rider): species with wing bones breathe
 * them too — a slow fold-and-settle riding the same phase, trailing
 * the chest like the head nod does. Wingless rigs (the ogre) skip it
 * by absence; the settle is Z so the folded wings splay, not pitch. */
const WING_SETTLE_RAD = 0.02;

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
export type PoseTable = Record<PoseName, Record<string, AxisOffsets>>;

/** The pose recipes of record (plans/16 slice 2 status block) —
 * degrees→radians, XYZ euler OFFSETS FROM REST per bone. Auditioned
 * clean in Blender renders; blessed by the visionary. Only bones with
 * rot_mode XYZ in the rig are driven (spine/chest/head/upper arms).
 * BONE NAMES ARE THE RUNTIME'S, not Blender's: GLTFLoader sanitizes
 * node names for PropertyBinding, so the rig's `upper_arm.L` arrives
 * as `upper_armL` (found live 2026-07-11 — the dotted names silently
 * drove nothing). */
export const POSES: PoseTable = {
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

/** PER-SPECIES POSE TABLES (plans/19): the ogre's POSES are the
 * default; species whose bodies act differently override here — data,
 * not code. THE DRAGON (auditioned in Blender 2026-07-12): her
 * theatrical instruments are the neck arc and the wings — wing-flare
 * is delight, neck-droop is hunger, a turned-away head with tightened
 * wings is refusal. Bones a rig lacks are skipped by the driver, so
 * tables degrade safely across bodies. Angles are readable v1; the
 * eye pass tunes. */
export const SPECIES_POSES: Record<string, PoseTable> = {
  dragon: {
    lean: {
      neck1: { x: deg(12), z: deg(10) },
      neck2: { x: deg(10), z: deg(8) },
      head: { x: deg(6), y: deg(15) },
    },
    delighted: {
      chest: { x: deg(-4) },
      head: { x: deg(-10) },
      wingL: { z: deg(-25) },
      wingR: { z: deg(25) },
    },
    refused: {
      neck1: { z: deg(-12) },
      head: { x: deg(-6), y: deg(-25) },
      wingL: { z: deg(6) },
      wingR: { z: deg(-6) },
    },
    hungry: {
      neck1: { x: deg(18) },
      neck2: { x: deg(14) },
      head: { x: deg(12) },
    },
  },
};

/** Every bone any pose (any species) touches — offsets ease back to
 * zero (= rest) when no pose holds, so idle needs the full list too.
 * Bones absent on a given rig are skipped per-frame (the fallback
 * grain the species tables lean on). */
const DRIVEN_BONES = [
  "spine",
  "chest",
  "head",
  "upper_armL",
  "upper_armR",
  "neck1",
  "neck2",
  "wingL",
  "wingR",
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

/** THE SHAKE-OFF (plans/15 item 16): a wild shot bonked off the body —
 * he shudders it off, annoyed, never hurt (the tone guard). Rides
 * ADDITIVELY like the breath, so it never interrupts a verdict pose or
 * a lean: head shakes "no no no" (Y), the trunk shudders (Z), both
 * decaying over the window. Dials for the eye pass: */
const FLINCH_FRAMES = 55; // ~0.9s of shudder
const FLINCH_HEAD_RAD = deg(10);
const FLINCH_BODY_RAD = deg(2.5);
const FLINCH_HZ_PER_FRAME = 0.55; // shake speed (rad of phase per frame)

/** Frame-counted holds (no wall clock). The verdict hold then RELAXES
 * THROUGH THE LINGER — the banner stays, the body eases back to the
 * idle so the next deal finds him breathing at his post. */
const LEAN_HOLD_FRAMES = 150; // ~2.5s at 60fps
/** EXPORTED for the eat beat (eat-beat.ts): the eat starts AFTER this
 * hold — photo-then-eat by construction, not by lucky numbers. */
export const VERDICT_HOLD_FRAMES = 240; // ~4s
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
  private phase: number;
  /** Personal breath rate multiplier (~±15% about 1) — see the
   * individuality seed on the constructor. */
  private readonly breathRate: number;
  private mode: "idle" | PoseName = "idle";
  private holdFrames = 0;
  /** Shake-off frames left (item 16) — additive, so it coexists with
   * any pose; restarting mid-shudder just extends the annoyance. */
  private flinchLeft = 0;
  /** Patron-line edge detection. The FIRST update adopts the standing
   * seq silently — a stale nag must not replay when the model lands
   * late; a verdict, by contrast, is standing STATE and does play. */
  private lastSeq: number | null = null;
  private seqAdopted = false;
  private lastJudgment: Judgment | null = null;

  /** `poses` selects the species' pose table (default: the ogre's).
   * Pass SPECIES_POSES[species] ?? POSES — an unknown species acts in
   * the ogre's grammar on whatever shared bones it carries.
   * `individuality` seeds a personal breath — phase offset + ~±15%
   * rate — so a crowd never heaves as one metronome (eye note
   * 2026-07-12). Callers pass the QUEUE INDEX: THE ADVANCE IDENTITY
   * then keeps a giant's own breath as he walks up the line and takes
   * the table. Deterministic — every client breathes him alike. */
  constructor(
    root: THREE.Object3D,
    private readonly poses: PoseTable = POSES,
    individuality = 0,
  ) {
    const rng = mulberry32(Math.imul(individuality + 1, 2654435761));
    this.phase = rng() * Math.PI * 2;
    this.breathRate = 0.85 + rng() * 0.3;
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

  /** Mid-shudder? (smoke + test seam for the shake-off) */
  get flinching(): boolean {
    return this.flinchLeft > 0;
  }

  /** THE SHAKE-OFF (item 16): a shot bonked off this body. Additive
   * shudder — never yanks a verdict pose, no-op on rig-less bodies
   * (assetless law: every call stays safe). */
  flinch(): void {
    if (!this.rigged) return;
    this.flinchLeft = FLINCH_FRAMES;
  }

  /** THE BENCH REST (plans/15 item 25): hold the lean as long as the
   * owner keeps calling — the founding patron waits leaning at the
   * rest stop all lobby. Called BEFORE update() each frame; the hold
   * outlives one decrement and decays naturally the frame the owner
   * stops (the parade calls him and the walk takes over). A bench body
   * never hears a verdict, so this can't yank a pose. */
  holdLean(): void {
    if (!this.rigged) return;
    this.mode = "lean";
    this.holdFrames = 2;
  }

  /** THE MOUTH ANCHOR (plans/16 slice 7 — the eat beat's arc target):
   * the head bone's WORLD position. The skinned-clone law applies —
   * group transforms lie for skinned meshes, so the bone is the only
   * honest oracle. Rig-less bodies return null (assetless law: the
   * beat that needs a mouth is skipped, the cake stays). Writes into
   * `out` — callers pass a scratch vector, no per-frame allocation. */
  mouthWorld(out: THREE.Vector3): THREE.Vector3 | null {
    const head = this.bones.get("head");
    if (!head) return null;
    head.updateWorldMatrix(true, false);
    return head.getWorldPosition(out);
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
    const pose = this.mode === "idle" ? null : this.poses[this.mode];
    const rate =
      this.mode !== "idle" && this.mode !== "lean" ? SNAP_LERP : EASE_LERP;
    this.phase += BREATH_PER_FRAME * this.breathRate;
    const breath = CHEST_HEAVE_RAD * Math.sin(this.phase);
    const nod = HEAD_NOD_RAD * Math.sin(this.phase - 0.9);
    const settle = WING_SETTLE_RAD * Math.sin(this.phase - 0.45);
    // The shake-off (item 16): a decaying shudder — head Y is the
    // "no no no", spine/chest Z the trunk shudder.
    let shakeY = 0;
    let shakeZ = 0;
    if (this.flinchLeft > 0) {
      this.flinchLeft--;
      const fall = this.flinchLeft / FLINCH_FRAMES;
      const wob = Math.sin(this.flinchLeft * FLINCH_HZ_PER_FRAME) * fall;
      shakeY = FLINCH_HEAD_RAD * wob;
      shakeZ = FLINCH_BODY_RAD * wob;
    }
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
      const extraY = name === "head" ? shakeY : 0;
      const extraZ =
        name === "wingL"
          ? settle
          : name === "wingR"
            ? -settle
            : name === "spine" || name === "chest"
              ? shakeZ
              : 0;
      bone.rotation.set(
        rest.x + cur.x + extraX,
        rest.y + cur.y + extraY,
        rest.z + cur.z + extraZ,
      );
    }
  }
}
