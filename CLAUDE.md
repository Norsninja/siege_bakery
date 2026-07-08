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
VERNIER + GUN CREW LANDED (2026-07-08): the elevation vernier is
2.5°×18 notches at 0.15s/notch (research/13, the standing re-pin tool;
one notch = 0.4–1.3m of landing depth, 3–7 notches walk one click gap)
— and its envelope consequence re-pinned TOWN_POTENTIAL to
[0, 0.9, 1.0, 1.0, 1.0]: fine tilt BRIDGES THE MOAT (research/11
RE-RUN — two-town union 100% at ≤8 clicks, contested overlap 63% at
≤9, click 10 buys real one-town reach), so the towns rationale is
throughput + contested ground now, not reach ceiling; asks unchanged
(Option B, TOWN_ASK_POTENTIAL authored). Interaction is THE GUN CREW
(plans/14, two feel-test rounds passed): crew posts replaced crosshair
grips — gunner post left rear (E man, A/D wheel, W/S screw, F fire,
translucent green ground circles from the one POST_SPOTS table), winch
post right flank (Space/W wind, S UNWIND — crank is SIGNED on the wire,
merge stalls opposites), bucket/pantry walk-up untouched. Laws: ONE
BODY ONE JOB (floor space enforces co-op, never input awkwardness);
the reticle never aims, camera position free; W/S = more/less at every
post; no Ctrl (browser), no chords. input.ts keeps the superseded grip
law for rollback. 263 tests green, both tsc legs. DECIDED: the 80%
coverage curve stays as measured (48/39 idealized shots one/two-town —
the 4-player heroic number); plans/13's per-rung asks author against
the NEW curves. Standing ledger: audit tranche C post-friend-test;
wind plan and Bite/integrity re-pin still ownerless. NEXT: review the
session's work, then plans/13 THE CAMPAIGN (full plan, discussed first
— DessertSpec rungs, spec-derived census, per-rung asks, shop/purse
economy), then the two-PC friend test (plans/12, now including the gun
crew). Port map: research/01-port-gap-analysis.md.
