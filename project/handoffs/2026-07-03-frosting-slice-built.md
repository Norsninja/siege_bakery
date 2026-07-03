# Handoff — 2026-07-03 (Frosting slice BUILT: round tiers, field census, the honest order)

## 1. Snapshot

The frosting slice (plans/07) went plan → build → browser-verified WIN in
one session: ten commits (P0, R1–R2, F1–F5, O1, O2) at HEAD 3fd932f, each
gated by `npm run check`. 142 vitest tests green (was 115), tsc strict
clean, vite build clean. REMAINING: the visionary's playtest — the exit
question is in plans/07 ("does frosting turn the cake from a target into a
CANVAS, and does the order read at a glance?").

## 2. What changed this session

- **Round tiers (R1–R2)**: `CakeTier.half` → `radius` (4/3/2.25 verbatim),
  cylinder colliders, radial `tierOf`, CylinderGeometry visuals. The
  cylinder study (research/04, reproducible `npx tsx`) confirmed the
  pinned settle ladder survives VERBATIM; curved ledges catch at ±8°
  traverse; the summit demands a centered shot. New arena.test pins the
  radial law (the old square's corners are honestly off the cake).
- **The frosting field (F1)**: `core/frosting.ts` — 218 deterministic
  sample points (polar rings over each tier's exposed top; sides
  deliberately unsampled), dollop/splash paint law (radius scales with
  landing energy past SPLAT_SPEED — splat-vs-place is now CONSEQUENCE),
  coverage/neatness/frostedNear/snapshot/restore. `game/toppings.ts` born
  (port map B5, minimal): form solid|frosting drives every rule that cares.
- **Consume-on-impact (F2)**: paint globs report first impact with speed,
  then leave the world — no settle, no litter, no obstacle. Pinned: a
  cherry through a consumed glob's landing spot rests byte-identical.
- **Judgment (F3)**: new kinds `{frost-coverage, frac}` (the one
  fractional row; HUD renders %) and `{on-frosting, topping, needed}`
  (2D support-chain as census lookup — frost under a waiting sprinkle
  later still counts, accepted quirk). checkRequirements/evaluateOrder/
  judge take the field. Crown considers SOLIDS only — paint never crowns,
  never usurps (unrecoverable otherwise). **Gate-2 weights HOME**: 0.35
  coverage (normalized vs the order's frac, 0.4 default) + 0.15 neatness +
  0.25 integrity (≡1 until the Bite) + 0.15 (1−mess) + 0.10 waste. Pinned:
  a naked cake caps at 50 — frosting is half the grade.
- **Room + wire (F4)**: Room owns the authoritative FrostingField; paint
  scores at IMPACT through the same scoreDelivery path as solids (0 painted
  samples = floor frosting = mess; the Giant's floor-thunder works
  unchanged). `welcome` gains `frosting: number[]` (the ONE surface that
  ever crosses the wire); the re-deal `order` msg gains `fresh: true` and
  the field resets — the Giant licks the cake clean between deals; solid
  litter stays.
- **Client (F5)**: new `client/frosting-view.ts` — InstancedMesh, one
  flattened blob per sample point, scale by coats: the player sees EXACTLY
  what the census sees. shots-view consumes paint globs (mesh swept when
  the body dies) and reports paint impacts to the local field (the
  deterministic twin — sync-shots-not-surfaces). Four pantry crates
  (frosting/cherry/sprinkles/lime); `SHELF_TOPPING` map keeps main.ts's
  pickup one line. All new code in decomp modules; main.ts grew ~10 lines
  of wiring.
- **The honest order (O1)**: standing order = `FROST 30% OF THE CAKE` +
  `2 × sprinkles ON THE FROSTING`; parShots 8; ORDER_SECONDS 120. **THE
  ONE-NUMBER LAW**: every row one number of one thing, a topping in at
  most one row per order; the Giant's crown demand is the ONLY cherry row
  that ever exists — the 4-or-5-cherries confusion (last playtest, note 1)
  is impossible by construction. Limes stay the never-ordered decoy.
  Patron progress normalizes per row (fractions weigh like counts;
  coverage now feeds the crown trigger — the 2D "cherry when the cake
  looks good" rule is real).
- **O2 script-playtest tuning** (the scripted run was itself a playtest;
  three knobs turned before a human suffered them): splash radii UP
  (dollop 1.3; splash 2.1 + 0.15/speed, max 3.4) — the first tuning left a
  5% coverage tail reachable only by re-aiming grind and the clock died;
  sprinkles 3 → 2; the nag gained a **some-row-met guard** — unguarded it
  fired EVERY game at look 2 (sprinkles are rationally zero while frosting
  goes down), a constant tax wearing a character's hat.

## 3. Verified end-to-end (browser, `__game`, real protocol)

Frost via the four-shot decorating line — summit front (notch 1 × 8,
16.5%), summit back (level 7, 15.1%), flanks (±8° level 6, ~5–7%) — met at
31.2% in 3 shots; sprinkles ×3 on the proven arcs (nag fired correctly
after frost met: 2→3); crown demanded; notch-1 max-crank cherry → **WON
91/100 ★★★**, banner: "coverage 31% · neat 42% · mess 0% · under par" —
every gate-2 axis live, culprit law intact. Fresh deal: blobs lick clean,
sprinkles back to 2. Second-order globs DEFLECT off the first order's
litter (8.7% vs 15.1% for the same shot) — prior deliveries shape later
shots; determinism, working.

## 4. Architecture and invariants (deltas only — plans/06 handoff still true)

- The frosting field is core/ (deterministic, Rapier-free); toppings table
  is game/ data; policy (consume-on-impact) is passed to core by callers.
- Paint scores at IMPACT; solids at REST. Both flow through Room.
  scoreDelivery → ledger → evaluateOrder → scored broadcast.
- Paint is never an obstacle, never a crown, never picked back up.
- Client field is visual-only, painted from local-sim impacts; scoring
  truth stays with room messages. Welcome carries coats; fresh clears.
- Smoke-driver notes for future sessions: `op turn: 1` INCREASES
  traverseDeg; preview_eval times out at 30s — launch long playthroughs
  detached (write to `window.__progress`, poll with short evals, guard
  loops with `window.__abort`).

## 5. Open items and watch list

- **The playtest** (exit of plans/07): coverage-per-shot feel, neatness
  legibility (42% on a clean win — the axis is stingy; is it readable?),
  does the wheel earn its keep, does the ticket read at a glance.
- **Solo pace watch**: the scripted run (zero pantry running) used ~2/3 of
  the 120s clock. Human solo will be brutal; co-op is the design target,
  but if solo matters, knobs are frac/needed/ORDER_SECONDS/patience burn.
- **Litter escalation watch**: settled solids persist across deals and now
  DEFLECT frosting and crown shots — orders get physically harder as the
  bakery litters. Ties into the F7 remnant (Room bodies grow unbounded);
  a "the Giant eats the leftovers" sweep may become a design need, not
  just hygiene.
- F4 latency vs click ladder — still waits for the friend test.
- F7 remnants unchanged: fixed rng seed 0xcafe, bundle 984KB gz.
- Frosting-in-welcome over REAL ws not yet eyeballed (loopback reload
  builds a new room; headless room+net-handler tests cover the logic;
  the ws transport is JSON pass-through). The friend test will exercise it.

## 6. How to run and verify

Unchanged: `npm run dev` (5174 loopback), `npm run server` (5175),
`npm run check` (tsc + 142 tests). Study: `npx tsx
project/research/04-cylinder-tier-study.mts` (§3 = coverage table; re-run
after any splat-constant change). `__game` handle unchanged. Known quirk:
preview tab hidden after reload freezes the rAF loopback sim — restart the
preview server.

## 7. Next session

The visionary plays. Then, by verdict: (a) tuning pass on the knobs above,
(b) the Bite (integrity axis is live and waiting), (c) second catapult +
two towns (mess-census consumers — research/01 §F sequencing), or (d) the
friend test (tunnel 5175). plans/07's exit section lists what data to
collect.

## 8. Recommended reading order

1. This handoff.
2. project/plans/07-frosting-slice.md — the plan + build record.
3. CLAUDE.md — law, commands (slice pointer updated).
4. src/core/frosting.ts + src/game/judgment.ts — the census + gates.
5. src/server/room.ts — paint flow, the honest order.
6. project/research/04-cylinder-tier-study.mts — the study (re-runnable).
7. src/client/frosting-view.ts + shots-view.ts — the visual twin.
