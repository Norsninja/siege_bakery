/**
 * The visual projectile sim — every lob the room announces, simulated
 * locally for flight, markers, and splat readouts (M4 of the decomp phase,
 * plans/06). Extracted verbatim from main.ts. Scoring truth stays with the
 * room's `scored` messages; this is what the player SEES.
 *
 * NOTE: step() advances the SHARED client world (the same world the baker
 * moves through) — the world is stepped exactly once per fixed tick, here,
 * after Baker.step has registered its kinematic movement. Don't add a
 * second world.step anywhere.
 */
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import {
  launchOrigin,
  launchVelocity,
  SPLAT_SPEED,
  type Vec3,
} from "../core/ballistics";
import {
  ProjectileManager,
  PROJECTILE_RADIUS,
  type GrainBody,
} from "../core/projectiles";
import { MACHINE_BASE } from "../core/arena";
import { TILT_DEG_PER_NOTCH } from "../game/catapult";
import { isPaint, TOPPINGS } from "../game/toppings";
import type { RestingTopping } from "../game/protocol";
import type { ShotMsg } from "./net-handlers";
import { removeAndDispose, sphere, TOPPING_COLORS } from "./scene";

/** Landing rings are breadcrumbs, not a permanent record: FIFO-capped like
 * the ground splats (audit 2026-07-03 — they used to accumulate forever). */
const LANDING_MARKER_MAX = 30;

/** Burst grains are MULTICOLOR (plans/10 — color-variety judgment stays
 * deferred; the confetti is the point). In-flight grains take the palette by
 * SPAWN INDEX; the PERCHED sprinkles (sprinkles-view) recolor by a stable hash
 * of the grip point off this same palette — so flight color and final perch
 * color need not match (both are just confetti), but a perched sprinkle keeps
 * one color for life and reads identically on every client. */
export const GRAIN_PALETTE = [0xe4572e, 0x29bb89, 0x4a7cdb, 0xf2c14e, 0xd05ce3, 0xfff0f5];

export class ShotsView {
  private readonly shots = new ProjectileManager();
  private readonly meshes: Array<{ body: RAPIER.RigidBody; mesh: THREE.Mesh }> =
    [];
  private readonly markers: THREE.Mesh[] = [];
  /** A paint glob landed in the local sim — main wires this to the
   * FrostingView (the deterministic twin of the Room's field). The topping
   * rides along: fudge paints under its own splat law and renders dark. */
  onPaintImpact: ((topping: string, pos: Vec3, speed: number) => void) | null =
    null;
  /** A grain GRIPPED in the local sim (the conversion law, plans/10 §8):
   * its body is already gone — sync() sweeps the mesh — and main hands
   * the record to the SprinklesView to perch on the frosting visual. */
  onStuck: ((topping: string, pos: Vec3, normal: Vec3) => void) | null = null;
  /** The local deal generation — the mirror of the Room's stale-shot rule
   * (checkpoint audit 2026-07-03): a glob fired against the previous order
   * still visibly lands, but must not paint the fresh cake's local field
   * the Room's authoritative field will never show. */
  private deal = 0;

  constructor(
    private readonly world: RAPIER.World,
    private readonly scene: THREE.Scene,
  ) {}

  /** Everyone simulates the same deterministic lob locally — including
   * bursts: the shot event's seed replays the identical scatter here. */
  spawn(msg: ShotMsg): void {
    const burst = TOPPINGS[msg.topping]?.burst;
    const body = this.shots.spawn(
      this.world,
      launchOrigin(MACHINE_BASE, msg.traverseDeg),
      launchVelocity(
        msg.traverseDeg,
        msg.tensionClicks,
        msg.tiltNotch * TILT_DEG_PER_NOTCH,
      ),
      msg.topping,
      // Paint globs are consumed at impact (plans/07): the manager removes
      // the body; sync() sweeps the orphaned mesh.
      {
        consumeOnImpact: isPaint(msg.topping),
        tag: this.deal,
        seed: msg.seed,
        ...(burst ? { burst } : {}),
      },
    );
    const mesh = sphere(
      PROJECTILE_RADIUS,
      TOPPING_COLORS[msg.topping] ?? 0xc23b4e,
      0,
      -5,
      0,
      this.scene,
    );
    this.meshes.push({ body, mesh });
  }

  /** Recreate a topping already at rest (welcome world-sync, F2): a live
   * obstacle for later shots, but no markers — its landing is old news.
   * A settled burst topping IS its grain (carriers never land). */
  spawnResting(t: RestingTopping): void {
    const grain = TOPPINGS[t.topping]?.burst?.grain;
    const body = this.shots.spawnAtRest(
      this.world,
      { x: t.x, y: t.y, z: t.z },
      t.topping,
      grain,
    );
    const mesh = grain
      ? this.grainMesh(grain, 0)
      : sphere(
          PROJECTILE_RADIUS,
          TOPPING_COLORS[t.topping] ?? 0xc23b4e,
          t.x,
          t.y,
          t.z,
          this.scene,
        );
    mesh.position.set(t.x, t.y, t.z);
    this.meshes.push({ body, mesh });
  }

  /** A fresh deal was dealt: shots already in the air belong to the old
   * order — their paint must not land on the fresh cake's clean field. */
  bumpDeal(): void {
    this.deal++;
  }

  /** The conversion law's paint oracle (plans/10 §8): main binds the local
   * FrostingView field so grains grip where they hit wet paint on the
   * dessert skin — the deterministic twin of the Room's binding. */
  bindStickyPaint(check: (pos: Vec3) => boolean): void {
    this.shots.stickyPaint = check;
  }

  /** The fresh-cake law: everything on the dessert leaves with it. The
   * Room does the same on its side; sync() sweeps the orphaned meshes. */
  clearCakeSolids(): void {
    this.shots.clearCakeSolids(this.world);
  }

  /** One fixed tick: advance the shared world; markers + splat readout. */
  step(flash: (msg: string, ms?: number) => void): void {
    const ev = this.shots.step(this.world);
    // Bursts: the carrier's mesh leaves with its body (sync sweeps it);
    // every grain gets a confetti capsule. One flash for the whole pop.
    for (const b of ev.bursts) {
      for (let gi = 0; gi < b.grains.length; gi++) {
        const grain = TOPPINGS[b.topping]?.burst?.grain;
        if (!grain) continue;
        const mesh = this.grainMesh(grain, gi);
        this.meshes.push({ body: b.grains[gi]!, mesh });
      }
      flash(`POP! the ${b.topping} burst — ${b.grains.length} grains`);
    }
    // IMPACTS BEFORE STUCK — the mirror of the Room's tickScoringPhase
    // ordering (room.ts: the impacts loop's BURIAL filter runs while
    // ev.stuck is still unprocessed, so a grip on this same tick is not yet
    // in the ledger and survives). Adding the grip FIRST and burying second
    // (the old order) removed a same-tick grip here while the Room counted
    // it — a checklist-says-N / screen-shows-N-1 split, the exact class the
    // conversion law exists to kill (audit 2026-07-06). A glob landing the
    // same tick a grain grips under its footprint must bury it on NEITHER
    // side; only a strictly-LATER glob buries (the burial law's word).
    for (const im of ev.impacts) {
      // Grains land QUIETLY (plans/10): 40 landings must not be 40 toasts
      // and 40 rings — the burst already told the story.
      if (im.grain) continue;
      const splat = im.speed >= SPLAT_SPEED;
      this.addLandingMarker(im.pos.x, im.pos.y, im.pos.z, splat);
      if (isPaint(im.topping) && im.tag === this.deal)
        this.onPaintImpact?.(im.topping, im.pos, im.speed);
      flash(
        `${splat ? "SPLAT!" : "placed."} ${im.topping} landed at ${im.speed.toFixed(1)} m/s`,
      );
    }
    // Grips are QUIET like grain landings (the burst told the story); the
    // stuck record goes to the SprinklesView, stale ones included — a
    // stale burst visibly sticking to the fresh cake is accepted décor
    // (plans/10 §8), cleared with the next fresh deal.
    for (const st of ev.stuck) this.onStuck?.(st.topping, st.pos, st.normal);
  }

  /** Per frame: meshes follow their bodies (position AND rotation — a
   * grain capsule lies as it fell); consumed globs' and burst carriers'
   * meshes leave with their bodies. */
  sync(): void {
    for (let i = this.meshes.length - 1; i >= 0; i--) {
      const s = this.meshes[i]!;
      if (!s.body.isValid()) {
        removeAndDispose(s.mesh);
        this.meshes.splice(i, 1);
        continue;
      }
      const t = s.body.translation();
      s.mesh.position.set(t.x, t.y, t.z);
      const q = s.body.rotation();
      s.mesh.quaternion.set(q.x, q.y, q.z, q.w);
    }
  }

  /** A confetti capsule (plans/10: chunky-cute; multicolor by index). */
  private grainMesh(grain: GrainBody, index: number): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(grain.radius, grain.halfHeight * 2, 2, 6),
      new THREE.MeshStandardMaterial({
        color: GRAIN_PALETTE[index % GRAIN_PALETTE.length]!,
      }),
    );
    this.scene.add(mesh);
    return mesh;
  }

  private addLandingMarker(
    x: number,
    y: number,
    z: number,
    splat: boolean,
  ): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.25, splat ? 0.55 : 0.4, 24),
      new THREE.MeshBasicMaterial({
        color: splat ? 0xd8452e : 0x3fae5a,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, Math.max(0.02, y - PROJECTILE_RADIUS + 0.03), z);
    this.scene.add(ring);
    this.markers.push(ring);
    if (this.markers.length > LANDING_MARKER_MAX)
      removeAndDispose(this.markers.shift()!);
  }
}
