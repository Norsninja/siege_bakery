/**
 * THE CAMPAIGN's data — which dessert each rung deals (plans/13 §4).
 *
 * SLICE 2 STAND-IN: every rung deals cake-3, on purpose — the container
 * (slice 1) and the spec refactor (slice 2) ship before the ladder. The
 * RUNGS table (per-rung spec/clock/asks/pay) arrives with slice 3, AFTER
 * the re-pin tools have measured the other spec rows — no rung's ask is
 * pinned until its spec has run research/13 + research/11 (the re-pin law
 * of the ladder, plans/13 §4). Until then this function is the one seam
 * both replicas look a rung up through: the wire carries the RUNG NUMBER,
 * never geometry (the wire law, plans/13 §3).
 *
 * game/ law: imports core/ only, like tuning.ts.
 */
import { CAKE_3, type DessertSpec } from "../core/dessert";

/** The spec rung N deals. Total: any rung number answers (the lobby's
 * dormant order is "the next run's rung 1"; a runover welcome carries the
 * died-on rung) — callers never clamp. */
export function specForRung(_rung: number): DessertSpec {
  return CAKE_3;
}
