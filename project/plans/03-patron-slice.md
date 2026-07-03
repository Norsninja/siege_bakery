# Slice 2 — The Patron (v1)

*Status: planned 2026-07-03, decided at the fork recorded in
research/01-port-gap-analysis.md (visionary picked Patron + gate-1 Judgment
over frosting / second catapult / art). Slice order going forward: Patron →
frosting+census → second catapult+towns → art.*

## The one question this slice answers

**"Does a Patron with opinions make the 90 seconds funnier and tenser than a
silent timer?"**

The greybox proved run + crank + load + lob is fun. This slice puts a
CHARACTER on the other end of the order: typed requirements he can amend, a
patience he can lose, a judgment he renders in two gates. If his nagging and
mid-order demands generate scramble-comedy, the whole Patron layer from the
2D design is worth its remaining slices (bite, sneeze, crowning).

## Port sources (2D repo, READ-ONLY — translate, don't copy-paste)

- `artillery/src/game/judgment.ts` — Requirement/BakeOrder/RequirementCheck
  types, two-gate `judge()`, score formula + stars-by-margin.
- `artillery/src/game/Patron.ts` — Patron/PatronContext/PatronAct interfaces,
  `createGiant()` rule list (incl. the prevMess new-grudge fix).
- `artillery/src/game/BakeMode.ts` — patience wiring, utterance seq contract.
- 2D playtest lessons that ride along: the Judgment panel must print the ✓/✗
  checklist (a failed gate 1 names the culprit); nags tighten a row ONCE.

## Explicitly NOT in this slice (scope guard from the port-gap doc)

Wind + the Sneeze (no wind in 3D ballistics yet). The Bite as terrain carve
(no cake deformation). Coverage/neatness/integrity axes and any
frost-coverage requirement (no frosting). The Crowning finale (needs its own
design pass). Towns. Second catapult. New toppings/pantry rows. Art/voice —
the Patron is a BANNER VOICE this slice, zero geometry.

## Steps (each verifiable before the next)

- **Step 1 — Orders grow rows.** `game/order.ts` (or a new
  `game/judgment.ts`) gains the 2D shape: an order is a MUTABLE list of
  typed requirements + `parShots` + `passScore` + the clock. Requirement
  kinds for this slice: `count-on-cake {topping, needed}` and
  `count-in-zone {topping, zone, needed}`. `core/arena.ts` gains the PEAK
  zone (top-center of the cake) so "one cherry, dead center" is orderable.
  Room keeps the settled-toppings ledger (topping, rest pos, onCake — it
  already computes all three at settle time) as the state requirements are
  measured against. `checkRequirements()` pure + tested. Protocol `order`
  message carries the rows; HUD renders the ✓/✗ checklist live.
- **Step 2 — The two gates.** `judge()` ported: gate 1 = every row met
  (else HUNGRY — sad rumbling), gate 2 = assembly score ≥ passScore (else
  REFUSED — the insulting kind; above: 1–3 stars by margin). Axes available
  now: mess (settled toppings off-cake / total) and waste (shots vs par),
  renormalized; coverage/neatness/integrity enter with frosting next slice.
  End banner shows the checklist + score breakdown, names the failed gate.
  Shot count needs `shotsFired` in Room (it already sees every shot).
- **Step 3 — The Giant speaks.** `game/patron.ts`: Patron/PatronContext/
  PatronAct translated; the Giant's rule list minus sneeze (no wind) and
  bite-carve (mess draws a patience hit + a THUNDEROUS complaint instead).
  Cadence: the Patron LOOKS every ~12s of order time inside `Room.tick`
  (tick-counted, deterministic; seeded rng owned by the Room). patienceDelta
  lands as SECONDS on the order clock — patience IS the clock, per the
  pivot. Protocol gains `patron {text, seq}`; HUD toast with the seq
  contract from 2D. Rules pure + tested with a scripted context.
- **Step 4 — He changes his mind.** Amendments live: the stalled-row nag
  tightens a row once; the looking-good rule appends a cherry demand
  mid-order. Checklist and banner update over the wire. Then the playtest:
  solo AND two tabs — does the scramble after "...IT NEEDS A CHERRY. NOW."
  produce the laugh? **← Slice verdict recorded here.**

## Verification

- Pure vitest: requirement checks, judge gates/stars, every Giant rule
  (deterministic contexts, seeded rng) — same culture as the 2D rules lab.
- Room test: scripted clients play an order to judgment; a patron amendment
  arrives mid-order and the checklist reflects it.
- `window.__game`: getOrder() exposes rows/checks; patron lines observable.
- Layering tripwire holds: judgment + patron are `game/`, headless, no DOM.

## Exit criteria

Visionary verdict after Step 4: is the Patron's presence net fun — tension
and comedy, not noise? Record verdict + which rules landed flat (they're
data rows; retuning is cheap). Then the fork continues per the port-gap doc:
frosting + census next.
