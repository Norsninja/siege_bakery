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
THE ECONOMY LIVE (2026-07-09, seventh session): plans/13 slice 5 is
BUILT (355 tests, both tsc legs, live-verified). THE
SHOP-SELLS-INFRASTRUCTURE AMENDMENT (plans/13 §5, the session's
ruling): the fudge unlock is STRUCK — fudge has been live and FREE
in the pantry since plans/10 (a research agent claimed otherwise;
the visionary caught it — grep before positions), and fudge paint
counts toward frost coverage (feel-pass watch: high rungs may play
easier than measured; fudge tech is the first suspect). The shop
sells UPGRADES only — ingredients are pantry, structurally (a patron
may one day ORDER fudge; an order can never demand what the crew
can't have). Inventory v1 = TOWN 2 alone (TOWN2_PRICE 50, tuning.ts
beside FLOURISH_BONUS_COINS 10 — both one-dial feel numbers). PURSE:
RunFlow state; each PASSED order pays the campaign.ts pay column
(base + stars × perStar, live at last) + the flourish bonus on the
coda (Room.awardPay at both won-conclusion sites); rides RunWire
(`purse?`, absent = 0) + welcome. SHOP HOURS: a WON order's
separator below the top rung — a run-ending linger sells dead keys.
{t:"buy", item} REPLACES unlockTown2 (dev seam retired); the Room
validates catalog/hours/owned/funds, refusals are silent drops the
client's prompt + flash predict in words (interactions shop branch,
state.shopState — drift-pinned). INVENTORY DIES WITH THE RUN: purse
zeroes + town 2 re-locks at the NEXT run's start (the report and
lobby keep the finished story's balance); startRun speaks town words
BEFORE the fresh deal, the client truncates machines on its
run-start edge (C-MED-2 both directions). The stall: Town.shop
anchor ±7.15 on the side wall at the pantry↔machine midpoint
(running is the fun), SHOP_HALF static in both replicas,
counter/post/coin meshes on the crosshair, price on the prompt,
NEVER a menu. FOUND+FIXED: net-handlers never copied
RunWire.won/ultra — standing clients could not render MASTER BAKER.
The towns convergence test is now the honest teaching arc (two 3★
wins fund the buy; a double-buy bounces off owned, undebited).
plans/15 item 8 NEW: run-points meta-progression (visionary's shape
recorded, deferred to the post-campaign power-up session). Standing
ledger: plans/15 items 1/3/4 unclaimed pre-friend-test; cupcake
hot-arrival watch; audit tranche C post-friend-test; wind plan and
Bite/integrity re-pin ownerless. THE LONE HERO AMENDMENT (plans/13
§5) is RECORDED, NOT BUILT — the visionary's solo-handicap ruling
from his live feel run (measured solo cycle 23.5s ≈ the mechanical
floor; solo unpassable as clocked): ask potential = REACH (towns) ×
LABOR (crew, hypothesis [—,0.5,1,1,1]), deal-time priced, judgment
grades the scaled potential (no gate-2 insult for one dwarf), clocks
untouched, crew 2+ verbatim. NEXT: review that record, DISCUSS
(agenda in the handoff §6), then build it; then the feel run
continues and the friend test (plans/12) inherits everything —
measuring the duo cycle the clocks assume. Port map:
research/01-port-gap-analysis.md.
