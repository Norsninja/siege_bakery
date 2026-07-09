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
 * at the summit. So cake-6's row asks NO crown (an ask that physics
 * forbids would break ask-honesty — the report would blame the crew's
 * aim for the machine's ladder); its near-impossibility is WORKLOAD:
 * ~25 idealized two-town shots ≈ 44–49 human ones against a crew
 * ceiling of ~30–44 in the effective clock. Every run's story ends
 * here — barely-winnable by a perfect crew, exactly §1's design. (If
 * play ever wants the cake-6 crown SHOT to exist, that is a tilt-table
 * design change — plans/15 item 7 territory, not a tuning tweak.)
 *
 * THE CUPCAKE FINDING: its 8 summit windows are ALL hot arrivals
 * (v ≥ SPLAT_SPEED — the target is low, the ball comes in fast), so a
 * crown may bounce where cake rows could PLACE it gently. Kept
 * crown: true — the precision spike is the point — FLAGGED for the
 * feel pass: if crowns skid off in play, the cupcake's clock or
 * position moves before its ask does.
 *
 * Ask math yardstick (tuning.ts header, generalized): pass samples =
 * frostFrac × TOWN_ASK_POTENTIAL[towns] × census; ~16 samples per
 * idealized shot (research/06 greedy: 139 ≈ 8–9). The §4 sanity
 * anchor holds for every row: pass ask in idealized shots sits below
 * the four-friends 80% heroic curve (48 solo / 39 two-town), margin
 * shrinking as rungs climb.
 *
 * SLICE-3 BOUNDARY: this table is DATA + pins only. specForRung still
 * deals CAKE_3 every rung — slice 4 wires RUNGS live (per-rung deal /
 * asks / clock) in one deliberate flip.
 *
 * game/ law: imports core/ only, like tuning.ts.
 */
import { CAKE_3, specById, type DessertSpec } from "../core/dessert";

export interface Rung {
  /** DessertSpec id (the wire name — the deal carries the RUNG NUMBER
   * and both replicas look the spec up here; the wire law, plans/13 §3). */
  spec: string;
  /** Per-rung order clock, seconds (nominal — patience is the real clock). */
  clockSeconds: number;
  asks: {
    /** The pass-tier fraction of the ask potential ("50% is just
     * passing" — the per-rung difficulty knob of that spirit). */
    frostFrac: number;
    /** Sprinkle ask, in grains (bursts are 40; see SPRINKLES_NEEDED). */
    sprinkles: number;
    /** Whether this rung demands the crown. NEVER author true against
     * a spec whose measured summit takes no shipped (click, notch) —
     * ask-honesty (the cake-6 finding above). */
    crown: boolean;
  };
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
  // crown: one ask, one lesson (gentle by design, plans/13 §4).
  { spec: "cake-1", clockSeconds: 150, asks: { frostFrac: 0.4, sprinkles: 0, crown: false }, pay: { base: 10, perStar: 5 } },
  // 2 — teaches the ledge and the burst; still no crown.
  { spec: "cake-2", clockSeconds: 210, asks: { frostFrac: 0.5, sprinkles: 40, crown: false }, pay: { base: 20, perStar: 5 } },
  // 3 — THE ANCHOR: today's live numbers verbatim (300s, FROST_FRAC
  // 0.5, SPRINKLES_NEEDED 60, crown). Never rebalanced from here.
  { spec: "cake-3", clockSeconds: 300, asks: { frostFrac: 0.5, sprinkles: 60, crown: true }, pay: { base: 30, perStar: 5 } },
  // 4 — THE CUPCAKE: tiny census (68), so the frost ask is samples-few
  // but every miss is floor waste; sprinkles must land on a 1.2m disc;
  // the crown's 8 windows all arrive hot (header finding). Short clock:
  // a precision beat, not a marathon.
  { spec: "cupcake", clockSeconds: 150, asks: { frostFrac: 0.6, sprinkles: 30, crown: true }, pay: { base: 40, perStar: 5 } },
  // 5 — the climb begins: 701 census, 7 crown windows.
  { spec: "cake-4", clockSeconds: 300, asks: { frostFrac: 0.55, sprinkles: 60, crown: true }, pay: { base: 50, perStar: 5 } },
  // 6 — the heroic crown: FOUR windows (three PLACE at c8n1–3), the
  // last rung a crown can honestly be asked on.
  { spec: "cake-5", clockSeconds: 330, asks: { frostFrac: 0.6, sprinkles: 80, crown: true }, pay: { base: 60, perStar: 5 } },
  // 7 — the top of the ladder: no crown BY MEASUREMENT (ask-honesty —
  // the summit takes no shipped combo); near-impossible by workload
  // against the clock. Every run's story ends here.
  { spec: "cake-6", clockSeconds: 360, asks: { frostFrac: 0.7, sprinkles: 80, crown: false }, pay: { base: 70, perStar: 5 } },
];

/** The Rung row for rung N (1-based), clamped into the ladder: below 1
 * reads rung 1 (the lobby's dormant order is "the next run's rung 1");
 * past the top reads the top (the ladder ends at the envelope's death —
 * a crew that somehow stands there replays the final rung). */
export function rungRow(rung: number): Rung {
  return RUNGS[Math.min(Math.max(rung, 1), RUNGS.length) - 1]!;
}

/** The spec rung N deals. SLICE-2/3 STAND-IN, still: every rung deals
 * cake-3 until slice 4 flips this to the RUNGS table (one deliberate
 * flip that wires deal + asks + clock together — a spec-only flip
 * would deal cake-1 under cake-3's clock and call it rung 1). Total:
 * any rung number answers — callers never clamp. */
export function specForRung(_rung: number): DessertSpec {
  return CAKE_3;
}

/** Every RUNGS row must name a real spec row — authoring tripwire,
 * exported for the test's use (and slice 4's boot validation). */
export function validateRungs(): void {
  for (const r of RUNGS) {
    if (!specById(r.spec)) throw new Error(`RUNGS row names unknown spec "${r.spec}"`);
  }
}
