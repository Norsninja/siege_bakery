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
import { isPaint } from "./toppings";

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
  /** Frost this fraction of the cake's sampled skin (plans/07). current is
   * the live covered fraction (0..1) — the one fractional row. */
  | { kind: "frost-coverage"; frac: number }
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

/** Census every row against everything at rest and the frosting field.
 * Pure; called by the Room after each delivery and each Patron amendment. */
export function checkRequirements(
  reqs: readonly Requirement[],
  settled: readonly SettledTopping[],
  frosting: FrostingField,
): RequirementCheck[] {
  // The crown cares about the WHOLE cake, not just its own topping: the
  // uppermost on-cake settled SOLID (strictly greatest rest y; ledger order
  // breaks exact ties) — computed once, shared by every crown row. Paint
  // entries in the ledger are mess bookkeeping, not crown contenders.
  let uppermost: SettledTopping | null = null;
  for (const s of settled) {
    if (isPaint(s.topping)) continue;
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
      const current = frosting.coverage();
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
  neatness: number;
  integrity: number;
  mess: number;
  waste: number;
}

/**
 * Render the verdict — the 2D judge(), weights HOME (plans/07): 0.35
 * coverage + 0.15 neatness + 0.25 integrity + 0.15 (1-mess) + 0.10 waste.
 * The coverage axis is color-blind and normalized against the order's frost
 * row (0.4 default, as in 2D) — gate 1 asks "did you do what was asked",
 * gate 2 asks "is it good". INTEGRITY is constant 1 until the Bite exists —
 * honest: the cake is undamaged, full credit, and the axis is wired for the
 * carve slice. MESS counts every settled delivery off-cake — floor frosting
 * stings exactly like floor limes.
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
  const required = Math.max(frostReq?.frac ?? 0.4, 1e-6);
  const neatness = frosting.neatness();
  const integrity = 1; // the Bite's axis, waiting for its slice

  const total = settled.length;
  const offCake = settled.filter((s) => !s.onCake).length;
  const mess = total > 0 ? offCake / total : 0;
  const waste =
    shotsFired <= order.parShots ? 1 : order.parShots / Math.max(1, shotsFired);

  const score = Math.max(
    0,
    Math.round(
      100 *
        (0.35 * Math.min(1, coverage / required) +
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
      score >= order.passScore + 30 ? 3 : score >= order.passScore + 15 ? 2 : 1;
  }
  return {
    met,
    accepted,
    score,
    stars,
    checks,
    coverage,
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
  if (req.kind === "frost-coverage")
    return `FROST ${Math.round(req.frac * 100)}% OF THE CAKE`;
  if (req.kind === "on-frosting")
    return `${req.needed} × ${req.topping} ON THE FROSTING`;
  const where =
    req.kind === "count-on-cake" ? ZONE_LABELS.cake : ZONE_LABELS[req.zone];
  return `${req.needed} × ${req.topping} ${where}`;
}

/** One row's live numbers — counts as counts, the frost fraction as
 * percent. Shared by the HUD checklist; the ONE-NUMBER LAW's display half
 * (plans/07: every row reads as one number of one thing). */
export function describeProgress(c: RequirementCheck): string {
  if (c.req.kind === "frost-coverage")
    return `${Math.round(c.current * 100)}%/${Math.round(c.target * 100)}%`;
  return `${c.current}/${c.target}`;
}
