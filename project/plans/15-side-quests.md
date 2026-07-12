# Plan 15 — SIDE QUESTS: the standing notes ledger

**Status: LIVE LEDGER, opened 2026-07-08 from a discussion session
(visionary's playtest notes, triaged). This file replaces nothing — it
is the page the CLAUDE.md one-line ledger items grew into. Sessions
CLAIM an item by editing its status line; decisions of record are
final unless the visionary reopens them. Keep entries to decisions,
constraints, and open questions — the discussion that produced them is
not re-recorded here.**

Buckets: **PRE-FRIEND-TEST** (lands before plans/12 runs) ·
**AESTHETICS PASS** (a later dedicated sweep) · **POST-CAMPAIGN
DISCUSSION** (needs a design session after plans/13 economy exists) ·
**OPEN QUESTION** (no action; recorded so it isn't re-derived).

---

## 1. Landing rings: last shot PER CATAPULT — PRE-FRIEND-TEST

**Status: DONE 2026-07-09 (eighth session). shots-view.ts only, per
the scope note: core's Impact echoes one `tag` number, so the client
packs (deal, town) into its own tag namespace (packShotTag /
unpackShotTag, exported + pinned — the Room's tags are a separate
namespace and never meet these; the old fixtures' tag 0 IS deal 0
town 0, so nothing drifted). markers: THREE.Mesh[] FIFO-30 →
Map<town, mesh>: a gun's next lob disposes and replaces ITS ring
only. Stale-deal shots still ring (they visibly land, they just
can't paint — unchanged). clearLandingMarkers (fresh-cake law) and
quiet grains unchanged. Pinned (shots-view.test.ts, +4): tag
round-trip, five lobby shots = one ring at the newest lob, town 1's
ring appears while town 0's held SAME MESH, stale straggler rings
honestly, fresh deal clears all. LIVE (worker-shim): two lobs one
gun = ring count 0 → 1 → 1.**

Decision of record: one ring per catapult, replaced by that gun's next
lob. NOT last-shot-global (a teammate's shot must never erase your
walk-the-fall correction) and NOT the current FIFO-30 breadcrumb trail
(shots-view.ts `LANDING_MARKER_MAX`, audit 2026-07-03) — in the LOBBY
no redeal ever clears it and test shots pile up visibly (playtest
2026-07-08, the note that opened this file).

Scope: `shots-view.ts` only. The marker needs to know its firing town
(the ShotMsg already says); `addLandingMarker` keys by town instead of
FIFO. Grain landings stay QUIET (plans/10) — unchanged. The
fresh-deal `clearLandingMarkers` law stays.

## 2. The tilt ladder's dead top — PRE-FRIEND-TEST, harness-gated

**Status: DONE 2026-07-08 (fourth session) — merged into plans/13
slice 3 (visionary-blessed) and landed. The clamp check ran first:
research/11 (spec-parameterized) at cake-3 × maxNotch 12 reproduced
EVERY pinned envelope number exactly (one town 79.0/81.2/90.3 at
≤8/9/10, union 100.0% at ≤8, overlap 57.9/62.9/80.9) — notches 13–18
bought zero coverage. TILT_MAX_NOTCH 18→12 in game/catapult.ts; every
reader (sim clamp, HUD glyph ladder + numeric line, scene's visual
tilt clamp) rides the constant symbolically, so one edit moved them
all; HUD pins re-pinned (hud.test.ts). The rider landed as
scene.test.ts — the render contract: the rig's shown frame tilt IS
the sim tilt notch-for-notch, the visual clamp is the sim clamp, and
the ball's arc was already real ballistics (shots-view spawns
launchVelocity), so the 55°+tilt release cannot diverge.**

The facts (so nobody re-derives them): the arm's release elevation is
FIXED at 55° (`ballistics.ts LAUNCH_ELEVATION_DEG`); the vernier ADDS
tilt, 2.5°/notch × 18 notches, so total runs 55°→100°. Tension buys
SPEED ONLY — pull-back does not change the release angle (physically
honest: a real arm releases at the crossbar regardless of draw). At
~notch 12 the total passes 85° (near-vertical); ~notch 14 is 90°
(straight up); above that the cosine goes negative and the machine
lobs gently BACKWARDS. The top ~5 notches are a trap: a player winds
to max expecting MORE and gets the ball on their own head.

Proposed (pending harness): clamp `TILT_MAX_NOTCH` to ~12 (≤85°
total). MUST re-run the research/11 coverage harness first — the
pinned TOWN_POTENTIAL numbers were measured riding the full ladder,
and fine tilt is what bridges the moat; confirm the clamped notches
contribute nothing to the envelope before cutting them.

Rider (same claimant): render-contract check that the VISUAL arm
releases at ~55° + tilt — if the animation reads a different release
angle, players learn the machine wrong even though the sim is right
(the verify-positions-not-counters rule).

## 3. Order-report inset frame: responsive — PRE-FRIEND-TEST

**Status: DONE 2026-07-09 (eighth session). MEASURED, not guessed:
the frame's own sizing (min(27vw, 48vh), 2026-07-07) was fine — the
sighting was the fixed-overlay collision. At 1280×800 the BANNER's
centered verdict text ran under the snapshot frame (text y181–619
full-width vs frame x860+, y≤351), and the frame paints later — the
report covered its own words; at narrow widths the HUD's long lines
ran under it too. THE FIX (index.html only): the proclamation YIELDS
THE PHOTO ITS COLUMN — #banner reserves padding-right
calc(min(27vw,48vh) + 48px) (+48 = the frame's own padding, border,
and 1.6°-tilt bbox growth), #hud caps max-width off the same column,
the banner font is clamp(20px, min(3.4vw, 5vh), 42px), and
#snapshot's UA <figure> margin (which shoved it ~40px off its
right:12px anchor) is zeroed. VERIFIED frozen-linger geometry at
1280×800, 1366×768, 768×1024, 375×812: no banner/HUD-under-frame
overlap, banner fits vertically, caption never clips, 18–36px gap.
Visual eye pass: the visionary's next run.**

The end-of-order report's inset frame covers its own text at some
viewport sizes (seen in the web interface). Decision: the inset is
10% of screen size, responsive. Trivial scope in `hud.ts`. It WILL
bite on the friend's monitor — that's a different resolution by
definition.

## 4. Projectile trails — PRE-FRIEND-TEST (promoted by the visionary)

**Status: DONE 2026-07-09 (ninth session). Built as ruled below:
TrailRibbon in shots-view.ts — a preallocated camera-facing triangle
strip per lob, per-vertex RGBA fade (three.js native 4-component
vertex colors, no shader), frustumCulled=false (the sprinkles
empty-birth culling lesson). Samples ride the fixed tick in step()
(head sampled AFTER the world steps); billboarding rides the frame —
sync(camera) grew the parameter (main.ts, sole caller). Dials pinned:
TRAIL_WINDOW_TICKS 36, TRAIL_HEAD_ALPHA 0.45, TRAIL_WIDTH = one
projectile radius, both tapering to zero at the tail. ONE LAW ADDED
IN BUILD: the ribbon leaves when its arc dissolves AND its body is
gone or at rest (TRAIL_MIN_SPEED) — a settled solid does NOT keep an
idle ribbon against a future nudge, or lobby test shots grow the
scene without bound (the rings lesson in scene-graph form; found live
at 159 idle ribbons). Pinned (shots-view.test.ts, +5, real physics
over a floor collider): samples accrete capped at the window, a
consumed glob's ribbon outlives its body then dissolves, grains never
trail (the pop spawns zero ribbons), a settled solid's ribbon leaves,
sync draw-range math. 376 tests, both tsc legs. Live-verified
numerically (accrete → cap 37 → dissolve → dispose); probe lesson
recorded in memory: store COPIES in window probes, not references —
a stored live sample aged to its terminal 37 before the read and
faked a bug. EYE PASS: the visionary's own run — "the trails are
beautiful."
AMENDED 2026-07-09 (tenth session, visionary ruling): THE TRAIL IS
THE FLIGHT — the metaphor is the streak a fast-moving shot draws, so
the ribbon HALTS at FIRST CONTACT and dissolves while the topping may
still visibly roll (before: it kept feeding until the body slowed
under TRAIL_MIN_SPEED — a bouncing cherry wore its comet across the
cake). core's Impact event grew `bodyHandle` (a plain number, the
shape stays broadcastable; the Room ignores it — Settled already
carried its whole body); ShotsView halts the matching ribbon in the
impacts loop; the at-rest speed law retired — every lob impacts or
vanishes, so nothing idles and the no-pile-up guarantee holds by
construction. Pinned: the halt test replaced the settled-solid test
1:1 (389 holds). Live: feeding true through flight (samples capped
37), flipped false AT contact with the body still valid as litter,
arc drained 36→5→disposed, zero page errors.**

Rulings of the discussion (2026-07-09, visionary agreed):
- RIBBON, not puffs and not a 1px line: a custom camera-facing triangle
  strip through the ball's recent positions — translucent (normal alpha
  blending, not additive glow), topping-colored (TOPPING_COLORS),
  head alpha ~0.45 tapering to 0, width ~one projectile radius tapering
  to a point. The fat-line examples module was considered and rejected
  (no per-vertex alpha without patching its shader).
- 0.6s trailing window, sampled on the FIXED TICK (36 samples at 60Hz)
  — the trail freezes honestly under __timeScale; billboarding rides
  the frame (sync gets the camera).
- Every player sees every arc BY ARCHITECTURE (shots are broadcast
  events; every client simulates every lob) — no extra work, recorded
  so nobody designs for it twice.
- Grains NEVER trail (plans/10 quiet-grain law; 40 ribbons per pop is
  the whole perf budget in one event). The burst CARRIER trails until
  the pop.
- No persistence after landing: the ribbon stops feeding and its
  samples age out — the last 0.6s of descent dissolves; the ring
  (item 1) is the landing record. No interaction with
  clearLandingMarkers or the fresh-deal law.
- Alpha/width/window are named constants in shots-view.ts — the
  aesthetics-pass dials.

Transparent, fading trails on projectiles. Promoted out of the
aesthetics pass 2026-07-08: playtest brains want them, the loop is
simple (shoot a catapult, dress a cake) so the juice IS the content —
and trails are secretly functional aim feedback (you see your arc, you
correct). Cheap ribbon/line, client-only, `shots-view.ts` territory.

## 5. Post-local HUD — AESTHETICS PASS

**Status: DONE 2026-07-09 (ninth session) — promoted by the visionary
into the pre-friend-test UI pass (not by the trigger), rulings from
the discussion: WINCH panel DEAD CENTER and BIG (the tensioner's only
job is the number — no time reading UI); GUNNER cluster BOTTOM-LEFT
(free real estate — the aim line, arc, and cake own the center);
BUCKET STATE unmissable on the gunner panel (what F throws, or
BUCKET EMPTY breathing); tone = clear modern BRIGHT, pink/cyan,
fantasy, Vegas energy (big glowing numbers, pop on every real change,
celebrate the values) — tone-setting in DOM/CSS now, diegetic Blender
interfaces later. BUILT: hud.postPanel (pure, tested — WHAT) +
post-hud.ts (DOM painter — WHERE) + index.html CSS; the manned post's
instrument lines LEFT the corner block (invitations stay); the corner
#hud got its card (same words, better bones; box-sizing keeps item
3's column law). Constraint (a): LastShot memory recorded client-side
off the shot broadcast per town (no wire change) — "last shot flew at
N" on the winch, the full solution on the gunner. Constraint (b): THE
ONE KEY TABLE — posts.POST_KEYS is read by postOp AND rendered by the
panels; hud.test pins the caps EQUAL the table (never literals), so
HUD and hand cannot drift. Render discipline: rebuild (and pop) only
on structural change; crank fill and traverse update in place.
Pinned: posts.test (postOp table refactor, behavior verbatim),
hud.test postPanel suite (+4, one-table law). 379 tests, both tsc
legs. LIVE (worker-driven E-dispatch at the anchors): winch 2/10 big
+ 2 segs lit + 78% live fill + caps W/SPACE/S/E + "last shot flew at
2" after a wire lever; gunner FUDGE LOADED chip in topping color,
+21.5° cyan / +7.5° pink, ladder, caps A/D/W/S/F/E, gold memory line;
pointer-events none verified. Screenshots both panels; the deep eye
pass rides the visionary's next run. Deferred from the discussion's
slice list: flash-message center toasts (Vegas event celebration) —
the next aesthetics slice, not this one.
AMENDED 2026-07-09 (tenth session, visionary-confirmed sighting):
unwinding wore winding's costume — the painter rendered |fillPct|
into the segment ABOVE the count in BOTH directions, so letting out
read exactly like winding up. Now the sign picks the element: winding
FILLS the next segment left-to-right (pink, as before); unwinding
DRAINS the top lit segment right-to-left (.seg-drain — the panel's
dark tint eating the cyan). Live-driven at the post: fill 38→82%
under W with the drain dead; under S the fill pinned at 0% while the
drain grew 11→29→47%. Rode along: the gunner's structural key shed
its per-frame JSON.stringify (hand-rolled key, same rebuilds).**

The original ask (kept for the record): at each post, that post's
stats front and center — no corner-left glances. Winch: tension
amount BIG, center screen, the keys to press, and the LAST fired
tension setting. Gunner: all relevant stats large but NOT center.
Two constraints recorded then, both honored above: (a) "last tension"
needs a small remembered state (last fired clicks per catapult);
(b) whatever keys are displayed must render from ONE shared table per
post so the W/S = more/less law (plans/14) cannot drift between HUD
and input.

## 6. Power-ups — POST-CAMPAIGN DISCUSSION (do not build early)

**Status: awaiting a design session AFTER plans/13's economy lands.**

The idea: increased frosting coverage/spread, 2× carry, baker speed,
etc. Visionary's shape (2026-07-08): TWO channels — you can BUY them
(the shop), and the team can be AWARDED them, in which case they
APPEAR PHYSICALLY IN YOUR BAKERY AREA. The award channel is the
game's soul — rewards as objects you walk to, not menu buffs; the
delivery mechanism is a thing on the floor you interact with (fits
one-body-one-job).

Engineering constraints binding on any design: (a) power-ups are
ROOM-AUTHORITATIVE match state that RIDES THE SHOT EVENTS — a spread
multiplier changes the splat law, and cake state syncs as
deterministic events, so the modifier must be event/match data, never
a client-side effect; (b) 2× carry loosens the ferry loop, which is
the co-op pressure — legitimate as a PURCHASED relief valve, priced
like one. Reason it waits: the shop (plans/13 §5) is the natural
delivery vehicle; building power-ups first means inventing a second
progression system and reconciling later.

## 7. The 55° floor — OPEN QUESTION, no action

The machine can never fire flatter than 55° (item 2's facts). If
playtests ever want a flat, direct shot — skim under something, rope a
low wall — that is a DESIGN change (a second machine type or an
arm-geometry rework), not a tuning tweak. Recorded so the wish, if it
arrives, lands here instead of in a tuning session.

## 8. Run points — meta-progression after the run — POST-CAMPAIGN DISCUSSION

**Status: awaiting a design session (visionary's shape recorded
2026-07-09, seventh session; deliberately deferred).**

The shape (visionary): players earn POINTS at run's end — a currency
SEPARATE from the purse (purse is in-run, shared, resets with the run;
a run is a complete story). Points pay even on a FAILED run (every run
ends with something), and a landed flourish pays more. Natural funding
channel for the power-up award economy (item 6) — discuss beside it.

Constraints binding on any design: (a) points persist across runs,
which plans/13 §7's "no run persistence" non-goal currently forbids —
lifting it needs player identity + storage (none exists; connections
are anonymous today); (b) two currencies must stay legible — purse
buys in the shop, points live at the meta layer; never price one
thing in both. Open: per-player or per-crew.

Reason it waits: slice 5's purse must exist first; the shape belongs
in item 6's post-campaign session.

## 9. Pre-shot preview arc — DESIGN BOUNDARY, do not build casually

**Status: recorded 2026-07-09 (ninth session, the trails discussion);
ruled by the visionary. No action.**

Our flight is a pure parabola (no drag — launchVelocity then gravity),
so a golf-game-style predicted arc from the current traverse/tension/
tilt would be TRIVIALLY computable — and that is exactly why this
boundary is recorded: the temptation will recur. DO NOT build it as a
tuning tweak or a juice item. The game's aim loop is fire → watch →
correct — walk the fall, learn your machine; that learning IS content
in a deliberately simple loop. Trails (item 4) are FEEDBACK (what
happened); a preview is an ANSWER KEY (what will happen) — it would
let players aim by cursor and gut the skill the landing rings and
trails exist to feed. If a playtest ever begs for a preview, that is a
DESIGN SESSION (like item 7's 55° floor), not a feature request.

## 10. Background music — the mood jukebox

**Status: DONE 2026-07-09 (ninth session, the UI pass; the visionary's
two AI tracks). THE TABLE IS THE FEATURE: music.ts PLAYLISTS keys
moods → song lists; future tracks are DROP-INS (copy to public/audio,
add a row — no code). Today: order = [kitchen-chaos, kitchen-mayhem];
lobby / linger (the 18s interlude) / runover (the fatality) are
silence with their names on the door — the visionary is composing
them. LAWS (ruled): music during the ORDER; random first pick, a
track ending mid-order hands off to the OTHER (nextTrack — pure,
pinned: never repeats with n>1); order end FADES 1.5s (a hard cut
fights the celebration), fresh deal fades in 0.8s; the finish-it
window keeps the order's music (peak excitement is not an interlude);
BG_VOLUME 0.35 one dial; M mutes globally (noted in the POST_KEYS
namespace audit; controls line teaches it). Client-only ambience:
Math.random legal (never touches core/game), clients unsynced by
design (syncing costs wire for nothing). Autoplay law: play() rejects
until a real gesture — MusicBox retries on first pointer/key; the
pointer-lock click is the natural unlock. Files: public/audio is the
COPY OF RECORD (Vite → dist/, the room server serves it — the friend
test streams through the tunnel); project/files/audio is the raw
inbox, gitignored. Pinned: nextTrack + deriveMood + the table (+7,
386 total); the browser shell live-verified: lobby silence → ready-up
→ order kicks in at 0.35 (real-click unlock), synthetic 'ended' →
the other song seamless, fade 0.35→0→0.35 both ramps, M both ways,
dist/audio ships. Speakers eye(ear)-pass: the visionary's next run.
SAME SESSION, second slice: the LOBBY row filled (hearth-harvest +
hearthside-yeast, the visionary's next two tracks — the drop-in
workflow's first real use), and the MUTE BUTTON landed upper-right —
M's clickable twin (the iPad rider has no M key). Button laws: THE
ONE overlay with pointer-events auto (buttons are for clicking;
everything else stays none for the pointer-lock grab); painted UNDER
the snapshot (the photo's linger wins the corner; clicks pass through
its pointer-events: none regardless); BLURRED after every click —
a focused button turns Space into "click", and Space WINDS the winch.
Icon follows the state from BOTH paths (key and click). Live: click
muted 🔇 without stealing focus, M unmuted 🔊, lobby played
hearth-harvest and handed off to hearthside-yeast on ended.
THE GROUND-PLANE BOOT BUG (same session, visionary-sighted, FIXED):
the first rAF timestamp can PRECEDE the performance.now() captured
when the loop was armed → frame one's dt arrives NEGATIVE → the
fade-in computed volume −0.03 → HTMLMediaElement.volume THROWS
outside [0,1] (it does not clamp) → the uncaught throw killed the
rAF chain on frame one: baker spawned, camera never followed, the
player stared at the boot camera INSIDE THE GROUND PLANE. Vsync-
phase roulette — intermittent per boot. FIX: fadeStep (pure, PINNED
±dt and range): all volume math goes through it; negative dt moves
nothing; result never leaves [0,1]. Verified: four consecutive
in-page reboots, zero errors, camera at eye height every time.
Driver lesson in memory: the preview console does NOT capture
uncaught page errors — arm a window 'error' listener and re-import
main with a cache-bust to catch a first-frame death.**

## 11. The observation tower / spotter perch — POST-MILESTONE DESIGN DISCUSSION

**Status: shape recorded 2026-07-09 (MVP-audit discussion session);
visionary's note, deliberately deferred — FIRST discussion after the
plans/16 audiovisual milestone. A real system (level geometry, maybe
movement tech) — excluded from the milestone by its own §1 law.**

The shape (visionary): a tower the dwarves can CLIMB to see the cake
— or a dwarf-tech cherry-picker that goes up and down. One player
becomes a spotter (formally or informally), calling corrections down
to the crew. Also, honestly: a place for dwarves to jump off for no
reason (correct party-game instinct; nobody dies — splat comedy).

Why it's load-bearing, not decoration (record of the discussion): the
preview arc is a forbidden answer key (item 9) — aim information must
be EARNED. A spotter up a tower yelling "two more clicks!" is the
SANCTIONED form of the same information: earned through a body, a
climb, and a job — information as teamwork, the game's soul. And the
need GROWS with the ladder: taller cakes hide their far side and
crown from the firing line exactly as the asks get harder; the
spotter closes the feedback loop mid-order instead of at the report.

Engineering notes binding on the design session: (a) a static tower
+ stairs/ramp is nearly free IF the kinematic baker controller walks
slopes — CHECK THIS FIRST (one minute, before designing around it);
(b) the cherry-picker is a RIDDEN MOVING PLATFORM — classic fiddly
kinematic-controller work; build the dumb tower first, the dwarf-tech
elevator as a later flourish; (c) no spotting UI — voice/couch is the
party-game channel; the tower sells the JOB, not a system.

## 12. THE SEMANTIC AUDIT — player-facing strings speak BAKERY, never engine

**Status: DONE 2026-07-10 (eleventh session; rulings from the same
discussion that recorded plans/17 the lore and plans/18 the forge).
The sweep found the blacklist already MOSTLY clean — deal, linger,
census, phase never reached the screen; the offenders were "rung"
(5 sightings) and "run" (6). THE REPLACEMENTS, all visionary-agreed:
the rung number IS the patron's number on screen (PATRON 3 · THE
ORDER — written to survive plans/16 slice 2 AND the plans/18 queue:
each rung is the NEXT giant in the line, the standing fiction now);
the run is THE BAKERY'S DAY (open the bakery / ALL IN — the bakery
opens in 3… / CLOSING TIME / the bakery closes in Ns / gather to
bake again); the report counts PATRONS FED, never rungs cleared
(all 7 patrons fed — the realm eats well tonight); and the pay line
names the payer per plans/17 (🪙 the realm pays +N coins). CLEARED
UNCHANGED, recorded so nobody re-sweeps: artillery vocabulary
(exempt flavor, the ruling below), every verdict string, the m/s
corner record (item 13's ruling), control/status lines (WASD,
CONNECTION LOST — UI, not fiction), shop/purse/town/gates/circle
(already diegetic). Code identifiers keep rung/run — the law binds
the SCREEN, never the engine's own names. hud.ts + net-handlers.ts +
one main.ts flash; pins re-pinned in hud.test.ts + net-handlers.test
.ts. 394 tests, both tsc legs. LIVE: lobby "THE BAKERY WAITS — the
first patron is on his way / stand in the gold circle to open the
bakery (0/1 in)"; ready-circle teleport rolled it to "PATRON 1 · THE
ORDER · 2:25 · 🖐 one pair of hands". Eye pass rides the visionary's
next run.**

The law: every player-facing string (banners, flashes, HUD lines,
verdicts, lobby copy) speaks the FANTASY's language — orders,
patrons, the bakery — never the architecture's. Jargon blacklist as
screen nouns: rung, deal, linger, census, phase, run. ARTILLERY
vocabulary is EXEMPT — traverse, winch, tension are flavor, not
leakage (a dwarf siege engineer talks like that); the audit removes
scaffolding, not character. Write replacements to SURVIVE plans/16
slice 2: once the giant is visible, "Your first patron awaits" beats
"Order #1" beats "rung 1" — strings and embodiment should land
pointing at each other.

## 13. THE COMIC WORD — SPLAT! floats up from your own landings

**Status: BUILT 2026-07-09 (tenth session; rulings from the same
discussion). The flash-toast deferral (item 5) concluded here as a
DIFFERENT thing: the visionary ruled the CENTER SCREEN is where people
see what is going on — almost nothing goes there — and asked whether
SPLAT! could be a comic-panel word OVER THE ACTION instead. It is:
SplashWord in shots-view.ts — a canvas-texture sprite born at the
impact point, stamps in fat, settles, floats up ~2.2m (ease-out, clears
the cake crest early), fades its last third, ~1.1s life, disposed on
its beat (the ribbons' lifecycle discipline — nothing piles up).
Depth-test OFF (ruled): the word ignores the cake's silhouette — the
far-hemisphere lob is exactly the landing you cannot physically see,
so the word rises over the crest and announces it. LAWS: YOUR OWN
town's shots only (shotsView.yourTown, kept current by main's bindTown
— welcome + pickTown ack; a teammate crew's landings stay wordless,
their trails and rings still speak); hot SHOUTS (SPLAT!, 2.4m) and
gentle whispers (plop., 1.5m) by the same SPLAT_SPEED predicate the
rings read; POP! at your carrier's burst; grains stay silent (the
quiet-grain law holds at the word layer); topping-colored with a dark
comic outline; the corner flash line stays as the quiet m/s record;
words say HOW it landed, never where to aim (item 9 stands). Node has
no canvas: the texture is guarded, the sprite lives its lifecycle
faceless in tests — pins are lifecycle+text (+5, 394 total; both tsc
legs). Live: plop. born y3.1 → rose to 5.0 → faded 1/0.69/0 →
disposed, zero page errors; SPLAT! screenshot over the machine block
(depth-test-off proof). PAIRING RECORDED: spatial SFX rides these
same impact events (they carry the position) — the plans/16 sound
slice should hook the splat/pop sounds exactly here, so the word and
the sound land as one announcement. Dials named in shots-view.ts:
WORD_LIFE_TICKS, WORD_RISE_M, the two widths — the eye pass tunes
them.**

## 14. THE ASSET DIET — dist crossed the 25 MB alarm — FIRST SERVING BUILT

**Status: TRIGGERED 2026-07-11 (visionary's measurement, thirteenth
session). plans/16 §4's law — "if dist crosses ~25MB, compression
becomes a slice, not a shrug" — has fired: dist/ measures 27.9 MB.
The weight: ogre.glb 8.8 MB (9.6 after the same-session shiny fix —
the lifted roughness PNG compresses worse), dwarf.glb 4.4 MB, four
MP3s at ~2.9 MB each. No build yet; recorded so the slice is claimed
deliberately, BEFORE the cast grows (slice 3's line and the machine
model are both incoming weight).**

**THE WEIGHT SESSION 2026-07-12 (nineteenth session — THE PATH entry
3): the menu is CLOSED. (c) DRACO ADOPTED (de6c391): post-diet giants
measured ~70% geometry, so mesh compression was the lever — models
23.9 → 8.5 MB, region 2.12 → 0.10; node/bone names + skins verified
byte-identical BEFORE adoption; decoder self-hosted public/draco/
(245 KB, no JS fallback — wasm-less boots assetless); draco() is now
the diet's closing pass and assets.ts carries one shared DRACOLoader.
Live-smoked: six rigs bind with root bones AT their slots. (b) KTX2
DEFERRED, ruled with the why: textures already small JPEG, ~2-3 MB of
wire for a transcoder dependency; its real win is GPU memory — not
today's pain; revisit if texture-heavy props multiply. (d) AUDIO:
192 kbps STAYS (visionary's ear on 128k/96k candidates — the 96k
cymbals fizz); the LOUDNESS RULING rode along (627fa6c): music was
drowning the game — BG_VOLUME is now the 0.4 CEILING, the bus rests
the dial at half (~20% effective), pinned. Fresh dist 23.61 MB —
UNDER the alarm; the release gate (plans/20 §8 organs, 9ad4f95)
holds the line from here.**

**FIRST SERVING 2026-07-11 (fourteenth session, after the friend test
measured 15–30 s loads): menu item (a) built as a PIPELINE STEP, not
per-asset surgery — `npm run diet -- <name>` (scripts/model-diet.mjs,
gltf-transform + sharp): drops a measured-black emissive, baseColor +
normal → 1024² (dwarf precedent), metallicRoughness → 512² (wall-ORM
precedent), JPEG q90 in ONE re-encode pass, HARD-FAILS if node/bone
names change (the drive vocabulary). ogre.glb 9.62 → 2.46 MB; decoded
VRAM ~67 → ~13 MB. Quality auditioned in Blender face close-ups
(slight skin-noise softening at framings gameplay never reaches) and
the rig live-smoked (PatronBody binds, look-lean hits recipe offsets).
dwarf.glb same pass: 4.42 → 1.15 MB (its emissive was black too);
ghost dress live-smoked (dwarf_export at the upserted pose, feet drop
−0.85). dist 29 → 19 MB — back under the alarm with headroom. Menu
items (b) KTX2 / (c) Draco / (d) audio bitrate remain open — audio is
now the heaviest block by far (11.3 MB of the 19).**

The menu for the slice, in expected-yield order: (a) texture resize —
the meshy GLBs pack AI-generated textures; the dwarf already ships at
1024² (halved in import, art bible §10), the ogre likely ships larger
— re-export cheap; (b) KTX2/Basis texture compression and (c) Draco
mesh compression — real pipeline work, loader changes ride the seam;
(d) audio bitrate — the MP3s are the visionary's compositions,
re-export at a leaner bitrate with his ear on the result. Partial
relief landed same session: the dwarf now lazy-loads on the first
remote ghost (solo boot never fetches it), but the wire weight
itself is untouched. The budget law stays plans/16 §4's; this item
is its claim line.

## 15. THE LANDING VERDICT — green/red splat feedback — BUILT

**Status: BUILT 2026-07-12 (twentieth session, entry 4 with item 16).
THE RINGS RECOLOR RULED (visionary, same day): color is the VERDICT
channel everywhere — green = on the cake, red = off it — and landing
energy keeps the channels it already owned, word choice and ring size
(before this, ring color spoke energy: red = splat, green = gentle).
The two-gate split shipped as ruled: paint verdicts AT IMPACT — the
oracle is the local field's painted-sample count (frosting-view
returns it; the exact truth the Room's `painted > 0` reads — isOnCake
would lie red on an honest wall splat), stale globs wear red (they
scored nothing); solids ring NEUTRAL at impact and take their color
AT REST via isOnCake, the ring repositioning to the rest spot — and
only while it still belongs to that lob (bodyHandle rides the
marker). Grains stay quiet at every layer (a Settled.grain flag joined
core for this). Live-smoked all four paths, including a cherry that
bonked off the ogre and rolled red, and a mid-air two-lob kiss whose
red was honest. A knocked solid re-settles silently and keeps its
landing's verdict — the ring is the LANDING record; the checklist
stays the truth surface.**

The ask: gamify projectile contact. The splat exists (item 13's comic
word + the impact FX); now it should carry a VERDICT — green when the
shot lands on the cake, red when it lands off the cake or on the
giant.

RULED (visionary, 2026-07-12): **solids get their color verdict AT
REST, frosting at impact** — the two-gate honesty law applied to
juice. Frosting is impact-scored, so an impact-time verdict is
truthful; a solid can land red and roll on (rare, but "the at-rest
policy will save it"). Solids show a neutral impact splat, then the
color cue fires where the census actually reads them.

RULED (visionary, 2026-07-12, second discussion): **binary first**
(green = on cake, red = off). Orders demand tiers, so
green-but-wrong-tier can still read as a lie when the ask was TOP
TIER — but zone-awareness can't fix the sibling case (right zone,
requirement already full), so the CHECKLIST stays the truth surface
and a third "right cake, wrong zone" color is a later door, opened
only if playtests show confusion.

Constraints binding the build: client-only juice, derived from the
broadcasts every client already replays (impacts and settles carry
positions; `DessertGeometry.isOnCake` is the oracle — geometry is an
argument, per core/dessert.ts). The comic-word pairing law (item 13)
extends: the word, the sound (plans/16 slice 6), and now the COLOR
land as one announcement. On-giant = red needs item 16's capsule to
exist before a giant hit is even a distinct event. This feature IS
onboarding ("where did my shot land?" — plans/20 §6 claims the same
family).

## 16. THE GIANT COLLIDER + the shake-off — BUILT (ogre; six species = fleet lane)

**Status: BUILT 2026-07-12 (twentieth session, entry 4 with item 15).
THE CLAIMER'S-CALL LINE IS CLOSED: the mapping promoted to game/cast.ts
NOW (both terminals concurring — a minimal core-side duplicate beside
the client's copy is exactly the two-sources-drift the determinism
laws kill; the prize session inherits a finished foundation).
core/patron-collider.ts is plans/21 §0's first named exception made
real: capsule DATA + PatronColliderRig, reconciled EVERY TICK in BOTH
worlds against game/cast's patronAtMark(phase, rung, verdictPending) —
poll, never edges, so late joiners and every lifecycle seam fall out
free. INTERIM LOBBY RULE (ruled with the pair): the mark stands rung
1's patron through lobby/countdown — warmup lobbing at a visible ogre
must bounce; item 25's training lobby RAZES this branch (cross-note
there). Known accepted residues: the linger's walk theatre plays with
capsules down (ruled); ~one-round-trip flip races (the dessert swap's
own class); post-loss lobby visibly holds the next-up species while
both worlds agree on rung 1's shape. Impact.otherHandle joined core
(the pair's other collider handle — handle-set interpretation beat
the analytic oracle: ankle ricochets misread). GROUP_PATRON joined
the collision groups (shots + grains bounce; bakers never entangle —
item 23's bop owns proximity feel). THE ROAD RECIPE GREW ITS STEP:
col_* marker empties in each rig .blend, exported by
project/blender/collider-scripts/export-patron-colliders.py at RULED
height (--scale = the client visualScale; the ogre trap: rig ships
21 m, renders 36). Ogre authored + exported + live-smoked (BONK! word,
patronBonk synth row, shake-off flinch on the real rig, the scold
flash, paint dabs riding the body group). SIX SPECIES AWAIT MARKERS —
fleet-dispatchable against the ogre precedent + the export script.
The scold table (patron-table.ts SCOLD_LINES) is the first patron
voice, keyed by game/cast's species strings so the prize session
extends it, never replaces it.**

The ask: the patron at the table needs a collider so wild shots (and
frosting) can hit HIM — followed by a shake-it-off animation and a
patron-voice scold to put the frosting on the CAKE. Tone guard holds:
annoyed, never hurt; the wild shot deserves the laugh.

THE RULED SHAPE:
- **Per-species colliders, authored in the patron workflow** — a
  coarse primitive set (body/head/limb capsules, 3–6 shapes) authored
  as named markers in each rig .blend and exported by script to a
  CHECKED-IN DATA TABLE. core/ runs headless and cannot read GLBs
  through three.js — the collider is DATA in code, never mesh. Coarse
  is correct: comedy physics needs "the bounce lands on the body,"
  not mesh accuracy. The road recipe (rig → diet → smoke) grows a
  collider-authoring step.
- **On/off rides the DEAL BOUNDARY, not a client signal.** The
  authority correction (discussed and explained): the client can
  never tell the sim anything about presentation — the sim must reach
  the same answer on the server and every replica by itself. It
  already can: species = castIndexForRung(rung) is pure math, and the
  deal boundary is sim truth. Collider ON at the fresh deal (the
  giant visibly stands at the mark all order), OFF at the verdict
  (exactly when the walk theatre plays). Same lifecycle the dessert's
  own per-deal colliders already ride. Residue: during the linger a
  shot passes THROUGH the visibly departing giant — order's over,
  nothing scores, he's leaving; accepted.
- **Promotion pressure, named:** the sim needing rung→species pulls
  castIndexForRung toward game/ (the mapping-home ruling said promote
  with species orders). The slice may promote the mapping early, or
  ship a minimal core-side species table and let the prize session
  finish the move — claimer's call, both legal.
- Frosting ON the giant is client juice (a temporary splat decal/blob
  on the body), NEVER census — the cake's census is the only scoring
  surface.

Rider noted, not scoped: the scold line is the first PATRON VOICE in
the game — it previews the species-voice work (the prize session) and
should be written to survive it.

## 17. THE LIGHTING PASS — sun, moon, shadows, town lighting — UNCLAIMED

**Status: recorded 2026-07-12 (eighteenth session, visionary's eye
pass). An aesthetics slice with a perf gate.**

The ask: real environment lighting — a sun and moon, cast shadows,
town lighting. The cost is FRAME TIME, not bytes: shadow maps over a
500 m-far region with 40 m giants means cascade work, and plans/16
§4's perf law (a party game holds 60) makes before/after measurement
part of the slice, not a follow-up. The atmosphere rule (fourteenth
session: near_/mid_ lit + fogged, far_/sky_ unlit + fog-exempt) is
the standing contract any light rig must respect — far geometry wears
BAKED haze and must not suddenly receive shadows.

Sequencing note: item 19 (per-patron weather) wants night, mist, and
mood — the weather design session INHERITS whatever rig this pass
builds. Land a basic movable sun + shadows first; don't design the
full mood system here.

## 18. THE BAKERY, THE PANTRY, THE STALL — fleet build — UNCLAIMED

**Status: ruled 2026-07-12 (eighteenth session): built by the BLENDER
DESIGN FLEET — the research/18 loop (REGION STRUCTURE RULES + THE
SCRIPT CONTRACT, scripts tracked in project/blender/region-scripts/)
that shipped sixteen structures fifteen-for-fifteen.**

The ask: construct the siege bakery itself from the reference images,
plus the pantry (the ammo run's anchor) and the stall (the shop's
body). Turnarounds are already on disk: project/blender/bakery/
(front/top/back). A catapult turnaround also arrived
(project/blender/catapult/, four angles) — that one belongs to the
standing machine-dress culture (nose=+Y, drive nodes, dress()
abort-to-greybox), recorded here so it isn't orphaned.

Constraints binding the fleet run: the winding audit is LAW (Blender
renders are not a winding oracle — BVH ray-parity before export; the
watchtower door lesson); greybox fallback preserved (assetless boot);
the diet pipeline (`npm run diet`) on anything textured; concept art
of record is project/concept/. The bakery is the biggest prop yet but
it is a BUILDING — no rig, no poses; the pantry and stall dress
existing gameplay anchors.

## 19. PER-PATRON WEATHER — OWN FOCUSED DESIGN SESSION (do not fold in)

**Status: ruled 2026-07-12 (eighteenth session): this gets ITS OWN
design session — deliberately NOT folded into the species-orders +
voice session, and not built casually before it.**

The shape (visionary): each patron brings environmental effects with
him — the frost giant's snowfall, rain, night, mist, an ember dusk —
the world changes because HE is at the table. The strongest form of
the unified fiction: the line doesn't just stand in the world, it
DRIVES the world.

The boundary the session must rule FIRST: **cosmetic vs gameplay.**
Cosmetic weather (particles, sky, fog tint, light mood) is
client-derived from the same rung→species mapping as everything else
— deterministic, zero protocol, zero core/. Gameplay weather (wind
bending ballistics) crosses into core/ and touches the envelope every
pinned coverage number was measured under — that is a SYSTEM, and
wind is already an ownerless re-pin item in the standing ledger.
Recommendation on record: cosmetic-only first pass; wind stays a
named later door.

Dependencies: item 17's light rig (night needs a moon); the
atmosphere rule's name-prefix contract (baked far haze vs live
weather must not fight); cast.ts stays the single mapping.

## 20. THE WALK FEEL PASS — giants stride like giants — CLAIMED 2026-07-12 (eighteenth session, the eat-beat wrap)

**Status: recorded 2026-07-12 (eighteenth session; Chronus's eat-beat
wrap-up notes, physics-checked). A ONE-SESSION dials pass with the
visionary's live eye — no slice, no design session. CLAIMED same
session with item 21 (plans/21 build lane head).**

The diagnosis: it's the CADENCE, more than the ground speed. Froude
similarity says a 36 m biped strides ~once per 2 s at ~6 m/s; we ship
a step every ~0.5 s (human scurry) and a 66 m/s departure (highway
speed). The scurry is what reads as "small creature scaled up."

Differentiated dials, each walk has its own deadline:
- **Departure:** no deadline — drop to a true amble (~10 m/s reads
  stately without taking a minute to reach the fog).
- **Arrival:** bounded by the linger (fresh deal 18 s, departure
  fires ~7.7 s → ~10 s of walk before the deal-edge snap teleports
  him). A physically honest ~5 s walk fits with room to spare. NAMED
  TENSION: the gap was shortened 66→50 because the arrival read
  long; slowing the walk re-lengthens the moment. Bet on record: a
  slow heavy arrival beats a short scurry — the eye rules at the
  dials.
- **Line advance:** 150 frames for 42 m — pure cosmetic lerp, can
  stretch to ~300–360 frames freely.
- **The bob:** 0.35 m on a 36 m body is 1% of height — invisible.
  Slower phase, deeper bob (~0.8 m), more rock.

CLEANUP RIDER, do it FIRST: the walk constants are duplicated between
patron-table.ts and line.ts — unify in one home or we tune two copies
forever.

## 21. THE FRAME MOVE — the polaroid vs the eat beat — CLAIMED 2026-07-12 (eighteenth session, the eat-beat wrap)

**Status: recorded 2026-07-12 (eighteenth session; Chronus's note +
this session's code check). CLAIMED same session with item 20
(plans/21 build lane head). The eat beat (shipped 4fd0533) made this
urgent: the giant stands at +x — SCREEN RIGHT — and the whole eat
theatre (arc, CHOMP, sparkle) plays in the upper right BEHIND the
photo. Photo-then-eat wants your eyes in the same corner in the same
seconds. We built the trailer shot and hung a photo over it.**

The corner map: top-left = order checklist (#hud), bottom-left =
gunner post panel, top-right = photo + mute.

VERIFIED THIS SESSION (code, hud.ts hudLines): the corner checklist
does NOT clear during the linger — checks rows render whenever the
run phase is live. BUT the end-of-order banner already carries the
checklist to name the culprit, so the corner copy is REDUNDANT
exactly during the linger. Recommended shape: **collapse the corner
checklist at the verdict edge** (the banner owns the culprit) **and
move the photo to top-left** — a perfect timeshare of the corner.
Fallback if the collapse is unwanted: bottom-left, accepting a rare
overlap when someone mans the gunner post mid-linger.

Laws that follow the move: item 3's column carve (the proclamation
yields the photo its column) MIRRORS to the new side; the pending
polaroid tween (plans/16 slice 7, big-center → corner) must land
inside the law wherever the corner ends up. CLOSABLE: deferred,
likely permanently — pointer-lock means closable = another key to
teach for an 18-second frame; the move alone probably dissolves the
itch.

## 22. PATRON MOTION — fidgets, gait, and the leg question — DESIGN DISCUSSION BEFORE TIER (c)

**Status: recorded 2026-07-12 (eighteenth session: visionary's
variety note + Chronus's rig facts). Three tiers, cheapest first;
tier (c) needs a design discussion before boning (the dragon
precedent).**

The load-bearing fact: the ogre-recipe rigs are ~10 bones, NO LEG
BONES — legs are mesh only. A real walk cycle is not an animation
task, it is RIG SURGERY × 6 biped species (hips/thighs, dot-free
names, weights, re-diet, re-smoke) plus a shared gait driver.

- **Tier (a) — fidgets + species pose tables (existing bones,
  cheap, anytime):** idle gestures seeded off the queue-index
  individuality (the breath-desync culture — a giant keeps his
  habits as he advances, every client computes the same fidget at
  the same moment). SPECIES_POSES already carries per-species
  verdict variants; more rows = more variety, table-driven like the
  music playlist. The cyclops checks his spotting gear; the treefolk
  sways; the queen has queenlier angles (standing eye note).
- **Tier (b) — the gait AUDITION (existing bones):** arm-swing +
  spine counter-twist at stride cadence. Counter-phase arm swing is
  disproportionately convincing — it may carry to friend-test
  standard for the cost of a patron-body rider. Whether it lands on
  the right side of "good enough" is an audition question (Blender
  render, the visionary's eye), not an argument.
- **Tier (c) — leg rigs + gait driver (the real slice):** only if
  (b) auditions short. Design-discuss before boning.

THE SLICE OWNS TWO ORPHANS: the walk-bob sync sibling (all advancing
giants bob in step — a gait question, now homed) and **STEP EVENTS**
— the gait driver knows the exact frame each foot plants. Step
events are the hook item 23 consumes; they exist from tier (b)
onward (stride cadence is the clock, legs or no legs).

## 23. THE EARTH SHAKES — booming steps, camera shake, the bop — UNCLAIMED, gated on item 22

**Status: recorded 2026-07-12 (eighteenth session). The bop is RULED
FAIR (visionary): giants move during the linger, and being rattled
because a giant stomped past you is the world — "environment and
hazards off the job of being a siege baker." Build order is LAW:
nothing here keys off the current fake bob — everything consumes
item 22's step events, or we wire it twice.**

Three organs, one footstep clock:
- **The mixing law (SFX, slice 6 rows):** the line advance is ONE
  designed sound — a composite earth-rumble for the whole queue; the
  fiction supports it (the ground complains once), and ten
  independent booms are mud. Individual step booms only for the NEAR
  FIELD (table patron + nearest line actor) with distance rolloff;
  standees and impostors are silent scenery. The per-giant stride
  desync (item 22's sibling, the breath-desync culture) makes near
  steps interleave instead of stomping in unison.
- **Camera shake:** client juice off locally-known footfalls,
  distance falloff (a far-line shuffle murmurs; a 38 m queen walking
  past is an event). Needs an intensity/off toggle — the classic
  motion-sickness item; plans/20 §5 owns the knob.
- **The bop:** a small local impulse on YOUR OWN baker from nearby
  footfalls — each client is authoritative over its own baker, so
  this is client-only, no protocol, no core/ change. Small hops,
  never control theft (the tone guard applies to game feel). Radius
  tight: near the table or the road.

## 24. NPC HELPER GIANTS — shape noted, unruled — AWAITS DESIGN ATTENTION

**Status: shape recorded 2026-07-12 (eighteenth session, visionary's
aside in the bop ruling). No action; recorded so it isn't lost.**

The shape: NPC giants helping move the cakes from the bakery to the
serving mark — ambient world-labor that would make item 23's bopping
an IN-GAME hazard, not just linger comedy. It answers a standing
fiction question nobody asked out loud (how does a 5 m cake get to
the mark?) and could give the redeal reset a second fiction beside
the eat beat's. Belongs to a world-life / fiction design session —
natural neighbor of item 19 (weather) or the species session;
whichever seats it first should also decide whether the eat beat's
later "cake LIFT dress pass" (plans/16 slice 7) is the same machinery.

## 25. THE TRAINING LOBBY + THE OPENING PARADE — RULED, UNCLAIMED

**Status: shape RULED 2026-07-12 (eighteenth session, third
discussion, born of repeated playtests): no cake in the lobby — a
PRACTICE CAKE target; horizon-only crowd plus the BENCH OGRE; the
WALK-UP PARADE at run start.**

The rulings:
- **NO CAKE BEFORE THE ORDER.** The dessert arrives WITH the first
  order — the fresh deal gets its opening fiction. (The eat beat gave
  the redeal its fiction; this completes the dessert's lifecycle as
  story: arrives at open, devoured per order, redealt.)
- **THE PRACTICE CAKE** (ruled over a plain ring butt): a carved
  wooden dummy cake at the cake mark, painted rings on its tiers —
  clearly not the real dessert, but it teaches the actual test (tier
  zones, the ledge, the crown shot) and lobby aim transfers exactly.
  Static prop with a sim collider on BOTH replicas, swapped at the
  run boundary — the third member of the phase-scoped-collider
  institution (dessert per deal, giant capsule per deal, target per
  run). The lobby stays the training ground OFFICIALLY: machines
  live, item 15's verdict speaks here too (green = hit the practice
  cake — a stakes-free classroom for the feedback system).
- **THE HORIZON CROWD:** the lobby ships far impostors only (~495
  KB); no near giants except—
- **THE BENCH OGRE:** the founding patron waits at the GIANT REST
  STOP the region already carries (s15 fleet: bench, table-with-bun,
  lantern). The opening pin makes it canon, not decoration — rung 1
  is ALWAYS the ogre, so the giant on the bench IS the first
  customer. OPEN engineering question (audition decides): the rigs
  have no leg bones, so a true SIT needs a pose-baked resting
  variant (a fleet-able one-off export); the cheap honest first form
  is a LEAN against the bench/lantern on existing bones.
- **THE OPENING PARADE:** at ALL-IN the sim starts rung 1 on
  schedule — core/ and game/ untouched, the parade is pure client
  theatre. The bench ogre rises and walks to the table while the
  crew scrambles for ammo (5–10 s of anticipation inside a 2+ minute
  order — players are running to the pantry anyway); the line
  strides in from the horizon staggered behind him. LOADING AS
  FICTION: giant templates stream during the lobby, and the line's
  existing rebuild-on-template-arrival means "the model is still
  downloading" and "he hasn't arrived yet" are THE SAME SENTENCE —
  holes in the parade fill as assets land.
- **THE LOADING FOLLOW-ON:** this ruling rewrites plans/20 §2's
  critical list — the cake and the current patron LEAVE it (critical
  becomes: engine, practice cake, catapult, baker). First-interactive
  drops by ~18 MB of giants plus the dessert.

Costs named (build-time checks, not blockers): what the Room holds
pre-run today (whether a dessert is dealt in lobby — frosting census
and a few __game smoke recipes assume the lobby cake); item 1's
lobby-rings behavior and the memory smoke recipes retarget to the
practice cake. The target→cake swap at run start ships PLAIN; its
dress (item 24's helper giants carrying the target off and the cake
in) is a later pass and the fiction's natural closing loop.

CROSS-NOTE FROM ENTRY 4 (2026-07-12, twentieth session): item 16
shipped an INTERIM lobby-collider rule — game/cast.ts's patronAtMark
stands rung 1's patron at the mark through lobby/countdown, because
until this item builds, the lobby's visible ogre must bounce warmup
shots. This item RAZES that branch with the lobby giant: the deletion
is patronAtMark's final `return speciesForRung(1)` lines (isolated
there on purpose — one place, one line), replaced by whatever this
item's empty-table truth is; the practice cake's own collider takes
the lobby's physics from there.

## 26. THE CLOCK RELIEF — the solo clock is tuned past human — BUILT

**Status: BUILT 2026-07-12 (twentieth session, same sitting as entry
4). Menu (a) + (b) as recommended, numbers derived by the (c) study
(research/20 — calibrated on the one real measurement, his
miss-by-~5s): CREW_CLOCK [0, 1.25, 1.0, 1.0, 1.0] in tuning.ts,
applied at the deal in OrderFlow.freshOrder — the RUNGS rows stay
VERBATIM (the anchor law untouched), both replicas read the broadcast
ticksLeft, nothing new syncs. Rung 1's row 150 → 180 (not the anchor;
"a fumbling first-timer feeds the ogre while learning the winch").
Solo rung 1 now deals 225 s (~162 s effective) — the designer's
~113 s line passes with real room; rung 2+ solo remains the ladder
that outruns one dwarf (the fiction holds — the factor relieves, it
does not conquer). Duo clocks: ZERO drift (the caution honored;
rung 1 duo gains only the row's +30 s tutorial slack). THE ONE DIAL:
his next solo run moves CREW_CLOCK[1] (or rung 1's row) — nothing
else. Live-verified: solo boot deals rung 1 at 3:45, HUD wearing the
one-pair-of-hands tag. Pins: order-flow.test (stretch, zero-drift,
clamps, rung 1 = 180), room.test (the cupcake deal prices the lone
hero's clock over protocol).**

**Original record (eighteenth session): visionary's playtest — going
as fast as he can, he cannot meet rung 1's threshold. URGENT — the
tutorial rung fails its own job.**

THE STRUCTURAL FINDING: the order clock is CREW-BLIND. parShots
scales solo/duo and pay stamps order.hands, but clockSeconds is the
same for one baker as for four — solo workload is ~2× per second on
the same clock. Rung 1 math: solo par 11 shots × a full solo ferry
cycle ≈ 140+ s of flawless play against 150 s. The designer's
playtest is the first real measurement of the row.

The fix menu, discussed (visionary's floor proposal: +5 s, possibly
across the board):
- **(a) RECOMMENDED — hands-aware clock AT THE DEAL:** the deal
  already stamps order.hands (the lone-hero pricing seam); apply a
  solo clock factor where the order deals, so the RUNGS rows stay
  VERBATIM — rung 3's anchor law ("never rebalanced from here")
  survives untouched, both replicas derive the factor from broadcast
  state, one constant, deterministic.
- **(b) RECOMMENDED WITH (a) — rung 1 tutorial generosity:** if the
  DESIGNER misses by ~5 s, a first-time stranger misses by 30+.
  Rung 1's standard is "a fumbling first-timer feeds the ogre while
  learning the winch" — real slack (180 s territory, or a lower
  frost ask), not a shave. Pressure is rung 2+'s job.
- **(c) the measurement rider:** a headless study script computes
  PERFECT-PLAY minimum time per rung (cycle math × par shots, solo
  and duo); clocks become perfect × comfort factor — derived like
  the envelope numbers, tuned by playtest as ONE dial. The re-pin
  law's spirit applied to time.

Caution on record: the friend test played DUO under current clocks
and "it's fun" — relieve solo hard and rung 1 especially; touch
multi-crew timing only if playtests ask. A flat +5 across the board
is the bluntest option and quietly edits the anchor row.
