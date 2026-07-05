# Plan 10 — The projectile pass: sprinkles burst + fudge (2026-07-05)

The build plans/09 §8 designed and held, unlocked by the visionary after the
towns/upgrades discussion (same session: town-as-data, one-way split at a
milestone, per-town upgrades, shared purse — those decisions are recorded in
the discussion and will become the towns-arc plan when that slice starts;
research/11 measured the two-town union: 75.2% at 8 clicks, 84.4% at 9,
15.6% forever unreachable — mostly ELEVATION MOATS, not the far side).

## 1. The docket (decided with the visionary this session)

Artillery archetype → dessert topping, each with a JOB, arriving one per
rung (the one-new-demand law, plans/09 §2):

- **Frosting glob = the standard shell** (shipped) — the baseline splat.
- **Sprinkles = the cluster airburst** (THIS PASS) — the 2D game's own
  idea, made 3D: proximity fuse, payload dispersion.
- **Cherry = the precision climax** (shipped) — one heavy object, no
  forgiveness; the order's dramatic peak.
- **Fudge = the incendiary** (THIS PASS) — hot, RUNS DOWN WALLS, then
  sets. Its sales pitch is measured: research/11's elevation moats (wall
  bands ground-splash can't reach up to and ledge-splash can't reach down
  to) are exactly what an asymmetric downward splat band fills.
- **Syrup = the combo-enabler** (DEFERRED, next review) — sticky patch;
  the next solid that lands there stays. The co-op setup shot.
- **Gumball = the bouncing knocker** (BENCHED, re-discuss) — cheap erasure
  would deflate the decoy-crown drama; knockability's scarcity is what
  makes crowns tense.
- Candles (want the Crowning ceremony), powdered sugar (no honest judgment
  job in co-op), MIRV variants (free in the burst data): parked.

**THE FORGIVENESS LADDER (ported lineage law):** the 2D game escalated
execution tension via per-payload scatter (frosting ±12 → cherry ±3). RNG
scatter violates our determinism law; the LAW ports without the mechanism —
forgiveness comes from payload PHYSICS (splat radius > burst patch > one
small solid), orders sequence from forgiving to precise, and screw-ups stay
100% traceable (research/07 razor).

**THE BOUNDARY (decided):** rungs introduce PROJECTILES (demand-side — the
Patron starts asking); the shop sells INFRASTRUCTURE (supply-side —
turntable, ladder, flag). Keeps the shop small, pairs every projectile's
arrival with an order that teaches it, dodges the Overcooked warning about
purchased power wrecking authored thresholds. Cherry-as-scarce-ammo (2D)
stays unported: the one-cherry row already creates the climax shot.

## 2. The sprinkle burst (plans/09 §8, now with decided numbers)

- **Proximity fuse**: burst when the carrier comes within PROXIMITY_M
  (1.25m, the §8 hypothesis mid-point) of the TIER STACK — analytic
  distance-to-cake (new `distanceToCake` in core/arena.ts: min over tier
  cylinders, sqrt/mul/add only — cross-engine exact). Checked pre-step in
  ProjectileManager alongside the wake pass. Cannot pop mid-arc on a wild
  shot; a clean miss falls through to the **impact-burst fallback** (floor
  pop at first contact — honest visible mess).
- **The carrier** flies as the standard 0.3 ball (a packet of sprinkles —
  reads like every other shot on the arc) and CEASES at burst: no carrier
  impact event, a `burst` event instead.
- **Grains**: GRAINS_PER_SHOT = 40 default (his eye picks from 20/40/80
  in-preview — dev knob `__game.setGrainCount`, loopback-only). Tiny
  capsules r=0.045, halfHeight=0.055 (~0.2m long — chunky-cute; true scale
  is physics-unstable), restitution 0.3, multicolor (palette by index,
  color-variety judgment stays deferred). Spawned in a seeded 0.35m shell
  around the burst point (co-spawning at one point is a solver explosion),
  velocity = carrier velocity + seeded jitter (2 m/s) — landing-energy
  texture survives with no extra rule (hot = wide debris).
- **Seed S rides the shot event** (the pivot record's reserved slot): the
  Room mints a 32-bit seed per shot from its own mulberry32 stream; the
  wire `shot` message carries it; client replicas replay the identical
  burst. No new wire paradigm.
- **Grains are real tracked shots**: they impact (QUIET — no flash/marker
  spam), settle, ledger, FREEZE (the freeze law is what makes grain counts
  affordable), wake, get knocked. Tag inherited from the carrier — stale
  bursts litter and score nothing.

## 3. Judgment rules (plans/09 §8, mechanics decided)

- **Grains never crown**: `crowns: false` column in the pantry table; the
  crown's uppermost-solid scan skips non-crowning toppings. (Also fixes a
  latent wrong: a pre-pass sprinkle ball COULD usurp a crown.)
- **A burst is ONE delivery for mess**: ledger entries weigh
  1/GRAINS_PER_SHOT when their topping bursts — one wild shot is one
  mistake, not 40 floor entries drowning the axis. One shared helper
  (`weighedMess`) feeds BOTH judge() and the Patron's thunder rule
  (order-flow passes the same weighted number — the Giant must not
  thunder 40× harder at one bad burst).
- **Asks re-pin to grain counts**: SPRINKLES_NEEDED 2 → 60 grains
  ("60 × SPRINKLES ON THE FROSTING" ≈ two good bursts at the default 40 —
  same shot economy as today's 2 solids; re-pins with the density pick).
- **Waste unchanged**: the carrier is the shot; grains are payload.

## 4. Fudge (the moat-filler, sandbox-first)

- Paint form (regime law: frosting is SURFACE) with a per-topping SPLAT
  SPEC — the new column: `{ dollopRadius 0.45, dollopCoats 2, splashBase
  0.5, splashPerSpeed 0.03, splashMax 0.8, bandUp 0.25, bandDown 1.7 }`.
  Narrower than a frosting glob (a thick stream, not a splash), band
  asymmetric DOWNWARD — fudge runs down the wall from a ledge hit, then
  sets. bandDown 1.7 reaches the measured moats (ledge impacts ~y2.13
  reach down to ~0.4; tier-2's lower wall band likewise).
- `FrostingField.paint(impact, speed, spec?)` — defaults preserve today's
  constants byte-for-byte (no economy re-pin: research/06/10/11 model the
  frosting glob and stay valid). Fudge marks the SAME coverage field
  (color-variety deferred); client renders its painted samples dark brown
  (InstancedMesh per-instance color; the welcome snapshot doesn't carry
  color — accepted décor gap, same class as ground splats).
- Pantry: fifth crate + `shelf-fudge` interactable + prompt. Roster's
  whitelist is the table — the row IS the permission. Lime law holds:
  every id fires, flies, lands, counts as mess where it misses.
- **NOT in any order yet**: rung authoring introduces it (the boundary,
  §1). Until then it paints coverage honestly in the sandbox — fine; the
  0.42 potential is clamped ("beating the ceiling reads as all of it").

## 5. Wire changes (small, additive)

`shot` gains `seed: number`. `scored` gains `count?: number` (same-tick
same-topping settles batch into one message — a burst must not be 40
broadcasts). Everything else rides existing shapes.

## 6. Verification

New tests: proximity burst (pops before contact, N grains, carrier gone),
impact fallback, seeded determinism (two worlds, same seed → identical
grain rest positions), grain freeze, never-crowns, weighted mess,
asymmetric band. Existing pins: frosting defaults unchanged; room.test's
WIN path re-choreographed for bursts (the ask is grain counts now — the
81/100 pin re-pins on purpose, THE one deliberate pin move of this pass).
Then: npm run check, live loopback smoke, the 20/40/80 density review —
HIS EYE picks; GRAINS_PER_SHOT and SPRINKLES_NEEDED re-pin together.
