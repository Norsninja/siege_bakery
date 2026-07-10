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
THE ELEVENTH SESSION (2026-07-10): lore + forge recorded, the
semantic audit landed, the pipeline PROVEN, the giant ruled — seven
commits ending e166c74, 397 tests, both tsc legs. NEW CANON:
plans/17 THE LORE (giants are refugees of the fantasy wars; THE
REALM PAYS — giants are guests; patrons still picky; not a metaphor,
not bittersweet); plans/18 THE ORDER FORGE (post-milestone shape:
patrons-with-taste x constructable desserts x authored envelope; the
MEASURED-ATOMS LAW — the generator only asks what the census can
count and only of measured desserts; DISCUSS before build). THE
SEMANTIC AUDIT (item 12 DONE): the screen speaks bakery — PATRON N
never RUNG N (the line-of-giants fiction stands), the run is the
bakery's day (opens / CLOSING TIME / bake again), patrons fed never
rungs cleared, "the realm pays +N coins"; code identifiers keep
rung/run; artillery vocabulary exempt. PLANS/16 s6 RULED: distinct
SPECIES in the line (re-tint overruled; ogre first); grumble-audio
yes, VO never; first-person hands yes (slice 4 rider); name OPEN
(only slice 8 blocks); HUD neon NOT canon (future warm re-skin
sanctioned); THE GIANT 20+ M (graybox camera lineup; placement
OUTSIDE the town walls leaning toward the table, the queue of
patrons receding behind him — loom lives in lean and bulk as much
as height). SLICE 1 BUILT: the SPRINKLES crate went Blender (MCP,
localhost:9876) -> GLB -> loadModel seam -> beside town 0's pantry;
CONVENTIONS OF RECORD in art bible s8 (1 BU = 1 m; front = -Y
Blender = +Z three; origin at standing point; join-with-slots;
text->mesh; project/blender/ source + public/models/ shipping;
size=1 cube scale IS dims). THE LOADER SEAM (assets.ts): null is
normal — headless/missing/broken all fall to primitive fallbacks;
one fetch per name; core/game never import it. Standing prior laws
hold: fadeStep volume law, POST_KEYS one table, drop-in jukebox
(linger/runover rows still await compositions), BG_VOLUME 0.35, M
mute + blurred #mute-btn, no preview arc ever, trail-is-the-flight,
winch drain, report-view DOM split, comic word laws. NEXT SESSION
(visionary's words): review the eleventh's commits, DISCUSS the
next slice BEFORE any design or code edits, then model THE OGRE
(slice 2: 20+ m, concept-art canon, one skinned mesh, three verdict
poses + look-lean + breathing idle; silhouette judged in-game
first). Friend test is a casual weekend visit (gift, not deadline);
work resumes Sunday. Pending ear/eye passes (8): music volume/fades,
winch coverage + drain, fudge chip, banner composition, lone-hero
tag, comic-word size/timing, trail-halt feel, audit strings at
speed. Standing ledger: items 6/8 post-campaign; 7/9 boundaries;
11 post-milestone; audit tranche C post-friend-test; wind +
Bite/integrity re-pin ownerless. Port map:
research/01-port-gap-analysis.md.
