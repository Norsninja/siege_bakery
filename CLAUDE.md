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
`project/research/` (per the global CLAUDE.md workflow). Current state:
THE RUN CONTAINER LANDED (2026-07-08, second session): plans/13 THE
CAMPAIGN is authored in full and blessed — order N = rung N = an
N-tier cake (DessertSpec rows, colliders rebuilt at redeal, census
derived from spec), a FAILED ORDER ENDS THE RUN, shared purse resets
per run, shop only in the 18s separator (town 2 + fudge are shop
purchases now — supersedes plans/09 §2's twist ladder), and THE
LADDER'S TOP IS WHERE THE TOOLS SAY THE ENVELOPE DIES (no rung ask
pins until its spec ran research/13 + /11). Slice 1 is BUILT and
feel-tested: the game boots into a LOBBY (dormant order never ticks or
scores; machines are a warmup sandbox), a GOLD READY CIRCLE in town
0's yard starts the run when ALL bakers stand in it through a 3s
countdown (stepping out or a mid-count joiner cancels), WON orders
climb rungs with no lobby between, LOST orders show the RUN OVER
report (no fresh deal — the next deal is the next run's), and a crew
still in the circle auto-restarts. Order-status behaviors (gates,
pickTown, clock, scoring) are ALL phase-gated — grep run.phase before
adding another. Also this session: the review fixed two E-edge bugs —
the precedence chain lives tested in interactions.resolveEEdge (each
stage consumes the edge only when it ACTS) and the crosshair went
PANTRY-ONLY (MACHINE_CONTROL_KINDS; machine parts left the raycast;
watch item: if friend-test first-timers flounder at a mute machine,
signposts return). 290 tests green, both tsc legs. Vernier/gun-crew
laws unchanged (plans/14; one body one job; the reticle never aims;
W/S = more/less; the 80% curve stays 48/39 idealized — the 4-player
heroic number). Standing ledger: audit tranche C post-friend-test;
wind plan and Bite/integrity re-pin ownerless. NEXT: review the
session's work, then DISCUSS plans/13 slice 2 (DessertSpec core
refactor, zero-drift proof against cake-3) before building; the friend
test (plans/12) inherits the lobby whenever it lands. Port map:
research/01-port-gap-analysis.md.
