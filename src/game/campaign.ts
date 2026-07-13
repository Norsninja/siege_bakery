/**
 * THE CAMPAIGN's data — the ladder (plans/13 §4, authored slice 3).
 *
 * THE RUNGS TABLE, v1 — authored 2026-07-08 (fourth session) against
 * the slice-3 measurements (research/13 + research/11, every row run
 * through both under the clamped 2.5°×12 ladder — the re-pin law of
 * the ladder holds: no ask below was pinned before its measurement).
 * Every ask is a FEEL-PASS HYPOTHESIS pinned against measured honesty;
 * rung 3 is THE ANCHOR — today's live numbers verbatim, never
 * rebalanced here.
 *
 * WHAT THE TOOLS SAID (2026-07-08, logs in the session record; the
 * summit line = (click, notch) combos whose FIRST impact rests on the
 * top tier at traverse 0 — the crown ask's honesty):
 *
 *   spec     census  T1-reach≤10  summit combos    the rung's character
 *   cake-1     433      92.1%     22 (4 place)     tutorial-by-play
 *   cake-2     568      90.3%     16 (1 place)     teaches the ledge
 *   cake-3     661      90.3%     12 (4 place)     THE ANCHOR
 *   cupcake     68      97.1%      8 (0 place!)    precision spike
 *   cake-4     701      89.4%      7 (4 place)     the climb begins
 *   cake-5     741      89.5%      4 (3 place)     the heroic crown
 *   cake-6     751      89.6%      0 — DEAD        the summit is a lie
 *
 * TOWN_POTENTIAL GENERALIZES: solo reach at the shipped ≤10 envelope
 * measured 89.4–92.1% on every cake row — the pinned 0.9 (game/tuning
 * .ts) holds for the whole ladder unchanged; union is 100.0% on EVERY
 * row (frost coverage never gates the ladder). One outlier, recorded:
 * the cupcake measures 97.1% solo (a small target is all money-band),
 * still served by the 0.9 pin — a hair MORE under than usual, honest
 * direction.
 *
 * THE CAKE-6 FINDING (the ladder's top, §4's law): T6-top windows
 * EXIST in physics — ~0.5–1° wide at tilt 13.0° (click 7) and 18.0°
 * (click 8) — but both fall BETWEEN the shipped 2.5° notches: the
 * machine cannot be dialed to them. The envelope dies by QUANTIZATION
 * at the summit. THE VISIONARY'S RULING (2026-07-08, fourth session):
 * cake-6 KEEPS the crown ask — THE IMPOSSIBLE TRAGEDY. The final rung
 * is deliberately unwinnable on today's machine ("necessity is the
 * mother of invention"): the run's story is DESIGNED to end here, and
 * the future economy sells the key — power-ups/upgrades (plans/15
 * item 6, post-campaign) that reach impossible spots. Until that
 * exists, the workload alone (~25 idealized two-town shots ≈ 44–49
 * human against a crew ceiling of ~30–44) already ends most runs
 * before the crown is even the problem.
 *
 * THE CUPCAKE FINDING: its 8 summit windows are ALL hot arrivals
 * (v ≥ SPLAT_SPEED — the target is low, the ball comes in fast), so a
 * crown may bounce where cake rows could PLACE it gently. Kept
 * crown: true — the precision spike is the point — FLAGGED for the
 * feel pass: if crowns skid off in play, the cupcake's clock or
 * position moves before its ask does.
 *
 * Ask math yardstick — SUPERSEDED for coverage by plans/22 step 4: the
 * frost ask is ABSOLUTE now (asks.floorCoverage of the whole cake, no
 * frostFrac × TOWN_ASK_POTENTIAL denominator; the star tiers are absolute
 * too). The sprinkle/par yardstick below still holds. HISTORICAL (the old
 * of-potential derivation): pass samples = frostFrac × TOWN_ASK_POTENTIAL
 * [towns] × census; ~16 samples per idealized shot (research/06 greedy:
 * 139 ≈ 8–9); the §4 sanity anchor sat below the four-friends 80% heroic
 * curve (48 solo / 39 two-town), margin shrinking as rungs climb.
 *
 * THE FLOURISH AMENDMENT (plans/13 §1, 2026-07-08 fifth session —
 * amends the impossible tragedy): the crown is an OPTIONAL FLOURISH
 * now, never a requirement — the fatality, style on top of a decided
 * outcome. asks.crown is the per-rung FLOURISH FLAG; the summit table
 * above survives untouched as the flourish's honesty ledger. Rung 7
 * is winnable by WORKLOAD alone = MASTER BAKER; landing the flourish
 * on cake-6's dead summit = ULTRA MASTER BAKER, impossible until the
 * economy sells the key. SLICE 4 SHIPS CROWN-SHELVED (no crown row
 * deals, patron rule 3 deleted); the flourish itself is slice 4b.
 *
 * PAR PER RUNG (slice-4 discussion): flat par 24 mechanically punished
 * the two-town play the high rungs demand (cake-6 duo pass ≈ 25
 * idealized shots alone), so par is an authored column now — priced
 * from the yardstick the way ORDER_PAR_SHOTS was (tuning.ts: par is a
 * good line's count, not a perfect one):
 *   par = round(passSamples / 7)            [~7 samples per HUMAN shot]
 *       + sprinkle bursts (40→1, 60→2, 80→3; two perfect bursts = 80
 *         exactly, zero grain slack, so the 80-ask budgets a third)
 *       + 1 flourish allowance on asks.crown rungs (style untaxed, 4b)
 *       + 1 slack
 * The anchor forces TWO columns ({solo, duo} — solo rung 3 must stay
 * 24 verbatim, and one flat number can't also serve the duo workload).
 * The deal picks by activeTowns; 3+ towns read duo (ask table clamps
 * the same way). ONE authored deviation: the cupcake reads 8/10 where
 * the formula says 5/7 — a 1.2 m disc makes misses the NORM, and par
 * pricing zero room to miss on the precision rung taxes its entire
 * point (feel-pass hypothesis like every ask).
 *
 * THE LADDER IS LIVE (slice 4): specForRung deals THIS table — deal +
 * asks + clock flipped together (the slice-3 boundary retired). The
 * deal decision lives in the Room (orderConcluded BEFORE dealFresh —
 * an OrderFlow self-deal would price the OLD rung's asks over the NEW
 * rung's cake).
 *
 * game/ law: imports core/ only, like tuning.ts.
 */
import { PRACTICE_TARGET, specById, type DessertSpec } from "../core/dessert";
import type { RunPhase } from "./run-flow";

export interface Rung {
  /** DessertSpec id (the wire name — the deal carries the RUNG NUMBER
   * and both replicas look the spec up here; the wire law, plans/13 §3). */
  spec: string;
  /** Per-rung order clock, seconds (nominal — patience is the real clock). */
  clockSeconds: number;
  /** THE SOLO CLOCK RELIEF, per rung (plans/15 item 26 addendum,
   * 2026-07-12): the clock stretch a LONE baker's ticket gets at the
   * deal (crew 2+ never stretches — duo zero-drift). The relief went
   * per-rung when the flat 1.25 over-relieved rung 2 by ~a minute (the
   * ferry-to-par ratio changes shape as tiers stack; rung 1 was the
   * only calibrated row). THE RULING: the relief is the TUTORIAL'S —
   * rung 1 = 1.25 (a fumbling first-timer), rung 2+ = 1.0 (the honest
   * row; solo stays the ladder that outruns one dwarf). Duo reads none
   * of this; only crew === 1 applies it. */
  soloClock: number;
  asks: {
    /** THE FROST FLOOR — the ABSOLUTE share of the WHOLE cake that passes
     * Gate 1 (plans/22 step 4; was frostFrac of potential). Flat on the
     * cake ladder (FLOOR_COVERAGE), bespoke on the cupcake. */
    floorCoverage: number;
    /** Sprinkle ask, in grains (bursts are 40; see SPRINKLES_NEEDED). */
    sprinkles: number;
    /** THE FLOURISH FLAG (§1 amendment — header): does this rung's
     * patron offer his desire when coverage turns great? NEVER a
     * requirement. cake-6's summit takes zero shipped combos — its
     * flourish is the ULTRA ask, impossible until the economy sells
     * the key; every other flourish row is measured reachable. */
    crown: boolean;
  };
  /** THE ABSOLUTE STAR TIERS (plans/22 step 4): 2★/3★ coverage of the
   * WHOLE cake. Flat across the CAKE ladder (STAR2_COVERAGE/STAR3_COVERAGE
   * — geometry scales the difficulty); the CUPCAKE overrides with its own
   * bespoke tiers (a tiny, fully-reachable target — a different game).
   * PROVISIONAL — tune against a real run (step 6 confirms + adds the
   * earned-time bridge). */
  stars: { two: number; three: number };
  /** Shots for full waste credit, authored per rung (header formula):
   * the deal picks solo (1 town) or duo (2+). Rung 3 solo = 24, the
   * anchor verbatim. */
  parShots: { solo: number; duo: number };
  pay: {
    /** Purse award for passing (plans/13 §5: ~10 × rung). */
    base: number;
    /** Per coverage star (the tuning.ts tiers). */
    perStar: number;
  };
}

/** The ladder, v1: rows 1..7 — cake-1/2/3 climb, THE CUPCAKE after the
 * anchor (§1 amendment: a precision spike, not a taller stack), then
 * 4/5/6 to the death of the envelope. Index = rung − 1. */
export const RUNGS: readonly Rung[] = [
  // 1 — the humble cake: teaches machine + frost. No sprinkles, no
  // flourish: one ask, one lesson (gentle by design, plans/13 §4).
  // clockSeconds RE-DERIVED to the reliable clock (plans/22 step 6): the
  // old nominal 180 × 0.72 (patience no longer drains) ≈ 130; earned time
  // adds on top for a productive line. soloClock 1.25 STAYS — THE TUTORIAL
  // RELIEF (item 26 addendum): rung 1 alone gets the base stretch (earned
  // time crew-scales toward a crew, so solo still needs base relief;
  // plans/22 §2.8). A first-timer learns the winch here.
  { spec: "cake-1", clockSeconds: 130, soloClock: 1.25, asks: { floorCoverage: 0.08, sprinkles: 0, crown: false }, stars: { two: 0.18, three: 0.35 }, parShots: { solo: 11, duo: 20 }, pay: { base: 10, perStar: 5 } },
  // 2 — teaches the ledge and the burst; still no flourish. soloClock 1.0:
  // the honest row (item 26: the flat 1.25 over-relieved this — the fold-in
  // plans/22 §2.8 names; nothing to re-relieve, it was already 1.0).
  // clockSeconds re-derived: 210 × 0.72 ≈ 150 (the reliable clock, step 6).
  { spec: "cake-2", clockSeconds: 150, soloClock: 1.0, asks: { floorCoverage: 0.08, sprinkles: 40, crown: false }, stars: { two: 0.18, three: 0.35 }, parShots: { solo: 19, duo: 32 }, pay: { base: 20, perStar: 5 } },
  // 3 — THE ANCHOR: par/sprinkles/pay verbatim (60 grains, solo par 24).
  // CLOCK re-derived to the reliable number (plans/22 step 6 supersedes the
  // anchor-verbatim law for the clock, as step 4 did for coverage): 300 ×
  // 0.72 = 216 (the old effective, patience baked in and retired). COVERAGE
  // is the flat 8% floor + 18/35 tiers (step 4), not the of-potential
  // 0.5/0.7/0.9.
  { spec: "cake-3", clockSeconds: 216, soloClock: 1.0, asks: { floorCoverage: 0.08, sprinkles: 60, crown: true }, stars: { two: 0.18, three: 0.35 }, parShots: { solo: 24, duo: 39 }, pay: { base: 30, perStar: 5 } },
  // 4 — THE CUPCAKE: tiny census (68), so the frost ask is samples-few
  // but every miss is floor waste; sprinkles must land on a 1.2m disc;
  // the flourish's 8 windows all arrive hot (header finding). Short
  // clock: a precision beat, not a marathon. Par carries the authored
  // miss allowance (header — the formula's 5/7 prices zero misses).
  // BESPOKE coverage tiers (plans/22 step 4): the cupcake is tiny and
  // fully reachable (solo covers 75–91%, research/21) — an absolute-flat
  // floor would gift 3★, so its floor + tiers ride high (55/70/85).
  { spec: "cupcake", clockSeconds: 108, soloClock: 1.0, asks: { floorCoverage: 0.55, sprinkles: 30, crown: true }, stars: { two: 0.70, three: 0.85 }, parShots: { solo: 8, duo: 10 }, pay: { base: 40, perStar: 5 } },
  // 5 — the climb begins: 701 census, 7 flourish windows.
  { spec: "cake-4", clockSeconds: 216, soloClock: 1.0, asks: { floorCoverage: 0.08, sprinkles: 60, crown: true }, stars: { two: 0.18, three: 0.35 }, parShots: { solo: 27, duo: 45 }, pay: { base: 50, perStar: 5 } },
  // 6 — the heroic flourish: FOUR windows (three PLACE at c8n1–3), the
  // last rung the flourish can honestly be offered on.
  { spec: "cake-5", clockSeconds: 238, soloClock: 1.0, asks: { floorCoverage: 0.08, sprinkles: 80, crown: true }, stars: { two: 0.18, three: 0.35 }, parShots: { solo: 32, duo: 53 }, pay: { base: 60, perStar: 5 } },
  // 7 — the top of the ladder. Winnable by WORKLOAD (barely): MASTER
  // BAKER. The flourish stands over a summit no shipped combo reaches —
  // the ULTRA ask, sold by the future economy (§1 amendment).
  { spec: "cake-6", clockSeconds: 259, soloClock: 1.0, asks: { floorCoverage: 0.08, sprinkles: 80, crown: true }, stars: { two: 0.18, three: 0.35 }, parShots: { solo: 37, duo: 61 }, pay: { base: 70, perStar: 5 } },
];

/** The Rung row for rung N (1-based), clamped into the ladder: below 1
 * reads rung 1 (the lobby's dormant order is "the next run's rung 1");
 * past the top reads the top — a defensive clamp only: winning the top
 * rung ENDS the run in triumph (RunFlow's MASTER BAKER terminal, §1
 * flourish amendment), so no live path ever asks past it. */
export function rungRow(rung: number): Rung {
  return RUNGS[Math.min(Math.max(rung, 1), RUNGS.length) - 1]!;
}

/** The spec rung N deals — THE LADDER, LIVE (slice 4: deal + asks +
 * clock flipped together; both replicas resolve through this one
 * function, so the client's geometry rebind follows the same table).
 * Total: any rung number answers — callers never clamp. The `!` is
 * honest because validateRungs() runs at Room boot. */
export function specForRung(rung: number): DessertSpec {
  return specById(rungRow(rung).spec)!;
}

/** THE STANDING GEOMETRY at any moment of the match (plans/15 item 25,
 * THE TRAINING LOBBY): outside a live run the cake mark holds the
 * PRACTICE TARGET — no cake before the order; the dessert arrives WITH
 * the first deal. Running and runover read the rung's spec (the final
 * cake stays on display under the run report). One pure derivation,
 * both replicas: the Room's redeal boundaries and every client rebind
 * resolve through here, so the two worlds can never disagree about
 * what stands at the mark (the patronAtMark discipline, applied to
 * the plate). */
export function dessertSpecFor(phase: RunPhase, rung: number): DessertSpec {
  if (phase === "running" || phase === "runover")
    return specForRung(Math.max(1, rung));
  return PRACTICE_TARGET; // lobby/countdown — the training ground
}

/** Every RUNGS row must name a real spec row — authoring tripwire,
 * exported for the test's use (and slice 4's boot validation). */
export function validateRungs(): void {
  for (const r of RUNGS) {
    if (!specById(r.spec)) throw new Error(`RUNGS row names unknown spec "${r.spec}"`);
  }
}
