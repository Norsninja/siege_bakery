/**
 * The Judgment, gate 1 — typed requirements checked against what has come
 * to REST (slice 2, plans/03). Ported from the 2D rules lab
 * (artillery/src/game/judgment.ts, READ-ONLY): an order is a MUTABLE list
 * of typed rows the Patron may append to or tighten mid-order; a
 * RequirementCheck is one row's live progress, for gating and the HUD
 * checklist (a failed order must NAME the culprit — 2D playtest lesson).
 *
 * The 2D cell census becomes rest-position counting: the Room keeps a
 * ledger of settled toppings (topping, rest position, on-cake) and every
 * row counts from it. Frosting-coverage rows arrive with the frosting
 * slice; judge() itself — gate 2, the assembly score — lands in Step 2.
 *
 * game/ law: pure data + pure functions, imports core/ only.
 */
import { isInZone, type ZoneId } from "../core/arena";
import type { Vec3 } from "../core/ballistics";

export type Requirement =
  | { kind: "count-on-cake"; topping: string; needed: number }
  | { kind: "count-in-zone"; topping: string; zone: ZoneId; needed: number };

/** One topping at rest — the Room's ledger entry, the census unit. */
export interface SettledTopping {
  topping: string;
  pos: Vec3;
  onCake: boolean;
}

/** Live progress of one row, for gating and the HUD checklist. */
export interface RequirementCheck {
  req: Requirement;
  current: number;
  target: number;
  met: boolean;
}

/** Census every row against everything at rest. Pure; called by the Room
 * after each settle (and, from Step 4, after a Patron amendment). */
export function checkRequirements(
  reqs: readonly Requirement[],
  settled: readonly SettledTopping[],
): RequirementCheck[] {
  return reqs.map((req) => {
    let current = 0;
    for (const s of settled) {
      if (s.topping !== req.topping) continue;
      if (req.kind === "count-on-cake" ? s.onCake : isInZone(req.zone, s.pos))
        current++;
    }
    return { req, current, target: req.needed, met: current >= req.needed };
  });
}

const ZONE_LABELS: Record<ZoneId, string> = {
  cake: "ON the cake",
  peak: "DEAD CENTER",
};

/** One row's words — shared by the HUD checklist and the end banner.
 * "×" dodges pluralization (cherry/cherries) in a data-driven pantry. */
export function describeRequirement(req: Requirement): string {
  const where =
    req.kind === "count-on-cake" ? ZONE_LABELS.cake : ZONE_LABELS[req.zone];
  return `${req.needed} × ${req.topping} ${where}`;
}
