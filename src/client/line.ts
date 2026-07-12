/**
 * THE LINE (plans/19): the endless queue of giants on the giants'
 * road — the order queue made flesh. Pure derivation (cast.ts) tells
 * every client the same truth; this module only PAINTS it: shared-
 * template clones up close, frozen clones mid-field, one instanced
 * silhouette mesh per species in the horizon haze.
 *
 * Laws: assetless boot (no models → no line, a normal Tuesday);
 * shared-clone law (remove, never dispose); frame-driven animation;
 * the far crowd is named far_giant_* and wears the pinned unlit
 * fog-exempt treatment (scene.ts backdropTreatment culture);
 * frustumCulled=false on the instanced meshes (the sprinkles lesson:
 * a mesh far from the origin culls itself while "visible").
 */
import * as THREE from "three";
import type { Judgment } from "../game/judgment";
import { loadModel } from "./assets";
import { CAST, lineSlots, type LineSlot } from "./cast";
import { PatronBody, POSES, SPECIES_POSES } from "./patron-body";
import { DEPART_AT_FRAMES } from "./patron-table";

const ADVANCE_FRAMES = 150; // ~2.5 s shuffle-forward
const WALK_PHASE_PER_FRAME = 0.1;
const WALK_BOB_M = 0.35;
const WALK_ROCK_RAD = 0.025;
/** Instanced-crowd capacity per species (the far tier is 4 slots;
 * headroom costs nothing). */
const CROWD_CAP = 8;

interface LineGiant {
  slot: LineSlot;
  /** Present for actor/standee tiers; impostors render instanced. */
  group: THREE.Group | null;
  body: PatronBody | null; // actors only — they breathe
  from: { x: number; z: number };
  walkPhase: number;
}

export class LineManager {
  private giants = new Map<number, LineGiant>(); // key: queueIndex
  private renderedRung = -1;
  private lastVerdict: Judgment | null = null;
  private animFrames = 0;
  /** Counts up from the verdict edge; the advance fires on the same
   * beat the table's departure does (the handoff frame). */
  private lingerFrames = 0;
  private readonly templates = new Map<string, THREE.Group | null>();
  private crowd = new Map<string, THREE.InstancedMesh>();
  private templatesRequested = false;
  private gen = 0;

  constructor(private readonly scene: THREE.Scene) {}

  /** Lazy template fetch on first use — solo lobby boots never pay
   * for the cast until a run exists. Missing models leave holes, and
   * a wholly assetless boot leaves no line at all. */
  private requestTemplates(): void {
    if (this.templatesRequested) return;
    this.templatesRequested = true;
    const gen = this.gen;
    for (const member of CAST) {
      void loadModel(member.species).then((m) => {
        if (gen !== this.gen) return;
        this.templates.set(member.species, m);
        if (m) this.rebuild(this.renderedRung); // dress newly-available slots
      });
    }
    void loadModel("giants_far").then((far) => {
      if (gen !== this.gen || !far) return;
      far.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const species = o.name.replace(/^far_giant_/, "");
        if (species === o.name) return; // not a crowd mesh
        const inst = new THREE.InstancedMesh(
          o.geometry,
          // The far_ treatment by construction (backdropTreatment's
          // unlit arm): vertex color carries the baked haze.
          new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
          CROWD_CAP,
        );
        inst.name = `far_giant_${species}`;
        inst.count = 0;
        inst.frustumCulled = false;
        this.scene.add(inst);
        this.crowd.set(species, inst);
      });
      this.paintCrowd();
    });
  }

  /** Rebuild bodies for the given rung's slots (boot, snap, advance
   * completion, template arrival). Idempotent; clones are shared —
   * removal never disposes. */
  private rebuild(rung: number): void {
    if (rung < 1) return;
    const slots = lineSlots(rung);
    const want = new Map(slots.map((s) => [s.queueIndex, s]));
    for (const [q, g] of this.giants) {
      if (!want.has(q)) {
        g.group?.removeFromParent();
        this.giants.delete(q);
      }
    }
    for (const slot of slots) {
      const existing = this.giants.get(slot.queueIndex);
      if (slot.tier === "impostor") {
        // Instanced — no per-giant group. (A giant demoted… never
        // happens: slots only decrease. But a snap can re-tier.)
        if (existing?.group) existing.group.removeFromParent();
        this.giants.set(slot.queueIndex, {
          slot,
          group: null,
          body: null,
          from: { x: slot.x, z: slot.z },
          walkPhase: 0,
        });
        continue;
      }
      const template = this.templates.get(slot.species);
      if (existing?.group && existing.slot.species === slot.species) {
        // Keep the body; retarget the slot (tier may have upgraded
        // standee→actor: host the breath).
        existing.from = { x: existing.slot.x, z: existing.slot.z };
        existing.slot = slot;
        if (slot.tier === "actor" && !existing.body)
          existing.body = new PatronBody(
            existing.group,
            SPECIES_POSES[slot.species] ?? POSES,
          );
        continue;
      }
      if (existing?.group) existing.group.removeFromParent();
      if (!template) {
        // Hole in the line until the template lands (or forever,
        // assetless) — rebuild() re-runs on template arrival.
        this.giants.set(slot.queueIndex, {
          slot,
          group: null,
          body: null,
          from: { x: slot.x, z: slot.z },
          walkPhase: 0,
        });
        continue;
      }
      const group = template.clone() as THREE.Group;
      group.scale.setScalar(slot.visualScale);
      group.position.set(slot.x, 0, slot.z);
      group.rotation.y = slot.yaw;
      this.scene.add(group);
      this.giants.set(slot.queueIndex, {
        slot,
        group,
        body:
          slot.tier === "actor"
            ? new PatronBody(group, SPECIES_POSES[slot.species] ?? POSES)
            : null,
        from: { x: slot.x, z: slot.z },
        walkPhase: 0,
      });
    }
    this.paintCrowd();
  }

  /** Write the far-crowd instance matrices from current giant
   * positions (called on rebuild and per-frame during the advance). */
  private paintCrowd(): void {
    if (this.crowd.size === 0) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const counts = new Map<string, number>();
    for (const inst of this.crowd.values()) inst.count = 0;
    for (const g of this.giants.values()) {
      if (g.slot.tier !== "impostor") continue;
      const inst = this.crowd.get(g.slot.species);
      if (!inst) continue;
      const i = counts.get(g.slot.species) ?? 0;
      if (i >= CROWD_CAP) continue;
      counts.set(g.slot.species, i + 1);
      const t = this.animFrames > 0 ? 1 - this.animFrames / ADVANCE_FRAMES : 1;
      const x = g.from.x + (g.slot.x - g.from.x) * t;
      const z = g.from.z + (g.slot.z - g.from.z) * t;
      q.setFromAxisAngle(up, g.slot.yaw);
      m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, 1, 1));
      inst.setMatrixAt(i, m);
      inst.count = i + 1;
      inst.instanceMatrix.needsUpdate = true;
    }
  }

  /** Per render frame, fed from view (the polling seam). */
  update(rung: number, verdict: Judgment | null): void {
    const wantRung = Math.max(1, rung);
    this.requestTemplates();

    // The advance is armed by the verdict edge (order ended) but
    // FIRES on the departure beat — the table patron finishes his
    // verdict pose and walks off; only then does the queue close the
    // gap (the visionary's fiction: served, THEN everyone steps up).
    if (verdict !== this.lastVerdict) {
      this.lastVerdict = verdict;
      if (verdict && this.renderedRung === wantRung) this.lingerFrames = 1;
    }
    if (this.lingerFrames > 0 && ++this.lingerFrames >= DEPART_AT_FRAMES) {
      this.lingerFrames = 0;
      if (this.renderedRung === wantRung) {
        this.renderedRung = wantRung + 1;
        this.rebuild(this.renderedRung);
        this.animFrames = ADVANCE_FRAMES;
      }
    }

    // Boot, late join, seam jumps, new runs: snap, no theatre. The
    // advanced (+1) state is legitimate ONLY while the verdict still
    // lingers — a fresh RUN also arrives at rung 1 with the verdict
    // nulled, and holding the old advanced config there strands the
    // line one slot ahead of the new queue (found live 2026-07-12,
    // runover-restart trace). The post-linger deal itself lands with
    // rung and verdict updated together, so it never snaps.
    const advancedMidLinger =
      this.renderedRung === wantRung + 1 && verdict !== null;
    if (this.renderedRung !== wantRung && !advancedMidLinger) {
      this.renderedRung = wantRung;
      this.animFrames = 0;
      this.lingerFrames = 0;
      this.rebuild(wantRung);
    }

    // The shuffle-forward.
    if (this.animFrames > 0) {
      this.animFrames--;
      const t = 1 - this.animFrames / ADVANCE_FRAMES;
      for (const g of this.giants.values()) {
        if (!g.group) continue;
        const x = g.from.x + (g.slot.x - g.from.x) * t;
        const z = g.from.z + (g.slot.z - g.from.z) * t;
        const moving =
          Math.abs(g.slot.x - g.from.x) + Math.abs(g.slot.z - g.from.z) > 0.01;
        g.group.position.x = x;
        g.group.position.z = z;
        if (moving) {
          g.walkPhase += WALK_PHASE_PER_FRAME;
          const sway = Math.sin(g.walkPhase);
          g.group.position.y = Math.abs(sway) * WALK_BOB_M;
          g.group.rotation.z = sway * WALK_ROCK_RAD;
          if (this.animFrames === 0) {
            g.group.position.y = 0;
            g.group.rotation.z = 0;
          }
        }
      }
      this.paintCrowd();
    }

    // Actors breathe (fed null — line giants have no verdict of
    // their own; the table owns the theatre).
    for (const g of this.giants.values()) g.body?.update(null, null);
  }

  /** Smoke seam: [queueIndex, species, x, z, tier] rows. */
  snapshot(): Array<{
    q: number;
    species: string;
    x: number;
    z: number;
    tier: string;
    dressed: boolean;
  }> {
    return [...this.giants.values()].map((g) => ({
      q: g.slot.queueIndex,
      species: g.slot.species,
      x: g.group?.position.x ?? g.slot.x,
      z: g.group?.position.z ?? g.slot.z,
      tier: g.slot.tier,
      dressed: g.group !== null,
    }));
  }
}
