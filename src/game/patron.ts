/**
 * The Patron — the personality at the table (game layer). Ported from the
 * 2D rules lab (artillery/src/game/Patron.ts, READ-ONLY): a Patron is a
 * MINIMAL BEHAVIOUR TREE — an ordered list of condition→action rules over
 * observable match state; first matching rule wins. Deterministic: the
 * seeded RNG (owned by the Room) is for whims and tiebreaks only.
 * Difficulty = a more demanding rule list, not bigger numbers.
 *
 * Real-time translation (plans/03): the 2D turn slot becomes a LOOK — the
 * Room lets the Patron look at the cake every N seconds of order time —
 * and patienceDelta lands as SECONDS on the order clock (patience IS the
 * clock, per the pivot). Deferred with their tech, per the port-gap doc:
 * the Bite as terrain carve (no cake deformation yet — fresh mess draws a
 * thunderous complaint instead) and the Sneeze (no wind in 3D ballistics
 * yet — the whim stays, harmless, as foreshadowing).
 *
 * Patrons hold per-order state in their closure (nagged-once flags) — the
 * Room creates a FRESH Patron with every deal.
 */
import type { RandomFn } from "../core/rng";
import {
  describeRequirement,
  isCountRow,
  type RequirementCheck,
} from "./judgment";
import type { OrderState } from "./order";
import {
  PATIENCE_BURN_GRUMBLE_S,
  PATIENCE_BURN_THUNDER_S,
  PATIENCE_BURN_URGENT_S,
} from "./tuning";

/** Everything a Patron may observe (and, through `order`, mutate). */
export interface PatronContext {
  /** The live order — rules amend its requirements IN PLACE (2D law). */
  readonly order: OrderState;
  readonly checks: readonly RequirementCheck[];
  /** Fraction of settled toppings off the cake right now. */
  readonly mess: number;
  /** Mess as of the END of his previous look (0 on the first). Rules that
   * punish mess compare against this — react to NEW mess — or one early
   * spill becomes a permanent grudge (2D playtest lesson). */
  readonly prevMess: number;
  readonly secondsLeft: number;
  /** How many looks this Patron has taken THIS order (0 on the first). */
  readonly look: number;
  /** The deal's summit tier index (spec refactor, plans/13 §3) — the
   * urgent reminder speaks a row's words, and zone words are per-spec. */
  readonly topTier: number;
  readonly rng: RandomFn;
}

export interface PatronAct {
  readonly utterance: string;
  /** Seconds added to the order clock. The Giant only ever burns them. */
  readonly patienceDeltaSeconds: number;
}

export interface Patron {
  readonly name: string;
  act(ctx: PatronContext): PatronAct;
}

export function createGiant(): Patron {
  let nagged = false; // the Giant repeats himself, but only tightens once
  return {
    name: "The Giant",
    act(ctx: PatronContext): PatronAct {
      // 1. NEW mess on the floor? Thunder. (The Bite arrives with cake
      //    deformation — until then the complaint carries the sting.)
      if (ctx.mess > 0.3 && ctx.mess > ctx.prevMess + 0.05) {
        return {
          utterance: "I SEE FOOD ON THE FLOOR. THE FLOOR IS NOT ME.",
          patienceDeltaSeconds: -PATIENCE_BURN_THUNDER_S,
        };
      }

      // 2. A row stalling after two looks — while ANOTHER row is already
      //    met? He demands MORE of the neglected thing (tightens the row in
      //    place, once). The some-row-met guard is an O2 lesson (plans/07):
      //    with the honest order, sprinkles are RATIONALLY zero while the
      //    frosting goes down — an unguarded nag fired every single game at
      //    the second look, a constant tax wearing a character's hat. Only
      //    COUNT rows tighten — there is no such thing as more crown, and
      //    the frost fraction is a promise, not a count.
      if (!nagged && ctx.look >= 2 && ctx.checks.some((c) => c.met)) {
        const stalled = ctx.checks.find(
          (c) => isCountRow(c.req) && !c.met && c.current < c.target * 0.25,
        );
        if (stalled && isCountRow(stalled.req)) {
          nagged = true;
          stalled.req.needed += 1;
          return {
            utterance: `MORE. ${stalled.req.topping.toUpperCase()}.`,
            patienceDeltaSeconds: 0,
          };
        }
      }

      // 3. [SHELVED — the flourish amendment, plans/13 §1, slice 4.]
      //    The progress-triggered REQUIRED-crown demand lived here and was
      //    condemned: a demand that appends a requirement punishes good
      //    play (and on cake-6 would make playing WELL the run-ending
      //    mistake). The cherry returns in slice 4b as the Giant's DESIRE —
      //    an optional flourish offered when coverage turns great, never a
      //    gate. The one-number law's topping guard moves there with it.

      // 4. The clock runs low and a box is still empty? A pointed reminder.
      //    Urgency outranks whimsy, so this sits before the whim.
      if (ctx.secondsLeft <= 25) {
        const missing = ctx.checks.find((c) => !c.met);
        if (missing) {
          return {
            utterance: `TIME RUNS SHORT. DO NOT FORGET: ${describeRequirement(missing.req, ctx.topTier)}.`,
            patienceDeltaSeconds: -PATIENCE_BURN_URGENT_S,
          };
        }
      }

      // 5. A rare whim. (The real Sneeze arrives with wind.)
      if (ctx.rng() < 0.2) {
        return {
          utterance: "aaah... AAAH... hm. no. it passed.",
          patienceDeltaSeconds: 0,
        };
      }

      // 6. Otherwise: the fuse burns.
      const grumbles = ["HMPH.", "HURRY UP.", "MY TUMMY IS MAKING THE NOISES."];
      return {
        utterance: grumbles[ctx.look % grumbles.length]!,
        patienceDeltaSeconds: -PATIENCE_BURN_GRUMBLE_S,
      };
    },
  };
}
