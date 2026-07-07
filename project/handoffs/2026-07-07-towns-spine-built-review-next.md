# Handoff — 2026-07-07 (evening) — TOWNS SPINE BUILT; next: review + solo-play quirks

## 1. Snapshot

The towns spine (plans/11 stratum A) is BUILT and committed: 10 commits this
session (2 housekeeping + TOWNS 1/8..8/8 + a CLAUDE.md docs commit), HEAD
4f8499a. 221 tests green, both tsc legs clean, determinism fence intact.
The second town exists as a dormant capability: `activeTowns` starts 1 (the
exact pre-towns game), flipped to 2 only by the `{t:"unlockTown2"}` INPUT
(the fork-2 purchase's dev stand-in). Live loopback verified: unlock grows
machines to 2 over the wire; pickTown during a running order is REFUSED.
NEXT SESSION: (a) review the spine commits for issues/patterns, (b) solo-play
quirk testing before the friend test, (c) the open-front wall cons are the
first quirks to probe (§6).

## 2. What changed this session

Pre-build (committed first):
- bf325c9 density-review comment edits (tuning.ts/toppings.ts, comment-only).
- 6eacf3b plans/11 + prior handoff committed.

In-session plan amendment (BEFORE building, discussed and agreed):
- The clicks→10 bump reframed by the visionary as TOLL GEOMETRY, not a buff
  (clicks 9–10 exist so shots reach the far town; analytic + measured check:
  centered click-10 lands ON the far plinth, y=1.21 z=-47.55). Consequence:
  OPTION B — measurement/demand split. `TOWN_POTENTIAL` re-pins to measured
  truth ([1] 0.55, [2] 0.84; [3]/[4] marked STALE pre-bump); NEW authored
  table `TOWN_ASK_POTENTIAL` = what orders actually demand: [1] HELD at 0.42
  (solo workload unchanged — the bump must not silently make the live order
  ~31% harder), [2] starts 0.75 (bottom of the sanctioned 0.75–0.84 band).
  A DECISION PIN test locks 0.42. Plan §6's "re-pin [1]→0.55 and hand it to
  the order" is SUPERSEDED by this.

The eight spine commits (each: check green, positions verified, committed):
1. 036537a arena: `TOWNS` table in core/arena.ts; town 1 = 180° rotation
   about the cake axis ((x,z)→(−x,2·CAKE_Z−z)); per-town side+back walls,
   OPEN fronts; old z=±13 walls retired; ground re-centered on the cake
   (GROUND_HALF_Z=48 → z −78..+18; old slab ended at −40, short of town 1
   whose pantry is at z=−72). Old names alias TOWNS[0]. scene.ts statics
   looped (render contract). Verified by positions (16 checks): anchors
   rotate exactly, bodies rest on town-1 colliders, rays confirm open
   fronts/back/side walls, town-1 shot impact = exact rotation of town 0's.
2. eef9bb0 ballistics: `launchVelocity` gains `facingDeg` (appended, default
   0); yaw = traverse + facing. `launchOrigin` town-agnostic BY COMPOSITION
   (callers pass traverse+facing — raw traverse would nudge a town-1 origin
   into the arm). Facing-90 sign-probe test kills the traverse−facing
   mutation (facing-180 alone is congruent mod 360 and cannot).
3. fbbceec clicks→10 + Option B tables (above). WAKE_RADIUS re-check done
   (0.935 < 1.0 at new max speed; research/11 fired 12 clicks, no tunnel).
   HUD pin re-cut 6/8→6/10 (the only test that moved).
4. a2bf334 room: `machine/crankTicks/screwTicks` → `towns: TownRuntime[]`
   (length IS activeTowns); tickMachinePhase loops in index order; shots
   spawn from TOWNS[i].base along facingDeg. unlockTown2 is a ClientMsg
   handled in Room.onMessage (input-stream = replayable = convergence-safe;
   works over net, UNLIKE setGrainCount). Idempotent, capped at TOWNS.length.
5. 844017c roster: `town` on Member (default 0); `machineIntent(town,
   bucketFree)` filters hands/levers/loads by assignment (structural fix for
   merge-everyone; survives as the town-0 case). pickTown: Room owns the
   MATCH gate (refused while order running; open in the 10s linger window),
   Roster owns FIELD truth (integer, ACTIVE town — dormant forts unpickable).
6. 9ebe4c9 wire: `town` on shot/machine broadcasts; welcome carries
   `machines: TownMachine[]` + `yourTown`; shot replay origin resolves from
   TOWNS[msg.town] in shots-view (origin is part of the event's
   determinism). op/lever/load byte-unchanged (owner-implicit).
7. e2d5084 order: `standardRequirements(activeTowns=1)` reads
   TOWN_ASK_POTENTIAL at active count (clamped to table top); OrderFlow
   carries `activeTowns`, Room writes it on unlock; RUNNING order keeps its
   dealt rows — ask rises at the NEXT deal only.
8. 5c08ade client: MachineRig(base, facingDeg) — rig yaw = facing+traverse;
   full station per fort (rig/pennant/crates, offsets rotated); interactables
   bind to LOCAL town only (gs.bindTown — far fort's controls would drive
   YOUR machine, so offering them would lie); view.machine → machines[] +
   yourTown (myMachine() helper); BOOT-ORDER FIX: Baker spawns after first
   welcome at TOWNS[yourTown].spawn, camera pre-oriented to facing. NEW WIRE
   (not in plans/11): `{t:"town", id, town}` ack broadcast when a pick is
   honored — without it the picker never learns its assignment applied.
   Assignment ≠ position: nobody teleports, you run to the new fort.
   __game gains unlockTown2/getYourTown/getMachines.
- 4f8499a CLAUDE.md current-state updated.

## 3. Architecture and invariants

All prior laws hold (sacred layering, determinism incl. server/, conversion/
burial, one-global-coverage-row, sync-shots-not-surfaces). New/refined:
- THE CORE LAW (plans/11 §1) is now STRUCTURAL: towns array defaults to
  length 1; grows only via the unlockTown2 input; never shrinks; nothing
  moves a player (pickTown default stay-put, deterministic, no RNG).
- TWO POTENTIAL TABLES (Option B): TOWN_POTENTIAL = measured reference,
  NEVER handed to orders; TOWN_ASK_POTENTIAL = authored demand, exempt from
  mechanical re-pin law (moves only by design decision + restated workload
  math). Do not collapse them again.
- Owner-implicit input routing: op/lever/load carry NO town; server derives
  from member.town; never trust a client-supplied town on inputs.
- Shot events carry `town` = WHERE FROM; replicas replay from TOWNS[town].
- Everything else singular: one world, one ProjectileManager, one
  FrostingField, one settled ledger, one OrderFlow/patron/clock/judgment.
- Ask rises only at deal time (freshOrder reads activeTowns); a running
  order's rows are immutable to activation.
- Client: interactables/HUD/clunk target yourTown only; town-1 machine
  broadcasts index into machines[], never clobber.
- Trust model until fork 2: any client may send unlockTown2 (co-op-among-
  friends, plans/02 — same tier as client-auth poses). The purchase gate
  replaces the handler in fork 2.

## 4. File map

- src/core/arena.ts — TOWNS table, rotateAboutCake, per-town walls, ground
  constants (GROUND_HALF_X/Z, GROUND_CENTER_Z), aliases; buildArenaColliders
  loops TOWNS. Oracles (tierOf/isOnCake/distanceToCake/cakeSurface) untouched.
- src/core/ballistics.ts — launchVelocity(traverse, clicks, tilt, facing);
  launchOrigin (compose yaw at call site).
- src/core/projectiles.ts — WAKE_RADIUS comment updated with the 10-click math.
- src/game/catapult.ts — TENSION_MAX_CLICKS=10 + toll-geometry comment.
- src/game/tuning.ts — TOWN_POTENTIAL (measured; [3]/[4] stale-marked) +
  TOWN_ASK_POTENTIAL (authored) + rewritten header story.
- src/game/order-flow.ts — standardRequirements(activeTowns); OrderFlow.activeTowns.
- src/game/protocol.ts — ClientMsg + unlockTown2/pickTown; ServerMsg machine/
  shot gain town, welcome machines[]+yourTown, new town ack; TownMachine.
- src/server/room.ts — TownRuntime[], unlock/pick handlers in onMessage,
  per-town tickMachinePhase/broadcastMachine(town).
- src/server/roster.ts — Member.town, setTown (returns changed), townOf,
  machineIntent(town, bucketFree).
- src/client/state.ts — MatchView.machines/yourTown, myMachine(), freshTownMachine().
- src/client/net-handlers.ts — welcome/machine/town cases; NetFx.bindTown.
- src/client/scene.ts — MachineRig(scene, base, facingDeg), update(TownMachine,
  clunk); buildGameScene: per-town stations, gs.bindTown re-targets interactables.
- src/client/shots-view.ts — spawn reads TOWNS[msg.town] base+facing.
- src/client/main.ts — boot behind first welcome; rigs loop (clunk only for
  yourTown); myMachine at HUD/interaction sites; __game additions.
- Tests: room.test.ts (dormancy, pickTown gates, owner-implicit two-winches,
  town-1 shot end-to-end, ask-at-next-deal), order-flow.test.ts (DECISION PIN
  0.42, ask-by-count), ballistics.test.ts (facing pins), net-handlers.test.ts
  (machines indexing, town ack), hud.test.ts (6/10 re-cut).

## 5. How to run, test, verify

`npm run check` (root tsc + headless tsc + vitest; 221 green at HEAD). Dev
5174 via preview tools (.claude/launch.json name "dev"); room server 5175 is
the visionary's — never kill it. Headless: tmp-*.mts at repo root, await
RAPIER.init() then dynamic import, relative imports only, delete after;
VERIFY BY POSITIONS by category. Loopback dev handles: __game.unlockTown2()
(net-safe input), getYourTown(), getMachines(), send({t:"pickTown",town}) —
only honored in the 10s linger window after an order ends; watch for the
{t:"town"} ack. Aerial screenshot trick: shadow camera.position.set/
rotation.set with no-ops on the instance, set fields directly, null the fog,
reload after (also recorded in auto-memory game-smoke-driver-notes).

## 6. Open items and decisions

DECIDED this session (do not re-litigate):
- Option B (visionary's call): solo authored ask HELD at 0.42; two-town
  authored 0.75; measured table separate. Locked by the DECISION PIN test.
- clicks 9–10 are toll geometry, not an upgrade (his framing; code aligned).
- unlockTown2 is a net-safe INPUT, not loopback-only (deviates from plans/11
  §1 wording; deliberate — the friend test needs it over the net, and
  message-stream inputs are convergence-safe).
- The {t:"town"} ack wire addition; assignment ≠ position (run, not teleport).

OPEN:
- Friend-test scope (plans/11 §11): dev toggle enough vs shop-first. Chronus
  recommends dev toggle suffices; the visionary wants MORE SOLO TESTING
  FIRST — friend test deferred until quirks are fleshed out.
- THE OPEN-FRONT WALL QUESTION (visionary raised, answered in-session,
  cons untested): removal of the machine-end wall is per plans/11 §3 (open
  mouth = sightline/Visibility glue; also required by run-to-your-fort).
  Pros: cross-cake sightline, on-foot town switching, honest spill, toll
  comedy. Cons to PROBE IN SOLO PLAY: (a) baker can walk off the ground
  slab edge (midfield z −13..−47 has no side barriers; slab ends x=±40,
  z −78/+18) and fall forever; (b) baker can climb the cake / press into
  settled toppings (kinematic vs frozen-body interaction untested — may
  shove or ghost); (c) no boundary fiction until the environment pass
  (mountains on TOWNS anchors — the real fix). Recommended cheap fix IF
  confirmed: client-side kill-Z respawn at TOWNS[yourTown].spawn. Decide
  after play.
- TOWN_POTENTIAL[3]/[4] stale (pre-bump) — re-measure before any 3-town work.

## 7. Next session focus

1. REVIEW the spine (visionary's ask): go over the 8 TOWNS commits for
   issues and improvable patterns — candidates: /code-review over the range
   bf325c9..4f8499a or d574769..HEAD; look for missed single-town
   assumptions (grep MACHINE_BASE/PANTRY_POS consumers), wire-shape
   regressions, test gaps (e.g. no two-Room convergence test that INCLUDES
   an unlockTown2+pickTown script — worth adding), the linger-window timing
   dependence of the town-1 shot test (crank 270t + flight inside 600t —
   fragile if ORDER_RESET_TICKS changes).
2. SOLO PLAY testing to flesh out quirks before the friend test: the
   open-front cons above (world edge, cake climbing, frozen-topping
   contact), two-town play via __game (unlock, wait for order end, pick
   town 1, run over, fire the rotated 6/7-click ladder by eye), the town
   ack flash, HUD 0/10 reading.
3. Then decide friend-test scope and schedule fork 2 (shop/purse/turntable).

## 8. Recommended reading order

1. This handoff.
2. project/plans/11-towns-slice.md — §1 core law, §10 build sequence; note
   the Option B amendment (§2 above) supersedes §6's re-pin line.
3. CLAUDE.md — updated current-state paragraph, laws, commands.
4. git log d574769..HEAD (the 8 TOWNS commit messages are the build record,
   each with its verification evidence).
5. src/game/tuning.ts — the two-table potential story (header + tables).
6. src/server/room.ts + src/server/roster.ts — the runtime spine.
7. src/client/main.ts (boot order, __game) + src/client/scene.ts (bindTown).
8. project/handoffs/2026-07-07-towns-plan-codified-build-next.md — the prior
   handoff (research provenance), only if deeper context needed.
