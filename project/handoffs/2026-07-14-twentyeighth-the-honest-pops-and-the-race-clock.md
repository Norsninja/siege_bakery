# Handoff — 2026-07-14 (twenty-eighth session) — ITEM 31 (THE HONEST POPS) + ITEM 29 (THE RACE CLOCK) BUILT, COMMITTED, NOT PUSHED

## 1. Snapshot

Two side-quests built and committed this session, both making the plans/22
economy VISIBLE. Item 31 (the three honest pops): the client twin of the
server earn axes — drip pops gold coins at the splat, garnish/topper pop
"+Ns" over the cake. Item 29 (the race clock): a top-center BIG clock overlay
that became the run's feedback surface (promoted from aesthetics by a live
playtest finding — the loop turns you away from the cake, so world pops are
missed during the run-back). Also: a coin-glyph fix (🪙 tofus on fonts
lacking U+1FA99) — CSS gold disc on the clock, glyph-free gold "+N" in the
drip pop, emoji stripped from the text lines. 524 tests green, both tsc legs
clean. Two commits on main (0ec5c0a code, d75c20d docs) — LOCAL ONLY, NOT
PUSHED. Next session: review first, then discuss next steps (his standing
rule).

## 2. What changed this session

Commit 0ec5c0a (code + tests):
- NEW src/client/earn-pops.ts — EarnPops class: the client twin of the three
  silent earn axes. drip(fresh)->coins mirrors room.ts dripFraction
  (fractional accumulate, whole-coin flush); garnish(checks)->secs mirrors
  order-flow.earnGarnishTime (ask-capped high-water over on-frosting rows, Σ
  min(current,target); sub-second fractions accumulate); topper(met)->secs
  mirrors earnTopperTime (TOPPER_TIME_S once). reset() per deal. Floors,
  never over-claims.
- NEW src/client/earn-pops.test.ts (10 pins).
- NEW src/client/race-clock.ts — clockGainSecs(prev,cur) pure helper (the
  visible-rise detector, ≥1s floor filters jitter) + RaceClock class (owns
  #race-clock, update() per frame; seed-on-show guards false flash).
- NEW src/client/race-clock.test.ts (clockGainSecs pins).
- src/client/shots-view.ts — onDrip callback field; drip pop (gold "+N" via
  ComicWord at im.pos, DRIP_WORD_RISE_M 2.6, COIN_GOLD 0xf2c14e) in the paint
  block beside the "+Ns"; NEW public popWord() (main renders garnish/topper
  over the cake through it); VERDICT_GREEN now exported.
- src/client/main.ts — construct EarnPops + RaceClock; wire shotsView.onDrip
  = earnPops.drip; earnPops.reset() in fx.bindDessert (deal boundary);
  garnish/topper poll after shotsView.step (gated on orderLive, pops over the
  cake summit); raceClock.update() after postHud.update.
- src/client/hud.ts — REMOVED the clock from the corner header (line ~544)
  and the running-block purse line (both moved to the race clock); stripped
  🪙 from the pay line + report purse line; the linger purse line kept
  (race clock hides between orders), 🪙 stripped there too.
- src/client/interactions.ts — stripped 🪙 from the town-2 buy flash.
- index.html — #race-clock DOM + CSS (top-center, big clamp 46-92px, green
  pulse rc-green-pulse, float rc-float, gold purse); .rc-coin is a CSS gold
  disc (radial gradient, border-radius 50%), no emoji.
- src/client/hud.test.ts + shots-view.test.ts — updated assertions (header
  no clock, corner purse relocated, coin pop is gold "+N" not "+N🪙", no 🪙
  in text).

Commit d75c20d (docs):
- project/plans/15-side-quests.md — items 31 and 29 marked BUILT with full
  as-built records (render-site split, green-only ruling, relocation, glyph
  fix, item 29's deferred "hurry up" urgency cue).

## 3. Architecture and invariants

- TWO RENDER SITES BY DATA SOURCE (item 31, do not merge): the DRIP rides the
  LOCAL deterministic twin (paintResult.fresh) -> renders in shots-view at
  the impact. GARNISH + TOPPER ride the BROADCAST (view.checks / desire.met)
  -> main polls the twin each frame and renders over the cake summit via
  shots-view.popWord. The `scored` wire carries no position, so the summit is
  the honest anchor (grains land on the cake, the cherry crowns it).
- EVERY POP IS LIVE-RUNG GATED (orderLive = phase running AND order.status
  running) — mirrors the server's two gates; the linger pops nothing.
- FLOOR, NEVER OVER-CLAIM: EarnPops floors (drip coins, garnish seconds).
  Summed pops <= real earn. The cap (EARNED_TIME_CAP_S) is NOT modelled
  client-side — near it a pop can name a second the clock didn't gain
  (accepted, same bargain the paint "+Ns" already struck; cap is loose).
- RESET PER DEAL: earnPops.reset() at fx.bindDessert. The Room's dripFraction
  actually carries across deals within a run; the client resetting per deal
  under-pops by <1 coin/deal — under-celebration, never a lie.
- RACE CLOCK GREEN-ONLY (ruling): the reliable clock has ONE force (earned
  time, plans/22 step 6 — patience left the clock). Nothing subtracts time,
  so there is NO red event. The green pulse reads the clock's OWN visible
  rise (clockGainSecs), catching all three earn axes at once.
- SEED-ON-SHOW: the race clock is visible only on a live order; the first
  shown frame seeds prevTicks/prevPurse (no flash) so a fresh deal's full
  clock and the run-start empty purse are not read as gains. The between-rung
  linger hides it, re-seeding on the next deal.
- RELOCATION NOT DUPLICATION: the clock + running-purse left the corner HUD
  for the race clock; the corner header is patron+hands identity now; the
  linger keeps its slim corner purse (race clock hidden then). Plops STAY on
  the cake (they serve the aim-and-watch moments).
- COINS ARE GOLD, NOT A GLYPH: 🪙 U+1FA99 tofus where the font lacks it. Race
  clock coin = CSS gold disc; drip pop = gold "+N" (color is the coin
  channel, green seconds vs gold coins); text lines drop the emoji (the word
  "coins" carries it). 👑 crown KEPT (renders fine).
- All prior canon holds (plans/22 economy, plans/23 relax, plans/24 material
  law, one-clock rule, determinism law, sacred layering; client/ owns all
  DOM/three.js).

## 4. File map

- src/client/earn-pops.ts — EarnPops twin (drip/garnish/topper arithmetic +
  per-deal reset). Pure, no scene.
- src/client/race-clock.ts — clockGainSecs (pure detector) + RaceClock (owns
  #race-clock, painted each frame).
- src/client/shots-view.ts — drip pop render + onDrip + popWord; VERDICT_GREEN
  export; COIN_GOLD/DRIP_WORD_RISE_M constants.
- src/client/main.ts — the wiring: earnPops + raceClock construction, onDrip,
  reset at deal boundary, garnish/topper poll, raceClock.update.
- src/client/hud.ts — corner HUD text (clock + running-purse removed; 🪙
  stripped).
- index.html — #race-clock DOM + CSS (+ .rc-coin gold disc).
- project/plans/15-side-quests.md — items 31 + 29 BUILT records; the open
  ledger (items 27/17/22/23/19/24/11, plans/18 forge).

## 5. How to run, test, verify

- npm run check = tsc + headless tsc + vitest. 524 green at d75c20d.
- npm run dev — Vite on 5174 (autoPort if taken). DEV exposes window.__game.
- HIDDEN-PANE TRAP (hit this session): when the browser preview pane is
  backgrounded, requestAnimationFrame is PAUSED — the render loop (hud +
  raceClock.update) freezes, HUD stuck at "joining the bakery…", while view
  STATE still updates via broadcasts. Do NOT diagnose as a code bug: check
  document.visibilityState / document.hidden first. Verify DOM/CSS via
  getComputedStyle + getBoundingClientRect (rAF-independent), not screenshots
  (they time out on a hidden pane). The visionary's own browser is not
  backgrounded, so he sees the live animation.
- Driving a run headless: __game.room.startRun() deals rung 1 but does NOT
  flip the client view to running by itself; set __game.room.run.phase =
  "running" and call __game.room.broadcastRun() to propagate. The drip needs
  REAL landings (room.frosting.paint bypasses tickScoringPhase) — one glob is
  only ~0.35-0.6 coins, so a single shot rarely flushes a whole drip coin.

## 6. Open items and decisions

DECIDED (do not re-litigate): item 31 two-render-site split + over-the-cake
anchor for garnish/topper; race clock green-only (one-force clock);
relocation not duplication; coins-are-gold-not-a-glyph (CSS disc + gold "+N"
+ word-carries-text); reset per deal; the cap imprecision accepted.

OPEN:
- Race clock "hurry up" urgency cue when the clock is nearly out — NOT a
  penalty, just tension; deferred per the green-only ruling, his call. Trivial
  toggle if wanted.
- Drip-pop coin is now gold "+N" (glyph-free). Flagged twice as a change
  beyond the strict "text lines" ask — trivial to add a symbol if he wants
  one there.
- Push: 0ec5c0a + d75c20d are LOCAL ONLY. Push when he asks.
- STILL OPEN from s27 (the whole-economy playtest): every step-9/plans-24
  number is provisional (DRIP_COINS_PER_SAMPLE 0.05, FAVOR_PATIENCE_FULL_S
  40, FAVOR_MAX_BONUS 0.5, star tiers, earned-time rates). The economy is now
  fully VISIBLE — a real playtest of the whole loop is the natural next gate.
  His live rung-1 read this session: reached 9% (just over the 8% floor) with
  a minute+ left and kept frosting — the north-star "floor is base camp"
  behavior working; green "+Ns" confirmed appearing.
- Standing ledger (plans/15): item 27 (locked-fort read), 17 (lighting), 22
  (patron motion), 23 (earth shakes, gated on 22), 19 (weather), 24 (helpers),
  11 (tower), 30 (serve, skipped). plans/18 order forge = the standing content
  prize (own design session; DISCUSS->BLESS->BUILD; premature until the
  economy numbers are playtest-validated).
- HUD favor-line wording + 👑/MASTER-BAKER emoji collision (s27 §6) still
  untouched — his eye.

## 7. Next session focus

Visionary's instruction: REVIEW the work first, THEN discuss next steps.
Strongest candidates to bring positions on: (a) a real whole-economy playtest
(now that all four earn axes are visible — the natural tuning gate, unblocks
every provisional number); (b) plans/18 species orders (the content prize,
own design session, but premature until the economy is tuned); (c) the small
open polish (urgency cue, HUD favor wording, drip-pop coin symbol). Lean
toward (a).

## 8. Recommended reading order

1. This handoff.
2. project/plans/15-side-quests.md — items 31 + 29 BUILT (the as-built
   records) + the open ledger.
3. src/client/earn-pops.ts — the three-axis twin.
4. src/client/race-clock.ts — the clock detector + overlay.
5. src/client/main.ts — the wiring (search earnPops / raceClock).
6. src/client/shots-view.ts — the drip pop + popWord.
7. project/plans/22-timing-and-scoring-redesign.md §0.5 (north star) + §9
   step 9 — the economy the pops make visible.
8. git log --oneline -6 (0ec5c0a + d75c20d this session, both unpushed).
