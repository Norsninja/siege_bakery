# Handoff — 2026-07-07 (towns slice researched + plan codified; NEXT: build the spine)

## 1. Snapshot

HEAD still d574769; this was a research-and-plan session, no towns code
written (per the prior handoff's instruction). Two outcomes: (a) the density
review closed — 40 grains confirmed by the visionary's eye, ask held at 60,
comment-only edits; (b) the towns slice fully researched (four-agent pass) and
codified into `project/plans/11-towns-slice.md`, signed off through
discussion. Working tree has three uncommitted changes (comment-only
toppings.ts/tuning.ts + the new plans/11); `npm run check` green (209 tests,
both tsc legs) after the density edits. NEXT SESSION BUILDS the towns spine
per plans/11 §10.

## 2. What changed this session

- Density review CLOSED. `game/tuning.ts` SPRINKLES_NEEDED comment and
  `game/toppings.ts` `grains: 40` comment updated to record: 40 confirmed, ask
  held 60, "may want raising" rejected (no play signal). Comment-only, no
  logic, no re-pin, no test churn. Standing OPEN item now closed.
- `project/plans/11-towns-slice.md` written then enriched into the full
  codified plan (12 sections). Key content in §3 below.
- Four research agents dispatched and synthesized (all returned):
  internal server/game map, internal client map, external co-op design scout,
  external networked-station engineering scout. Findings folded into plans/11
  §11 provenance and throughout.

Uncommitted (not staged/committed this session): `M game/toppings.ts`,
`M game/tuning.ts`, `?? project/plans/11-towns-slice.md`. Commit at start of
next session if desired.

## 3. Architecture and invariants

Unchanged laws hold (sacred layering, determinism incl. server/ fence,
conversion/burial law, one-global-coverage-row, sync-shots-not-surfaces).

Towns decisions CODIFIED this session (plans/11 — do not re-litigate):
- THE CORE LAW (§1): the second town is a PURCHASED UPGRADE, never a forced
  split. Default is one town, permanent and first-class. `activeTowns`
  defaults to 1; the purchase (fork-2 shop) flips it to 2, gated on enough
  players + difficulty tier. Turntable is the small-crew alternative.
  Scoring rises to the two-town ask only on purchase; crewing town 2 is a
  choice whose default is "stay put." This overrode an earlier auto-split
  reading, which is REJECTED.
- Second town built as a DORMANT CAPABILITY behind `activeTowns` (default 1);
  dev stand-in `__game.unlockTown2()` (loopback-only) activates it for the
  spine; the real purchase is fork 2.
- Split mechanism (§5): explicit `Member.town`, `{t:"pickTown"}` honored only
  when order not running (locked during a running order), default stay-put.
- Potential (§6): rung-authored, one global coverage row. Re-pins:
  `TOWN_POTENTIAL[1]` 0.42→~0.55, `[2]` 0.73→~0.84 (from research/11's
  existing sweep; clicks→10 re-scales the envelope, no re-run).
  `TENSION_MAX_CLICKS`→10 global flat (DECISION 1). Not a trap: buying reach
  raises reach AND ask together, holding FROST_FRAC ratio constant.
- Input routing OWNER-IMPLICIT (§4): `op`/`load`/`lever` carry NO town; server
  derives town from `member.town`. Wire delta only: `town` on `shot`/`machine`
  broadcasts + `yourTown` on `welcome`.
- Symmetry: rotational (180°), `(x,z)→(−x,2·CAKE_Z−z)` — already research/11's
  transform. Each town its own enclosure (side+back walls, OPEN front to the
  cake); retires the z=±13 bounding walls. Cake central at z=−30.
- `launchVelocity` needs a new `facingDeg` param (default 0); `launchOrigin`
  already town-agnostic.
- Client boot-order hazard: Baker spawns synchronously before `welcome`; fix =
  gate spawn behind first `welcome`, pre-orient camera to `yourTown`.
- N=2: NO ECS, NO InstancedMesh (scale tools; tradeoffs invert). Plain
  `TownRuntime[]` + per-instance meshes.
- Integration "glue" (§9) is DEFERRED design guidance, not spine work:
  Visibility / Overlap (never cut the cake in half; contested band 27.4%@9) /
  Coupling (turntable, toll, shared patron). Guides economy + art, not the
  spine.
- Environment (models/mountains) is a later Blender pass on the same `TOWNS`
  anchors; must not gate the spine.

## 4. File map

- `project/plans/11-towns-slice.md` — THE towns plan. §1 core law, §3 arena/
  town-as-data, §4 runtime, §5 split, §6 potential + re-pins, §7 shop/
  counter-tool law (fork 2), §8 toll/report (fork 3), §9 integration north
  star (deferred), §10 the 8-step build sequence, §11 decisions + provenance +
  re-pin law, §12 NOT-list.
- `src/core/arena.ts` — TOWNS table target; MACHINE_BASE/PANTRY_POS/PLINTH_POS/
  BAKER_SPAWN (→ TOWNS[0].*, keep aliases), buildArenaColliders (loop TOWNS +
  extend ground), tierOf/isOnCake/distanceToCake/cakeSurface (agnostic).
- `src/core/ballistics.ts` — launchOrigin (agnostic), launchVelocity (add
  facingDeg).
- `src/game/catapult.ts` — CatapultState/tickMachine/MachineIntent (agnostic,
  reuse per town); TENSION_MAX_CLICKS=8 (→10); TILT_DEG_PER_NOTCH.
- `src/game/order-flow.ts` — standardRequirements hardcodes TOWN_POTENTIAL[1]
  (→ active-town-count value); OrderFlow (town-agnostic).
- `src/game/tuning.ts` — TOWN_POTENTIAL, FROST_FRAC, SPRINKLES_NEEDED (60,
  density review closed).
- `src/game/protocol.ts` — ClientMsg/ServerMsg/welcome/shot/machine (wire
  touch-points; add town to shot/machine, yourTown to welcome, pickTown msg).
- `src/server/room.ts` — machine/crankTicks/screwTicks fields (→ TownRuntime[]),
  tickMachinePhase, join/welcome, broadcastMachine, tickScoringPhase.
- `src/server/roster.ts` — Member (add town), machineIntent (add town filter),
  handleMessage (add pickTown).
- `src/client/` — state.ts (view.machine → machines[]), net-handlers.ts (index
  by town), scene.ts (TOWNS loop; MachineRig base+yaw ctor — best-case file,
  geometry already data-driven), main.ts (boot order, __game), input.ts
  (initial yaw per town), hud.ts (local town), ghosts.ts (town color later).
- `src/game/toppings.ts` — grains:40 confirmed (density review).
- `project/research/11-two-town-union.mts` — the union/overlap/gap study;
  imports MACHINE_BASE + calls launchVelocity directly (needs facingDeg=0
  default to keep running); sanity pins 43.7%@8 / 55.7%@9.

## 5. How to run, test, verify

`npm run check` (root tsc + headless tsc + vitest; 209 green now). Dev 5174,
room server 5175 (never kill his). Headless ground-truth: tmp-*.mts at repo
root, `await RAPIER.init()` then dynamic import, reach internals via
`(room as any).machine/.settled/.frosting`, delete after; VERIFY BY POSITIONS
by category, not counters. Loopback smoke via `__game.send({t:"op"/"load"/
"lever"})`; poll `__game.getMachine().tensionClicks` to time cranking;
detached-async for long runs, check document.hidden first. The build spine
must keep both tsc legs + determinism fence (server/) green; mutation-verify
new guards.

## 6. Open items and decisions

DECISIONS (do not re-litigate): all of §3 above (core law, dormant capability,
split mechanism, potential/re-pins, owner-implicit input, rotational symmetry,
no-ECS, deferred glue). DECISION 1 (clicks→10 flat) and DECISION 2 (spine =
split mechanism only, ceremony to fork 2) resolved.

OPEN (visionary's call, carried to next session):
- Friend-test scope (plans/11 §11): is dev-toggle two-town mode enough for the
  FIRST friend test (shop a fast-follow), or must the PURCHASE experience be in
  that test (making the fork-2 shop a friend-test prerequisite)? Undecided —
  needed before the build reaches the activation path.
- Arena-boundary greybox ambition confirmed as two enclosures (§3); exact wall
  extents/open-front geometry to pin during build step 1.

## 7. Next session focus

BUILD THE TOWNS SPINE (stratum A) per plans/11 §10, the 8 ordered steps:
1 TOWNS table + mirrored-enclosure arena → 2 launchVelocity facingDeg →
3 clicks→10 + potential re-pins + WIN-test re-cut → 4 activeTowns +
TownRuntime[] + dev unlockTown2 → 5 owner-implicit assignment + pickTown →
6 wire (town/yourTown) → 7 authored potential in the order → 8 client two
towns + boot-order fix. Each step: check green, positions, one loopback
screenshot for his eye. Resolve the friend-test-scope open item when the build
reaches activation. Optionally commit the three pending changes first.

## 8. Recommended reading order

1. This handoff.
2. `project/plans/11-towns-slice.md` — the codified plan (the whole session's
   deliverable); §1 core law and §10 build sequence first.
3. `CLAUDE.md` — laws, layering, commands, current-state pointer.
4. `project/handoffs/2026-07-06-audit-and-fixes-towns-research-next.md` — the
   prior handoff that set this session's job.
5. `src/core/arena.ts` + `src/core/ballistics.ts` — build steps 1–2 targets.
6. `src/server/room.ts` + `src/server/roster.ts` — build steps 4–6 targets.
7. `src/game/tuning.ts` + `src/game/order-flow.ts` — steps 3, 7.
8. `project/research/11-two-town-union.mts` (header + MEASURED block) — the
   economy numbers the re-pins come from.
9. `project/plans/09-direction-and-topping-physics.md` §3–5 — the towns/
   upgrade/turntable design frame.
