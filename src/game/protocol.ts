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

/** A stuck sprinkle record, as the welcome snapshot carries it (the
 * conversion law, plans/10 §8): grip point on the dessert skin, the outward
 * normal the client perches the visual along, AND the coats it gripped ON.
 * NOT a body — never an obstacle; in play these derive from shot events on
 * every replica (sync-shots-not-surfaces), the wire form is for late joiners
 * only. `coats` is the GRIP-TIME coat level (2026-07-06): the perch height is
 * FIXED at the blob the sprinkle stuck to — a joiner must NOT re-measure the
 * current (possibly-grown) blob and float the sprinkle up (there is no wizard
 * raising sprinkles: a sprinkle is on top at its fixed height, or it was
 * buried and is gone). The complete record travels, nothing is re-derived. */
export interface StuckTopping {
  topping: string;
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  coats: number;
}

// --- client → server ---
export type ClientMsg =
  | { t: "hello"; name: string }
  | { t: "pose"; pose: Pose }
  /** Hold state on the machine, sent on CHANGE (not per tick). NOTE
   * (towns, plans/11 §4): op/lever/load carry NO town — routing is
   * OWNER-IMPLICIT; the server derives the machine from the sender's
   * assigned town and never trusts a client-supplied one. */
  | { t: "op"; turn: -1 | 0 | 1; screw: -1 | 0 | 1; crank: boolean }
  /** Edges: consumed by the room exactly once. */
  | { t: "lever" }
  | { t: "load"; topping: string }
  /** DEV STAND-IN for the fork-2 shop purchase (plans/11 §1): activates
   * the dormant second town. An INPUT, not out-of-band state — it rides
   * the message stream so headless replicas replay it identically, and
   * it works over the net for the dev-toggle friend test. Idempotent.
   * The real purchase (purse + eligibility gate) replaces this handler
   * in fork 2; until then the trust model is plans/02 co-op-among-
   * friends, same as client-authoritative poses. */
  | { t: "unlockTown2" }
  /** The split MECHANISM (plans/11 §5, DECISION 2): pick which town you
   * crew for the NEXT order. Honored only while the order is NOT running
   * (a running order locks you in — you committed); the default is
   * always "stay where you are" — the system never moves a player. The
   * milestone offer/preview/all-confirm CEREMONY is fork 2; this is the
   * plumbing it will drive. */
  | { t: "pickTown"; town: number };

/** One town's machine as the wire carries it (welcome; the `machine`
 * broadcast is the same trio flattened + its town index). */
export interface TownMachine {
  machine: CatapultState;
  crankTicks: number;
  screwTicks: number;
}

// --- server → client ---
export type ServerMsg =
  | {
      t: "welcome";
      id: number;
      /** Every ACTIVE town's machine, indexed by town (plans/11 §4) —
       * length 1 until the second town is unlocked/purchased. */
      machines: TownMachine[];
      /** The town YOU crew (assigned state, default 0) — the client
       * spawns and orients at TOWNS[yourTown] (plans/11 §10 step 8). */
      yourTown: number;
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
      /** Stuck sprinkles as they lie (conversion law, plans/10 §8) —
       * surface records, rendered perched on the frosting; cleared with
       * the fresh cake. */
      stuck: StuckTopping[];
      /** Present exactly when the order is ENDED (the 10s banner linger):
       * a joiner/refresher mid-banner needs the verdict or a WON order
       * renders as the sad gate-1 loss (checkpoint audit 2026-07-03). */
      judgment?: Judgment;
    }
  | { t: "join"; id: number; name: string }
  | { t: "leave"; id: number }
  /** A pickTown was HONORED (plans/11 §5): member `id` now crews `town`.
   * The picker re-targets its HUD/controls from this — assignment is
   * server truth, never assumed at send. (Also the seam the later
   * color-by-town glue reads for ghosts.) Assignment is not position:
   * nobody teleports — you run to your new fort. */
  | { t: "town"; id: number; town: number }
  | { t: "poses"; poses: PlayerPose[] }
  | {
      t: "machine";
      /** Whose machine this is — replicas index their rigs by it. */
      town: number;
      state: CatapultState;
      crankTicks: number;
      screwTicks: number;
    }
  /** Fire! Every receiver (and the room itself) spawns this projectile
   * locally — deterministic ballistics make all copies land identically.
   * This is sync-shots-not-surfaces. `seed` is the reserved seed S of the
   * pivot record (plans/06), live at last (plans/10): burst toppings
   * replay their seeded scatter from it, identically everywhere. `town`
   * is WHERE FROM: replicas replay the lob from TOWNS[town].base along
   * its facing — the origin is part of the event's determinism. */
  | {
      t: "shot";
      town: number;
      topping: string;
      traverseDeg: number;
      tiltNotch: number;
      tensionClicks: number;
      seed: number;
    }
  /** Authoritative scoring: a topping came to rest. The checklist rides
   * along — the client has no settled-toppings ledger of its own.
   * `count` batches same-tick same-fate landings (plans/10 §5: a burst's
   * grains must not be forty broadcasts); absent means 1. */
  | {
      t: "scored";
      topping: string;
      onCake: boolean;
      count?: number;
      order: OrderState;
      checks: RequirementCheck[];
    }
  /** `judgment` rides along exactly when this message ENDS the order —
   * the verdict the banner renders (delighted/refused/hungry). `fresh`
   * rides along exactly when the room DEALS anew: the fresh cake wheels
   * out — clients clear their local frosting AND every solid on the
   * dessert (the fresh-cake law; floor litter stays). */
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
