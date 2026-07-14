# Plan 24 — THE RECIPE & THE MATERIAL LAW

**Status: BUILT 2026-07-14 (twenty-sixth session, same day as the draft).
The five §2 rulings executed; §7's prices pinned as recommended (garnish
0.4 s/grain, topper 15 s, FLAVOR_IMPRESS 0.03 — and the bound re-read
dropped SPRINKLE/CHERRY_IMPRESS 0.04 → 0.03 so three terms fit under
star2). AS-BUILT deviations, all reuse-driven: (1) the two flavors are
the CLASSIC FROSTING (VANILLA) + FUDGE (the chocolate) — fudge was
already a full paint row with its own measured splat law (plans/10 §4)
and a shelf/crate/dark-render in the client; the recipe's arrival IS
fudge's rung, zero new physics. (2) The §6 wire re-pin proved UNNEEDED:
the flavor stamp is Room-side scoring state, NOT on the welcome wire —
clients never judge (the impress is the Room's) and the client field is
visuals; snapshot/restore untouched. (3) The flavor term FOLDS INTO the
displayed `dressing` number (one impress family, one HUD line). (4) The
client "+Ns" pops for garnish/topper are DEFERRED to plans/15 item 31
(an honest pop needs the high-water/ask-cap mirrored client-side; an
optimistic one would lie). Verified: 506 headless tests (incl. a
tick-exact Room integration pin for both new clock axes) + a live-bundle
seam run (fudge ticket dealt, color-blind floor, 0.03 flavor lift,
last-coat-wins repaint flip). It extends plans/22 §0.5 and plans/23;
where it and an older material or order law disagree, this is the newer
truth. Step 8 (serve) SKIPPED — plans/15 item 30; step 9 (the realm's
favor) BUILT the twenty-seventh session (the coin drip + the mood
multiplier — plans/22 §9), completing the plans/22 arc.**

---

## 0. The problem, in one paragraph

The relax (plans/23) fixed the scoring's severity, but the ORDER MODEL and
the MATERIAL RULES under it are still inherited guesswork. Today's order
is not a recipe — it is a per-rung pair of numbers (frost X%, N sprinkles)
plus a flourish flag; every giant effectively orders the same cake in a
different size. And the materials disagree with the economy: the clock
speaks only paint's language (earned time reads fresh coverage ONLY), so a
perfect sprinkle burst earns zero seconds and a crowned cherry earns zero
seconds, while the ticket insists dressing is progress. The visionary's
re-think (this session): the patron delivers a REAL order — "a
chocolate-frosted cake with sprinkles", "a fudge cake with a cherry on
top" — and the bakers do their best to fulfill it; every material behaves
by its own honest physics; the clock pays for progress on EVERY axis.

---

## 1. THE MATERIAL LAW — three classes, one physical truth each

1. **PAINT** (frosting) — coats what it hits. FLAVORS (chocolate,
   vanilla, …) are SKINS within the class: a different crate in the
   pantry, the same splat physics. New flavors cost content, never new
   mechanics. A sample's flavor is its LAST coat (repainting chocolate
   over vanilla changes the flavor — it earns no time, but it can fix an
   impress miss: a real choice that costs clock).
2. **GARNISH** (sprinkles) — grips only on paint (ALREADY TRUE: the
   conversion law, plans/10 — grains on bare cake never stick, they are
   mess). Frost first, then dress, is enforced by the material, not a
   rule.
3. **TOPPER** (cherry; lime the decoy) — rests where it lands. The summit
   claimed is the feat; ON FROSTING is what impresses (§2 ruling 4).

The class table lives in `game/toppings.ts` (deliveryWeight/canCrown
already sketch it); this plan names it as THE law.

---

## 2. THE FIVE RULINGS (the visionary, 2026-07-14 — pinned, do not re-litigate)

1. **Frosting flavors are distinct ammo.** First cut: TWO (chocolate +
   vanilla) — prove the model before growing the pantry.
2. **Coverage stays COLOR-BLIND; flavor lives in IMPRESS only.** A frosted
   cake is a frosted cake — any paint counts the floor and the climb;
   matching the asked flavor adds impress. Wrong flavor NEVER zeroes,
   never messes — anything harder rebuilds the punishing rulebook
   plans/23 tore down, one flavor at a time.
3. **THE ONE CLOCK RULE: progress earns time on every axis; redundancy
   earns nothing.** Fresh paint earns (built). A sprinkle grain that
   CONVERTS **and advances the ask** earns a small slice (grains beyond
   the ask are redundancy — nothing, the fresh-vs-recoat law applied to
   garnish). The cherry CROWNING earns a chunk, ONCE per order. All under
   the existing per-order cap (EARNED_TIME_CAP_S).
4. **The cherry rests anywhere (physics untouched) but counts as impress
   only ON TOP OF FROSTING.** One predicate — crowned AND frostedNear —
   drives BOTH the impress lift and the flourish stamp (one truth; two
   subtly different cherry truths is a bug farm). This slightly hardens
   the flourish (a cherry on a bare summit no longer codas) — material
   honesty, accepted.
5. **Per-tier asks are DEFERRED** (see §5).

---

## 3. THE TICKET AS RECIPE — a wish list above one floor

Under the relax, everything above the frosting floor is additive — so a
recipe is cheap: **one floor ("make a cake at all"), and every other line
is an impress-weighted wish.** Fulfilled → impress climbs; missed → the
giant is less delighted; NOTHING above the floor zeroes anyone.

The first-cut grammar (the one-number law holds — every row one number of
one thing):

- The `frost-coverage` row gains an optional **`flavor`** field — the ASK.
  The floor check stays color-blind (met by any paint, ruling 2); the
  flavor feeds impress only. The HUD reads "FROST 8% OF THE CAKE — IN
  CHOCOLATE". Flavor is a QUALITY of the frost row, not a second number.
- Sprinkle rows unchanged (`on-frosting`).
- The cherry stays the DESIRE machinery (no churn) — only its
  impress/flourish predicate changes (ruling 4).

The cake BODY's flavor ("a fudge cake") is PRESENTATION — the s15 FLAVORS
look table, fixed per rung — distinct from the frosting-AMMO asks this
plan adds. The fiction composes: the patron orders a fudge cake (the
dessert that stands) frosted in vanilla (what you throw at it).

Recipe authoring rides the RUNGS table (a flavor column on the frost
ask), so variety lands per-rung now and per-SPECIES with plans/18 later —
the real prize this plan is the substrate for.

---

## 4. IMPRESS grows one term (game/judgment.ts)

    impress = coverage
            + sprinkleFrac × SPRINKLE_IMPRESS
            + (crownedOnFrosting ? CHERRY_IMPRESS : 0)
            + flavorMatchFrac × FLAVOR_IMPRESS      ← NEW

`flavorMatchFrac` = matching painted samples / painted samples (0 when
nothing asked or nothing painted). Bounded like its siblings so COVERAGE
STAYS THE SPINE (the plans/23 bound law: full dressing must not carry a
bare cake a whole tier).

---

## 5. PER-TIER ASKS — deferred, substrate built now

DEFERRED to the plans/18 species-orders pass, three reasons (ruled this
session): (a) prove the model first — nobody has watched a player juggle
even ONE flavor choice under time pressure; (b) the physics is fuzzy at
tier boundaries — a splat's footprint splashes neighboring tiers, so
"chocolate on the middle tier" is a MOSTLY question, and the re-pin law
says no ask is pinned before its measurement (a splash-contamination
study is the gate); (c) per-tier variety is exactly what makes species
orders sing — it belongs to that design session.

THE SUBSTRATE COSTS NOTHING: the flavor stamp lands PER CENSUS SAMPLE
(it must anyway), and geometry already knows `tierOf` — per-zone,
per-flavor queries are free the day plans/18 wants them. No rework.

---

## 6. What it changes (the mechanical surface)

- **core/frosting.ts** — the census sample gains a FLAVOR stamp (last
  coat wins); `paint()` carries the flavor in; a `flavorMatch(flavor)`
  census query. THE WIRE RE-PIN: `restore()`'s format grows the stamp
  (frosting.test.ts pins it — move it on purpose). Deterministic
  arithmetic only; the events-sync is untouched (the impact event already
  carries the topping name — flavors are WIRE-FREE).
- **game/toppings.ts** — the material-class table named; the paint class
  spans the flavor crates.
- **game/judgment.ts** — the flavor-impress term; `crownedOnFrosting`
  (crownedWith AND frostedNear) replacing bare `crownedWith` in the
  dressing AND the Room's flourish stamp.
- **game/order.ts / order-flow.ts / campaign.ts** — the frost row's
  optional flavor; a flavor column on RUNGS; describeRequirement wording.
- **server/room.ts** — earned time generalizes: the scoring phase prices
  converted-and-advancing grains and the first crowning alongside fresh
  paint (same running-gate, same cap).
- **client/** — a pantry shelf per flavor (greybox tint first);
  frosting-view tints splats by flavor; HUD ticket + "+Ns" unchanged in
  shape.
- **tuning.ts** — GARNISH_TIME_PER_GRAIN_S, TOPPER_TIME_S,
  FLAVOR_IMPRESS (§7).

`core/` stays headless-pure; determinism law untouched.

---

## 7. Open rulings for the build (recommendations attached)

- **Garnish time price.** Rec: ~0.4 s per converting-and-advancing grain
  (a good 40-grain burst ≈ 16 s — comparable to a good splat), only while
  `current < target`.
- **Topper time price.** Rec: ~15 s, once, on first crowning-on-frosting.
- **FLAVOR_IMPRESS.** Rec: 0.04 — same family as SPRINKLE/CHERRY_IMPRESS;
  re-read the plans/23 bound (floor + full dressing must stay < star2).
- **Which rungs ask which flavor** (the recipe authoring pass) — the
  visionary's eye; rec: rungs 1–2 ask none (tutorial), 3+ alternate.
- **The ticket + verdict wording for flavor** — his voice, at the build.

---

## 8. Provenance

Drafted from the twenty-sixth session: the visionary's re-think ("the
rules and constraints were made by another AI based on what it thought I
wanted — now I want to re-think this"), immediately after the plans/23
relax was built and serve (plans/22 step 8) was ruled skipped. The
three-class material law, the one clock rule, and the ticket-as-recipe
were shaped in discussion; the five §2 rulings are the visionary's,
verbatim in effect. The deferral of per-tier asks (with substrate now) is
the assistant's recommendation, accepted.
