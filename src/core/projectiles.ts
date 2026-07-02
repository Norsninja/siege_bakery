/**
 * Projectile tracking — dynamic toppings in flight, first-impact detection.
 *
 * Owns the Rapier EventQueue, so a world with projectiles is stepped THROUGH
 * this manager (step() calls world.step(queue)). Reports each projectile's
 * FIRST contact with impact speed — that's the splat-vs-place input — then
 * stops tracking it; the body stays in the world and comes to rest wherever
 * it lands (greybox toppings litter the field, which is correct and funny).
 *
 * core/ law: deterministic, headless. The impact list this returns is the
 * exact event shape that will one day be broadcast to clients.
 */
import RAPIER from "@dimforge/rapier3d-compat";
import type { Vec3 } from "./ballistics";

export const PROJECTILE_RADIUS = 0.3;

export interface Impact {
  pos: Vec3;
  /** Speed at the tick before contact — the landing energy. */
  speed: number;
  topping: string;
}

interface LiveShot {
  body: RAPIER.RigidBody;
  topping: string;
  lastSpeed: number;
}

export class ProjectileManager {
  private readonly queue = new RAPIER.EventQueue(true);
  private readonly live = new Map<number, LiveShot>();
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
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body,
    );
    this.live.set(collider.handle, { body, topping, lastSpeed: 0 });
    this.bodies.push({ body, topping });
    return body;
  }

  /** Step the world one fixed tick; returns any first impacts that landed. */
  step(world: RAPIER.World): Impact[] {
    for (const shot of this.live.values()) {
      const v = shot.body.linvel();
      shot.lastSpeed = Math.hypot(v.x, v.y, v.z);
    }
    world.step(this.queue);
    const impacts: Impact[] = [];
    this.queue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      const handle = this.live.has(h1) ? h1 : this.live.has(h2) ? h2 : null;
      if (handle === null) return;
      const shot = this.live.get(handle);
      if (!shot) return;
      const p = shot.body.translation();
      impacts.push({
        pos: { x: p.x, y: p.y, z: p.z },
        speed: shot.lastSpeed,
        topping: shot.topping,
      });
      this.live.delete(handle);
    });
    return impacts;
  }
}
