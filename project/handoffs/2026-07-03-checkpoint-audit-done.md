# Handoff — 2026-07-03 (checkpoint audit + structural pass DONE; frosting-economy redesign next)

## 1. Snapshot

HEAD 50eb1b5, 15 commits this session (AUD-1…13, STRUCT-1+2, STRUCT-3).
166 vitest tests green (was 145, 18 files), tsc strict clean BOTH configs
(root + new tsconfig.headless.json), vite build clean, browser-smoked on
the loopback. The visionary-requested checkpoint audit ran as four
parallel layer auditors; every actionable finding is fixed and committed;
findings, dispositions, deferred items, and structural follow-ups are in
research/05-checkpoint-audit.md. NEXT SESSION: the frosting-economy
redesign — the visionary's two standing notes (previous handoff §6) plus
his NEW alignment this session (§6 below): smaller splats (~7-8 globs per
hit), demanded coverage back UP, excellence-above-the-ask earns grade,
fix PACE not splash size, and settle the wall-weighting question.

## 2. What changed this session

Audit fixes (one commit each, all test-gated):
- AUD-1 src/server/main.ts: error handlers on server/wss/sockets (socket
  error used to kill the process), maxPayload 16KB, 30s ping/pong
  heartbeat + terminate, MAX_BAKERS 8, dist prefix + path.sep traversal
  fix, PORT validated, DIST resolved from file not CWD.
- AUD-2 src/server/room.ts onMessage: field-validation boundary (pose
  copies 4 known finite fields; op normalized; load whitelisted against
  TOPPINGS via hasOwnProperty; name capped 24) + 3 hostile-wire tests.
- AUD-3 src/core/projectiles.ts: BOTH collision-pair handles evaluated —
  a shot first-contacting a still-rolling shot no longer loses its impact
  (absorption skipped / glob consumed at wrong spot). 2 pins.
- AUD-4: deal-generation tags on spawns (Impact/Settled carry `tag`);
  stale deliveries (fired against a previous order, landing after the
  re-deal) score NOTHING; client shots-view mirrors via bumpDeal() wired
  to the fresh reset. Linger head-start exploit closed; test pins it.
- AUD-5 protocol/room/net-handlers: welcome carries `judgment?` exactly
  while the order is ended; mid-banner joiners see the real verdict.
- AUD-6 LIVE-TRUTH LEDGER (the one real design decision): Settled events
  carry their RigidBody; Room ledger entries re-read pos+onCake from
  bodies before every census. A bowled-off topping un-counts; a wrong
  crown can be knocked away (recovery through play; 2D "live cell scans"
  parity — chosen over freezing bodies). Pinned by the bowl study:
  6-clicks-then-6-clicks knocks the first topping off the tier-1 ledge
  deterministically. PLAYTEST ATTENTION: mess can now GROW after landing.
- AUD-7: full bucket REJECTS a load (stays queued ≤2/member, enters when
  the bucket empties) instead of destroying the loser's topping in the
  two-baker race. First-joined breaks ties.
- AUD-8 client: removeAndDispose helper (scene.ts); landing rings
  FIFO-capped 30; ground-splat stagger uses monotonic counter; ghosts
  dispose on leave. Zero .dispose() existed before.
- AUD-9: loopback structuredClones both directions (patron mutates rows
  in place — aliasing was live); ws pre-open queue skips poses, caps 32,
  open=false on close; yaw wraps to (-pi,pi]; blur clears pending E edge;
  frost-row current % FLOORS (never "25%/25%" beside an X; pinned).
- AUD-10: 437-sample census pinned as WIRE FORMAT (218 tops/219 walls) in
  frosting.test.ts; restore() returns boolean, frosting-view logs refusal;
  paint/frostedNear use sqrt/mul/add not Math.hypot + honest cross-engine
  doc; baker gravity imports constants.GRAVITY; patron crown-demand guard
  checks cherry-referencing rows not just kind (pinned both ways —
  patron.test fixture updated, it predated the one-number law); star
  thresholds clamp at 100.
- AUD-11: src/determinism-tripwire.test.ts (scans core/+game/ for
  Math.random|Date.now|performance.now|new Date; comments stripped
  first — rng.ts names them in docs) + Room WIN-path test (the O2 line
  over protocol: 4 frost arcs incl. +8 deg traverse, sprinkle-before-nag
  ordering, progress-triggered crown demand, cherry 1x8, WON >=2 stars,
  fresh deal unmet).
- AUD-12: src/client/interactions.ts (tickInteraction + bannerLatch, pure,
  tested) — pickup/lever/load/banner rules extracted from main.ts tick
  body back to wiring-only.
- AUD-13: research/05-checkpoint-audit.md written; CLAUDE.md pointer.

Structural pass (visionary approved items 1-3 of my feedback):
- STRUCT-1 src/game/tuning.ts: THE economy dashboard — ORDER_SECONDS 120,
  ORDER_PAR_SHOTS 8, ORDER_RESET_TICKS 600, PATRON_LOOK_EVERY, FROST_FRAC
  0.25, SPRINKLES_NEEDED 2, PATIENCE_BURN_{THUNDER 8, GRUMBLE 4, URGENT
  2}_S, with effective-clock (~0.75x nominal) and shot-cycle math in the
  header. room.ts/patron.ts consume it; room.test imports LOOK_EVERY from
  it. Values unchanged (browser-verified).
- STRUCT-2: Room.ledger() is THE seam — every scoring read refreshes
  live-truth on the way through; standalone refreshLedger calls removed.
- STRUCT-3: tsconfig.headless.json (core/game/server, lib ES2022 no DOM,
  types node) is leg 2 of `npm run check`. Proven: `window` in core
  passes root tsc, fails the fence. CLAUDE.md law text updated.

## 3. Architecture and invariants

- Layering law now enforced twice: tsconfig.headless.json (DOM is a type
  error in core/game/server) + determinism-tripwire test (clocks/rng).
- Ledger reads ONLY via Room.ledger(); writes via this.settled. Paint
  entries have no body (onCake means "painted something").
- Deal tags: Room.deal increments at re-deal; spawn tags shots; stale
  tags score nothing. Client mirrors with its own counter (bumpDeal on
  fresh). Keep server and client tag logic in step.
- Loopback == ws semantics: structuredClone at the loopback boundary.
  Never hand room objects to the client by reference again.
- Economy knobs live in game/tuning.ts; row shapes in room.ts
  standardRequirements; splat radii with the paint law in
  core/frosting.ts. 437 samples is pinned WIRE FORMAT — census changes
  re-pin the test number on purpose + re-run research/04 §3.
- One-number law now code-enforced: the crown-demand guard suppresses on
  any cherry-referencing row.
- Room field-validation boundary (onMessage) owns message TRUTH;
  main.ts owns transport HEALTH. Keep new fields validated.
- Standing decisions not to re-litigate: paint-at-impact, crown ignores
  paint, walls sampled coarser, limes never ordered, live-truth over
  freezing (unless the playtest overturns it), client never declares an
  ending.

## 4. File map (delta this session)

- src/game/tuning.ts NEW — economy dashboard (see above).
- src/client/interactions.ts + .test.ts NEW — crosshair rules + banner
  latch, pure.
- src/determinism-tripwire.test.ts NEW.
- tsconfig.headless.json NEW; package.json check script gained leg 2.
- src/server/main.ts — hardened transport edge.
- src/server/room.ts — validation boundary, deal tags, ledger seam,
  load queue, welcome judgment, tuning imports.
- src/core/projectiles.ts — pair fix, tag+body on events.
- src/core/frosting.ts — sqrt math, restore():boolean, honest doc.
- src/client/{scene,shots-view,frosting-view,ghosts,net,input,main}.ts —
  dispose/caps/clone/wrap/edge fixes; main.ts back to wiring.
- src/game/{judgment,patron}.ts — floor %, star clamp, topping-aware
  guard, burn constants from tuning.
- project/research/05-checkpoint-audit.md NEW — full audit record +
  frosting pre-work numbers + structural follow-ups (parked: Room.tick
  decomp BEFORE next big slice; patron amendments-as-data; shared test
  driver).

## 5. How to run, test, verify

`npm run check` = root tsc + headless tsc + 166 tests. `npm run dev`
(5174 loopback), `npm run server` (5175 — the visionary often has one
RUNNING; use PORT=5199 for boot smokes, never kill his). Study: npx tsx
project/research/04-cylinder-tier-study.mts. Headless tsx scripts must
live INSIDE the repo (scratchpad cannot resolve node_modules) with
RELATIVE imports; pattern: tmp-*.mts at root, run, delete. __game handle
unchanged. `npm run check | tail` still swallows exit code — check $?.

## 6. Open items and decisions

THE NEXT PHASE — frosting-economy redesign. Inputs, in order:
1. Previous handoff §6 (2026-07-03-frosting-slice-built.md): stop
   reducing demanded frosting (2D asked 50%; drifted to 25%); 80%+
   coverage should be what 3-star looks like; per-glob splash too big;
   many shots is the INTENDED loop; fix PACE not splash size.
2. Visionary alignment THIS session: ~16 globs/hit observed, wants ~7-8
   ("a rough circle") -> splat radius ~0.7-0.9m (third of today's),
   ~1.7%/shot. His model: "gather the surface area of the dessert,
   player does their best with physics." Confirmed in-browser: 6-click
   splash = 18 samples = 4.1%.
3. research/05 pre-work numbers: the 2D coverage axis ALSO saturates at
   the ask (min(1, coverage/required) identical formula) — 2D overshoot
   mattered only because damage undid coverage. Leading proposal:
   normalize the SCORE axis against an excellence bar (~0.8) while gate 1
   keeps the asked frac — meet 50% ask ~= 78 = 2 stars, 80%+ ~= 91 = 3.
   Decide WITH him.
4. OPEN DESIGN QUESTION to settle first: wall weighting. Walls are 50.1%
   of the census but ~2/3 of true skin — his surface-area model implies
   walls are UNDER-weighted; tops-first decorating implies the opposite.
   Options: area-weighted samples vs deliberate bias.
5. Pace knobs must move together (all in game/tuning.ts + catapult rates
   + maybe multi-glob loads — the AUD-7 member queue is half that
   plumbing). Rough math: frac 0.5 + small splats ~= 15-20 shots ~=
   200-350s work vs ~95s effective clock today.
6. Process: pick numbers -> ONE tuning diff -> re-run research/04 §3 ->
   re-pin 437 test if census changed + frac/par/clock -> O2-style
   scripted playthrough -> his playtest.
Deferred audit items (research/05): vertical-band comment wrong (splash
never bridges ledge-to-ledge; only wall impacts do — decide band vs
comment ON PURPOSE during redesign); tierOf upper-y bound; F7 remnants
(seed 0xcafe, bundle size, litter accumulation, neatness stinginess,
friend test). Parked structural: Room.tick decomp, patron
amendments-as-data, shared test driver.
PLAYTEST ATTENTION ITEM: live-truth ledger means mess can grow after
landing and crowns can be bowled away — verify it feels fair.

## 7. Next session focus

Frosting-economy redesign, with the visionary in the loop for: wall
weighting, splat radius (7-8 globs), frac target (0.4-0.5), excellence
bar, and the pace package (clock/burns/crank/par/multi-glob). Then study
re-run + re-pins + scripted verification + his playtest.

## 8. Recommended reading order

1. This handoff.
2. project/handoffs/2026-07-03-frosting-slice-built.md §6 — the original
   two economy notes (they REVERSE the pre-audit tuning direction).
3. project/research/05-checkpoint-audit.md — audit record + economy
   pre-work numbers + parked items.
4. src/game/tuning.ts — the dashboard the redesign edits.
5. src/core/frosting.ts — splat constants + census (the other half).
6. src/game/judgment.ts — the coverage axis to redesign.
7. project/research/04-cylinder-tier-study.mts — §3 re-pin tool.
8. CLAUDE.md — law (note the new double enforcement).
9. artillery/src/game/judgment.ts (READ-ONLY) — 2D axis, for the
   saturation argument.
