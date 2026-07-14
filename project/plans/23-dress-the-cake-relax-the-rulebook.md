# Plan 23 — DRESS THE CAKE / RELAX THE RULEBOOK

**Status: PROPOSAL, DRAFTED 2026-07-13 (twenty-fifth session) from the
first playtest of the plans/22 redesign and the design discussion it
opened. This is the design of record for the scoring RELAX; it does not
yet build — the next session executes it. It extends plans/22 (the timing
+ scoring redesign) and serves its §0.5 north star; where it and an older
scoring law disagree, this is the newer truth and names what it
supersedes.**

---

## 0. The problem, in one paragraph

The playtest surfaced two things. First, the goal was invisible — the
player met the 8% frost floor, felt "done," and only went further out of
curiosity (fixed in plans/22 step 7, the coverage ladder). Second, and
deeper: **our rules and constraints have grown too severe.** The scoring
is a stack of gates and penalties — miss any required row and the patron
goes HUNGRY (zero, no matter how beautiful the rest); fire too many shots
and your score decays; every wild miss stings. That rulebook punishes the
very thing the game is about — a dwarf doing his frantic best toward a
cake he can never perfect. This plan relaxes the rulebook so the
difficulty lives where it belongs: in the craft, not the punishment.

---

## 1. The cake must be DRESSED, not just frosted (the visionary's reframe)

Frosting is the **base coat** — the table stakes, every cake needs it.
The **dressing** (sprinkles, the cherry, and decorations to come) is what
turns a frosted cake into an *impressive* one. So the perfect cake (the
§0.5 north star) is not "100% frosted" — it is **fully frosted AND
beautifully dressed.** The frosting-coverage ladder (plans/22 step 7) is
the FOUNDATION axis of the climb; the dressing is the tier that actually
impresses the giant. This means the sprinkle and cherry asks should not
sit *beside* the frosting as separate pass/fail boxes — they are the next
rung of the same ambition: **cover it, then dress it to impress.**

---

## 2. Casino tactics, for good (the audit criterion)

The visionary's frame: borrow the casino's *engagement craft* and drop
its *extraction*. Strip the predatory half (monetization, loss-chasing,
FOMO) and what remains is good game-feel. The lens hands us the exact
criterion:

> **A good casino makes you feel like a WINNER who wants one more go. A bad
> rulebook makes you feel like a LOSER who got nothing.**

Every tactic worth KEEPING *rewards and pulls forward*. Every rule worth
RELAXING *punishes and zeroes out*. The good crafts, and where they live:

- **The front-loaded progress bar** — the log coverage bar (plans/22 step
  7, already built): early progress feels substantial, perfection recedes.
- **Variable reward** — the catapult IS a variable-ratio machine; every
  lob is "will it land?!" The slot-machine pull is built into the physics
  for free. Never sand it down.
- **Small, frequent wins** — coins ticking up per good shot (the drip),
  not one payout at the end (the "+Ns" pop, step 6b; the coin drip, step 9).
- **Sensory celebration** — SPLAT!, the pop, the verdict spectacle: bells
  and lights on every small win.
- **Never total zero** — the one thing a casino never does is send you off
  feeling you made nothing. The sharpest indictment of our current rules.

---

## 3. The thesis: move the difficulty from the RULEBOOK to the CRAFT

The cake should be hard to perfect because **the catapult is hard to
master and perfection is far away** — engaging, skill-based, casino-good
challenge you never resent. It should NOT be hard because one missed
sprinkle zeroes a gorgeous cake, or because every wild miss stings. That
is punishment, and it reads as the game telling a dwarf who tried his
heart out that he FAILED. **Relax the rulebook all the way down; the
catapult and the impossible cake keep it plenty hard.** (The measured
proof it stays hard: research/21 — a flawless solo line tops out at ~34%
on the giant cakes; the perfect cake is unreachable by design.)

---

## 4. THE AUDIT — relax / keep

### RELAX — these punish you for playing

1. **The all-or-nothing Gate 1 (the big one).** Today, miss ANY required
   row → HUNGRY, zero stars, zero pay, however beautiful the rest (35%
   frosted but one sprinkle short = nothing). The exact opposite of "points
   for getting closer." → The frosting FLOOR stays as a minimum (an
   unfrosted cake isn't a cake), but the dressing asks (sprinkles, cherry)
   become **"impress me more" layers that ADD stars/coins, never gates that
   can zero you.** The giant is *less delighted* without his sprinkles; he
   is never sent away with nothing the dwarves made.
2. **The par-shots / waste penalty.** We decay the score for firing more
   shots — fighting the "keep firing toward the perfect cake" pull head-on.
   → **Drop waste as a penalty.** If efficiency matters at all, a small
   *bonus* for a tidy line, never a tax on trying.
3. **The mess penalty.** Every off-cake glob stings the score, but the
   misses ARE the comedy (frosting down the wall = "Overcooked with
   catapults"). → Mess no longer touches stars. At most it feeds the
   giant's MOOD a little (the realm's favor, step 9) — a raised eyebrow,
   not a lost star.
4. **The burial gotcha.** Frosting over your own sprinkles un-counts them —
   physically honest but an unseeable punishment. → Once dressing is a soft
   impress-layer, this stops mattering; leave it as physics, stop letting
   it fail you.

### KEEP — the good pull, and the honest challenge

1. **The frosting floor — but LOW.** A cake must be frosted to be a cake.
   Base camp; forgiving.
2. **The coverage → stars → coins climb.** The north star engine (the log
   bar, milestones, the receding perfect cake). Keep and amplify.
3. **Earned time.** The positive clock — a good shot buys more play. Pure
   casino-good. Keep.
4. **The physical challenge — protect it fiercely.** The catapult is hard
   to aim; perfection is far. ALL the difficulty should live here, and it
   is plenty. Relax the scoring around it; do not touch the physics or the
   aspiration.
5. **Asks as data.** The species-orders content (plans/18) still rides on
   the patron asking for specific things. Keep the ASKS — change only what
   missing one COSTS: from "hungry" to "less impressed."

### The pushback (do not over-correct)

Don't flatten to NO resistance. If nothing can be lost and every cake is a
triumph, the striving goes slack — the want/give gap only lands if *give*
is genuinely hard. But the resistance comes entirely from the craft and
the aspiration, both already brutal. Relax the rulebook; keep the mountain.

---

## 5. What it changes (the mechanical surface)

Squarely in `game/judgment.ts` (the scoring), with the requirement model
in `game/order-flow.ts` / `game/order.ts`. `core/` untouched; determinism
unaffected.

- **The two-gate model → a floor + an additive impress score.** Gate 1
  collapses to ONE gate: the frosting floor (below it, the only total
  fail — a low bar). Above the floor the cake is ACCEPTED, and grading is a
  CLIMB, not a wall: coverage is the base, dressing (sprinkles, cherry)
  ADDS to the impression. Gate 2 (REFUSED-below-passScore) softens or
  retires — a passed cake is served; how well it's dressed sets the stars.
- **Waste drops from `judge()`** (the 0.10 axis; or flips to a small tidy
  bonus). **Mess drops from the star/score axes** and moves to the giant's
  mood (step 9). Neatness likely stays (it's a *quality* of the frosting,
  not a *punishment* for missing).
- **Stars come from a combined "how impressive" measure** (coverage +
  dressing), not coverage alone — RULING PENDING (§7): does dressing lift
  STARS, or only COINS? The reframe ("dressed to impress") leans stars.
- **Reward continuous past 3★** (§0.5): coins keep climbing with coverage
  and dressing toward the perfect cake — lands with the realm's favor
  (plans/22 step 9).
- **The verdicts re-tone.** HUNGRY shrinks to "you didn't even frost it";
  REFUSED softens or goes; DELIGHTED scales with how close to
  perfect-and-dressed. The patron wanted perfection, the dwarves did their
  best, and he reacts to the GAP (the comedy engine, §0.5) — never with
  "you gave me nothing."

---

## 6. How this reshapes plans/22's remaining steps

- **Step 8 (serve)** is unchanged in shape but now floor-gated on the ONE
  floor (not the full checklist) — you can serve any cake the giant will
  accept, dressed or not; serving a barely-dressed cake just banks a humble
  grade.
- **Step 9 (the realm's favor)** GROWS: it now carries the softened mess
  (mood, not stars), the continuous-reward-past-3★ ruling, AND the
  coin-drip. It becomes the home of "the giant's mood grades the service."
- The **star thresholds** (plans/22 step 4, provisional) get re-read once
  dressing lifts the grade — the coverage-only tiers may shift when
  dressing contributes.

---

## 7. Open rulings for the build (the visionary pins these next session)

- Does dressing (sprinkles/cherry) lift **STARS**, or only **COINS**?
  (Recommendation: stars — "dressed to impress.")
- The floor value (keep 8%? lower?) and whether it's the ONLY total-fail.
- Gate 2 (REFUSED): soften to a low bar, or retire entirely?
- The impress formula: how much each dressing element adds; how coverage
  and dressing combine into stars.
- Waste: drop entirely, or flip to a small tidy bonus?
- The verdict re-tone (the patron's new lines — the comedy of the gap).
- Neatness: keep as a quality lift, or fold it in?

---

## 8. Provenance

Drafted from the twenty-fifth session: the first playtest of the plans/22
redesign (the player passed at 10%, felt done at the floor), the north
star that discussion produced (plans/22 §0.5 — the perfect cake, the fun
in the want/give gap), and the visionary's ruling that the rules had grown
too severe, to be relaxed with the casino's engagement craft turned to
good. The audit's relax/keep split and the "difficulty in the craft, not
the rulebook" thesis are the visionary's, sharpened in discussion and
blessed for the build.
