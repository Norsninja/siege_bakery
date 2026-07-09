/**
 * THE TUNING DASHBOARD — every knob of the order economy in one file
 * (structural feedback session, 2026-07-03; economy re-pinned by the
 * frosting-economy redesign, plans/08, same day). When the economy is
 * re-pinned, this is the diff; the relationships below are the math the
 * numbers play against. game/ law: imports core/ only.
 *
 * ── Potential coverage (the towns law, plans/08 + plans/11 §6) ────────
 * The cake is ROUND and a town only ever paints its near hemisphere:
 * more towns raise the reach ceiling; nothing else does. Every coverage
 * ask and tier below is a fraction OF POTENTIAL — "frost half of what
 * your firing line can reach" — and the Patron grades harder the more
 * towns are at the table ("that's pretty good for one town").
 *
 * TWO TABLES since the towns slice (Option B, 2026-07-07). The clicks→10
 * bump (game/catapult.ts) is TOLL GEOMETRY, not a reach reward — but it
 * really does grow what a line can paint (click 9 reaches the far
 * hemisphere), so measurement and demand split:
 *   - TOWN_POTENTIAL — the MEASURED reference table, what a firing line
 *     can physically reach. Honesty only; NEVER handed to orders.
 *   - TOWN_ASK_POTENTIAL — the AUTHORED table, what the standing order
 *     actually demands. The rung/difficulty knob of the future plugs in
 *     here (plans/09 §4: potential is rung-authored, never runtime-
 *     measured); today it is one number per active-town count.
 * Both pinned a hair UNDER measurement because no real crew aims like a
 * set-cover solver: the top tier must be asymptotic, not imaginary.
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
 * WIRE FORMAT in frosting.test.ts). The PASS ask (FROST_FRAC of the
 * AUTHORED ask) ≈ 0.50 · 0.42 · 661 ≈ 139 samples ≈ 11–14 idealized
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
 * census count pin (661) moves only on purpose. TOWN_ASK_POTENTIAL is
 * exempt from mechanical re-pinning: it is AUTHORED — it moves only by
 * design decision, and any move must restate the workload math above.
 */
import { FIXED_DT } from "../core/constants";

/** Nominal order clock, seconds. ANCHOR REFERENCE since the ladder went
 * live (plans/13 slice 4): the LIVE game reads each rung's clockSeconds
 * from game/campaign.ts RUNGS — this constant is rung 3's number, pinned
 * equal there (campaign.test.ts). Edit the ladder, not this.
 * (See effective-clock note above — patience is the real clock.) */
export const ORDER_SECONDS = 300;
/** Shots for full waste credit — a good line's count, not a perfect one:
 * ~20 frost + 2 sprinkles + 1 crown + slack (plans/08 math above).
 * ANCHOR REFERENCE (slice 4): the live game reads each rung's parShots
 * column ({solo, duo} — campaign.ts header formula); this is rung 3's
 * solo number, pinned equal there. */
export const ORDER_PAR_SHOTS = 24;
/** How long a finished order's banner lingers before the fresh deal —
 * ALSO the whole town-switch window (the gates stand open only here).
 * MEASURED (2026-07-07 solo play-through): a frame-perfect scripted run
 * town 0 → town 1, pre-staged at the doorway, needs ~9.8s — 10s made the
 * run humanly impossible and dawdling into the carry-home the only real
 * switch. 18s covers a human start from anywhere in the fort (reaction +
 * un-staged + imperfect line ≈ 13–14s) with slack, without dragging the
 * between-orders beat for non-switchers (visionary's call: comfortable). */
export const ORDER_RESET_TICKS = 1080; // 18s
/** THE FINISH IT WINDOW (plans/13 §1 finish-it amendment, 2026-07-09):
 * ticks the crew gets to land the flourish after a qualifying win's
 * rows-met tick (the decided beat — status stays "running", the order
 * clock holds, the base verdict waits frozen in the Room). GENEROUS by
 * ruling: an un-staged cherry needs a real pantry ferry loop (grab →
 * load → aim → fire ≈ 10s+); too short and the window only rewards
 * pre-staging, which the ledger-judged desire already rewards. Ends
 * EARLY the moment the desire settles. A feel-pass number like the
 * linger above (the visionary's ladder run moves it). */
export const FINISH_WINDOW_TICKS = 900; // 15s
/** The Patron looks at the cake every N ticks of ORDER time (12s). */
export const PATRON_LOOK_EVERY = Math.round(12 / FIXED_DT);

/** THE RUN (the campaign container, plans/13 slice 1) — pacing knobs.
 * The ready countdown: all bakers in the circle holds this long before
 * rung 1 deals; anyone stepping out cancels it (the honest gate). */
export const READY_COUNTDOWN_TICKS = Math.round(3 / FIXED_DT); // 3s
/** How long the run-over report holds the screen (rungs cleared, the
 * filthy floor in frame) before the bakery returns to the lobby. */
export const RUNOVER_TICKS = Math.round(12 / FIXED_DT); // 12s

/** MEASURED: what fraction of the census each firing line can EVER paint,
 * by town count (pinned a hair under — header note). Index by towns; [0]
 * is a guard (no towns, no reach). RE-MEASURED 2026-07-08 under the
 * elevation vernier (research/11 re-run, tilt ladder riding
 * TILT_MAX_NOTCH, at the SHIPPED ≤10-click envelope): fine tilt BRIDGES
 * THE MOAT — the old permanent gap (ledge slots, mid-wall moats, ±x side
 * slivers) is paintable, one line reaches 90.3%, and two towns reach
 * EVERYTHING (union 100.0% at ≤8 clicks already). [3]/[4] are 1.0 by
 * SUPERSET (any extra town's reach contains the two-town union), not by
 * measurement. NEVER handed to orders — that is TOWN_ASK_POTENTIAL's
 * job below. LADDER NOTE (plans/13 slice 3, 2026-07-08): measured
 * per-spec across all seven authored rows (research/11, spec-
 * parameterized, clamped ladder) — solo reach 89.4–92.1% on every cake
 * row and union 100.0% on EVERY row, so these pins generalize to the
 * whole ladder unchanged (no per-spec table needed). One outlier: the
 * cupcake measures 97.1% solo, served by the same 0.9 — a hair more
 * under than usual, honest direction. */
export const TOWN_POTENTIAL: readonly number[] = [0, 0.9, 1.0, 1.0, 1.0];

/** AUTHORED: the potential the standing order actually hands its frost
 * row, by ACTIVE town count — the deliberate difficulty knob (Option B,
 * 2026-07-07; plans/11 §6 as amended). [1] HELD at 0.42, today's absolute
 * solo workload (~139 samples): the clicks→10 bump must not silently make
 * the live game 31% harder — a crew exploiting click 9 earns slack, which
 * play may later claw back HERE, one number. [2] starts at 0.75, the
 * bottom of the sanctioned 0.75–0.84 band: two crews ask ~44% of their
 * measured reach vs solo's ~38% — a mild, deliberate ratio rise at
 * purchase, defensible on doubled throughput; a playtest hypothesis like
 * every number in this file (plans/08). */
export const TOWN_ASK_POTENTIAL: readonly number[] = [0, 0.42, 0.75];

/** The frost PASS ask, as a fraction of potential (plans/08 — "50% is
 * just passing"; the 2D game asked 50 too, of a cake it could fully
 * reach). ANCHOR REFERENCE (slice 4): the live game deals each rung's
 * asks.frostFrac from RUNGS; this is rung 3's, pinned equal there. */
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
 * your sprinkle work un-counts it). DENSITY REVIEW 2026-07-06 — CLOSED:
 * 40 grains confirmed by the visionary's eye (the 20/40/80 sweep put the
 * sweet spot at the middle), ask HELD at 60. At 100% grip 60 is ~1.5 clean
 * bursts (two land ~80), and the ~20-grain slack now sizes a two-burst task
 * against AIM + BURIAL loss only. The handoff's "may want raising" was
 * rejected: the eye says the amount reads right in play — no signal it is
 * too easy, so no speculative tightening. (The Patron's nag tightens it +1
 * — a comedy crumb now: one more grain.) ANCHOR REFERENCE (slice 4): the
 * live game deals each rung's asks.sprinkles from RUNGS; this is rung
 * 3's, pinned equal there. */
export const SPRINKLES_NEEDED = 60;

/** Patience burns, seconds of clock per Patron look (patron.ts rules).
 * Positive numbers; the rules subtract them. */
export const PATIENCE_BURN_THUNDER_S = 8; // NEW mess on the floor
export const PATIENCE_BURN_GRUMBLE_S = 4; // the idle fuse
export const PATIENCE_BURN_URGENT_S = 2; // the low-clock reminder
