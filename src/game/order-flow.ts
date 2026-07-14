/**
 * The order lifecycle — an EXPLICIT state machine (Room.tick decomp,
 * research/05 parked item 4; built 2026-07-05). One order's life:
 *
 *   RUNNING --clock dies (or serve, later)--> ENDED --linger ORDER_RESET_TICKS--> lingerOver
 *   (grade-at-the-buzzer, plans/22 step 3: meeting the rows no longer ends
 *   the order — the Room JUDGES at conclusion, clock-expiry today. The ROOM
 *   deals fresh at lingerOver — it must run orderConcluded first, so the
 *   deal prices the rung the ladder just climbed to; plans/13 slice 4)
 *
 * OrderFlow owns everything whose lifetime IS the deal: the order, the
 * shot count (waste axis), the deal generation tag, the patron and his
 * look cadence, the linger countdown. It owns NO physics, no transport,
 * no broadcast — it ticks counters and returns EVENTS; the Room wires
 * them to the world and the wire. game/ law: imports core/ only,
 * deterministic (the whim rng is seeded and persists across deals).
 */
import { mulberry32 } from "../core/rng";
import { RUNGS, rungRow, type Rung } from "./campaign";
import {
  weighedMess,
  type Requirement,
  type RequirementCheck,
  type SettledTopping,
} from "./judgment";
import { createOrder, tickOrder, type OrderState } from "./order";
import { createGiant, type Patron } from "./patron";
import {
  CREW_LABOR,
  EARNED_TIME_CAP_S,
  EARNED_TIME_PER_SAMPLE_S,
  GARNISH_TIME_PER_GRAIN_S,
  ORDER_RESET_TICKS,
  PATRON_LOOK_EVERY,
  TOPPER_TIME_S,
} from "./tuning";

/** THE HONEST ORDER (plans/07 phase O), per-rung since the ladder went
 * live (plans/13 slice 4) — the decorating truth as a ticket: frost the
 * cake, sprinkles on the frosting. THE ONE-NUMBER LAW: every row is one
 * number of one thing, and a topping appears in at most one row per
 * order. LIMES ARE NEVER ORDERED — the lime is the pantry DECOY
 * (visionary, 2026-07-03): grab the wrong crate under pressure and it
 * fires anyway, lands anyway, counts only as mess. The NUMBERS come from
 * the rung's RUNGS row now (game/campaign.ts — the ladder dashboard;
 * tuning.ts keeps the anchor references); the row SHAPES live here.
 * NO CROWN ROW deals — the crown is an optional FLOURISH since the §1
 * amendment. Fresh rows every deal — orders are mutable, never share row
 * objects. COVERAGE IS ABSOLUTE (plans/22 step 4): the frost floor is a
 * flat share of the whole cake, priced by neither towns nor labor —
 * geometry scales the difficulty. */
export function requirementsFor(
  row: Rung,
  /** Connected crew at deal time (THE LONE HERO AMENDMENT, plans/13 §5),
   * NARROWED by the absolute flip (plans/22 §3): it no longer prices
   * coverage — only the sprinkle-grain count still scales by labor.
   * Defaults to 2 (full labor) so anchor/pre-amendment callers price
   * today's grains verbatim; the live game passes the roster's truth. */
  crew = 2,
): Requirement[] {
  const labor = CREW_LABOR[Math.max(1, Math.min(crew, CREW_LABOR.length - 1))]!;
  // The frost floor is ABSOLUTE and flat (plans/22 step 4): a share of the
  // WHOLE cake straight off the rung's row — no reach × labor denominator.
  // The recipe's flavor ask (plans/24) rides the row when the rung names
  // one — a wish for impress, never a gate (the floor stays color-blind).
  const rows: Requirement[] = [
    {
      kind: "frost-coverage",
      floorCoverage: row.asks.floorCoverage,
      ...(row.asks.flavor ? { flavor: row.asks.flavor } : {}),
    },
  ];
  // A zero ask deals NO row (rung 1): a zero-target row is born met and
  // the Giant's nag could tighten a thing that was never asked. Grains
  // still scale by labor (the one CREW_LABOR survival — a pass-floor knob,
  // not coverage; solo relief re-derives whole in step 6) — ceil, so a
  // scaled row never asks 0.
  if (row.asks.sprinkles > 0)
    rows.push({
      kind: "on-frosting",
      topping: "sprinkles",
      needed: Math.ceil(row.asks.sprinkles * labor),
    });
  return rows;
}

/** The ANCHOR's ticket (rung 3 = today's standing order, verbatim) —
 * kept for scripts/studies that predate the ladder; the live game deals
 * requirementsFor(the run's rung). */
export function standardRequirements(): Requirement[] {
  return requirementsFor(rungRow(3));
}

/** THE TOPPERS LAW's tripwire (plans/13 §1 finish-it amendment,
 * 2026-07-09): a desire's topping must NEVER appear in any orderable row —
 * desires draw from toppers (cherry, lime: the shelf nobody orders), so
 * the one-number law holds STRUCTURALLY (a desire can't double-book a
 * topping the order counts). Checked against every RUNGS row at both ask
 * tables; runs at Room boot beside validateRungs. Trivially true today —
 * load-bearing the day a patron's desire rolls an orderable topping. */
export function validateDesires(): void {
  const desire = createGiant().desire;
  if (!desire) return;
  for (const row of RUNGS) {
    for (const req of requirementsFor(row)) {
      if ("topping" in req && req.topping === desire.topping)
        throw new Error(
          `desire topping "${desire.topping}" appears in an orderable row (spec ${row.spec}) — the toppers law`,
        );
    }
  }
}

/** What one tick of the lifecycle asks the Room to do, in order. */
export type FlowEvent =
  /** The clock just died: gate 1 fails — broadcast the verdict. */
  | "ended"
  /** The linger is over. THE ROOM OWNS THE DEAL since the ladder went
   * live (plans/13 slice 4): a flow self-deal here would price the OLD
   * rung's asks — the rung climbs in orderConcluded, which the Room
   * must run FIRST. The Room answers with dealFresh(the right row) +
   * the physical resets + the broadcast, every path. */
  | "lingerOver";

export class OrderFlow {
  /** The live order. The Room writes the buzzer verdict's status flip and
   * patron amendments back here — one owner of the object, many writers of
   * the reference, same as the pre-decomp field. (evaluateOrder is
   * check-only since the flip — it no longer writes a conclusion back.) */
  order: OrderState;
  /** How many towns the NEXT deal is priced for (plans/11 §6). The Room
   * writes it when the second town activates; the RUNNING order keeps the
   * rows it was dealt — the ask rises at the next deal, never mid-order. */
  activeTowns = 1;
  /** How many hands the NEXT deal is priced for (THE LONE HERO AMENDMENT,
   * plans/13 §5): the Room writes roster truth before every deal; the
   * RUNNING order keeps the labor it was dealt — towns law verbatim.
   * Defaults to 2 (full labor) so a bare OrderFlow prices pre-amendment
   * numbers; the Room's write is what makes the lone hero real. */
  activeCrew = 2;
  /** The deal generation. Shots spawn tagged with it; a delivery whose tag
   * is stale scores NOTHING (audit AUD-4) — a glob fired against one order
   * can't paint the next one's fresh cake. */
  private dealGen = 0;
  /** The personality at the table. FRESH each deal — his nagged-once flags
   * live in his closure. The whim rng persists across deals. */
  private patron: Patron = createGiant();
  private readonly rng = mulberry32(0xcafe);
  private orderTicks = 0;
  private looks = 0;
  private prevMess = 0;
  private endedTicks = 0;
  /** EARNED TIME (plans/22 step 6; generalized by plans/24's ONE CLOCK
   * RULE): cumulative ticks this order has earned across ALL axes (paint,
   * garnish, topper), held to enforce the ONE shared EARNED_TIME_CAP_S.
   * Resets each deal. */
  private earnedTicks = 0;
  /** THE GARNISH HIGH-WATER (plans/24 ruling 3): the best ask-capped
   * sprinkle progress already PAID for. Only new maxima earn — grains
   * beyond the ask, and re-reaching a count after burial, are redundancy
   * (the fresh-vs-recoat law applied to garnish). Resets each deal. */
  private garnishHigh = 0;
  /** THE TOPPER'S ONCE (plans/24 ruling 3): the crowning chunk is paid a
   * single time per order. Resets each deal. */
  private topperPaid = false;
  /** THE PATIENCE DEBT (plans/22 step 6, DORMANT until step 8): patience no
   * longer drains the clock — the Giant's impatience accumulates here (as
   * positive seconds burned) for the realm's-favor payout to spend. Nothing
   * reads it yet; the signal is captured, not dropped. Resets each deal. */
  private patienceDebtSeconds = 0;

  constructor() {
    // The dormant lobby order is the next run's rung 1 (plans/13).
    this.order = this.freshOrder(rungRow(1));
  }

  /** One rung's ticket: rows, clock, and par all from the RUNGS row
   * (the ladder live, plans/13 slice 4). Par picks the authored column
   * by crew shape — the duo workload is strictly bigger (campaign.ts).
   * Flourish rungs (asks.crown) carry the patron's DESIRE (§1 amendment,
   * slice 4b) — per-patron data, never a requirement row. */
  private freshOrder(row: Rung): OrderState {
    return createOrder(
      requirementsFor(row, this.activeCrew),
      // THE CLOCK RELIEF (plans/15 item 26 + addendum): the clock prices
      // HANDS at the deal — the rows stay verbatim (anchor law). Solo
      // reads the row's PER-RUNG relief (soloClock — went per-rung when
      // the flat factor over-relieved rung 2; the relief is the
      // tutorial's, rung 1 = 1.25, rung 2+ = 1.0). Crew 2+ never
      // stretches: duo zero-drift, the friend-test caution (if a
      // playtest ever asks for crew-scaled duo clocks, the crew factor
      // returns HERE). activeCrew 0 clamps to solo, exactly as
      // CREW_LABOR does in requirementsFor.
      Math.round(
        row.clockSeconds * (this.activeCrew <= 1 ? row.soloClock : 1.0) * 60,
      ),
      {
        // The ticket wears its pricing (the HUD's "one pair of hands"
        // tag reads the stamp, never the live headcount).
        hands: this.activeCrew,
        // The absolute star tiers ride the rung's row (plans/22 step 4 —
        // flat on the cake ladder, bespoke on the cupcake).
        star2Coverage: row.stars.two,
        star3Coverage: row.stars.three,
        ...(row.asks.crown && this.patron.desire
          ? {
              desire: {
                topping: this.patron.desire.topping,
                revealed: false,
                met: false,
              },
            }
          : {}),
      },
    );
  }

  get deal(): number {
    return this.dealGen;
  }

  /** THE PATIENCE DEBT (plans/22 step 6): seconds of impatience the Giant
   * has burned this order — DORMANT until step 8 (the realm's favor reads
   * it to move the payout, never the clock). Zero on a fresh deal. */
  get patienceDebt(): number {
    return this.patienceDebtSeconds;
  }

  /** EARNED TIME (plans/22 step 6 — the reliable clock's one positive
   * force): fresh cake coverage buys clock. The Room calls this from the
   * scoring phase with the tick's FRESH sample count (newly painted, the
   * coverage delta). Adds EARNED_TIME_PER_SAMPLE_S per fresh sample, capped
   * at EARNED_TIME_CAP_S cumulative this order — a saturated cake earns
   * nothing, so a coasting line runs the base out and the round ends
   * naturally (§2.5). No-op off a running order (the clock only grows while
   * it ticks) or once the cap is hit. Returns the seconds actually granted. */
  earnTime(freshSamples: number): number {
    if (freshSamples <= 0) return 0;
    return this.grantSeconds(freshSamples * EARNED_TIME_PER_SAMPLE_S);
  }

  /** THE GARNISH AXIS (plans/24 ruling 3): sprinkle progress buys clock.
   * The Room calls this from the scoring phase with the live ASK-CAPPED
   * progress (Σ min(current, target) over on-frosting rows); only NEW
   * high-water marks earn — grains beyond the ask, and re-climbing after
   * burial, are redundancy. Same shared cap as every axis. */
  earnGarnishTime(cappedProgress: number): number {
    if (cappedProgress <= this.garnishHigh) return 0;
    const gained = cappedProgress - this.garnishHigh;
    this.garnishHigh = cappedProgress;
    return this.grantSeconds(gained * GARNISH_TIME_PER_GRAIN_S);
  }

  /** THE TOPPER AXIS (plans/24 ruling 3): the cherry's FIRST crowning on
   * frosting (ruling 4's predicate — the Room calls this at the moment its
   * desire checkmark flips true) buys one chunk of clock, once per order. */
  earnTopperTime(): number {
    if (this.topperPaid) return 0;
    this.topperPaid = true;
    return this.grantSeconds(TOPPER_TIME_S);
  }

  /** THE ONE CAP (plans/22 §2.5's backstop, shared by every axis of the
   * one clock rule): grant seconds of clock onto a RUNNING order, cumulative
   * to EARNED_TIME_CAP_S per deal. Returns the seconds actually granted. */
  private grantSeconds(seconds: number): number {
    if (this.order.status !== "running" || seconds <= 0) return 0;
    const capTicks = Math.round(EARNED_TIME_CAP_S * 60);
    const grant = Math.min(Math.round(seconds * 60), capTicks - this.earnedTicks);
    if (grant <= 0) return 0;
    this.earnedTicks += grant;
    this.order = { ...this.order, ticksLeft: this.order.ticksLeft + grant };
    return grant / 60;
  }

  /** The Patron's look cadence: every PATRON_LOOK_EVERY ticks of RUNNING
   * order time. Call once per tick, before the clock advances (a look's
   * patience lands on the clock the same tick, exactly as pre-decomp). */
  shouldLook(): boolean {
    if (this.order.status !== "running") return false;
    this.orderTicks++;
    return this.orderTicks % PATRON_LOOK_EVERY === 0;
  }

  /** One Patron look: observe → act (may mutate rows) → patience lands on
   * the clock. Returns the voice; the Room broadcasts it and the amended
   * order. The ledger passed in is the LIVE one (he judges the cake as it
   * LIES); mess is his view of it, not the Judgment's. */
  patronLook(
    ledger: readonly SettledTopping[],
    checks: RequirementCheck[],
    topTier: number,
  ): { utterance: string } {
    // Burst-weighted, same arithmetic as judge() (plans/10 §3): the Giant
    // must not thunder forty times harder at one bad sprinkle pop.
    const mess = weighedMess(ledger);
    const act = this.patron.act({
      order: this.order,
      checks,
      mess,
      prevMess: this.prevMess,
      secondsLeft: this.order.ticksLeft / 60,
      look: this.looks,
      topTier,
      rng: this.rng,
    });
    this.prevMess = mess;
    this.looks++;
    // PATIENCE IS DORMANT (plans/22 step 6): it no longer touches the clock
    // — the reliable clock has ONE force, earned time (§2.6). The Giant's
    // impatience is CAPTURED here (burns are negative; store them positive)
    // for step 8's realm's favor to spend on the PAYOUT. His voice is
    // unchanged; the debt just sits until then.
    if (act.patienceDeltaSeconds < 0)
      this.patienceDebtSeconds += -act.patienceDeltaSeconds;
    return { utterance: act.utterance };
  }

  /** Deal a rung's fresh order NOW — called by the Room at every deal
   * boundary (startRun, the linger's end — the Room decides WHICH row
   * after orderConcluded; see FlowEvent). The resets: the deal
   * generation advances (in-flight shots go stale), the patron arrives
   * fresh, the counters zero. The Room owns the physical resets and
   * the broadcast, same as ever. */
  dealFresh(row: Rung): void {
    this.endedTicks = 0;
    this.dealGen++; // in-flight shots now carry a stale tag
    this.patron = createGiant();
    this.orderTicks = 0;
    this.looks = 0;
    this.prevMess = 0;
    this.earnedTicks = 0; // a fresh order earns its own time (step 6)
    this.garnishHigh = 0; // and its own garnish high-water (plans/24)
    this.topperPaid = false; // and its own crowning beat (plans/24)
    this.patienceDebtSeconds = 0; // and owes its own favor (step 8)
    this.order = this.freshOrder(row);
  }

  /** Advance the lifecycle one tick: the clock, the transition, the
   * linger. Events come back in the order they happened — on the
   * transition tick the linger ALSO counts (pre-decomp behavior, pinned
   * by the clock tests). The linger's end reports "lingerOver" and
   * deals NOTHING — the Room answers with dealFresh(the right row)
   * every path (see FlowEvent), which zeroes the linger count. */
  tickClock(): FlowEvent[] {
    const events: FlowEvent[] = [];
    const before = this.order.status;
    this.order = tickOrder(this.order);
    if (this.order.status !== before) events.push("ended");
    // A finished order lingers on the banner, then the patron orders again.
    if (this.order.status !== "running") {
      this.endedTicks++;
      if (this.endedTicks >= ORDER_RESET_TICKS) events.push("lingerOver");
    }
    return events;
  }
}
