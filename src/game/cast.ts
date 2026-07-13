/**
 * THE CAST MAPPING — game truth since entry 4 (THE PROMOTION, ruled
 * 2026-07-12, both terminals concurring): "whose order is this" is
 * match knowledge, and the giant collider made the sim need it — the
 * Room builds the patron's capsules per deal, and every client builds
 * the identical set in its local world (sync-shots-not-surfaces: if
 * the capsule existed on one side only, the trajectory itself would
 * fork). Promoted WHOLE rather than duplicated: a second "who's at
 * the table" table in core/ beside the client's copy is exactly the
 * two-sources-drift the determinism laws exist to kill. The prize
 * session (species-themed orders + patron voice) builds on top of
 * this file; item 16's claimer's-call line is closed.
 *
 * Everything VISUAL about the cast (scale, line slots, stance,
 * tiers) stays in client/cast.ts, which imports the mapping from
 * here. game/ law: imports core/ + sibling game modules only; pure,
 * deterministic, headless.
 */
import { mulberry32 } from "../core/rng";
import type { RunPhase } from "./run-flow";

/** The roster of record, in canonical order (heights and visual
 * scale live client-side; the ORDER is shared truth — index 0 is the
 * founding patron). A new species joins here — one line — and its
 * collider joins core/patron-collider.ts's table. */
export const SPECIES: readonly string[] = [
  "ogre",
  "frostgiant",
  "treefolk",
  "dragon",
  "cyclops",
  "cloudgiant",
  "firegiant",
];

/** Fixed seed for the cast shuffle — change it and every client's
 * line changes together (it is part of the presentation, not saved
 * state). Knuth-hash the rung and BURN the first draw: mulberry32's
 * first output is visibly correlated across nearby seeds (found live
 * 2026-07-12 — the "shuffle" alternated two species for eight rungs
 * straight). */
const CAST_SEED = 0xbab39e; // re-rolled as the fire giant joined (SPECIES.length reshuffles every draw; each roster change re-scans for an opening that reads shuffled — this one deals ALL SEVEN species in the first seven rungs)
const rungDraw = (rung: number): number => {
  const rng = mulberry32(CAST_SEED ^ Math.imul(rung, 2654435761));
  rng(); // burn-in — decorrelates neighboring rungs
  return rng();
};

/**
 * Which cast member owns rung N's order — THE SHUFFLE RULING
 * (2026-07-12): not a direct cycle, deterministic, and never the same
 * patron twice in a row. THE OPENING PIN (visionary ruling
 * 2026-07-12): rung 1 is ALWAYS the ogre — the founding patron opens,
 * whatever the seed says and however the cast grows (a lucky seed
 * would reshuffle the moment a new species joins; a pin survives).
 * From rung 2 each rung draws independently from the seeded RNG; a
 * draw that repeats the previous rung's pick bumps one index (mod n).
 * Walked from rung 2 so the "previous" chain is stateless to derive —
 * O(rung), and rung + line depth stays tiny.
 */
export function castIndexForRung(rung: number): number {
  let prev = 0; // rung 1 pinned: the ogre
  let pick = 0;
  for (let r = 2; r <= rung; r++) {
    pick = Math.floor(rungDraw(r) * SPECIES.length);
    if (pick === prev) pick = (pick + 1) % SPECIES.length;
    prev = pick;
  }
  return pick;
}

/** The species standing over rung N's order. */
export function speciesForRung(rung: number): string {
  return SPECIES[castIndexForRung(rung)]!;
}

/**
 * THE MARK PREDICATE (item 16's deal-boundary gating, one home): does
 * the sim derive a giant standing at the table mark — and which one?
 * Both worlds reconcile their patron colliders against THIS answer
 * every tick, so the collider can never ride a client signal and the
 * two Rapier worlds can never disagree about the shape at the mark.
 *
 * - running, no verdict: the rung's patron stands all order (ON at
 *   the fresh deal — the deal boundary is sim truth).
 * - verdict stamped (the linger): OFF — exactly when the walk theatre
 *   plays. Residue accepted (ruled): a shot passes through the
 *   visibly departing giant; order's over, nothing scores.
 * - runover: OFF — he walked, the report holds the stage.
 * - lobby/countdown: OFF — THE TRAINING LOBBY (item 25, entry 5
 *   razed the interim rule that stood rung 1's patron here): the
 *   table is EMPTY before the run; the founding patron waits on the
 *   bench up the road (client theatre) and the practice target owns
 *   the lobby's physics. Residue accepted (ruled, the mirror of the
 *   departure's): at ALL-IN the deal stands the capsules at the mark
 *   while the parade theatre still walks him up — a warmup straggler
 *   can bonk on an empty mark for ~10 s; order's live, he's coming.
 */
export function patronAtMark(
  phase: RunPhase,
  rung: number,
  verdictPending: boolean,
): string | null {
  if (phase !== "running") return null; // lobby/countdown/runover — empty table
  return verdictPending ? null : speciesForRung(rung);
}
