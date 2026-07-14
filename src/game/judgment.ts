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
import { tierLabel, type DessertGeometry, type ZoneId } from "../core/dessert";
import type { Vec3 } from "../core/ballistics";
import type { FrostingField } from "../core/frosting";
import { canCrown, deliveryWeight } from "./toppings";
import { CHERRY_IMPRESS, SPRINKLE_IMPRESS } from "./tuning";

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
  /** Frost this ABSOLUTE fraction of the WHOLE cake (plans/22 step 4 —
   * supersedes the of-potential ask). `floorCoverage` is the pass floor
   * (Gate 1); the check's `current` is the live absolute covered fraction.
   * No reach or labor denominator — geometry scales the difficulty (a
   * bigger cake makes the same fraction harder to reach). */
  | { kind: "frost-coverage"; floorCoverage: number }
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

/** The crown's holder: the uppermost on-cake settled CROWN-CLASS solid
 * (strictly greatest rest y; ledger order breaks exact ties). Paint
 * entries are mess bookkeeping, not crown contenders; grains are garnish
 * and NEVER crown (plans/10 §3 — a wild sprinkle atop the summit must not
 * usurp the cherry). Shared by crown rows and the DESIRE machinery
 * (plans/13 §1 flourish — the ledger-judged fatality). */
export function crownHolder(
  settled: readonly SettledTopping[],
): SettledTopping | null {
  let uppermost: SettledTopping | null = null;
  for (const s of settled) {
    if (!canCrown(s.topping)) continue;
    if (s.onCake && (uppermost === null || s.pos.y > uppermost.pos.y))
      uppermost = s;
  }
  return uppermost;
}

/** "The summit is claimed by THIS topping" — crown semantics as one
 * predicate: the crown holder is `topping` AND rests on the top tier.
 * Decoy-proof both ways (a lime can knock the cherry off but never
 * impersonate it). The desire's eligibility check (plans/13 §1): applied
 * to the LIVE ledger at each conclusion point, whenever it was thrown. */
export function crownedWith(
  dessert: DessertGeometry,
  settled: readonly SettledTopping[],
  topping: string,
): boolean {
  const u = crownHolder(settled);
  return (
    u !== null &&
    u.topping === topping &&
    dessert.tierOf(u.pos) === dessert.topTier
  );
}

/** Census every row against everything at rest and the frosting field.
 * Pure; called by the Room after each delivery and each Patron amendment.
 * `dessert` is the deal's geometry (spec refactor, plans/13 §3) — the
 * crown's summit and the zone oracle are per-spec now. */
export function checkRequirements(
  dessert: DessertGeometry,
  reqs: readonly Requirement[],
  settled: readonly SettledTopping[],
  frosting: FrostingField,
): RequirementCheck[] {
  // The crown cares about the WHOLE cake, not just its own topping —
  // computed once, shared by every crown row.
  const uppermost = crownHolder(settled);
  return reqs.map((req) => {
    if (req.kind === "crown") {
      const met =
        uppermost !== null &&
        uppermost.topping === req.topping &&
        dessert.tierOf(uppermost.pos) === dessert.topTier;
      return { req, current: met ? 1 : 0, target: 1, met };
    }
    if (req.kind === "frost-coverage") {
      // ABSOLUTE (plans/22 step 4): how much of the WHOLE cake is painted.
      const current = frosting.coverage();
      return {
        req,
        current,
        target: req.floorCoverage,
        met: current >= req.floorCoverage,
      };
    }
    let current = 0;
    for (const s of settled) {
      if (s.topping !== req.topping) continue;
      if (
        req.kind === "count-on-cake"
          ? s.onCake
          : req.kind === "on-frosting"
            ? s.onCake && frosting.frostedNear(s.pos)
            : dessert.isInZone(req.zone, s.pos)
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
  /** THE DRESSING's crown (plans/23): the patron's optional cherry. When
   * crowned it lifts the grade like every other dressing element — a
   * structural slice of OrderState.desire (absent = no flourish this deal). */
  desire?: { topping: string };
  /** The star tiers, ABSOLUTE fractions (plans/22 step 4) — graded against
   * IMPRESS now (coverage + dressing, plans/23), not coverage alone: 2★ at
   * star2Coverage, 3★ at star3Coverage. Per-rung (campaign.ts) — flat on
   * the cake ladder, bespoke on the cupcake; defaults in createOrder. */
  star2Coverage: number;
  star3Coverage: number;
}

export interface Judgment {
  /** THE ONE GATE (plans/23 — the relax, supersedes the two-gate
   * met/accepted): the frosting FLOOR. accepted = coverage ≥ floor — the
   * giant takes any real cake, dressed or not. Below the floor (no cake at
   * all) is the ONLY total fail — the sole zero, and it is rare. */
  accepted: boolean;
  stars: 0 | 1 | 2 | 3;
  checks: RequirementCheck[];
  /** ABSOLUTE frosting coverage of the whole cake (plans/22 step 4) — the
   * climb's SPINE. The report reads it ("you frosted 31% of the cake"). */
  coverage: number;
  /** THE DRESSING (plans/23): sprinkles landed + the cherry crowned, as a
   * small coverage-EQUIVALENT bonus (0..~0.08). It ADDS to the grade and
   * never gates — missing dressing costs stars, never zeroes a real cake. */
  dressing: number;
  /** coverage + dressing, capped at 1 — the number the STARS grade against
   * ("dressed to impress"). Coverage dominates; dressing tips you over a
   * nearby tier, never carries a bare cake a whole tier (tuning bounds it). */
  impress: number;
  /** THE FLOURISH (plans/13 §1 finish-it amendment, 2026-07-09): the
   * desire landed — the coda. Stamped by the ROOM at each conclusion
   * point from the live ledger (accepted verdicts only). Its coin bonus is
   * distinct from its dressing star-lift (plans/23 §7 sub-ruling: keep
   * both — a hard physical feat earns its own beat AND counts as dressing). */
  flourish?: true;
}

/**
 * Render the verdict — THE RELAX (plans/23): one gate, an additive climb.
 *
 * ONE GATE — the frosting FLOOR: coverage ≥ the frost row's floorCoverage.
 * Above it the cake is ACCEPTED and served; below it (no cake at all) is the
 * sole total fail. The two-gate model is gone — no more "met every row but
 * REFUSED", no more one-missed-sprinkle HUNGRY (plans/23 §4).
 *
 * THE CLIMB — stars grade against IMPRESS = coverage + dressing. Coverage is
 * the spine (ABSOLUTE, whole-cake — plans/22 step 4); DRESSING (sprinkles +
 * the crowned cherry) is a small coverage-equivalent that lifts you toward
 * the next tier without ever gating. Partial dressing = partial lift, no
 * cliff — so burying your own sprinkles just contributes a little less
 * (plans/23 §4.4, the gotcha dissolves). 1★ = accepted, 2★ = star2Coverage,
 * 3★ = star3Coverage, read on IMPRESS. Waste, neatness, mess, and the 0..100
 * assembly score are RETIRED from the grade (plans/23 §4/§5): the difficulty
 * lives in the craft, not the rulebook; mess moves to the realm's favor
 * (step 9), neatness is cut, waste is dropped.
 */
export function judge(
  dessert: DessertGeometry,
  order: JudgedOrder,
  settled: readonly SettledTopping[],
  frosting: FrostingField,
): Judgment {
  const checks = checkRequirements(dessert, order.requirements, settled, frosting);
  const coverage = frosting.coverage();

  // THE ONE GATE (plans/23): the frosting floor. Any cake above it is served;
  // below it the giant has no cake at all — the only zero.
  let floor = 0;
  for (const r of order.requirements)
    if (r.kind === "frost-coverage") floor = r.floorCoverage;
  const accepted = coverage >= floor;

  // THE DRESSING (plans/23): sprinkles landed (proportional) + the cherry
  // crowned, each a small coverage-equivalent. It LIFTS the grade, never
  // gates it — a partial sprinkle count is a partial lift.
  const sprinkles = checks.find(
    (c) => c.req.kind === "on-frosting" && c.req.topping === "sprinkles",
  );
  const sprinkleFrac =
    sprinkles && sprinkles.target > 0
      ? Math.min(1, sprinkles.current / sprinkles.target)
      : 0;
  const cherryCrowned = order.desire
    ? crownedWith(dessert, settled, order.desire.topping)
    : false;
  const dressing =
    sprinkleFrac * SPRINKLE_IMPRESS + (cherryCrowned ? CHERRY_IMPRESS : 0);

  const impress = Math.min(1, coverage + dressing);
  let stars: 0 | 1 | 2 | 3 = 0;
  if (accepted)
    stars =
      impress >= order.star3Coverage
        ? 3
        : impress >= order.star2Coverage
          ? 2
          : 1;

  return { accepted, stars, checks, coverage, dressing, impress };
}

/** One row's words — shared by the HUD checklist and the end banner.
 * "×" dodges pluralization (cherry/cherries) in a data-driven pantry.
 * `topTier` is the deal's summit index (DessertGeometry.topTier) — zone
 * words are per-spec since the refactor (core/dessert tierLabel: BOTTOM/
 * MIDDLE/TOP reproduce cake-3's names exactly). */
export function describeRequirement(req: Requirement, topTier: number): string {
  if (req.kind === "crown") return `1 × ${req.topping} AS THE CROWN`;
  // Absolute now (plans/22 step 4): the ask is a share of the WHOLE cake.
  if (req.kind === "frost-coverage")
    return `FROST ${Math.round(req.floorCoverage * 100)}% OF THE CAKE`;
  if (req.kind === "on-frosting")
    return `${req.needed} × ${req.topping} ON THE FROSTING`;
  const where =
    req.kind === "count-on-cake" || req.zone === "cake"
      ? "ON the cake"
      : tierLabel(req.zone, topTier);
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
