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
THE FLOURISH LIVE (2026-07-09, sixth session): plans/13 slice 4b is
BUILT (337 tests, both tsc legs, live-verified). THE FINISH IT
AMENDMENT (plans/13 §1, the session's ruling — extends the flourish
amendment): our "FINISH HIM" moment is the ROWS-MET TICK, not
clock-zero (a won order ends the instant its last row is met; the
clock only ever ends losses). THE WINDOW: on a qualifying win
(accepted + flourish rung + reveal fired + desire unmet) the base
verdict FREEZES unbroadcast (Room.pendingVerdict), status stays
"running" (gates shut, banner suppressed, order clock + patron
held), and the crew gets FINISH_WINDOW_TICKS (15s, a feel-pass
number) to land the fatality — early-out the moment it settles.
S-MED-1 AS AMENDED: base frozen at the decided tick, verdict
COMPLETE at the window's end; style shots free by construction.
LEDGER-JUDGED DESIRE: OrderState.desire ({topping, revealed, met} —
from Patron.desire, dealt on asks.crown rungs; the Giant wants a
cherry); eligibility is PHYSICAL (judgment.crownedWith on the
settled ledger at each conclusion — pre-styled cherries count; the
reveal is presentation, never eligibility). THE TOPPERS LAW: desires
draw only from toppers (cherry, lime — never orderable);
validateDesires at Room boot. The reveal is patron rule 3 REBORN (a
look at coverage ≥ goodFrac names the desire once, patience 0).
Coda: Judgment.flourish → banner/caption "✨ AND THE FLOURISH ✨";
the top-rung triumph with the coda = RunWire.ultra → ULTRA MASTER
BAKER OF THE REALMS (skeleton, like won). The cherry needed ZERO
plumbing — dormant since the pantry pass. NO new wire msgs: desire +
finishTicksLeft ride OrderState everywhere (a mid-window welcome
just works). DEV seam: __game.room (loopback only) for
jumpToRung-style live state building. ZERO DRIFT: the WIN script
untouched but for three additive asserts (its 0.566 win sits under
goodFrac — no reveal, no window, beat for beat). Standing ledger:
plans/15 items 1/3/4 unclaimed pre-friend-test; cupcake hot-arrival
note reads on the flourish (its 8 summit windows all arrive hot —
crowns may bounce; feel-pass watch); audit tranche C
post-friend-test; wind plan and Bite/integrity re-pin ownerless.
NEXT: the visionary's ladder feel run (slices 4+4b in preview — rung
pacing AND the window's 15s), then slice 5 (purse/pay/shop stall, +
the flourish purse bonus); the friend test (plans/12) inherits
everything. Port map: research/01-port-gap-analysis.md.
