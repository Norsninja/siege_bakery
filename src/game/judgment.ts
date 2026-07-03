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

/** What judge() needs to know about an order — a structural slice of
 * OrderState (order.ts imports this module; the reverse would be a cycle). */
export interface JudgedOrder {
  requirements: Requirement[];
  /** Shots for full waste credit; beyond this the score decays. */
  parShots: number;
  /** Gate 2: minimum assembly score the Patron will accept. */
  passScore: number;
}

export interface Judgment {
  /** Gate 1: every row satisfied? FAIL → the patron goes hungry. */
  met: boolean;
  /** Gate 2: met AND score ≥ passScore? FAIL → refused, the insulting kind. */
  accepted: boolean;
  score: number; // 0..100
  stars: 0 | 1 | 2 | 3;
  checks: RequirementCheck[];
  // The score axes, exposed for the HUD breakdown (all 0..1):
  mess: number;
  waste: number;
}

/**
 * Render the verdict — the 2D judge(), on the axes that exist without
 * frosting. 2D weights were 0.35 coverage + 0.15 neatness + 0.25 integrity
 * + 0.15 (1-mess) + 0.10 waste; coverage/neatness/integrity need frosting
 * and cake damage (next slice), so mess and waste carry the score at their
 * 2D ratio (3:2 → 0.6/0.4) until the other axes land and the weights
 * return home. MESS counts every settled topping off-cake — floor limes
 * sting exactly like floor cherries.
 */
export function judge(
  order: JudgedOrder,
  settled: readonly SettledTopping[],
  shotsFired: number,
): Judgment {
  const checks = checkRequirements(order.requirements, settled);
  const met = checks.length > 0 && checks.every((c) => c.met);

  const total = settled.length;
  const offCake = settled.filter((s) => !s.onCake).length;
  const mess = total > 0 ? offCake / total : 0;
  const waste =
    shotsFired <= order.parShots ? 1 : order.parShots / Math.max(1, shotsFired);

  const score = Math.max(0, Math.round(100 * (0.6 * (1 - mess) + 0.4 * waste)));
  const accepted = met && score >= order.passScore;
  let stars: 0 | 1 | 2 | 3 = 0;
  if (accepted) {
    stars =
      score >= order.passScore + 30 ? 3 : score >= order.passScore + 15 ? 2 : 1;
  }
  return { met, accepted, score, stars, checks, mess, waste };
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
