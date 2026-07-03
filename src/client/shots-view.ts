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
import { launchOrigin, launchVelocity, SPLAT_SPEED } from "../core/ballistics";
import { ProjectileManager, PROJECTILE_RADIUS } from "../core/projectiles";
import { MACHINE_BASE } from "../core/arena";
import { TILT_DEG_PER_NOTCH } from "../game/catapult";
import type { ShotMsg } from "./net-handlers";
import { sphere, TOPPING_COLORS } from "./scene";

export class ShotsView {
  private readonly shots = new ProjectileManager();
  private readonly meshes: Array<{ body: RAPIER.RigidBody; mesh: THREE.Mesh }> =
    [];

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

  /** One fixed tick: advance the shared world; markers + splat readout. */
  step(flash: (msg: string, ms?: number) => void): void {
    const ev = this.shots.step(this.world);
    for (const im of ev.impacts) {
      const splat = im.speed >= SPLAT_SPEED;
      this.addLandingMarker(im.pos.x, im.pos.y, im.pos.z, splat);
      flash(
        `${splat ? "SPLAT!" : "placed."} ${im.topping} landed at ${im.speed.toFixed(1)} m/s`,
      );
    }
  }

  /** Per frame: meshes follow their bodies. */
  sync(): void {
    for (const s of this.meshes) {
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
  }
}
