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
  /** The spawn's generation tag, echoed back (see spawn opts). */
  tag: number;
}

export interface Settled {
  /** Final rest position (body center). */
  pos: Vec3;
  topping: string;
  /** The spawn's generation tag, echoed back (see spawn opts). */
  tag: number;
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
  /** Paint-form toppings (frosting, plans/07): the first impact is the
   * whole story — report it, then leave the world. No settle, no litter,
   * no obstacle. */
  consumeOnImpact: boolean;
  /** Caller's generation tag, echoed on this shot's events (checkpoint
   * audit 2026-07-03: the Room tags spawns with its deal counter so a shot
   * fired during one order can never score on the next). Physics ignores it. */
  tag: number;
}

export class ProjectileManager {
  private readonly queue = new RAPIER.EventQueue(true);
  private readonly tracked = new Map<number, TrackedShot>();
  /** Every body still in the world, in flight or at rest — the client
   * renders these. Consumed paint globs leave on impact. */
  readonly bodies: Array<{ body: RAPIER.RigidBody; topping: string }> = [];

  spawn(
    world: RAPIER.World,
    origin: Vec3,
    velocity: Vec3,
    topping: string,
    opts?: { consumeOnImpact?: boolean; tag?: number },
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
      consumeOnImpact: opts?.consumeOnImpact ?? false,
      tag: opts?.tag ?? 0,
    });
    this.bodies.push({ body, topping });
    return body;
  }

  /** Everything at rest RIGHT NOW — the world-sync a late joiner needs
   * (F2, plans/06). In-flight shots are excluded: they were announced by
   * their own `shot` events and a mid-flight snapshot could not rejoin
   * their deterministic arcs. */
  resting(): Array<{ topping: string; pos: Vec3 }> {
    const inFlight = new Set<number>();
    for (const t of this.tracked.values()) inFlight.add(t.body.handle);
    return this.bodies
      .filter((b) => !inFlight.has(b.body.handle))
      .map((b) => {
        const p = b.body.translation();
        return { topping: b.topping, pos: { x: p.x, y: p.y, z: p.z } };
      });
  }

  /** Spawn a topping ALREADY at rest (a late joiner recreating the world):
   * same body and collider as a flown shot — prior settled toppings are
   * OBSTACLES for later shots, so every world must contain them — but
   * untracked: its landing was scored long ago, it reports nothing. */
  spawnAtRest(world: RAPIER.World, pos: Vec3, topping: string): RAPIER.RigidBody {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pos.x, pos.y, pos.z)
        .setAngularDamping(2.0)
        .setCcdEnabled(true),
    );
    world.createCollider(
      RAPIER.ColliderDesc.ball(PROJECTILE_RADIUS)
        .setRestitution(0.1)
        .setFriction(0.9)
        .setCollisionGroups(SHOT_COLLISION_GROUPS),
      body,
    );
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
    const consumed: number[] = []; // collider handles; removed AFTER the drain
    this.queue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      // BOTH sides of the pair may be tracked shots — a glob landing on a
      // still-rolling topping, two lobs kissing mid-air. Each un-impacted
      // side gets its first impact HERE: examining only one handle silently
      // dropped the other's event (checkpoint audit 2026-07-03) — a solid
      // skipped its absorption and caromed at full speed; a paint glob was
      // "consumed" at its SECOND contact and painted the wrong spot.
      for (const handle of [h1, h2]) {
        const shot = this.tracked.get(handle);
        if (!shot || shot.impacted) continue;
        shot.impacted = true;
        const p = shot.body.translation();
        impacts.push({
          pos: { x: p.x, y: p.y, z: p.z },
          speed: shot.lastSpeed,
          topping: shot.topping,
          tag: shot.tag,
        });
        // Paint: the impact IS the landing — no absorption, no settle wait.
        if (shot.consumeOnImpact) {
          consumed.push(handle);
          continue;
        }
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
      }
    });

    for (const handle of consumed) {
      const shot = this.tracked.get(handle)!;
      world.removeRigidBody(shot.body); // colliders go with it
      this.tracked.delete(handle);
      const i = this.bodies.findIndex((b) => b.body === shot.body);
      if (i >= 0) this.bodies.splice(i, 1);
    }

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
        tag: shot.tag,
      });
      this.tracked.delete(handle);
    }
    return { impacts, settled };
  }
}
