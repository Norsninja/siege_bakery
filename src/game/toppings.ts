/**
 * Toppings-as-data — the pantry table (port map B5, minimal birth in the
 * frosting slice, plans/07). One row per topping id; `form` drives the
 * landing rule everywhere the distinction matters:
 *
 * - "solid": flies, settles, litters, can claim (or usurp) the crown.
 * - "frosting": flies the same deterministic arc but is CONSUMED on first
 *   impact into paint on the frosting field — never an obstacle, never a
 *   crown, never picked back up.
 *
 * Future columns wait here for their slices: ballistics profiles (mass,
 * launch multipliers), burst behavior (the 2D sprinkle airburst), costs
 * (meta-game hook). Unknown ids read as solid — mistakes execute.
 *
 * game/ law: pure data, no imports.
 */
export type ToppingForm = "solid" | "frosting";

export interface ToppingDef {
  form: ToppingForm;
}

export const TOPPINGS: Record<string, ToppingDef> = {
  cherry: { form: "solid" },
  lime: { form: "solid" },
  sprinkles: { form: "solid" },
  frosting: { form: "frosting" },
};

/** Is this topping paint (consumed on impact into the frosting field)? */
export function isPaint(topping: string): boolean {
  return TOPPINGS[topping]?.form === "frosting";
}
