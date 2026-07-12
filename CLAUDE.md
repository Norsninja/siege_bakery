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
THE TWENTIETH SESSION (2026-07-12 late night): THE FEEDBACK PAIR +
THE CLOCK RELIEF — entries 4 AND 3.5 struck; three commits ending
6ccf2f7, pushed, 488 tests. ENTRY 4 (items 15+16, two-terminal
review then his go): THE PROMOTION (game/cast.ts — mapping moved
WHOLE, claimer's-call closed; patronAtMark = the ONE predicate);
core/patron-collider.ts (the named exception: capsule DATA + rig
RECONCILED PER TICK IN BOTH WORLDS — a collider on one side forks
the trajectory; poll never edges); Impact.otherHandle +
Settled.grain + GROUP_PATRON in core; ogre capsules authored as
col_* markers in ogre-rig.blend, exported at RULED height by
collider-scripts/export-patron-colliders.py (--scale = visualScale;
six species = FLEET LANE); BONK!/patronBonk/shake-off flinch/
SCOLD_LINES (the FIRST PATRON VOICE — prize session extends)/paint
dabs. RINGS RECOLOR RULED (his yes): color = VERDICT channel (paint
at impact via painted-count oracle — isOnCake lies on wall splats;
solids neutral→color AT REST, ring repositions), energy keeps
word+size. INTERIM lobby collider (rung 1 ogre bounces warmup; item
25 cross-note names the deletion). ENTRY 3.5 (item 26): CREW_CLOCK
[0,1.25,1,1,1] at the deal (rows VERBATIM, anchor law intact, duo
ZERO drift), rung 1 row 150→180; research/20 = the derivation
(calibrated on his measured miss-by-~5s); THE ONE DIAL =
CREW_CLOCK[1]. Live-verified: lobby ogre stands, bonk chain, all
four verdict paths, solo rung 1 deals 3:45. IN TREE UNCOMMITTED:
his live Blender work (giants-far.blend + cottage/bakery
region-scripts) — ask, never commit blind. NEXT SESSION (his
words): ENTRY 5 — THE TRAINING LOBBY + THE OPENING PARADE (item 25)
— review, then DISCUSS before building; entry 5 RAZES the interim
lobby branch; practice cake + resting ogre + six collider markers
are fleet-dispatchable. Handoff:
2026-07-12-twentieth-the-feedback-pair-and-the-clock.md. Prior s19
canon holds below.
THE NINETEENTH SESSION (2026-07-12 night): SOUND + THE WEIGHT — path
entries 2 AND 3 struck; eight commits ending 0cb6840, tree CLEAN
(visionary amendments + turnarounds committed on his word), 459
tests. SOUND (slice 6, design walked same session): sfx.ts (ONE
AudioContext, buffers, source→gain→master; KEYS SPEAK GAME LANGUAGE
— chompDevour/verdictRefused, pushback adopted; rows are LISTS =
audition law), audio-bus.ts (VOLUME BUS plans/20 §5 — M mutes THE
BUS, both engines poll), make-sfx.mjs (reproducible synth — script
is the recipe), ClientFx PORT not singleton (word+sound = one
announcement, pinned). Wired: ratchet/click, THUNK (+dry), whoosh,
splat/plop/pop at word sites, chomp stings; verdict stings + grumble
wired-SILENT (drop-in on his files). Step booms STILL deferred (item
23). THE WEIGHT: DRACO ADOPTED (models 24→8.5 MB, names/skins
byte-identical, decoder self-hosted public/draco/, diet ends with
draco() pass, six rigs live-verified bone-true); KTX2 DEFERRED (why
in item 14); 192 kbps STAYS (96k fizz); LOUDNESS RULING: BG_VOLUME =
0.4 CEILING × bus rest 0.5 ≈ 20% effective, pinned. RELEASE GATE
(scripts/release.mjs, plans/20 §8 organs 1-5): npm run release —
fresh dist 23.61 MB UNDER the 25 alarm. Smoke fix in memory: CRANK
IS NUMERIC ({crank:1}; crank:true validates to 0, tension never
accrues). NEXT SESSION (his words): ENTRY 4 THE FEEDBACK PAIR (items
15+16 — landing verdict + giant collider, the first game/-ward
promotion pressure, a NAMED core exception) — review, then DISCUSS
before building; read items 15/16 in full first. Handoff:
2026-07-12-nineteenth-the-sound-and-the-weight.md. Prior s18 canon
holds below.
THE EIGHTEENTH SESSION (2026-07-12 eve): THE EAT BEAT BUILT + THE
WRAP — six commits ending 930b1ce, 448 tests. THE EAT BEAT
(slice 7): eat-beat.ts (EAT_START = VERDICT_HOLD+10 derived, CHOMP
at +80, DEPART_AT_FRAMES 460 shared with line), comic-word.ts
extracted (one onomatopoeia grammar), PatronBody.mouthWorld() (bone
truth), three verdicts live-smoked (CHOMP!/chomp./uneaten); sting
seam awaits slice 6. THE WRAP (plans/15 items 20+21): walk.ts = ONE
home for stride dials (Froude cadence — step ~1.75 s, depart
~10 m/s, arrive ~4.8 s, advance 330f); photo → TOP-LEFT, corner
checklist COLLAPSES at verdict edge (one slim line + purse),
#hud.linger steps the card aside (+48px carve law mirrored);
POLAROID BEAT built (slams center, banner WAITS ~1.8 s, 0.5 s tween
files it — pin: files before the eat). HIDDEN-PANE ADDITION: CSS
transitions freeze without a compositor — prove end-states with
transition:none. plans/21 THE PATH opened (three lanes; entry 1
struck); plans/20 drafted (alpha serving, NOT next). Visionary
amended plans/15 (item 25) + plans/21 post-commit — UNCOMMITTED,
his call. NEXT SESSION (his words): review work + plans, then
DISCUSS SOUND (slice 6, path entry 2) before building — volume bus
born there (plans/20 §5), step booms explicitly deferred (item 22's
events, never the fake bob). Handoff:
2026-07-12-eighteenth-the-eat-beat-and-the-wrap.md. Prior s17 canon
holds below.
THE SEVENTEENTH SESSION (2026-07-12 pm): THE CAST COMPLETES, THE
EAT BEAT IS RULED — seven commits ending 036446e (history rewritten
once, approved: a 96.87 MB orphan-texture blob erased), 436 tests.
Line tunes: THE OPENING PIN (rung 1 = ogre always; seeds re-scan on
every roster change — CAST_SEED 0xbab39e deals ALL SEVEN species in
rungs 1–7); LINE_SLOT0_X 50; BREATH DESYNC (PatronBody individuality
seed = queue index; the advance identity extends to lungs). THREE
patrons walked the road in one session — cyclops 33 m (spotter),
cloudgiant 38 m (the queen), firegiant 31 m (lava veins; THE
EMISSIVE VERDICT: diet judges blackness by channel MAX <16 not mean,
kept emissives ship 1024 JPEG — first live emissiveMap). Far crowd
7/7 (giants_far.glb 495 KB; recipe: VOXEL REMESH then decimate —
straight decimate floors on meshy gear shells; validate before
export; ORPHAN PURGE before saving curated blends). THE EAT BEAT
RULED (plans/16 slice 7): photo-then-eat; stand-in cake proxy arcs
to mouth (real dessert never moves); DELIGHTED devours / REFUSED
eats begrudgingly / HUNGRY walks away mournful, cake uneaten;
DEPART_AT_FRAMES stretches ~450–480; lift mechanism = later dress
pass. NEXT SESSION: BUILD THE EAT BEAT (rulings complete, no design
needed). Looming: eye pass (7-species line), audio diet + Draco/
KTX2 ruling (fresh dist ≈ 38 MB vs 25 alarm; dist/ stale at 21),
species-themed orders (the prize). Handoff:
2026-07-12-seventeenth-the-cast-completes.md. Prior s16 canon below.
THE SIXTEENTH SESSION (2026-07-12): THREE GIANTS WALK, THE LINE
STANDS — four commits ending 944b8d6, all pushed, 434 tests.
FrostGiant 30 m / TreeFolk 40 m / Dragon 30 m seated walked the
meshy road (no decimation needed — meshy shipped 32-38k tris; diet
fix: emissive blackness check reads RGB only, opaque alpha defeated
it) and got rigs (bipeds = ogre recipe; dragon = neck1/neck2 arc +
wingL/R, no tail; ALL BONE NAMES DOT-FREE). SLICE 3 BUILT on THE
UNIFIED FICTION (plans/19, blessed): the line IS the order queue —
rung→species via seeded shuffle (never two alike; MULBERRY
FIRST-DRAW LAW: Knuth-hash + burn one draw), table patron derived,
line NEVER shortens, advance rides the departure beat, walk-off
down lane 2, head takes the table; tiers actors/standees/instanced
far_giant_* impostors (giants_far.glb 297 KB). THE SKINNED-CLONE
LAW (found live — "the line is in the town"): Object3D.clone() does
NOT rebind skeletons, every skinned clone rendered at ORIGIN while
group transforms lied; SkeletonUtils.clone() everywhere, pinned in
line.test.ts; VERIFY RENDERED POSITIONS (bone getWorldPosition,
offscreen renders — hidden-pane recipe in memory). Visionary saw
the fixed line: "great work." PENDING HIS TWO NOTES (discuss then
tune): rung 1 should be the OGRE (the shuffle cast the dragon
first); the table→slot-0 gap (LINE_SLOT0_X=66) shortens a bit.
Dist ~34 MB vs 25 alarm — audio diet on the critical path. Mapping
home: client/ now, promotes to game/ with species-themed orders +
voice (the real prize, own design session). NEXT SESSION (his
words): review, discuss state and next steps BEFORE executing.
Handoff: 2026-07-12-sixteenth-giants-walk-the-line-stands.md.
Prior s15 canon holds below.
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
