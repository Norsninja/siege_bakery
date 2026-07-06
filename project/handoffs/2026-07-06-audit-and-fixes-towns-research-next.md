# Handoff — 2026-07-06 (holistic audit resolved; NEXT: towns research + plan)

## 1. Snapshot

HEAD debfb7e. 209 vitest green (22 files), both tsc legs clean, tree clean.
Near MVP. This session ran the impartial holistic audit requested by the
2026-07-06 conversion-law handoff (§7), then fixed everything it surfaced.
The audit is fully resolved with no outstanding caveats: one correctness bug
fixed, the whole test-honesty tier closed, all hygiene items done. Every fix
is mutation-verified (the guard fails when the bug is reintroduced) or
verified by headless probe. NEXT SESSION IS NOT BUILDING: research the towns
slice and build shared confidence in the implementation approach BEFORE
starting (his explicit instruction).

## 2. What changed this session

Audit run first (4 fresh-context subagents: layering/determinism,
test-honesty, client-render, hygiene — two finished, two hit credit limits
mid-run and were completed by hand). Then 8 commits:

- `f49fac2` FIX: same-tick bury/add ordering. ShotsView.step processed
  ev.stuck (add) before ev.impacts (bury), reverse of the Room. A grain
  gripping the tick a covering glob landed was erased client-side while the
  Room counted it. Reordered impacts-before-stuck (mirrors room.ts). New
  src/client/shots-view.test.ts (wires real Frosting/Sprinkles views).
- `cb08312` TEST: room.test "Patron burns the clock" was vacuous (asserted
  patron.length>2, true from look cadence alone) — rewritten to tick until
  the order ends and assert it died early (240s of nominal 300, deterministic).
  Burst batching pinned (7 batched `scored`, not 40). New
  src/game/toppings.test.ts exercises the SHIPPED fudge row + isPaint/
  canCrown/deliveryWeight; one end-to-end fudge shot in room.test.
- `5c85404` TEST: arena.test unit-pins distanceToCake + cakeSurface (wall/
  top/interior normals). room.test two-Room byte-identical convergence test.
- `dbf49b7` HYGIENE: determinism tripwire recursive + wider net (setTimeout/
  setInterval/process.hrtime/crypto.getRandomValues) + fences server/ minus
  main.ts. frosting-view blobCrest constants hoisted (BLOB_LIFT/
  BLOB_GEO_RADIUS/BLOB_SQUASH) — was single-source by convention only.
- `842d896` HYGIENE: fantasy baker names (roster.ts, seeded mulberry32 —
  server is fenced now) replacing "baker N"; `hello` stays as the rename hook.
- `bbe92aa` FIX: StuckTopping gains `coats` (grip-time). Room captures
  coatsNear at grip, sends it; client replays it instead of re-measuring the
  current field (was floating late-join sprinkles up — the "wizard"). Perch
  is fixed at grip; on top at fixed height or buried and gone, nothing between.
- `607d9c5` HYGIENE: sprinkle color now a hash of the grip POINT (was array
  index — burial's splice recolored survivors). setGrainCount gated on
  loopback (tickRoom), not just DEV.
- `debfb7e` TEST: locked-at-grip coats guard done properly — grows the field
  at a grip point directly (bypassing the shot pipeline so burial never runs),
  asserts a joiner still sees the grip value. Fails "expected 4 to be 2" on a
  recompute-at-welcome mutation.

## 3. Architecture and invariants

Unchanged and reaffirmed by the audit: sacred layering (verified zero
violations by import-edge grep); determinism (seeded rng, fixed 60Hz,
sqrt-only cross-engine math); THE CONVERSION LAW + THE BURIAL LAW (plans/10
§8); sync-shots-not-surfaces; freeze law for solids; the fresh-cake law.

Clarified/added this session:
- STUCK RECORDS ARE COMPLETE STATE ON THE WIRE. A stuck sprinkle's perch
  height is FIXED at grip. The welcome carries pos + normal + grip-time
  `coats`; the client replays them, never re-derives. There is no re-raising
  ("no wizard"): a sprinkle is on top at its fixed height, or buried and gone.
- The "covered" line is the splat FOOTPRINT over the record's point
  (splatCovers) — traceable to one shot (research/07 razor). Frosting beside
  a sprinkle (not over it) does not bury it.
- Client event consumption order MUST mirror the Room: impacts (bury) before
  stuck (add), both sides. See shots-view.test.ts.
- Determinism fence now includes server/ (minus main.ts). Anything added to
  server/room.ts or roster.ts must stay clock-free and seeded.

## 4. File map

Deltas this session (unchanged files omitted; see prior handoff §4):
- src/client/shots-view.ts — impacts-before-stuck ordering (the fix + its
  comment). GRAIN_PALETTE comment corrected (flight vs perch color independent).
- src/client/sprinkles-view.ts — grainColorIndex(pos) stable color hash.
- src/client/frosting-view.ts — BLOB_LIFT/BLOB_GEO_RADIUS/BLOB_SQUASH consts;
  blobCrest + geometry + refresh derive from them.
- src/client/main.ts — restoreStuck uses s.coats; setGrainCount gated on
  tickRoom (loopback).
- src/server/room.ts — settled entry gains coats?; ev.stuck loop captures
  coatsNear at grip; welcome maps coats.
- src/server/roster.ts — fantasyName() (seeded); NAME_FIRST/NAME_EPITHET.
- src/game/protocol.ts — StuckTopping.coats.
- src/game/toppings.test.ts (NEW) — shipped fudge row + classification pins.
- src/core/arena.test.ts — distanceToCake + cakeSurface unit pins.
- src/server/room.test.ts — convergence, fudge shot, fantasy name, batching,
  rewritten Patron-clock, locked-at-grip coats.
- src/client/shots-view.test.ts (NEW) — same-tick bury/add ordering.
- src/determinism-tripwire.test.ts — recursive, wider net, server/ fenced.

## 5. How to run, test, verify

`npm run check` (root tsc + headless tsc + vitest; 209 tests). Dev 5174,
room server 5175 (never kill his). Headless ground-truth: tmp-*.mts at repo
root (NOT /tmp — relative imports break), `await RAPIER.init()` then
`await import("./src/...")`, reach internals via `(room as any).frosting/
.settled/.shots`, delete the file after. Mutation-verify guards: revert the
fix via a node one-liner, run the specific test, confirm it fails, restore.
Browser smokes unchanged (see prior handoffs; his eye does the visual pass).

## 6. Open items and decisions

DECISIONS (do not re-litigate):
- Perch fixed at grip; no wizard; covered = splat footprint over the point.
- Fantasy names are seeded/deterministic (server is fenced); per-session
  variety later = seed from the driver. `hello` kept as the rename hook.
- Sprinkle color = grip-point hash (stable under burial, cross-client
  consistent). Flight color (spawn index) and perch color need not match.
- All conversion/burial/fresh-cake laws from plans/10 §8 stand.

OPEN (his calls, not code debt):
- Density review still pending: 20/40/80 grains via `__game.setGrainCount`
  (loopback), his eye, then re-pin SPRINKLES_NEEDED (60 now; ask ~1.5x grains).
  Natural to do before towns since towns builds on the sprinkle economy.
- Patron nag +1 grain on a 60 ask (comedy or broken).
- Short-shot floor litter at the cake foot (~24 grains) — honest by law.
- No reconnect / no protocol version field — MVP-acceptable; add a version
  field before the first cross-build friend test.

## 7. Next session focus — READ THIS FIRST

RESEARCH AND PLAN TOWNS, together, before building. His instruction: "begin
researching the plan for towns and gaining confidence on the implementation
together before starting." Do NOT start implementing. Deliverable is a shared,
confident plan (likely a plans/ doc) he has signed off on.

Towns context already decided (2026-07-05 discussion, recorded in the
2026-07-06 conversion-law handoff §6 and plans/10 header): town-as-data,
one-way split at a milestone, per-town purchased upgrades, counter-tool law,
shared purse, TENSION_MAX_CLICKS=10 bundled with the towns slice. Economy
measured: research/11 two-town union 75.2%@8 / 84.4%@9 / 15.6% moats (mostly
elevation). The towns slice rewrites the frost-potential path (TOWN_POTENTIAL,
the rung-authored potential per plans/09 §4) and touches judgment + order-flow
— the surfaces now covered by the convergence test and the oracle/fudge pins,
so moving there is de-risked.

Start by researching: read plans/09 (direction/rungs), plans/08 (economy),
research/11 (union study), the 2026-07-05 towns/upgrades decisions, and the
current frost-potential code (game/tuning.ts TOWN_POTENTIAL, order-flow.ts
standardRequirements, judgment.ts frost-coverage row). Then discuss shape
before any plan doc.

## 8. Recommended reading order

1. This handoff (§7 defines the session's job; §3 the reaffirmed/added laws).
2. CLAUDE.md — laws, layering, commands, current-state pointer.
3. project/handoffs/2026-07-06-conversion-law-built-audit-next.md — the prior
   handoff; §6 records the towns/upgrades decisions still standing.
4. project/plans/09-*.md — direction, rungs, the rung-authored potential (§4).
5. project/plans/08-*.md — the frosting economy redesign (potential coverage).
6. project/research/11-two-town-union.mts (header) — the two-town union /
   moats study (it is a runnable .mts study script, not a .md).
7. src/game/tuning.ts (TOWN_POTENTIAL + re-pin law), src/game/order-flow.ts
   (standardRequirements), src/game/judgment.ts (frost-coverage row) — the
   frost-potential code towns will rewrite.
8. project/plans/10-projectile-pass.md §8 — conversion/burial law (context for
   how the last slice was recorded).
