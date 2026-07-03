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
  let demanded = false; // ...and springs his cherry surprise once
  return {
    name: "The Giant",
    act(ctx: PatronContext): PatronAct {
      // 1. NEW mess on the floor? Thunder. (The Bite arrives with cake
      //    deformation — until then the complaint carries the sting.)
      if (ctx.mess > 0.3 && ctx.mess > ctx.prevMess + 0.05) {
        return {
          utterance: "I SEE FOOD ON THE FLOOR. THE FLOOR IS NOT ME.",
          patienceDeltaSeconds: -8,
        };
      }

      // 2. A row stalling after two looks? He demands MORE of it (tightens
      //    the row in place, once). Only COUNT rows tighten — there is no
      //    such thing as more crown, and the frost fraction is a promise,
      //    not a count.
      if (!nagged && ctx.look >= 2) {
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

      // 3. The bake half done and no crown promised? He wants one NOW.
      //    Progress-based (not rows-met — a fully met order ENDS before he
      //    can speak): total delivered ≥ half of total asked. The demand
      //    appends a row — the order is deliberately mutable. The crown is
      //    the REAL rule (plans/05): a cherry as the uppermost topping,
      //    resting on the top tier — the peak-zone stand-in retired.
      const asked = ctx.checks.reduce((n, c) => n + c.target, 0);
      const delivered = ctx.checks.reduce(
        (n, c) => n + Math.min(c.current, c.target),
        0,
      );
      if (
        !demanded &&
        asked > 0 &&
        delivered * 2 >= asked &&
        !ctx.order.requirements.some((r) => r.kind === "crown")
      ) {
        demanded = true;
        ctx.order.requirements.push({ kind: "crown", topping: "cherry" });
        return {
          utterance: "...IT NEEDS A CHERRY. ON THE VERY TOP. NOTHING ABOVE IT.",
          patienceDeltaSeconds: 0,
        };
      }

      // 4. The clock runs low and a box is still empty? A pointed reminder.
      //    Urgency outranks whimsy, so this sits before the whim.
      if (ctx.secondsLeft <= 25) {
        const missing = ctx.checks.find((c) => !c.met);
        if (missing) {
          return {
            utterance: `TIME RUNS SHORT. DO NOT FORGET: ${describeRequirement(missing.req)}.`,
            patienceDeltaSeconds: -2,
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
        patienceDeltaSeconds: -4,
      };
    },
  };
}
