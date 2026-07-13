# Plan 16 — THE AUDIOVISUAL MILESTONE: the fantasy gets a face

**Status: DRAFTED 2026-07-09 from the MVP-audit discussion session
(visionary's rulings in §1). DISCUSS → BLESS → BUILD per the standing
sequence — the building session should walk §6's open rulings with the
visionary BEFORE slice 1. This plan deliberately adds ZERO systems:
every slice is client/ presentation, assets, or DOM. core/ and game/
are untouched throughout; if a slice seems to need a wire or game/
change, stop and re-read §4.**

## 0. The one question this milestone answers

**"Does thirty seconds of capture sell the fantasy?"** The MVP-audit
finding (2026-07-09): the systems are well ahead of the presentation —
authoritative multiplayer, a measured seven-rung ladder, an economy,
389 tests, and ALL of it investor-invisible. A funding demo is judged
on a clip. Today the clip shows untextured cylinders and a gray
dessert. The milestone's exit test: a stranger watching a 30-second
capture can say WHAT this game is (co-op catapult baking) and WHO it's
for (a giant patron looming over the table) without being told.

## 1. Decisions of record (visionary, 2026-07-09)

- **Concept art is the art bible.** AI-generated concept pieces,
  visionary-approved elements: THE GIANT, THE DWARF, THE COLORS.
  Saved in the repo at `project/concept/` — build sessions can Read
  image files directly; do not work from memory of them.
- **A LINE of patrons, the ordering patron LOOMING over the whole
  scene.** The queue is the run's diegetic progress bar: rung N's
  patron at the table, the rest waiting. The looming giant is the
  frame of every screenshot.
- **Presentation-first embodiment.** The Patron's BRAIN already
  exists and was playtest-verdicted SUCCESS (plans/03: look cadence,
  grumbles, amendments, two-gate verdicts, patience-is-the-clock).
  This milestone gives it a body; no behavior changes.
- **No new mechanics during the milestone.** Power-ups (15 §6), run
  points (15 §8), wind — all stay parked. Roadmap slides, not build.
- **Tone continuity:** bright pink/cyan fantasy, Vegas energy
  (ninth session's tone rulings), nobody dies — the REFUSED verdict
  is insulted, never violent; HUNGRY is sad rumbling.

## 2. Foundations this plan is authored against (do not re-derive)

- **The Patron layer is live** (plans/03, all four steps BUILT +
  verdicted): game/patron.ts createGiant() rules; Room lets him look
  every ~12s (PATRON_LOOK_EVERY); protocol `patron {text, seq}`
  followed by the amended order; verdicts DELIGHTED (1–3 stars) /
  REFUSED / HUNGRY ride the ending order message. The client already
  receives EVERYTHING a body needs to react to.
- **The run/ladder is live** (plans/13): run.phase, rung number, the
  18s linger separator (Giant takes dessert → report → shop → next
  dessert). The linger is the natural stage for patron arrival /
  departure choreography. The client knows the rung — the queue
  length is derivable client-side.
- **Asset pipeline declared but UNEXERCISED:** Blender → glTF →
  GLTFLoader (CLAUDE.md stack). Nothing has ever ridden it. Slice 1
  exists to find out what it actually costs.
- **Tone/CSS vocabulary** lives in index.html (keycaps, glow, pop);
  music.ts PLAYLISTS is the drop-in table precedent the SFX slice
  copies; TOPPING_COLORS in scene.ts is the color table of record.
- **Deferred-and-ready:** flash toasts (ninth session) — the verdict
  spectacle slice picks them up.

## 3. The slices (order within 2–5 is the visionary's call; the
recommended order below front-loads the biggest unknown after the
cheapest proof)

### Slice 0 — The art bible (no code)

**Status: MOSTLY DONE 2026-07-09 — the images of record are IN THE
REPO at `project/concept/` (SiegeBakeryConcept.png, the courtyard
beauty shot; dwarf_four_angles.png, a four-angle turnaround sheet —
note its known AI artifact: profile-view hands are merged; model
mitts, per art bible §9). `research/16-art-bible.md` is authored from
direct reads of both (canonical elements, palette, proportions, style
words, settled vs open). REMAINING for the build session: re-sample
palette hexes from the files, walk the §4 proportion chart with the
visionary.**

Concept art of record lives in `project/concept/` (git-tracked —
it is REFERENCE, small and curated; the gitignored files/ inbox is
for raw bulk). Author `research/16-art-bible.md`: extracted palette
(hex, mapped against the existing pink/cyan CSS vocabulary and
TOPPING_COLORS), proportion chart (giant : dwarf : catapult : cake —
pick numbers, in meters, before any modeling), style words (chunky,
toy-like, hand-painted?), and what the concept art does NOT settle
(so slice discussions know their open ground).

### Slice 1 — Pipeline proof (one small asset, end to end)

**Status: BUILT 2026-07-10 (eleventh session). The SPRINKLES crate
went Blender (driven via MCP) → glTF → GLTFLoader → standing beside
town 0's pantry, live-verified with a committed capture
(project/concept/captures/2026-07-10-slice1-crate.jpg). The
CONVENTIONS OF RECORD are pinned in the art bible §8 (units, front =
−Y Blender / +Z three, origin at standing point, join-with-slots,
text-to-mesh, export settings, homes: project/blender/ source +
public/models/ shipping copy). The loader seam landed first
(assets.ts, 282ae77): loadModel() → null when headless/missing/
broken, primitive fallbacks forever, one fetch per name — pinned in
assets.test.ts. Budget: crate.glb 175 KB, ~3.2k tris (label glyphs
dominate — fine for heroes, budget repeats), no boot impact. 397
tests, both tsc legs.**

ONE asset — recommend the pantry crate or a single topping, NOT the
giant — through Blender → glTF export → GLTFLoader → standing in the
scene. This slice's deliverable is CONVENTIONS, pinned in the art
bible: units (1 Blender unit = 1 m), axis/forward convention, export
settings, file naming, where glTFs live (public/models/ — the
copy-of-record pattern from public/audio/), and the LOADER SEAM: an
async client-only asset module with PRIMITIVE FALLBACKS — the game
must boot and play with zero assets loaded (dev, tests, and a slow
tunnel all depend on this). Budget check: dist/ size and load time
through a tunnel, recorded.

### Slice 2 — THE PATRON EMBODIED (the milestone's heart)

**Status: FIRST ACT BUILT + BLESSED 2026-07-10 (twelfth session) — and
a PIVOT rode in. The morning act walked the planned road: a chunky
blockout (Blender MCP, separate quad parts, hunch in the torso) stood
at the ruled spot and taught the placement (x=21 on the cake row,
outside the walls, facing the table — the post view composes: cake
left, machine foreground, ogre looming behind). Then THE MESHY PIVOT
(the playtest friend's tip): meshy.ai generated the concept ogre as a
textured model — grin, bib, cupcake emblem, fork + knife, chunky-toy
style, startlingly on-canon — and the visionary blessed it in-game as
"a pro asset." Shipping: decimate 578k→57.8k tris, scale 1.9→21.0 m,
export through the seam; ogre.glb 7.75 MB (textures dominate).
Conventions in art bible §10. REMAINING in slice 2: the committed
capture (pending an open pane); the SHINY fix (visionary's own note —
DONE 2026-07-11, roughness channel lifted, art bible §10 records the
pattern; eye pass pending); the rig — three verdict poses +
look-lean + breathing idle — and the choreography wiring below, which
the meshy pivot does NOT change: the brain's broadcasts are the same.
Ruling-1 consequence: distinct species went from expensive to a
weekend — the line (slice 3) is suddenly cheap to cast.**

**SECOND ACT BUILT 2026-07-11 — THE RIG AND THE BREATH. The blessed
(non-T-pose) ogre rigged anyway: a stationary reactor needs spine/head
theatre, not locomotion, and the bind pose only closes doors we never
open (big arm sweeps). 10 bones (root/spine/chest/head + arm chains,
NO leg bones — his feet never move), auto weights on the decimated
58k, all four moves auditioned clean in Blender renders (ogre-rig.blend
holds the rig live): look-lean (spine x+14°, head x+8° z+25°),
DELIGHTED (chest x−10°, head x−18°, arms x−40° z∓15°), REFUSED (spine
z+28°, chest x−6° z+10°, head x−14° z+18°), HUNGRY (spine x+16°, chest
x+10°, head x+24°, arms x+18°) — the pose recipes of record for the
choreography act. Face never changes (grin is texture-baked): verdicts
are BODY theatre. GLB re-exported with the skin LIVE (8.4 MB);
client/patron-body.ts drives bones — breathing idle shipped (chest
heave + lagged head nod, frame-driven), verified live at ±0.015 rad
about rest. LAW LEARNED IN BLOOD: glTF bones carry REST rotations in
their node transforms — every drive is an OFFSET from captured rest,
never an overwrite (the first breath bent him at the waist).
REMAINING: choreography (look-lean on `patron` messages, verdict poses
on order end, arrival during linger) — PatronBody is built to host it.**

**THIRD ACT BUILT 2026-07-11 (thirteenth session) — THE CHOREOGRAPHY.
Pure code, zero Blender edits, scope guard held (no new messages, no
game/ changes). patron-body.ts hosts the state machine: look-lean when
a fresh `patron` line lands (~2.5s hold, eased), verdict snap-and-hold
when the order ends (~4s at a fast lerp that reads as a snap), then
RELAX THROUGH THE LINGER — the banner stays, the body eases home; the
breathing idle rides ADDITIVELY under every pose. The seam is POLLING,
not NetFx events: main.ts passes view.lastPatron?.seq + view.verdict
each frame, so the async-loaded ogre and mid-banner joiners recover
state that events would have missed; a stale seq is adopted silently on
first update (no replayed nag), and a patron line during a verdict is
adopted, never acted on (visionary ruling: nothing yanks him out of
DELIGHTED). Verdict classification is the banner's exact two-gate read.
THE HEAD TURN (visionary's question, auditioned in Blender renders same
session): the ogre has no neck — deformation stays clean through 50° of
head-Y twist; the true ceiling is his own raised knife at the chin past
~55°. HEAD_TURN_MAX_RAD = 35° pinned in code; the look-lean gained a
20° turn ingredient (LOOK_TURN_RAD, one-constant tunable — sign +Y =
his right/knife side; flip on the eye pass if it reads wrong). LAW
FOUND LIVE: GLTFLoader SANITIZES node names for PropertyBinding —
Blender's `upper_arm.L` arrives as `upper_armL`; dotted names silently
drove nothing. Pinned: patron-body.test.ts (9 — real bone hierarchy,
scene.test.ts culture; rest-offset law on all three axes). Live-smoked
against the real skeleton: every pose hits recipe offsets, mirrored
arms, relax to zero, chest still breathing. 406 tests. REMAINING in
slice 2: eye pass (turn sign/size, hold timings), committed capture,
arrival-during-linger beat (needs the line, slice 3 territory).**

The giant from the concept art, at the table, LOOMING — scaled per
the art bible chart, framed so he reads in every gameplay screenshot.
Choreography keyed ENTIRELY off existing client knowledge:
- **Arrival** during the linger (the separator beat already narrates
  "the next dessert wheels out" — the patron steps up with it).
- **The look**: on each `patron {text, seq}` message the body acts —
  lean in, head turn — so his existing nagging finally has a face.
  Text stays (the flash line is load-bearing comedy).
- **Verdicts**: DELIGHTED / REFUSED / HUNGRY each get ONE pose or
  short clip. Three reactions, not a rig showcase.
- **Idle**: a breathing loop. Nothing else. Resist the animation
  rabbit hole — the brain already provides the personality.
Scope guard: no new messages, no game/ changes. If a desired beat
lacks a client-visible trigger, it waits.

### Slice 3 — THE LINE (the queue as progress bar)

Waiting patrons behind the orderer — the remaining rungs made
visible. Client derives count from run state (current rung vs the
authored ladder). During the linger the line advances one.
(§6 ruling 1, 2026-07-10: the line is DISTINCT SPECIES, not one
re-tinted rig — it may debut thin, ogre-only or few-species, and
grow as the library does; instanced or shared-skeleton if perf
asks.) The run-over screenshot
gains its second comedy layer: the mess on the floor AND the line
still waiting.

### Slice 4 — BAKERS EMBODIED

**Status: FIRST ACT BUILT 2026-07-10 (twelfth session, riding the
meshy road the ogre proved same-day): the dwarf generated from the
turnaround sheet in T-POSE (the pose that makes rigging possible),
audited per art bible §10, decimated 692k→24k tris, textures halved
to 1024², scaled to 1.2 m, GROUNDED (the import floated 0.3 m).
Rigged with a minimal 13-bone armature + auto weights
(project/blender/dwarf-rig.blend, the hand-authored source of
record), posed from T into a CARRY stance (hands forward at belly
height, palms up — ready to receive a topping), baked static, and
shipped as dwarf.glb (4.2 MB). GHOSTS DRESSED: ghosts.ts swaps the
remote-player capsule for a dwarf clone through the seam — capsule
fallback forever (headless/missing keeps it); clones share the
template's geometry/materials so removal never disposes them; naive
walk = bob + rock, frame-driven, dressed bodies only. Verified
structurally in the hidden tab (feet drop −0.85, yaw π, lerp, rock);
the LIVE eye pass needs two clients (ws server + second tab) — the
visionary's run. REMAINING: first-person hands (the §6.3 rider);
carried-topping-in-hands for OTHERS needs wire archaeology (PlayerPose
carries no held item — find what broadcasts pickups before designing);
per-player identity (all dwarves are twins today — tint/prop swap
question, ruling territory).**

A four-angle TURNAROUND SHEET exists (`project/concept/
dwarf_four_angles.png` — front/back T-pose + profiles, the exact
format Blender orthographic reference images want; art bible §9 for
the reads and the merged-hands AI artifact to ignore).
The dwarf from the concept art replaces the remote-player capsule;
the CARRIED TOPPING rides visibly in hands (the ferry loop becomes
watchable comedy — half the party-game read is friends sprinting
past each other with cherries). First-person self: hands + held
topping only per §6 ruling. Walk cycle can be naive (bob + lean);
chunky-cute forgives stiffness.

### Slice 4.5 — THE MACHINE (the hand road; added + BUILT 2026-07-11)

**Status: DESIGNED, BLOCKED OUT, AND REBOUND IN ONE SESSION (thirteenth).
The design discussion ruled: meshy fails articulated mechanisms (the
turnaround came back a fused 50 MB blob — the meshy boundary, art bible
§10), so the machine walks THE HAND ROAD (art bible §11 NEW): primitives
hand-built in Blender on the sim's exact pivot scaffold, styled from the
visionary's catapult turnaround, iterated through THREE review rounds
(gimbal basket ruling — the dish hangs level and cradles the topping at
every tension; launch parity — the seat sweeps 1.32–1.89 m around the
sim's 1.2 m spawn; swing clearance — counterweight arc swept numerically,
min gap 7.5 cm). catapult.blend = hand-authored source of record;
catapult.glb ships 520 KB. THE REBIND: MachineRig gained drive nodes
(greybox by default — the fallback IS the machine) and dress(): one
fetch through the seam, each rig clones the template, update()'s same
math drives the model's named nodes, plus the gimbal counter-rotation.
The bucket's raycast proxy + topping visual reparent into the dish (the
one machine part still on the crosshair). Render contract holds on the
model's tilt node — pinned (scene.test.ts +4, 410 total). Machines
author NOSE = +Y Blender (art bible §11: 1:1 into machine space, no
flip — the character convention would mirror the wheel across the
posts). Live-verified: both towns dressed, wheel/drum/lever/jack at
greybox-parity coordinates, greybox hidden not disposed, zero console
errors. REMAINING: the visionary's eye pass in-game; texture/paint pass
(flat colors today); arm THROW animation is a later juice pass (the
release stays instant, honest to the sim).**

### Slice 4.75 — THE REGION (added + FIRST PASS BUILT 2026-07-11)

**Status: BUILT in the fourteenth session (friend-test debrief ruling:
"the environment should look close to the concept — a region with a
few towns, a dwarf castle, mountain ranges"). Hybrid road: built out
by the build session, flair pass belongs to the visionary
(project/blender/region.blend is hand-authored and tracked). What
stands: rolling meadow skirt (arena kept dead flat, haze baked toward
the rim), THE GIANTS' ROAD from the ogre's table to the +x horizon
(slice 3's queue will stand on it), three hamlets in the concept's
pink/cream/brick, two mountain rings with gaps for the road and the
cake axis, THE HERO MOUNTAIN owning the cake axis with THE DWARF
CASTLE carved into its near flank (pink caps echo the banners), and a
sky dome + seven cumulus clusters. region.glb 1.8 MB + sky.glb 127 KB,
all vertex-colored hand road — no textures. THE ATMOSPHERE RULE
(pinned, scene.test.ts): near_/mid_ meshes stay lit and fogged like
the forts; far_/sky_ swap to unlit fog-exempt vertex color — their
haze is PAINTED, the concept's own air. Scene changes that ride it:
camera far 200→500, fog 60–120→80–280 (the far fort reads clearer —
EYE PASS ITEM). Fallback law holds: both GLBs null → the old
green-slab-and-fog look, forever. OPEN (the visionary's flair pass):
rock/snow contrast on the hero, skirt-to-slab green seam, cloud
placement, chimney smoke (later juice), drifting clouds (later juice).**

### Slice 5 — THE DESSERT DELICIOUS

Material pass on the scoreable object: frosting with gloss and the
topping's color identity, cake tiers that read as sponge/cream, and
topping meshes that read at trailer distance (a cherry with a stem
beats a sphere). The census/splat LAWS are untouched — this is
materials and meshes over the same geometry contracts; the
render-contract tests (scene.test.ts culture) guard the swap.

TRIGGERED 2026-07-12 (visionary's note, twenty-second sitting): "the
cakes need an overhaul and a dressing — they are just hard
cylinders." Design shape of record is the FIFTEENTH session's: the
playable cake is DATA (DessertSpec tiers) → a FLAVORS material table
+ procedural drip rim, flavor derived deterministically from
broadcast state — FIXED-PER-RUNG RECOMMENDED, RULING STILL PENDING
(the FLAVORS ruling in every standing open list is THIS). Because the
geometry is data-driven per deal (seven spec rows + the practice
plank), the cake body's dress must be PARAMETERIZED CLIENT GEOMETRY,
not a static GLB — build-lane work behind the flavor ruling. The
FLEET-ABLE rider that waits on no ruling: THE TOPPING MESH SET
(cherry-with-stem, fudge chunk, lime wedge, sprinkle rod, frosting
dollop — the slice's own words), authored as small props that later
dress projectiles, settled solids, and pantry crates alike.

### Slice 5.5 — THE SEMANTIC AUDIT (strings are presentation)

Added 2026-07-09 (visionary's sighting: "rung 1 awaits the crew" on
the boot screen — engine vocabulary leaking through the fourth wall;
ledger home: plans/15 item 12). One cheap session, anytime — best
EARLY, re-checked after slice 2. Sweep every player-facing string
(banners, flashes, HUD lines, verdicts, lobby copy) against ONE LAW:
the game speaks BAKERY — orders, patrons, the crew — never engine
(blacklist as screen nouns: rung, deal, linger, census, phase, run).
Artillery vocabulary is EXEMPT flavor (traverse, winch, tension — a
dwarf siege engineer talks like that). Write replacements to survive
slice 2: "Your first patron awaits" beats "Order #1" beats "rung 1".
Includes the lobby WELCOME copy (visionary's voice: "We have pending
orders… what are you waiting around for?") — humor is canon; see
slice 8 for its diegetic home.

### Slice 6 — SFX (the sound table)

**BUILT 2026-07-12 (nineteenth session; design walked with the
visionary same session — his refinements ruled, one pushback adopted:
keys model game language INCLUDING the sting rows, so chompDevour/
verdictRefused, never chompLoud/raspberry). What shipped: sfx.ts
(one AudioContext, decoded buffers, per-play source → gain → master;
music stays OUT of the graph), audio-bus.ts (THE VOLUME BUS, plans/20
§5 — M and the corner button mute THE BUS, both engines poll it),
scripts/make-sfx.mjs (mechanical rows are REPRODUCIBLE synth — the
script is the recipe, ~100 KB of wavs into public/audio/sfx/), the
ClientFx port (flash + sound threaded together — no singleton), and
distance-scalar spatial (no PannerNode, ruled). Rows live: winch
ratchet (per click, verified 6/6), lever THUNK (dry release clunks
too), lob whoosh, SPLAT/plop/POP (hooked AT the item-13 word sites —
the pairing law is a pin now), chompDevour/chompBegrudge (the eat
beat's sting seam closed). Rows wired-but-silent awaiting visionary
files (drop-in law): verdictDelighted/Refused/Hungry (fires on the
report show edge) and grumbleRumble (rides the patron flash line).
Step booms EXPLICITLY DEFERRED to item 23 (wire-it-twice law). The
ear pass is his: row loudness balance, splat audition variants (a
row takes a list), synth quality.**

sfx.ts mirroring music.ts's drop-in table: event key → sound list.
First rows: winch ratchet click (per click — it's the tension
metronome), lever THUNK, lob whoosh, SPLAT (the money sound — worth
auditioning several), patron grumble-rumble under his flash lines,
verdict stings (delighted fanfare / refused raspberry / hungry sad
horn). Same autoplay-unlock, volume-through-fadeStep, and
copy-of-record laws as music. Client-only, unsynced, Math.random
legal.

### Slice 7 — THE VERDICT SPECTACLE

The fifteen seconds the trailer is made of, composed as ONE beat:
order ends → giant leans in → reaction pose + sting + flash toast
(the deferred ninth-session slice, CSS vocabulary ready) → pay/stars
land → linger flows on. Nothing new — this slice SEQUENCES slices
2 + 6 + the toast into a single readable moment and tunes the
timings inside the existing 18s.

PLUS THE POLAROID BEAT (visionary, 2026-07-09; BUILT 2026-07-12,
eighteenth session, riding plans/15 item 21's frame move): the report
snapshot appears BIG AND CENTER first (the moment — everyone looks),
lingers a beat (~1.8 s, MOMENT_TICKS in report-view.ts — the BANNER
WAITS for the filing), then tweens to its corner (the record — filed
away; the corner is TOP-LEFT since the frame move). The frame's FINAL
position lands where item 3's column law holds (mirrored left) — the
tween ends inside the law, it does not renegotiate it. Cross-law pin:
the photo files before the eat starts.

PLUS THE EAT BEAT (visionary rulings 2026-07-12, seventeenth
session; BUILT 2026-07-12, eighteenth session — eat-beat.ts +
comic-word.ts extraction, DEPART_AT_FRAMES 460, all three verdicts
live-smoked; SFX sting seam awaits slice 6): the fiction's missing
consumption. Beat order is photo-then-eat (you document the
masterpiece BEFORE it is devoured): verdict pose → polaroid → EAT →
walk-off. Implementation shape agreed: a low-poly STAND-IN cake
(DessertSpec tiers in flavor colors) pops from the real cake's mark
and arcs to the patron's mouth — the real dessert (frosting paint +
settled physics) never moves; its redeal reset finally has a fiction.
Comic-word CHOMP + crumb burst; drive nodes + dress() culture — a
proper siege-engineering cake LIFT can costume the same beat later.
THE THREE-VERDICT SPLIT (ruled): DELIGHTED = the full devour
(platter up, head back, gulp, crumb-burst, sparkle — the trailer
shot). REFUSED = eats it BEGRUDGINGLY (same arc, no sparkle, a
grudging chomp). HUNGRY = walks away MOURNFULLY — the cake goes
uneaten. Likely stretches DEPART_AT_FRAMES (~300 → ~450-480); the
table and line share the constant by design.

### Slice 8 — THE FRONT DOOR

Title screen over the lobby (the lobby IS the menu — pointer-lock
laws unchanged), the name decision (§6), logo treatment in the
established CSS vocabulary, and a deck-ready key screenshot. Half a
session; do it last so the front door shows the milestone behind it.
Candidate from the 2026-07-09 discussion: a diegetic CHALKBOARD SIGN
in the lobby carrying the slice-5.5 welcome quips (canvas-texture
prop, rotating lines) — the welcome lives in the WORLD, not on a
floating banner.

## 4. Laws binding every slice

- **core/ and game/ untouched. No protocol changes.** Every beat in
  this plan is derivable from existing broadcasts + client run state.
  The determinism tripwire and both tsc legs stay green throughout.
- **Primitive fallbacks forever:** every asset-consuming view keeps
  working assetless. Tests run in Node with no loader; pure builders
  carry the pins (the post-hud precedent: DOM/asset painters thin and
  untested, logic pure and pinned).
- **Perf budget:** the giant is ONE skinned mesh; the line shares
  geometry; topping meshes stay low-poly (there can be dozens
  settled). Frame time is measured before/after each slice on the
  dev machine — the friend test's tunnel adds latency, not GPU, but
  a party game must hold 60.
- **Asset weight:** public/models/ + public/audio/ ship in dist/
  through one tunneled port. Record dist/ size per slice; if it
  crosses ~25MB, compression (Draco/KTX2) becomes a slice, not a
  shrug.
- **Overlay laws stand** (ninth session): pointer-events none except
  #mute-btn; new DOM (title, toasts) obeys the paint-order and
  Space-guard rules.
- **Tone guard:** nobody dies, nothing is gross; REFUSED is huffy,
  HUNGRY is mournful. The Vegas energy celebrates the CREW, never
  humiliates.

## 5. Verification culture (per slice)

Each slice ends with: `npm run check` green; a LIVE eye pass on the
visionary's run; a render-contract pin where a visual claims to show
sim truth (scene.test.ts precedent); and A SCREENSHOT COMMITTED TO
`project/concept/captures/` — the funding deck assembles
itself from these as the milestone proceeds. Milestone exit: the §0
stranger test, run against a real 90-second capture (script the
capture: lobby → ready circle → deal → patron look → scramble →
flourish → verdict spectacle → line advances).

## 6. Open rulings for the visionary (walk these before building)

**RULINGS OF RECORD — walked 2026-07-10 (eleventh session):**

1. **DISTINCT CHARACTERS — the re-tint recommendation is OVERRULED.**
   The patron library is species-diverse: giant tree-folk, dragons,
   giant orcs — whatever else is giant in the fantasy stories
   (plans/17: they are all refugees of the same wars). Milestone
   scope: the ogre (the art's patron) is built FIRST and the line may
   debut thin; the destination is distinct species, never one rig in
   five tints. (Forge hook, noted not ruled: species → palate is a
   natural plans/18 taste axis — a dragon wants it TORCHED.)
2. **GRUMBLE-AUDIO: YES** — slice 6 rows, visionary-sourced like the
   music; real VO never; the grumble accompanies the flash text,
   never replaces it (the line is load-bearing comedy).
3. **FIRST-PERSON HANDS: YES** — hands + the carried topping, built
   as slice 4's rider; simple rounded mitts (the art bible's style
   law makes the cheap thing the correct thing).
4. **THE NAME: STILL OPEN.** "Siege Bakery" stands as working title;
   the visionary rates "Lord of the Cakes" pretty good; "The Great
   Dwarven Bakeoff" is the origin. The concept art's carved sign is
   a TEMPLATE — every in-art word is AI-generated, nothing is locked
   (the bible §6 general law re-affirmed). This is a pure-joy project
   with no obligations; the name decides itself when it's ready.
   Slice 8 blocks on this and nothing else does.
5. **SLICE ORDER 2–5: UNRULED** ("unsure") — the recommended order
   (Patron → Line → Bakers → Dessert) stands as the working
   assumption, freely re-orderable as the build teaches.
6. **THE WEEKEND: a gift, not a deadline.** Whatever lands by
   Saturday rides along; work resumes Sunday. The fallback law
   (assetless boot, §4) makes partial work safe by construction.
7. **HUD-NEON IS NOT CANON.** The visionary's own read: the minimal
   aesthetic came out cyberpunk — too futuristic for this game. Not
   binding; the DOM look may be reverted/enriched toward the warm
   fantasy aesthetic as a sanctioned future aesthetics slice. Not
   milestone-gating; world-first meanwhile.
8. **PROPORTIONS: blessed** (dwarf 1.2 m, catapult ~2.5 m, crates
   ~0.7 m, cake conforms to the sim) — **EXCEPT THE GIANT, re-ruled
   BIGGER**: he must plausibly EAT the dessert, and cake-3 is 8 m
   across × 5 m tall (cake-6: 9.5 m). Plausibility band ~12–20 m
   (a 12 m giant faces cake-3 as a person faces a 1.2 m feast cake;
   the bible's 6–8 m reads as a catering table, not his dessert).
   Decided by BOTH theory and camera: stand a graybox giant behind
   the arena early (slice 2's first act, or sooner as a cheap
   cylinder) and eyeball from the catapult post.
   **TESTED SAME SESSION (graybox lineup 12/16/20 m beside the
   catapult, cake-3 reference standing at the plinth): 12 m reads
   "big person," 16–20 m read plausible, and framing survives past
   20 m. RULED: 20+ m — "fantastic scale makes it fun."
   RE-RULED 2026-07-11 (fourteenth session, friend-test debrief): at
   21 m the cake read as ~40% of his height — a feast, not HIS
   dessert. Auditioned 36 m in-game (OGRE_SCALE in main.ts, the GLB
   still ships 21): "I think it works" — 36 m stands, provisional
   until the region backdrop either confirms or argues. TWO
   PLACEMENT RULINGS rode along (visionary): the ordering patron
   stands OUTSIDE the town walls, never inside a town (the graybox
   at z=−52 stood in town 1's yard — wrong; he leans over the wall
   toward the table, the concept art's exact read), and BEHIND him
   the queue of waiting patrons recedes (distinct species, ruling
   1 — the line lives outside the walls too). Camera note for slice
   2: the loom lives in the LEAN and the BULK as much as the height
   — a chunky 20 m at the table beats a skinny 24 m behind it.**

1. **Patron variety in the line:** the same giant re-tinted with prop
   swaps (cheap, one rig) vs distinct characters (expensive, real
   art)? Recommendation: re-tint + props for the milestone; distinct
   patrons are a post-funding content lever the deck can PROMISE.
2. **Patron voice:** text-only (today), or grumble-audio under the
   flash lines (Banjo-Kazooie mumble — cheap, huge character)?
   Recommendation: grumble-audio in slice 6; real VO never.
3. **First-person hands:** show the local baker's hands + carried
   topping (recommended — the carry becomes visible to its own
   carrier), or keep the clean empty view?
4. **The name:** is "Siege Bakery" the shipping name for the deck,
   or does the title screen wait on a naming decision? (Slice 8
   blocks on this and nothing else does.)
5. **Slice order 2–5:** recommended Patron → Line → Bakers → Dessert
   (fantasy face first); Dessert-first is defensible if the next
   external capture is imminent.
6. **Where the friend test fits:** this plan ignores it by
   instruction, but slices 1–2 landing before the weekend would put
   the giant IN the friend test — decide whether that's a gift or a
   risk to the test's controlled scope.
7. **World-warm vs HUD-neon:** the concept art is warm storybook
   (pink + cream + wood, sky-blue not cyan); the ninth-session DOM
   is bright pink/cyan Vegas. They can coexist (world warm, HUD
   candy-neon) but rule it deliberately — see the art bible §3 note.

## 7. What this plan deliberately does NOT contain

More rungs, wind, the Sneeze, the Bite carve, power-ups, run points,
patron behavior changes, preview arcs (15 §9 boundary), flat-shot
machines (15 §7), tray desserts. The deck may show several as
roadmap; the build shows none.
