# Port-Gap Analysis — 2D Rules Lab → 3D Real-Time (v1)

*Status: research, 2026-07-03. Written after the greybox slice (plans/01)
completed and the two-tab human test passed. Sources: this repo at HEAD
71f8366; E:\Projects\artillery (READ-ONLY) — plans/02-siege-bakery-design.md,
plans/06-3d-realtime-pivot.md, and the LIVE 2D code (`src/game/Patron.ts`,
`judgment.ts`, `BakeMode.ts`, `core/weapons.ts`), which has evolved past the
design doc: the golf-swing power meter, the Crowning finale, BakerStats
attribution, frosting colors, and the sprinkle airburst are all BUILT and
playtested there. This doc audits against the code, not just the plans.*

## Method

Four buckets, per the handoff's ask: (A) already ported, (B) ports next as
near-literal data/code, (C) ports as concept — same rule, new body, (D)
deliberately dropped. Plus (E) new-in-3D obligations with no 2D counterpart,
and (F) what the analysis says about the next slice.

---

## A. Already ported (receipts in this repo)

| 2D thing | 3D landing | Notes |
|---|---|---|
| `core/rng.ts` | `src/core/rng.ts` + test | Verbatim, per plan. |
| Layering law core→game→render | core/game/client + **server/** | Strengthened: the server layer is new, vitest is still the tripwire. |
| Determinism religion | Fixed 60Hz, seeded-RNG-only, no wall clock in core/game | Proven cross-runtime (browser vs Node settle identical to the cm) — this IS what made sync-shots-not-surfaces work. |
| Headless verification culture | vitest (55) + DEV `window.__game` | Same culture, new house. |
| Match-as-state-machine | `server/room.ts` — THE match implementation | Loopback room-of-one = solo. Stronger than the 2D `Match`: it's already the network authority. |
| Genre inversion (artillery-as-construction) | Rest-position scoring: land ON the cake or score nothing | The physicalized version — rolling off the back replaces the 2D "deposit lands where it lands." |
| Dead reckoning as THE skill | Aim = machine state (traverse/tension), no prediction UI | Playtest-confirmed the difficulty is the fun kind (2/3 cherries). |
| Mistakes execute, never block | Wrong ammo loads and fires (`order.ts` ignores it, nothing stops it) | Overcooked rule, intact. |
| Orders-as-data (degenerate) | `game/order.ts` — {topping, needed, ticksLeft} | The TOY. Single hardcoded requirement; the 2D requirements-list shape is bucket B. |
| Landing energy (readout only) | SPLAT_SPEED 13 readout; IMPACT_ABSORPTION 0.15 | The skill exists (settle ladder 5/6-7/8 clicks); the *consequence* (splat craters vs clean place) waits for frosting — bucket C. |
| Patience budget → literal clock | 90s order clock in `order.ts` | The pivot's core promise, delivered. Patron mood modifying it is bucket B. |

## B. Ports next — near-literal data/code translation

These translate with their types and logic largely intact; only the
measurement bodies and the cadence change.

1. **Requirement / BakeOrder / RequirementCheck** (2D `judgment.ts` types).
   `order.ts` grows from one hardcoded topping-count to a MUTABLE list of
   typed requirement rows (`frost-coverage`, `on-frosting`/count-on-cake,
   `crown`/count-in-zone) + shotBudget/par/passScore. The Patron amends
   orders by appending/tightening rows — the mutability is deliberate and
   ports as-is. Count-based rows are measurable TODAY (rest positions are
   known); coverage rows activate when frosting lands.
2. **Two-gate `judge()`**. Gate 1 (every requirement met → else "the giant
   goes hungry") ports now, whole. Gate 2 (assembly score ≥ passScore → else
   "refused", stars by margin) ports structurally now, but note the honest
   arithmetic: the score formula is 0.35 coverage + 0.15 neatness + 0.25
   integrity + 0.15 mess + 0.10 waste — **75% of gate 2 measures frosting
   and cake damage, which don't exist in 3D yet.** Mess (toppings at rest
   off-cake) and waste (shots vs par) are computable today; the other three
   axes need frosting/carving. Port the interface + formula with axes
   stubbed to neutral, or weight-renormalized, and say so on the HUD.
3. **Patron interface + PatronContext + PatronAct + The Giant's rule list**
   (2D `Patron.ts`). Behavior trees are state-in → demand-out and explicitly
   tick-agnostic — this was designed to survive the pivot. What changes:
   the *cadence* (turn slot → a real-time "the Patron looks at the cake
   every N seconds" timer in `Room.tick`) and the *observables* (cell census
   → counts/sample-census). Rule-by-rule audit of `createGiant()`:
   - Bite-on-NEW-mess (incl. the `prevMess` grudge fix) — logic ports now;
     the bite's *effect* (carve) is bucket C.
   - Sprinkle nag (tighten row once) — ports when sprinkles are a topping.
   - Cherry demand when cake looks good — needs a coverage signal (frosting).
   - Time-runs-short reminder — ports now (clock + checklist).
   - The Sneeze — needs WIND, which does not exist in 3D ballistics at all
     yet (see C6).
   - Grumble + patience burn (faster on regression) — ports now;
     patienceDelta becomes seconds off the clock.
4. **BakerStats attribution ledger** (shots, coverageAdded, messCaused,
   villagersBuried). Room members already have stable ids/names — the
   ledger hangs off `Member`. Score stays SHARED; receipts exist for
   character (champion choice, banter, town attribution). Cheap to carry
   early, painful to retrofit.
5. **Toppings-as-data pantry** (2D `core/weapons.ts` → a `game/toppings.ts`
   table). A topping row = ballistics profile (the 2D `gravityScale`
   becomes mass/launch-speed multipliers), impact effect, splat threshold.
   The two pantry crates (cherry/lime) hardcoded in the client become rows.
   Per-row notes: `meterBand` does NOT port (D2); `burst` (sprinkle
   airburst) ports as concept — a deterministic fragment fan in 3D is the
   same trick, seeded RNG in the shot event.
6. **Patience-as-clock modulation**. 2D: patience partly turn-count,
   modified by Patron mood. 3D: the 90s clock already exists; Patron acts
   add/remove seconds (`patienceDelta` × a tuning constant). Trivial once
   the Patron slot exists.

## C. Ports as concept — same rule, new body

1. **Frosting = surface ACCUMULATION** (plans/06 call, reaffirmed): splat →
   coverage mask in cake texture space + blobby decal/local mesh; gentle
   place → clean patch; brief wet slump, then cures. NO voxel fluid. This is
   now the single riskiest unbuilt tech in the 3D project.
2. **Cell census → sample-point census**. Fixed sample points scattered over
   cake surface/zones; coverage, neatness (height/coverage variance over
   points), mess, integrity become point-counting again. 2D `judgment.ts`
   measurement functions translate almost line for line ONCE the sample
   grid exists. `isOnCake` in `core/arena.ts` is the embryo.
3. **CakeZones → 3D zones**. cakeRect/peak zone/mess margin/town ranges
   become AABBs or masked sample-point sets in `core/arena.ts`. Needed by
   requirements ("cherry within the peak zone"), the census, and towns.
4. **The Bite** (Patron eats a chunk). 2D `carveDisc` → 3D cake deformation.
   Coarse chunked approach per plans/06 (bites are big). Also the entry
   point for the INTEGRITY axis. Can be faked v1 as a scooped decal +
   collider swap; real carving is its own work.
5. **Two towns + counted tolls**. Town geometry flanking the arena; stray
   toppings at rest over a town zone bury villagers (TOLL_CELLS_PER_VILLAGER
   becomes toll-per-topping or per-splat-area). Shared grievance penalty
   (up to 20 pts) + per-town attribution port as-is from `BakeMode.ts`.
   Naturally pairs with the second catapult (it takes two towns to feed one
   giant — each crew fires OVER the far town, mess made personal).
6. **Wind + the pennant**. Does not exist in 3D yet, and the Sneeze and the
   wind-honest-world identity depend on it. Port: constant lateral accel on
   projectiles (deterministic; rides in the shot event or room state), a
   pennant prop that flies harder as wind rises. The 2D load-bearing-pennant
   decision (guide shows calm air, wind deviates the real shell) has no 3D
   guide to apply to — in 3D the pennant + your last splat were ALWAYS the
   only guide. The decision survives as: never add a wind-compensating UI.
7. **Splat-vs-place as CONSEQUENCE**. Today impact speed is a readout.
   With frosting: fast arrival craters/sprays (mess, integrity damage),
   spent arrival places clean. The velocity-scaled-impact rule from the 2D
   engine, re-bodied. Rest-position scoring already gave us half of it
   (skid-off-the-back is a placement failure mode the 2D game never had).
8. **The Crowning finale** (2D BakeMode: finisher gate → champion → rescue).
   The state machine ports (enterCrowning, rescue hand-off, ends the match);
   the MEANS need real-time redesign: "every turn routes to the champion"
   has no turns to route. Candidate translation: cherry crate stays locked
   until every other box is ✓; the Patron names the champion; only the
   champion can LOAD the cherry (others can still crank/spot — co-op stays
   alive during the climax). Wind calms, clock freezes, patron holds his
   breath. Worth its own design pass when Judgment matures — do not
   improvise it mid-slice.
9. **Environment-actor slot**. 2D `takeEnvironmentTurn` → a Patron cadence
   inside `Room.tick` (every N seconds of order time). New protocol
   messages: `patron {utterance, seq}` and order-amended events — the
   existing broadcast fabric handles them trivially.
10. **Meta-game hooks** (points, unlocks, campaign). Still post-everything
    scope, but the pantry-as-data-rows (B5) keeps the hook alive: costs are
    a column waiting to be read.

## D. Deliberately dropped — recorded so nobody re-ports them

1. **The falling-sand cellular automaton** (the 2D body). Already ruled in
   plans/06. Frosting is accumulation, sprinkles are instanced props or
   decal scatter, nothing simulates cell-by-cell.
2. **The golf-swing power meter + `meterBand` handling trait.** Major recent
   2D work (built + playtested 2026-07-02) — and it does NOT port. It
   solved a 2D problem: turn-based firing had no execution cost, so a
   timing meter manufactured one. In 3D the execution cost is PHYSICAL —
   cranking the winch takes real seconds under a real clock, drop the winch
   and lose progress, and you personally ran the ammo over. The machine IS
   the meter — and so is the GAUGE (visionary, 2026-07-03): the throwing
   arm visibly winches down and back as you crank (main.ts renders
   continuous arm rotation from tensionClicks + partial crank progress),
   so power is read diegetically off the machine's body, in the world,
   not off a HUD bar. The per-payload escalation the meterBand bought
   (frost forgiving → cherry brutal) should be re-earned physically
   instead if playtests want it (e.g. cherry needs a slower, finer winch —
   a data row, not a meter).
3. **Turn structure entirely**: hotseat alternation, `nextActor`, the
   non-projectile turn-resolution path. Real time dissolves them; the Room
   tick + Patron cadence replace them.
4. **Actor HP / blast damage / missiles as weapons** (2D `damage.ts`,
   missile rows). Tone guard says nobody dies, and in 3D there is no reason
   for anti-baker damage at all. Destruction survives only as cost-of-
   failure (splat mess, integrity loss, town tolls). The missile/big-missile
   rows do not become pantry items.
5. **2D terrain-gen / cake-gen samplers**. Blender → glTF is the level and
   prop editor; the cake is authored geometry + zones, not sampled terrain.
6. **Tank gravity for bakers**. Bakers stand on flat ground via the
   character controller; already true, stays true.
7. **Aim guide of any kind**. The 2D game has one (wind-blind since the
   pennant decision); 3D never gets one — settled in the greybox playtest
   and the no-range-gauge call. Markers-as-memory only; spotter stays
   emergent.

## E. New-in-3D obligations (no 2D counterpart — so no port source)

- The tunneled PC-to-PC friend test — still THE success test, still open.
- Server-side baker capsules (topping-vs-baker comedy bonks) — known limit.
- Reconnect/rooms/names, hosting, bundle split — parked (plans/02 non-goals).
- Art & sound identity — entirely unstarted; the 2D bright-palette guidance
  is mood truth, not assets.
- Toppings accumulating across rounds (fun, unmeasured cost) — watch it.

## F. What this says about the next slice

The fork on record: (1) Patron + real Judgment, (2) frosting + census
scoring, (3) second catapult/wider arena, (4) art pass. Prior recommendation:
1 then 3.

This audit sharpens that with one hard number: **gate 2 of the Judgment is
75% frosting-and-damage by weight** (coverage 0.35 + neatness 0.15 +
integrity 0.25). A "Patron + real Judgment" slice ships gate 1 WHOLE
(requirements checklist over count/zone rows — measurable today), the Patron
character layer whole-minus-two-rules (bite-effect and sneeze need carve and
wind; the grudge logic, nags, reminders, patience burn, order amendments all
port now), and gate 2 only as mess + waste. That is still the right next
slice — it turns the toy order into a GAME with a character in it, exercises
the protocol (patron/order-amendment messages), and generates the playtest
data frosting tuning will need. But it argues for reordering what follows:

**Recommendation: 1 → 2 → 3.** Patron + gate-1 Judgment next (with gate 2
honestly partial); then frosting + census (completes the other 75% of gate 2
and unlocks the Giant's coverage-conditioned rules, the Bite's teeth, and
splat-vs-place as consequence); THEN second catapult + two towns as one
slice (towns are mess-census consumers — they want frosting to already
exist, and the wider arena is where per-town attribution pays off). Art
stays last and cheap-to-defer.

Scope guard for slice 2: no wind, no bite-carve (bite can wait or be a
patience event without terrain effect), no crowning finale — those are
slices 3+ dependencies. The slice question: *"does a Patron with opinions
make the 90 seconds funnier and tenser than a silent timer?"*
