/**
 * The wire protocol — every message that crosses a transport, and the
 * merge law for many hands on one machine. game/ law: pure data, imports
 * core/ only (types).
 *
 * The client ALWAYS speaks this protocol, whether the room is across the
 * internet (WebSocket) or in-process (loopback, solo). Keep messages flat,
 * small, JSON-friendly.
 */
import type { MachineIntent, CatapultState } from "./catapult";
import type { Judgment, RequirementCheck } from "./judgment";
import type { OrderState } from "./order";

export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface PlayerPose extends Pose {
  id: number;
}

/** A topping at rest, as the welcome snapshot carries it (F2, plans/06):
 * late joiners must recreate the SAME obstacle set — prior settled
 * toppings shape later shots' landings, this is determinism, not décor. */
export interface RestingTopping {
  topping: string;
  x: number;
  y: number;
  z: number;
}

// --- client → server ---
export type ClientMsg =
  | { t: "hello"; name: string }
  | { t: "pose"; pose: Pose }
  /** Hold state on the machine, sent on CHANGE (not per tick). */
  | { t: "op"; turn: -1 | 0 | 1; screw: -1 | 0 | 1; crank: boolean }
  /** Edges: consumed by the room exactly once. */
  | { t: "lever" }
  | { t: "load"; topping: string };

// --- server → client ---
export type ServerMsg =
  | {
      t: "welcome";
      id: number;
      machine: CatapultState;
      crankTicks: number;
      screwTicks: number;
      order: OrderState;
      checks: RequirementCheck[];
      poses: PlayerPose[];
      /** The world as it lies: every settled topping (F2 — refresh and
       * late join recreate the same litter and the same obstacles). */
      toppings: RestingTopping[];
      /** The frosting field as it lies: coats per sample point (plans/07).
       * The one place a surface ever crosses the wire — in play, paint is
       * recomputed from shot events (sync-shots-not-surfaces). ACCEPTED
       * GAP (audit 2026-07-03): a glob IN FLIGHT at join time is not
       * carried (its shot event predates the joiner), so the joiner's
       * local field misses that one splat until the next fresh deal —
       * visual only; scoring truth is the Room's and arrives in checks. */
      frosting: number[];
      /** Present exactly when the order is ENDED (the 10s banner linger):
       * a joiner/refresher mid-banner needs the verdict or a WON order
       * renders as the sad gate-1 loss (checkpoint audit 2026-07-03). */
      judgment?: Judgment;
    }
  | { t: "join"; id: number; name: string }
  | { t: "leave"; id: number }
  | { t: "poses"; poses: PlayerPose[] }
  | { t: "machine"; state: CatapultState; crankTicks: number; screwTicks: number }
  /** Fire! Every receiver (and the room itself) spawns this projectile
   * locally — deterministic ballistics make all copies land identically.
   * This is sync-shots-not-surfaces. */
  | {
      t: "shot";
      topping: string;
      traverseDeg: number;
      tiltNotch: number;
      tensionClicks: number;
    }
  /** Authoritative scoring: a topping came to rest. The checklist rides
   * along — the client has no settled-toppings ledger of its own. */
  | {
      t: "scored";
      topping: string;
      onCake: boolean;
      order: OrderState;
      checks: RequirementCheck[];
    }
  /** `judgment` rides along exactly when this message ENDS the order —
   * the verdict the banner renders (delighted/refused/hungry). `fresh`
   * rides along exactly when the room DEALS anew: the Giant licked the
   * cake clean, clients clear their local frosting (plans/07). */
  | {
      t: "order";
      order: OrderState;
      checks: RequirementCheck[];
      judgment?: Judgment;
      fresh?: true;
    }
  /** The Patron spoke. Any rows/clock he changed follow in an `order`
   * message; this is the voice. `seq` marks distinct utterances. */
  | { t: "patron"; text: string; seq: number };

/** One player's standing hold on the machine. */
export interface HeldOp {
  turn: -1 | 0 | 1;
  screw: -1 | 0 | 1;
  crank: boolean;
}

export const IDLE_OP: HeldOp = { turn: 0, screw: 0, crank: false };

/**
 * Many hands, one machine: merge every player's holds and queued edges into
 * the single intent tickMachine consumes. Opposite turns (and opposite
 * screwing) cancel; two people cranking is still one ratchet (it's the
 * same winch); any lever releases; first queued topping loads. Chaos is a
 * feature, but the machine is honest.
 */
export function mergeIntents(
  held: HeldOp[],
  leverPulls: number,
  loads: string[],
): MachineIntent {
  let turn = 0;
  let screw = 0;
  let crank = false;
  for (const h of held) {
    turn += h.turn;
    screw += h.screw;
    crank = crank || h.crank;
  }
  return {
    turn: turn > 0 ? 1 : turn < 0 ? -1 : 0,
    screw: screw > 0 ? 1 : screw < 0 ? -1 : 0,
    crank,
    pullLever: leverPulls > 0,
    load: loads[0] ?? null,
  };
}
