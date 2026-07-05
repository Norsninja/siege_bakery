/**
 * The order lifecycle — an EXPLICIT state machine (Room.tick decomp,
 * research/05 parked item 4; built 2026-07-05). One order's life:
 *
 *   RUNNING --clock dies--> ENDED --linger ORDER_RESET_TICKS--> fresh deal
 *      \--last row met + score (via evaluateOrder, Room writes back)--^
 *
 * OrderFlow owns everything whose lifetime IS the deal: the order, the
 * shot count (waste axis), the deal generation tag, the patron and his
 * look cadence, the linger countdown. It owns NO physics, no transport,
 * no broadcast — it ticks counters and returns EVENTS; the Room wires
 * them to the world and the wire. game/ law: imports core/ only,
 * deterministic (the whim rng is seeded and persists across deals).
 */
import { mulberry32 } from "../core/rng";
import {
  type Requirement,
  type RequirementCheck,
  type SettledTopping,
} from "./judgment";
import { createOrder, tickOrder, type OrderState } from "./order";
import { createGiant, type Patron } from "./patron";
import {
  FROST_FRAC,
  ORDER_PAR_SHOTS,
  ORDER_RESET_TICKS,
  ORDER_SECONDS,
  PATRON_LOOK_EVERY,
  SPRINKLES_NEEDED,
  TOWN_POTENTIAL,
} from "./tuning";

/** THE HONEST ORDER (plans/07 phase O) — the decorating truth as a ticket:
 * frost the cake, sprinkles on the frosting, and the Giant's mid-order
 * demand is the ONLY cherry row that ever exists. THE ONE-NUMBER LAW:
 * every row is one number of one thing, and a topping appears in at most
 * one row per order — the "is it 4 cherries or 5" arithmetic is impossible
 * by construction. LIMES ARE NEVER ORDERED — the lime is the pantry DECOY
 * (visionary, 2026-07-03): grab the wrong crate under pressure and it
 * fires anyway, lands anyway, counts only as mess. The NUMBERS (frac,
 * sprinkles, clock, par) live in game/tuning.ts — the dashboard — with
 * the re-pin law and the economy math; the row SHAPES live here. Fresh
 * rows every deal — orders are mutable, never share row objects. */
export function standardRequirements(): Requirement[] {
  return [
    // ONE town today: the frost ask is a fraction of what this firing line
    // can reach (plans/08). The towns slice replaces this with the RUNG-
    // AUTHORED potential (plans/09 §4) — the level says what reach the
    // Patron expects; TOWN_POTENTIAL stays the measured reference table.
    { kind: "frost-coverage", frac: FROST_FRAC, potential: TOWN_POTENTIAL[1]! },
    { kind: "on-frosting", topping: "sprinkles", needed: SPRINKLES_NEEDED },
  ];
}

/** What one tick of the lifecycle asks the Room to do, in order. */
export type FlowEvent =
  /** The clock just died: gate 1 fails — broadcast the verdict. */
  | "ended"
  /** The linger is over and a fresh order was dealt: reset the physical
   * per-order state (settled census, frosting) and broadcast it. */
  | "redeal";

export class OrderFlow {
  /** The live order. The Room writes evaluateOrder results and patron
   * amendments back here — one owner of the object, many writers of the
   * reference, same as the pre-decomp field. */
  order: OrderState;
  /** The deal generation. Shots spawn tagged with it; a delivery whose tag
   * is stale scores NOTHING (audit AUD-4) — a glob fired against one order
   * can't paint the next one's freshly licked cake. */
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
    this.order = this.freshOrder();
  }

  private freshOrder(): OrderState {
    return createOrder(standardRequirements(), ORDER_SECONDS * 60, {
      parShots: ORDER_PAR_SHOTS,
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
  ): { utterance: string } {
    const total = ledger.length;
    const mess = total > 0 ? ledger.filter((s) => !s.onCake).length / total : 0;
    const act = this.patron.act({
      order: this.order,
      checks,
      mess,
      prevMess: this.prevMess,
      secondsLeft: this.order.ticksLeft / 60,
      look: this.looks,
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

  /** Advance the lifecycle one tick: the clock, the transition, the
   * linger, the re-deal. Events come back in the order they happened —
   * on the transition tick the linger ALSO counts (pre-decomp behavior,
   * pinned by the clock tests). */
  tickClock(): FlowEvent[] {
    const events: FlowEvent[] = [];
    const before = this.order.status;
    this.order = tickOrder(this.order);
    if (this.order.status !== before) events.push("ended");
    // A finished order lingers on the banner, then the patron orders again.
    if (this.order.status !== "running") {
      this.endedTicks++;
      if (this.endedTicks >= ORDER_RESET_TICKS) {
        this.endedTicks = 0;
        this.dealGen++; // in-flight shots now carry a stale tag
        this.shots = 0;
        this.patron = createGiant();
        this.orderTicks = 0;
        this.looks = 0;
        this.prevMess = 0;
        this.order = this.freshOrder();
        events.push("redeal");
      }
    }
    return events;
  }
}
