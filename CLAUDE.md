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
THE AESTHETIC PASS (2026-07-09, ninth session): four slices BUILT,
live-verified, visionary-approved ("all working as we intended") —
389 tests, both tsc legs, ending 2f3f182 (that fifth commit is the
PARALLEL session's GROUND-PLANE BOOT BUG fix: the first rAF dt can
be NEGATIVE and HTMLMediaElement.volume THROWS outside [0,1] — ALL
volume math now flows through music.fadeStep, pure + pinned; never
assign el.volume raw). (1) TRAILS (plans/15 item
4): TrailRibbon comet in shots-view.ts — fixed-tick samples,
camera-billboarded strip, RGBA vertex fade, topping-colored; grains
never trail; a ribbon releases when its arc dissolves AND its body
is gone/at rest (no idle pile-up — the rings lesson); eye-passed
"beautiful". Item 9 RECORDED: the pre-shot preview arc is a DESIGN
BOUNDARY — trivially computable (pure parabola), deliberately
unbuilt: trails are feedback, a preview is an answer key. (2) POST
HUD (item 5, promoted): winch panel DEAD CENTER and BIG (giant neon
count, live click fill), gunner cluster BOTTOM-LEFT (center owns the
aim), bucket chip unmissable in topping color; posts.POST_KEYS is
THE ONE KEY TABLE (postOp reads it, panels render it, hud.test pins
them EQUAL); LastShot firing memory client-side off shot broadcasts
(no wire change); manned lines left the corner block; TONE SET:
bright pink/cyan fantasy, Vegas energy (index.html CSS vocabulary:
keycaps, glow, pop). (3+4) THE JUKEBOX (item 10): music.ts PLAYLISTS
mood table — order [kitchen-chaos, kitchen-mayhem] + lobby
[hearth-harvest, hearthside-yeast] filled; linger/runover rows named
and waiting (visionary composing); future songs are DROP-INS (file →
public/audio + one row; public/audio is the COPY OF RECORD, ships in
dist/; project/files/audio is the gitignored inbox). nextTrack never
repeats (n=2 alternates); deriveMood off run.phase/order.status (the
finish-it window keeps the order's music); fade out 1.5s / in 0.8s;
BG_VOLUME 0.35 one dial; autoplay unlocks on first real gesture; M
mute + upper-right #mute-btn — the ONE pointer-events overlay,
painted under #snapshot, BLURRED after click (a focused button turns
Space into "click", and Space winds the winch). Clients unsynced by
design; core/game untouched — all client/ presentation. Flash toasts
DEFERRED (next aesthetics slice; the CSS vocabulary is ready). THE
LONE HERO stands as built (plans/13 §5 BUILT block, eighth session):
ask = REACH × LABOR (CREW_LABOR [—,0.35,1,1,1], measured saturation
study) at deal time via Room.dealAt; sprinkles scale (ceil);
OrderState.hands stamps the ticket; crew 2+ verbatim; anchor seam
deals full labor. NEXT SESSION (visionary's agenda): review the four
commits → TECH-DEBT hunt (post-hud.ts, music.ts, trail lifecycle,
main.ts growth) → discuss further pre-friend-test improvements —
every one de-risks the WEEKEND friend test (plans/12, runbook
current). Pending ear/eye passes: music volume/fades, winch-panel
coverage while cranking, fudge chip, item-3 banner composition,
lone-hero tag. Standing ledger: plans/15 items 6/8 post-campaign
discussion; items 7/9 are recorded boundaries; audit tranche C
post-friend-test (snapshot-encode hitch, litter growth); wind plan +
Bite/integrity re-pin ownerless; cupcake hot-arrival +
fudge-counts-toward-frost watches. Port map:
research/01-port-gap-analysis.md.
