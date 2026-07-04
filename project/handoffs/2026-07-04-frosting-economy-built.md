# Handoff — 2026-07-04 (frosting-economy redesign BUILT; playtest looked good; discuss state/goals next)

## 1. Snapshot

HEAD 0f413f9 (one commit this session: ECON). 168 vitest green (18 files),
tsc strict clean BOTH configs (root + tsconfig.headless.json), boot-smoked
on the loopback. The frosting-economy redesign (plans/08) was decided WITH
the visionary in a long design discussion and shipped as one re-pin diff.
He playtested briefly: "looking good." NEXT SESSION per his instruction:
discuss current state, next steps, and OVERALL GOALS — a direction-setting
conversation, not a build kickoff. Only this handoff + the visionary are
context.

## 2. What changed this session

THE DISCOVERY that shaped everything — potential coverage (research/06,
new standing study, `npx tsx project/research/06-coverage-ceiling-study.mts`):
one town's machine can EVER paint only ~43.7% of the round cake (idealized
greedy over the full aim envelope; every region caps near half — near
hemisphere only). 2 towns 75.2%, 3 at 86.7%, 4 at 94.6%. The visionary's
response became the design: multiple towns are WHY the cake gets covered
(2D had two towns; towns slice is the future), and the Patron grades
against POTENTIAL — "that's pretty good for one town" is literally the
math.

The ECON commit (all in one, per the re-pin law):
- core/frosting.ts: area-honest census — WALL_SAMPLE_SPACING 0.65→0.45,
  census 437→661 (218 tops / 443 walls = true 33/67 skin split; walls are
  99.7 of 150 m²). Small splats: dollop 1.3→0.6, splash 2.1+0.15/spd
  cap 3.4 → 0.7+0.05/spd cap 1.1, vertical band 1.2→0.8 (ledge-bridging
  now impossible, reach 1.1 < gap 1.5 — decided on purpose, closed audit
  deferred item 1; band's job is round wall patches). ~7-12 globs/shot
  ≈ 1.1-1.8%/shot (§3 re-run; known dead arc: 0/1x6 impacts a band gap,
  paints 0).
- game/tuning.ts: FROST_FRAC 0.5 (OF POTENTIAL), COVERAGE_GOOD 0.7,
  COVERAGE_EXCELLENT 0.9, TOWN_POTENTIAL [0, .42, .73, .85, .93] (pinned
  a hair under measured — greedy aim is unattainable), ORDER_SECONDS
  120→300, ORDER_PAR_SHOTS 8→24. Header math rewritten. Crank 0.75s/click
  and patience burns UNCHANGED (visionary call).
- game/judgment.ts: frost-coverage row gains REQUIRED `potential`; check
  current = min(1, coverage/potential). JudgedOrder/OrderState gain
  goodFrac/excellentFrac (defaults from tuning in createOrder; on the
  wire). STARS FROM COVERAGE TIERS, not score arithmetic: accepted=1★,
  effective≥goodFrac=2★, ≥excellentFrac=3★ (3★ rare ON PURPOSE). Score's
  coverage axis normalizes at excellentFrac (overshoot keeps earning);
  gate 2 (score≥passScore) still decides ACCEPTANCE. Judgment exposes
  BOTH coverage (absolute) and effectiveCoverage (of-reach). HUD row:
  "FROST 50% OF YOUR SIDE".
- server/room.ts: standardRequirements uses TOWN_POTENTIAL[1] (one town
  today; towns slice indexes by real count).
- Re-pins: frosting.test 661/218/443 wire format; forgiveness-rule window
  narrowed (foot shot within ~0.5m); judgment.test tier stars + of-reach
  pinned both ways; room.test clock tests use ORDER_SECONDS; WIN path
  re-cut from research/06's first 13 greedy picks — WON 81/100 1★
  effectiveCoverage 0.566, ~74s spare.
- plans/08-frosting-economy.md NEW — full decision record. CLAUDE.md
  session pointer updated.

## 3. Architecture and invariants

- ALL coverage asks/tiers are fractions OF POTENTIAL. TOWN_POTENTIAL is a
  MEASURED constant table (research/06). The re-pin law extends plans/07:
  splat/census changes re-run research/04 §3 AND research/06, re-pin
  FROST_FRAC/TOWN_POTENTIAL/par/clock + the 661 wire pin + the WIN-test
  shot table together. research/06 mirrors core/frosting constants on
  purpose (it tests proposed laws pre-ship) — keep in step after a ship.
- Stars = coverage tiers (goodFrac/excellentFrac ride the order like
  passScore, per-patron someday); score = acceptance gate + report axes.
  An order with no frost row can only ever reach 1★ (documented in judge).
- LIVE-TRUTH LESSON (pinned in room.test WIN path): globs passing near
  settled solids can leave them CREEPING; ~650 ticks later one had rolled
  0.6m off its paint and honestly un-counted. Scripted lines place
  must-keep solids when nothing will fly near them again. Real players
  won't know this — playtest attention item.
- Layering law enforced twice (headless tsc + determinism tripwire test);
  seeded rng only; fixed 60Hz; sync-shots-not-surfaces. Unchanged.
- Standing decisions (do not re-litigate): paint-at-impact, crown ignores
  paint, limes never ordered, live-truth over freezing, client never
  declares an ending, one-number law, walls sampled AT TOP DENSITY now
  (area-honest overruled "coarser walls"), one glob per shot FOR NOW
  (multi-glob scoop / frosting-bomb XP are future throughput levers —
  the visionary deferred, did not reject).

## 4. File map (delta this session)

- project/research/06-coverage-ceiling-study.mts NEW — standing ceiling
  tool: full-envelope fire + greedy set-cover, 1-4 town ceilings, region
  breakdown, pick list (source of the WIN-test shot table).
- project/plans/08-frosting-economy.md NEW — decisions + rationale +
  measured tables + open threads.
- src/game/tuning.ts — the dashboard (all new economy numbers + math).
- src/core/frosting.ts — census spacing + splat law + band.
- src/game/judgment.ts — potential row, tier stars, effectiveCoverage.
- src/game/order.ts — goodFrac/excellentFrac plumbing.
- src/server/room.ts — TOWN_POTENTIAL[1] in the standing order.
- Tests re-pinned: frosting, judgment, patron (fixture potential),
  hud/net-handlers (effectiveCoverage in Judgment fixtures), room (clock
  from tuning + new WIN line).

## 5. How to run, test, verify

`npm run check` = root tsc + headless tsc + 168 tests (check $?, not
tail). `npm run dev` 5174, `npm run server` 5175 (visionary often has one
RUNNING; PORT=5199 for boot smokes). Studies: npx tsx project/research/
04-cylinder-tier-study.mts (§3) and 06-coverage-ceiling-study.mts (~1-2
min, 1300 fires). tmp-*.mts at repo root with RELATIVE imports for
headless scripts; delete after. PREVIEW QUIRK: the preview tab reports
document.hidden=true → rAF suspended → HUD stuck at "loading…" and
screenshots time out; the Room still boots (verify via __game.getChecks()
and console errors). Restarting the preview server does NOT fix hidden.

## 6. Open items and decisions

- Playtest CONFIRMED good (brief). Still watch: pass pace solo/duo on the
  300s clock, "50% OF YOUR SIDE" legibility, live-truth creep fairness
  (solids un-counting after nearby shots), 2★ reachability for a duo.
- Visionary vision notes this session: match should feel FAST-PACED (both
  towns firing constantly — feel, not duration); frosting first then the
  rest of the order (sprinkles/cherries/fudge/future toppings); numbers
  are hypotheses until a full round with all toppings exists; XP unlocks
  someday (frosting bomb ~20 tiles); 3★ rare; DESSERT REPORT idea — end
  screenshot of the cake + report, "funny poorly decorated cakes" as the
  improvement loop (aesthetic, later).
- Towns slice threads: index TOWN_POTENTIAL by real town count; mirrored
  machine positions (study's symmetry argument made real); "pretty good
  for one town" patron flavor.
- Parked structural (research/05): Room.tick decomp BEFORE the next big
  slice; patron amendments-as-data; shared scripted-baker test driver
  (win-path helpers now copy-pasted in room.test — third copy would be
  the trigger).
- F7 remnants: rng seed 0xcafe, bundle ~1MB gz, litter accumulation,
  neatness stinginess (0.59 on the clean WIN — still stingy), friend test.
- PROCESS FEEDBACK (memory file written): design decisions = prose
  discussion, NOT AskUserQuestion menus. He reframed scoring entirely in
  one answer (coverage tiers) — menus would have missed it.

## 7. Next session focus

Per the visionary, verbatim intent: discuss current state, next steps,
and overall goals — direction-setting WITH him before more building.
Candidate directions to bring (not pre-decided): the towns slice (second
catapult/town, potential by count), the friend test (tunnel 5175, F4
latency question), Room.tick decomp (due before the next big slice), the
dessert report, full-order toppings (fudge etc.). Bring the playtest
attention items from §6 as discussion openers.

## 8. Recommended reading order

1. This handoff.
2. project/plans/08-frosting-economy.md — the redesign record (decisions,
   tables, open threads).
3. src/game/tuning.ts — the dashboard (economy math in the header).
4. CLAUDE.md — law, commands, current-state pointer.
5. project/research/06-coverage-ceiling-study.mts — header + ceilings
   (run it only if re-pinning).
6. src/game/judgment.ts — tier stars + of-reach axis, if judgment work.
7. project/research/05-checkpoint-audit.md §parked — structural debts, if
   the decomp comes up.
8. project/handoffs/2026-07-03-checkpoint-audit-done.md — prior session,
   only for deep history.
