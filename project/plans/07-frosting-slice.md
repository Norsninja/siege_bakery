# The Frosting Slice — round tiers, frosting + census, sprinkles, the honest order (slice 4)

*Status: PLANNED 2026-07-03. From the locked roadmap (research/01 §F: Patron ✓ →
Test Cake ✓ → **frosting + census** → second catapult/towns → art). Prereqs all
met: Test Cake playtested GOOD (plans/05), decomp phase done — client frosting
code has tested modules to live in, and main.ts is wiring only (plans/06).
Sequencing LOCKED by the visionary (handoff 2026-07-03): ROUND tiers ride at the
FRONT of this slice, so the coverage census is built ONCE against final
geometry — not retrofitted after an art pass.*

## The one question

**"Does frosting turn the cake from a target into a CANVAS — and does the
order finally read like a bakery ticket instead of arithmetic homework?"**

Secondary: gate 2 of the Judgment comes home. 75% of the 2D assembly score
measured frosting (coverage 0.35 + neatness 0.15 + integrity 0.25); this slice
restores the real weights.

## What this slice contains (and the locked internal order)

1. **R — Round tiers.** Cylinders replace the square tiers. Re-run the
   ballistics study, re-pin the settle ladder. FIRST, so everything below is
   built against final geometry.
2. **F — Frosting.** A new pantry topping that flies like everything else but
   is CONSUMED on impact — it paints a deterministic sample-point field on the
   cake's surfaces. Coverage + neatness measured from the field; gate-2
   weights return home.
3. **S — Sprinkles.** A solid topping + the `on-frosting` requirement kind:
   sprinkles count only where frosting already is (the 2D support-chain rule,
   re-bodied as a census lookup).
4. **O — The honest order.** Standing order redesigned around the decorating
   truth: FROST the cake, sprinkles ON the frosting, and the Giant's crown
   demand is the ONLY cherry row that ever exists. The cherry-arithmetic
   confusion (playtest note 1, 2026-07-03) dies here.

Explicitly OUT of this slice (recorded so nobody scope-creeps them in): the
Bite/carving (integrity stays constant 1), wind + the Sneeze, the Crowning
finale, per-topping ballistics profiles, towns, frosting colors, the friend
test. Elevation-ladder re-spacing stays deferred until this slice's playtest
gives its verdict — this slice IS the "frosting-era reasons" plans/04 waited
for, but the verdict comes from hands, not from us.

---

## Phase R — round tiers

Same three-tier silhouette, square cross-section → circle. `CakeTier.half`
becomes `radius`, colliders become `RAPIER.ColliderDesc.cylinder(hy, r)`,
`tierOf` goes radial (`hypot(x, z − CAKE_Z) ≤ radius` at top level, same 0.1
wedge slack), client renders `CylinderGeometry`. Candidate A-round = radii
4 / 3 / 2.25 with the pinned heights — at traverse 0 a cylinder and its old
bounding square present the SAME front edge and depth along the centerline,
so the pinned ladder is expected to survive verbatim. Expected ≠ pinned:

**research/04-cylinder-tier-study.mts** (port of 03) re-fires the full
notch × clicks grid at cylinder candidates and reports rest tier + impact
speed. Two additions the frosting census needs from the same script:

- **Traverse spread check**: a handful of shots at traverse ±8° / ±14°
  confirming the side ledges catch toppings rather than shedding them off
  the curved edge (rounder tiers have no corners to wedge against).
- **Single-splat coverage table**: for each on-cake landing, paint a fresh
  FrostingField and report points painted + coverage % — the data that pins
  the splash-radius constants, the standing order's `frac`, and `parShots`.
  (Runs only once phase F's field exists; the study script grows a second
  section then. Geometry verdict does not wait for it.)

If A-round sheds the 6-click tier-2 shot, widen ledges (candidate B-round:
radii 4.2 / 3.1 / 2.3) — the study decides, taste doesn't.

Touches: `core/arena.ts` (radius, cylinder colliders, radial tierOf),
`client/scene.ts` (CylinderGeometry), `core/ballistics.test.ts` +
`core/arena` pins re-pinned (radial law gets its own test: a point that was
inside the old square's corner region is now OFF the tier).

## Phase F — frosting

### The body (deliberately NOT a voxel sim — plans/06 law, reaffirmed)

Frosting is a projectile like any other: a glob leaves the machine on the
same deterministic arc, announced by the same `shot` message. The difference
is the LANDING: on first impact the glob is **consumed** — removed from the
world (it is paint, not an obstacle, and it never enters the settle ladder) —
and its impact point + impact speed become a **paint event** on the frosting
field. Impact position and speed are deterministic functions of the shot
parameters, so every client and the Room compute byte-identical fields from
the same `shot` events. Sync-shots-not-surfaces holds without carrying a
single surface byte in play (the welcome snapshot is the one exception, below).

### The field (core/frosting.ts — the census embryo grows up)

- **Sample points**: a deterministic polar grid over each tier's EXPOSED top
  ring (annulus from the tier above's radius to this tier's radius; full disc
  on the summit), points ~0.45 m apart, y = tier top. Order 200–300 points.
  Tier SIDES are deliberately unsampled: lobs arrive from above; demanding
  frosted walls from a catapult is homework, not comedy. Recorded here so
  nobody "fixes" it.
- **FrostingField**: `coats: number[]` per sample point (JSON-friendly —
  it rides the welcome). `paint(impactPos, impactSpeed) → pointsPainted`:
  - **dollop** (impact below SPLAT_SPEED 13): radius ~0.9, +2 coats — thick,
    tidy, small.
  - **splash** (at/above): radius grows with speed (≈1.2 + 0.09·(v−13),
    clamped ~2.4), +1 coat — wide, thin. Frosting WANTS to arrive hot:
    coverage per shot scales with landing energy, at neatness cost. This is
    splat-vs-place graduating from readout to CONSEQUENCE (port map C7).
  - A vertical band (|Δy| ≤ 1.2) keeps a splash on one story: tier-3 spray
    can drip onto the tier-2 ledge (adjacent, charming) but never paints
    tier 1 from the summit. Exact constants pinned by the study table.
- **coverage()** = painted points / all points. **neatness()** = 1 − clamped
  σ(coats over painted points) — even single coats are neat, dollop-on-splash
  patchwork is not. **frostedNear(pos)** = a sample within ~0.6 m has paint
  (the sprinkle support-chain oracle). **snapshot()/restore()** for welcome.

### Frosting in the ledger (mess + the Giant, for free)

Every paint event also enters the Room's settled ledger as
`{topping: "frosting", pos: impactPos, onCake: pointsPainted > 0}`. A glob
that paints nothing is floor frosting: the mess axis and the Giant's
floor-thunder rule work UNCHANGED. But frosting is **paint, not a solid**:
it can never claim the crown and never usurps it (a splash near the cherry
must not void "NOTHING ABOVE IT" — there would be no recovery, since paint
cannot be picked back up). This distinction is a data row, which is how
**game/toppings.ts** is born (port map B5, minimal): `{form: "solid" |
"frosting"}` per topping id. Room, judgment, and shots-view all read the
table instead of matching strings.

### Gate 2 comes home (game/judgment.ts)

- New requirement kinds:
  - `{ kind: "frost-coverage"; frac: number }` — current is the covered
    fraction (0..1); the HUD renders both sides as percent.
  - `{ kind: "on-frosting"; topping: string; needed: number }` — counts
    settled solids at rest ON the cake whose local sample is painted.
    Live recompute, like every row: frost applied UNDER a waiting sprinkle
    later still counts it (accepted quirk — the census is a pure function
    of present state, and "frost around your sprinkles" is legal decorating).
- `checkRequirements` / `evaluateOrder` / `judge` gain the field parameter.
- `judge()` restores the 2D formula: **0.35·min(1, coverage/required) +
  0.15·neatness + 0.25·integrity + 0.15·(1−mess) + 0.10·waste**, where
  `required` = the order's frost row frac (0.4 default, as in 2D) and
  **integrity ≡ 1 until the Bite exists** — honest: the cake is undamaged,
  full credit, and the axis is already wired for the carve slice.
- Words: `FROST 50% OF THE CAKE`, `4 × sprinkles ON THE FROSTING`; the
  banner's score line grows coverage/neatness so gate-2 refusals explain
  themselves.

### The wire (game/protocol.ts)

- `welcome` gains `frosting: number[]` (the coats snapshot — late joiners
  and refreshers inherit the painted cake exactly; F2 discipline).
- The re-deal `order` broadcast gains `fresh: true`, and the Room **resets
  the field with the ledger**: the Giant licks the cake clean between
  orders (tone-true, and a fresh "FROST 50%" row must not start half-met).
  Solid litter stays where it lies, as before — paint is the exception
  because paint is the scoreboard.
- `scored` is unchanged in shape — a paint event broadcasts as
  `{topping: "frosting", onCake: painted > 0, order, checks}`, and the
  existing client flash logic ("the patron counts…" / "didn't stay…")
  reads correctly as-is.

### The client (new module, decomp law: never back into main.ts)

- **client/frosting-view.ts**: owns the client's local FrostingField +
  one `InstancedMesh` (a flattened blob per sample point; scale 0 unpainted,
  swelling slightly with coats). The player sees EXACTLY what the census
  sees — the greybox virtue. Painted from the local sim's impact events
  (deterministic twin of the Room's), restored from welcome, cleared on
  `fresh`.
- **shots-view.ts**: spawns paint-form toppings with consume-on-impact;
  removes their meshes when the body leaves the world; reports impacts
  outward so main can wire them to the frosting view.
- **scene.ts**: two new pantry crates (frosting tub, sprinkles crate) —
  four crates on the shelf now; `hud.ts` grows their `InteractableKind`s,
  prompts, and a `SHELF_TOPPING` map so main.ts's pickup stays one line.

## Phase S — sprinkles

A solid topping, physically identical to a cherry for now (per-topping
ballistics profiles stay deferred — one settle ladder for all solids is a
feature while the ladder is the skill). The 2D airburst ports later as
flavor; v1 is one bag that lands and counts. All the rules work arrived in
phase F (`on-frosting` kind, toppings table, crate): this phase is the crate
going live in the standing order and its tests.

## Phase O — the honest order

**THE ONE-NUMBER LAW** (from playtest note 1): every row is ONE number of
ONE thing, and **a topping appears in at most one row per order.** The old
confusion — "3 × cherry on the cake" + "1 × cherry AS THE CROWN" possibly
meaning 4, nag-able to 5 — becomes impossible by construction.

- Standing order (room.ts): `FROST 50% OF THE CAKE` + `4 × sprinkles ON THE
  FROSTING` (numbers pinned by the study + smoke; `parShots` re-pinned
  likewise, expect ~10, `passScore` stays 50).
- The Giant's crown demand stays a mid-order surprise (it playtested as a
  climax) and is now the ONLY cherry row that ever exists. Cherries have no
  standing row: before the demand, the cherry crate is pure temptation.
  Limes remain the decoy — never ordered (standing decision).
- Patron arithmetic goes fraction-proof: progress = mean over rows of
  min(1, current/target) (the old raw sums would let a 0.5-target frost row
  poison the half-done check). The nag tightens COUNT rows only — "MORE.
  SPRINKLES." — never the frost fraction, never the crown.
- The 2D "cherry demand when the cake looks good" rule is now real: the
  demand's progress trigger INCLUDES coverage, so he demands the crown when
  the cake is actually getting dressed.

## Commit plan (each gated by `npm run check`; decomp discipline holds)

- **P0** — this plan.
- **R1** — research/04 cylinder study + results appended; geometry verdict.
- **R2** — round tiers: arena + scene + re-pinned ladder/zone tests.
- **F1** — game/toppings.ts + core/frosting.ts + tests (field determinism,
  paint law, band law, coverage/neatness, frostedNear, snapshot round-trip).
- **F2** — projectiles consume-on-impact + tests (impact reported once, no
  settle, body gone, resting() clean).
- **F3** — judgment/order: new kinds, field param, weights home, words +
  progress formatting + tests.
- **F4** — room + protocol: field authority, paint→ledger→scored, welcome
  coats, fresh flag + field reset; NetFx grows restore/reset (client no-op
  stubs keep it compiling) + room/net-handler tests.
- **F5** — client: frosting-view, crates, prompts, % rows, shots-view
  consume handling, main wiring (~10 lines). Browser smoke.
- **O1** — standing order + patron normalization + pinned numbers + tests.
- **O2** — verification playthrough (below) + build record + CLAUDE.md
  slice pointer.

## Verification

- `npm run check` per commit; new pins named above.
- Study re-run reproducible: `npx tsx project/research/04-cylinder-tier-study.mts`.
- Browser, `__game`-driven (the smoke culture): load frosting → notch 1 max
  crank → splash the summit; traverse ±10° splashes → frost row climbs to
  50% (watch the % row tick); sprinkles ×4 onto painted ledges → row fills;
  Giant demands the crown at half progress; cherry, notch 1, max crank →
  crown ✓ → WON with the real five-axis score line. Then: a lime dropped on
  the crown un-mets it (solid), a frosting splash on the summit does NOT
  (paint). Refresh mid-order: the painted cake comes back (welcome coats).

## Exit

The visionary's playtest: **does frosting-then-sprinkles-then-crown feel
like decorating a cake under siege, and does the order read at a glance?**
Collect: real coverage-per-shot feel (too fast/too grindy), whether neatness
is legible, whether the wheel finally earns its keep (side coverage needs
traverse). Feeds: elevation-ladder re-spacing verdict, the Bite slice
(integrity axis is live and waiting), towns (mess census consumers).
