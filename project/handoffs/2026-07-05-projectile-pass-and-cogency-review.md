# Handoff — 2026-07-05 (projectile pass built; sticky/fresh-cake laws NOT COGENT — 4 corrections designed, awaiting build)

## 1. Snapshot

HEAD 46b2c7f. 187 vitest green (20 files), both tsc legs clean, tree clean.
Five commits this session: research/11 (two-town union study), the
projectile pass (plans/10), CLAUDE.md pointer, then the sticky-frosting +
fresh-cake laws (plans/10 §7 addendum). THE CRITICAL CONTEXT: the
visionary's live test found the two addendum laws DO NOT DELIVER what they
promise (sprinkles appear to go through frosting; sprinkles persist at the
cake base across orders). A two-agent holistic review (ground-truth
measurement + adversarial cogency read) confirmed both reports and produced
a NOT-COGENT verdict with four designed corrections — NOT YET BUILT. He
blessed noting the findings; next session starts from this handoff plus HIS
understanding of the problem. Do not treat the shipped sticky/fresh-cake
code as settled.

## 2. What changed this session

Morning (discussion, decisions recorded in plans/10 §1 and this handoff §6):
- Towns/upgrades design settled with the visionary (see §6 DECISIONS).
- research/11-two-town-union.mts (84e2c6c): union 75.2% @8 clicks / 84.4%
  @9 (saturates); overlap 12.4→27.4% at 9; 15.6% unreachable by BOTH towns
  — mostly ELEVATION MOATS (ledge/mid-wall bands), not the far side. Fudge's
  measured job.
- Agent briefs (not committed, summarized in plans/10 + chat): codebase
  singularity audit (towns slice scope: TOWNS table in core/arena.ts per
  CAKE_TIERS idiom; ballistics needs baseYawDeg — room.ts + shots-view.ts
  twin call sites change together; op/load/lever need NO townId if
  membership is server-side state; roster.machineIntent needs per-town
  filter; room.test machine broadcasts = biggest test blast radius; no
  roster.test.ts exists). External precedent brief (PlateUp walk-up crates
  + shared pool + all-ready gate; Overcooked warning: purchased power must
  be priced into authored asks; Scorched Earth precedent for
  wind-then-shop-sells-answer; one-way choices need milestone + full
  preview + all-confirm).

Afternoon (built):
- 18219ed PROJ: the projectile pass (plans/10 §1–6). Sprinkle cluster
  airburst: proximity fuse 1.25m from tier stack (core/arena.ts
  distanceToCake, sqrt-only), impact-burst fallback, 40 grain capsules
  (r .045, hh .055) with seeded scatter (mulberry32(seed) — seed minted by
  Room from mulberry32(0x5eed5), rides the shot wire msg). Grains: quiet
  impacts, grain-scale rest thresholds (0.15 m/s / 2.0 rad/s), linear
  damping 0.8 + angular 12 (Rapier has NO rolling resistance — undamped
  confetti rolls forever), GRAIN_COLLISION_GROUPS (grains never collide
  with each other — grain-grain contact + wake pass was a perpetual-energy
  pile). Grains never crown (toppings.ts crowns:false + canCrown);
  burst = ONE delivery in mess (deliveryWeight 1/grains; weighedMess shared
  by judge + patronLook). Fudge: paint row with per-topping SplatSpec
  (frosting.ts DEFAULT_SPLAT preserves classic byte-for-byte; fudge bandUp
  .25 / bandDown 1.7 — runs down walls), 5th pantry crate, dark
  per-instance blob color client-side. scored msg batches per tick
  (count?). SPRINKLES_NEEDED 60 (≈ two good bursts). Dev knob
  __game.setGrainCount (loopback only).
- 46b2c7f PHYS: sticky frosting (stickyPaint callback on ProjectileManager;
  Room binds frosting.frostedNear(p, STICKY_NEAR_M=0.45), client binds
  FrostingView twin; grain freezes at first impact near paint) + fresh-cake
  law (clearCakeSolids at redeal Room-side + client on fresh msg; isOnCake
  widened by DESSERT_SKIN_M=0.12; skin-stuck grains rejoin FROZEN in
  spawnAtRest; "Giant licks" fiction purged). Pins: one burst 40/40 on
  paint, WIN line 38/80 vs 60 ask.

## 3. Architecture and invariants

Unchanged: sacred layering (core/game headless, enforced twice);
determinism (seeded rng only, fixed 60Hz); sync-shots-not-surfaces (seed S
now live on the shot msg); freeze law (settle→Fixed, wake ≤ WAKE_RADIUS
1.0); regime law (paint SURFACE / solids OBJECTS); live-truth ledger;
forgiveness ladder (payload physics, not RNG — plans/10 §1); boundary law:
rungs introduce projectiles, shop sells infrastructure.

NEW and load-bearing:
- stickyPaint is the ONE place paint feeds back into physics. Cross-engine
  one-ULP caveat documented; also a symmetric one-tick lag (paint applied
  after step on both sides — fine, same ordering both replicas).
- Fresh-cake law: everything ON the dessert leaves at redeal; floor litter
  stays (crew's mess). clearCakeSolids filters by isOnCake over
  non-in-flight bodies; frozen/waking bookkeeping verified complete.
- VERIFICATION STANDARD (memory: verify-positions-not-counters): live
  smokes must inspect body positions BY CATEGORY, never counters; visual
  claims need geometric verification; new physics laws need an explicit
  render-contract check; tests must exercise real predicates (the shipped
  sticky test stubs stickyPaint=()=>true — mechanism only).

## 4. File map

- src/core/projectiles.ts — freeze law + burst (BurstSpec/GrainBody,
  burstNow, fuse pre-step, impactBursts + stuck post-drain), stickyPaint,
  clearCakeSolids, spawnAtRest frozen-rejoin branch, grain damping/rest
  constants.
- src/core/arena.ts — geometry + distanceToCake + DESSERT_SKIN_M-widened
  isOnCake (tierOf || skin).
- src/core/frosting.ts — census grid, SplatSpec/DEFAULT_SPLAT/splatSamples,
  STICKY_NEAR_M, FROSTED_NEAR_M, FrostingField (paint takes spec).
- src/game/toppings.ts — physical pantry table (form/crowns/burst/splat),
  canCrown, deliveryWeight. src/game/judgment.ts — weighedMess, crown scan
  uses canCrown. src/game/tuning.ts — SPRINKLES_NEEDED 60 + re-pin math.
- src/server/room.ts — binds stickyPaint (ctor), seed minting, batched
  tickScoringPhase (groups per topping|fate), redeal: settled=[], frosting
  .reset(), clearCakeSolids.
- src/client/shots-view.ts — burst replay, grain capsule meshes
  (GRAIN_PALETTE), quiet grain impacts, bindStickyPaint, clearCakeSolids,
  spawnResting grain bodies, rotation sync. frosting-view.ts —
  per-instance blob color (fudge dark), stickyNear, splat-spec ground
  discs. net-handlers.ts — NetFx.clearCakeSolids on fresh; scored count
  flash. hud.ts/scene.ts — shelf-fudge, 5 crates. main.ts — wiring +
  setGrainCount.
- project/plans/10-projectile-pass.md — docket + build record + §7
  addendum (the two laws AND their origin story).
- project/research/11-two-town-union.mts — standing union study.

## 5. How to run, test, verify

`npm run check` (root tsc + headless tsc + vitest; check $?). Dev 5174,
server 5175 (PORT overrides; visionary often has one running — never
kill). Studies: research/06 (~2min), /10 (~4min), /11 (~3min) mirror
splat constants — re-pin law applies to any splat change. Driver:
__game.send({t:"op",...}/{t:"load"}/{t:"lever"}), crank 0.75s/click
room-side; detached-async preview_eval for long smokes; check
document.hidden FIRST if the loopback seems dead. setGrainCount(n)
mutates the shared TOPPINGS table (loopback only). VERIFY BY POSITIONS
(§3). Headless ground-truth scripts: drive Room directly, reach internals
via (room as any).shots.bodies/.frozen — pattern proven this session.

## 6. Open items and decisions

DECISIONS (do not re-litigate):
- Towns: Town-as-data (TOWNS table in core/arena.ts, CAKE_TIERS idiom);
  fixed per-round membership (assigned state, NOT proximity); one-way
  split within a round, renegotiable BETWEEN rounds; split offered at a
  campaign milestone with full preview + all-players-confirm; spotter is
  an emergent role (no code).
- Upgrades: per-town, purchased; counter-tool law (shop sells the answer
  to the pain the rung introduced: ladder↔separation, turntable↔reach,
  flag↔future wind rung); turntable next, controlled from its town
  (walk-up interact), lean scarce (one per dessert, defer tug-of-war);
  shared purse + walk-up crate shop + untimed prep + all-ready gate (DRG
  duplicated-income is the documented fallback); shop opens with ≥2 items
  (turntable + ladder).
- TENSION_MAX_CLICKS=10 blessed, ships BUNDLED with towns slice (arena
  extension + footprints); click 9 = skill, 10 = toll; needs crank
  legibility at 9→10.
- Projectile docket: sprinkles+fudge now (done), syrup deferred to review
  (combo-enabler: sticky patch holds next solid), gumball BENCHED (cheap
  erasure deflates crown drama), candles/powder/MIRV parked.
- Fresh-cake law: dessert resets wholly between orders; floor litter
  remains. The Giant does NOTHING between orders (fiction: dessert eaten/
  taken away, naked cake wheels out).
- Cherry-as-ammo NOT ported; economy re-pins recorded in tuning.ts.

OPEN — THE FOUR CORRECTIONS (designed, assessed, NOT built; he will bring
his own understanding):
1. Grip predicate: stick only when impact is ON the dessert skin
   (distanceToCake ≤ ~DESSERT_SKIN_M) AND frostedNear — floor impacts
   never stick. Kills the manufactured floor-crescent (measured: 23/40
   grains frozen 0.13–0.19m from the wall foot persist forever; 0/40 ever
   stuck to an actual wall face at 5 clicks — first contact is ground).
2. The standoff (render contract): stuck grains freeze offset ~0.15m
   outward along the local surface normal so they perch visibly on the
   blob crest (blob spans 0.29–0.43m; grain center at 0.045 is nested
   INSIDE at every coat level — measured 33/40 swallowed on tops).
   Fixed body → no support needed; deterministic; knockable (drops when
   woken).
3. Wake pass skips impossible pairs: grain movers never wake frozen
   grains (they cannot collide) — measured 39/40 pile grains cycle in
   waking forever.
4. Paint flies through grains: exclude GROUP_GRAIN from paint shots'
   collision filter (globs currently splat against stuck grain bodies,
   up to ~0.1m off-surface).
   Plus: real-predicate tests (painted wall + floor band; redeal boundary
   band), re-pins (38/80 etc. will move), live smoke verified by
   positions. Known-accepted: symmetric one-tick paint lag; stale burst
   landing on fresh cake (rare; revisit if seen).

OPEN (after corrections): his density review (20/40/80 by eye; ask
re-pins with pick — grip made yield ~100%, ask may want raising);
patron nag = +1 grain on a 60 ask (comedy or broken — his call);
neatness watch; two-town union informs towns-rung authored ask
(0.75–0.84 band).

## 7. Next session focus

1. Discuss the four corrections against HIS understanding of the problem
   (he explicitly reserved this); adjust, then build them as one careful
   pass — corrections 1+2 change grain rest geometry, so all grain pins
   re-pin (tuning comment math too).
2. Re-verify by positions (headless categories + live smoke + his eye).
3. Then: density review → towns slice (Act 1 spine per the singularity
   audit: TOWNS table, baseYawDeg ballistics, per-town intent, townId on
   outbound msgs only, clicks=10 bundled, two-town union ask authoring)
   → dessert report → friend test.

## 8. Recommended reading order

1. This handoff (§6 decisions + corrections are the session's yield).
2. project/plans/10-projectile-pass.md — docket, build record, §7
   addendum (what shipped and why it is under correction).
3. src/core/projectiles.ts — burst + sticky + clearCakeSolids (the
   correction site), then src/core/arena.ts isOnCake/DESSERT_SKIN_M and
   src/core/frosting.ts STICKY_NEAR_M.
4. src/client/frosting-view.ts refresh() — the blob geometry the standoff
   must clear.
5. src/server/room.test.ts sprinkle/WIN tests — the pins that will move.
6. plans/09 + research/11 header — direction + the union numbers (towns
   slice inputs).
7. CLAUDE.md — law, commands (pointer updated 4bc2949; update again after
   the corrections build).
