/**
 * THE CAST, visual half (plans/19 — the unified fiction): order X
 * maps to patron X. The line is the order queue made flesh: rung N's
 * order belongs to the patron at the table; the giants behind him are
 * rungs N+1, N+2, … made visible, stretching into the haze.
 * Everything here is PURE and derived from broadcast state (the rung)
 * — every client and every late joiner computes the identical cast
 * with zero synchronization (the FLAVORS argument: the patrons are
 * shared, so derive from shared state; never client dice).
 *
 * MAPPING HOME (promotion ruled 2026-07-12, entry 4): castIndexForRung
 * and the species roster live in game/cast.ts — the giant collider
 * made the sim need them (the Room and every client build the same
 * capsules from the same rung). This file keeps what only a renderer
 * cares about: visual scale, the table mark, line slots, stance,
 * tiers. Re-exports keep the mapping importable from here.
 */
import { mulberry32 } from "../core/rng";
import { castIndexForRung, SPECIES } from "../game/cast";

export { castIndexForRung };

export interface CastMember {
  /** Model name through the loader seam (public/models/<species>.glb). */
  readonly species: string;
  /** Multiplier applied to the loaded model (the ogre GLB ships 21 m
   * against his 36 m ruling; the newer GLBs ship at ruled height). */
  readonly visualScale: number;
}

/** Visual scale per species — heights are session rulings: ogre 36
 * re-ruled from 21 (the GLB ships 21 m), frostgiant 30, treefolk 40,
 * dragon 30 seated, cyclops 33, cloudgiant 38, firegiant 31 — the
 * newer GLBs ship at ruled height. Absent row = 1. */
const VISUAL_SCALE: Record<string, number> = { ogre: 36 / 21 };

/** The cast of record — derived from game/'s canonical roster, so
 * the visual list can never drift from the mapping's (one species
 * order, one truth). A new species joins in game/cast.ts; a scale
 * quirk joins VISUAL_SCALE above. */
export const CAST: readonly CastMember[] = SPECIES.map((species) => ({
  species,
  visualScale: VISUAL_SCALE[species] ?? 1,
}));

/** The shuffle seed's client-side echo — stance hashing only (the
 * mapping's own seed lives in game/cast.ts with the shuffle). */
const CAST_SEED = 0xbab39e;

/** The patron seated at the table for rung N. */
export function tablePatron(rung: number): CastMember {
  return CAST[castIndexForRung(rung)]!;
}

/** THE MARK moved to core/patron-collider.ts with item 16 — the
 * capsules and the renderer must place the giant from ONE number.
 * Re-exported: the table's importers keep their door. */
import { TABLE_POS, TABLE_YAW } from "../core/patron-collider";
export { TABLE_POS, TABLE_YAW };

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
