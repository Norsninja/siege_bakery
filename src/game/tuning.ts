/**
 * THE TUNING DASHBOARD — every knob of the order economy in one file
 * (structural feedback session, 2026-07-03; economy re-pinned by the
 * frosting-economy redesign, plans/08, same day). When the economy is
 * re-pinned, this is the diff; the relationships below are the math the
 * numbers play against. game/ law: imports core/ only.
 *
 * ── Absolute coverage (plans/22 step 4 — SUPERSEDES the towns/potential
 *    law, plans/08 + plans/11 §6) ───────────────────────────────────────
 * Coverage is graded ABSOLUTE now: how much of the WHOLE cake you frosted,
 * one number, universal thresholds. The old "of-potential" denominator
 * (TOWN_ASK_POTENTIAL × CREW_LABOR) is RETIRED — it scaled 5.1× solo→duo
 * while throughput scaled only 2.85×, so adding a friend made stars
 * HARDER, not easier (plans/22 §1). The measured truth (research/21): one
 * town reaches only ~50–67% of the cake and covers ~10–20% in an honest
 * clock — the vacuum 0.9 was a myth. So the floor + star tiers are flat
 * absolute numbers (FLOOR_COVERAGE / STAR2_COVERAGE / STAR3_COVERAGE
 * below), and GEOMETRY scales the difficulty for free: the same fraction
 * is harder on a bigger cake, so the ladder earns its progression with no
 * per-rung coverage knob (the cupcake is the ONE authored exception — a
 * tiny fully-reachable target, bespoke tiers on its RUNGS row). Crew
 * advantage is a GRADIENT now: a duo reaches higher STARS by throughput
 * (two towns, opposite hemispheres), never a lower bar. Every number here
 * is PROVISIONAL — tune against a real run (the star thresholds and the
 * earned-time/clock re-derivation land through plans/22 steps 4/6).
 *
 * ── The reliable clock + earned time (plans/22 step 6, SUPERSEDES the
 *    effective-clock lie below) ─────────────────────────────────────────
 * Patience NO LONGER drains the clock (the redesign's §0 disease: the
 * secret drain made the number lie). The clock now has ONE force —
 * EARNED TIME: it ticks UP as you paint FRESH cake coverage (the coverage
 * delta, not the splat footprint — a re-coat earns nothing), capped at
 * EARNED_TIME_CAP_S per order. Modest honest base + earn the rest: a
 * productive line stays alive while it improves the cake and ends when the
 * cake saturates (no fresh coverage → no time); a coasting line just runs
 * the base out. Patience moved to the PAYOUT (the realm's favor, step 8) —
 * it's captured dormant (OrderFlow.patienceDebt) until then; the Giant
 * still grumbles, it just costs no clock.
 *
 * The base clocks (campaign.ts clockSeconds) were RE-DERIVED to the honest
 * effective number — the old nominal × ~0.72 (the patience derating, now
 * baked in and retired as a hidden factor). So a zero-earning line gets
 * exactly today's effective clock (nobody worse off), and earned time is
 * pure upside. HISTORICAL (the retired lie): the order nominally ran
 * ORDER_SECONDS but patience drained it to ≈0.72 × nominal (~216s of the
 * old nominal 300 on the anchor). All PROVISIONAL — tune against a real run.
 *
 * ── The shot cycle and the pass budget ────────────────────────────────
 * A full solo shot ≈ pantry round-trip + load + crank (CRANK_SECONDS_PER_
 * CLICK · clicks, game/catapult.ts) + aim + flight — RE-MEASURED 23.5s
 * (the visionary's live run, 2026-07-09, minimal aiming): near the
 * MECHANICAL FLOOR post-gun-crew-posts (ferry ≈8s sprint round trip +
 * crank 4.5–7.5s + post transitions). One small splat paints ~7–12 census
 * samples ≈ 1.3% of the cake (core/frosting.ts constants against the
 * 661-sample census, pinned as WIRE FORMAT in frosting.test.ts). Under
 * absolute coverage (plans/22 step 4) the pass FLOOR is FLOOR_COVERAGE of
 * the WHOLE cake (~8% ≈ 6 splats' worth on the anchor) — no reach/labor
 * denominator; a solo line clears it and a bigger cake makes it harder for
 * free. The old FROST_FRAC × TOWN_ASK_POTENTIAL × census workload (~139
 * samples, a pipelining-DUO ask) is retired with those constants; solo's
 * relief is now the clock + earned time, not a shrunken ask (plans/22
 * §2.8). Until step 6 re-derives, the shipped clocks (campaign.ts) run
 * unchanged.
 *
 * ── The re-pin law (plans/07 + plans/08, NARROWED by plans/22 step 4) ──
 * Splat-constant or census changes still move the census pin (661) only on
 * purpose. The coverage side re-pins the ABSOLUTE tiers now (FLOOR_COVERAGE
 * / STAR2_COVERAGE / STAR3_COVERAGE) against research/21's measured curve,
 * never the retired FROST_FRAC / TOWN_POTENTIAL; ORDER_PAR_SHOTS /
 * ORDER_SECONDS re-derive in step 6 (earned time + the reliable clock).
 */
import { FIXED_DT } from "../core/constants";

/** THE RELIABLE base clock, seconds (plans/22 step 6 — RE-DERIVED from the
 * old nominal 300 × 0.72, the retired patience derating). ANCHOR REFERENCE
 * since the ladder went live (plans/13 slice 4): the LIVE game reads each
 * rung's clockSeconds from game/campaign.ts RUNGS — this constant is rung
 * 3's number, pinned equal there (campaign.test.ts). Edit the ladder, not
 * this. The anchor-verbatim law for the CLOCK is superseded here (as step 4
 * superseded it for coverage): patience no longer drains, so the base IS
 * the honest number, and earned time adds on top. */
export const ORDER_SECONDS = 216;
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
/** The Patron looks at the cake every N ticks of ORDER time (12s). */
export const PATRON_LOOK_EVERY = Math.round(12 / FIXED_DT);

/** EARNED TIME (plans/22 step 6 — THE reliable clock's one positive force):
 * seconds of clock added per FRESH census sample newly painted (the
 * coverage delta from FrostingField.paint, not the splat footprint — a
 * re-coat over frosted skin earns nothing). PROVISIONAL, priced off
 * research/21: the optimal marginal rate is ~0.5 fresh samples/s late-curve,
 * and a productive line should roughly sustain then lose ground as the cake
 * saturates. At 2s/sample an early splat on a naked cake banks ~15–20s
 * (~7–12 fresh), a late one ~4–6s — the sustain-then-die shape §2.5 wants.
 * THE tuning dial for "how long a good line lives"; tune against a real run. */
export const EARNED_TIME_PER_SAMPLE_S = 2;
/** The earned-time CAP, seconds — cumulative PER ORDER (plans/22 §2.5's
 * backstop against a flawless crew painting forever). Loose by design:
 * research/21's optimal solo ceiling is ~34–51% within 420s, so +120s over
 * a modest base never bites normal play — it only kills the degenerate
 * paint-forever case. A pure ceiling, not a live constraint. */
export const EARNED_TIME_CAP_S = 120;

/** THE ECONOMY's dials (plans/13 §5 as amended 2026-07-09 — the
 * shop-sells-infrastructure amendment). Both are feel-pass hypotheses,
 * ruled easily tunable: one edit here moves every reader.
 * The flourish coda's purse bonus, on top of the rung's pay column
 * (campaign.ts): +10 = two stars' worth — style pays like excellence,
 * flat and legible (a multiplier can't be mentally verified mid-game). */
export const FLOURISH_BONUS_COINS = 10;
/** Town 2 at the stall — §5's scale: affordable by rung 2–3 for a
 * decent crew (two 3★ wins = 60), right as the asks start outgrowing
 * one town's throughput. */
export const TOWN2_PRICE = 50;

/** THE RUN (the campaign container, plans/13 slice 1) — pacing knobs.
 * The ready countdown: all bakers in the circle holds this long before
 * rung 1 deals; anyone stepping out cancels it (the honest gate). */
export const READY_COUNTDOWN_TICKS = Math.round(3 / FIXED_DT); // 3s
/** How long the run-over report holds the screen (rungs cleared, the
 * filthy floor in frame) before the bakery returns to the lobby. */
export const RUNOVER_TICKS = Math.round(12 / FIXED_DT); // 12s

// TOWN_POTENTIAL (the measured 0.9 reach) and TOWN_ASK_POTENTIAL (the
// authored of-potential denominator) are RETIRED (plans/22 step 4):
// coverage is absolute now, so nothing divides by "reach". research/21
// measured one-town reach at ~50–67% (not 0.9) and time-bounded solo
// coverage at ~10–20% — the vacuum numbers described no real envelope.
// The star floor + tiers below are absolute; geometry scales difficulty.

/** THE LONE HERO AMENDMENT (plans/13 §5), NARROWED by the absolute-coverage
 * flip (plans/22 step 4 §3): its frost-coverage MECHANISM is gone — the
 * floor is flat + absolute now (FLOOR_COVERAGE), the same for one pair of
 * hands or two; solo's coverage relief moves to the clock + earned time
 * (plans/22 §2.8, step 6). CREW_LABOR survives ONLY as the SPRINKLE-grain
 * scaler (requirementsFor ceils the grain ask by it — solo asks fewer
 * grains): a pass-floor knob, not a coverage denominator (the one survival
 * §3 sanctions). Indexed by CONNECTED CREW at deal time (towns law verbatim).
 * [1] = 0.35 held from the old frost derivation — PROVISIONAL for grains
 * now; step 6 re-derives solo relief whole. [2+] = 1.0 (duo zero-drift).
 * [0] is a guard, never indexed (requirementsFor clamps crew to ≥1). */
export const CREW_LABOR: readonly number[] = [0, 0.35, 1.0, 1.0, 1.0];

/** THE CLOCK RELIEF (plans/15 item 26, 2026-07-12): the clock was the
 * last CREW-BLIND number — asks and par scaled solo, the seconds did
 * not, so solo ferried ~2× the workload per second on the same clock.
 * Menu (a): a hands-aware clock factor AT THE DEAL, rows verbatim
 * (rung 3's anchor untouched), both replicas read the broadcast
 * ticksLeft. Born a flat scalar CREW_CLOCK = [0, 1.25, 1.0, …].
 *
 * WENT PER-RUNG (item 26 addendum, twenty-second session): the flat
 * 1.25 over-relieved rung 2 by ~a minute — the ferry-to-par ratio
 * changes shape as tiers stack, and rung 1 was the only calibrated
 * row (research/20). THE RULING: the relief is the TUTORIAL'S — the
 * solo factor moved onto the Rung row (campaign.ts `soloClock`,
 * rung 1 = 1.25, rung 2+ = 1.0), sitting beside clockSeconds/parShots,
 * the other per-rung feel knobs. Duo stays ZERO drift (the deal reads
 * a literal 1.0 for crew 2+; the crew dimension returns at that code
 * site if a playtest ever asks). This constant retired — a scalar
 * cannot say "rung 1 only," and a live scalar beside a per-rung column
 * is exactly the drift this project guards against. */

/** THE ABSOLUTE COVERAGE TIERS (plans/22 step 4, priced by research/21).
 * Fractions of the WHOLE cake — flat across the CAKE ladder, geometry
 * scaling the difficulty (a bigger cake makes the same fraction harder).
 * The cupcake overrides all three on its RUNGS row (a tiny, fully
 * reachable target — a different game). PROVISIONAL, tune against a real
 * run; the confirmation + earned-time bridge land in step 6.
 *
 *   FLOOR_COVERAGE — the pass floor (Gate 1's frost row). Deliberately low
 *     so a real first-timer clears the tutorial (optimal rung-1 @108s ≈
 *     15.7%, human ~0.6× ≈ 9.4%); rung 1's extra mercy is CLOCK, not a
 *     softer bar (plans/22 §2.8, the tutorial-floor ruling).
 *   STAR2_COVERAGE — 2★: a strong solo line / an easy duo.
 *   STAR3_COVERAGE — 3★: solo can touch it on the SMALL cakes (optimal
 *     ceiling 38–51% > 35%), genuinely cannot on the giants (ceiling
 *     ~32–34% < 35%) — the star ceiling self-tightens with cake size
 *     (research/21 finding 3; §2.4). The score's coverage axis saturates
 *     here (judge()). */
export const FLOOR_COVERAGE = 0.08;
export const STAR2_COVERAGE = 0.18;
export const STAR3_COVERAGE = 0.35;
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
