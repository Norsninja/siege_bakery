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
THE LADDER MEASURED (2026-07-08, fourth session): plans/13 slice 3 is
BUILT (307 tests, both tsc legs). The re-pin tools are SPEC-
PARAMETERIZED with zero drift proven (research/11 imports the REAL
buildCensus/splatSamples — its mirror is deleted; both tool headers
carry the pins to reproduce after any splat/census/ballistics
change). THE CLAMP landed gated (plans/15 item 2 DONE):
TILT_MAX_NOTCH 18→12 after cake-3 at maxNotch 12 reproduced every
envelope number; sim/HUD/scene read the constant symbolically and
scene.test.ts pins the render contract (shown frame tilt = sim
tilt). ALL SEVEN ROWS MEASURED under the shipped ladder: summit
combos 22/16/12/8/7/4/0 across cake-1/2/3, cupcake, cake-4/5/6;
union frost coverage 100.0% on EVERY row (frost never gates the
ladder); TOWN_POTENTIAL's 0.9/1.0 generalize — one table, no
per-spec rows. THE RUNGS TABLE (game/campaign.ts, 7 rows, the
measurement record in its header; pins in campaign.test.ts): rung 3
= THE ANCHOR verbatim; THE CUPCAKE is rung 4 (§1 amendment: the
ladder is authored spec rows, harder not necessarily TALLER; random
insertion rejected); cake-6 is the top — its summit takes ZERO
shipped combos (windows exist in physics but fall between notches:
death by QUANTIZATION) and KEEPS its crown ask anyway: THE
IMPOSSIBLE TRAGEDY (visionary ruling — the run's story ends at the
top; the future power-up economy sells the key; the ONE sanctioned
impossible ask, every other crown must be measured reachable). THE
SLICE-3 BOUNDARY IS PINNED: specForRung still deals cake-3 every
rung — slice 4 flips deal + asks + clock TOGETHER, never spec alone.
Standing ledger: plans/15 (items 1/3/4 unclaimed pre-friend-test;
claim, don't re-triage); snapshot tripod framing dies on tall specs
(goes LIVE the moment slice 4 deals cake-4+); cupcake crown arrivals
all HOT (may bounce — feel pass); audit tranche C post-friend-test;
wind plan and Bite/integrity re-pin ownerless. NEXT: review, DISCUSS
slice 4 (mandatory — the flip, per-rung ask/clock wiring into order
rows, the rung-7-win ruling), then build; the friend test (plans/12)
inherits everything. Port map: research/01-port-gap-analysis.md.
