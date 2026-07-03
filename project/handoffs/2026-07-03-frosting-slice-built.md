# Handoff — 2026-07-03 (Frosting slice BUILT + wall amendment; checkpoint audit next)

## 1. Snapshot

The frosting slice (plans/07) went plan → build → browser-verified WIN →
first playtest → wall amendment, all in one session: thirteen commits (P0,
R1–R2, F1–F5, O1, O2, A1+A2, A3) at HEAD 9fdd828. 145 vitest tests green
(was 115), tsc strict clean, vite build clean. The visionary playtested and
filed notes; the wall pass shipped same-day. NEXT SESSION: checkpoint audit
+ the frosting-economy redesign (his two standing notes, section 6 — they
REVERSE this session's tuning direction; read them before touching any
frosting knob).

## 2. What changed this session

- Round tiers (R1–R2): CakeTier.half → radius (4/3/2.25 verbatim), cylinder
  colliders, radial tierOf, CylinderGeometry visuals. Cylinder study
  (research/04, `npx tsx`) confirmed the pinned settle ladder survives
  verbatim; curved ledges catch at ±8°; arena.test pins the radial law.
- Frosting field (F1): core/frosting.ts — deterministic sample census,
  dollop/splash paint law (radius scales with impact speed past
  SPLAT_SPEED), coverage/neatness/frostedNear/snapshot/restore.
  game/toppings.ts born (form solid|frosting drives every rule that cares).
- Consume-on-impact (F2): paint globs report first impact + speed, then
  leave the world — no settle, no litter, no obstacle. Pinned byte-identical
  arcs through a consumed glob's landing spot.
- Judgment (F3): kinds {frost-coverage, frac} (fractional row, HUD shows %)
  and {on-frosting, topping, needed} (2D support-chain as census lookup).
  checkRequirements/evaluateOrder/judge take the field. Crown = SOLIDS only
  (paint never crowns/usurps). Gate-2 weights HOME: 0.35 coverage
  (normalized vs order frac, 0.4 default) + 0.15 neatness + 0.25 integrity
  (≡1 until the Bite) + 0.15 (1−mess) + 0.10 waste. Naked cake caps at 50.
- Room + wire (F4): Room owns the FrostingField; paint scores at IMPACT via
  scoreDelivery (0 painted = floor frosting = mess). welcome gains
  frosting: number[] (the one surface on the wire); re-deal order msg gains
  fresh:true, field resets (solid litter stays).
- Client (F5): client/frosting-view.ts (InstancedMesh, blob per sample,
  scale by coats); shots-view consumes paint globs + reports impacts to the
  local field; four pantry crates; SHELF_TOPPING map.
- Honest order (O1): standing order = frost row + sprinkles row; the
  Giant's crown demand is the ONLY cherry row ever (one-number law: one
  number per row, a topping in ≤1 row). Limes never ordered. Patron
  progress normalized per row; nag gained a some-row-met guard (unguarded
  it fired every game at look 2). ORDER_SECONDS 120, parShots 8.
- O2: scripted full playthrough over real protocol WON 91/100 3★ (frost →
  sprinkles ×3 with correct nag → crown demand → crown). Fresh deal licks
  blobs clean; second-order globs deflect off first-order litter.
- Wall amendment (A1–A3, visionary playtest notes): census samples the
  three cylindrical WALL faces (437 samples total; WALL_SAMPLE_SPACING
  0.65, coarser so walls don't drown tops in the denominator). FrostSample
  = {pos, normal}; client flattens blobs against the normal. Paint law
  unchanged — walls just needed points. FORGIVENESS RULE pinned: a short
  shot at the cake's foot frosts the wall base. Ground splat discs for
  impacts below y 0.6 (décor only, FIFO 40, not on wire). frac re-pinned
  0.3 → 0.25 against the wall census. Bottom-tier answer recorded: no
  level power tops the bottom ring at traverse 0; notch 1 × 7 lands it
  dead center (now the best splash, ~10.3%), or ±8° × level 6.

## 3. Architecture and invariants

- Layering law unchanged: core (Rapier ok, no DOM/three) ← game ← server;
  client imports anything. ONE match implementation (server/room.ts).
- Determinism: seeded rng only; fixed 60Hz; sync-shots-not-surfaces. The
  frosting field is a pure function of shot events: sample grid derives
  from CAKE_TIERS, paint events from deterministic impact pos+speed. Only
  the welcome snapshot ever carries the field.
- Paint scores at IMPACT, solids at REST; both via Room.scoreDelivery →
  ledger → evaluateOrder → scored broadcast. Paint is never an obstacle,
  never a crown, never picked back up.
- Client field is visual-only (painted from local-sim impacts); scoring
  truth arrives in messages. Fresh deal resets field everywhere; solid
  litter persists.
- One-number law (orders): every row one number of one thing; a topping in
  at most one row; the crown demand is the only cherry row.
- Splat-constant changes REQUIRE re-running research/04 §3 and re-pinning
  the frac; the tooling exists and is cheap.
- Smoke-driver facts: op turn:1 INCREASES traverseDeg; preview_eval times
  out at 30s — launch long playthroughs detached (async IIFE writing
  window.__progress, poll with short evals, guard loops with
  window.__abort); reading checks right after firing races the scored
  broadcast (sleep ≥2.8s paint, ≥6.5s solids); loopback reload = NEW room
  (welcome paths need the ws server on 5175).

## 4. File map (delta since plans/06 handoff)

- src/core/frosting.ts — census grid (tops + walls, normals), FrostingField,
  splat law constants. frosting.test.ts pins grid/paint/measures/forgiveness.
- src/game/toppings.ts — toppings-as-data (form solid|frosting), isPaint().
- src/game/judgment.ts — new kinds, describeProgress, isCountRow, weights
  home. order.ts/patron.ts take the field / normalized progress.
- src/server/room.ts — FrostingField authority, scoreDelivery,
  standardRequirements (frost 0.25 + sprinkles 2), ORDER_SECONDS 120,
  ORDER_PAR_SHOTS 8.
- src/game/protocol.ts — welcome.frosting: number[]; order msg fresh?: true.
- src/client/frosting-view.ts — instanced blobs oriented by normal, ground
  splat discs. shots-view.ts — consume + onPaintImpact hook + dead-mesh
  sweep. scene.ts — 4 crates, cylinder tiers. hud.ts — SHELF_TOPPING,
  new prompts, % rows.
- project/research/04-cylinder-tier-study.mts — geometry grid + traverse
  spread + §3 single-splat coverage table (re-run after tuning).
- project/plans/07-frosting-slice.md — plan + build record + amendment.

## 5. How to run, test, verify

Unchanged: npm run dev (5174 loopback solo), npm run server (5175),
npm run check (tsc + 145 tests). Study: npx tsx
project/research/04-cylinder-tier-study.mts. __game handle unchanged.
Quirk: preview tab hidden after reload freezes the rAF loopback sim —
restart the preview server. NOTE: `npm run check 2>&1 | tail` swallows the
exit code — check `$?` explicitly (it bit once this session).

## 6. Open items and decisions

VISIONARY NOTES FOR NEXT SESSION (recorded 2026-07-03, end of session —
these REVERSE this session's frosting tuning direction; do not re-tune the
old way):

1. STOP REDUCING THE DEMANDED FROSTING. The 2D game demanded 50%; this
   session pinned 50 → 30 → 25 to fit shot economics. Wrong direction. The
   vision: the order demands HIGH coverage (2D-parity ~50%), and 80%+
   coverage should be what an A-grade (3★) looks like. Implication for
   gate 2: the coverage axis currently saturates at the asked frac
   (min(1, coverage/required)) — under the vision, coverage beyond the
   asked amount should keep earning grade. Redesign the axis and/or raise
   frac; decide in session, with him.
2. PER-GLOB SPLASH IS TOO BIG ("it is like 10 hexagons or more" per hit).
   Splashes should be SMALLER, so frosting takes many shots — frosting is
   the CORE ACTIVITY (in 2D, frost was the main ammo). The "grind" this
   session tuned away is actually the intended loop. The real problem is
   PACE: many shots must be feasible — knobs are ORDER_SECONDS, patience
   burn rates, shot cycle time (crank speed, per-topping data rows from
   game/toppings.ts), par, maybe multi-glob loads. Fix pace, not splash
   size upward.
   Consequence: dollop/splash radii come DOWN, frac goes UP, study §3
   re-runs, frac/par/clock re-pin together. The forgiveness rule (walls)
   and the one-number law stand.

Also next session: CHECKPOINT AUDIT (visionary-requested, like the Senior
Dev audit before the decomp phase — whole-project pass, severity-ranked
findings).

Standing open items (unchanged): F4 latency vs click ladder (needs friend
test); F7 remnants (rng seed fixed 0xcafe, bundle ~1MB gz, Room bodies grow
across deals — now gameplay-relevant: litter deflects later shots and can
squat the summit); neatness axis legibility (42% on a clean win — stingy);
solo pace (scripted run used 2/3 of the clock with zero pantry running);
frosting-in-welcome over real ws not yet eyeballed (headless-covered);
friend test itself (tunnel 5175).

Decisions not to re-litigate: no voxel frosting; paint-at-impact; crown
ignores paint; walls ARE sampled (amendment overruled the plan); ground
frosting is mess, never coverage; sides/walls coarser sampling; limes
never ordered; +15° ladder kept; client never declares an ending.

## 7. Next session focus

1. Checkpoint audit (whole project, severity-ranked, actionable findings).
2. Frosting-economy redesign per the two visionary notes: smaller splats,
   higher demanded %, graded excellence above the ask, pace knobs to make
   many frosting shots feasible. Study §3 + O2-style scripted playthrough
   re-verify, then his playtest.

## 8. Recommended reading order

1. This handoff (section 6 notes first).
2. project/plans/07-frosting-slice.md — plan + build record + amendment.
3. CLAUDE.md — law, commands (slice pointer current).
4. src/core/frosting.ts — census + splat constants (the redesign target).
5. src/game/judgment.ts — gate-2 coverage axis (the A-grade redesign).
6. src/server/room.ts — standing order, clock, par.
7. project/research/04-cylinder-tier-study.mts — the re-pin tool.
8. artillery/src/game/judgment.ts (READ-ONLY sibling) — the 2D coverage
   economics being restored (required 0.4–0.5, axis normalization).
