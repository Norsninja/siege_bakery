# Research 08 — 2D lineage brief (what the artillery docs already decided)

Compiled 2026-07-04 by an Explore agent from the READ-ONLY sibling
`E:\Projects\artillery` (plans/02 design doc, plans/06 pivot record, 07-towns),
for the holistic direction discussion. Quotes are verbatim from those docs.

## 1. Two towns: cooperative, not competitive

The two towns serve the **same Patron and shared cake**. Both bakers work
toward ONE Judgment. Tone: "cooperative co-op with collateral drama."

> "Two bakers alternate shots at ONE shared cake (hotseat; solo = one baker)"
> (02-design.md, §Core loop)
> "Each baker hails from a different tiny town — that's WHY there are two
> catapults (it takes two towns to feed one giant)." (02-design.md, §The two
> towns)

Towns are **spatial consequences of ballistics**, not strategic choices. An
overshoot buries the partner's villagers (physics as diegetics). Score penalty
is **shared** — no blame mechanics — but attribution displays per-town for
banter:

> "casualties are attributed per town on screen ('Emberdale: 14 frosted'),
> which produces the right banter ('you frosted MY town!') without splitting
> the score." (02-design.md)

Villagers are never killed — tone guard enforced: "buried in frosting"
(sticky, comedic). Penalty: up to −20 points per Judgment from
`round(20 * buriedTotal / populationTotal)`. Populations: Emberdale (120),
Butterholt (95). Towns surround catapults: flopped swings bury your own plaza;
big overshoots frost the partner's town.

## 2. Patron variety: behavior trees, state-driven demands

Not randomized. Patrons are **characters**, each with an ordered list of
`condition → demand` rules (deterministic).

> "Patrons run minimal behavior trees, not random tables... Each Patron is a
> personality = an ordered list of `condition → demand/action` rules evaluated
> against the observable match state." (02-design.md, §The Patron)

Example conditions and demands:
- `turns > 6 AND color variety low` → **"MORE SPRINKLES"** (amend order)
- `cherry not in original order AND cake looks good` → **"...I want a cherry NOW."**
- `mess high near their seat` → **The Bite** (terrain carve, recast as eating)
- `spice trigger` → **The Sneeze** (wind gust, scatters loose material)
- Patience low → demands accelerate

"Difficulty = a more demanding rule set, not bigger numbers: harder Patrons
ask for more items, scarcer items, and change their minds more." No fixed
roster size specified. State-in → demand-out, side-effect free, seeded-RNG
only.

## 3. Projectile/topping roster (2D scope)

Five materials pinned for first release:

| Topping | Rules | Role |
|---------|-------|------|
| Sponge | Inert, destructible | Cake body; integrity score watches it |
| Frosting | Flows (viscous), then sets/cures | The signature rule: lands hard→splats, soft→places. Cures solid after 120–180 ticks. |
| Sprinkles | Fall (granular) | Colored, nearly free; color variety tracked |
| Cherry | Solid blob deposit, ammo-limited | One per baker; placement-precision test; the finisher/climax shot |
| Table/Stone | Inert | World substrate |

Unlock/progression (meta-game, designed but out of Phase 1 scope):

> "toppings have point costs; better toppings (cherries, exotic recipes) are
> UNLOCKED over a campaign of levels; Patrons grow more demanding as levels
> advance." (02-design.md, §Meta-game)

Deferred: reaction table (hot fudge melts then sets; syrup sticks; steam).
The pantry is a data-row system (`WEAPONS` table: ballistics params + deposit
effect + landing-energy profile) ready for expansion.

## 4. Progression / session structure

Levels/campaigns designed but out of Slices A–D scope. No permanent XP or
meta-unlock system built. Match loop per order: Patron places order →
alternating fire (2D) → wind shifts, limited ammo, collateral costs →
mid-bake Patron interference (bite, sneeze, order change, nag) → Judgment
(two gates, both lose states).

**Dessert variety: NOT in the 2D design.** The cake is treated as terrain,
one dessert type (multi-tier sponge on a table). "Different desserts for
different patrons" is a new 3D idea with no lineage constraint.

**Climax — The Crowning:** the Patron picks a champion
(`Patron.chooseChampion(stats)`) for one final formal shot with the finisher
requirement (e.g., cherry). Flubbed → rescue pass to partner. Climax ends the
match (time/patience suspended). Narrative closure enforced by structure.

## 5. Tone guard (sacred)

> "this is a cozy game and the ammunition is FOOD — nobody dies. A hit town
> yields '14 villagers buried in frosting', a complaint counter, shaking
> fists, sticky roofs. The sting is real (score penalty) but the fiction
> stays bright." (02-design.md, §The two towns)

"Every artillery game is about subtraction. This one is about addition."
Collateral is mechanical, never tragic.

## 6. The pivot record (06-3d-realtime-pivot.md)

**Ports (the soul):** genre inversion (artillery-as-construction), landing
energy (splat vs place), two-gate Judgment, orders-as-data, Patron behavior
trees (state in → demand out, **turn/tick agnostic**), **two towns + frosting
tolls**, toppings-as-data pantry; code: rng.ts, judgment shape, Patron trees,
Match-as-state-machine, layering, headless verification culture.

**Does NOT port:** "The falling-sand cellular automaton. Do not attempt a 3D
voxel fluid sim." 3D body: frosting = surface accumulation; scoring =
sample-point census.

**Turn order:** the pivot IS the removal of turns —

> "timed orders, players physically run to their catapult, load the correct
> ammunition from a pantry, and fire. Genre move: *Worms* → *Overcooked with
> catapults*. The patience budget becomes a literal clock." (06-pivot.md)

**First-person aiming is NOT FPS-aiming:**

> "The catapult is a machine you OPERATE, not a gun you shoulder... Aim is
> machine state, not camera state. Dead reckoning survives intact — read the
> pennant and the last splat, crank two notches left, one click less tension."
> (06-pivot.md, §Design decisions)

## Contradictions found

None. Behavior trees and Judgment are explicitly turn/tick agnostic; the
real-time pivot is clean against the 2D design. NOT-yet-ported items surfaced
by this brief: **frosting tolls / collateral burial** (listed under "ports"),
**The Crowning** climax ceremony, patron amendment rules beyond the nag.
