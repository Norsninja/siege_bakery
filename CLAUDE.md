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
THE TENTH SESSION (2026-07-10): tech debt paid + THE COMIC WORD —
394 tests, both tsc legs, ending 55f25a4. THE REMOTE EXISTS:
https://github.com/Norsninja/siege_bakery (origin/main; push after
every commit batch). Standing ninth-session laws: THE VOLUME LAW —
all volume math flows through music.fadeStep (pure, pinned;
el.volume THROWS outside [0,1], the first rAF dt can be NEGATIVE,
and a first-frame throw kills the rAF chain — never assign el.volume
raw); POST_KEYS is THE ONE KEY TABLE (postOp reads it, panels render
it, hud.test pins them EQUAL); jukebox songs are DROP-INS
(public/audio is the COPY OF RECORD + one PLAYLISTS row;
linger/runover rows await the visionary's compositions); BG_VOLUME
0.35; M mute + #mute-btn (the ONE pointer-events overlay, BLURRED
after click — Space winds the winch); item 9 boundary: NO pre-shot
preview arc, ever. TENTH-SESSION LAWS: (1) THE TRAIL IS THE FLIGHT —
ribbons HALT at first contact (core Impact.bodyHandle, a plain
number so the event stays broadcastable; no speed thresholds; the
streak is the flight, never the roll); (2) the winch unwind DRAINS
the top lit segment right-to-left (the sign of fillPct picks
.seg-fill vs .seg-drain — letting out must never wear winding's
costume); (3) report-view.ts owns the banner/photo/linger DOM
(hud.ts words it pure, bannerLatch decides edges; the carry-home
teleport stays in main — baker movement is main's authority); (4)
THE COMIC WORD (plans/15 item 13): SPLAT!/plop./POP! are
world-anchored sprites at YOUR OWN town's impacts — NEVER screen
toasts (the center of the screen is where people see what is going
on); depth-test OFF so far-side landings announce over the cake's
crest; grains silent; the corner line keeps the m/s record; spatial
SFX will pair on the SAME impact events (plans/16's sound slice).
THE LONE HERO stands (plans/13 §5 BUILT block). NEXT SESSION
(visionary's stated plan): review the tenth's four commits, then
discuss next steps — the candidates: plans/16 §6 open rulings, the
semantic audit (item 12: strings speak BAKERY, never engine — the
strongest pre-test slice), or rest until the WEEKEND friend test
(plans/12, runbook current). Pending ear/eye passes: music
volume/fades, winch coverage + the new drain, fudge chip, banner
composition, lone-hero tag, comic-word size/timing at play
distances, trail-halt-at-first-bounce feel. Standing ledger: items
6/8 post-campaign; 7/9 recorded boundaries; item 11 (spotter tower)
post-milestone design; audit tranche C post-friend-test
(snapshot-encode hitch, litter growth); wind plan + Bite/integrity
re-pin ownerless; cupcake hot-arrival + fudge-counts-toward-frost
watches. Port map: research/01-port-gap-analysis.md.
