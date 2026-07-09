# Handoff — 2026-07-09 (ninth session) — THE AESTHETIC PASS: TRAILS, POST HUD, JUKEBOX ALL LIVE; NEXT: REVIEW + TECH-DEBT HUNT BEFORE THE FRIEND TEST

## 1. Snapshot

The pre-friend-test UI/aesthetic pass ran this session: four slices
built, live-verified, and visionary-approved ("it is all working as
we intended"). Projectile trails (plans/15 item 4), the post-local
HUD (item 5, promoted), background music with a mood-keyed playlist
table (new item 10), lobby songs + a mute button. The no-preview-arc
design boundary is recorded (item 9). 386 tests, both tsc legs,
ending 9a41398. Every pre-friend-test ledger item is now DONE. The
friend test (plans/12) runs on the WEEKEND. Next session, per the
visionary's explicit agenda: (1) review this session's work, (2)
hunt tech debt, (3) discuss what else can land before the friend
test — every improvement makes the test less likely to fail or be
misinterpreted.

Four commits:
- 6328366 side quest 4 (trails) + item 9 boundary
- 176b5f9 side quest 5 (post HUD + pink/cyan tone)
- cc8bbdc the jukebox (music.ts, order songs)
- 9a41398 lobby songs + mute button

## 2. What changed this session

TRAILS (6328366, discussion-first per the standing sequence):
- Rulings: RIBBON (not puffs, not 1px lines) — custom camera-facing
  triangle strip, translucent normal-alpha, topping-colored; 0.6s
  window sampled on the FIXED TICK (36 @ 60Hz); grains NEVER trail
  (quiet-grain law; carrier trails to the pop); no persistence after
  landing (the ring is the landing record); every player sees every
  arc by architecture (shots are broadcast events) — zero extra work.
- TrailRibbon in shots-view.ts: preallocated BufferGeometry,
  4-component (RGBA) vertex colors — three.js native, no shader;
  frustumCulled = false (the sprinkles empty-birth culling lesson).
  Dials: TRAIL_WINDOW_TICKS 36, TRAIL_HEAD_ALPHA 0.45, TRAIL_WIDTH =
  PROJECTILE_RADIUS, width+alpha taper to the tail. sync(camera) grew
  the parameter (main.ts sole caller) for billboarding.
- Law added in build: a ribbon leaves when its arc dissolves AND its
  body is gone or at rest (TRAIL_MIN_SPEED_SQ) — found live: 159 idle
  ribbons behind settled lobby cherries (the rings pile-up in
  scene-graph form). Lobs wear ribbons; litter doesn't.
- Tests +5 (real physics over a floor collider). Eye-passed by the
  visionary: "the trails are beautiful."
- Item 9 recorded: pre-shot preview arc is a DESIGN BOUNDARY. Our
  flight is a pure parabola so a preview is trivially computable —
  that is why the boundary is written down. Trails are feedback; a
  preview is an answer key that guts walk-the-fall learning. A future
  wish = design session, never a tuning tweak.

POST HUD + TONE (176b5f9, item 5 promoted by the visionary into this
pass, discussion rulings: winch panel DEAD CENTER and BIG — the
tensioner's only job is the number; gunner cluster BOTTOM-LEFT —
center stays clear for aiming; bucket state unmissable; style = clear
modern BRIGHT, pink/cyan, fantasy, Vegas energy — show numbers big,
celebrate changes; tone in DOM/CSS now, diegetic Blender later):
- posts.ts POST_KEYS — THE ONE KEY TABLE (ledger constraint b):
  postOp reads it, panels render caps from it, hud.test pins them
  EQUAL (never literals). postOp behavior verbatim (posts.test
  untouched and green). Global keys outside the table are listed in
  its comment (WASD/Shift/E/Esc/M) so the namespace stays audited.
- hud.ts postPanel (pure, tested): WinchPanel {clicks, max, fillPct,
  lastFired, keys} / GunnerPanel {traverseDeg, tiltNotch/Deg, ladder,
  loaded, last, keys}. Manned-post lines LEFT the corner block;
  on-foot invitations stay. HudView grew lastShot.
- LastShot memory (constraint a): main.ts records per-town off the
  shot broadcast (fx.spawnShot) — client-only, no wire change.
- post-hud.ts (NEW, thin DOM painter, untested by design — Node has
  no DOM; the pure builder carries the pins): rebuilds ONLY on
  structural change (that retriggers the .pp-pop CSS animation);
  continuous values (crank fill, traverse) patch in place per frame.
- index.html: #post-hud element + full CSS vocabulary (neon glow,
  keycap chips, skewed click segments, bucket chip in topping color
  via --tc + color-mix, pp-pop/pp-breathe animations); corner #hud
  got a card (box-sizing: border-box keeps item 3's column law).
- Tests 379. Live: E-manned both posts via dispatched KeyboardEvents,
  winch 2/10 + live 78% fill + "last shot flew at 2" after a wire
  lever; gunner FUDGE LOADED chip, +21.5°/+7.5°, caps from the table;
  pointer-events none verified; screenshots taken.

JUKEBOX (cc8bbdc + 9a41398, scope discussed first, visionary agreed
all four recs: order-only initially, 1.5s fade out, BG_VOLUME 0.35,
M mute):
- music.ts (NEW): PLAYLISTS mood table — THE TABLE IS THE FEATURE:
  future songs are drop-ins (copy to public/audio with a slug name +
  one row, no code). Filled: order = [kitchen-chaos, kitchen-mayhem],
  lobby = [hearth-harvest, hearthside-yeast]. Named and waiting:
  linger (the 18s interlude), runover (the fatality) — the visionary
  is composing them.
- Laws: nextTrack pure + pinned (random, never repeats with n>1 —
  n=2 alternates, his spec); deriveMood pure + pinned (running→order;
  won/lost during linger→linger; runover→runover; lobby+countdown→
  lobby; the finish-it window keeps the ORDER's music). Fades:
  FADE_OUT_MS 1500 / FADE_IN_MS 800, run by step(dtMs) from the frame
  loop (wall time on purpose — ambience, not sim). Autoplay: play()
  rejects until a real gesture; MusicBox retries on first pointer/key
  (the pointer-lock click is the natural unlock). Clients unsynced by
  design. Math.random legal (client-only, never touches core/game).
- Mute: M key + #mute-btn upper-right (M's clickable twin — the iPad
  rider has no M key). Button laws: the ONE overlay with
  pointer-events auto; painted UNDER #snapshot (the photo wins the
  linger corner; clicks pass through its pointer-events: none);
  BLURRED after every click — a focused button turns Space into
  "click" and Space WINDS THE WINCH. Icon follows state from both
  paths. toggleMusic() in main is the single shared path.
- Files: public/audio/ is the COPY OF RECORD (Vite → dist/; the room
  server serves dist/ — the friend test streams through the tunnel;
  dist/audio verified after npm run build). project/files/audio/ is
  the visionary's raw inbox, now GITIGNORED.
- Tests 386 (music.test: nextTrack, deriveMood, table shape). Live:
  lobby silence → ready-up → order kicks in at exactly 0.35 (real
  preview_click unlocked autoplay), synthetic 'ended' → the other
  song seamless at volume, fade 0.35→0→0.35 both ramps, mute both
  ways without stealing focus, lobby handoff alternates.

## 3. Architecture and invariants (new this session)

- Trails: client-only juice in shots-view.ts; samples on the fixed
  tick, billboards on the frame; grains never trail; ribbons release
  at rest — nothing in the trail system can grow unboundedly.
- Preview-arc boundary (plans/15 item 9): never build a pre-shot
  predicted arc casually. Recorded next to item 7's 55° floor.
- POST_KEYS is the one key table: any new post key goes IN THE TABLE;
  postOp and the panels both read it; hud.test pins equality. Global
  (non-post) keys are listed in its comment.
- The ticket... (unchanged eighth-session laws stand: ask = REACH ×
  LABOR at deal time, hands stamp, anchor seam full labor — plans/13
  §5 BUILT block.)
- Overlay laws: every overlay is pointer-events none EXCEPT #mute-btn
  (deliberate, documented); #mute-btn blurs after click (Space guard);
  #post-hud paints before #banner (proclamation wins); #mute-btn
  paints before #snapshot (photo wins).
- post-hud render discipline: innerHTML rebuild only on structural
  key change (drives the pop animation); continuous values patch in
  place. Do not move fillPct/traverse into the rebuild key.
- Music: PLAYLISTS rows are the only edit point for new songs;
  public/audio is the shipped copy of record; project/files/audio is
  gitignored. MusicBox is deliberately untested (Node has no <audio>);
  keep decidable logic in the pure functions.
- The determinism law is untouched: everything this session is
  client/ presentation; core/game unchanged.

## 4. File map (delta)

- src/client/shots-view.ts — TrailRibbon + trails lifecycle; trail
  dials; sync(camera).
- src/client/shots-view.test.ts — trails suite (real physics, floor
  collider rig).
- src/client/posts.ts — POST_KEYS table + PostKey; postOp reads it;
  key-namespace comment.
- src/client/hud.ts — postPanel/WinchPanel/GunnerPanel/KeyHint/
  LastShot; manned lines removed from hudLines; controls line + "M
  music"; arcGlyph home note updated.
- src/client/post-hud.ts — NEW: PostHud DOM painter.
- src/client/hud.test.ts — postPanel suite incl. one-table law; view
  helper now module-scope; manned-lines-absent pins.
- src/client/music.ts — NEW: PLAYLISTS, BG_VOLUME, fades, nextTrack,
  deriveMood, MusicBox.
- src/client/music.test.ts — NEW: the pure laws + table shape.
- src/client/main.ts — lastShot record in fx.spawnShot; PostHud +
  postPanel wiring; music (setMood/step per frame, M key, mute
  button, toggleMusic); dtMs captured; __game.music exposed;
  sync(camera).
- index.html — #post-hud + #mute-btn elements; the pink/cyan CSS
  vocabulary; #hud card.
- public/audio/ — kitchen-chaos, kitchen-mayhem, hearth-harvest,
  hearthside-yeast (copies of record).
- .gitignore — project/files/audio/ (the raw inbox).
- project/plans/15-side-quests.md — items 4, 5, 10 DONE records;
  item 9 boundary; item order 1–10.

## 5. How to run, test, verify

npm run check (386 green at 9a41398). Live verify: preview_start
"dev" (autoPort — the visionary's own server usually owns 5174/5175;
never kill it). Driver facts added to memory game-smoke-driver-notes
this session: window probes must store COPIES not references (a live
object mutates before the read — the trail age-37 ghost bug);
synthetic dispatchEvent(KeyboardEvent) drives app listeners (E-man,
M-mute) but does NOT grant browser user-activation — preview_click
DOES (trusted CDP input; it unlocked autoplay); __game.shots.spawn(
shotMsg) exercises the full client shot lifecycle without the room;
window.__timeScale exists ONLY inside the worker-shim harness (inert
on a visible page). __game.music is exposed (JS access to private
fields works for el/mood/target).

## 6. Open items and decisions

DECIDED THIS SESSION (do not re-litigate):
- All trail rulings + the preview-arc boundary (item 9).
- All post-HUD rulings (placements, bucket chip, tone: bright
  pink/cyan fantasy, Vegas methods for fun — the visionary wants
  epic and over the top; Blender diegetic interfaces later).
- All jukebox rulings (order-only + lobby now; fades; 0.35; M +
  button; unsynced clients; the drop-in table workflow).
- Flash toasts (SPLAT!/pay center-screen celebration) DEFERRED — the
  natural next aesthetics slice; the CSS vocabulary is ready.

OPEN:
- Ear/eye passes pending on the visionary's next run: music volume
  0.35 + fade feel; winch panel center coverage while cranking; fudge
  chip legibility; item-3 banner composition; lone-hero HUD tag.
- Linger + runover playlist rows: waiting on the visionary's next
  compositions (drop-in workflow).
- Feel-pass watches standing: rung pacing above rung 1 (weekend duo
  data), the finish window's 15s, cupcake hot-arrival,
  fudge-counts-toward-frost, §5 prices/pay scale.
- Standing: audit tranche C post-friend-test (snapshot-encode hitch,
  litter growth); wind plan + Bite/integrity re-pin ownerless;
  plans/15 items 6 (power-ups) + 8 (run points) await the
  post-campaign design session.

## 7. Next session focus

The visionary's explicit agenda, in order:
1. Review this session's four commits.
2. Hunt tech debt across the session's new surfaces (post-hud.ts
   innerHTML paths, music.ts shell, trail lifecycle, main.ts wiring
   growth — main is getting long).
3. Discuss what else can land before the WEEKEND friend test —
   framing: every improvement makes the test less likely to fail or
   be MISINTERPRETED (candidates: flash toasts, the pending eye/ear
   passes, any debt found in step 2).
Then the weekend: the friend test (plans/12, runbook current) — it
measures the duo cycle, and its observations set the following
session's agenda.

## 8. Recommended reading order

1. This handoff.
2. project/plans/15-side-quests.md — items 4, 5, 9, 10 records (this
   session) + the standing items 6–8.
3. src/client/music.ts, src/client/post-hud.ts, src/client/hud.ts
   (postPanel block) — the new surfaces the tech-debt hunt reviews.
4. src/client/shots-view.ts — TrailRibbon.
5. src/client/main.ts — the wiring growth (debt candidate).
6. git log --oneline -6 — the session's commits.
7. project/plans/12-friend-test-runbook.md — before the weekend.
8. CLAUDE.md current-state paragraph.
