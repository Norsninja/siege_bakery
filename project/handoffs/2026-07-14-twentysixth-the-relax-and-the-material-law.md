# Handoff — 2026-07-14 (twenty-sixth session) — THE RELAX BUILT + THE MATERIAL LAW BUILT

## 1. Snapshot

Two full builds in one session, both discussed-then-built per the standing
rule. (1) plans/23 THE RELAX: the two-gate judgment collapsed to one
frosting floor + an additive impress score; REFUSED/waste/neatness/score
retired; verdicts re-toned. (2) plans/24 THE RECIPE & THE MATERIAL LAW
(drafted from the visionary's material re-think, rulings pinned in
discussion, built same session): frosting flavors as ammo, the ONE CLOCK
RULE (every material's progress earns time), the material cherry, the
ticket as recipe. plans/22 step 8 (serve) was RULED SKIPPED (design parked
as plans/15 item 30). Five commits, LOCAL ONLY — push pending the
visionary's word: b2519db (relax code), 47cfeb3 (relax docs), 7d6bcfa
(plans/24 draft + serve skip), dca0c00 (plans/24 code), 758ec1d (plans/24
docs). 506 tests green, both tsc legs clean, live-bundle seam verification
done. NEXT SESSION (visionary's words): immediately continue by
DISCUSSING plans/22 step 9 (the realm's favor) BEFORE any editing.

## 2. What changed this session

THE RELAX (plans/23, commit b2519db):
- game/judgment.ts — judge() rebuilt: ONE gate (coverage >= the frost
  row's floorCoverage; below it the sole zero), stars from IMPRESS =
  coverage + dressing against the star2/star3 tiers. Judgment interface
  now {accepted, stars, checks, coverage, dressing, impress, flourish?} —
  met/score/waste/neatness/integrity/mess REMOVED. weighedMess kept
  (exported; the giant's mood reads it, step 9).
- Stripped vestigial: passScore + parShots off OrderState/JudgedOrder/
  createOrder; parShots column off Rung + all 7 RUNGS rows;
  ORDER_PAR_SHOTS out of tuning; OrderFlow.shots/noteShot/shotsFired
  deleted; room.ts noteShot call + judge() shotsFired arg gone.
- Verdict re-tone (client/hud.ts bannerText + snapshotCaption): 3-star
  "MAGNIFICENT! …though it could always be more perfect."; 2-star "NOT
  BAD! it wants for more, though."; 1-star "…it's a cake. I suppose.";
  below-floor "TIME! …there's no cake here. — the giant leaves hungry".
  Score line is all-positive: "N% frosted + M% dressed -> K% toward
  perfect". "it is TERRIBLE" deleted.
- Eat-beat remap: patron-body.verdictPose + eat-beat.eatAction key off
  stars — 2-star+ delighted/devour, 1-star "refused" pose = grudging eat,
  below-floor hungry/uneaten. Pose name "refused" kept as animation label.

SERVE SKIPPED (commit 7d6bcfa): plans/22 §9 step 8 marked skipped with
reasoning (earned time does its pacing job; giants exhaust clock before
reachable cake; early serve banks fewer stars). Grief-proof design parked
as plans/15 item 30: if ever built, SATURATION-GATED and unilateral,
never a consensus button.

THE MATERIAL LAW (plans/24, commit dca0c00):
- core/frosting.ts — per-sample FLAVOR STAMP (int, 0 = none; last coat
  wins), paint() gains trailing flavor param (default 0 = don't-stamp,
  the client twin's path), flavorMatch(flavor) = matching painted /
  painted. reset() clears stamps. snapshot()/restore() UNTOUCHED — flavor
  is Room-side scoring state, NOT on the welcome wire (clients never
  judge).
- game/toppings.ts — PAINT_FLAVORS ["frosting","fudge"], flavorOf()
  (1-based), FLAVOR_WORDS {frosting: VANILLA, fudge: FUDGE}. THE REUSE:
  fudge was already a complete paint row (own splat law, shelf-fudge,
  crate, dark render) — it IS the chocolate; no new physics.
- game/judgment.ts — frost-coverage row gains optional flavor?: string;
  crownedOnFrosting() = crownHolder is topping AND topTier AND
  frostedNear (THE one cherry predicate); judge()'s dressing =
  sprinkleFrac*SPRINKLE_IMPRESS + crownedOnFrosting*CHERRY_IMPRESS +
  flavorMatchFrac*FLAVOR_IMPRESS (flavor FOLDS into the dressing number);
  describeRequirement: "FROST 8% OF THE CAKE IN FUDGE".
- game/tuning.ts — GARNISH_TIME_PER_GRAIN_S 0.4, TOPPER_TIME_S 15,
  FLAVOR_IMPRESS 0.03; SPRINKLE/CHERRY_IMPRESS rebalanced 0.04 -> 0.03
  (bound law: floor 0.08 + full dressing 0.09 = 0.17 < star2 0.18;
  cupcake 0.55 + 0.09 < 0.70).
- game/order-flow.ts — requirementsFor passes row.asks.flavor;
  earnGarnishTime(cappedProgress) with HIGH-WATER law (only new maxima
  pay; post-burial re-climbs and beyond-ask grains pay zero);
  earnTopperTime() once per deal; both + earnTime share private
  grantSeconds() and the ONE cap. dealFresh resets garnishHigh/topperPaid.
- game/campaign.ts — Rung.asks.flavor?: string; authored: rung 3/6
  "frosting", 5/7 "fudge", rungs 1-2 + cupcake none (provisional, his
  eye); validateRungs tripwires non-paint flavors.
- server/room.ts — paint passes flavorOf(topping); desire.met reconcile
  uses crownedOnFrosting and pays earnTopperTime() on the flip;
  garnish progress (sum of min(current,target) over on-frosting checks)
  paid via earnGarnishTime BEFORE the scored broadcast; stampFlourish
  uses crownedOnFrosting (bare-summit cherry no longer codas).
- Tests: 506 green. New pins: flavor stamp laws (frosting.test), flavor
  term + material cherry + bound (judgment.test), garnish/topper/one-cap
  (order-flow.test), tick-exact Room integration (room.test "THE ONE
  CLOCK RULE" — fireLime landing tick pays exactly garnish+topper once,
  second landing pays zero). seamCherry now paints the summit first
  (material predicate). Ticket wording pinned.

DOCS: plans/23 status BUILT (§7 rulings recorded); plans/22 §9
reconciled (step 8 skipped, plans/23/24 pointers); plans/24 drafted then
status BUILT with as-built deviations; plans/15 items 30 (serve) and 31
(garnish/topper pops) appended.

## 3. Architecture and invariants

- THE NORTH STAR (plans/22 §0.5) governs: perfect cake unreachable, fun
  is the want/give gap, floor is base camp, reward continuous.
- THE RELAX MODEL: ONE gate (the frost floor — the sole zero, "no cake at
  all"); everything above is additive. NOTHING above the floor may zero
  or punish. Stars read IMPRESS = coverage + dressing.
- THE MATERIAL LAW (plans/24 §1): PAINT coats (flavors are paint-row
  identities), GARNISH grips only on paint (physics-enforced), TOPPER
  rests anywhere but impresses only ON FROSTING.
- THE ONE CLOCK RULE: progress earns time on every axis; redundancy earns
  nothing (fresh-vs-recoat, garnish high-water, topper once). One shared
  cap (EARNED_TIME_CAP_S 120).
- COVERAGE IS COLOR-BLIND (ruling 2): any paint passes floor and climbs
  stars; flavor lives in impress only. Wrong flavor never zeroes/messes.
- LAST COAT WINS the sample's flavor: repainting fixes/breaks flavor at
  zero fresh — a choice that costs clock.
- crownedOnFrosting is THE one cherry truth (impress, checkmark,
  flourish, topper beat). crownedWith still exists (crown rows use it).
- THE BOUND LAW: floor + full dressing < star2, every dessert.
- Flavor stamp is NOT on the wire; client field is visuals; the impress
  is the Room's. Client paint() calls pass no flavor (default 0).
- Determinism law unchanged; core/ headless-pure; the events-sync
  untouched (impact events already carry topping names).
- Patience still dormant (patienceDebt accrues, nothing reads it — step 9
  spends it). Mess still computed nowhere in the grade — step 9's mood.

## 4. File map

- src/game/judgment.ts — the relaxed judge, crownedOnFrosting, flavor
  term, describeRequirement wording.
- src/game/order-flow.ts — earn axes (paint/garnish/topper, one cap),
  requirementsFor flavor, patienceDebt (dormant).
- src/game/tuning.ts — all dials incl. the three impress terms + two new
  time prices; header documents the relax + the bound law.
- src/game/campaign.ts — RUNGS with flavor column; validateRungs.
- src/game/toppings.ts — material classes, PAINT_FLAVORS/flavorOf/
  FLAVOR_WORDS.
- src/core/frosting.ts — flavor stamp + flavorMatch.
- src/server/room.ts — tickScoringPhase pays all three axes; conclude/
  stampFlourish; awardPay (base + stars*perStar + flourish bonus).
- src/client/hud.ts — bannerText/snapshotCaption re-tone; shelf map.
- src/client/patron-body.ts / eat-beat.ts — star-keyed verdict poses.
- project/plans/23 + 24 — both BUILT, statuses carry as-built truth.
- project/plans/15 — items 30 (serve) + 31 (honest pops) parked.

## 5. How to run, test, verify

- npm run check = tsc + headless tsc + vitest. 506 green at 758ec1d.
- Live seam verification recipe (used this session): preview_start dev,
  window.__game.room, then the room.test jumpToRung idiom in-page
  (run.phase="running", run.rung=N, flow.dealFresh(<row literal>),
  redealDessert()), paint via room.frosting.paint(pos, speed, undefined,
  flavorInt), read room.judgeNow(). Reload to clear.
- Windows/PowerShell; git bash for POSIX. Working dir can drift after
  cd in Bash tool — prefix cd /e/Projects/siege-bakery-3d when in doubt.

## 6. Open items and decisions

DECIDED (do not re-litigate):
- All plans/23 §7 rulings + all plans/24 §2 rulings (both docs' status
  blocks record them). Serve skipped (item 30). Flavors = frosting/fudge
  reuse. Impress terms 0.03 each. Garnish 0.4 s/grain, topper 15 s.
- Verdict lines blessed by the visionary ("the verdict lines read right").

OPEN:
- Step 9 THE REALM'S FAVOR — NOT designed yet: patienceDebt -> payout,
  softened-mess-as-mood, the coin drip, reward continuous past 3-star.
  plans/22 §2.6/§5/§6 + plans/23 §6 sketch it; needs a design discussion.
- Recipe authoring (which rungs ask which flavor) is provisional — his
  eye at a playtest. Ticket/verdict flavor wording likewise.
- Item 31 (garnish/topper pops), item 30 (serve, playtest-gated), item 29
  (race clock, aesthetics), the ladder wording eye pass, a real playtest
  of earned time + ladder + relax + recipe.
- PUSH PENDING: five local commits (b2519db..758ec1d) await his word.

## 7. Next session focus

The visionary's instruction: immediately continue by DISCUSSING plans/22
step 9 (the realm's favor) BEFORE any editing. Step 9 is the last step of
the plans/22 arc and GREW (plans/23 §6): it now carries patience->payout
(spend OrderFlow.patienceDebt), softened-mess-as-mood (weighedMess ->
the giant's mood, never stars), the coin drip (small frequent wins), and
reward-continuous-past-3-star (coins keep climbing toward the perfect
cake). Open design questions to bring: the favor curve (how mood moves
coins), where the drip ticks (per shot? per fresh paint?), how the HUD
names it (plans/22 §2.6: "the realm's favor", never "tip"), and whether
awardPay's per-star column absorbs or sits beside the continuous reward.
Discuss, pin rulings, then build.

## 8. Recommended reading order

1. This handoff.
2. project/plans/22-timing-and-scoring-redesign.md — §0.5 (the north
   star), §2.6 (the favor spine), §5/§6 (payout + dead-time), §9 (the
   sequence; step 9 is all that remains).
3. project/plans/23-dress-the-cake-relax-the-rulebook.md — status block
   (rulings as built) + §6 (how step 9 grew).
4. project/plans/24-the-recipe-and-the-material-law.md — status block
   (as-built deviations) + §2 (the five rulings).
5. src/game/judgment.ts — the relaxed judge (what the favor will pay on).
6. src/game/order-flow.ts — patienceDebt + the earn axes (the favor's
   inputs live here).
7. src/server/room.ts — awardPay + concludeOrder (where the favor lands).
8. git log --oneline -6 — the session's five commits.
