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
THE LADDER LIVE (2026-07-08, fifth session): plans/13 slice 4 is
BUILT (313 tests, both tsc legs, live-verified — HEAD ab966c9 +
docs). Every rung deals its OWN spec/asks/clock/par — specForRung
reads the RUNGS table, one function on both replicas; the lobby's
dormant cake is a humble single-tier cake-1 now. THE FLOURISH
AMENDMENT (plans/13 §1, the session's ruling — AMENDS the impossible
tragedy): the crown is an optional FLOURISH ("fatality" — style on a
decided outcome), never a requirement; it lives IN the order (never
the linger), fires at COVERAGE_GOOD, and is per-patron desire data.
Rung 7 is winnable by WORKLOAD = MASTER BAKER (👑 banner skeleton
shipped; fanfare/credits = content pass, no audio pipeline yet); the
flourish on cake-6's dead summit = ULTRA MASTER BAKER, sold by the
future economy. SLICE 4 SHIPPED CROWN-SHELVED: patron rule 3 DELETED
(a required greatness-trigger punishes good play), NO cherry in the
live game until slice 4b builds the desire. THE DEAL LAW: OrderFlow
never self-deals — orderConcluded runs FIRST, then the Room deals
dealFresh(rungRow) + redealDessert (a flow self-deal would price the
OLD rung's asks over the NEW rung's cake). PAR PER RUNG: authored
{solo,duo} column (campaign.ts header formula; the anchor forces
solo rung 3 = 24); tuning's FROST_FRAC/SPRINKLES_NEEDED/
ORDER_SECONDS/ORDER_PAR_SHOTS are ANCHOR REFERENCES — edit the
ladder, not tuning. The tripod places itself per spec (tall-spec
ledger item PAID); predictClock is phase-gated (the lobby view no
longer free-runs a clock nothing corrects). ZERO DRIFT: the WIN
script re-anchored to rung 3 (the anchor IS today's standing order)
plays beat for beat; its win deals THE CUPCAKE, pinned on the wire.
Standing ledger: plans/15 items 1/3/4 unclaimed pre-friend-test;
cupcake hot-arrival note now reads on the FLOURISH; audit tranche C
post-friend-test; wind plan and Bite/integrity re-pin ownerless.
NEXT: review slice 4, DISCUSS slice 4b (the flourish — desire shape,
trigger-at-look vs at-landing, verdict coda, Ultra; agenda in the
handoff §6), build it, then slice 5 (purse/shop); the friend test
(plans/12) inherits everything. Port map:
research/01-port-gap-analysis.md.
