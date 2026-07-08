# CLAUDE.md — Siege Bakery 3D

## What this is

A 3D **real-time, first-person, co-op party game** (working title shared with
the 2D prototype): timed Patron orders, tiny bakers physically RUN between the
ammo pantry and their catapult, load the correct topping, operate the machine
— traverse wheel (aim), tension winch (power), release lever (fire) — and lob
toppings onto a giant shared cake. "Overcooked with catapults."

**Success test:** send a friend a link, play PC-to-PC over the net.
iPad-with-controller rides along; phone is NOT a design driver.

## Lineage (read before designing anything)

The 2D turn-based prototype lives at `E:\Projects\artillery` — a **READ-ONLY
sibling**: never modify it, it continues its own orthogonal development. Its
load-bearing docs:

- `artillery/project/plans/02-siege-bakery-design.md` — identity, two-gate
  Judgment, Patron behavior trees, two towns, tone guard (nobody dies).
- `artillery/project/plans/06-3d-realtime-pivot.md` — THE PIVOT RECORD: what
  ports and what doesn't, stack rationale, 3D cake approach, networking shape.

What ports here: the soul (artillery-as-construction, landing energy
splat-vs-place, two-gate Judgment, orders-as-data, Patron trees, two towns)
and small code (`core/rng.ts`, ported verbatim). The falling-sand automaton
deliberately does NOT port — 3D frosting is surface accumulation + sample-point
census scoring, not a voxel fluid sim.

## Stack

Three.js (render) + `@dimforge/rapier3d-compat` (WASM physics — runs in
browser AND Node) + Vite + TypeScript (strict) + Vitest.
Multiplayer (later): Node WebSocket room server running the same `core/` +
`game/` headless as the authority; clients render. Cake state syncs as
deterministic EVENTS (impact at P, velocity V, seed S), never as surfaces.
Assets: Blender → glTF export → `GLTFLoader`. Blender is the level/prop editor.

## Sacred layering (the tripwire)

- `src/core/` — deterministic simulation math. May import Rapier. NEVER
  imports three.js, DOM globals, `game/`, or `client/`.
- `src/game/` — match rules (orders, judgment, patron, catapult machine
  state). Imports `core/` only.
- `src/client/` — three.js rendering, input, `main.ts`. May import anything.
- `src/server/` — Room (THE match implementation, transport-agnostic) +
  Node ws entry. Imports `core/` + `game/` only.

**LAW:** `core/` and `game/` must run headless in Node — enforced TWICE:
`tsconfig.headless.json` compiles core/game/server WITHOUT the DOM lib
(part of `npm run check` — `window` in core is a type error), and vitest
runs them in Node (plus src/determinism-tripwire.test.ts scans for
clocks/randomness). Only `client/` may touch `window`/DOM/three.js.

**Determinism:** seeded RNG only (`core/rng.ts`) — never `Math.random()`;
no wall-clock reads in `core/`/`game/`; fixed 60Hz timestep decoupled from
rendering. This discipline is what makes authoritative multiplayer and
event-based cake sync possible. Guard it like the 2D project did.

## Commands

- `npm run dev` — Vite dev server on **5174** (the 2D prototype owns 5173;
  `PORT` env overrides).
- `npm run server` — Node room server on **5175** (tsx; `PORT` overrides).
  Serves `dist/` statically too, so one tunneled port = the friend test.
  Join from any client with `?join=ws://localhost:5175`; a page served BY
  the room server auto-joins; the vite dev page defaults to loopback solo
  (same Room class in-process — one match implementation, see plans/02).
- `npm test` — vitest; `npx tsc --noEmit` — typecheck; `npm run build`.
- DEV builds expose `window.__game` for headless browser verification, same
  culture as the 2D project.

## Session protocol

Handoffs in `project/handoffs/`, plans in `project/plans/`, research in
`project/research/` (per the global CLAUDE.md workflow).
**SIDE-QUEST LEDGER: `project/plans/15-side-quests.md`** — triaged
playtest notes with buckets and claim lines (rings-per-catapult, tilt
clamp, report inset, trails = pre-friend-test; post HUD = aesthetics;
power-ups = post-campaign discussion). Claim items there; don't
re-triage. Current state:
THE DESSERTSPEC LANDED (2026-07-08, third session): plans/13 slice 2
is BUILT under §3's rulings of record, ZERO-DRIFT PROVEN (every
pinned number — 661/218/443 census, WIN path, two-rooms-converge,
settle ladder — reproduced with assertions untouched; 293 tests, both
tsc legs) and live-verified through ready-up → rung 1 → scored splat
→ run over → auto-restart. The cake is a DATA ROW now: core/dessert.
ts holds DessertSpec + the CAKE_3 anchor + dessertGeometry(spec) —
THE ONE PUBLIC FORM (tier math private; the old zero-arg oracles are
DELETED, never aliased). GEOMETRY IS AN ARGUMENT, never a field, on
core/ classes (step(world, geom), clearCakeSolids(world, OUTGOING
geom)); THE REDEAL ORDERING (clear with old → tear down colliders →
bind rung's spec → build → fresh field) lives in Room.redealDessert()
and the client's fresh-deal branch, both pinned; the wire carries the
RUNG, never geometry (specForRung in game/campaign.ts — the slice-3
stand-in deals cake-3 every rung); clients bind the dessert BEFORE
snapshot adoption (boot-order law; frosting-view's length guard
tripwires it). Also this session: the slice-1 review found no bugs
(two pins added: a LEAVER mid-countdown does not cancel, the LAST
leaver does). Ready-circle/run-container laws unchanged (grep
run.phase before adding order-status behavior); vernier/gun-crew laws
unchanged (plans/14). KNOWINGLY STALE until slice 3: the research
.mts tools (import deleted arena exports; they gain a spec parameter)
and the potential tables (cake-3's measured numbers). Standing
ledger: plans/15 side quests (claim, don't re-triage); snapshot
tripod framing dies on tall specs; audit tranche C post-friend-test;
wind plan and Bite/integrity re-pin ownerless. NEXT: the visionary's
playtest feedback, then DISCUSS plans/13 slice 3 (research/13 + /11
gain a spec parameter, measure cake-1/2/4/5/6, author RUNGS — the
ladder's top is where the tools say the envelope dies) before
building; the friend test (plans/12) inherits everything. Port map:
research/01-port-gap-analysis.md.
