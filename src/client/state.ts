/**
 * MatchView — everything the client knows about the match, in ONE typed
 * object instead of a dozen closure variables (M3 of the decomp phase,
 * plans/06). Server-echoed truth (machines, order, checks, verdict, patron,
 * id, your town) plus the two client-local fields the HUD reads alongside
 * them (carrying, netStatus). net-handlers.ts mutates it; main.ts and
 * hud.ts read it.
 */
import { dessertGeometry, type DessertGeometry } from "../core/dessert";
import { RUNGS, specForRung } from "../game/campaign";
import { createCatapult } from "../game/catapult";
import type { Judgment, RequirementCheck } from "../game/judgment";
import { createOrder, type OrderState } from "../game/order";
import type { RunWire, TownMachine } from "../game/protocol";
import { TOWN2_PRICE } from "../game/tuning";
import type { NetStatus, ShopState } from "./hud";

export interface MatchView {
  /** Every ACTIVE town's machine, indexed by town (plans/11 §4) — the
   * wire's welcome/machine shape, adopted whole. Length ≥ 1 always. */
  machines: TownMachine[];
  /** The town I crew — server truth (welcome, then `town` acks). The HUD,
   * controls, and clunk feedback all target machines[yourTown]. */
  yourTown: number;
  order: OrderState;
  checks: RequirementCheck[];
  /** The run container (plans/13) — server truth from welcome + `run`
   * messages; the HUD's top block and the banner render by its phase. */
  run: RunWire;
  /** THE DEAL'S DESSERT, client side (spec refactor, plans/13 §3): bound
   * by net-handlers from the wire's rung — welcome and every fresh deal —
   * BEFORE any dessert-derived snapshot state adopts (the boot-order law).
   * main.ts reads it for the local sim's step and the HUD's zone words. */
  dessert: DessertGeometry;
  /** Rides the order message that ENDS the order; null while running. */
  verdict: Judgment | null;
  lastPatron: { text: string; seq: number } | null;
  myId: number | null;
  /** Client-local inventory (plans/02): what's in MY hands. */
  carrying: string | null;
  netStatus: NetStatus;
}

/** A placeholder/unseen town's machine — unwound, empty. */
export function freshTownMachine(): TownMachine {
  return { machine: createCatapult(), crankTicks: 0, screwTicks: 0 };
}

/** MY town's machine — what the HUD and the interaction rules read. The
 * fallback can only fire in the gap before `welcome` (view defaults are
 * self-consistent), never after: every writer that moves yourTown or
 * lands a machine grows machines[] first (net-handlers growMachines —
 * the town ack included, audit 2026-07-07 C-MED-2), so yourTown always
 * indexes machines once welcomed. */
export function myMachine(view: MatchView): TownMachine {
  return view.machines[view.yourTown] ?? view.machines[0]!;
}

/** The stall's standing state (plans/13 §5 as amended 2026-07-09) — the
 * client's prediction of the Room's shop law, derived from broadcast
 * truth every read. SHOP HOURS mirror the Room's gate exactly: a WON
 * order's separator during a live run — never a run-ending linger (a
 * loss ends the run; the top-rung triumph does too — inventory dies
 * with the run, so either would sell a dead key). If the Room's rule
 * moves, move this WITH it. */
export function shopState(view: MatchView): ShopState {
  return {
    open:
      view.run.phase === "running" &&
      view.order.status === "won" &&
      view.run.rung < RUNGS.length,
    owned: view.machines.length > 1,
    price: TOWN2_PRICE,
    purse: view.run.purse ?? 0,
  };
}

/**
 * Local clock prediction between authoritative order messages (audit F5,
 * plans/06): the display clock counts down, but the CLIENT NEVER DECLARES
 * AN ENDING — it clamps at one tick and waits for the room's word. The
 * local clock can run up to a second ahead of the 1Hz correction; letting
 * it flip status rendered the banner before the verdict arrived, eating
 * the score line. Mirrors the Room's own patience clamp.
 */
export function predictClock(order: OrderState): OrderState {
  if (order.status !== "running") return order;
  // THE FINISH IT WINDOW (plans/13 §1, slice 4b): the outcome is decided
  // and the server holds the ORDER clock — predict the window's own
  // countdown instead, same advisory clamp (the 1Hz correction carries
  // the true count on the order; the server's ending word closes it).
  if (order.finishTicksLeft > 0)
    return { ...order, finishTicksLeft: Math.max(1, order.finishTicksLeft - 1) };
  return { ...order, ticksLeft: Math.max(1, order.ticksLeft - 1) };
}

/** Placeholders until `welcome` arrives. */
export function createMatchView(): MatchView {
  return {
    machines: [freshTownMachine()],
    yourTown: 0,
    order: createOrder([], 90 * 60), // rows arrive with `welcome`
    checks: [],
    run: { phase: "lobby", rung: 0 }, // truth arrives with `welcome`
    dessert: dessertGeometry(specForRung(1)), // rebound by `welcome`
    verdict: null,
    lastPatron: null,
    myId: null,
    carrying: null,
    netStatus: "loopback",
  };
}
