# Handoff — 2026-07-08 (fourth session) — SLICE 3 BUILT: THE LADDER MEASURED AND AUTHORED

## 1. Snapshot

Plans/13 slice 3 is BUILT (HEAD 925ebe6 + this docs commit; 307 tests,
both tsc legs). The re-pin tools are spec-parameterized with zero
drift proven; the tilt clamp (plans/15 item 2) landed gated on its
coverage check; all seven candidate spec rows are measured; the RUNGS
table (7 rows) is authored against the measurements with its laws
pinned in tests. The visionary ruled cake-6 keeps its crown — THE
IMPOSSIBLE TRAGEDY. The live game is UNCHANGED except the clamp:
specForRung still deals cake-3 (the slice-3 boundary, pinned by test).
NEXT SESSION: review, DISCUSS slice 4 (mandatory — visionary's
explicit instruction), then build the ladder live.

## 2. What changed this session

- 4ef825d THE ROWS AND THE HONEST TOOLS: cupcake amendment +
  slice-3 merge rulings recorded (plans/13 §1/§8.3/§9); candidate
  rows CAKE_1/2, CUPCAKE, CAKE_4/5/6 + DESSERT_SPECS + specById in
  core/dessert.ts (well-formedness pins in dessert.test.ts);
  research/11 + research/13 take a spec id argv (default cake-3);
  research/11's census/splat mirror DELETED — imports the real
  buildCensus (via dessertGeometry().samples) and splatSamples.
  ZERO DRIFT: research/11 reproduces the RE-RUN numbers exactly
  (661=218/443, T1 79.0/81.2/90.3, union 100.0 ≤8, overlap
  57.9/62.9/80.9); research/13 reproduces 910/0, 27 combos, c7n0–3
  four T3-top places, n14-plinth.
- 77da4d0 THE CLAMP: TILT_MAX_NOTCH 18→12 (≤85° total el), gated on
  the clamp check (cake-3 at maxNotch 12 = every envelope number
  identical; notches 13–18 bought zero coverage). One constant, read
  symbolically by sim/HUD/scene. HUD glyph pins re-pinned (13
  positions). Render contract landed: scene.test.ts reads the real
  rig rotation (new MachineRig.shownTiltRad getter).
- f82f9ef THE LADDER MEASURED: all 7 specs run through both tools
  under the shipped ladder. Summit combos 22/16/12/8/7/4/0 across
  cake-1/2/3, cupcake, cake-4/5/6. Union frost coverage 100.0% on
  EVERY row; solo reach 89.4–92.1% on every cake row (TOWN_POTENTIAL
  0.9/1.0 generalizes, no per-spec table; cupcake 97.1% outlier,
  same pin — noted in tuning.ts). RUNGS authored in game/campaign.ts
  (measurement record in header) + campaign.test.ts pins; rungRow()
  clamps 1..7; specForRung still returns CAKE_3.
- 2418fcc HARNESS: .claude/launch.json dev config gains autoPort
  (second sessions can preview while 5174 is held).
- 925ebe6 THE IMPOSSIBLE TRAGEDY: cake-6 crown flipped to TRUE by
  visionary ruling (see §6). campaign.ts header/interface + test pin
  updated; plans/13 §8.3 records the ruling.
- Live verification of the clamp: hidden-tab worker rAF shim (memory
  recipe), gunner post manned, held screw parks at exactly notch 12,
  unwinds 3 notches in 0.5s. Pixels not verifiable hidden — render
  contract is the test's job.

## 3. Architecture and invariants

All prior laws hold. New:
- THE RE-PIN LAW SATISFIED: every RUNGS row's spec ran research/13 +
  research/11 before its ask was pinned. Measurement record lives in
  game/campaign.ts's header (the authoring table + findings).
- ASK-HONESTY: never author a crown against a spec whose measured
  summit takes no shipped (click, notch). ONE sanctioned exception:
  cake-6 (the impossible tragedy, visionary's ruling).
- THE SLICE-3 BOUNDARY: RUNGS is data + pins only. specForRung deals
  CAKE_3 for every rung (pinned in campaign.test.ts). Slice 4 flips
  deal + asks + clock TOGETHER — a spec-only flip would deal cake-1
  under cake-3's clock and call it rung 1.
- Rows in DESSERT_SPECS are not rows in the ladder; RUNGS decides
  what deals. specById is the lookup (research CLI + future
  validation; validateRungs() exists).
- TILT_MAX_NOTCH is the ONE tilt clamp — sim (turnScrew), HUD
  (arcGlyph + machine line), scene visual clamp all read it
  symbolically. scene.test.ts is the render-contract tripwire.
- research/11 and /13 measure THROUGH core imports (buildCensus,
  splatSamples, dessertGeometry) — no mirrored constants remain. The
  zero-drift pins are in both headers; reproduce them after any
  splat/census/ballistics/arena change.
- TOWN_POTENTIAL/TOWN_ASK_POTENTIAL stay ONE table (not per-spec):
  measurement says 0.9/1.0 hold across the whole ladder.

## 4. File map (delta)

- src/core/dessert.ts — + candidate rows, DESSERT_SPECS, specById.
- src/game/campaign.ts — Rung interface, RUNGS (7 rows), rungRow,
  validateRungs, specForRung stand-in; header = measurement record.
- src/game/campaign.test.ts — anchor pin (rung 3 = tuning constants
  verbatim), cake-6 crown-true ruling pin, cupcake-at-4, pay climbs,
  clamps, slice-3 boundary pin.
- src/game/catapult.ts — TILT_MAX_NOTCH 12 + clamp rationale.
- src/client/scene.ts — shownTiltRad getter; scene.test.ts — render
  contract; hud.test.ts — 13-position glyph pins.
- src/game/tuning.ts — TOWN_POTENTIAL ladder note.
- project/research/11-two-town-union.mts — spec+maxNotch argv, real
  core imports, per-tier reach section, zero-drift + clamp record.
- project/research/13-tilt-vernier-study.mts — spec argv, shipped
  table only, summit-shot section, zero-drift record.
- project/plans/13-the-campaign.md — §1 cupcake amendment, §8.3
  built record + crown ruling, §9 resolutions.
- project/plans/15-side-quests.md — item 2 DONE with evidence.
- .claude/launch.json — dev autoPort.

## 5. How to run, test, verify

npm run check (307 green at HEAD). Research tools:
`npx tsx project/research/11-two-town-union.mts [specId] [maxNotch]`
(~2–4 min/spec), `npx tsx project/research/13-tilt-vernier-study.mts
[specId]` (~30s). Spec ids: cupcake, cake-1..6. Dev preview via
preview_start "dev" (autoPort — works beside the visionary's 5174/
5175; never kill his). Hidden-tab driving: worker rAF shim + in-page
main.ts re-import — full recipe in memory game-smoke-driver-notes.

## 6. Open items and decisions

DECIDED (do not re-litigate):
- THE CUPCAKE AMENDMENT: ladder = authored spec rows, harder not
  necessarily taller; cupcake is FIXED rung 4 (after the anchor);
  random insertion REJECTED v1 (procedural difficulty non-goal).
  Rung 1 stays cake-1.
- THE IMPOSSIBLE TRAGEDY: cake-6 keeps its crown ask over an
  unreachable summit ("necessity is the mother of invention") — the
  run's story is designed to end at the top; the future power-up/
  upgrade economy (plans/15 item 6, post-campaign) sells the key to
  impossible spots. The ONE sanctioned impossible ask.
- The clamp (notch 12) with its coverage gate; the ladder is 7 rows,
  no cake-7 (cake-5 = last honest crown, 4 windows, 3 PLACE).
- 18s separator fine until the shop exists; feel-tunables unchanged.

OPEN — slice 4 discussion agenda (DISCUSS FIRST, visionary's order):
- The flip: specForRung → RUNGS in one move with per-rung asks +
  clock. How asks wire into OrderFlow rows (per-rung frostFrac
  replaces global FROST_FRAC; sprinkles/crown per rung; clock per
  rung replaces ORDER_SECONDS) — find the order-row authoring seam
  in game/order.ts / room.ts first.
- What happens if a crew WINS rung 7 (rungRow currently clamps —
  replays the final rung). With the impossible-tragedy ruling this
  is near-moot but should be ruled explicitly.
- Cupcake hot-crown flag: all 8 summit windows arrive ≥ SPLAT_SPEED;
  crowns may bounce. Feel pass decides if its clock/position moves.
- Snapshot tripod framing dies on tall specs (~cake-6 y9.5, noted in
  snapshot.ts) — becomes LIVE the moment slice 4 deals cake-4+; fix
  belongs in or right after slice 4.
- Run-over report (§6): slice 4's separator/report reads rungs
  cleared; purse/pay is slice 5.
- plans/15 unclaimed pre-friend-test: rings-per-catapult (item 1),
  report inset (item 3), trails (item 4).
- Standing: audit tranche C post-friend-test; wind plan + Bite/
  integrity re-pin ownerless; research/06 header stale-ladder note.

## 7. Next session focus

1. Review the slice-3 work with the visionary.
2. DISCUSS slice 4 (mandatory before building): the flip mechanics,
   per-rung ask/clock wiring, rung-7-win ruling, tall-spec tripod.
3. Build slice 4; the friend test (plans/12) inherits everything.

## 8. Recommended reading order

1. This handoff.
2. project/plans/13-the-campaign.md — §1 (cupcake amendment), §3
   (standing rulings), §4 (ladder law), §8.3 (build record + crown
   ruling), §6 (run container — slice 4's target).
3. src/game/campaign.ts — the RUNGS table; its header is the
   measurement record.
4. CLAUDE.md current-state paragraph (rewritten this session).
5. git log 50f188d..HEAD — the session's commits with evidence.
6. project/research/11-two-town-union.mts + 13-tilt-vernier-study
   .mts headers — the zero-drift pins and clamp record.
7. src/game/order.ts + src/server/room.ts — where slice 4's per-rung
   asks/clock must wire in (read before the discussion).
8. project/plans/15-side-quests.md — item 2 DONE; items 1/3/4 open.
