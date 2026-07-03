/**
 * Crosshair interactions + the banner latch — PURE per-tick decisions
 * (checkpoint audit 2026-07-03: these rules had quietly re-accreted into
 * main.ts's tick body, where nothing could test them — the decomp law says
 * main.ts is wiring only). main.ts feeds the tick's inputs and executes the
 * returned effects; the RULES live here, under vitest.
 *
 * These are client-side PREDICTIONS of Room law (the authority re-checks
 * everything): pickup wants empty hands, the lever always executes (a dry
 * release is a mistake that executes — the flash is the comedy), a load
 * wants full hands and an empty bucket. If the Room's rules move, move
 * these WITH them — that drift is exactly what the tests exist to catch.
 */
import type { OrderState } from "../game/order";
import { SHELF_TOPPING, type InteractableKind } from "./hud";

/** The messages an interaction may send (a subset of ClientMsg). */
export type InteractionMsg = { t: "lever" } | { t: "load"; topping: string };

export interface TickInteraction {
  /** Hands after the interaction (pickup fills them, a load empties them). */
  carrying: string | null;
  /** Messages to send, in order. */
  send: InteractionMsg[];
  flash: { msg: string; ms: number } | null;
}

const NOTHING = (carrying: string | null): TickInteraction => ({
  carrying,
  send: [],
  flash: null,
});

/** One E-edge against whatever the crosshair reads. Pure. */
export function tickInteraction(
  eEdge: boolean,
  target: InteractableKind | null,
  carrying: string | null,
  machineLoaded: string | null,
): TickInteraction {
  if (!eEdge || target === null) return NOTHING(carrying);
  // Pantry pickup: hands must be empty, one topping at a time.
  const shelf = SHELF_TOPPING[target];
  if (shelf !== undefined)
    return carrying === null ? { carrying: shelf, send: [], flash: null } : NOTHING(carrying);
  // The release lever ALWAYS executes — empty bucket included.
  if (target === "lever")
    return {
      carrying,
      send: [{ t: "lever" }],
      flash:
        machineLoaded === null
          ? { msg: "dry release — the crank was for nothing", ms: 2500 }
          : null,
    };
  // Loading wants full hands and an (as-this-client-knows-it) empty bucket.
  if (target === "bucket" && carrying !== null && machineLoaded === null)
    return { carrying: null, send: [{ t: "load", topping: carrying }], flash: null };
  return NOTHING(carrying);
}

/** The banner latch: when to show the verdict, when the fresh deal clears
 * it. Returns the transition (or null); the caller owns the DOM. */
export function bannerLatch(
  status: OrderState["status"],
  shown: boolean,
): "show" | "hide" | null {
  if (status !== "running" && !shown) return "show";
  if (status === "running" && shown) return "hide";
  return null;
}
