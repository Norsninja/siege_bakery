# Checkpoint audit — 2026-07-03 (post-frosting-slice, pre-economy-redesign)

Visionary-requested whole-project pass (the "Senior Dev audit" pattern from
before the decomp phase). Method: four parallel independent auditors, one
per layer (core / game / server+wire / client+config), each briefed on the
project law and the known standing items, findings verified against code
before reporting. Baseline at HEAD 5b2f7c3: 145 green. After the fix pass:
**166 green (18 files), tsc strict clean, vite build clean**, browser-smoked
on the loopback.

Overall verdict: layering and determinism discipline were PRISTINE in all
four layers (verified by sweep, now enforced by a test). The risk had
concentrated in two places: the internet-facing transport edge (the friend
test would have crashed or been trivially griefable) and the untested
render-side resource lifecycle.

## Fixed this session (commit per finding, AUD-1 … AUD-12)

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| AUD-1 | CRITICAL | Any socket error killed the whole server (no `error` handlers); plus no maxPayload (100MiB default), no heartbeat, no member cap, dist prefix traversal, CWD-relative dist, unvalidated PORT | server/main.ts hardened; boot-smoked incl. traversal 403 |
| AUD-2 | HIGH | Zero field validation on client messages: pose spread re-broadcast junk at 20Hz, `undefined` pose NaN-poisoned ghosts, off-table load strings lived forever in ledger+welcome | Room field-validation boundary + 3 hostile-wire tests |
| AUD-3 | HIGH | Only ONE side of a collision pair examined: a shot first-contacting a still-rolling shot lost its impact (absorption skipped → full-speed carom; glob consumed at SECOND contact → wrong splat position) | both handles evaluated; 2 pins incl. splat-height proof |
| AUD-4 | HIGH | Shots fired during the 10s linger scored on the NEXT order, waste-free (repeatable head start) | deal-generation tags on spawns, stale deliveries score nothing; client mirrors so local paint agrees |
| AUD-5 | MED | Joining/refreshing mid-banner rendered a WON order as "TIME! the patron goes hungry" (welcome had no judgment) | welcome carries judgment while ended; client adopts |
| AUD-6 | MED | Settled ledger diverged from physics: a bowled-off topping still counted | **LIVE-TRUTH ledger** (see below) |
| AUD-7 | MED | Two bakers loading in one window silently evaporated the loser's topping | full bucket REJECTS: loads stay queued (≤2/member) until accepted |
| AUD-8 | HIGH/MED | Landing rings leaked unboundedly; zero `.dispose()` anywhere; splat stagger froze at FIFO cap | removeAndDispose helper, ring FIFO 30, monotonic stagger counter |
| AUD-9 | LOW | Loopback aliased live room objects (patron mutates rows in place); unbounded pre-open ws queue; ghost yaw windmill after 2 spins; stale E edge after blur; frost % rounding contradicted its ✗ | structuredClone at loopback, queue cap+flag, yaw wrap, blur clears edge, current % FLOORS (pinned) |
| AUD-10 | MED/LOW | 437-sample wire format unpinned + silent restore refusal; Math.hypot ULP overclaim; baker gravity forked from constants; crown-demand guard read kind not topping; 3★ unreachable past passScore 70 | count pinned as wire format (218/219), restore returns bool + client logs, sqrt math + honest doc, one GRAVITY, topping-aware guard (pinned both ways), star clamp |
| AUD-11 | test gap | No determinism tripwire; no Room-level WIN test | tripwire test (core/+game/, comments exempt); O2 line re-bodied as a permanent WIN-path test |
| AUD-12 | MED | main.ts had re-accreted untested game-flow rules | client/interactions.ts (tickInteraction + bannerLatch), pinned |

## The one real design decision: AUD-6 live-truth

The audit offered "freeze settled bodies" as the small fix. We went the
other way, to 2D parity ("all metrics are live cell scans"): ledger entries
keep their body and every census re-reads position + onCake. Consequences:

- A scored sprinkle bowled off the ledge UN-COUNTS (pinned: a second
  6-click shot knocks the first topping from the tier-1 ledge to the
  ground, deterministically — the bowl study, this session).
- A wrong solid crowning the summit can be knocked away ON PURPOSE —
  recovery through play survives, which freezing would have killed.
- Mess can GROW after a landing (a shove off the cake is new mess at the
  Giant's next look). **Playtest attention: does that feel fair?**
- Late-joiner welcomes (always live positions) and the checklist now agree
  by construction.

## Deferred — most land in the frosting-economy redesign

1. **Vertical band comment is wrong** (core/frosting.ts): measured, a
   splash on a tier top can never reach the adjacent ledge (reach 1.2m <
   gap 1.8m); only wall impacts bridge stories. Decide band vs comment ON
   PURPOSE when the splat constants move.
2. **Walls are 50.1% of the coverage denominator** (219/437) — "coarser so
   they don't drown the tops" only reached parity. If the intent is honest
   surface-area accounting (visionary, this session: "gather the surface
   area of the dessert"), walls are ~2/3 of the true skin and are currently
   UNDER-weighted; if tops-first decorating is the intent they're
   over-weighted. Pick during the frac redesign; area-weighted samples are
   an option.
3. **tierOf has no upper y bound** (a tall enough ground-stack against the
   cake foot could read as tier 0) — contrived today, revisit with litter
   accumulation / the Bite.
4. F7 remnants unchanged: rng seed fixed 0xcafe, bundle ~1MB gz, Room
   bodies accumulate across deals (mitigation option recorded: freeze or
   cull ancient litter someday), neatness axis stingy, solo pace, friend
   test itself.
5. Waste counts in-flight shots / dry fires are free; partial crank
   progress survives a fire — both defensible, neither pinned as law.
   Recorded here so a future change is on purpose.

## Frosting-economy pre-work (numbers gathered for the redesign)

- The 2D coverage axis ALSO saturates at the ask (identical
  `min(1, coverage/required)` formula) — overshoot was valuable in 2D only
  because DAMAGE could undo coverage. With integrity ≡ 1 and no Bite,
  "excellence above the ask earns grade" is a NEW axis design, not a
  restoration. Leading proposal: normalize the score axis against an
  excellence bar (e.g. 0.8) while gate 1 keeps the asked frac — meeting a
  50% ask ≈ 78 (2★), 80%+ coverage ≈ 91 (3★).
- Visionary playtest datum: ~16 globs per shot, wants ~7-8 ("a rough
  circle"). Confirmed in-browser: a 6-click splash paints 18 samples =
  4.1%. One blob rendered per painted census sample — what you see IS the
  census.
- Pace knobs that must move together: ORDER_SECONDS, grumble burn
  (-4s/12s look), crank 0.75s/click, par, multi-glob loads (the ≤2 member
  queue from AUD-7 is half the plumbing). Rough math: smaller splats +
  frac 0.5 ≈ 15-20 frost shots ≈ 200-350s of work vs an effective ~95s
  clock today.
- Process law stands: splat-constant changes re-run research/04 §3 and
  re-pin frac/par/clock together; the 437 count is now a pinned wire
  format — census changes re-pin it consciously.

## Structural feedback (same session, discussed with the visionary)

DONE (STRUCT commits):
1. **game/tuning.ts** — THE economy dashboard: order clock/par/linger/look
   cadence, frost frac, sprinkle count, patience burns, plus the
   effective-clock and shot-cycle math in the header. The economy redesign
   is now one legible diff. Row SHAPES stay in room.ts; splat radii stay
   with the paint law in core/frosting.ts (dashboard points at them).
2. **The ledger seam** — every scoring READ of the settled ledger flows
   through Room.ledger(), which does the live-truth refresh: the
   "remember to call refreshLedger first" trap is gone; a new census site
   cannot forget.
3. **tsconfig.headless.json** — core/game/server compile WITHOUT the DOM
   lib (lib ES2022, node types) as part of `npm run check`. Verified: a
   deliberate `window` in core/ passes root tsc (DOM lib — the old blind
   spot) and FAILS the fence.

PARKED, in priority order:
4. **Room.tick() decomp** — it is at the size main.ts was when the decomp
   phase was ordered (intent merge, load arbitration, machine, scoring,
   patron cadence, clock, re-deal, three broadcast cadences). Give the
   order lifecycle an explicit state machine and split roster/relay from
   match rules BEFORE the second catapult / towns slice.
5. **Patron amendments-as-data** — patron.act mutates order rows in place
   (2D law); returning amendments the Room applies would make message flow
   honest end-to-end. Do when a second patron type arrives.
6. **Shared scripted-baker test driver** — crankTo/screw/fire helpers are
   copy-pasted across room tests; extract when next touched.

Deliberately left alone: full-checks-per-message protocol (simplicity is
why net-handlers is testable), InstancedMesh full-matrix refresh (the
blob-per-sample "you see the census" property is a design asset), litter
body accumulation (now load-bearing gameplay via live-truth).
