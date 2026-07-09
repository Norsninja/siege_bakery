/**
 * The order lifecycle — an EXPLICIT state machine (Room.tick decomp,
 * research/05 parked item 4; built 2026-07-05). One order's life:
 *
 *   RUNNING --clock dies--> ENDED --linger ORDER_RESET_TICKS--> lingerOver
 *      \--last row met + score (via evaluateOrder, Room writes back)--^
 *   (the ROOM deals fresh at lingerOver — it must run orderConcluded
 *   first, so the deal prices the rung the ladder just climbed to;
 *   plans/13 slice 4)
 *
 * OrderFlow owns everything whose lifetime IS the deal: the order, the
 * shot count (waste axis), the deal generation tag, the patron and his
 * look cadence, the linger countdown. It owns NO physics, no transport,
 * no broadcast — it ticks counters and returns EVENTS; the Room wires
 * them to the world and the wire. game/ law: imports core/ only,
 * deterministic (the whim rng is seeded and persists across deals).
 */
import { mulberry32 } from "../core/rng";
import { rungRow, type Rung } from "./campaign";
import {
  weighedMess,
  type Requirement,
  type RequirementCheck,
  type SettledTopping,
} from "./judgment";
import { createOrder, tickOrder, type OrderState } from "./order";
import { createGiant, type Patron } from "./patron";
import {
  ORDER_RESET_TICKS,
  PATRON_LOOK_EVERY,
  TOWN_ASK_POTENTIAL,
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
 * amendment, shelved until slice 4b builds it. Fresh rows every deal —
 * orders are mutable, never share row objects. */
export function requirementsFor(row: Rung, activeTowns = 1): Requirement[] {
  // The frost ask is AUTHORED (plans/09 §4, Option B 2026-07-07): the
  // order says what the Patron expects — the ask table at the ACTIVE
  // town count, never the measured ceiling. "Scoring rises to the
  // two-town ask ONLY on purchase" (§1) is exactly this lookup: one
  // town asks one town's number, forever. Clamped to the table's top
  // so a future third fort fails loud in a test, not undefined here.
  const ask =
    TOWN_ASK_POTENTIAL[Math.min(activeTowns, TOWN_ASK_POTENTIAL.length - 1)]!;
  const rows: Requirement[] = [
    { kind: "frost-coverage", frac: row.asks.frostFrac, potential: ask },
  ];
  // A zero ask deals NO row (rung 1): a zero-target row is born met and
  // the Giant's nag could tighten a thing that was never asked.
  if (row.asks.sprinkles > 0)
    rows.push({ kind: "on-frosting", topping: "sprinkles", needed: row.asks.sprinkles });
  return rows;
}

/** The ANCHOR's ticket (rung 3 = today's standing order, verbatim) —
 * kept for scripts/studies that predate the ladder; the live game deals
 * requirementsFor(the run's rung). */
export function standardRequirements(activeTowns = 1): Requirement[] {
  return requirementsFor(rungRow(3), activeTowns);
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
  /** The live order. The Room writes evaluateOrder results and patron
   * amendments back here — one owner of the object, many writers of the
   * reference, same as the pre-decomp field. */
  order: OrderState;
  /** How many towns the NEXT deal is priced for (plans/11 §6). The Room
   * writes it when the second town activates; the RUNNING order keeps the
   * rows it was dealt — the ask rises at the next deal, never mid-order. */
  activeTowns = 1;
  /** The deal generation. Shots spawn tagged with it; a delivery whose tag
   * is stale scores NOTHING (audit AUD-4) — a glob fired against one order
   * can't paint the next one's fresh cake. */
  private dealGen = 0;
  /** Shots this order — the waste axis. Resets with each fresh deal. */
  private shots = 0;
  /** The personality at the table. FRESH each deal — his nagged-once flags
   * live in his closure. The whim rng persists across deals. */
  private patron: Patron = createGiant();
  private readonly rng = mulberry32(0xcafe);
  private orderTicks = 0;
  private looks = 0;
  private prevMess = 0;
  private endedTicks = 0;

  constructor() {
    // The dormant lobby order is the next run's rung 1 (plans/13).
    this.order = this.freshOrder(rungRow(1));
  }

  /** One rung's ticket: rows, clock, and par all from the RUNGS row
   * (the ladder live, plans/13 slice 4). Par picks the authored column
   * by crew shape — the duo workload is strictly bigger (campaign.ts). */
  private freshOrder(row: Rung): OrderState {
    return createOrder(requirementsFor(row, this.activeTowns), row.clockSeconds * 60, {
      parShots: this.activeTowns >= 2 ? row.parShots.duo : row.parShots.solo,
    });
  }

  get deal(): number {
    return this.dealGen;
  }

  get shotsFired(): number {
    return this.shots;
  }

  noteShot(): void {
    this.shots++;
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
    if (act.patienceDeltaSeconds !== 0) {
      // Patience IS the clock. Clamp to one tick — the loss itself must
      // arrive through tickOrder, so the ending broadcast stays singular.
      const ticksLeft = Math.max(
        1,
        this.order.ticksLeft + Math.round(act.patienceDeltaSeconds * 60),
      );
      this.order = { ...this.order, ticksLeft };
    }
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
    this.shots = 0;
    this.patron = createGiant();
    this.orderTicks = 0;
    this.looks = 0;
    this.prevMess = 0;
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
