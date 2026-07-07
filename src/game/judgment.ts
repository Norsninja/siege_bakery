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
import { isInZone, tierOf, TOP_TIER, type ZoneId } from "../core/arena";
import type { Vec3 } from "../core/ballistics";
import type { FrostingField } from "../core/frosting";
import { canCrown, deliveryWeight } from "./toppings";

export type Requirement =
  | { kind: "count-on-cake"; topping: string; needed: number }
  | { kind: "count-in-zone"; topping: string; zone: ZoneId; needed: number }
  /** THE CROWN (plans/05): the uppermost settled SOLID on the cake must
   * be this topping, resting on the TOP TIER — the summit claimed, nothing
   * above it. Physicalizes the 2D countCrown support-chain. A wrong solid
   * landing higher LATER un-mets the row — the pantry decoy is a hazard.
   * Paint never crowns and never usurps (plans/07): a splash cannot be
   * picked back up, so letting it void the crown would be unrecoverable. */
  | { kind: "crown"; topping: string }
  /** Frost this fraction of the firing line's POTENTIAL coverage — the
   * one fractional row. A round cake only shows each town its near
   * hemisphere, so `potential` is the AUTHORED ask ceiling the deal hands
   * this row (game/tuning.ts TOWN_ASK_POTENTIAL — Option B, 2026-07-07;
   * TOWN_POTENTIAL is the MEASURED reference and is never dealt), and
   * `frac` is the ask as a share of that: the Patron grades against what
   * was asked — "that's pretty good for one town" (plans/08). current is
   * the live covered-fraction-of-potential. */
  | { kind: "frost-coverage"; frac: number; potential: number }
  /** Solids that count only where frosting already is — the 2D support-
   * chain rule ("sprinkles sit ON frosting"), re-bodied as a census lookup.
   * Live recompute like every row: frost applied UNDER a waiting sprinkle
   * later still counts it (accepted quirk, plans/07). */
  | { kind: "on-frosting"; topping: string; needed: number };

/** Rows with a whole-number target — the only rows the Patron may tighten
 * ("MORE. SPRINKLES."); there is no such thing as more crown, and the
 * frost fraction is a promise, not a count. */
export type CountRequirement = Extract<Requirement, { needed: number }>;

export function isCountRow(req: Requirement): req is CountRequirement {
  return "needed" in req;
}

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

/** Fraction of settled DELIVERIES off the cake, burst-weighted (plans/10
 * §3): grains weigh 1/grains each, so one wild burst is ONE mistake — not
 * forty floor entries drowning the axis. THE one mess arithmetic: judge()
 * and the Patron's thunder rule (order-flow) both read this — the Giant
 * must not thunder forty times harder at one bad pop. */
export function weighedMess(settled: readonly SettledTopping[]): number {
  let weight = 0;
  let off = 0;
  for (const s of settled) {
    const w = deliveryWeight(s.topping);
    weight += w;
    if (!s.onCake) off += w;
  }
  return weight > 0 ? off / weight : 0;
}

/** Census every row against everything at rest and the frosting field.
 * Pure; called by the Room after each delivery and each Patron amendment. */
export function checkRequirements(
  reqs: readonly Requirement[],
  settled: readonly SettledTopping[],
  frosting: FrostingField,
): RequirementCheck[] {
  // The crown cares about the WHOLE cake, not just its own topping: the
  // uppermost on-cake settled CROWN-CLASS solid (strictly greatest rest y;
  // ledger order breaks exact ties) — computed once, shared by every crown
  // row. Paint entries are mess bookkeeping, not crown contenders; grains
  // are garnish and NEVER crown (plans/10 §3 — a wild sprinkle atop the
  // summit must not usurp the cherry).
  let uppermost: SettledTopping | null = null;
  for (const s of settled) {
    if (!canCrown(s.topping)) continue;
    if (s.onCake && (uppermost === null || s.pos.y > uppermost.pos.y))
      uppermost = s;
  }
  return reqs.map((req) => {
    if (req.kind === "crown") {
      const met =
        uppermost !== null &&
        uppermost.topping === req.topping &&
        tierOf(uppermost.pos) === TOP_TIER;
      return { req, current: met ? 1 : 0, target: 1, met };
    }
    if (req.kind === "frost-coverage") {
      // Of-reach, clamped: beating the measured ceiling reads "all of it".
      const current = Math.min(1, frosting.coverage() / req.potential);
      return { req, current, target: req.frac, met: current >= req.frac };
    }
    let current = 0;
    for (const s of settled) {
      if (s.topping !== req.topping) continue;
      if (
        req.kind === "count-on-cake"
          ? s.onCake
          : req.kind === "on-frosting"
            ? s.onCake && frosting.frostedNear(s.pos)
            : isInZone(req.zone, s.pos)
      )
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
  /** The star tiers, fractions of potential coverage (plans/08): 2★ at
   * goodFrac, 3★ at excellentFrac. Defaults from game/tuning.ts land in
   * createOrder; per-patron tiers are the orders-as-data future. */
  goodFrac: number;
  excellentFrac: number;
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
  coverage: number;
  /** Coverage as a fraction of the firing line's potential (plans/08) —
   * what the tiers and the score axis actually grade. `coverage` above
   * stays ABSOLUTE for the dessert report ("you frosted 31% of the cake");
   * this is "you frosted 74% of what you could reach". */
  effectiveCoverage: number;
  neatness: number;
  integrity: number;
  mess: number;
  waste: number;
}

/**
 * Render the verdict — the 2D judge(), weights HOME (plans/07): 0.35
 * coverage + 0.15 neatness + 0.25 integrity + 0.15 (1-mess) + 0.10 waste.
 * The coverage axis is color-blind, of-POTENTIAL, and normalized against
 * the EXCELLENCE tier (plans/08) — overshooting the ask keeps earning
 * score all the way to the ceiling; gate 1 asks "did you do what was
 * asked", gate 2 asks "is it good". STARS come from the coverage tiers,
 * not score arithmetic (plans/08: "50 is just passing, encourage 70 and
 * 90; 3★ is meant to be rare"): accepted = 1★, goodFrac of potential =
 * 2★, excellentFrac = 3★ — legible percent goals the HUD can print. An
 * order with no frost row grades as potential 1 over the raw census, so
 * its upper stars are honestly out of reach — every real order frosts
 * first. INTEGRITY is constant 1 until the Bite exists — honest: the cake
 * is undamaged, full credit, and the axis is wired for the carve slice.
 * MESS counts every settled delivery off-cake — floor frosting stings
 * exactly like floor limes.
 */
export function judge(
  order: JudgedOrder,
  settled: readonly SettledTopping[],
  frosting: FrostingField,
  shotsFired: number,
): Judgment {
  const checks = checkRequirements(order.requirements, settled, frosting);
  const met = checks.length > 0 && checks.every((c) => c.met);

  const coverage = frosting.coverage();
  const frostReq = order.requirements.find((r) => r.kind === "frost-coverage");
  const effectiveCoverage = Math.min(1, coverage / (frostReq?.potential ?? 1));
  const neatness = frosting.neatness();
  const integrity = 1; // the Bite's axis, waiting for its slice

  const mess = weighedMess(settled);
  const waste =
    shotsFired <= order.parShots ? 1 : order.parShots / Math.max(1, shotsFired);

  const score = Math.max(
    0,
    Math.round(
      100 *
        (0.35 * Math.min(1, effectiveCoverage / order.excellentFrac) +
          0.15 * neatness +
          0.25 * integrity +
          0.15 * (1 - mess) +
          0.1 * waste),
    ),
  );
  const accepted = met && score >= order.passScore;
  let stars: 0 | 1 | 2 | 3 = 0;
  if (accepted) {
    stars =
      effectiveCoverage >= order.excellentFrac
        ? 3
        : effectiveCoverage >= order.goodFrac
          ? 2
          : 1;
  }
  return {
    met,
    accepted,
    score,
    stars,
    checks,
    coverage,
    effectiveCoverage,
    neatness,
    integrity,
    mess,
    waste,
  };
}

const ZONE_LABELS: Record<ZoneId, string> = {
  cake: "ON the cake",
  tier1: "on the BOTTOM TIER",
  tier2: "on the MIDDLE TIER",
  tier3: "on the TOP TIER",
};

/** One row's words — shared by the HUD checklist and the end banner.
 * "×" dodges pluralization (cherry/cherries) in a data-driven pantry. */
export function describeRequirement(req: Requirement): string {
  if (req.kind === "crown") return `1 × ${req.topping} AS THE CROWN`;
  // "YOUR SIDE": one town reaches its near hemisphere (plans/08) — the ask
  // reads as a number the table can actually hit, whatever the town count.
  if (req.kind === "frost-coverage")
    return `FROST ${Math.round(req.frac * 100)}% OF YOUR SIDE`;
  if (req.kind === "on-frosting")
    return `${req.needed} × ${req.topping} ON THE FROSTING`;
  const where =
    req.kind === "count-on-cake" ? ZONE_LABELS.cake : ZONE_LABELS[req.zone];
  return `${req.needed} × ${req.topping} ${where}`;
}

/** One row's live numbers — counts as counts, the frost fraction as
 * percent. Shared by the HUD checklist; the ONE-NUMBER LAW's display half
 * (plans/07: every row reads as one number of one thing). The current
 * side FLOORS (audit 2026-07-03): met is computed on the raw fraction,
 * and 24.96% rounding up would read "✗ 25%/25%" — the numbers claiming
 * done while the checkmark says no. */
export function describeProgress(c: RequirementCheck): string {
  if (c.req.kind === "frost-coverage")
    return `${Math.floor(c.current * 100)}%/${Math.round(c.target * 100)}%`;
  return `${c.current}/${c.target}`;
}
