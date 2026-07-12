/**
 * Simulation-wide constants. core/ law: deterministic, headless, no DOM.
 */

/** Fixed simulation timestep. 60Hz, decoupled from rendering (client) and
 * from wall-clock (server). Everything that steps the sim uses this. */
export const FIXED_DT = 1 / 60;

/** Standard gravity for every physics world in the game. Frozen (audit
 * 2026-07-07): one stray `GRAVITY.y = 0` would fork every world silently —
 * shared constants must not be writable. */
export const GRAVITY = Object.freeze({ x: 0, y: -9.81, z: 0 });

/**
 * Collision groups (Rapier packs them as (membership << 16) | filter; a
 * pair collides only if each side's membership intersects the other's
 * filter). SHOTS AND BAKERS MUTUALLY IGNORE (audit F3, plans/06): each
 * client's world contains its own baker, the Room's world contains none —
 * a lob clipping the local capsule would land differently on every
 * machine and break the shots-land-identically-everywhere invariant.
 * The comedy cost — no catching cherries with your face, bakers wade
 * through the litter — is the price of determinism until the server
 * simulates bakers. Arena colliders keep Rapier's default all-groups.
 */
export const GROUP_WORLD = 0x0001;
export const GROUP_BAKER = 0x0002;
export const GROUP_SHOT = 0x0004;
export const GROUP_GRAIN = 0x0008;
/** The patron at the mark (item 16) — his own bit, NOT membership
 * WORLD: giving the giant WORLD membership would silently make his
 * ankles baker obstacles (bakers filter WORLD). Deliberately excluded
 * from the baker's world (both directions): giant-proximity feel is
 * item 23's bop, never physics entanglement — revisit only if bakers
 * visibly ghost through ankles in play. */
export const GROUP_PATRON = 0x0010;
/** Bakers: collide with the arena only. */
export const BAKER_COLLISION_GROUPS = (GROUP_BAKER << 16) | GROUP_WORLD;
/** Shots: collide with the arena, each other (toppings stack), grains
 * (a cherry wades through confetti honestly), and the patron at the
 * mark (item 16: hitting the giant for fun is a feature) — never with
 * bakers. */
export const SHOT_COLLISION_GROUPS =
  (GROUP_SHOT << 16) | (GROUP_WORLD | GROUP_SHOT | GROUP_GRAIN | GROUP_PATRON);
/** Burst grains: the arena, the big shots, and the patron (a burst
 * peppering the giant bounces honestly) — NEVER each other (measured
 * 2026-07-05: grain-grain contact clusters + the freeze law's wake pass
 * fed each other energy forever — a pile that never stilled; confetti
 * needs no pile physics, and skipping it also skips the n² contact bill). */
export const GRAIN_COLLISION_GROUPS =
  (GROUP_GRAIN << 16) | (GROUP_WORLD | GROUP_SHOT | GROUP_PATRON);
/** The patron's capsules (core/patron-collider.ts): shots and grains
 * bounce off the body; bakers and gates never know he's there. */
export const PATRON_COLLISION_GROUPS =
  (GROUP_PATRON << 16) | (GROUP_SHOT | GROUP_GRAIN);
/** Town gates (the switch-between-orders law, 2026-07-07): a gate fence is
 * WORLD to bakers and NOTHING to shots/grains — membership WORLD (bakers
 * filter it), filter BAKER only (a shot's side of the product is zero, so
 * the deterministic arcs never know the fence exists; the shared shot
 * world stays byte-identical on every replica whatever the gate does). */
export const GATE_COLLISION_GROUPS = (GROUP_WORLD << 16) | GROUP_BAKER;
