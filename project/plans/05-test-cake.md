# The Test Cake — three tiers + the crown (slice 3)

*Status: BUILT + browser-verified 2026-07-03; REMAINING: the visionary's
playtest (the exit question below). From the locked roadmap (High Arc →
Test Cake → Frosting + census). Prereqs: slice 2 SUCCESS (plans/03), High
Arc feel GOOD (plans/04). Geometry chosen by headless ballistics study,
not taste: research/03-tier-ladder-study.mts (reproducible, `npx tsx`).*

*Build record: 86 tests green (was 80), tsc strict clean, vite build clean.
Verified live over the loopback room, driven through `__game` with real
protocol messages: 6 clicks level → on cake (tier-2 ledge, 1/3); 7 clicks
level → tier 3 (2/3); at the Giant's next look he sprang "...IT NEEDS A
CHERRY. ON THE VERY TOP. NOTHING ABOVE IT." and the crown row appended —
already met by the tier-3 cherry (the pre-satisfiable-demand watch item
from plans/03, behaving as designed); screw to notch 1, full crank (8,
clamped), fire → landed on the tiers, 3/3 + crown ✓ → WON: score 100,
3 stars, mess 0, waste 1. Screenshot showed cherries perched on the
summit and ledges; HUD read "arc +15° ▮▮▯▯".*

## The one question

**"Do tiers turn the elevation screw from a toy into a tool — and does the
crown rule make the last cherry a real climax?"**

## What replaces what

- The 4×4×3 box cake → **three stacked square tiers** (a Giant's wedding
  cake, greybox).
- The peak-zone stand-in (`ZoneId "peak"`, `PEAK_HALF`, the painted square)
  → **the CROWN requirement**: the cherry as the uppermost settled topping,
  resting on the top tier (visionary, 2026-07-03: the real rule was always
  the crown; the peak square was scaffolding).
- The Giant's DEAD CENTER demand → he demands THE CROWN.
- The settle-ladder pins (5 short / 6–7 on / 8 over) → **per tier × notch**
  pins from the study below.

## Tier geometry (candidate A — study winner)

Concentric square tiers at the old cake spot, `CAKE_Z = -30` (plinth→center
still 18 m). `half` = x/z half-extent:

| tier | half | bottom→top | role |
|------|------|-----------|------|
| 1 (bottom) | 4.0 | 0 → 2 | the old footprint; wide ledge |
| 2 (middle) | 3.0 | 2 → 3.5 | 0.75 m ledge ring |
| 3 (top) | 2.25 | 3.5 → 5 | **PEAK_HALF 2.25 honored verbatim** — the summit |

Why A over the squat/mid candidates: the squat cake loses the notch-0
tier-2 shot entirely (the topping bounces off); A keeps every tier
reachable, reads one-click-per-tier at notch 0, and a 5 m cake is the
right silhouette for a Giant's table.

## The settle ladder, re-pinned (study data, traverse 0)

Impact speeds against SPLAT_SPEED 13; scoring truth = rest position.

| notch | clicks | rest | verdict |
|-------|--------|------|---------|
| 0 (55°) | 5 | ground z −25.3 | short, places |
| 0 | 6 | **TIER 2** ledge z −27.5 | places, wedges against tier-3 wall |
| 0 | 7 | **TIER 3** z −31.4 | places — the knife-edge flat crown |
| 0 | 8 | ground z −39.6 | clean over the whole cake, splat, mess |
| 1 (70°) | 7 | **TIER 1** ledge z −26.7 | splat |
| 1 | 8 | **TIER 3** z −28.7 | splat — **THE tier-clearing shot** |
| 2 (85°) | any | ~4 m in front | comedy, unchanged |
| 3 (100°) | any | behind the machine | comedy, unchanged |

**The design finding:** the winch clamps at 8 clicks, so notch 1 + full
crank is the crown shot that CANNOT overshoot — crank to the stop and
fire. The flat notch-0 crown exists but sits one click from raining a
cherry past the cake. Risky-flat vs reliable-steep: the High Arc earns
its place without a single number changing (+15° ladder KEPT, per
plans/04; this table is the tier data that decision waited for).

## The crown rule (game/judgment.ts)

New requirement kind, physicalizing the 2D `countCrown` support-chain:

```
{ kind: "crown"; topping: string }
```

Met iff the **uppermost settled topping on the cake** (strictly greatest
rest y; ledger order breaks exact ties) is (a) the demanded topping and
(b) resting on the TOP TIER. A lone cherry on a lower ledge is not a
crown — the summit must be claimed. A lime landing higher LATER un-mets
the row (checks recompute; the decoy becomes a live hazard — grab the
wrong crate at the wrong moment and you ruin the crown). `current` is
0 or 1; a finished order still never un-finishes.

Checklist/banner words: `1 × cherry AS THE CROWN`.

## Zones become tiers (core/arena.ts)

- `CAKE_TIERS` (the table above) replaces `CAKE_POS`/`CAKE_HALF`;
  colliders, visuals, and tests all read it — still ONE definition.
- `tierOf(pos): number | null` — topmost tier whose footprint holds the
  rest position at its top level (same 0.1 wedge slack as before).
  `isOnCake(pos) = tierOf(pos) !== null`.
- `ZoneId = "cake" | "tier1" | "tier2" | "tier3"` — "peak" retires;
  `count-in-zone` stays alive with honest zones (order vocabulary for
  future slices: "2 × cherry on the MIDDLE TIER"). Labels: BOTTOM/MIDDLE/
  TOP TIER.

## The Giant (game/patron.ts)

Rule 3 (progress-based demand, once, appends a row) now springs:

> "...IT NEEDS A CHERRY. ON THE VERY TOP. NOTHING ABOVE IT."

appending `{ kind: "crown", topping: "cherry" }` — guard: no crown row
already present. Everything else (thunder, nag, reminder, whim, grumble)
stands. Standing order stays `3 × cherry ON the cake`, parShots 6,
passScore 50 — the crown demand is the tier showcase; retune knobs live
in plans/03 if the playtest wants them.

## Touches

- `core/arena.ts` — CAKE_TIERS, tierOf, isOnCake, ZoneId tiers, colliders.
- `game/judgment.ts` — crown kind, checkRequirements global-view pass,
  describeRequirement, ZONE_LABELS.
- `game/patron.ts` — crown demand utterance + guard.
- `client/main.ts` — three tier boxes (frosting-tinted stack), peak square
  and PEAK_HALF deleted; pennant stays.
- Tests re-pinned: ballistics (ladder table above, via the real tierOf),
  judgment (crown + tier zones), order/patron (crown rows replace peak
  rows). Room untouched except through imports.

## Verification

- `npm test` + `npx tsc --noEmit` — the ladder table becomes pins; crown
  law unit-tested (uppermost, top-tier, lime-usurper, tie, un-met).
- Browser: three tiers visible; notch 0 × 6 clicks lands tier 2; notch 1
  × 8 clicks crowns; Giant demands the crown at half progress; checklist
  row reads AS THE CROWN; a lime dropped on top after the cherry flips
  the row to ✗.

## Exit

Playtest (the visionary's hands): does climbing the cake tier by tier
feel like decorating, and is the crown shot a climax? Collect real shot
data for the elevation-ladder re-spacing revisit (plans/04 options).
Then: frosting + sprinkles + census (research/01 §F).
