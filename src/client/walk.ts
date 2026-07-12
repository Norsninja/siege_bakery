/**
 * THE STRIDE DIALS (plans/15 item 20, claimed 2026-07-12) — the ONE
 * home for every giant walk constant. They were born duplicated in
 * patron-table.ts and line.ts; unified here so a tune happens once.
 *
 * The diagnosis behind the numbers: it's the CADENCE, more than the
 * ground speed. Froude similarity says a 36 m biped strides about
 * once per 2 s at ~6 m/s; the old dials stepped every ~0.5 s (human
 * scurry) and departed at 66 m/s. Every value below is an EYE-PASS
 * DIAL — the visionary's live run rules; the arithmetic just keeps
 * the theatre inside its windows (18 s linger, departure at 460).
 *
 * plans/15 item 22 (patron motion) inherits this module: the gait
 * audition drives the same phase clock, and STEP EVENTS (item 23's
 * hook) will be derived from it — stride cadence is the clock, legs
 * or no legs.
 */

/** Stride phase per render frame. |sin| bobs twice per 2π, so a step
 * lands every π/rate frames: 0.03 → ~105 frames ≈ 1.75 s per step
 * (was 0.1 — a step every 0.5 s, the scurry). */
export const WALK_PHASE_PER_FRAME = 0.03;
/** Bob depth. 0.35 m on a 36 m body was 1% of height — invisible.
 * Human bob is ~2.3% of height; 0.8 m reads the weight. */
export const WALK_BOB_M = 0.8;
/** Side-to-side rock per stride — the weight shift. */
export const WALK_ROCK_RAD = 0.045;

/** The served giant's amble down the departure lane: no deadline —
 * 0.17 m/frame ≈ 10 m/s, ~18 m per stride at the cadence above (was
 * 1.1 ≈ 66 m/s, highway speed). He takes ~35 s to reach the fog;
 * that's the fiction — a giant ambling home past the waiting line. */
export const DEPART_SPEED = 0.17;
/** The next patron's walk from slot 0 to the table (29 m): 0.1
 * m/frame ≈ 6 m/s → ~4.8 s of heavy walk. Bounded by the linger:
 * departure fires at 460 of 1080 frames, leaving ~10.3 s before the
 * fresh-deal snap would teleport him — half the window spare. NAMED
 * TENSION (item 20): the gap was cut 66→50 because the old arrival
 * read long; this walk is slower but HEAVIER — the eye rules. */
export const ARRIVE_SPEED = 0.1;
/** The line's shuffle-forward: 42 m in 330 frames ≈ 7.6 m/s over
 * ~5.5 s (was 150 ≈ 17 m/s). Pure cosmetic lerp — its only deadline
 * is the linger's end at 1080, and it fires at 460. */
export const ADVANCE_FRAMES = 330;

/** One stride's pose ingredients at a given phase — the shared
 * grammar both walkers apply (bob rides |sin|, rock rides sin). */
export const walkSway = (phase: number): { bob: number; rock: number } => {
  const s = Math.sin(phase);
  return { bob: Math.abs(s) * WALK_BOB_M, rock: s * WALK_ROCK_RAD };
};
