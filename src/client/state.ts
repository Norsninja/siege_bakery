/**
 * MatchView — everything the client knows about the match, in ONE typed
 * object instead of a dozen closure variables (M3 of the decomp phase,
 * plans/06). Server-echoed truth (machine, order, checks, verdict, patron,
 * id) plus the two client-local fields the HUD reads alongside them
 * (carrying, netStatus). net-handlers.ts mutates it; main.ts and hud.ts
 * read it.
 */
import { createCatapult, type CatapultState } from "../game/catapult";
import type { Judgment, RequirementCheck } from "../game/judgment";
import { createOrder, type OrderState } from "../game/order";
import type { NetStatus } from "./hud";

export interface MatchView {
  machine: CatapultState;
  crankTicks: number;
  screwTicks: number;
  order: OrderState;
  checks: RequirementCheck[];
  /** Rides the order message that ENDS the order; null while running. */
  verdict: Judgment | null;
  lastPatron: { text: string; seq: number } | null;
  myId: number | null;
  /** Client-local inventory (plans/02): what's in MY hands. */
  carrying: string | null;
  netStatus: NetStatus;
}

/** Placeholders until `welcome` arrives. */
export function createMatchView(): MatchView {
  return {
    machine: createCatapult(),
    crankTicks: 0,
    screwTicks: 0,
    order: createOrder([], 90 * 60), // rows arrive with `welcome`
    checks: [],
    verdict: null,
    lastPatron: null,
    myId: null,
    carrying: null,
    netStatus: "loopback",
  };
}
