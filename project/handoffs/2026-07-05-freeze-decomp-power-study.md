# Handoff — 2026-07-05 (direction set; freeze law + decomp BUILT; power study measured; DISCUSS before towns)

## 1. Snapshot

HEAD fca4b8a. **177 vitest green (20 files), tsc strict clean BOTH configs**
(root + tsconfig.headless.json). Three commits this session on main:
- f3bd711 **PHYS** — the freeze law (settled solids freeze, wake on proximity).
- df64351 **STRUCT-4** — Room.tick decomp (OrderFlow state machine + Roster).
- fca4b8a **RESEARCH** — power-extension study (research/10, measured).

This was the direction-setting session the visionary ordered: a long
holistic discussion (three commissioned research briefs), then he said
"proceed" and we built. **NEXT SESSION: he wants to DISCUSS BEFORE
STARTING any build** — bring §7's discussion agenda. Only this handoff +
the visionary are context.

## 2. The direction (plans/09 — THE standing record, read it)

Decided WITH the visionary, grounded in three briefs written this session:
research/07 (party-game fun evidence: task overload not difficulty, failure
soft + traceable, 2–4 min rounds, coverage-painting is the trophy),
research/08 (2D lineage: towns were always co-op — "it takes two towns to
feed one giant"; frosting tolls + The Crowning are ports still owed),
research/09 (turntable/dessert feasibility scan with file:line refs).

The agreed shape:
- **Campaign ladder**, star-gated, ONE twist per rung: humble 1-tier cake
  (~150s, cheap — CAKE_TIERS is data) → 3-tier (today, 300s) → two towns
  (separation twist) → new projectiles per rung → turntable + small
  desserts as later chapters. Patron behavior trees = within-rung
  disruption; The Crowning pairs with the dessert report someday.
- **Towns**: map towns are scenery; CREWED machines matter. Playable phase
  = two crewed towns, players choose to stack or split. Collateral
  frosting toll ports (overshoot lands in partner's town, shared penalty,
  per-town banter attribution, nobody dies).
- **RUNG-AUTHORED POTENTIAL** (the big economy change, plans/09 §4): the
  order's `potential` comes from the LEVEL (authored), not live config —
  live of-potential grading makes any reach upgrade a self-trap. This
  RETRACTED the machines-fired ratchet idea. TOWN_POTENTIAL stays as the
  measured reference table authors pin from; research/06/10 become the
  authoring/balancing tools (later: per-map baking).
- **Turntable = the small-crew UPGRADE at the second town** (duo buys it
  instead of splitting; dwarves can bear a 3-tier cake, fiction approved).
  Player-cranked, discrete clicks. Costs known (research/09): paint frame
  must go cake-local (core+client+wire together); settled-solids risk is
  DISSOLVED by the freeze law (frozen = attached to the frame). Build as
  the towns arc's SECOND act.
- **Cookies/cupcakes**: separate later chapter — many small targets =
  coverage-model restructuring (single-scalar coverage can't say "cupcake
  3 of 12"); they do NOT need the turntable (visionary).
- **Dessert report PROMOTED**: slow orbit of the cake at Judgment — the
  Splatoon-class trophy moment; should exist by the friend test.
- **Topping-physics law** (§7 of plans/09): frosting is SURFACE (add-only,
  permanent), solids are OBJECTS (knockable — the game's ONLY eraser). NO
  smearability: "the bakers add; only the Giant subtracts" (Bite = the
  reserved Patron verb, integrity axis waits for it).

## 3. Built: the freeze law (core/projectiles.ts + projectiles.test.ts)

Settled solids turn **Fixed** at settle (zero creep — the 0.6m-drift
un-fairness is dead); any moving shot within **WAKE_RADIUS = 1.0m** wakes
them to dynamic (real hits knock honestly); woken solids re-settle
SILENTLY (no second settle event — the Room ledger re-reads live bodies
either way) and re-freeze. spawnAtRest enters via the WAKING path (a
snapshot can catch a body mid-roll; direct-Fixed would freeze it
floating). Movers = live shots + woken solids still moving above
REST_LIN_SPEED (a still woken solid must NOT cascade-wake piles).
Deterministic from body positions — no new wire traffic; client replica
(shots-view has its own ProjectileManager) behaves identically for free.
WAKE_RADIUS must beat max-speed·DT + two ball radii — RE-CHECK when
launch speeds move (10 clicks = 19 m/s still fits; 12 would not).
Accepted residue (visionary signed off): frozen stacks are infinitely
rigid until woken. 4 new tests; WIN-path pins (81/100, 0.566) survived
UNCHANGED; the live-truth choreography comment in room.test now cites the
law. Live-smoked on the loopback: sprinkle scored frozen → glob 2.5° off
woke it → count held, no console errors.

## 4. Built: STRUCT-4, the Room.tick decomp (research/05 parked item 4)

Behavior-preserving split, all 172 prior tests green UNTOUCHED:
- **game/order-flow.ts** — the order lifecycle as an explicit state
  machine (RUNNING → ENDED → linger → redeal). Owns order, clock, patron +
  look cadence (shouldLook/patronLook), shot count, deal generation,
  linger. `tickClock()` returns events `"ended"` / `"redeal"`; NUANCE
  pinned: the transition tick also counts toward the linger (redeal fires
  ORDER_RESET_TICKS−1 ticks after "ended"). standardRequirements moved
  here (re-exported from room.ts). Whim rng (mulberry32 0xcafe) lives here
  now, persists across deals.
- **server/roster.ts** — members, the wire-validation boundary
  (handleMessage), machineIntent (intent merge + load arbitration,
  Map-order deterministic), pose relay, broadcast. Knows nothing of match.
- **server/room.ts** — the physical match (world, machine, shots,
  frosting, live-truth ledger seam) orchestrating four named phases:
  machine → scoring → lifecycle → broadcasts. Public API unchanged.
5 new order-flow tests (cadence, linger timing, redeal reset, deal
ratchet, fresh-rows pin). 177 total.

## 5. Measured: the power-extension study (research/10, standing tool)

`npx tsx project/research/10-power-extension-study.mts` (~3–4 min).
Extends research/06's harness to clicks 4..12 + overshoot-vs-mirrored-town:
- ≤8 clicks reproduces the 43.7% pin (sanity).
- **9 clicks = 55.7% ceiling — ONE extra click buys the ENTIRE skill
  reach** (far tops 27→61/109, terminator side-walls 17→62/221). Clicks
  10–12 add ZERO coverage — the envelope saturates.
- **44.3% of the dessert stays town-2-exclusive at ANY power** (back wall
  arc) — the towns motive survives maximum power.
- **THE TOLL: 10 clicks lands overshoots ON the mirrored plaza** (19
  within 3m, nearest 0.3m; flat-arc math agrees: 19.4 m/s ≈ 36m range).
  8 clicks can't reach it; 11–12 fly OVER the town — pure waste.
- **RECOMMENDATION AWAITING HIS BLESSING: TENSION_MAX_CLICKS = 10** —
  click 9 = far-top lob (skill), click 10 = toll range (comedy/risk),
  beyond = nothing. Full draw 7.5s crank (was 6s). TOWN_POTENTIAL stays
  0.42 — rung-authored asks; reach 0.557 over the 0.42 denominator IS the
  2★/3★ climbing territory.
- **ARENA DEBT**: greybox ground (±40) ends 8m short of the mirrored T2
  base (z=−48) — the towns slice must extend it (study adds its own strip
  at z=−60; first run's "no overshoots at 12 clicks" was this artifact).

## 6. HELD: the projectile pass (plans/09 §8 — designed, not built)

The visionary held it for TEST-AND-FEEL; slotted after decomp, before
towns in the standing sequence, but he decides when. The design: sprinkle
PROXIMITY-FUSE burst at X≈1–1.5m from the cake (impact-burst fallback for
clean misses), tiny multicolor OBJECT capsules (~0.15–0.2m, chunky-cute —
true scale is unstable), seeded scatter riding shot events (the reserved
"seed S"), density chosen BY HIS EYE in-preview (demo 20/40/80; he judged
30 too sparse on paper), asks become grain counts, grains NEVER crown,
mess weighs a burst as ONE delivery (fractional on-cake). Underneath:
toppings-as-data made physical (per-topping body params) so fudge later
is a data row.

## 7. Next session: DISCUSS FIRST (his explicit instruction)

He wants a discussion before any build starts. The agenda as this session
left it:
1. **Bless (or push on) TENSION_MAX_CLICKS = 10** — §5's table is the
   evidence; it's the one number the towns slice pins.
2. **Towns slice scope** — the natural next build: mirrored machine +
   plinth, extended ground (arena debt §5), two crewed machines
   (Room/roster currently assume ONE machine — real scope), stack-or-
   split, rung-authored potential replacing room.ts's TOWN_POTENTIAL[1]
   hardcode, collateral toll (town footprints + buried-in-frosting
   counter; tone guard: nobody dies), "pretty good for one town" patron
   flavor. Roster/OrderFlow seams from STRUCT-4 are ready for it.
3. **Whether the projectile pass jumps the queue** (§6) — it's his call;
   the friend test wants exploding sprinkles.
4. Standing watches: neatness is the prime chaos-killer suspect (0.59 on
   the clean WIN; research/07 law — if playtesters go quiet, loosen
   NEATNESS never coverage); 2★ duo reachability; "50% OF YOUR SIDE"
   legibility; his freeze-law feel check (knock a sprinkle around — does
   wake/re-freeze read as natural?).

## 8. How to run, test, verify (+ gotchas)

`npm run check` = root tsc + headless tsc + vitest (check $?, not tail).
`npm run dev` 5174; `npm run server` 5175 (visionary often has one RUNNING
— never kill it; PORT=5199 for boot smokes). Studies: research/06 (~1–2
min), research/10 (~3–4 min) — both mirror core/frosting constants; keep
in step after any splat ship (the re-pin law, plans/08). tmp-*.mts at repo
root with RELATIVE imports for headless scripts; delete after. PREVIEW
QUIRK (bit us again): the preview tab can report document.hidden=true →
rAF suspends → the loopback Room NEVER TICKS (machine appears dead, HUD
stuck) — welcome/getChecks still work; reload does NOT clear it. If a
live smoke acts dead, CHECK document.hidden FIRST before suspecting code.
`window.__game` driver: send({t:"op",turn,screw,crank}) holds,
{t:"load",topping}, {t:"lever"}; crank pacing is room-side 0.75s/click;
sleep ≥2.8s post-lever for frost reads, ≥6.5s for solids (broadcast race).

## 9. Recommended reading order

1. This handoff.
2. project/plans/09-direction-and-topping-physics.md — THE direction
   record (§4 rung-authored, §7 freeze law, §8 held projectile pass, §9
   sequence).
3. project/research/10-power-extension-study.mts — HEADER ONLY (the
   measured table + recommendation).
4. src/game/order-flow.ts + src/server/roster.ts + src/server/room.ts —
   the decomposed shape (headers first).
5. src/core/projectiles.ts — the freeze law in code.
6. CLAUDE.md — law, commands, current-state pointer.
7. Only if the discussion goes there: research/07/08/09 (fun evidence /
   lineage / turntable-dessert feasibility), plans/08 (economy),
   research/06 (ceiling study).
