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
import {
  MACHINE_CONTROL_KINDS,
  SHELF_TOPPING,
  type InteractableKind,
  type ShopState,
} from "./hud";
import type { Post } from "./posts";

/** The messages an interaction may send (a subset of ClientMsg). */
export type InteractionMsg =
  | { t: "lever" }
  | { t: "load"; topping: string }
  | { t: "buy"; item: string };

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
  shop?: ShopState | null,
): TickInteraction {
  if (!eEdge || target === null) return NOTHING(carrying);
  // Pantry pickup: hands must be empty, one topping at a time.
  const shelf = SHELF_TOPPING[target];
  if (shelf !== undefined)
    return carrying === null ? { carrying: shelf, send: [], flash: null } : NOTHING(carrying);
  // THE STALL (plans/13 §5 amendment): one E, one purchase — the send
  // is the client's prediction of a buy the Room will honor; every
  // refusal is predicted in a flash from the same broadcast state (the
  // Room's silent drop never needs explaining). SOLD OUT presses do
  // nothing — the prompt already says so.
  if (target === "shop") {
    if (!shop || shop.owned) return NOTHING(carrying);
    if (!shop.open)
      return {
        carrying,
        send: [],
        flash: { msg: "the stall opens between orders", ms: 2500 },
      };
    if (shop.purse < shop.price)
      return {
        carrying,
        send: [],
        flash: {
          msg: `not enough coins — the purse holds ${shop.purse} of ${shop.price}`,
          ms: 2500,
        },
      };
    return {
      carrying,
      send: [{ t: "buy", item: "town2" }],
      flash: { msg: "🪙 TOWN 2 — the second fort wakes!", ms: 3500 },
    };
  }
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

// ---------------------------------------------------------------------------
// THE GUN CREW's E-edge law (plans/14; review 2026-07-08). Precedence:
// step off a post > walk-up pantry interaction > man the post you stand
// in — and each stage CONSUMES the edge only when it ACTS. The review
// caught the wiring version of this chain double-acting (stepping off
// ALSO loaded the bucket under the crosshair) and edge-eating (an
// empty-handed press at the bucket died instead of manning): rules in
// wiring is exactly what the decomp law forbids, so the chain lives
// here, under vitest.
// ---------------------------------------------------------------------------

/** The pantry-loop law: while the gun crew runs, the crosshair INTERACTS
 * with the bucket and shelves only — the machine's controls are worked
 * from posts. scene.bindTown drops those meshes from the raycast; this
 * filter is the belt to that suspender, and it is what keeps the lever
 * branch above unreachable (rollback re-opens it). */
export function pantryTarget(
  target: InteractableKind | null,
): InteractableKind | null {
  return target !== null && !MACHINE_CONTROL_KINDS.has(target) ? target : null;
}

/** Did the interaction DO anything — send, carry change, or flash? */
const acts = (act: TickInteraction, carryingBefore: string | null): boolean =>
  act.send.length > 0 || act.carrying !== carryingBefore || act.flash !== null;

/** Would an E press at this crosshair act? The HUD's post invite yields
 * to an actionable target (one press, one meaning — the invite must not
 * promise a man that resolveEEdge would give to the interaction). A dry
 * run of the real rules, never a copy of them. */
export function interactionActs(
  target: InteractableKind | null,
  carrying: string | null,
  machineLoaded: string | null,
  shop?: ShopState | null,
): boolean {
  return acts(
    tickInteraction(true, pantryTarget(target), carrying, machineLoaded, shop),
    carrying,
  );
}

export interface EEdgeResult {
  /** The post manned after the edge (the input `manned` when untouched). */
  manned: Post | null;
  /** The interaction's effects — the caller executes them either way
   * (NOTHING whenever the edge went to a post instead). */
  act: TickInteraction;
  /** True exactly when this edge MANNED a post (the camera welcome). */
  justManned: boolean;
}

/** One E edge, one meaning. Stepping off takes the WHOLE press; the
 * interaction claims it only by acting; what's left mans the zone. */
export function resolveEEdge(
  eEdge: boolean,
  manned: Post | null,
  target: InteractableKind | null,
  nearPost: Post | null,
  carrying: string | null,
  machineLoaded: string | null,
  shop?: ShopState | null,
): EEdgeResult {
  if (eEdge && manned !== null)
    return { manned: null, act: NOTHING(carrying), justManned: false };
  const act = tickInteraction(
    eEdge,
    pantryTarget(target),
    carrying,
    machineLoaded,
    shop,
  );
  if (eEdge && !acts(act, carrying) && nearPost !== null)
    return { manned: nearPost, act, justManned: true };
  return { manned, act, justManned: false };
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
