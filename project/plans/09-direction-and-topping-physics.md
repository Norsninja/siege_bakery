# Plan 09 — Direction (holistic) + the topping-physics law (2026-07-04/05)

The direction-setting discussion the visionary asked for after plans/08,
grounded in three commissioned research briefs: research/07 (party-game fun
evidence), research/08 (2D lineage brief), research/09 (turntable/dessert
feasibility). Decisions below are AGREED direction; only §7 is BUILT.

## 1. The fun thesis (evidence-backed, research/07)

Task overload, not difficulty: always more jobs than hands (Ghost Town's
Overcooked formula — our pantry/traverse/winch/lever loop already is it).
Failure = timer + low score, never a hard stop. Roles stay fluid; the level
creates cooperation, not rules. Comedy lives in the lob and the splat and
must be TRACEABLE to player input — untraceable failure reads as bugs and
turns chaos to rage (the razor behind §7). Coverage-painting is the genre's
inclusive mechanic and the end-of-round reveal is the trophy (Splatoon):
**the dessert report — a slow orbit of the cake at Judgment — is PROMOTED**
from someday-aesthetic to the retention hook; it should exist by the friend
test. One line: *a crew of tiny bakers with more jobs than hands, an honest
machine whose mistakes are always yours, and a cake that shows everyone
exactly what you did.*

## 2. The campaign ladder (star-gated authored rungs, ONE twist each)

1. **Humble cake** — single-tier (CHEAP: CAKE_TIERS is data, research/09),
   one town, short clock (~150s; the genre converges on 2–4 min rounds —
   300s is the ceiling and belongs to the big cake only).
2. **The three-tier cake** — today's build, 300s. Twist: scale.
3. **Two towns** — twist: separation (the genre's mid-campaign disruption
   class). The dessert outgrew one firing line; players have FELT the far
   side they can't reach.
4. **New projectiles** (fudge etc.) as the one-new-demand of later rungs —
   the lineage's "toppings have point costs, unlocked over a campaign"
   (research/08 §3).
5. **Turntable + small desserts** — later chapters, see §5–6.

Patron behavior trees (bite, sneeze, amendments — research/08 §2) are the
WITHIN-rung disruption machine. The Crowning (champion's formal final
cherry, rescue pass — research/08 §4) is unported round-ending ceremony that
pairs naturally with the dessert report.

## 3. Towns: crewed vs scenery; the collateral toll

Map towns are scenery; **machines firing are what matter** (visionary).
Playable phase needs exactly: two crewed towns, players choose at start to
stack or split. Two towns were always cooperative — "it takes two towns to
feed one giant" (research/08 §1) — and the un-ported **frosting toll**
(overshoots bury the partner's town, shared penalty, per-town attribution
for banter, nobody dies) is the risk mechanic for the power extension:
an overshot far-top lob lands on the OTHER town. One design, two features.

## 4. The economy law changes: rung-authored potential

Physics: far TOPS are a power problem (more winch clicks = higher lob =
steeper descent — buyable); far WALLS are geometry (a ballistic from your
town can never strike a surface facing away) — **the far half of the walls,
~⅓ of the whole dessert, is forever the other town's territory**. Power
extension study (extend research/06 to sweep click ladders) runs BEFORE the
towns re-pin.

**Potential moves from runtime-measured to RUNG-AUTHORED** (order-carried,
as today — only its source changes). Live of-potential grading makes any
reach upgrade a trap (buying reach raises your own bar without raising
throughput). Authored per-rung asks (Overcooked's fixed star thresholds)
make reach upgrades genuinely valuable and keep "solo is hard mode."
This RETRACTS the machines-fired ratchet discussed en route (mid-order bar
jumps, troll-shot grief — both die with it). research/06 becomes the
author's balancing tool and, later, the per-map baking pipeline.
TOWN_POTENTIAL stays as the measured reference table authors pin from.

## 5. The turntable: second-town upgrade, not a rung twist

Dwarven turntable UNDER the big cake (fiction approved: they dug Moria).
It is the small-crew alternative at the second town: not enough players to
split → buy the turntable instead. Player-cranked, discrete clicks —
negotiable motion ("hold... NOW"), the windmill class of fun, and a new
station preserving task overload for duos. Separated from cookies/cupcakes
(visionary: small desserts don't need it). Build order: towns split path
first, turntable second act. Known costs (research/09): paint frame must go
cake-local (core + client + wire together); crank fits the op protocol;
the settled-solid risk is DISSOLVED by §7 (frozen = attached to the frame).

## 6. Cookies / cupcakes: a separate later chapter

Many small independent targets are a coverage-model restructuring (one
scalar coverage, single-center zone math, hemisphere ask — research/09 A).
Not a data swap. Scheduled after the turntable chapter, not before.

## 7. THE TOPPING-PHYSICS LAW (BUILT this session)

Two regimes, promoted to stated law: **frosting is SURFACE** (paint at
first impact, add-only, permanent, judged by census), **solids are
OBJECTS** (physical, knockable, judged as they lie). **No smearability**:
players can only add — neatness variance already IS the careless-layering
consequence; subtraction is reserved as a Patron verb (the Bite, integrity
axis). *The bakers add; only the Giant subtracts.*

Knockability is load-bearing (kept): it is the game's ONLY eraser (a decoy
crown can only be shot off), the crown hazard, the sequencing strategy, and
the Sneeze/Bite substrate. What was wrong was creep — settled solids
drifting from solver noise nobody caused (the un-funny, untraceable kind).

**FREEZE-ON-SETTLE + WAKE-ON-PROXIMITY** (core/projectiles.ts): a settled
solid's body turns Fixed — part of what it rests on, zero creep; any moving
shot within WAKE_RADIUS (1.0m — beats closest approach at 16 m/s max launch;
RE-CHECK when the power extension moves speeds) wakes it to dynamic so real
hits knock it honestly; woken solids re-settle SILENTLY and re-freeze (their
settle was scored once; the live-truth ledger re-reads positions either
way). spawnAtRest enters via the waking path (a snapshot can catch a body
mid-roll; freezing that directly would freeze it floating). Movers = live
shots + woken solids still actually moving (a still woken solid must not
cascade-wake piles). Deterministic from body positions alone — no new wire
traffic. Accepted residue (visionary signed off): a frozen stack is
infinitely rigid until woken — an impossibly balanced cherry stays balanced
while nothing flies near it.

Verification: 172 vitest green (4 new in core/projectiles.test.ts: freeze,
near-miss wake + silent in-place re-freeze, direct-hit knock, late-join
waking path), both tsc legs; live loopback smoke — frost → sprinkle scored
frozen → near glob at 2.5° woke it → count held, no console errors. The
WIN-path pins (81/100, 0.566) survived unchanged; its live-truth
choreography comment now cites this law. Also filed: research/08 (lineage),
research/09 (feasibility) from the discussion's agent briefs.

## 8. The projectile pass (DESIGNED, HELD — 2026-07-05; becomes plan 10)

Decided in discussion, held for test-and-feel; build after the decomp,
before towns (it touches Room impact handling; the friend test wants it):

- **Sprinkle burst: PROXIMITY FUSE** — burst at X meters from the CAKE
  (analytic tier-stack distance, arena.ts math; deterministic, readable,
  cannot pop mid-arc; the 2D precedent). X ~1–1.5m hypothesis. **Impact
  burst as fallback** for shots that never near the cake (floor pop =
  honest visible mess). Grains inherit parent velocity + seeded spread, so
  landing-energy texture survives with no extra rule (hot = wide).
- **Grains are tiny OBJECT capsules** (regime law holds), chunky-cute
  (~0.15–0.2m × 0.03–0.05 radius — true scale is physics-unstable),
  MULTICOLOR (color-variety judgment stays deferred). The freeze law is
  what makes grain counts affordable (frozen grains ≈ free).
- **Seeded scatter rides the shot events** — the "seed S" the pivot record
  always reserved; client replicas replay bursts identically, no new wire
  paradigm. Batch grain-settle broadcasts per burst.
- **Density is the visionary's eye**: GRAINS_PER_SHOT as a dashboard
  constant; demo 20/40/80 in-preview, he picks (30 judged too sparse on
  paper). Ask re-pins to grain counts ("80 × SPRINKLES ON THE FROSTING"
  ≈ two good shots — same shot economy as today's 2).
- **Two judgment rules**: grains NEVER crown (crowns are placed solids,
  grains are garnish); mess weighs a burst as ONE delivery with a
  fractional on-cake ratio (else one wild shot = 60 floor entries and the
  axis drowns).
- Underneath it all: **toppings-as-data made physical** — per-topping body
  params (radius/shape, restitution, burst spec, consume-on-impact) in the
  pantry table, so fudge later is a data row, not a rework. Cherry stays
  singular and weighty.
- Catapult power for reaching town 2 with overshoots: NOT this pass —
  that's the power-extension study in the towns arc (§9 below).

## 9. The build sequence (standing)

Room.tick decomp → projectile pass (§8) → power-extension study (extend
research/06; pick new TENSION_MAX_CLICKS from measured far-top reach +
overshoot-into-town data) → towns slice (two crewed towns, choose/split,
rung-authored potential, collateral tolls) → dessert report orbit →
**the friend test** → turntable second act. Watch at the friend test: neatness is the prime chaos-killer
suspect (research/07: if playtesters go quiet and careful, loosen NEATNESS,
never coverage; ours already reads stingy at 0.59 on the clean WIN).
