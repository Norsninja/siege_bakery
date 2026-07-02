/**
 * Seeded, deterministic pseudo-random number generator.
 *
 * DISCIPLINE: this is the ONLY source of randomness allowed anywhere in `core/`
 * or `game/`. Never call Math.random() in the simulation — it would make
 * physics, material settling, and Patron tiebreaks non-reproducible and break
 * the sync-shots-not-surfaces multiplayer model (see plans/06 in the 2D repo).
 *
 * mulberry32: tiny, fast, good-enough distribution for a game. Same seed always
 * yields the same stream. Ported verbatim from the 2D prototype.
 */

export type RandomFn = () => number;

/** Create a deterministic RNG returning floats in [0, 1). */
export function mulberry32(seed: number): RandomFn {
  let a = seed >>> 0;
  return function random(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] inclusive, drawn from `rng`. */
export function randInt(rng: RandomFn, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Float in [min, max), drawn from `rng`. */
export function randRange(rng: RandomFn, min: number, max: number): number {
  return min + rng() * (max - min);
}
