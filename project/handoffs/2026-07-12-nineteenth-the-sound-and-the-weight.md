# Handoff — 2026-07-12 (nineteenth session) — SOUND BUILT, THE WEIGHT SHED, ENTRIES 2+3 STRUCK

## 1. Snapshot

Eight commits, all pushed, tip 0cb6840, working tree CLEAN (first time
in three sessions — the visionary's plan amendments and the turnaround
sheets are committed on his word). 459 tests, both tsc legs. THE PATH
entries 2 and 3 both fell this session: (2) SOUND — plans/16 slice 6
built after a same-session design walk (his refinements ruled, one
pushback adopted); (3) THE WEIGHT — draco adopted, KTX2 deferred,
192 kbps stays, the loudness ruling, the release gate built. Fresh
dist 23.61 MB — UNDER the 25 alarm. Next session (visionary's words):
entry 4 THE FEEDBACK PAIR — review first, then DISCUSSION before any
work.

## 2. What changed this session

- 397300d SOUND (slice 6): sfx.ts NEW (one AudioContext, decoded
  buffers, per-play source→gain→master; SFX_TABLE key→list;
  distanceGain), audio-bus.ts NEW (THE VOLUME BUS, plans/20 §5 — M
  mutes the bus, both engines poll it), scripts/make-sfx.mjs NEW
  (reproducible synth — the script is the recipe; 8 wavs ~100 KB into
  public/audio/sfx/), MusicBox refactored onto the bus, ClientFx port
  threaded (shots-view.step(dessert, fx); EatTheatre + PatronTable +
  ReportView + NetFx gained optional sound). Rows wired: winchRatchet
  (tension-delta poll in main), leverThunk (shot broadcast + dry
  release), lobWhoosh, splat/plop/pop (AT the item-13 word sites —
  pairing law pinned), chompDevour/chompBegrudge (CHOMP edge),
  verdictDelighted/Refused/Hungry (report show edge, rows SILENT),
  grumbleRumble (patron flash line, row SILENT). 10 new pins.
- 9ad4f95 THE RELEASE GATE: scripts/release.mjs — npm run release =
  check → fresh build → size report vs 25 MB budget → diet
  verification (≤1024 textures, no PNG, no >4.5 MB GLB) → untracked-
  shipping-asset scan. All gates run before verdict. Boot smoke +
  package are TODO organs (plans/20 §8 organs 6-7).
- de6c391 DRACO ADOPTED: all 14 public/models GLBs compressed in
  place (23.9 → 8.5 MB; cyclops 3.39→1.25, region 2.12→0.10);
  node/bone names + skins verified byte-identical BEFORE adoption;
  decoder self-hosted public/draco/ (wasm+wrapper 245 KB, NO js
  fallback — wasm-less boots assetless); assets.ts = one lazy shared
  GLTFLoader+DRACOLoader; model-diet.mjs ends with draco() pass (IO
  registers encoder+decoder — re-dieting compressed GLBs is legal).
  KTX2 DEFERRED, why recorded (plans/15 item 14): textures already
  small JPEG; real win is GPU memory, not today's pain.
- 627fa6c THE LOUDNESS RULING: BG_VOLUME 0.35 → 0.4 as CEILING;
  bus.music default 0.5 → ~20% effective. Pinned: ceiling ≤ 0.4,
  ceiling × rest ≈ 0.2. (Born of the 96k audition: fizzy cymbals AND
  "too loud" — 192 kbps STAYS, audio untouched.)
- 041266d DOCS: path entries 2+3 struck, item 14 menu CLOSED.
- b387456 DOCS: the visionary's amendments committed on his word
  (item 25 training lobby, plans/21 → 8 entries, plans/20 §2
  critical-list rewrite).
- 0cb6840 ASSETS: turnaround sheets committed (7 species + bakery/
  catapult/wall/dwarf + dwarf PSD, ~17 MB; raw meshy blends stay
  external).

## 3. Architecture and invariants (new this session)

- SFX KEYS SPEAK GAME LANGUAGE (his rule, applied to his own list —
  pushback adopted): chompDevour not chompLoud, verdictRefused not
  raspberry. Rows are LISTS — dropping variants in IS the audition
  (nextTrack rotates, never repeats at n>1).
- THE CLIENT FX PORT (ruled over a singleton): ClientFx = {flash,
  sound}. World views receive it; tests pass noops. The word and the
  sound land as ONE announcement (item 13's pairing law — pinned in
  shots-view.test.ts).
- THE VOLUME BUS: audio-bus.ts is plain mutable state; both boxes
  POLL per frame (no events). M toggles bus.muted. Every dial read
  funnels through clampLevel. Settings panel later grows knobs; clamp
  at write when it does (setBus stores raw today).
- LOUDNESS LAW: BG_VOLUME is the music CEILING (0.4); effective =
  ceiling × bus.music. A settings knob can never exceed 40% by
  construction.
- SPATIAL LAW: distance scalar only (distanceGain, 120 m radius,
  0.12 floor), no PannerNode. World-anchored sounds pass `at`;
  mechanical sounds at your own machine play flat. Garbage distances
  resolve LOUD (heard and fixed, never swallowed).
- SUSPENDED CONTEXT DROPS PLAYS: a late splat is a lie. sound() also
  records nothing when the row hasn't loaded — the played ring
  (__game.getSfx().played) only shows real plays.
- DRACO IS THE DIET'S CLOSING PASS: every future model through
  npm run diet comes out compressed. The hard-fail name law held —
  verify names/skins on any new compression tooling.
- THE RELEASE GATE IS THE FRESHNESS LAW: npm run release before
  anything ships. It failed honestly twice this session (overweight,
  then its own uncommitted decoder) — that is it working.
- STEP BOOMS STILL DEFERRED (wire-it-twice law): item 23 consumes
  item 22's step events; nothing keys off the fake bob.
- Silent rows are DROP-INS: verdict stings + grumble start sounding
  the moment files land in public/audio/sfx/ + a table row. No code.

## 4. File map (delta)

- src/client/sfx.ts — SfxKey union, SFX_TABLE, SfxPlayOptions/SfxFn/
  ClientFx types, distanceGain (pinned), SfxBox (thin browser shell,
  debug() = smoke seam). sfx.test.ts — falloff, table shape, bus
  defaults, loudness ruling pins.
- src/client/audio-bus.ts — AudioBus, createAudioBus (music rests
  0.5), clampLevel.
- src/client/music.ts — MusicBox takes bus; BG_VOLUME = 0.4 ceiling;
  level() derives targets; step() syncs el.muted.
- src/client/main.ts — bus/sfx/sound created before consumers;
  fxPort; lastWinchClicks metronome poll; sfx.step + setListener per
  frame; leverThunk+lobWhoosh in NetFx.spawnShot (own town);
  __game.getSfx/getBus/setBus.
- src/client/shots-view.ts — step(dessert, fx: ClientFx); sounds
  inside the own-town word branches.
- src/client/eat-beat.ts — EatTheatre 4th param sound?; chomp() fires
  the sting at the mouth.
- src/client/report-view.ts — 3rd param sound?; verdict sting on the
  show edge via verdictPose.
- src/client/net-handlers.ts — NetFx.sound? optional; grumbleRumble
  on the patron case.
- src/client/assets.ts — lazy shared loader + DRACOLoader
  (decoderPath /draco/).
- scripts/make-sfx.mjs — the synth recipes (seeded, deterministic).
- scripts/release.mjs — the gate. scripts/model-diet.mjs — +draco().
- public/audio/sfx/*.wav (8), public/draco/ (wasm + wrapper).

## 5. How to run, test, verify

npm run check (459 green at 0cb6840). npm run release = the full
gate (currently all green, 23.61 MB). node scripts/make-sfx.mjs
regenerates wavs (never hand-edit). npm run diet -- <name> now
dracos. Smoke recipe: worker-shim (memory: game-smoke-driver-notes);
CRANK IS NUMERIC — {t:'op',turn:0,screw:0,crank:1} (crank:true
validates to 0 in roster.ts and tension never accrues; memory
updated). SFX verify: __game.getSfx() → {state, loaded, played};
plays only record when context running + row loaded. Audio autoplay
unlocked without gesture under the shim in this environment; on a
visible page a trusted click (preview_click/computer) is still the
unlock. Dev on 5174 serves optimized models from disk (no rebuild);
dist is the built copy — the gate rebuilds it fresh.

## 6. Open items and decisions

DECIDED (do not re-litigate): everything in §3; draco adopted; KTX2
deferred (why recorded); 192 kbps stays; loudness ceiling 40 / rest
20; sting keys by verdict not sound; port not singleton; ws leverThunk
arrives a round-trip late (accepted v1, comment in main.ts).
OPEN:
- Visionary's ear: verdict sting + grumble FILES (drop-in), splat
  variants if wanted, loudness balance across synth rows, the new
  20% music level in real play.
- THE EYE PASS still pending from s18: stride cadence (walk.ts),
  MOMENT_TICKS hold, moment size 52vw, CHOMP widths 9/5.5 m, arc
  lift, crumb/sparkle sizes.
- Release gate TODO organs: boot smoke vs built dist, package/zip.
- Standing: captures debt (several slices deep), meshy license,
  FLAVORS ruling, species orders (design lane prize).

## 7. Next session focus

VISIONARY'S WORDS: continue immediately on ENTRY 4 — review first,
then a DISCUSSION before starting work. Entry 4 = THE FEEDBACK PAIR,
plans/15 items 15 + 16 together: the landing verdict (green/red
splat feedback — binary, already ruled) and the giant collider
(per-species authored shapes, deal-boundary gating, the shake-off).
One family: red-on-giant needs the capsule to be a distinct event;
both land on the same impact seams (shots-view + Room). NOTE: the
collider is the path's FIRST game/-ward promotion pressure and one of
the two NAMED core/ exceptions (plans/21 §0) — the discussion should
walk the species table's minimal core shape. The slice-6 ClientFx
port and impact-event positions are the pre-wired hooks (a red-thunk
row is one table entry away). Read items 15+16 IN FULL before the
discussion — this session only skimmed them.

## 8. Recommended reading order

1. This handoff.
2. project/plans/15-side-quests.md items 15 + 16 (the pair, in full)
   + item 14 status (the weight record).
3. project/plans/21-the-path.md — entry 4's framing, §0's named core
   exceptions, the 8-entry order.
4. src/client/shots-view.ts — the impact seams both features land on
   (words/sounds/rings culture to extend).
5. src/server/room.ts tickScoringPhase region — the authoritative
   impact side (where the giant capsule would live per deal).
6. src/client/sfx.ts — the table (a landing-verdict row is a drop-in)
   + the ClientFx port shape.
7. git log --oneline -10; memory: game-smoke-driver-notes (crank
   numeric fix, worker-shim recipe).
