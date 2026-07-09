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
beautiful."**

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
the next aesthetics slice, not this one.**

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
dist/audio ships. Speakers eye(ear)-pass: the visionary's next run.**
