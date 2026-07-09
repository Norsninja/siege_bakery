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
THE LONE HERO LIVE (2026-07-09, eighth session): plans/13 §5's LONE
HERO AMENDMENT is BUILT (367 tests, both tsc legs, live-verified on
the worker-shim harness) after the standing-sequence discussion —
full record + the build's six rulings in the §5 BUILT block. The
law: every deal prices ask = REACH (TOWN_ASK_POTENTIAL, towns) ×
LABOR (CREW_LABOR [—,0.35,1,1,1], tuning.ts one dial), from
roster.count() at DEAL TIME (Room.dealAt wraps all three dealFresh
sites; joiners/leavers never retro-change a ticket — towns law
verbatim). LABOR [1] IS MEASURED, NOT HYPOTHESIZED: 0.5 fell to the
visionary's same-day feel run, replicated in-harness — the optimized
solo line (power 6, ±8° sweep, 6 shots, no re-crank) SATURATES at
6.7% absolute (band overlap decays late shots ~1.4%→0.9%), so 0.35
prices the pass at 5.88%: his measured best passes ON its sixth
shot (~14% headroom). Saturation study in the tuning.ts CREW_LABOR
comment + plans/13 §5 BUILT block. SPRINKLES SCALE TOO (build ruling: the 23.5s cycle
prices hands whatever the payload) — needed = ceil(grains × labor);
crown/desire/window/clocks/pay untouched; crew 2+ deals today's
numbers VERBATIM (friend test inherits zero drift). Judgment grades
the scaled potential off the dealt row (no gate-2 insult for one
dwarf, honest stars — a lone hero can now fund town 2, scenery
until the turntable, by design). The ticket WEARS its pricing:
OrderState.hands? stamped at deal (absent = full labor), rides
every order wire free; the HUD's "🖐 one pair of hands" tag reads
the STAMP, never live headcount. tuning.ts header re-pinned: solo
cycle 23.5s measured (12–18s retired), workload math restated as
REACH × LABOR. TEST LAW: room.test's jumpToRung anchor seam deals
FULL labor (pinned physics predate the handicap); towns-law tests
took a second baker; the convergence test is the lone hero's
teaching arc (her two 3★ wins fund the fort, deal priced 0.375
over honest wire, hands stamped). Slice 5 (economy/stall/purse)
context: plans/13 §5 amendment + §8.5 BUILT record. Standing
ledger: plans/15 items 1/3/4 unclaimed pre-friend-test; item 8
run-points deferred post-campaign; cupcake hot-arrival watch;
fudge-counts-toward-frost watch; audit tranche C post-friend-test;
wind plan and Bite/integrity re-pin ownerless. NEXT: the
visionary's feel run continues (solo is now honest — rung pacing
above rung 1 wants data); then the friend test (plans/12) measures
the duo cycle the clocks assume. Port map:
research/01-port-gap-analysis.md.
