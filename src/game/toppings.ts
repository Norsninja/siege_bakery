/**
 * Toppings-as-data — the pantry table (port map B5; made PHYSICAL by the
 * projectile pass, plans/10). One row per topping id; `form` drives the
 * landing rule everywhere the distinction matters:
 *
 * - "solid": flies, settles, litters, can claim (or usurp) the crown —
 *   unless `crowns: false` (grains are garnish, never crowns).
 * - "frosting": flies the same deterministic arc but is CONSUMED on first
 *   impact into paint on the frosting field — never an obstacle, never a
 *   crown, never picked back up.
 *
 * The physical columns (plans/10): `burst` makes a row a CLUSTER AIRBURST
 * (sprinkles — proximity fuse, seeded payload; core/projectiles.ts executes
 * it); `splat` gives a paint row its own splat law (fudge — narrow, runs
 * DOWN walls; core/frosting.ts executes it; absent = the frosting classic).
 * New projectiles are rows and columns here, never reworks — fudge IS a
 * data row. Costs (meta-game hook) still wait for their slice.
 *
 * THE LIME LAW generalizes: every id fires, flies, lands — mistakes
 * execute. Unknown ids read as solid, crownable (the decoy's usurping
 * menace is the point). Limes are never ordered; neither is fudge until
 * its rung (plans/10 §1: rungs introduce projectiles, the shop sells
 * infrastructure).
 *
 * game/ law: pure data (type-only imports from core/ — nothing runs).
 */
import type { BurstSpec } from "../core/projectiles";
import type { SplatSpec } from "../core/frosting";

export type ToppingForm = "solid" | "frosting";

export interface ToppingDef {
  form: ToppingForm;
  /** Garnish flag: this topping can never claim (or usurp) the crown. */
  crowns?: false;
  /** Cluster airburst carrier (plans/10 §2). The settled form of a burst
   * topping is its GRAIN — carriers never land. */
  burst?: BurstSpec;
  /** Paint rows only: a custom splat law (absent = the frosting classic). */
  splat?: SplatSpec;
}

export const TOPPINGS: Record<string, ToppingDef> = {
  cherry: { form: "solid" },
  lime: { form: "solid" },
  sprinkles: {
    form: "solid",
    crowns: false, // garnish — a wild grain atop the summit is not a crown
    burst: {
      proximityM: 1.25, // the fuse: pop this close to the tier stack
      grains: 40, // THE density knob — CONFIRMED by eye, density review 2026-07-06 (plans/10)
      jitterSpeed: 2,
      scatterRadius: 0.35,
      grain: { radius: 0.045, halfHeight: 0.055, restitution: 0.3 },
    },
  },
  frosting: { form: "frosting" },
  fudge: {
    form: "frosting",
    // The incendiary (plans/10 §4): a thick stream, not a splash — smaller
    // radii than the frosting classic — that RUNS DOWN WALLS then sets
    // (bandDown ≫ bandUp). Its job is measured: research/11's elevation
    // moats (wall bands neither ground-splash nor ledge-splash can reach)
    // are exactly what a downward band fills from a ledge hit.
    splat: {
      dollopRadius: 0.45,
      dollopCoats: 2,
      splashBase: 0.5,
      splashPerSpeed: 0.03,
      splashMax: 0.8,
      bandUp: 0.25,
      bandDown: 1.7,
    },
  },
};

/** Is this topping paint (consumed on impact into the frosting field)? */
export function isPaint(topping: string): boolean {
  return TOPPINGS[topping]?.form === "frosting";
}

/** THE FLAVORS (plans/24 — the recipe): every paint topping IS a flavor.
 * The census stamps a small int per sample (core stays name-agnostic);
 * this list is THE mapping, both replicas — order is wire-ish, append
 * only. The classic frosting is VANILLA; fudge is the chocolate (already
 * a full paint row with its own measured splat law — the recipe's arrival
 * is fudge's rung, plans/10 §1's "rungs introduce projectiles" landing). */
export const PAINT_FLAVORS: readonly string[] = ["frosting", "fudge"];

/** The census stamp for a paint topping (1-based; 0 = not a paint /
 * unpainted — FrostingField's "no stamp"). */
export function flavorOf(topping: string): number {
  return PAINT_FLAVORS.indexOf(topping) + 1;
}

/** The ticket's word for a flavor ask — the HUD speaks bakery, never
 * engine ids (the semantic audit). */
export const FLAVOR_WORDS: Record<string, string> = {
  frosting: "VANILLA",
  fudge: "FUDGE",
};

/** May this topping claim the crown? Unknown ids: solid, crownable —
 * mistakes execute, and the decoy's menace is the point. */
export function canCrown(topping: string): boolean {
  const def = TOPPINGS[topping];
  if (!def) return true;
  return def.form === "solid" && def.crowns !== false;
}

/** One ledger entry's weight in the mess arithmetic (plans/10 §3): a burst
 * is ONE delivery — its grains each weigh 1/grains, so one wild shot is
 * one mistake, not forty floor entries drowning the axis. */
export function deliveryWeight(topping: string): number {
  const b = TOPPINGS[topping]?.burst;
  return b ? 1 / b.grains : 1;
}
