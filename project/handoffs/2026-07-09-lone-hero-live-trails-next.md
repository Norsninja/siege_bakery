# Handoff — 2026-07-09 (eighth session) — LONE HERO LIVE + APPROVED, SIDE QUESTS 3 & 1 DONE, TRAILS (ITEM 4) NEXT AFTER DISCUSSION

## 1. Snapshot

THE LONE HERO AMENDMENT (plans/13 §5) is BUILT, re-pinned from live
measurement, and FEEL-APPROVED by the visionary in his own run — solo
is now honest and playable (371 tests, both tsc legs, live-verified).
An independent external audit was reviewed (4 findings accepted and
fixed, 4 declined with reasons). Side quests 3 (report inset) and 1
(rings per catapult) are DONE. The friend test (plans/12) is deferred
to the WEEKEND (friends work weekdays). Next session: review, then
DISCUSS side-quest item 4 (projectile trails) BEFORE building — the
visionary asked for discussion-first explicitly.

Six commits this session:
- 05ac764 lone hero build (REACH × LABOR)
- a2916cb saturation re-pin (labor 0.5 → 0.35, measured)
- 311d523 feel-approved docs stamp
- 3a68cb4 audit response (4 hardenings)
- 120a8ca side quest 3 (report inset)
- 1890bea side quest 1 (rings per catapult)

## 2. What changed this session

LONE HERO (05ac764, discussion rulings + build):
- Discussion ruled all six agenda items: labor table confirmed as
  hypothesis; SPRINKLES SCALE TOO (needed = ceil(grains × labor) —
  amends the record's frost-only wording; one volley = 40 grains,
  toppings.ts:51, not 60); desire/window untouched; deal reads
  roster.count(); OrderState.hands stamp; header re-pin.
- tuning.ts: CREW_LABOR table (one dial); header re-pinned to the
  measured 23.5s solo cycle, workload math restated as REACH × LABOR.
- order-flow.ts: requirementsFor(row, activeTowns, crew = 2) — crew
  clamped BOTH ways (CREW_LABOR[0] is a guard; empty room prices
  solo); OrderFlow.activeCrew (default 2 = full labor, pre-amendment
  numbers for bare flows/tests); freshOrder stamps order.hands.
- order.ts: OrderState.hands? (absent = pre-amendment wire, full
  labor); createOrder opts.hands.
- room.ts: private dealAt(row) sets flow.activeCrew =
  roster.count() then dealFresh — wraps ALL THREE deal sites
  (next-rung, dormant re-deal, startRun).
- hud.ts: "🖐 one pair of hands" tag on the running header when
  order.hands === 1 — reads the STAMP, never live headcount.
- judgment.ts untouched: it grades req.potential off the dealt row,
  so deal-time scaling flows through gates and stars for free.
  parShots untouched (towns-keyed; solo there means one firing line).
- Tests 355 → 367. TEST LAW: room.test jumpToRung (anchor seam) now
  forces activeCrew = 2 (pinned physics predate the handicap);
  towns-law tests (scoring-rises, inventory-dies) took a second baker
  to stay towns-pure; the convergence test kept SOLO deliberately —
  it is the lone hero's teaching arc (two 3★ wins fund town 2,
  25+35−50=10, fresh deal priced REACH × LABOR over honest wire,
  hands stamped).

SATURATION RE-PIN (a2916cb — the session's key measurement):
- Visionary's rung-1 run at labor 0.5: fastest cycle ever (6 shots,
  power 6 held, traverse swept +8°→−8°, no re-cranking) still failed.
- Replicated in-harness shot for shot: fresh splats ~1.4% absolute,
  band overlap decays shots 4–6 to ~0.9%, PLATEAU at 6.7% vs 8.4%
  asked. 0.4 fails his exact line by 0.02%.
- CREW_LABOR[1] = 0.35: ask 5.88% — the measured line passes ON its
  sixth shot (~14% headroom). Live-replayed post-pin: check row
  0.079 → 0.487, WON on shot six, 1 star, purse 15.
- 2★/3★ sit past the band's plateau — demand power variation.
- Solo grain asks: rung 2 = 14, rung 3 = 21, cupcake = 11.
- FEEL-APPROVED (311d523): visionary passed rung 1, reached rung 2,
  judged sprinkles sendable; lost to a wrong-crate grab (the decoy
  comedy working). THE LONE HERO IS PLAYABLE.

AUDIT RESPONSE (3a68cb4 — external AI audit, visionary-forwarded,
verified claim-by-claim before ruling):
- ACCEPTED: (1) main.ts SILENT-SERVER watchdog — socket that OPENS
  but never welcomes starved the firstWelcome await forever on
  "joining the bakery…" (C-HIGH-1's surviving sibling); 20s timeout
  words it. (2) index.html #hud pointer-events: none (clicks on HUD
  text ate the pointer-lock grab). (3) npm run preview REMOVED —
  built pages auto-join their serving origin (tunnel-gate law) and
  vite preview hosts no room: guaranteed dead join. (4) plans/12
  runbook re-taught: retired __game.unlockTown2() replaced with the
  honest stall purchase + loopback purse seam. Bonus: net.ts wire
  parse guard (bad frame → warn + drop, not uncaught error).
- DECLINED: Math.hypot (one authority per match; squared-math
  comments are perf, not determinism); coverage thresholds (project
  pins laws, not percentages); HUD line clipping (plans/15
  aesthetics bucket); "doc drift" (open-session state, resolved by
  this handoff). Snapshot-encode hitch + litter growth ride the
  audit tranche C watch.

SIDE QUEST 3 (120a8ca — measured, not guessed):
- The frame's sizing was never the bug. At 1280×800 the BANNER's
  centered verdict text ran UNDER the snapshot frame (which paints
  later — the report covered its own words); narrow widths ran the
  HUD under it too.
- index.html only: #banner reserves the photo's column
  (padding-right calc(min(27vw,48vh) + 48px) — +48 covers frame
  padding/border/1.6°-tilt bbox growth) + font clamp(20px,
  min(3.4vw, 5vh), 42px); #hud max-width off the same column;
  #snapshot margin: 0 (UA <figure> margin shoved it ~40px off its
  right:12px anchor).
- Verified frozen-linger geometry at 1280×800 / 1366×768 / 768×1024 /
  375×812: no overlap, banner fits, caption never clips. Hidden tab
  cannot screenshot — VISUAL EYE PASS RIDES THE VISIONARY'S NEXT RUN.

SIDE QUEST 1 (1890bea — shots-view.ts only, per the scope note):
- Core Impact echoes one tag number → client packs (deal, town) into
  its OWN tag namespace: packShotTag/unpackShotTag exported + pinned.
  Room tags are a separate namespace; old fixtures' tag 0 = deal 0 /
  town 0, zero drift.
- markers FIFO-30 array → Map<town, mesh>: a gun's next lob replaces
  ITS ring only. Stale-deal shots still ring (visible landing,
  paint-blocked — unchanged). clearLandingMarkers/quiet grains
  unchanged. Tests 367 → 371. Live: ring census 0 → 1 → 1 across two
  lobs from one gun.

## 3. Architecture and invariants (new this session)

- ASK = REACH × LABOR: every deal prices TOWN_ASK_POTENTIAL[towns] ×
  CREW_LABOR[crew] from roster.count() at DEAL TIME via Room.dealAt.
  Joiners/leavers never retro-change a ticket (towns law verbatim).
  Sprinkle grains scale too (ceil). Crew 2+ = today's numbers
  VERBATIM — the friend test inherits zero drift.
- CREW_LABOR[1] = 0.35 is MEASURED (band-saturation study in the
  tuning.ts CREW_LABOR comment + plans/13 §5 BUILT block). Moving it
  requires restating the saturation math. CREW_LABOR[0] is a guard,
  never indexed.
- The ticket WEARS its pricing: OrderState.hands stamped at deal,
  rides every order wire free (absent = full labor). HUD tag reads
  the stamp only.
- Anchor seam law (room.test jumpToRung): deals FULL labor — pinned
  physics predate the handicap.
- The banner yields the photo its column (index.html): #banner
  padding-right and #hud max-width are tied to the snapshot's
  min(27vw, 48vh); if the frame's size moves, move them WITH it.
- Ring namespace law (shots-view.ts): the client's projectile tags
  are packShotTag(deal, town); anything reading im.tag must unpack.

## 4. File map (delta)

- src/game/tuning.ts — CREW_LABOR [0, 0.35, 1, 1, 1] + saturation
  doc; header re-pinned (23.5s, REACH × LABOR).
- src/game/order-flow.ts — requirementsFor crew param, activeCrew,
  hands stamp.
- src/game/order.ts — OrderState.hands?, createOrder opts.hands.
- src/server/room.ts — dealAt at all three deal sites.
- src/client/hud.ts — lone-hero header tag.
- src/client/main.ts — silent-server watchdog (20s, ws only).
- src/client/net.ts — wire parse guard.
- src/client/shots-view.ts — packShotTag/unpackShotTag, Map<town,
  ring>.
- index.html — #hud pointer-events + max-width, #banner column
  reserve + font clamp, #snapshot margin 0.
- package.json — preview script removed.
- project/plans/13-the-campaign.md §5 — lone hero BUILT block (six
  rulings + saturation re-pin + feel-approval).
- project/plans/15-side-quests.md — items 1 and 3 DONE (full
  records); item 4 unclaimed.
- project/plans/12-friend-test-runbook.md — stall purchase replaces
  unlockTown2; preview-removal note.
- Tests: order-flow (lone hero suite), room (THE LONE HERO suite +
  reworked convergence/towns tests), hud (tag), shots-view (rings).

## 5. How to run, test, verify

npm run check (371 green at 1890bea). npm run preview is GONE
(deliberate — see §2 audit). Live verify: preview_start "dev"
(autoPort; the visionary may have his own server up). Hidden-tab
worker-shim recipe + all driver law in memory
game-smoke-driver-notes — new items this session: baker teleport is
baker.body.setTranslation (Rapier body, not Object3D; re-park in the
poll loop), fake a second crew member via __game.room.join(() => {},
'bob') / room.leave(id), and freeze linger-bound UI with
window.__timeScale = 0.0001 IN THE SAME EVAL that detects the win
(a separate freeze call loses to tool latency). gBCR all-zeros in a
hidden tab usually means display:none (state expired), not layout.

## 6. Open items and decisions

DECIDED THIS SESSION (do not re-litigate):
- All six lone-hero agenda rulings + the saturation re-pin (§2).
- Sprinkles scale with labor (ceil); crown/desire/window/clocks/pay
  untouched; crew 2+ verbatim.
- Audit rulings: 4 accepted (built), 4 declined with reasons.
- Side-quest priority (visionary approved): 3 → 1 → 4. Items 3 and 1
  are DONE; item 5 stays parked (its promotion trigger IS a
  friend-test observation); items 6 + 8 wait for the post-campaign
  design session together.
- Friend test deferred to the WEEKEND (friends work weekdays).

OPEN:
- Side quest 4 (projectile trails): unclaimed, DISCUSS BEFORE
  BUILDING (visionary's explicit ask). Known shape from the ledger:
  transparent fading trails, client-only, shots-view.ts territory,
  promoted because juice IS content and trails are aim feedback.
  Discussion candidates: ribbon vs line-segment approach, fade
  lifetime, do grains get trails (probably not — 40 ribbons/burst),
  does the trail color follow the topping, perf budget (trails per
  shot × shots in flight), and whether trails persist after landing
  (probably fade fast — the ring is the landing record).
- Visionary eye passes pending on his next run: the item-3 banner
  composition (verdict left-of-center, photo right) and the lone-hero
  HUD tag placement.
- Feel-pass watch standing: rung pacing above rung 1 (duo data —
  weekend), window's 15s, cupcake hot-arrival,
  fudge-counts-toward-frost, §5 prices/pay scale.
- Standing: audit tranche C post-friend-test (now also carries
  snapshot-encode hitch + litter growth watches); wind plan +
  Bite/integrity re-pin ownerless; plans/15 item 5 promotion
  trigger rides the friend test.

## 7. Next session focus

1. Review this handoff and the two DONE side-quest records.
2. DISCUSS side quest 4 (trails) — agenda candidates in §6 — then
   build it. Standing sequence: review, discuss, build.
3. Weekend: the friend test (plans/12) — the runbook is current
   (stall purchase, no preview script, watchdog + pointer-events
   hardening landed this session). It measures the duo cycle the
   clocks assume; item 5's promotion trigger rides along.

## 8. Recommended reading order

1. This handoff.
2. project/plans/15-side-quests.md — item 4 (the discussion subject)
   + the DONE records for items 1 and 3 (this session's patterns).
3. src/client/shots-view.ts — where trails land: spawn/step/sync
   lifecycle, the meshes array, the new ring namespace.
4. project/plans/13-the-campaign.md §5 — THE LONE HERO AMENDMENT
   BUILT block (the session's main event, if reviewing it).
5. src/game/tuning.ts — CREW_LABOR + the re-pinned header (the
   saturation math).
6. git log --oneline -8 — the six commits, evidence in messages.
7. CLAUDE.md current-state paragraph.
8. project/plans/12-friend-test-runbook.md — before the weekend.
