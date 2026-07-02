/**
 * Orders — the toy version. game/ law: pure data, imports core/ only.
 *
 * An order asks for N of a topping ON the cake before the clock runs out.
 * The scoring truth is PHYSICAL (decided with the visionary, 2026-07-02):
 * a topping counts when it comes to REST on the cake. Hit the top and roll
 * off the back — the patron gets nothing. Speed matters only through its
 * real consequence; there is no arbitrary scoring threshold. Splat-vs-place
 * stays a readout until real Judgment lands.
 *
 * The client decides WHERE a settled topping is (level geometry is its
 * problem) and reports only (topping, onCake). Wrong toppings land and lie
 * there — mistakes execute, they never block, they just don't count.
 */

export interface OrderState {
  topping: string;
  needed: number;
  delivered: number;
  ticksLeft: number;
  status: "running" | "won" | "lost";
}

export function createOrder(
  topping: string,
  needed: number,
  ticks: number,
): OrderState {
  return { topping, needed, delivered: 0, ticksLeft: ticks, status: "running" };
}

/** One fixed tick of clock. Time only moves while the order is running. */
export function tickOrder(state: OrderState): OrderState {
  if (state.status !== "running") return state;
  const ticksLeft = state.ticksLeft - 1;
  if (ticksLeft <= 0) return { ...state, ticksLeft: 0, status: "lost" };
  return { ...state, ticksLeft };
}

/** A topping came to rest. Counts only if it matches, it's on the cake,
 * and the order is still live. */
export function deliverTopping(
  state: OrderState,
  topping: string,
  onCake: boolean,
): OrderState {
  if (state.status !== "running") return state;
  if (!onCake || topping !== state.topping) return state;
  const delivered = state.delivered + 1;
  return {
    ...state,
    delivered,
    status: delivered >= state.needed ? "won" : "running",
  };
}
