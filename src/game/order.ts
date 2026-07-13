/**
 * Orders — now with rows (slice 2, plans/03). game/ law: pure data,
 * imports core/ + sibling game modules only.
 *
 * An order is a MUTABLE list of typed requirements (the Patron appends and
 * tightens rows mid-order — 2D law, deliberate mutability) + the par shot
 * count and the Patron's snob threshold (gate 2, consumed from Step 2) +
 * the clock. Scoring truth stays PHYSICAL (visionary, 2026-07-02): rows
 * count toppings AT REST — hit the top and roll off the back, the patron
 * gets nothing. Wrong toppings land and lie there — mistakes execute, they
 * never block, they just don't count.
 *
 * End semantics (plans/22, grade-at-the-buzzer — supersedes plans/03's
 * "the Judgment renders the moment every row is met"): the order runs to
 * the CLOCK (or, later, a player serve) — meeting the rows no longer ends
 * it. At the buzzer the Room renders the Judgment: rows unmet → hungry (the
 * sad kind); rows met but gate 2 below → REFUSED (the insulting kind); met
 * and good → delighted (1–3 stars). This module only ticks the clock and
 * censuses the rows now — `evaluateOrder` is CHECK-ONLY; the Room judges at
 * conclusion (see server/room.ts concludeOrder).
 */
import type { DessertGeometry } from "../core/dessert";
import type { FrostingField } from "../core/frosting";
import {
  checkRequirements,
  type Requirement,
  type RequirementCheck,
  type SettledTopping,
} from "./judgment";
import { STAR2_COVERAGE, STAR3_COVERAGE } from "./tuning";

/** THE DESIRE (plans/13 §1, the flourish + finish-it amendments,
 * 2026-07-09): the patron's optional flourish — the fatality, style on a
 * decided outcome. NEVER a requirement row: it lives outside the checklist
 * entirely — the flourish is a whole-order bonus, judged at the buzzer like
 * everything else (plans/22 §2.9). Its topping is TOPPERS-class (never orderable —
 * validateDesires at Room boot); its placement is crown semantics (the
 * summit claimed — judgment's crown scan). Eligibility is PHYSICAL:
 * judged from the settled ledger at each conclusion, whenever the
 * topping was thrown; `revealed`/`met` are live presentation state the
 * Room writes in place (the patron-amendment idiom). */
export interface Desire {
  /** What the patron wants on the very top (the Giant: a cherry). */
  topping: string;
  /** The offer fired — a patron look found coverage ≥ star2Coverage (the
   * 2★ tier, absolute — plans/22 step 4). */
  revealed: boolean;
  /** Ledger truth as of the last census — the HUD's golden checkmark.
   * The verdict never trusts this; it re-reads the ledger. */
  met: boolean;
}

export interface OrderState {
  /** MUTABLE: the Patron appends and tightens rows mid-order. */
  requirements: Requirement[];
  /** The patron's desire — present exactly on flourish rungs (asks.crown);
   * absent means this order offers no fatality. */
  desire?: Desire;
  /** THE FINISH IT WINDOW's countdown, in ticks (0 = no window). While
   * positive the outcome is DECIDED but not formally ended: status stays
   * "running" (gates shut, banner suppressed), the order clock holds, and
   * the frozen base verdict waits in the Room (plans/13 §1 finish-it
   * amendment). OrderFlow ticks it; the Room opens and closes it. */
  finishTicksLeft: number;
  /** THE LONE HERO stamp (plans/13 §5, 2026-07-09): the connected crew
   * this ticket was priced for at deal time (REACH × LABOR — the rows
   * above already carry the scaled numbers; this is the label). On the
   * wire with the order for free: the HUD's "one pair of hands" tag
   * reads it, and it describes the TICKET, not the live headcount — a
   * mid-order leaver never flickers it. Absent = a pre-amendment order
   * (full labor). */
  hands?: number;
  /** Shots for full waste credit (gate 2, Step 2 — carried on the wire now). */
  parShots: number;
  /** Gate 2: minimum assembly score the Patron will accept (Step 2). */
  passScore: number;
  /** Star tiers, ABSOLUTE coverage fractions (plans/22 step 4; on the wire
   * — the HUD prints what each star takes). */
  star2Coverage: number;
  star3Coverage: number;
  ticksLeft: number;
  status: "running" | "won" | "lost";
}

export function createOrder(
  requirements: Requirement[],
  ticks: number,
  opts?: {
    parShots?: number;
    passScore?: number;
    star2Coverage?: number;
    star3Coverage?: number;
    desire?: Desire;
    hands?: number;
  },
): OrderState {
  return {
    requirements,
    ...(opts?.desire ? { desire: opts.desire } : {}),
    ...(opts?.hands !== undefined ? { hands: opts.hands } : {}),
    finishTicksLeft: 0,
    parShots: opts?.parShots ?? 6,
    passScore: opts?.passScore ?? 50,
    star2Coverage: opts?.star2Coverage ?? STAR2_COVERAGE,
    star3Coverage: opts?.star3Coverage ?? STAR3_COVERAGE,
    ticksLeft: ticks,
    status: "running",
  };
}

/** One fixed tick of clock. Time only moves while the order is running. */
export function tickOrder(state: OrderState): OrderState {
  if (state.status !== "running") return state;
  const ticksLeft = state.ticksLeft - 1;
  if (ticksLeft <= 0) return { ...state, ticksLeft: 0, status: "lost" };
  return { ...state, ticksLeft };
}

/**
 * Re-census the order against everything at rest — CHECK-ONLY since the
 * grade-at-the-buzzer flip (plans/22 step 3, supersedes plans/03). Meeting
 * every row no longer renders a verdict or ends the order: this returns the
 * live checklist for the HUD and the Room's gates, nothing more. The
 * Judgment is the Room's, rendered at conclusion (clock-expiry or serve) —
 * see server/room.ts concludeOrder. Late landings simply keep flowing
 * through the checks until the buzzer reads the final state.
 */
export function evaluateOrder(
  dessert: DessertGeometry,
  state: OrderState,
  settled: readonly SettledTopping[],
  frosting: FrostingField,
): RequirementCheck[] {
  return checkRequirements(dessert, state.requirements, settled, frosting);
}
