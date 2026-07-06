/**
 * THE TUNING DASHBOARD — every knob of the order economy in one file
 * (structural feedback session, 2026-07-03; economy re-pinned by the
 * frosting-economy redesign, plans/08, same day). When the economy is
 * re-pinned, this is the diff; the relationships below are the math the
 * numbers play against. game/ law: imports core/ only.
 *
 * ── Potential coverage (the towns law, plans/08) ──────────────────────
 * The cake is ROUND and a town only ever paints its near hemisphere: with
 * idealized aim over the whole discrete envelope, ONE town's coverage
 * ceiling is ~44% of the census (research/06 — every region caps near
 * half). More towns raise the ceiling; nothing else does. So every
 * coverage ask and tier below is a fraction OF POTENTIAL — "frost half of
 * what your firing line can reach" — and the Patron grades harder the
 * more towns are at the table ("that's pretty good for one town").
 * TOWN_POTENTIAL pins the measured ceilings, a hair UNDER the idealized
 * greedy numbers (43.7 / 75.2 / 86.7 / 94.6) because no real crew aims
 * like a set-cover solver: the top tier must be asymptotic, not imaginary.
 *
 * ── The effective clock ───────────────────────────────────────────────
 * The order NOMINALLY runs ORDER_SECONDS, but patience IS the clock: the
 * Giant looks every PATRON_LOOK_EVERY ticks and his idle grumble burns
 * PATIENCE_BURN_GRUMBLE_S each look (thunder/urgency burn more/less, whims
 * burn nothing). With grumbles on most looks the EFFECTIVE clock is about
 *   ORDER_SECONDS − (ORDER_SECONDS / 12) · ~3.3s  ≈  0.7–0.8 · nominal
 * (~225s of the nominal 300 today). Budget shot counts against THAT.
 *
 * ── The shot cycle and the pass budget ────────────────────────────────
 * A full solo shot ≈ pantry round-trip + load + crank (CRANK_SECONDS_PER_
 * CLICK · clicks, game/catapult.ts) + aim + flight — measured ~12–18s.
 * One small splat paints ~7–12 census samples ≈ 1.3% of the cake
 * (core/frosting.ts constants against the 661-sample census, pinned as
 * WIRE FORMAT in frosting.test.ts). The PASS ask (FROST_FRAC of one
 * town's potential) ≈ 0.50 · 0.42 · 661 ≈ 139 samples ≈ 11–14 idealized
 * shots (research/06 greedy), ~18–22 with human aim — tight for a solo
 * baker on the effective clock, comfortable for two. Solo is hard mode
 * in a co-op party game, ON PURPOSE. 2★/3★ (COVERAGE_GOOD/_EXCELLENT of
 * potential) climb toward the ceiling's asymptote: rare by design — the
 * dessert report's screenshot is the trophy either way.
 *
 * ── The re-pin law (plans/07 + plans/08, standing) ────────────────────
 * Splat-constant or census changes REQUIRE re-running research/04 §3 AND
 * research/06 (the ceiling study), then re-pinning FROST_FRAC /
 * TOWN_POTENTIAL / ORDER_PAR_SHOTS / ORDER_SECONDS together — and the
 * census count pin (661) moves only on purpose.
 */
import { FIXED_DT } from "../core/constants";

/** Nominal order clock, seconds (see effective-clock note above). */
export const ORDER_SECONDS = 300;
/** Shots for full waste credit — a good line's count, not a perfect one:
 * ~20 frost + 2 sprinkles + 1 crown + slack (plans/08 math above). */
export const ORDER_PAR_SHOTS = 24;
/** How long a finished order's banner lingers before the fresh deal. */
export const ORDER_RESET_TICKS = 600; // 10s
/** The Patron looks at the cake every N ticks of ORDER time (12s). */
export const PATRON_LOOK_EVERY = Math.round(12 / FIXED_DT);

/** What fraction of the census each firing line can EVER paint, by town
 * count (measured: research/06; pinned a hair under — header note).
 * Index by towns; [0] is a guard (no towns, no reach). */
export const TOWN_POTENTIAL: readonly number[] = [0, 0.42, 0.73, 0.85, 0.93];

/** The standing order's frost row: the PASS ask, as a fraction of
 * potential (plans/08 — "50% is just passing"; the 2D game asked 50 too,
 * of a cake it could fully reach). */
export const FROST_FRAC = 0.5;
/** The star tiers, fractions of potential (plans/08: stars come from
 * coverage tiers, not score arithmetic — "encourage 70 and 90"). Gate 2
 * (score ≥ passScore) still decides ACCEPTANCE, so sloppy work can sink
 * an order at any coverage. */
export const COVERAGE_GOOD = 0.7;
export const COVERAGE_EXCELLENT = 0.9;
/** The standing order's sprinkle row, IN GRAINS since the projectile pass
 * (plans/10: sprinkles burst into 40 payload capsules; the ask re-pins to
 * grain counts). MEASURED (room.test WIN line, 2026-07-06, under the
 * CONVERSION LAW plans/10 §8): a good burst over paint grips a PERFECT
 * 40/40 — every grain hitting painted skin converts, and stuck records
 * cannot be shoved. 60 = two good bursts with slack: the SAME two-shot
 * economy the old "2 × sprinkles" asked — the slack now covers aim, not
 * physics leakage, and BURIAL is the loss mode instead (frosting over
 * your sprinkle work un-counts it). RE-PINS WITH THE DENSITY PICK (his
 * eye chooses 20/40/80 grains in-preview; the ask scales with the count —
 * keep ask ≈ 1.5 × grains; with grip at 100% he may want it higher).
 * (The Patron's nag tightens it +1 — a comedy crumb now: one more
 * grain.) */
export const SPRINKLES_NEEDED = 60;

/** Patience burns, seconds of clock per Patron look (patron.ts rules).
 * Positive numbers; the rules subtract them. */
export const PATIENCE_BURN_THUNDER_S = 8; // NEW mess on the floor
export const PATIENCE_BURN_GRUMBLE_S = 4; // the idle fuse
export const PATIENCE_BURN_URGENT_S = 2; // the low-clock reminder
