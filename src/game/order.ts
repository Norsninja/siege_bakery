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
 * End semantics (Step 2, both gates live): the moment every row is met,
 * THE JUDGMENT renders — gate 2 decides delighted (1–3 stars) vs REFUSED
 * (lost, the insulting kind: you did what was asked, badly). The clock
 * dying first is gate 1 failure — the patron goes hungry (lost, the sad
 * kind). Late shots after the verdict change nothing.
 */
import type { DessertGeometry } from "../core/dessert";
import type { FrostingField } from "../core/frosting";
import {
  checkRequirements,
  judge,
  type Judgment,
  type Requirement,
  type RequirementCheck,
  type SettledTopping,
} from "./judgment";
import { COVERAGE_EXCELLENT, COVERAGE_GOOD } from "./tuning";

/** THE DESIRE (plans/13 §1, the flourish + finish-it amendments,
 * 2026-07-09): the patron's optional flourish — the fatality, style on a
 * decided outcome. NEVER a requirement row: the "all rows met = win"
 * invariant stays total. Its topping is TOPPERS-class (never orderable —
 * validateDesires at Room boot); its placement is crown semantics (the
 * summit claimed — judgment's crown scan). Eligibility is PHYSICAL:
 * judged from the settled ledger at each conclusion, whenever the
 * topping was thrown; `revealed`/`met` are live presentation state the
 * Room writes in place (the patron-amendment idiom). */
export interface Desire {
  /** What the patron wants on the very top (the Giant: a cherry). */
  topping: string;
  /** The offer fired — a patron look found coverage ≥ goodFrac. */
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
  /** Shots for full waste credit (gate 2, Step 2 — carried on the wire now). */
  parShots: number;
  /** Gate 2: minimum assembly score the Patron will accept (Step 2). */
  passScore: number;
  /** Star tiers, fractions of potential coverage (plans/08; on the wire —
   * the HUD prints what each star takes). */
  goodFrac: number;
  excellentFrac: number;
  ticksLeft: number;
  status: "running" | "won" | "lost";
}

export function createOrder(
  requirements: Requirement[],
  ticks: number,
  opts?: {
    parShots?: number;
    passScore?: number;
    goodFrac?: number;
    excellentFrac?: number;
    desire?: Desire;
  },
): OrderState {
  return {
    requirements,
    ...(opts?.desire ? { desire: opts.desire } : {}),
    finishTicksLeft: 0,
    parShots: opts?.parShots ?? 6,
    passScore: opts?.passScore ?? 50,
    goodFrac: opts?.goodFrac ?? COVERAGE_GOOD,
    excellentFrac: opts?.excellentFrac ?? COVERAGE_EXCELLENT,
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
 * Re-census the order against everything at rest. When every row is met
 * while running, the Judgment renders on the spot: accepted → won,
 * refused → lost (an empty order can't win — nothing was asked).
 * A finished order never un-finishes; late landings still show in checks.
 * THE FINISH IT GUARD (plans/13 §1, 2026-07-09): while the window is open
 * the outcome is already decided and its base verdict FROZEN in the Room —
 * a decided order never re-judges (style landings would drift the score
 * S-MED-1 froze); landings keep flowing through checks only.
 */
export function evaluateOrder(
  dessert: DessertGeometry,
  state: OrderState,
  settled: readonly SettledTopping[],
  frosting: FrostingField,
  shotsFired: number,
): { state: OrderState; checks: RequirementCheck[]; judgment?: Judgment } {
  const checks = checkRequirements(dessert, state.requirements, settled, frosting);
  if (
    state.status === "running" &&
    state.finishTicksLeft === 0 &&
    checks.length > 0 &&
    checks.every((c) => c.met)
  ) {
    const judgment = judge(dessert, state, settled, frosting, shotsFired);
    return {
      state: { ...state, status: judgment.accepted ? "won" : "lost" },
      checks,
      judgment,
    };
  }
  return { state, checks };
}
