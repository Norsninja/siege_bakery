/**
 * THE CAST (plans/19 — the unified fiction): order X maps to patron X.
 *
 * The line is the order queue made flesh: rung N's order belongs to
 * the patron at the table; the giants behind him are rungs N+1, N+2, …
 * made visible, stretching into the haze. Everything here is PURE and
 * derived from broadcast state (the rung) — every client and every
 * late joiner computes the identical cast with zero synchronization
 * (the FLAVORS argument: the patrons are shared, so derive from
 * shared state; never client dice).
 *
 * MAPPING HOME (visionary ruling 2026-07-12): client/ for now;
 * promoted to game/ when species-themed order content + patron voice
 * land (the mapping is conceptually game truth — "whose order is
 * this" — but the milestone law keeps game/ untouched).
 */
import { mulberry32 } from "../core/rng";

export interface CastMember {
  /** Model name through the loader seam (public/models/<species>.glb). */
  readonly species: string;
  /** Multiplier applied to the loaded model (the ogre GLB ships 21 m
   * against his 36 m ruling; the newer GLBs ship at ruled height). */
  readonly visualScale: number;
}

/** The cast of record (heights are session rulings: ogre 36 re-ruled
 * from 21, frostgiant 30, treefolk 40, dragon 30 seated). Cyclops and
 * friends join here — ONE line each — as their models land. */
export const CAST: readonly CastMember[] = [
  { species: "ogre", visualScale: 36 / 21 },
  { species: "frostgiant", visualScale: 1 },
  { species: "treefolk", visualScale: 1 },
  { species: "dragon", visualScale: 1 },
  { species: "cyclops", visualScale: 1 }, // 33 m (seventeenth session) — the artillery spotter
  { species: "cloudgiant", visualScale: 1 }, // 38 m (seventeenth session) — the queen in the cloud-hemmed gown
];

/** Fixed seed for the cast shuffle — change it and every client's
 * line changes together (it is part of the presentation, not saved
 * state). Knuth-hash the rung and BURN the first draw: mulberry32's
 * first output is visibly correlated across nearby seeds (found live
 * 2026-07-12 — the "shuffle" alternated two species for eight rungs
 * straight). */
const CAST_SEED = 0xbab36f; // re-rolled as the cloud giant joined (CAST.length reshuffles every draw; each roster change re-scans for an opening that reads shuffled — this one deals all six species inside the first seven rungs)
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
    pick = Math.floor(rungDraw(r) * CAST.length);
    if (pick === prev) pick = (pick + 1) % CAST.length;
    prev = pick;
  }
  return pick;
}

/** The patron seated at the table for rung N. */
export function tablePatron(rung: number): CastMember {
  return CAST[castIndexForRung(rung)]!;
}

/** Where the table patron stands (the ogre's ruled post — game
 * coords; every species faces the cake from the same mark). */
export const TABLE_POS = { x: 21, z: -30 } as const;
export const TABLE_YAW = -Math.PI / 2;

/** Line geometry (game coords). The giants' road runs +x from the
 * table to the horizon (region slice 4.75 built it for this). Slot 0
 * is "next up"; spacing is giant-scaled; the far slots thread the
 * peak-ring gap at x≈311. */
export const LINE_SLOT0_X = 50; // tuned 66→50 (2026-07-12 eye note: the table gap read "a little far")
export const LINE_SPACING = 42;
export const LINE_Z = -30;
/** Tier boundaries by slot: 0–2 breathe (actors), 3–5 stand
 * (standees), 6–9 are instanced silhouettes (horizon crowd). */
export const LINE_SLOTS = 10;
export const TIER1_SLOTS = 3;
export const TIER2_SLOTS = 6;

export type LineTier = "actor" | "standee" | "impostor";

export interface LineSlot {
  /** Absolute position in the endless order stream: queueIndex =
   * rung + slot + 1 (the table holds queueIndex = rung). THE ADVANCE
   * IDENTITY rides this: slot i at rung+1 shows queueIndex
   * (rung+1)+i+1 = rung+(i+1)+1 — exactly slot i+1 at rung. A giant's
   * species, stagger, and yaw follow HIM up the line. */
  readonly queueIndex: number;
  readonly species: string;
  readonly visualScale: number;
  readonly x: number;
  readonly z: number;
  /** Facing: down the road toward the table, plus a personal wobble. */
  readonly yaw: number;
  readonly tier: LineTier;
}

/** Personal stance per queue position — deterministic hash of the
 * queue index, so a giant keeps his own z-drift and yaw wobble as he
 * advances (reads as individuals loitering, not beads on a wire). */
function stance(queueIndex: number): { dz: number; dyaw: number } {
  const rng = mulberry32(CAST_SEED ^ (queueIndex * 2654435761));
  return { dz: (rng() - 0.5) * 10, dyaw: (rng() - 0.5) * 0.3 };
}

/** The visible line for rung N (slot 0 nearest the table). */
export function lineSlots(rung: number): LineSlot[] {
  const out: LineSlot[] = [];
  for (let slot = 0; slot < LINE_SLOTS; slot++) {
    const queueIndex = rung + slot + 1;
    const member = CAST[castIndexForRung(queueIndex)]!;
    const { dz, dyaw } = stance(queueIndex);
    out.push({
      queueIndex,
      species: member.species,
      visualScale: member.visualScale,
      x: LINE_SLOT0_X + slot * LINE_SPACING,
      z: LINE_Z + dz,
      yaw: TABLE_YAW + dyaw,
      tier:
        slot < TIER1_SLOTS
          ? "actor"
          : slot < TIER2_SLOTS
            ? "standee"
            : "impostor",
    });
  }
  return out;
}
