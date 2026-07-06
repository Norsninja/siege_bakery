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
 * THE FREEZE LAW (topping-physics discussion, 2026-07-04): a settled solid
 * FREEZES — its body turns Fixed, part of the cake (or floor) it rests on.
 * Frozen solids cannot creep: pre-law, a glob passing near a settled
 * sprinkle left it drifting 0.6m off its paint over seconds — displacement
 * nobody caused, the un-funny kind (research/07: failure must be traceable
 * to player input). A frozen solid WAKES back to dynamic when any moving
 * shot comes within WAKE_RADIUS, so a real hit still knocks it properly —
 * knockability is the game's only eraser (a decoy crown can only be shot
 * off) and stays. Woken solids re-settle silently and re-freeze; the
 * ledger's live-truth re-read still sees every honest displacement. The
 * wake rule reads only deterministic body positions, so replicas agree
 * without any new wire traffic. (This is also what lets a future turntable
 * carry settled toppings: frozen = attached to the world frame.)
 *
 * core/ law: deterministic, headless. These events are the exact shapes
 * that will one day be broadcast to clients.
 */
import RAPIER from "@dimforge/rapier3d-compat";
import { GRAIN_COLLISION_GROUPS, SHOT_COLLISION_GROUPS } from "./constants";
import { cakeSurface, distanceToCake, isOnCake } from "./arena";
import { mulberry32 } from "./rng";
import type { Vec3 } from "./ballistics";

export const PROJECTILE_RADIUS = 0.3;

/** A burst payload grain's body — tiny capsule, chunky-cute (plans/10:
 * true sprinkle scale is physics-unstable). */
export interface GrainBody {
  radius: number;
  halfHeight: number;
  restitution: number;
}

/** THE CLUSTER AIRBURST (plans/10 §2, the 2D sprinkle idea made 3D): a
 * carrier with a burst spec flies as a normal shot, then POPS — at
 * `proximityM` from the tier stack (the proximity fuse: analytic, readable,
 * cannot pop mid-arc on a wild shot) or at first impact (the fallback: a
 * clean miss floor-pops, honest visible mess). Grains inherit the carrier's
 * velocity plus a SEEDED jitter, so replicas replay identical bursts from
 * the shot event's seed and landing-energy texture survives with no extra
 * rule (hot = wide debris). The pantry table (game/toppings.ts) carries
 * these specs per topping; core just executes them. */
export interface BurstSpec {
  /** Fuse distance from the tier stack (m). */
  proximityM: number;
  /** Payload size — THE density knob (the visionary's eye picks it). */
  grains: number;
  /** Seeded velocity jitter magnitude per axis (m/s). */
  jitterSpeed: number;
  /** Grains spawn in a seeded shell this size around the burst point —
   * co-spawning a payload at one point is a solver explosion. */
  scatterRadius: number;
  grain: GrainBody;
}

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
  /** A burst payload grain landing — QUIET on the client (no flash, no
   * marker: 40 grains must not be 40 toasts), nothing for the Room (grains
   * score at rest like any solid). */
  grain?: boolean;
}

/** A carrier popped. The carrier emits NO impact event (the pop replaces
 * its landing); grains carry the story from here. */
export interface Burst {
  pos: Vec3;
  topping: string;
  tag: number;
  /** The grain bodies just spawned — the client dresses them in meshes;
   * the Room ignores them (they report their own settles). */
  grains: RAPIER.RigidBody[];
}

export interface Settled {
  /** Final rest position (body center). */
  pos: Vec3;
  topping: string;
  /** The spawn's generation tag, echoed back (see spawn opts). */
  tag: number;
  /** The body, still live in the world: litter can be re-mobilized by a
   * later shot, and scoring truth follows the bodies as they lie NOW
   * (live-truth ledger, checkpoint audit 2026-07-03). */
  body: RAPIER.RigidBody;
}

/** THE CONVERSION LAW (plans/10 §8): a grain that GRIPS the dessert —
 * first impact ON the skin AND on wet paint — stops being a physics
 * object and becomes dessert surface data. The body is gone by the time
 * this event is read; the record is the skin point (scoring truth —
 * tierOf works on it) and the outward normal (the client perches the
 * sprinkle visual along it, atop the frosting blob). Stuck records live
 * until a later splat BURIES them or the dessert leaves — sprinkle
 * knockability is deliberately retired with the freeze-in-place
 * mechanism (the §8 law change). */
export interface Stuck {
  /** The grip point ON the tier stack's skin. */
  pos: Vec3;
  /** Outward surface normal at the grip. */
  normal: Vec3;
  topping: string;
  tag: number;
}

export interface StepEvents {
  impacts: Impact[];
  settled: Settled[];
  bursts: Burst[];
  stuck: Stuck[];
}

/** Rest = this many consecutive ticks below the stillness thresholds.
 * Half a second — snappier than Rapier's sleep timer, which made scoring
 * feedback lag seconds behind the topping visibly stopping. */
const REST_TICKS = 30;
const REST_LIN_SPEED = 0.08; // m/s
const REST_ANG_SPEED = 0.3; // rad/s
/** Grain rest is judged at CONFETTI scale (measured 2026-07-05): solver
 * contact jitter on a 0.045m capsule sustains ~0.2–1 rad/s forever — at
 * the ball thresholds grains hovered unfrozen for minutes. 2 rad/s on a
 * grain is 0.09 m/s of surface motion, visually still; the FREEZE then
 * guarantees zero further creep — freezing early is exactly the law's
 * mercy, and wake-on-proximity keeps knocks honest. */
const GRAIN_REST_LIN_SPEED = 0.15; // m/s
const GRAIN_REST_ANG_SPEED = 2.0; // rad/s

const restLin = (grain: boolean): number =>
  grain ? GRAIN_REST_LIN_SPEED : REST_LIN_SPEED;
const restAng = (grain: boolean): number =>
  grain ? GRAIN_REST_ANG_SPEED : REST_ANG_SPEED;

/** A moving shot within this distance of a frozen solid wakes it (freeze
 * law above). Must beat closest-approach-per-tick: max launch speed today
 * is 16 m/s (ballistics: 4 + 1.5 × 8 clicks) = 0.27m per tick, plus two
 * ball radii = 0.87m closing. RE-CHECK when TENSION_MAX_CLICKS or launch
 * speeds move (the power-extension study will move them). */
export const WAKE_RADIUS = 1.0;

/** The GRIP gate (conversion law, plans/10 §8): a grain converts only if
 * its impact center is this close to the tier stack's skin. A grain
 * touching a wall or top rides 0.045–0.1m off the skin (capsule side to
 * end); a floor impact 0.13m from the wall foot — the measured crescent
 * that motivated the gate: 23/40 grains frozen on the floor forever —
 * NEVER grips, however close the painted wall base is. Geometry law, so
 * it lives HERE at the one stick site, not in the two stickyPaint
 * bindings (Room and client must be incapable of drifting apart). */
export const GRIP_SKIN_M = 0.12;

/** Grains damp HARD, both axes (measured 2026-07-05: Rapier has no rolling
 * resistance, so an undamped landed capsule rolls forever — angular damping
 * alone wasn't enough either, because ground friction converts undamped
 * LINEAR slide back into spin at a terminal ~1.6 rad/s). Confetti has air
 * drag; the flutter is the look, and stopping fast is the perf model:
 * settle → freeze → free. The parabola law (no linear damping) is for
 * AIMED shots — dead-reckoned arcs; grains are scatter, not aim. */
const GRAIN_ANGULAR_DAMPING = 12.0;
const GRAIN_LINEAR_DAMPING = 0.8;

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
  /** Cluster carrier: pops at the fuse (or at impact), never lands itself. */
  burst?: BurstSpec;
  /** The shot event's seed S — drives the burst's scatter, identically on
   * every replica. Meaningless without a burst spec. */
  seed: number;
  /** A payload grain (spawned by a burst, not a lever pull). */
  grain: boolean;
}

export class ProjectileManager {
  private readonly queue = new RAPIER.EventQueue(true);
  private readonly tracked = new Map<number, TrackedShot>();
  /** Settled solids, frozen Fixed (freeze law) — keyed by body handle.
   * The grain flag rides along: rest is judged at each body's scale. */
  private readonly frozen = new Map<
    number,
    { body: RAPIER.RigidBody; grain: boolean }
  >();
  /** Previously-settled solids woken by a nearby shot, waiting to re-freeze.
   * Their settle was scored long ago: re-freezing emits NO event — the
   * Room's ledger re-reads their positions live either way. */
  private readonly waking = new Map<
    number,
    { body: RAPIER.RigidBody; stillTicks: number; grain: boolean }
  >();
  /** Every body still in the world, in flight or at rest — the client
   * renders these. Consumed paint globs leave on impact; gripped grains
   * leave at conversion (plans/10 §8). */
  readonly bodies: Array<{ body: RAPIER.RigidBody; topping: string }> = [];
  /** The paint oracle of the CONVERSION LAW (plans/10 §8): the owner
   * answers "is there wet paint here?" — the Room binds its
   * FrostingField, the client binds its local twin. A GRAIN whose first
   * impact lands ON the dessert skin (GRIP_SKIN_M) AND on paint CONVERTS
   * into a stuck surface record instead of bouncing off. Both fields
   * derive from the same shot events, so replicas agree; this is the one
   * place the paint field feeds back into physics — cross-engine it
   * inherits the census grid's one-ULP caveat (frosting.ts header),
   * boundary cases measure-zero and litter-visual only. */
  stickyPaint: ((pos: Vec3) => boolean) | null = null;

  spawn(
    world: RAPIER.World,
    origin: Vec3,
    velocity: Vec3,
    topping: string,
    opts?: { consumeOnImpact?: boolean; tag?: number; burst?: BurstSpec; seed?: number },
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
      ...(opts?.burst ? { burst: opts.burst } : {}),
      seed: opts?.seed ?? 0,
      grain: false,
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
   * untracked: its landing was scored long ago, it reports nothing. It
   * enters through the WAKING path (not directly frozen): a snapshot can
   * catch a shoved body mid-roll, and spawning that Fixed would freeze it
   * floating — dynamic-then-refreeze settles it honestly first. */
  spawnAtRest(
    world: RAPIER.World,
    pos: Vec3,
    topping: string,
    grain?: GrainBody,
  ): RAPIER.RigidBody {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pos.x, pos.y, pos.z)
        .setLinearDamping(grain ? GRAIN_LINEAR_DAMPING : 0)
        .setAngularDamping(grain ? GRAIN_ANGULAR_DAMPING : 2.0)
        .setCcdEnabled(true),
    );
    world.createCollider(
      // A settled burst topping IS its grain (carriers never settle) —
      // recreating it as the 0.3 carrier ball would litter giant sprinkles.
      (grain
        ? RAPIER.ColliderDesc.capsule(grain.halfHeight, grain.radius)
        : RAPIER.ColliderDesc.ball(PROJECTILE_RADIUS)
      )
        .setRestitution(grain ? grain.restitution : 0.1)
        .setFriction(0.9)
        .setCollisionGroups(grain ? GRAIN_COLLISION_GROUPS : SHOT_COLLISION_GROUPS),
      body,
    );
    this.bodies.push({ body, topping });
    this.waking.set(body.handle, { body, stillTicks: 0, grain: !!grain });
    return body;
  }

  /** THE FRESH-CAKE LAW (2026-07-05, replacing the "Giant licks" fiction):
   * between orders the finished dessert is GONE — eaten or taken away —
   * and a naked cake wheels out. Every BODY resting on its tiers leaves
   * with it (stuck sprinkles are records, not bodies — their owners clear
   * them alongside this call, plans/10 §8); floor litter is the CREW's
   * mess, not the dessert's, and stays. In-flight shots keep flying (a
   * stale lob still lands, still scores nothing — audit AUD-4). Both
   * replicas call this on the fresh deal and remove the identical set —
   * body positions are the shared truth. Returns how many left. */
  clearCakeSolids(world: RAPIER.World): number {
    const inFlight = new Set<number>();
    for (const t of this.tracked.values()) inFlight.add(t.body.handle);
    let removed = 0;
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const b = this.bodies[i]!;
      if (inFlight.has(b.body.handle)) continue;
      const p = b.body.translation();
      if (!isOnCake({ x: p.x, y: p.y, z: p.z })) continue;
      this.frozen.delete(b.body.handle);
      this.waking.delete(b.body.handle);
      world.removeRigidBody(b.body);
      this.bodies.splice(i, 1);
      removed++;
    }
    return removed;
  }

  /** Step the world one fixed tick; returns impact and settle events. */
  step(world: RAPIER.World): StepEvents {
    // The wake pass (freeze law) — BEFORE the physics step, so a frozen
    // solid is dynamic again by the time anything can touch it. Movers are
    // every live shot plus any woken solid still actually moving (a shoved
    // cherry must wake the sprinkle it rolls into — but a woken-yet-still
    // solid must NOT wake its frozen neighbors, or a passing shot would
    // cascade-wake whole piles forever).
    if (this.frozen.size > 0) {
      const movers: Array<{ body: RAPIER.RigidBody; grain: boolean }> = [];
      for (const shot of this.tracked.values())
        movers.push({ body: shot.body, grain: shot.grain });
      for (const w of this.waking.values()) {
        const v = w.body.linvel();
        if (Math.hypot(v.x, v.y, v.z) >= restLin(w.grain))
          movers.push({ body: w.body, grain: w.grain });
      }
      const r2 = WAKE_RADIUS * WAKE_RADIUS;
      for (const mover of movers) {
        const m = mover.body.translation();
        for (const [handle, f] of this.frozen) {
          // Impossible pairs never wake (cogency review 2026-07-05): grains
          // don't collide with grains (constants.ts), so a grain mover
          // waking a frozen grain is displacement nobody could cause —
          // measured 39/40 pile grains cycling in waking forever.
          if (mover.grain && f.grain) continue;
          const p = f.body.translation();
          const dx = p.x - m.x;
          const dy = p.y - m.y;
          const dz = p.z - m.z;
          if (dx * dx + dy * dy + dz * dz > r2) continue;
          f.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
          this.frozen.delete(handle);
          this.waking.set(handle, { body: f.body, stillTicks: 0, grain: f.grain });
        }
      }
    }

    // The proximity fuse (plans/10 §2) — BEFORE the step, alongside the wake
    // pass: a carrier whose last-tick position closed within the fuse pops
    // NOW, and its grains fly this very tick. Analytic distance to the tier
    // stack — readable, deterministic, cannot pop mid-arc on a wild shot.
    const bursts: Burst[] = [];
    for (const [handle, shot] of this.tracked) {
      if (!shot.burst || shot.impacted) continue;
      const p = shot.body.translation();
      if (distanceToCake(p) > shot.burst.proximityM) continue;
      this.burstNow(world, handle, shot, bursts);
    }

    for (const shot of this.tracked.values()) {
      if (shot.impacted) continue;
      const v = shot.body.linvel();
      shot.lastSpeed = Math.hypot(v.x, v.y, v.z);
    }
    world.step(this.queue);

    const impacts: Impact[] = [];
    const settled: Settled[] = [];
    const stuck: Stuck[] = [];
    const consumed: number[] = []; // collider handles; removed AFTER the drain
    const impactBursts: number[] = []; // carriers that hit before the fuse
    const gripped: number[] = []; // grains converting (the conversion law)
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
        // A carrier hitting before its fuse (the clean miss): the impact
        // BURST replaces the impact event — floor pop, honest visible mess.
        // Bodies can't spawn mid-drain; collected and popped after.
        if (shot.burst) {
          shot.impacted = true;
          impactBursts.push(handle);
          continue;
        }
        const p = shot.body.translation();
        // THE CONVERSION (plans/10 §8): a grain gripping the dessert —
        // impact ON the skin (GRIP_SKIN_M gate) AND on wet paint — never
        // lands as a body; it converts to surface data after the drain.
        // The grip REPLACES the impact event, as the pop replaces the
        // carrier's. Floor impacts beside painted wall bases fail the
        // skin gate and litter honestly (the crescent, killed here).
        if (
          shot.grain &&
          this.stickyPaint !== null &&
          distanceToCake({ x: p.x, y: p.y, z: p.z }) <= GRIP_SKIN_M &&
          this.stickyPaint({ x: p.x, y: p.y, z: p.z })
        ) {
          shot.impacted = true;
          gripped.push(handle);
          continue;
        }
        shot.impacted = true;
        impacts.push({
          pos: { x: p.x, y: p.y, z: p.z },
          speed: shot.lastSpeed,
          topping: shot.topping,
          tag: shot.tag,
          ...(shot.grain ? { grain: true } : {}),
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

    for (const handle of impactBursts) {
      const shot = this.tracked.get(handle);
      if (shot) this.burstNow(world, handle, shot, bursts);
    }

    // Gripped grains CONVERT (plans/10 §8): the body leaves the world;
    // the record — skin point + outward normal — is dessert surface data
    // from here. No settle, no freeze, no litter; it un-exists physically
    // and lives as a ledger entry until buried or the dessert leaves.
    for (const handle of gripped) {
      const shot = this.tracked.get(handle);
      if (!shot) continue;
      const p = shot.body.translation();
      const surf = cakeSurface({ x: p.x, y: p.y, z: p.z });
      world.removeRigidBody(shot.body);
      this.tracked.delete(handle);
      const i = this.bodies.findIndex((b) => b.body === shot.body);
      if (i >= 0) this.bodies.splice(i, 1);
      stuck.push({
        pos: surf.point,
        normal: surf.normal,
        topping: shot.topping,
        tag: shot.tag,
      });
    }

    for (const [handle, shot] of this.tracked) {
      if (!shot.impacted) continue;
      const v = shot.body.linvel();
      const w = shot.body.angvel();
      const still =
        Math.hypot(v.x, v.y, v.z) < restLin(shot.grain) &&
        Math.hypot(w.x, w.y, w.z) < restAng(shot.grain);
      shot.stillTicks = still ? shot.stillTicks + 1 : 0;
      if (shot.stillTicks < REST_TICKS) continue;
      const p = shot.body.translation();
      settled.push({
        pos: { x: p.x, y: p.y, z: p.z },
        topping: shot.topping,
        tag: shot.tag,
        body: shot.body,
      });
      this.tracked.delete(handle);
      // The freeze (freeze law): the scored solid becomes part of whatever
      // it rests on. It cannot creep; a nearby shot wakes it back.
      shot.body.setBodyType(RAPIER.RigidBodyType.Fixed, false);
      this.frozen.set(shot.body.handle, { body: shot.body, grain: shot.grain });
    }

    // Re-freeze woken solids that have come back to rest. Silent: their
    // settle was scored when they first landed; the ledger follows their
    // bodies live, so a re-frozen position is already the scoring truth.
    for (const [handle, w] of this.waking) {
      const v = w.body.linvel();
      const av = w.body.angvel();
      const still =
        Math.hypot(v.x, v.y, v.z) < restLin(w.grain) &&
        Math.hypot(av.x, av.y, av.z) < restAng(w.grain);
      w.stillTicks = still ? w.stillTicks + 1 : 0;
      if (w.stillTicks < REST_TICKS) continue;
      w.body.setBodyType(RAPIER.RigidBodyType.Fixed, false);
      this.waking.delete(handle);
      this.frozen.set(handle, { body: w.body, grain: w.grain });
    }
    return { impacts, settled, bursts, stuck };
  }

  /** Pop a carrier: spawn its seeded payload, remove the carrier, report
   * the burst. Grains are ordinary tracked shots from here — they impact
   * (quietly), settle, ledger, FREEZE (the freeze law is what makes grain
   * counts affordable), wake, get knocked. Deterministic: everything below
   * flows from mulberry32(seed) and the carrier's body state, so every
   * replica pops the identical burst (seed S rides the shot event). */
  private burstNow(
    world: RAPIER.World,
    carrierHandle: number,
    shot: TrackedShot,
    out: Burst[],
  ): void {
    const spec = shot.burst!;
    const p = shot.body.translation();
    const v = shot.body.linvel();
    const rng = mulberry32(shot.seed);
    const grains: RAPIER.RigidBody[] = [];
    for (let i = 0; i < spec.grains; i++) {
      // A seeded direction (normalized cube sample — cheap, deterministic,
      // visually fine for confetti) at a seeded shell distance, plus a
      // seeded per-axis velocity jitter on top of the carrier's velocity.
      const dx = rng() * 2 - 1;
      const dy = rng() * 2 - 1;
      const dz = rng() * 2 - 1;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const shell = spec.scatterRadius * (0.3 + 0.7 * rng());
      const jx = (rng() * 2 - 1) * spec.jitterSpeed;
      const jy = (rng() * 2 - 1) * spec.jitterSpeed;
      const jz = (rng() * 2 - 1) * spec.jitterSpeed;
      // Floor clamp: an impact-fallback pop happens AT ground contact, and a
      // shell sample below the surface would depenetrate unpredictably (or
      // tunnel). Deterministic max(), same on every replica.
      const gy = Math.max(
        p.y + (dy / len) * shell,
        spec.grain.radius + spec.grain.halfHeight + 0.01,
      );
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(p.x + (dx / len) * shell, gy, p.z + (dz / len) * shell)
          .setLinvel(v.x + jx, v.y + jy, v.z + jz)
          .setLinearDamping(GRAIN_LINEAR_DAMPING)
          .setAngularDamping(GRAIN_ANGULAR_DAMPING)
          .setCcdEnabled(true),
      );
      const collider = world.createCollider(
        RAPIER.ColliderDesc.capsule(spec.grain.halfHeight, spec.grain.radius)
          .setRestitution(spec.grain.restitution)
          .setFriction(0.9)
          .setCollisionGroups(GRAIN_COLLISION_GROUPS)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
        body,
      );
      this.tracked.set(collider.handle, {
        body,
        topping: shot.topping,
        lastSpeed: 0,
        impacted: false,
        stillTicks: 0,
        consumeOnImpact: false,
        tag: shot.tag, // stale bursts litter and score nothing, like any shot
        seed: 0,
        grain: true,
      });
      this.bodies.push({ body, topping: shot.topping });
      grains.push(body);
    }
    // The carrier ceases to exist — no impact, no settle, no litter.
    world.removeRigidBody(shot.body);
    this.tracked.delete(carrierHandle);
    const i = this.bodies.findIndex((b) => b.body === shot.body);
    if (i >= 0) this.bodies.splice(i, 1);
    out.push({
      pos: { x: p.x, y: p.y, z: p.z },
      topping: shot.topping,
      tag: shot.tag,
      grains,
    });
  }
}
