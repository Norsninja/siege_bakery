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

export interface OrderState {
  /** MUTABLE: the Patron appends and tightens rows mid-order. */
  requirements: Requirement[];
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
  },
): OrderState {
  return {
    requirements,
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
 */
export function evaluateOrder(
  state: OrderState,
  settled: readonly SettledTopping[],
  frosting: FrostingField,
  shotsFired: number,
): { state: OrderState; checks: RequirementCheck[]; judgment?: Judgment } {
  const checks = checkRequirements(state.requirements, settled, frosting);
  if (
    state.status === "running" &&
    checks.length > 0 &&
    checks.every((c) => c.met)
  ) {
    const judgment = judge(state, settled, frosting, shotsFired);
    return {
      state: { ...state, status: judgment.accepted ? "won" : "lost" },
      checks,
      judgment,
    };
  }
  return { state, checks };
}
