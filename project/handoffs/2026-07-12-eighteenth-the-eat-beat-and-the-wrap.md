# Handoff — 2026-07-12 (eighteenth session) — THE EAT BEAT BUILT, THE WRAP DONE, THE PATH OPENS

## 1. Snapshot

Six commits, all pushed, tip 930b1ce. 448 tests, both tsc legs. Two
deliverables landed: (1) THE EAT BEAT (plans/16 slice 7's ruled
consumption — stand-in cake arcs to the mouth, three-verdict split,
CHOMP, all three verdicts live-smoked) and (2) THE EAT-BEAT WRAP
(plans/15 items 20+21: walk constants unified + giants slowed to
Froude cadence, photo moved top-left with corner timeshare, PLUS the
slice-7 polaroid tween rider). The visionary opened plans/21 THE PATH
(live roadmap, three lanes); build-lane entry 1 is struck through.
Next session: review + DISCUSS entry 2 (SOUND, slice 6) before
building — his explicit instruction.

## 2. What changed this session

- 4fd0533 THE EAT BEAT: eat-beat.ts NEW (beat sheet + EatTheatre),
  comic-word.ts NEW (SplashWord/wordMaterial extracted from
  shots-view — one onomatopoeia grammar), PatronBody.mouthWorld()
  (head-bone world position, null when rig-less), patron-table owns
  the theatre, DEPART_AT_FRAMES 300→460. 10 new pins.
- 2eba65c THE STRIDE SLOWS: walk.ts NEW — the ONE home for stride
  dials (were duplicated patron-table/line). Phase 0.1→0.03 (step
  ~1.75 s), bob 0.35→0.8, rock →0.045, depart 1.1→0.17 m/frame
  (~10 m/s), arrive 0.32→0.1 (~4.8 s), ADVANCE_FRAMES 150→330.
- f421919 THE FRAME MOVES + THE POLAROID BEAT: #snapshot top-right→
  top-left (tilt mirrored −1.6°); hud.ts corner collapse — ended
  order shows ONE line (PATRON N SERVED/GOES HUNGRY + purse), pinned;
  #hud.linger class steps the card right of the photo column (same
  +48px carve arithmetic; report-view toggles on banner edges);
  #banner carve mirrored left; polaroid beat: photo slams big-center
  on verdict edge (.moment class; display flip skips the transition),
  banner WAITS, MOMENT_TICKS=110 then class drop rides a 0.5 s CSS
  tween to the corner. Cross-law pin: MOMENT_TICKS+30 < EAT_START.
- 930b1ce DOCS: plans/20 (public alpha serving, drafted NOT next),
  plans/21 (THE PATH), plans/15 items 15–24 committed; 20/21 claimed
  and done; entry 1 struck.
- f348bb6 / earlier DOCS riders.
- AFTER MY COMMITS the visionary amended plans/15 (item 25 training
  lobby + opening parade) and plans/21 (path now 8 entries; entry 5 =
  training lobby; fleet lane grew practice cake + bench ogre).
  UNCOMMITTED in the working tree — do not revert; commit status is
  his call next session.

## 3. Architecture and invariants (new this session)

- EAT BEAT SHEET: EAT_START_FRAME = VERDICT_HOLD_FRAMES + 10 (derived
  — photo-then-eat BY CONSTRUCTION); CHOMP at +80; word dies at
  +66 more; DEPART_AT_FRAMES 460 (ruled 450–480; line.ts imports it —
  one constant, both theatres).
- THREE-VERDICT SPLIT (ruled, built): devour = CHOMP! + crumbs +
  sparkle; begrudge = chomp. + crumbs, NO sparkle; hungry = no
  theatre, cake uneaten. eatAction() maps via verdictPose.
- MOUTH ANCHOR: head BONE getWorldPosition (skinned-clone corollary —
  group transforms lie). Rig-less → null → beat never starts.
- THE JUDGED TIERS: EatTheatre captures dessert tiers on the verdict
  edge — a mid-beat redeal cannot swap the eaten cake.
- STRIDE DIALS: walk.ts is the one home; walkSway() the shared
  grammar. Item 22's gait audition inherits it; step events derive
  from the same phase clock.
- CORNER TIMESHARE: photo top-left ONLY during linger; hud collapses
  (hud.ts, status won/lost while phase running) AND steps aside
  (#hud.linger). Banner waits for the polaroid to file. Mute button
  owns top-right alone.
- SFX SEAM: the chomp sting fires on the CHOMP edge (comment in
  eat-beat.ts chomp()); placeholder silence until slice 6 —
  visionary-approved.
- TIER_COLORS exported from scene.ts — proxy and real cake read one
  table; FLAVORS ruling still pending (they swap together when it
  lands).
- HIDDEN-PANE LAW ADDITION: CSS transitions FREEZE without a
  compositor — computed style holds the start value forever. Verify
  tween end-states by toggling classes with transition:none, not by
  waiting.
- WIRE-IT-TWICE LAW (plans/21 entry 2): step booms are EXPLICITLY
  DEFERRED from slice 6 — they consume item 22's step events, never
  the fake bob.

## 4. File map (delta)

- src/client/eat-beat.ts — beat sheet constants + EatTheatre (proxy
  build, arc, chomp, crumb/sparkle burst, dispose). eat-beat.test.ts
  — 10 pins incl. timeline + polaroid cross-law.
- src/client/comic-word.ts — ComicWord + WORD_LIFE_TICKS/WORD_RISE_M
  (shots-view imports; its widths stay local).
- src/client/walk.ts — stride dials + walkSway.
- src/client/patron-table.ts — theatre owner; update() gained tiers
  param (main passes view.dessert.spec.tiers); eatBeat smoke getter
  (__game.getEatBeat).
- src/client/patron-body.ts — mouthWorld(); VERDICT_HOLD_FRAMES
  exported.
- src/client/hud.ts — corner collapse branch (status !== "running").
- src/client/report-view.ts — MOMENT_TICKS exported; moment/banner
  sequencing; #hud.linger toggles.
- index.html — #snapshot left + .moment + transition; #banner carve
  mirrored; #hud.linger rule.
- project/plans/21-the-path.md — THE ORDER (visionary reorders at
  will; plan files are WHAT, path is WHEN).
- project/plans/15-side-quests.md — items 15–25 (25 uncommitted).

## 5. How to run, test, verify

npm run check (448 green at 930b1ce). preview_start {name:"dev"} —
5174 always taken, autoPort assigns; pane born hidden → worker-shim
recipe (memory: game-smoke-driver-notes). Smoke recipe proven twice
this session: shim boot → park baker at READY_CIRCLE till running →
arm transitions-only probe (150 ms, COPIES) → poke
room.flow.order.requirements=[{kind:'count-on-cake',topping:'cherry',
needed:0}] + passScore 0 (or 101 for REFUSED; ticksLeft=2 for
HUNGRY) → load+crank ~6 s+lever → read probe. Loss = runover (no
rung 3); baker left in circle auto-restarts the run.

## 6. Open items and decisions

DECIDED (do not re-litigate): all §3 above; sound is next (visionary,
twice); step booms deferred from slice 6; closable inset rejected
(the move dissolved it); hybrid SFX ruling (synth for mechanical
metronomes, samples for character); volume bus built IN slice 6,
never retrofitted (plans/20 §5).
OPEN:
- THE EYE PASS on this session's work: stride cadence/speeds
  (walk.ts), moment hold (MOMENT_TICKS), moment size (52vw), CHOMP
  widths (9/5.5 m), arc lift, crumb/sparkle sizes. The tween ride
  itself was unverifiable hidden (end-states proven) — first look is
  his.
- Slice 6 design questions to walk BEFORE building: sound sourcing
  (visionary-sourced like music? synth authored where?), the exact
  row list, volume bus shape (plans/20 §5), spatial audio yes/no for
  v1, the eat beat's sting hookup.
- plans/15 item 25 + plans/21 amendments uncommitted (his files, his
  call).
- Standing: audio diet + Draco/KTX2 (path entry 3), committed
  captures debt, meshy license, FLAVORS ruling, species orders (the
  prize, design lane).

## 7. Next session focus

VISIONARY'S WORDS: review the work and the plans, then DISCUSS the
next slice BEFORE starting work. The slice: SOUND — plans/16 slice 6,
THE PATH entry 2. His rationale on record: biggest juice-per-effort
left (world visually alive, silent at every dramatic moment); three
dependents queued (eat-beat sting, item 23's future rows, plans/20 §5
settings needs the volume bus born here); hooks pre-wired (item 13
impact events carry positions; sfx.ts mirrors music.ts drop-in
culture; hybrid synth/samples ruling stands). Review first, design
discussion second, build only after rulings.

## 8. Recommended reading order

1. This handoff.
2. project/plans/21-the-path.md — the order of everything (note
   uncommitted amendments).
3. project/plans/16-the-audiovisual-milestone.md §Slice 6 (sound) +
   §Slice 7 status blocks.
4. project/plans/20-public-alpha-serving.md §5 (the volume bus
   sequencing rule slice 6 must honor).
5. src/client/music.ts — the drop-in culture sfx.ts mirrors (jukebox
   laws, autoplay unlock, copy-of-record).
6. plans/15 items 13 (comic-word/SFX pairing law), 20, 21, 23, 25.
7. src/client/eat-beat.ts (the sting seam) + shots-view.ts impact
   sites (where SPLAT/POP words spawn — the sound hooks).
8. git log --oneline -8; memory: game-smoke-driver-notes.
