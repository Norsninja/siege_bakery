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
re-triage.
**AUDIOVISUAL MILESTONE: `project/plans/16-the-audiovisual-milestone.md`**
— DRAFTED 2026-07-09 (MVP-audit discussion): the fantasy gets a face —
patron embodied (the plans/03 brain already exists; body only), the
line of patrons, dwarf bakers, delicious dessert, SFX, verdict
spectacle, front door. Zero systems; client/ + assets only; §6 open
rulings need the visionary BEFORE building. Concept art of record is
IN REPO: project/concept/ (courtyard shot + dwarf turnaround — Read
the images directly). Current state:
THE THIRTEENTH SESSION (2026-07-11): THE OGRE ACTS + THE MACHINE
DRESSES — six commits ending df29a7d, 410 tests, both tsc legs, dist
rebuilt (29.3 MB — plans/15 item 14 THE ASSET DIET is a due slice).
SLICE 2 THIRD ACT LIVE + PLAYTESTED: patron-body.ts hosts the
choreography state machine — look-lean on a fresh patron seq (~2.5s),
verdict snap-and-hold on order end (banner's two-gate read), relax
through the linger, breathing additive; the seam POLLS view state
(main.ts passes lastPatron.seq + verdict — async load and mid-banner
joiners recover; a nag NEVER yanks a verdict). Head-turn audited:
clean to 50°, his knife is the ceiling (~55°); HEAD_TURN_MAX_RAD 35°,
lean turn 20° tunable. LAW: GLTFLoader SANITIZES node names (dots
stripped — upper_armL); no dots in rig bones. Shiny FIXED (roughness
G lifted 1-(1-G)*0.45, pattern in art bible s10; ogre.glb 9.6 MB).
SLICE 4.5 THE MACHINE, whole arc in one session: meshy FAILED the
turnaround (THE MESHY BOUNDARY, s10 — organic/static only); the HAND
ROAD (art bible s11 NEW) built catapult.blend on the sim's exact
pivot scaffold, three visionary rounds (GIMBAL BASKET — dish
counter-rotates -(tilt+arm), level in the world, cradles the topping;
LAUNCH PARITY — seat sweeps 1.32-1.89 m around the sim's 1.2 m spawn,
ballistics.ts untouchable; swing clearance SWEPT numerically, 7.5 cm
min). catapult.glb 520 KB; MachineRig gained DRIVE NODES (greybox =
default, the fallback IS the machine) + dress() (clone per rig, abort
on any missing named node); bucket raycast proxy + topping reparent
into the dish (Raycaster ignores visibility — deliberate). MACHINES
AUTHOR NOSE = +Y BLENDER (1:1 into machine space; the character -Y
convention + pi yaw MIRRORS the wheel across the posts); articulated
nodes export at ZERO rotation. Winch post moved mid-flank (1.5, 0.15)
on the visionary's eye pass. Verify POSITIONS, never renders (renders
lied 3x: cameras, half-size cubes — scale IS the dimension on a
size=1 primitive — and the group-space parenting slip). MIME .glb/
.mp3 explicit (long-running servers need ONE restart for headers);
dwarf lazy-loads on first ghost. Standing prior canon holds: meshy
road s10, rest-offset law, shared-clone law, sim-is-truth scaling,
plans/17 LORE, plans/18 FORGE, semantic audit, s6 rulings, fadeStep,
POST_KEYS/POST_SPOTS one-table, drop-in jukebox (linger/runover rows
await compositions), no preview arc, trail-is-the-flight, comic word
laws. NEXT SESSION (visionary's words): replace remaining greybox
with models (crates, stall, pennant — the cake stays slice 5), then
THE FRIEND TEST TUNNEL from his PC (no laptop): build + room server
5175 + a websocket-carrying tunnel (cloudflared quick tunnel first
try), friend joins by URL, served page auto-joins. Pending: capture
(pane open once), meshy license, asset diet, ear/eye passes (8).
Standing ledger: items 6/8 post-campaign; 7/9 boundaries; 11
post-milestone; audit tranche C post-friend-test; wind + Bite re-pin
ownerless. Port map: research/01-port-gap-analysis.md.
