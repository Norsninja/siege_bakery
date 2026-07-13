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
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Judgment } from "../game/judgment";
import type { RunPhase } from "../game/run-flow";
import { loadModel } from "./assets";
import { CAST, lineSlots, type LineSlot } from "./cast";
import { PatronBody, POSES, SPECIES_POSES } from "./patron-body";
import { DEPART_AT_FRAMES } from "./patron-table";
import {
  ADVANCE_FRAMES,
  LINE_PARADE_FRAMES,
  PARADE_DISTANCE_M,
  WALK_PHASE_PER_FRAME,
  walkSway,
} from "./walk";

// Stride dials live in walk.ts (plans/15 item 20) — ONE home.
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
  /** The current walk's full length in frames — the advance's 330 or
   * the opening parade's longer march (item 25). */
  private animTotal = ADVANCE_FRAMES;
  /** Extra +x for bodies born MID-anim: during the parade a template
   * that lands late spawns in column formation out on the road (item
   * 25's loading-as-fiction — "still downloading" and "hasn't arrived
   * yet" are the same sentence) instead of popping at its slot. */
  private spawnFromX = 0;
  /** THE TRAINING LOBBY (item 25): pre-run the road carries the
   * horizon crowd ONLY — near giants arrive as the opening parade.
   * null = no frame seen yet (a late joiner's first frame must adopt
   * its mode without theatre). */
  private lobbyShown: boolean | null = null;
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
        // Dress newly-available slots. Never snap mid-anim: a template
        // landing during the parade (or an advance) must not teleport
        // the marching column to its slots.
        if (m) this.rebuild(this.renderedRung, this.animFrames === 0);
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
   * start, template arrival). Idempotent; clones are shared — removal
   * never disposes. `snap` places kept giants immediately; an advance
   * passes false and lets the walk animation carry them. */
  private rebuild(rung: number, snap = true): void {
    if (rung < 1) return;
    // Pre-run the lobby ships the horizon only (item 25): near tiers
    // are simply absent from the want-map, so entering the lobby razes
    // them and the far crowd stands untouched.
    const slots = lineSlots(rung).filter(
      (s) => !this.lobbyShown || s.tier === "impostor",
    );
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
        // standee→actor: host the breath). A rebuild OUTSIDE an
        // advance is a SNAP — place the group immediately, or a kept
        // giant stands at his stale mark forever (found live
        // 2026-07-12: a frostgiant loitering at slot 0's mark two
        // rungs after his turn).
        existing.from = { x: existing.slot.x, z: existing.slot.z };
        existing.slot = slot;
        if (snap) {
          existing.group.position.set(slot.x, 0, slot.z);
          existing.group.rotation.set(0, slot.yaw, 0);
          existing.from = { x: slot.x, z: slot.z };
        }
        if (slot.tier === "actor" && !existing.body)
          existing.body = new PatronBody(
            existing.group,
            SPECIES_POSES[slot.species] ?? POSES,
            slot.queueIndex,
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
      // THE SKINNED-CLONE LAW (patron-table.ts): SkeletonUtils, never
      // .clone(), for live-skinned templates — a plain clone renders at
      // the ORIGIN (the town!) regardless of its group transform.
      const group = cloneSkinned(template) as THREE.Group;
      group.scale.setScalar(slot.visualScale);
      // Born mid-anim: join the column where it currently marches
      // (spawnFromX carries the parade's start offset), not at the
      // slot — the lerp brings him in with everyone else.
      const fromX =
        this.animFrames > 0 ? slot.x + this.spawnFromX : slot.x;
      group.position.set(fromX, 0, slot.z);
      group.rotation.y = slot.yaw;
      this.scene.add(group);
      this.giants.set(slot.queueIndex, {
        slot,
        group,
        body:
          slot.tier === "actor"
            ? new PatronBody(
                group,
                SPECIES_POSES[slot.species] ?? POSES,
                slot.queueIndex,
              )
            : null,
        from: { x: fromX, z: slot.z },
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
      const t = this.animFrames > 0 ? 1 - this.animFrames / this.animTotal : 1;
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
  update(phase: RunPhase, rung: number, verdict: Judgment | null): void {
    const wantRung = Math.max(1, rung);
    // Templates stream DURING the lobby (item 25's loading-as-fiction):
    // the request fires here whatever the phase; only the near BODIES
    // wait for the parade.
    this.requestTemplates();

    // THE MODE EDGES (item 25). First frame adopts silently (a late
    // joiner snaps, never parades); lobby entry razes the near tiers
    // (the rebuild filter); ALL-IN marches them in from the haze.
    const preRun = phase === "lobby" || phase === "countdown";
    if (this.lobbyShown === null) {
      this.lobbyShown = preRun;
    } else if (preRun !== this.lobbyShown) {
      this.lobbyShown = preRun;
      this.lastVerdict = verdict; // a stale post-loss edge never fires here
      this.lingerFrames = 0;
      if (preRun) {
        // Back to the bakery: the horizon crowd holds, near giants go.
        this.renderedRung = wantRung;
        this.animFrames = 0;
        this.rebuild(wantRung);
      } else {
        // THE OPENING PARADE: the line strides in from the horizon,
        // staggered behind the founding patron (patron-table walks
        // him bench→table on this same edge). Column formation: every
        // near giant starts PARADE_DISTANCE_M up the road and the
        // lerp brings the whole queue in together.
        this.renderedRung = wantRung;
        this.spawnFromX = PARADE_DISTANCE_M;
        this.animTotal = LINE_PARADE_FRAMES;
        this.animFrames = LINE_PARADE_FRAMES;
        this.rebuild(wantRung, false);
        for (const g of this.giants.values()) {
          if (g.slot.tier === "impostor") continue; // already home
          g.from = { x: g.slot.x + PARADE_DISTANCE_M, z: g.slot.z };
          g.group?.position.set(g.from.x, 0, g.from.z);
        }
      }
    }
    // Pre-run there is no line theatre: the crowd stands, nothing
    // advances (the verdict edge below belongs to live runs).
    if (preRun) {
      this.lastVerdict = verdict;
      if (this.renderedRung !== wantRung) {
        this.renderedRung = wantRung;
        this.animFrames = 0;
        this.rebuild(wantRung);
      }
      return;
    }

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
        this.rebuild(this.renderedRung, false); // the walk carries them
        this.spawnFromX = 0; // latecomer templates pop at slot, as ever
        this.animTotal = ADVANCE_FRAMES;
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

    // The shuffle-forward (and the parade — same lerp, longer march).
    if (this.animFrames > 0) {
      this.animFrames--;
      const t = 1 - this.animFrames / this.animTotal;
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
          const sway = walkSway(g.walkPhase);
          g.group.position.y = sway.bob;
          g.group.rotation.z = sway.rock;
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
