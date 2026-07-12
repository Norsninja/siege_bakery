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
THE FIFTEENTH SESSION (2026-07-11 pm): THREE FLEETS POPULATE THE
REGION — three commits ending 127ed14, all pushed, 415 tests,
region.glb 2.12 MB. THE FLEET LOOP proven and scaled (research/18
REGION STRUCTURE RULES + THE SCRIPT CONTRACT): sixteen structures by
dispatched Sonnet agents (mills, orchards, pines, wheat fields with
the ruled gold rows #C98A2B/#D8B878, milestones, watchtower,
bakehouse, well, the giant rest stop — bench/table-with-bun/lantern),
fifteen-for-fifteen on first live run, zero rework; scripts = tracked
provenance in project/blender/region-scripts/. THE WINDING AUDIT: a
fleet agent cross-reading precedents caught the shipped watchtower
door's LEFT-HANDED tapered_box (all faces inverted; EEVEE double-
sided preview hid it, three.js would cull) — LAW: Blender renders are
not a winding oracle, audit normals programmatically (BVH ray-parity;
recalc-diff over-flags authored undersides). Visionary played the
populated world: "it's looking fantastic." Dessert design landed:
the playable cake is DATA (DessertSpec tiers) → FLAVORS material
table + procedural drip rim, flavor derived deterministically from
broadcast state (fixed-per-rung recommended, RULING PENDING); meshy
= ambiance props only (research/19 image-run specs: matte prompt,
no text, budget ~4-6 props before the audio diet). NEW PATRONS
ARRIVED untracked in project/blender/: FrostGiant.blend /
Dragon.blend / TreeFolk.blend (raw meshy, 26-30 MB) + turnaround
folders — next session: review, then meshy road + diet + rigs (ogre
recipe: ~10 bones no legs, dot-free names, offsets-from-rest; DRAGON
HARDEST — design-discuss the rig before boning), then slice 3 THE
LINE on the giants' road (built for it). Prior s14 canon holds below.
THE FOURTEENTH SESSION (2026-07-11): THE FRIEND TEST PASSES + THE
REGION RISES — four commits ending 81fb845, all pushed, 415 tests,
both tsc legs, dist 21 MB. THE SUCCESS LINE PASSED: visionary hosted
via cloudflared quick tunnel (research/17 runbook — recipe, MIME-
restart law, throughput ~4-5 MB/s), a real friend played by URL:
"it's fun" + "can't wait to see it styled". THE HIDDEN-PANE TRAP
documented (no rAF when pane hidden — HUD freezes at "joining the
bakery…" on a HEALTHY join; oracles: server log, getMyId, raw ws
probe, rAF counter; PROD has no __game). WALLS DRESSED: meshy wall
25 MB → wall.glb 0.34 (decimate 0.03, black emissive dropped — the
EMISSIVE TRAP: removing the texture node leaves Emission Color white,
zero color AND strength or the model GLOWS; JPEG forced — AUTO
re-encodes resized images as PNG); wallSegments() pure tiler, 86
segments on collider lines, grey slabs hide-not-dispose. THE SHIPPING
DIET (art bible s10): `npm run diet -- <name>` (scripts/model-diet
.mjs) — black emissive dropped, base/normal 1024, ORM 512, JPEG q90,
HARD-FAILS on node/bone name change; ogre 9.6→2.46 MB, dwarf 4.4→
1.15, rigs live-smoked after. OGRE RE-RULED 36 m (OGRE_SCALE in
main.ts, GLB ships 21; cake was 40% of his height — a feast, not HIS
dessert; provisional against the region read). THE REGION (plans/16
slice 4.75 NEW, hybrid authorship — sessions rough out, visionary
flairs): region.blend hand-authored TRACKED (ref_ scaffold + check_
cam at post eye, never exported); region.glb 1.8 MB + sky.glb 127 KB,
all vertex color, no textures — meadow skirt (arena flat), GIANTS'
ROAD to +x horizon (slice 3's queue stands on it), three hamlets,
two peak rings (gaps: road exit, cake axis), HERO MOUNTAIN + DWARF
CASTLE carved in its flank owning the cake axis, sky dome + 7 clouds.
THE ATMOSPHERE RULE (pinned): name prefix is the contract — near_/
mid_ lit + fogged; far_/sky_ unlit + fog-exempt (haze BAKED in vertex
color). Camera far 200→500, fog 60-120→80-280 (far fort reads clearer
— eye pass item); region constants move together. Blender: sky needs
visible_shadow=False or EEVEE renders black; blender(bx,by,bz) →
game(bx,bz,−by). Friend-test debrief rulings: splat = juice first
(SFX/FX), balance only if still hungry — power-ups stay the growth
lever; SFX = hybrid table (synth for mechanical metronomes, samples
for character sounds); E-key onboarding for non-gamers = prompt AT
the object (unledgered); audio now fattest block (11.3 MB). Standing
prior canon holds (s13 and earlier): choreography polls, GLTFLoader
sanitizes dots, meshy boundary s10 / hand road s11, machines nose=+Y,
drive nodes + dress() abort-to-greybox, gimbal basket, verify
POSITIONS never renders, shared-clone law, plans/17 LORE, plans/18
FORGE, semantic audit, s6 rulings, jukebox laws, no preview arc,
comic word laws. NEXT SESSION (visionary's words): continue the
region — create RULES FOR STRUCTURES, then populate it (possibly
dispatching agents with the rules in hand, or programmatic objects;
"fun collaborating with many AI to build a fantasy realm"); he is
generating GIANT PATRONS externally and bringing them back (meshy
road + diet, slice 3 casting — distinct species). Pending: region
flair pass (hero contrast, skirt seam, clouds), committed capture
(pane worked!), meshy license, audio diet, ear/eye passes (8).
Standing ledger: items 6/8 post-campaign; 7/9 boundaries; 11
post-milestone; audit tranche C post-friend-test; wind + Bite re-pin
ownerless. Port map: research/01-port-gap-analysis.md.
