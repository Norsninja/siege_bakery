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
import { ProjectileManager, PROJECTILE_RADIUS } from "../core/projectiles";
import { MACHINE_BASE } from "../core/arena";
import { TILT_DEG_PER_NOTCH } from "../game/catapult";
import { isPaint } from "../game/toppings";
import type { RestingTopping } from "../game/protocol";
import type { ShotMsg } from "./net-handlers";
import { removeAndDispose, sphere, TOPPING_COLORS } from "./scene";

/** Landing rings are breadcrumbs, not a permanent record: FIFO-capped like
 * the ground splats (audit 2026-07-03 — they used to accumulate forever). */
const LANDING_MARKER_MAX = 30;

export class ShotsView {
  private readonly shots = new ProjectileManager();
  private readonly meshes: Array<{ body: RAPIER.RigidBody; mesh: THREE.Mesh }> =
    [];
  private readonly markers: THREE.Mesh[] = [];
  /** A paint glob landed in the local sim — main wires this to the
   * FrostingView (the deterministic twin of the Room's field). */
  onPaintImpact: ((pos: Vec3, speed: number) => void) | null = null;
  /** The local deal generation — the mirror of the Room's stale-shot rule
   * (checkpoint audit 2026-07-03): a glob fired against the previous order
   * still visibly lands, but must not paint the freshly licked local field
   * the Room's authoritative field will never show. */
  private deal = 0;

  constructor(
    private readonly world: RAPIER.World,
    private readonly scene: THREE.Scene,
  ) {}

  /** Everyone simulates the same deterministic lob locally. */
  spawn(msg: ShotMsg): void {
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
      { consumeOnImpact: isPaint(msg.topping), tag: this.deal },
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
   * obstacle for later shots, but no markers — its landing is old news. */
  spawnResting(t: RestingTopping): void {
    const body = this.shots.spawnAtRest(
      this.world,
      { x: t.x, y: t.y, z: t.z },
      t.topping,
    );
    const mesh = sphere(
      PROJECTILE_RADIUS,
      TOPPING_COLORS[t.topping] ?? 0xc23b4e,
      t.x,
      t.y,
      t.z,
      this.scene,
    );
    this.meshes.push({ body, mesh });
  }

  /** A fresh deal was dealt: shots already in the air belong to the old
   * order — their paint must not land on the licked-clean field. */
  bumpDeal(): void {
    this.deal++;
  }

  /** One fixed tick: advance the shared world; markers + splat readout. */
  step(flash: (msg: string, ms?: number) => void): void {
    const ev = this.shots.step(this.world);
    for (const im of ev.impacts) {
      const splat = im.speed >= SPLAT_SPEED;
      this.addLandingMarker(im.pos.x, im.pos.y, im.pos.z, splat);
      if (isPaint(im.topping) && im.tag === this.deal)
        this.onPaintImpact?.(im.pos, im.speed);
      flash(
        `${splat ? "SPLAT!" : "placed."} ${im.topping} landed at ${im.speed.toFixed(1)} m/s`,
      );
    }
  }

  /** Per frame: meshes follow their bodies; consumed globs' meshes leave
   * with them (the manager removed the body at impact). */
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
    }
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
