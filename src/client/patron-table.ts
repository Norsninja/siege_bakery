/**
 * THE TABLE (plans/19 — the unified fiction): the patron standing over
 * the current order. Rung N's patron is DERIVED (cast.ts), never
 * synced; this module owns the body swap and the linger theatre —
 * verdict pose (PatronBody's job) → THE WALK-OFF down the departure
 * lane → THE ARRIVAL of the next patron from the head of the line.
 *
 * Laws: client-only juice, frame-counted (no wall clock); polling seam
 * (late joiners and seam jumps SNAP to derived state, no theatre);
 * assetless boot — a missing species model falls back to the ogre,
 * a missing ogre to no body at all, and every call stays a no-op.
 *
 * THE FEED GATE: a freshly arrived patron must not replay the OLD
 * patron's standing verdict (PatronBody deliberately plays standing
 * verdicts — right for a rejoining client, wrong for a new patron).
 * The manager therefore feeds the arrival (null, null) until the
 * fresh deal nulls the verdict, then opens the real feed — the seq
 * adoption on first real update is already silent by design.
 */
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { CakeTier } from "../core/dessert";
import type { Judgment } from "../game/judgment";
import { loadModel } from "./assets";
import { lineSlots, tablePatron, TABLE_POS, TABLE_YAW } from "./cast";
import { EatTheatre, eatAction } from "./eat-beat";
import type { SfxFn } from "./sfx";
import { PatronBody, POSES, SPECIES_POSES } from "./patron-body";
import {
  ARRIVE_SPEED,
  DEPART_SPEED,
  WALK_PHASE_PER_FRAME,
  walkSway,
} from "./walk";

/** The linger beat sheet, in frames (~60fps). PatronBody holds its
 * verdict pose 240 frames (the polaroid beat — photo BEFORE eating);
 * the EAT BEAT rides the relax (eat-beat.ts: arc at 250, CHOMP at
 * 330, burst settled by ~400); the walk-off starts after it all
 * resolves (stretched 300→460 with the eat beat, plans/16 slice 7 —
 * ruled ~450–480). EXPORTED because the line advances on the SAME
 * beat (line.ts): the head of the line steps out toward the table
 * exactly as the queue closes the gap behind him. */
export const DEPART_AT_FRAMES = 460;
/** The departure lane: the road corridor's far side (game z), so the
 * served giant ambles PAST the waiting line into the haze. */
const DEPART_LANE_Z = -52;
const DESPAWN_X = 380; // deep in the fog band (fog full at 280)
// Stride dials live in walk.ts (plans/15 item 20) — ONE home.

interface TableBody {
  group: THREE.Group;
  body: PatronBody;
  species: string;
  walkPhase: number;
}

export class PatronTable {
  private seated: TableBody | null = null;
  private departing: TableBody | null = null;
  private arriving: TableBody | null = null;
  /** The rung whose patron is (or is walking to be) at the table. */
  private shownRung = -1;
  private lastVerdict: Judgment | null = null;
  private lingerFrames = 0;
  /** The eat beat in flight (plans/16 slice 7) — born on an eating
   * verdict's edge, stepped on the linger count, killed by any snap. */
  private eat: EatTheatre | null = null;
  private readonly mouthScratch = new THREE.Vector3();
  /** Spawn-generation guard: a snap invalidates every in-flight fetch
   * callback (models resolve async; the world may have moved on). */
  private gen = 0;

  constructor(
    private readonly scene: THREE.Scene,
    /** The FX port's sound half (slice 6) — handed to each EatTheatre
     * so the chomp sting fires on the CHOMP edge. Optional: tests and
     * assetless boots stay silent by construction. */
    private readonly sound?: SfxFn,
  ) {}

  /** The seam main.ts exposes (__game.getPatronBody). */
  get body(): PatronBody | null {
    return this.seated?.body ?? null;
  }

  /** For smokes/tests: which species stands (or walks to stand) at
   * the table right now. */
  get species(): string | null {
    return (this.seated ?? this.arriving)?.species ?? null;
  }

  /** The eat beat's smoke seam: stage + spoken word, or null when no
   * theatre is in flight (hungry verdicts and quiet frames alike). */
  get eatBeat(): { stage: string; word: string | null } | null {
    return this.eat
      ? { stage: this.eat.stage, word: this.eat.spokenText }
      : null;
  }

  /** Load a species body through the seam with the fallback ladder:
   * species → ogre → null. Clones share template resources (never
   * disposed here). */
  private async spawn(rung: number): Promise<TableBody | null> {
    const member = tablePatron(rung);
    let template = await loadModel(member.species);
    let scale = member.visualScale;
    if (!template && member.species !== "ogre") {
      template = await loadModel("ogre");
      scale = 36 / 21;
    }
    if (!template) return null;
    // THE SKINNED-CLONE LAW (found live 2026-07-12, "the line is in the
    // town"): Object3D.clone() does NOT rebind skeletons — a cloned
    // SkinnedMesh keeps the TEMPLATE's bones and renders at the origin
    // no matter where its group stands. Skinned templates clone through
    // SkeletonUtils; resources stay shared (never dispose a clone).
    const group = cloneSkinned(template) as THREE.Group;
    group.scale.setScalar(scale);
    group.rotation.y = TABLE_YAW;
    this.scene.add(group);
    return {
      group,
      body: new PatronBody(
        group,
        SPECIES_POSES[tablePatron(rung).species] ?? POSES,
        rung, // the table holds queueIndex = rung: his breath followed him up the line
      ),
      species: member.species,
      walkPhase: 0,
    };
  }

  /** Instant, theatre-free placement of rung's patron (boot, late
   * join, seam jumps, any mismatch recovery). */
  private snapTo(rung: number): void {
    for (const b of [this.seated, this.departing, this.arriving])
      if (b) b.group.removeFromParent(); // shared-clone law: no dispose
    this.seated = this.departing = this.arriving = null;
    this.shownRung = rung;
    this.lingerFrames = 0;
    this.eat?.dispose(); // mid-beat snap: the theatre vanishes with him
    this.eat = null;
    const gen = ++this.gen;
    void this.spawn(rung).then((b) => {
      // The world may have moved on while the model fetched.
      if (!b) return;
      if (gen !== this.gen || this.seated) {
        b.group.removeFromParent();
        return;
      }
      b.group.position.set(TABLE_POS.x, 0, TABLE_POS.z);
      this.seated = b;
    });
  }

  private walk(b: TableBody, tx: number, tz: number, speed: number): boolean {
    const p = b.group.position;
    const dx = tx - p.x;
    const dz = tz - p.z;
    const d = Math.hypot(dx, dz);
    const step = Math.min(speed, d);
    if (d > 1e-3) {
      p.x += (dx / d) * step;
      p.z += (dz / d) * step;
      b.group.rotation.y = Math.atan2(dx, dz);
      b.walkPhase += WALK_PHASE_PER_FRAME;
      const sway = walkSway(b.walkPhase);
      p.y = sway.bob;
      b.group.rotation.z = sway.rock;
    }
    return d <= speed; // arrived (this step covered the remainder)
  }

  /** Per render frame, fed from view (the polling seam). `tiers` is
   * the CURRENT deal's dessert rows (view.dessert.spec.tiers) — the
   * eat beat captures them on the verdict edge, so the proxy eaten is
   * the cake that was JUDGED even if a redeal rebinds mid-beat. */
  update(
    rung: number,
    patronSeq: number | null,
    verdict: Judgment | null,
    tiers: readonly CakeTier[] = [],
  ): void {
    const wantRung = Math.max(1, rung);

    // Verdict edges drive the theatre; anything else out of step snaps.
    if (verdict !== this.lastVerdict) {
      this.lastVerdict = verdict;
      if (verdict && this.shownRung === wantRung && this.seated) {
        this.lingerFrames = 1; // the beat begins (verdict pose plays first)
        this.eat?.dispose(); // a straggler from the last beat (never in practice)
        const action = eatAction(verdict);
        // HUNGRY walks away mournful, the cake uneaten (the ruled split).
        this.eat = action
          ? new EatTheatre(this.scene, tiers, action, this.sound)
          : null;
      } else if (!verdict && this.arriving) {
        // Fresh deal: the arrival takes his seat whatever step he was
        // on. shownRung stays where the departure set it — the rung
        // broadcast may land a frame after the verdict nulls, and a
        // rewind here would trigger a spurious snap.
        this.arriving.group.position.set(TABLE_POS.x, 0, TABLE_POS.z);
        this.arriving.group.rotation.set(0, TABLE_YAW, 0);
        this.seated = this.arriving;
        this.arriving = null;
      }
    }

    // Boot / late join / seam jump / redeal mismatch: no theatre, snap.
    if (
      this.shownRung !== wantRung &&
      !this.lingerFrames &&
      !this.arriving &&
      !this.departing
    ) {
      this.snapTo(wantRung);
    }

    // The linger beat sheet.
    if (this.lingerFrames > 0) {
      this.lingerFrames++;
      if (this.lingerFrames >= DEPART_AT_FRAMES && this.seated) {
        this.departing = this.seated;
        this.seated = null;
        this.shownRung = wantRung + 1; // the next patron is now "shown"
        const gen = this.gen;
        void this.spawn(wantRung + 1).then((b) => {
          if (!b) return;
          if (gen !== this.gen || this.seated || this.arriving) {
            b.group.removeFromParent();
            return;
          }
          // He starts EXACTLY where the head of the line stood —
          // personal stagger included — as line.ts removes that clone
          // on the same frame (the handoff must not pop).
          const head = lineSlots(wantRung)[0]!;
          b.group.position.set(head.x, 0, head.z);
          b.group.rotation.y = head.yaw;
          this.arriving = b;
        });
        this.lingerFrames = 0;
      }
    }

    // The eat beat rides the linger count; the mouth is the patron's
    // LIVE anchor (bone truth — the skinned-clone corollary), tracked
    // per frame so the arc lands on a breathing head.
    if (this.eat) {
      const b = this.seated ?? this.departing;
      const mouth = b ? b.body.mouthWorld(this.mouthScratch) : null;
      this.eat.step(this.lingerFrames, mouth);
      if (this.eat.stage === "done") this.eat = null;
    }

    // Walks.
    if (this.departing) {
      const b = this.departing;
      const onLane = Math.abs(b.group.position.z - DEPART_LANE_Z) < 0.5;
      const done = onLane
        ? this.walk(b, DESPAWN_X, DEPART_LANE_Z, DEPART_SPEED)
        : (this.walk(b, TABLE_POS.x + 14, DEPART_LANE_Z, DEPART_SPEED), false);
      if (done || b.group.position.x >= DESPAWN_X - 1) {
        b.group.removeFromParent();
        this.departing = null;
      }
    }
    if (this.arriving) {
      const done = this.walk(this.arriving, TABLE_POS.x, TABLE_POS.z, ARRIVE_SPEED);
      if (done) {
        this.arriving.group.position.y = 0;
        this.arriving.group.rotation.set(0, TABLE_YAW, 0);
      }
    }

    // Feed the bones. THE FEED GATE: only the seated patron of the
    // CURRENT rung hears real state; walkers and arrivals breathe on
    // (null, null) so foreign verdicts never replay.
    this.seated?.body.update(
      this.shownRung === wantRung ? patronSeq : null,
      this.shownRung === wantRung ? verdict : null,
    );
    this.departing?.body.update(null, null);
    this.arriving?.body.update(null, null);
  }
}
