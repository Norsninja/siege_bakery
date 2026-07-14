# Handoff — 2026-07-13 (twenty-fifth session) — EARNED TIME, THE NORTH STAR, THE RELAX AUDIT

## 1. Snapshot

A big session: reviewed the prior build, then built plans/22 steps 5, 6,
and 7, took the first PLAYTEST of the redesign, and from it drew the
game's NORTH STAR (plans/22 §0.5) and a whole scoring-relax design
(plans/23). Eight code/doc commits shipped (tip 8788653); two design docs
drafted this turn (plans/23 + the plans/22 pointer) plus this handoff
still to commit. 501 tests green, both tsc legs clean throughout. NEXT
SESSION (the visionary's words): IMMEDIATELY CONTINUE — build the next
steps (plans/23 the relax pass, then plans/22 steps 8 serve / 9 favor).

## 2. What changed this session

Commits (all on main, committed locally through 25a4947 — push pending the
visionary's go-ahead, per the usual session-end pattern):

- **bd594e8 — DOCS: reconcile plans/22 §9 to the 8-step build, close the
  flourish rulings.** §9 rewritten to the real 8→9-step vocabulary; §8
  closed the two step-5 flourish rulings (reveal stays 2★, bonus stays 10;
  `revealed` is purely presentational now).
- **aad88d9 — STEP 5: delete the finish-window.** The inert finish-it
  machinery removed across game/server/client (finishTicksLeft,
  openFinishWindow/closeFinishWindow, concludeFinishWindow,
  FINISH_WINDOW_TICKS, the finishOver event, pendingVerdict, the client
  FINISH IT! banner + prediction). Pure deletion; the flourish already
  lives at the buzzer (stampFlourish). 495 tests.
- **4f29a40 — DOCS: side-quest 29 — the race clock.** The big top-center
  timer, recorded as an AESTHETICS-PASS item (distinct from the "+Ns" pop
  built in step 6b).
- **63e6bff — STEP 6a: earned time + the reliable clock.** THE MECHANIC.
  Patience no longer drains the clock; earned time replaces it (fresh
  coverage buys seconds). core `paint()` → {footprint, fresh};
  OrderFlow.earnTime (capped); patience dormant (patienceDebt for step 9);
  base clocks re-derived to nominal × 0.72 (ORDER_SECONDS 300→216);
  soloClock kept. 498 tests.
- **1ff5785 — STEP 6b: the earned-time "+Ns" pop-up.** A green "+Ns" comic
  word rises off a fresh-coverage shot, client-local off the frosting twin,
  live-rung gated. 500 tests.
- **c6bfefc — DOCS: THE NORTH STAR — the perfect cake (plans/22 §0.5).**
  The governing principle (see §3).
- **dacda15 — STEP 7 (first cut): the coverage ladder.** The frost row
  becomes a CLIMB toward the perfect cake, not a checkbox at the floor.
- **8788653 — STEP 7: the coverage bar goes LOGARITHMIC.** The visionary's
  refinement — early frosting fills a substantial chunk (8% ≈ a third of
  the bar), perfection recedes asymptotically. 501 tests.

Uncommitted at handoff time (this turn's drafts): **plans/23**
(dress-the-cake / relax-the-rulebook), the **plans/22 §9 pointer** to it,
and **this handoff**. Commit them next.

## 3. Architecture and invariants

- **THE NORTH STAR (plans/22 §0.5, the session's headline).** The goal is a
  PERFECTLY FROSTED — and DRESSED — CAKE, unreachable by design; the
  futility is the point. Stars are milestones on the climb, never the
  ceiling. THE FUN IS THE GAP between what the giant wanted (perfection)
  and what the dwarves could give (a frantic fraction). Everything points
  the player at MORE; the floor is base camp, not the summit. Recorded in
  the auto-memory too (perfect-cake-north-star).
- **THE RELIABLE CLOCK (step 6a).** Patience is OFF the clock — the number
  no longer lies. ONE positive force: earned time. Fresh cake coverage (the
  coverage DELTA, not the splat footprint) buys EARNED_TIME_PER_SAMPLE_S
  per sample, capped at EARNED_TIME_CAP_S per order. A saturated cake earns
  nothing → the round ends naturally. Base clocks are the honest number
  (old nominal × 0.72); earned time is pure upside (nobody worse off than
  today). Patience is DORMANT — captured in OrderFlow.patienceDebt for the
  realm's favor (step 9); the Giant still grumbles, it just costs no clock.
- **THE COVERAGE LADDER (step 7).** The frost row is a log-scaled bar
  toward the perfect cake: floor mark, star milestones, the empty remainder
  as the giant's longing. Client-only (hud.ts coverageLadder); the % number
  is honest/linear, only the bar's FEEL is curved (COVERAGE_BAR_K = 30).
- **THE RELAX (plans/23, NOT yet built).** The scoring rulebook is too
  severe. Collapse the two-gate model to ONE low frosting floor + an
  additive impress-and-dress score (dressing = sprinkles/cherry lift the
  grade, missing never zeroes you); drop waste/mess as penalties. Move the
  difficulty from the RULEBOOK to the CRAFT (the catapult + the impossible
  cake keep it hard). "Casino tactics, for good": reward and pull forward,
  never punish and zero out.
- Determinism law unchanged; the ONE core/ touch this session (paint's
  fresh delta) is pure deterministic arithmetic (plans/22 §4 footnote).

## 4. File map (this session's deltas)

- **src/core/frosting.ts** — paint() returns {footprint, fresh} (fresh =
  samples crossing coats 0→>0). The one core/ touch.
- **src/game/tuning.ts** — EARNED_TIME_PER_SAMPLE_S (2), EARNED_TIME_CAP_S
  (120); ORDER_SECONDS 300→216; the reliable-clock header (patience-drain
  lie retired); FINISH_WINDOW_TICKS deleted.
- **src/game/order.ts / order-flow.ts** — earnTime (capped), patienceDebt
  (dormant), patience no longer drains ticksLeft; finish-window methods
  deleted. order.ts lost finishTicksLeft.
- **src/game/campaign.ts** — RUNGS clockSeconds re-derived
  (130/150/216/108/216/238/259); soloClock kept.
- **src/game/judgment.ts** — UNCHANGED this session (the relax, plans/23,
  edits it next).
- **src/server/room.ts** — tickScoringPhase accumulates freshThisTick and
  spends earnTime (running-gated); finish-window remnants deleted.
- **src/client/hud.ts** — coverageLadder + the log barFill (COVERAGE_BAR_K);
  the FINISH IT! banner deleted.
- **src/client/frosting-view.ts / shots-view.ts / main.ts** — paintImpact
  returns {footprint, fresh}; shots-view spawns the green "+Ns"
  (orderLive-gated from main); state.ts finishTicksLeft prediction deleted.
- **Tests** — frosting (fresh delta), order-flow (earned time + patience
  dormant + clock literals), room (patience-burn test INVERTED to the
  reliable clock), hud (the coverage ladder + log-bar pin), shots-view (the
  "+Ns" pop + sandbox gate), and the finish-window suites removed.
- **project/plans/22** — §0.5 north star; §9 reconciled to 9 steps (6 done
  split 6a/6b, 7 done, 8 serve, 9 favor) + the plans/23 pointer; §8 flourish
  rulings closed; §4 core-touch footnote.
- **project/plans/23** — NEW: the relax audit (design of record).
- **project/plans/15** — side-quest 29 (the race clock).
- **auto-memory** — perfect-cake-north-star.md (+ MEMORY.md index).

## 5. How to run, test, verify

- `npm run check` = `tsc --noEmit` + `tsc -p tsconfig.headless.json` +
  `vitest run`. 501 green at 8788653.
- No full playtest verification of step 6/7 in-engine by the assistant (the
  visionary DID playtest — see §6); the client boots clean in the preview
  (no console errors), the mechanic is headless-tested, and the coverage
  ladder was rendered via tsx (the observable output for a text HUD).
- Text-HUD render trick (used this session): a throwaway `tmp-*.mts` at repo
  root importing hudLines + a HudView literal, run with `npx tsx`, deleted
  after (the study law). Prints the exact ladder lines at any coverage.

## 6. Open items and decisions

THE PLAYTEST (the visionary, this session): passed at 10% (1★, right at
research/21's human-solo prediction), landed sprinkles + cherry, ~20s to
spare. The finding: he wasn't sure what to feel — the HUD said "frost 8%,"
he did, and it went quiet; he only went further out of curiosity. → the
coverage ladder (step 7) + the whole plans/23 relax.

DECIDED (do not re-litigate):
- The north star (plans/22 §0.5): perfect cake, futility is the point, the
  fun is the want/give gap. The dwarves do their best; the giant wants
  perfection.
- The coverage ladder is a log-scaled CLIMB (COVERAGE_BAR_K = 30, tunable).
- The relax audit's relax/keep split (plans/23 §4) is BLESSED for the build:
  RELAX the all-or-nothing gate, the par/waste penalty, the mess penalty,
  the burial gotcha; KEEP a low frost floor, the coverage→stars→coins climb,
  earned time, the physical challenge, asks-as-data (softened to "impress").
- The earned-time trio (2 s/sample, 120s cap, base clocks) is PROVISIONAL —
  tune at a real playtest. Nobody worse off than today; earned time is upside.

OPEN (plans/23 §7 — the visionary pins these at the build):
- Does dressing lift STARS or only COINS? (recommend stars — "dressed to
  impress").
- The floor value (keep 8%?) and whether it's the only total-fail.
- Gate 2 (REFUSED): soften to a low bar, or retire?
- The impress formula (how coverage + dressing combine into stars).
- Waste: drop, or flip to a tidy bonus? Neatness: keep or fold?
- The verdict re-tone (the patron's new lines — the comedy of the gap).
- The word: "FROST THE CAKE" vs "DRESS/DECORATE" (the bigger ambition); the
  nudge voice — his eye, still open from step 7.

## 7. Next session focus

The visionary's explicit instruction: IMMEDIATELY CONTINUE building the
next steps — no long review preamble. The queue:
1. **plans/23 — the relax pass** (game/judgment.ts + the requirement model):
   collapse the two-gate model to a floor + additive impress-and-dress
   score; drop waste/mess penalties; re-tone the verdicts. Pin plans/23 §7's
   open rulings WITH the visionary as they come up (short rulings, not a
   full design session — the direction is blessed).
2. **plans/22 step 8 — serve** (floor-gated on the ONE floor now).
3. **plans/22 step 9 — the realm's favor** (patience→payout via
   patienceDebt; softened-mess-as-mood; the coin drip; reward continuous
   past 3★).
Also open, low priority: the visionary's eye on the ladder wording; a real
in-engine playtest of earned time + the "+Ns" + the ladder.

## 8. Recommended reading order

1. This handoff.
2. project/plans/23-dress-the-cake-relax-the-rulebook.md — the relax, the
   NEXT build (the audit, §4 relax/keep; §5 the judgment.ts surface; §7 the
   open rulings).
3. project/plans/22-timing-and-scoring-redesign.md — §0.5 THE NORTH STAR
   (read first, it governs everything); §9 the build sequence (6–7 done, 8
   serve, 9 favor, reshaped by plans/23).
4. `git log --oneline -9` + the commit bodies (bd594e8 → 8788653) — the
   build narrative per step.
5. src/game/order-flow.ts + tuning.ts + campaign.ts — earnTime, patience
   dormant (patienceDebt), the reliable clock re-derivation.
6. src/client/hud.ts — coverageLadder + barFill (the log ladder), the model
   plans/23's re-tone will feed.
7. src/game/judgment.ts — the two-gate model plans/23 relaxes (UNCHANGED
   this session; read it as the starting point for the next build).
8. auto-memory perfect-cake-north-star — the principle, one line.
