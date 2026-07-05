# Research 09 — Dessert-as-data & rotating-turntable feasibility

Compiled 2026-07-04 by a codebase-researcher agent (read-only scan) for the
holistic direction discussion. Sizing verdicts + risks, with file:line refs.

## Question A — dessert as data

### Per-dessert data (would vary)
- `CAKE_TIERS` (src/core/arena.ts:46-50) — radius/bottom/top per tier.
  Already an array, already "data."
- `CAKE_Z` (arena.ts:37) — SINGLE center offset; a cookie tray or cupcake
  grid needs multiple centers.
- Census grid (core/frosting.ts:94-135 `buildSamples()`) — pure function of
  CAKE_TIERS/CAKE_Z; regenerates automatically for any single-center
  geometry.
- Splat constants (frosting.ts:38-66) — global consts, small enough to become
  per-dessert config.
- `TOWN_POTENTIAL` (game/tuning.ts:62) — measured via research/06; re-pinned
  per geometry change (re-pin law, tuning.ts:41-45).
- Client tier mesh (src/client/scene.ts:263-271) — `CAKE_TIERS.forEach`
  cylinders; already data-driven.
- Judgment zone labels (judgment.ts:225-230) tied to
  `ZoneId = "cake"|"tier1"|"tier2"|"tier3"` (arena.ts:127) — a fixed 3-tier
  vocabulary in the TYPE, not the data.

### Invariant machinery assuming ONE cylindrical stack at ONE center
- `tierOf()`/`isOnCake()`/`isInZone()` (arena.ts:110-139) — hardcode
  `Math.hypot(pos.x, pos.z - CAKE_Z)`; a tray of 12 discs needs "which disc,"
  a different signature.
- `buildSamples()` — concentric rings around one CAKE_Z; per-cupcake
  concatenation is mechanically fine but the flat-array assumption threads
  through everything below.
- Census length pinned as WIRE FORMAT (frosting.test.ts:41, tuning.ts:45) —
  baked into `FrostingField.coats` + snapshot()/restore() (frosting.ts:
  204-217); version-skew guard (213-216) means mid-session dessert switching
  needs care.
- `coverage()` (frosting.ts:163-168) — ONE scalar over the whole array.
  Architecturally cannot express "cookie 3 of 12 done, cookie 7 not."
- `TOWN_POTENTIAL` methodology (research/06) — mirror-across-plane +
  rotate-about-cake-axis symmetry tricks assume one round target; a grid of
  discs needs a re-derivation, not a re-pin.
- `judge()` frost-coverage (judgment.ts:94-97, 179) — divides one coverage by
  one potential scalar.
- room.ts:83 — hardcoded `TOWN_POTENTIAL[1]`; no multi-town wiring in Room
  yet.
- "FROST 50% OF YOUR SIDE" (judgment.ts:236-239) assumes one round target
  with a near/far hemisphere; 12 targets have "which cookies," not a
  hemisphere.
- Crown row (judgment.ts:87-91) — "uppermost settled solid, tier === TOP_TIER"
  is meaningless across 12 cupcakes.

### Sizing
- **Single-tier round cake: SMALL.** 1-element CAKE_TIERS; tierOf/census/
  splats already loop; TOP_TIER auto-adjusts (arena.ts:53); tier2/tier3
  zones become unreachable but harmless. Needs research/04 §3 + research/06
  re-runs to re-pin (single disc likely a HIGHER ceiling fraction — no
  ledge-gap shadowing).
- **Round-cake roster (1/3/N tiers, per-match selectable): MEDIUM.** The
  machinery generalizes; the work is the re-pin ritual × roster entries,
  surfacing CAKE_TIERS as per-match config, and making order text
  dessert-aware (the literal tier1/2/3 vocabulary).
- **Cookie tray / cupcake grid (many small independent targets):
  RESTRUCTURING.** New coverage model (per-item completion vector), new zone
  semantics ("which target"), new ceiling methodology, new crown semantics.

## Question B — rotating turntable

1. **Collider/kinematics: precedented.** Cake colliders are static
   (arena.ts:91-100, no parent body). Rotation = attach to
   `kinematicPositionBased` body + `setNextKinematicRotation()` per tick —
   the exact pattern the Baker already uses (core/baker.ts:58-131,
   deterministic, headless-tested). Discrete crank clicks map cleanly to the
   fixed 60Hz timestep.
2. **Paint frame: needs a frame change.** CAKE_SAMPLES are baked WORLD-frame
   (frosting.ts:94-135); paint() compares world impact vs fixed world samples
   (144-161); client FrostingView positions blobs at raw sample positions
   (frosting-view.ts:87-111). Existing paint would NOT rotate with the cake.
   Fix = cake-local samples + rotation transform on paint AND render AND the
   wire snapshot's implied frame (or coats re-indexing, which forces rotation
   granularity to quantize to the sample rings' angular step). No cheap
   partial fix.
3. **Settled solids: real physics risk.** Sprinkles/cherries are dynamic
   bodies resting by friction (projectiles.ts:97-156, friction 0.9), settled
   via a hand-rolled stillness timer (59-64, 233-250) that assumes a static
   world — NOT attached to the cake. Kinematic rotation carries them only
   through contact friction (tuning risk: sliding off), and a slow constant
   drag likely confuses the stillness detector. Needs a dedicated physics
   prototype before precise sizing.
4. **Network sync: additive.** New state axis (crank clicks / turntableAngle)
   fits the existing edge-based op pattern (protocol.ts:40-43); `welcome`
   snapshot must gain cake orientation and reconcile with the paint-frame
   choice for late joiners. Consistent with sync-shots-not-surfaces.
5. **Economy: design-law collision.** Rotating the cake is mathematically the
   trick research/06 uses to SIMULATE extra towns — one town + turntable
   eventually reaches everything. TOWN_POTENTIAL stops being static geometry
   and becomes time-integrated reachability; "FROST 50% OF YOUR SIDE" loses
   its meaning; tuning.ts's "more towns raise the ceiling; nothing else does"
   is directly violated. This is a new economy model, not new code.

**Sizing: medium-to-large mechanical; RESTRUCTURING for the coverage
economy.**

Top 3 risks: (1) the design-law collision above; (2) paint-frame correctness
across core + client + wire; (3) resting-solid behavior under kinematic drive
(determinism edge cases, toppings sliding off).

## Easier than expected
- Kinematic rotation idiom already exists (Baker).
- CAKE_TIERS already data-driven end to end — N-tier round cakes are cheap.
- Wire protocol's edge-based op pattern fits a turntable crank as-is.
- research/06 is a standing re-runnable harness for any new geometry's
  ceilings.
