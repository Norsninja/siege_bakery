/**
 * Projectile tracking — dynamic toppings in flight, first-impact detection,
 * and final-rest detection.
 *
 * Owns the Rapier EventQueue, so a world with projectiles is stepped THROUGH
 * this manager (step() calls world.step(queue)). Two event kinds come back:
 *
 * - impact: the projectile's FIRST contact, with impact speed — that's the
 *   splat-vs-place readout input.
 * - settled: the projectile came to REST (Rapier sleep, deterministic), with
 *   its final position — that's the SCORING truth. A topping that hits the
 *   cake and rolls off settles on the ground, and the patron gets nothing.
 *
 * Bodies stay in the world after settling; greybox toppings litter the
 * field, which is correct and funny.
 *
 * core/ law: deterministic, headless. These events are the exact shapes
 * that will one day be broadcast to clients.
 */
import RAPIER from "@dimforge/rapier3d-compat";
import { SHOT_COLLISION_GROUPS } from "./constants";
import type { Vec3 } from "./ballistics";

export const PROJECTILE_RADIUS = 0.3;

/** Landing media are SOFT — frosting, sponge, grass. On first impact the
 * topping keeps only this fraction of its velocity, so shots that reach the
 * cake can actually STAY on it (scoring is final rest position; without
 * absorption everything skids off the back and no order is winnable —
 * measured 2026-07-02). Flight stays a clean parabola; only landing damps. */
export const IMPACT_ABSORPTION = 0.15;

export interface Impact {
  pos: Vec3;
  /** Speed at the tick before contact — the landing energy. */
  speed: number;
  topping: string;
}

export interface Settled {
  /** Final rest position (body center). */
  pos: Vec3;
  topping: string;
}

export interface StepEvents {
  impacts: Impact[];
  settled: Settled[];
}

/** Rest = this many consecutive ticks below the stillness thresholds.
 * Half a second — snappier than Rapier's sleep timer, which made scoring
 * feedback lag seconds behind the topping visibly stopping. */
const REST_TICKS = 30;
const REST_LIN_SPEED = 0.08; // m/s
const REST_ANG_SPEED = 0.3; // rad/s

interface TrackedShot {
  body: RAPIER.RigidBody;
  topping: string;
  lastSpeed: number;
  /** First contact already reported; now waiting for rest. */
  impacted: boolean;
  stillTicks: number;
}

export class ProjectileManager {
  private readonly queue = new RAPIER.EventQueue(true);
  private readonly tracked = new Map<number, TrackedShot>();
  /** Every body ever spawned, in flight or at rest — the client renders these. */
  readonly bodies: Array<{ body: RAPIER.RigidBody; topping: string }> = [];

  spawn(
    world: RAPIER.World,
    origin: Vec3,
    velocity: Vec3,
    topping: string,
  ): RAPIER.RigidBody {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(origin.x, origin.y, origin.z)
        .setLinvel(velocity.x, velocity.y, velocity.z)
        // High angular damping stops landed toppings from rolling forever.
        // NO linear damping: flight must stay a clean parabola — the whole
        // dead-reckoning game depends on repeatable arcs.
        .setAngularDamping(2.0)
        .setCcdEnabled(true),
    );
    const collider = world.createCollider(
      RAPIER.ColliderDesc.ball(PROJECTILE_RADIUS)
        .setRestitution(0.1) // toppings land, they don't bounce
        .setFriction(0.9)
        // Shots never touch bakers (F3, see constants.ts): arcs must land
        // identically in every world, with or without a capsule under them.
        .setCollisionGroups(SHOT_COLLISION_GROUPS)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body,
    );
    this.tracked.set(collider.handle, {
      body,
      topping,
      lastSpeed: 0,
      impacted: false,
      stillTicks: 0,
    });
    this.bodies.push({ body, topping });
    return body;
  }

  /** Step the world one fixed tick; returns impact and settle events. */
  step(world: RAPIER.World): StepEvents {
    for (const shot of this.tracked.values()) {
      if (shot.impacted) continue;
      const v = shot.body.linvel();
      shot.lastSpeed = Math.hypot(v.x, v.y, v.z);
    }
    world.step(this.queue);

    const impacts: Impact[] = [];
    this.queue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      const handle = this.tracked.has(h1) ? h1 : this.tracked.has(h2) ? h2 : null;
      if (handle === null) return;
      const shot = this.tracked.get(handle);
      if (!shot || shot.impacted) return;
      shot.impacted = true;
      const p = shot.body.translation();
      impacts.push({
        pos: { x: p.x, y: p.y, z: p.z },
        speed: shot.lastSpeed,
        topping: shot.topping,
      });
      // The soft landing: bleed off almost all momentum at first contact.
      const v = shot.body.linvel();
      shot.body.setLinvel(
        {
          x: v.x * IMPACT_ABSORPTION,
          y: v.y * IMPACT_ABSORPTION,
          z: v.z * IMPACT_ABSORPTION,
        },
        true,
      );
      const w = shot.body.angvel();
      shot.body.setAngvel(
        {
          x: w.x * IMPACT_ABSORPTION,
          y: w.y * IMPACT_ABSORPTION,
          z: w.z * IMPACT_ABSORPTION,
        },
        true,
      );
    });

    const settled: Settled[] = [];
    for (const [handle, shot] of this.tracked) {
      if (!shot.impacted) continue;
      const v = shot.body.linvel();
      const w = shot.body.angvel();
      const still =
        Math.hypot(v.x, v.y, v.z) < REST_LIN_SPEED &&
        Math.hypot(w.x, w.y, w.z) < REST_ANG_SPEED;
      shot.stillTicks = still ? shot.stillTicks + 1 : 0;
      if (shot.stillTicks < REST_TICKS) continue;
      const p = shot.body.translation();
      settled.push({
        pos: { x: p.x, y: p.y, z: p.z },
        topping: shot.topping,
      });
      this.tracked.delete(handle);
    }
    return { impacts, settled };
  }
}
