/**
 * The baker — first-person character movement as deterministic sim state.
 *
 * Lives in core/ because the authoritative server must run the exact same
 * movement: a Baker consumes a plain serializable BakerInput each fixed tick
 * and moves a kinematic capsule through Rapier's KinematicCharacterController.
 * The client's job is only to SAMPLE input (keys, mouse yaw) and RENDER the
 * resulting position — never to compute movement itself.
 *
 * Tuning law (plans/01): travel time is the pressure currency of the whole
 * design. Crossing the arena must take ~4–6 seconds. ARENA_CROSSING_M with
 * the two speeds below brackets exactly that window; baker.test.ts pins it.
 */
import RAPIER from "@dimforge/rapier3d-compat";
import { BAKER_COLLISION_GROUPS, FIXED_DT } from "./constants";

/** Pantry-to-catapult crossing distance the speeds are tuned against. */
export const ARENA_CROSSING_M = 24;
export const WALK_SPEED = 4.0; // m/s → 24m in 6.0s
export const SPRINT_SPEED = 6.0; // m/s → 24m in 4.0s

/** Capsule: total height 2*(halfHeight + radius) = 1.7m — a tiny baker. */
export const CAPSULE_HALF_HEIGHT = 0.5;
export const CAPSULE_RADIUS = 0.35;
/** Capsule-center resting height above flat ground. */
export const STAND_CENTER_Y = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS;
/** Camera eye offset above the capsule center (client uses this). */
export const EYE_HEIGHT_OFFSET = 0.65;

const GRAVITY_Y = -9.81;

/**
 * One tick of player intent. Plain data, no methods — this is what the
 * client will eventually send over the wire, so keep it flat and small.
 */
export interface BakerInput {
  /** -1..1; +1 walks toward facing direction. */
  forward: number;
  /** -1..1; +1 strafes right. */
  strafe: number;
  sprint: boolean;
  /** Facing, radians. 0 faces -Z (three.js camera convention). */
  yaw: number;
}

export const IDLE_INPUT: BakerInput = {
  forward: 0,
  strafe: 0,
  sprint: false,
  yaw: 0,
};

export class Baker {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  private readonly controller: RAPIER.KinematicCharacterController;
  private verticalVelocity = 0;
  private grounded = false;

  constructor(
    world: RAPIER.World,
    spawn: { x: number; y: number; z: number },
  ) {
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        spawn.x,
        spawn.y,
        spawn.z,
      ),
    );
    this.collider = world.createCollider(
      // Bakers never touch shots (F3, see constants.ts) — the client's
      // local capsule must not contaminate the deterministic arcs.
      RAPIER.ColliderDesc.capsule(CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS)
        .setCollisionGroups(BAKER_COLLISION_GROUPS),
      this.body,
    );
    this.controller = world.createCharacterController(0.01);
    this.controller.setUp({ x: 0, y: 1, z: 0 });
    // Step over pantry-shelf lips and low props without jumping.
    this.controller.enableAutostep(0.4, 0.2, true);
    this.controller.enableSnapToGround(0.4);
  }

  /**
   * Advance one fixed 60Hz tick. Call BEFORE world.step() so the kinematic
   * body's next translation is registered for this step.
   */
  step(input: BakerInput): void {
    // Local stick → world-space horizontal direction, normalized so
    // diagonals don't outrun straight lines.
    let dx = 0;
    let dz = 0;
    const mag = Math.hypot(input.strafe, input.forward);
    if (mag > 1e-6) {
      const scale = Math.min(mag, 1) / mag;
      const s = input.strafe * scale;
      const f = input.forward * scale;
      const sin = Math.sin(input.yaw);
      const cos = Math.cos(input.yaw);
      // yaw 0 faces -Z: forward = (-sin, 0, -cos), right = (cos, 0, -sin).
      dx = f * -sin + s * cos;
      dz = f * -cos + s * -sin;
    }
    const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;

    // Gravity: zero out on ground (the constant small downward pull below
    // keeps snap-to-ground engaged), accumulate in the air.
    if (this.grounded && this.verticalVelocity < 0) this.verticalVelocity = 0;
    this.verticalVelocity += GRAVITY_Y * FIXED_DT;

    const desired = {
      x: dx * speed * FIXED_DT,
      y: this.verticalVelocity * FIXED_DT,
      z: dz * speed * FIXED_DT,
    };
    this.controller.computeColliderMovement(this.collider, desired);
    this.grounded = this.controller.computedGrounded();
    const move = this.controller.computedMovement();
    const p = this.body.translation();
    this.body.setNextKinematicTranslation({
      x: p.x + move.x,
      y: p.y + move.y,
      z: p.z + move.z,
    });
  }

  position(): { x: number; y: number; z: number } {
    const p = this.body.translation();
    return { x: p.x, y: p.y, z: p.z };
  }

  isGrounded(): boolean {
    return this.grounded;
  }
}
