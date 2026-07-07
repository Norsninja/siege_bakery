# Handoff — 2026-07-07 (late evening) — SPINE REVIEWED; GATES + CARRY-HOME BUILT

## 1. Snapshot

The towns-spine review (prior handoff §7 item 1) is done and its two approved
fixes are built and committed, plus a same-session visionary amendment: the
open front is retired. Three commits this session (aa4a06c WALLS, d2ec39b
TEST, a15f4dd LINGER), HEAD a15f4dd + a CLAUDE.md/handoff docs commit after.
232 tests green, both tsc legs, determinism fence intact, live loopback
verified end-to-end (including a full real-time order cycle). NEXT SESSION:
solo two-town play-through via __game (the quirk pass the gates now reshape),
then the two-PC friend test, then fork 2.

## 2. What changed this session

REVIEW (no code): all 8 TOWNS commits + spine files read. Findings: missing
towns convergence test (fixed, d2ec39b); step-6 town-1 shot test is
linger-timing-fragile (LEFT STANDING — see §6); net-handlers `town` ack does
not grow machines[] like the `machine` case does (≤4-tick myMachine fallback
window, unfixed nit, §6); MACHINE_BASE/PANTRY_POS consumers are ballistics
tests only (clean); unlockTown2 has no dedicated broadcast (fork-2 item).

VISIONARY AMENDMENTS (this session, do not re-litigate):
- The plan's open front was executed correctly but is RETIRED: switching
  towns was always meant to happen only between orders. The old "wall blocks
  sightline" rationale is DEPRECATED (1m wall vs 1.5m eye line; arcs clear).
- Carry-home: show the linger time limit; a baker not in his town when the
  order lands is automatically placed there ("hurry").

aa4a06c WALLS — the gated front wall:
- core/arena.ts: front wall back as two flanks + 3m doorway at local x=+4
  (GATE_X) — the plinth (x −1..1, z −13..−11) owns the centerline; the first
  build put the gate at x=0 and the plinth, not the fence, blocked every test
  crossing. Town gains `gate` anchor; rotation carries it to town 1 at
  (−4, −47), same local side.
- core/constants.ts: GATE_COLLISION_GROUPS = (GROUP_WORLD<<16)|GROUP_BAKER —
  fence is WORLD to bakers, NOTHING to shots/grains (one zero product
  suffices), so the deterministic shot world is byte-identical everywhere.
- client/gates.ts (new): TownGates — per-town fence colliders in the client
  physics world, toggled per fixed tick BEFORE Baker.step. Rule: only YOUR
  gate ever closes, and only while the order runs and you are home. THE
  LATCH: close only when depth > CLOSE_MARGIN (1.0 — exceeds fence half
  0.25 + capsule 0.35, no spawn-overlap); once closed it stays closed
  (re-testing the threshold opened the gate as the baker APPROACHED it —
  pressed rest depth 0.6 reads as outside); valve reopens at depth < 0.
  Foreign forts never seal (hysteresis trap + unreachable mid-order anyway).
- client/scene.ts: wood-toned translucent gate panel per town (0x8a5a2e,
  0.75 — wall-grey blended into the wall line), visible iff fence shut.
- client/gates.test.ts (new): position predicates — blocked = pressed at
  z=−12.39 (analytic rest), open = crosses, one-way both directions, town-1
  rotation, flank-vs-doorway, shot sails through a SHUT gate.

d2ec39b TEST — towns convergence: two Rooms, identical script (unlock
mid-order, patron burns the order out, pickTown 1 in linger, town-1 6-click
frost fired at the RUNNING second order — no linger-timing dependence).
Pins: same end tick, identical town ack + shot event (town/params/seed),
byte-identical late-joiner welcome (machines/frosting/toppings/stuck/checks),
non-vacuous (2 machines, 0.75 ask, paint on cake, joiners start home).

a15f4dd LINGER — countdown + carry-home:
- client/hud.ts: bannerText gains optional NextOrderNote {seconds, away}.
  Home: "a new order in Ns — the gates close with it…"; away: "a new order
  in Ns — YOU ARE NOT IN YOUR TOWN!\nwhen it lands you'll be carried home.
  HURRY!". main re-words the banner every tick.
- client/main.ts: lingerTicks armed at banner-show from ORDER_RESET_TICKS
  (client prediction, predictClock culture; mid-linger joiner over-reads —
  accepted, commented). On banner-hide: if depthIntoTown(yourTown, pos) ≤ 0
  → baker.teleport(TOWNS[yourTown].spawn), camera to facing, flash. Composes
  with pickTown (ack already moved yourTown → carried to the NEW town).
- core/baker.ts: Baker.teleport (hard setTranslation + setNextKinematic +
  verticalVelocity=0).
- client/gates.ts: depthIntoTown(town, pos) exported — THE "in your town"
  truth; gate rule and carry-home read the same number.
- Pins: hud wording both ways; depthIntoTown both rotations; carry-home
  composition (teleport → inside → latch; the pen sprint AIMED AT THE
  DOORWAY, not the plinth). LIVE one-take: parked pressed at shut fence →
  linger, sprinted out to z=−25.6 → banner showed countdown + HURRY →
  deal landed → baker at spawn (0, 0.86, 10) standing, facing his run.

## 3. Architecture and invariants

All prior laws hold (sacred layering, determinism incl. server/, Option B
two tables, owner-implicit routing, sync-shots-not-surfaces, core law §1).
New/refined:
- FORTS ARE GATED: front walls with a doorway BESIDE the machine. Real
  colliders in every world (server too — old-game parity; all pinned arcs
  clear a 1m wall). Plans/11 §3/§9 "open mouth = sightline glue" is
  deprecated text; arena.ts header records the correction.
- THE FENCE IS CLIENT-ONLY, BAKER-ONLY: gate state never crosses the wire,
  never exists server-side, never touches shots (GATE_COLLISION_GROUPS).
  Legal because baker movement is client-authoritative (plans/02).
- SWITCH-BETWEEN-ORDERS is physical now: order running + home → your gate
  shut (latched); linger → all gates open. Assignment (pickTown) was
  already order-boundary-gated server-side; position now matches.
- THE CARRY-HOME LAW: the fresh deal places a baker with depthIntoTown ≤ 0
  at his town's spawn, after the banner warned him. This is designed
  deal-time placement, an amendment to "nobody teleports" (which still
  holds mid-play: the system never moves anyone while an order runs).
- depthIntoTown(town, pos) in client/gates.ts is the single "in your town"
  predicate. Do not fork it.
- The gate panel must never be an invisible wall: fence shut ⇔ panel shown.

## 4. File map (delta over prior handoff §4)

- src/core/constants.ts — + GATE_COLLISION_GROUPS (groups story in header).
- src/core/arena.ts — + GATE_HALF_WIDTH/GATE_X, Town.gate, front-wall
  flanks in TOWN0_WALLS; header records the open-front deprecation.
- src/core/baker.ts — + teleport().
- src/client/gates.ts — NEW: depthIntoTown + TownGates (rule, latch, valve).
- src/client/gates.test.ts — NEW: the fence law by positions.
- src/client/scene.ts — + gateMeshes (panel per town) on GameScene.
- src/client/hud.ts — + NextOrderNote; bannerText countdown/warning arm.
- src/client/main.ts — + gates construction/update (before Baker.step),
  lingerTicks, per-tick banner re-word, carry-home on banner-hide.
- src/server/room.test.ts — + the towns convergence test.

## 5. How to run, test, verify

`npm run check` (root tsc + headless tsc + vitest; 232 green at HEAD). Dev
5174 via preview tools (.claude/launch.json "dev"); room server 5175 is the
visionary's — never kill it. Headless probes: tmp-*.mts at repo root, await
RAPIER.init() then dynamic import, relative imports, delete after. Live
gate-testing recipe: __game.setDebugInput sprints; park at the doorway
(yaw −0.172 from spawn reaches it); an order dies ~240s real time (patron
burn) — use the detached window.__probe pattern (async loop writing to a
window global, poll with short preview_evals; preview_eval caps at 30s).
Positions: fence press rest = gate plane − 0.25 − 0.35 ≈ z −12.4 (town 0).

## 6. Open items and decisions

DECIDED this session (do not re-litigate):
- Open front retired; gated walls per §3. Sightline notes deprecated.
- Gate beside the machine (GATE_X=4), 3m doorway, rotationally same side.
- Only your own gate seals; foreign forts never seal.
- Carry-home teleport at deal time is sanctioned design (visionary's call);
  banner countdown + away warning precede it.
- Wood-tone panel for the shut gate (readability over wall-grey).

OPEN:
- Friend-test scope: Chronus's standing recommendation — the dev toggle now
  covers the full two-town loop (unlock → order end → pick → run the open
  gate → crew → fire → carry-home safety net); shop is fork 2. The
  visionary has not explicitly closed this; confirm before scheduling.
- Step-6 town-1 shot test (room.test.ts "the wire knows WHERE FROM") still
  fires inside the linger — breaks obscurely if ORDER_RESET_TICKS < ~530.
  Convergence test covers the honest path; re-cut only if it bites.
- net-handlers `town` ack does not grow machines[] (≤4-tick myMachine
  fallback to town 0; self-heals on next 15Hz broadcast). One-line
  hardening + truth up the myMachine comment in state.ts if touched.
- Away-warning lives only in banner text; if playtest shows sprinting
  players don't read it, escalate to a screen-edge pulse (art-pass item).
- 10s linger as the whole switch window: countdown + carry-home mitigate;
  watch whether humans want a longer window (one tuning.ts number).
- unlockTown2 has no dedicated broadcast/UI moment (fork-2 purchase will
  need one).
- TOWN_POTENTIAL[3]/[4] stale pre-bump — re-measure before 3-town work.
- Prior §6 quirks (slab-edge fall, cake climbing, frozen-topping contact)
  are now UNREACHABLE for penned bakers but still exist for a mid-linger
  wanderer (10s exposure, carry-home rescues at deal). No kill-Z built —
  confirm in solo play whether the residual window matters.

## 7. Next session focus

1. SOLO TWO-TOWN PLAY-THROUGH (visionary's quirk pass, now gate-shaped):
   real play feel of the pen (does the shut gate read? does the doorway
   placement feel right?), unlock via __game, wait for order end, pick
   town 1, run the gate in the linger, crew town 1, fire the rotated
   6/7-click ladder by eye, dawdle once on purpose to feel the carry-home,
   HUD 0/10 + town ack flash. Probe the residual mid-linger quirk window.
2. Close the friend-test scope question with the visionary; if dev-toggle
   suffices, run the two-PC friend test (room server 5175, one tunneled
   port).
3. Then fork 2 (shop/purse/turntable) — note the turntable is a walk-up
   interact under the cake, which mid-order penning must accommodate
   (gate design deliberately does not foreclose it; flagged in review).

## 8. Recommended reading order

1. This handoff.
2. project/handoffs/2026-07-07-towns-spine-built-review-next.md — the spine
   build record (§2) and prior laws (§3); its §6 open-front cons are now
   answered by the gates.
3. CLAUDE.md — updated current-state paragraph.
4. git log f64710c..HEAD — WALLS/TEST/LINGER commit messages (each carries
   its lessons + verification evidence).
5. src/client/gates.ts — the fence law, latch, depthIntoTown.
6. src/client/main.ts — gates/carry-home/banner wiring (search lingerTicks).
7. src/client/gates.test.ts + src/server/room.test.ts (the convergence
   test) — the pins.
8. project/plans/11-towns-slice.md — §1/§10 still canonical; §3/§9 open-
   front text deprecated per this handoff.
