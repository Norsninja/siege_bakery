/**
 * Town gates — the physical half of the switch-between-orders law
 * (visionary, 2026-07-07): while an order RUNS, your fort's gate is shut
 * and you work your machine; the gate opens with the linger window, and
 * switching towns is a run through the doorway.
 *
 * The fence is a BAKER-ONLY collider (GATE_COLLISION_GROUPS): shots and
 * grains never interact with it, so the deterministic shot world stays
 * byte-identical on every replica whatever the gates do — which is what
 * lets this live CLIENT-SIDE with zero wire/server changes (baker movement
 * is client-authoritative, plans/02; the trust model is co-op among
 * friends, same tier as poses).
 *
 * THE RULE (one gate, yours): gate i is closed exactly when the order is
 * running AND i is YOUR town AND you are clearly inside it. Consequences:
 * - Penned at home for the round — no midfield wandering, no slab-edge
 *   falls, no cake climbing (the §6 quirk list, answered structurally).
 * - The LOCKOUT case self-heals: caught outside at deal time, your gate
 *   stands open until you're home, then shuts behind you (one-way in).
 * - Foreign forts never seal: you can't reach them from home anyway, and
 *   sealing them traps a mid-crossing baker on the wrong side (the
 *   hysteresis trap the review found). A locked-out wanderer standing in
 *   the far fort is useless but harmless — its controls aren't his
 *   (owner-implicit routing), and the next linger frees him.
 *
 * THE LATCH (measured, first build): closing and staying-closed need
 * DIFFERENT predicates. CLOSE_MARGIN guards only the closing transition —
 * it exceeds the fence half-thickness plus the capsule radius (0.25 +
 * 0.35 = 0.6), so the fence never materializes overlapping the baker.
 * But once closed the gate LATCHES: a baker pressing on his shut gate
 * rests at depth ≈ 0.6, and walking toward the doorway passes through
 * the 0..1m band — re-testing the close predicate there READS HIM AS
 * OUTSIDE and swings the gate open as he approaches (the first build's
 * bug: the pen leaked exactly when leaned on). The latch releases only
 * when the order ends, the assignment changes, or the baker is somehow
 * clearly PAST the plane (depth < 0 — can't happen against a working
 * fence; the valve keeps the lockout self-heal true after any glitch).
 */
import RAPIER from "@dimforge/rapier3d-compat";
import { GATE_HALF_WIDTH, TOWNS, WALL_HEIGHT } from "../core/arena";
import { GATE_COLLISION_GROUPS } from "../core/constants";

const CLOSE_MARGIN = 1.0;

export class TownGates {
  private readonly fences: RAPIER.Collider[];
  /** +1 when the fort interior lies at z > gate.z (town 0), −1 when below
   * (town 1) — the pantry is always deep inside, so it tells us the side. */
  private readonly inward: number[];

  constructor(world: RAPIER.World) {
    this.fences = TOWNS.map((t) => {
      const fence = world.createCollider(
        RAPIER.ColliderDesc.cuboid(GATE_HALF_WIDTH, WALL_HEIGHT / 2, 0.25)
          .setTranslation(t.gate.x, WALL_HEIGHT / 2, t.gate.z)
          .setCollisionGroups(GATE_COLLISION_GROUPS),
      );
      fence.setEnabled(false); // gates start open; update() takes over
      return fence;
    });
    this.inward = TOWNS.map((t) => Math.sign(t.pantry.z - t.gate.z));
  }

  /** How far a position is INSIDE town i's doorway (negative = out in the
   * field). The side walls bound x; depth past the gate plane is the truth. */
  private depthInto(town: number, pos: { z: number }): number {
    return (pos.z - TOWNS[town]!.gate.z) * this.inward[town]!;
  }

  /** Call once per fixed tick, BEFORE Baker.step, so this tick's movement
   * meets the fence state the rules say it should. */
  update(
    orderRunning: boolean,
    yourTown: number,
    bakerPos: { x: number; y: number; z: number },
  ): void {
    for (let i = 0; i < this.fences.length; i++) {
      const fence = this.fences[i]!;
      if (!orderRunning || i !== yourTown) {
        fence.setEnabled(false); // linger window / not your gate: open
        continue;
      }
      const depth = this.depthInto(i, bakerPos);
      if (fence.isEnabled()) {
        // LATCHED shut; the valve reopens only past the plane (see header).
        if (depth < 0) fence.setEnabled(false);
      } else if (depth > CLOSE_MARGIN) {
        fence.setEnabled(true); // home and clear of the doorway: shut it
      }
    }
  }

  /** Is town i's gate currently shut? (The scene shows the portcullis.) */
  isClosed(town: number): boolean {
    return this.fences[town]?.isEnabled() ?? false;
  }
}
