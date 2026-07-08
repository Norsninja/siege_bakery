# Handoff — 2026-07-08 (third session) — SLICE-1 REVIEW + SLICE 2 (DESSERTSPEC) LANDED

## 1. Snapshot

Three arcs. (1) The slice-1 review found NO bugs; two findings fixed
(commit 3af4aa9): the leaver-mid-countdown law pinned (a leaver does
NOT cancel; the last leaver does), and room.ts's countdown comment
corrected (no client prediction exists — the 1Hz beats ARE the
display). (2) Slice 2 was DISCUSSED FIRST (the oracle fork:
bind-once DessertGeometry vs spec-as-argument) — rulings recorded in
plans/13 §3 before building. (3) Slice 2 BUILT (commit 7b7e890):
the cake is a DessertSpec row; dessertGeometry(spec) is the one
public form; geometry is an ARGUMENT on core/ classes. ZERO DRIFT
PROVEN (293 tests, both tsc legs; every pinned number reproduced with
assertions untouched) and live-verified end to end. HEAD 7b7e890 +
this docs commit. NEXT SESSION: the visionary's playtest feedback,
then DISCUSS slice 3 (spec-parameterize research/13 + /11, measure
cake-1/2/4/5/6, author the RUNGS table).

NOTE: a PARALLEL session triaged the visionary's playtest notes into
project/plans/15-side-quests.md (+ a CLAUDE.md pointer). Committed
here with the docs so nothing dangles. Claim items there; don't
re-triage.

## 2. What changed this session

- REVIEW PINS (3af4aa9): room.test.ts gains "a LEAVER mid-countdown
  does not cancel" + "the LAST leaver cancels — an empty room never
  starts a run". Cleared in review: endedWon capture paths, sandbox
  litter tagging, lastReadyKey lifecycle, welcome honesty per phase,
  resolveEEdge edges. Observations (no action): an abandoned run burns
  to natural clock death (self-heals; crash-rejoin continues the run —
  a feature); runOverText sends everyone to town 0's circle (feel-pass
  question).
- SLICE-2 RULINGS (plans/13 §3 "Rulings of record", discussed with
  the visionary): (1) bind once — dessertGeometry(spec) the ONE public
  form, tier math PRIVATE (a public free layer would let a call site
  score rung 5 against cake-3 and compile); (2) geometry is an
  ARGUMENT, never a field, on core/ classes ("impossible to get wrong
  silently" — visionary's ruling); (3) old zero-arg oracles DELETED,
  not aliased (TOWNS-alias precedent rejected: towns static, dessert
  per-deal); (4) redeal ordering: clear with OUTGOING geometry → tear
  down colliders → bind new spec → build → fresh field; (5) CAKE_Z
  stays in arena (WHERE vs WHAT); (6) ZoneId → tier INDEX + tierLabel
  words; (7) client boot order: bind dessert BEFORE snapshot adoption;
  (8) knowingly stale until slice 3: research .mts tools + potential
  tables.
- SLICE 2 (7b7e890): core/dessert.ts (DessertSpec, CAKE_3 verbatim,
  dessertGeometry with samples/topTier/oracles/buildColliders,
  tierLabel); frosting.ts buildCensus(spec), FrostingField(samples),
  splatSamples(samples, …); projectiles step(world, geom) +
  clearCakeSolids(world, geom); judgment/order/patron thread geometry
  (checkRequirements/judge/evaluateOrder gain a first param;
  PatronContext gains topTier; describeRequirement(req, topTier));
  game/campaign.ts specForRung (always CAKE_3 — slice-3 stand-in);
  protocol order msg gains rung? (rides with fresh); Room owns
  dessert + dessertColliders + redealDessert(); client: view.dessert
  (state.ts), NetFx.bindDessert replaces resetFrosting (ordering
  pinned: clear-cake, bind, clear-stuck, clear-rings), scene
  setDessert, FrostingView(scene, samples)+bindDessert, ShotsView
  step(geom, flash)/clearCakeSolids(geom), snapshot.aimAt(tiers),
  HudView.topTier, bannerText gains topTier. arena.test.ts →
  dessert.test.ts (+ tierLabel pins, +1 test).
- ZERO DRIFT: 661/218/443 pins, WIN path, two-rooms-converge, settle
  ladder — green untouched. Live: boot → lobby cake from spec →
  ready-up → rung 1 (no snapshot-refused warning) → 6-click glob
  painted 2% of potential on rebuilt colliders → clock death → RUN
  OVER → auto-restart ran a second clean redealDessert.

## 3. Architecture and invariants

All prior laws hold. New:
- ONE DOOR TO THE DESSERT: dessertGeometry(spec) only. Never export
  the tier math; never alias to a fixed spec in live code.
- GEOMETRY IS AN ARGUMENT on core/ classes (ProjectileManager,
  ShotsView pass-through). stickyPaint stays a field ONLY because it
  is a cross-module closure reading through its owner.
- THE REDEAL ORDERING (both replicas): clearCakeSolids(OLD geom) →
  collider teardown → bind new → build → new FrostingField. The
  Room's is redealDessert(); the client's is the fresh-branch of
  net-handlers (order pinned by test).
- THE WIRE LAW: the deal carries the RUNG; the spec table is shared
  code (specForRung). Never geometry on the wire.
- CLIENT BOOT ORDER: bindDessert before restoreFrosting/spawnResting
  (frosting-view's length guard is the tripwire).
- The frost field is REPLACED per deal, never rebound; owner closures
  read through `this`.

## 4. File map (delta)

- src/core/dessert.ts — spec rows + geometry factory; dessert.test.ts.
- src/core/arena.ts — statics + CAKE_Z only; cake code gone.
- src/core/frosting.ts — buildCensus(spec); field takes samples.
- src/core/projectiles.ts — step/clearCakeSolids take geometry.
- src/game/campaign.ts — specForRung stand-in (slice 3 replaces).
- src/game/judgment.ts — geometry param; tierLabel words; zone: index.
- src/server/room.ts — dessert/dessertColliders/redealDessert; deal
  msg carries rung.
- src/client/state.ts — view.dessert; net-handlers — bindDessert;
  main.ts — fx.bindDessert (colliders/cake/blobs/tripod), step(view.
  dessert, …); scene.setDessert; frosting-view bindDessert;
  snapshot.aimAt.
- project/plans/13-the-campaign.md — §3 rulings; §8 slice 2 built.
- project/plans/15-side-quests.md — PARALLEL SESSION's playtest
  triage ledger (buckets + claim lines).

## 5. How to run, test, verify

npm run check (293 green at HEAD). Dev preview 5174; visionary's
server 5175 — never kill. Game boots into LOBBY; smoke drives:
__game.baker.teleport({x:-3,y:1.2,z:8}) into READY_CIRCLE, wait 3s+
slack → rung 1. Winch is ~0.25s/click — poll getMachine().
tensionClicks and stop at the target or every shot fires at clamp 10
(overshoots the cake). Driver notes memory: hidden-tab rAF shim +
__timeScale for long runs.

## 6. Open items and decisions

DECIDED (do not re-litigate): the §3 rulings (above); the campaign
rulings of 2026-07-08 session 2; review sequence held (review →
discuss → build).
OPEN:
- Slice 3 (plans/13 §8.3): research/13 + /11 gain a spec parameter;
  measure cake-1/2 and proposed 4/5/6; author RUNGS against
  measurements (§4 law: the ladder's top is where the envelope dies).
  DISCUSS FIRST. Research tools currently BROKEN against new arena
  exports (they import CAKE_TIERS etc.) — slice 3 fixes them.
- Potential tables (TOWN_POTENTIAL/TOWN_ASK_POTENTIAL) are cake-3's;
  become per-spec rows with slice-3 measurements.
- Snapshot tripod framing dies on tall specs (~cake-6 y9.5) — noted
  in snapshot.ts; fix when a tall spec deals.
- plans/15 side quests: rings-per-catapult, tilt clamp, report inset,
  trails = pre-friend-test bucket; post HUD = aesthetics; power-ups =
  post-campaign discussion. Claim items there.
- Standing: plans/14 mute-machine watch item; audit tranche C
  post-friend-test; wind plan + Bite/integrity re-pin ownerless;
  research/06 header stale-ladder warning.
- Feel-tunables unchanged (circle spot, countdown 3s, report 12s).

## 7. Next session focus

1. The visionary's playtest feedback on slice 2 (his own run).
2. DISCUSS slice 3: the research-tool spec parameter, which rows to
   measure, the RUNGS authoring law — then build.
3. plans/15 side quests may be claimed opportunistically; friend test
   (plans/12) inherits everything whenever he calls it.

## 8. Recommended reading order

1. This handoff.
2. project/plans/13-the-campaign.md — §3 rulings + §4 (slice 3's
   law) + §8 (slices 1–2 marked built).
3. CLAUDE.md current-state paragraph.
4. git log d5dd26c..HEAD — the day's three sessions of commits.
5. src/core/dessert.ts — the new core module (header = the rulings).
6. src/server/room.ts redealDessert + src/client/net-handlers.ts
   fresh branch — the redeal ordering, both replicas.
7. project/plans/15-side-quests.md — the playtest triage ledger.
8. project/research/13-tilt-vernier-study.mts + 11-two-town-union.mts
   headers — what slice 3 parameterizes.
