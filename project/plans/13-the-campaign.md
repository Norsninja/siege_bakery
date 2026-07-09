# Plan 13 — THE CAMPAIGN: the ladder, the run, the purse (FULL PLAN)

**Status: DRAFTED 2026-07-08 from the campaign discussion (visionary's
rulings recorded in §1). DISCUSS → BLESS → BUILD, per the standing
sequence; the friend test (plans/12) sits between blessing and the bulk
of the build, and slice 1 (§8) is deliberately shaped so the friend test
inherits it if it lands first.**

## 1. What the campaign IS (visionary, 2026-07-08 — decisions of record)

The campaign is just the NAME for the party mode: desserts get
progressively harder until they reach near impossible. Rulings:

- **Order N = rung N = an N-tier cake.** The ladder is the dessert
  itself growing. No twist-per-rung scripting — geometry escalates and
  the ECONOMY is how the crew counters (see §5). This deliberately
  SUPERSEDES plans/09 §2's authored-twist ladder (towns as the rung-3
  twist, fudge as rung 4): towns and toppings move to the SHOP; the
  rungs only ever change the dessert and the ask.
- **A failed order ENDS THE RUN.** Two-gate Judgment unchanged; "lost"
  now means run over, report, back to the lobby. Near-impossible top
  rungs guarantee every run ends with a story.
- **The separator between orders**: the Giant takes the dessert → the
  report → the shop → the next dessert wheels out — all inside the
  existing 18s linger (ORDER_RESET_TICKS). One beat, already-shaped.
- **Mess persists through the whole run.** ALREADY LAW — the fresh-cake
  law (room.ts, 2026-07-05): what's ON the dessert leaves with it;
  floor litter is the crew's, forever. The floor becomes the run's
  visible history and the run-over screenshot's comedy.
- **Shared purse.** One bakery, one wallet; spending is table banter.
- **Ready circle starts the run.** No DOM button (pointer lock), no
  key: a stand-here circle — the post-circle furniture language.
- **Cake first; sundaes etc. later.** The spec must generalize to any
  SINGLE centered dessert; trays of many small desserts stay a later
  chapter (plans/09 §6 — that is a coverage-model restructuring, not a
  data swap).
- **THE CUPCAKE AMENDMENT (2026-07-08, fourth session).** "Order N =
  rung N = an N-tier cake" is amended: the ladder is authored spec
  rows, monotonically HARDER, not necessarily monotonically TALLER. A
  cupcake — one squat tiny tier — joins the ladder as a FIXED authored
  rung after rung 3 (exact position decided at authoring, against its
  measured difficulty): a PRECISION spike where tall tiers are REACH
  spikes — the vernier's fine knob (research/13: 0.4–1.3 m/notch) is
  what a small target tests. Random insertion was proposed and
  REJECTED for v1 (it is procedural difficulty, a §7 non-goal; it
  needs RNG in RunFlow and makes per-rung ask authoring ambiguous).
  If run variety is ever wanted, the shape is authored ladder
  VARIANTS, seeded per run — a post-campaign discussion beside
  power-ups.
- **THE FLOURISH AMENDMENT (2026-07-08, fifth session — amends THE
  IMPOSSIBLE TRAGEDY, §8.3).** The crown stops being a REQUIREMENT
  and becomes an OPTIONAL FLOURISH — the fatality, in the Mortal
  Kombat sense: style on top of the outcome, never the outcome. The
  Giant's progress-triggered required-crown demand (patron rule 3)
  is CONDEMNED: as a required row, a greatness-triggered demand
  punishes good play (and on cake-6 would turn playing WELL into the
  run-ending mistake). The new shape, ruled:
    - The flourish lives INSIDE the order (visionary: never the
      linger — the separator belongs to the shop/switch, and players
      not acting must not be held watching). It fires mid-order when
      live coverage crosses the greatness bar (COVERAGE_GOOD, the
      2-star tier — EXCELLENT is "rare by design" and a fatality
      nobody sees is dead code with a personality); the crew chooses
      between closing the order and going for style before it ends.
    - The desire is PER-PATRON — (topping, placement): the Giant
      wants a cherry on the very top; an Ent wants fudge or
      sprinkles up there; tiers may vary (seeded rng). v1 content is
      the Giant's cherry-on-top (one patron exists); the desire
      TABLE arrives with the patron roster. Placement rows beyond
      "crown" (topping-on-tier-N) are a new judgment kind, deferred
      with it.
    - Meeting the desire NEVER gates the win; it upgrades the
      verdict (a coda field, purse bonus in slice 5, report flair).
      The frozen-verdict law (S-MED-1) is untouched — the verdict is
      complete at the win tick. [AMENDED 2026-07-09 by the FINISH IT
      ruling below: the BASE verdict freezes at the decided tick; the
      verdict COMPLETES at the window's end.]
    - CONSEQUENCE, ruled deliberately: rung 7 becomes winnable by
      WORKLOAD alone (~44–49 human two-town shots vs a crew ceiling
      of ~30–44 — almost impossible, occasionally beaten). Beating
      rung 7 = **MASTER BAKER**: trophy, fanfare, credits, play
      again (skeleton in slice 4; music/credits are a later content
      pass — no audio pipeline exists yet). Landing the flourish ON
      rung 7 — cake-6's summit, which no shipped (click, notch)
      combo reaches — = **ULTRA MASTER BAKER OF THE REALMS**:
      impossible on today's machine; the power-up economy sells the
      key later. THE TRAGEDY RELOCATES, it does not die: the
      impossible thing is now the legend on top of the game instead
      of a wall in front of its credits.
    - RUNGS.asks.crown is REINTERPRETED as the per-rung flourish
      flag (rungs 1–2 false: no flourish in the tutorial). The
      measured summit table (22→16→12→8→7→4→0 combos) survives
      untouched as the flourish's honesty ledger.
    - SCOPE: slice 4 ships CROWN-SHELVED (crown rungs deal frost +
      sprinkles only; patron rule 3 deleted; the Giant keeps his
      thunder and his nag). The flourish is **slice 4b**, its own
      coherent build right after the flip.
- **THE FINISH IT AMENDMENT (2026-07-09, sixth session — the 4b
  discussion's rulings of record; extends the flourish amendment).**
  The visionary's Mortal Kombat instinct, translated onto the real
  mechanics: our "all hitpoints removed" moment is not clock-zero
  (which is only ever the LOSING end — a won order ends the instant
  its last row is met, order.ts evaluateOrder) but THE ROWS-MET TICK.
  Today that moment and the formal end are the same tick; the fatality
  needs the beat between them. Ruled:
    - **THE FINISH IT WINDOW** — the spine of 4b. At the rows-met
      tick the BASE judgment computes and FREEZES exactly as today
      (stars, waste, acceptance — untouchable). If the window opens,
      the verdict COMPLETES at the window's end with the coda; style
      shots during the window are free BY CONSTRUCTION (nothing can
      tax a frozen score). S-MED-1 is hereby amended: "the base
      verdict is frozen at the decided tick; the verdict is complete
      at the window's end."
    - **The window opens ONLY when ALL hold**: the judgment ACCEPTED
      (a gate-2 refusal gets no fatality), the rung's asks.crown flag
      is true, the reveal fired (live coverage reached goodFrac), and
      the desire is still unmet. Every other win renders instantly,
      as today: rungs 1–2, sub-GOOD wins, refusals — and a PRE-MET
      desire, which skips the window straight to verdict + coda (the
      fatality already happened; foresight is its own reward).
    - **The window's clock**: its own countdown, one authored
      constant, GENEROUS (~12–15s to open — an un-staged cherry needs
      a real pantry ferry loop; the feel pass moves the number). It
      ends EARLY the moment the desire settles — landing the fatality
      cuts to the payoff. The order clock is irrelevant once the
      outcome is decided.
    - **LEDGER-JUDGED DESIRE**: eligibility is PHYSICAL — the desire
      is judged against the settled ledger (scoring truth stays
      physical, the standing law). A cherry resting on the summit
      counts WHENEVER it was thrown; players lobbing cherries early
      because they want to is play, not a rules problem. The reveal
      and the window are presentation and room-to-act; they never
      gate the coda.
    - **THE TOPPERS CLASS**: desires draw ONLY from toppers — the
      pantry shelf of things nobody orders and everybody wants to
      throw (lime, now cherry; others later). The cherry joins the
      pantry under the LIME'S GRAMMAR: fires anyway, lands anyway,
      counts as mess unless it is the desire met. The one-number law
      becomes STRUCTURAL (a desire topping can never collide with an
      ordered row) plus a boot validation beside validateRungs; the
      original flourish text's "an Ent wants fudge or sprinkles up
      there" flavor is DROPPED — desires are toppers, full stop.
    - **Desire data**: a separate field on OrderState — never a
      requirement row; the "all rows met = win" invariant stays
      total. Reveal at COVERAGE_GOOD via the patron's LOOK (golden
      HUD row + character voice; the offer channel is the look, no
      new event path). A sub-GOOD win never sees the offer and never
      gets the window — but a pre-landed cherry still earns the coda
      (physical truth outranks presentation).
    - **ULTRA, skeleton only**: the coda + the runover report's title
      line upgrades MASTER BAKER → ULTRA MASTER BAKER OF THE REALMS
      (same wire-flag idiom as `won`). No bespoke ceremony: nothing
      can reach cake-6's summit until the economy sells the key, and
      Ultra's full ceremony rides the MASTER BAKER content pass,
      designed when someone can actually earn it.
    - Purse bonus for the flourish: slice 5, as already ruled.

## 2. Foundations this plan is authored against (do not re-derive)

- research/11 RE-RUN (2026-07-08): one town 81.2% (≤9) / 90.3% (≤10);
  two-town union 100% at ≤8; contested overlap 62.9% (≤9). Towns =
  THROUGHPUT + CONTESTED GROUND, not reach ceiling.
- The 80% curve (commit 6ac9c55): 80% absolute = 48 one-town / 39
  two-town idealized shots — the four-friends-heroic number, DECIDED
  good, never rebalanced. A pass-tier ask fell to ~8–9 idealized shots
  under the vernier envelope.
- TOWN_POTENTIAL [0, .9, 1, 1, 1] measured; TOWN_ASK_POTENTIAL
  authored (Option B). THE CAMPAIGN GENERALIZES OPTION B: every rung's
  ask is an AUTHORED number pinned against a MEASURED envelope — the
  measured table is honesty, never dealt.
- research/13 + research/11 are the standing re-pin tools. THE RE-PIN
  LAW OF THE LADDER: no rung row's ask is pinned until ITS spec has
  been run through both tools (they gain a spec parameter, §3).

## 3. THE DESSERTSPEC — one dessert, arbitrary stacked geometry

### The data

`core/dessert.ts`:

```ts
interface DessertSpec {
  id: string;            // "cake-3" — the wire name
  tiers: readonly CakeTier[];  // radius/bottom/top, base first
}
```

Today's CAKE_TIERS becomes the `cake-3` row verbatim. A cupcake, a
sundae, a humble cake: rows. A tray of cookies: NOT a row (later
chapter).

### The core refactor (the real work)

Everything that today reads the module-level CAKE_TIERS becomes a
function of the spec. The seams, found 2026-07-08:

- **Geometry oracles** (core/arena.ts): tierOf, isOnCake, isInZone,
  distanceToCake, cakeSurface, TOP_TIER — all take the spec (or bind
  it once into a per-deal `DessertGeometry`). ZoneId's tier1..3
  generalize to tier INDEX; an order row may only reference tiers its
  rung's spec has.
- **Colliders**: buildArenaColliders SPLITS — arena statics (ground,
  walls, pantries, plinths) built once; DESSERT colliders built per
  deal and torn down at redeal. Room owns the rebuild; the client
  rebuilds visuals + movement colliders on the fresh-deal message.
- **The census** (core/frosting.ts): already "a pure function of
  CAKE_TIERS" — becomes buildCensus(spec). The 661 pin becomes a
  PER-SPEC pin (661 is cake-3's number and stays pinned as such).
- **Ballistics/tests/research**: launch tables don't change (machine
  is constant law); tests that assume cake-3 import the row.

### Rulings of record (slice-2 discussion, 2026-07-08 third session)

Decided with the visionary before building — the consumer map was
verified first (every oracle call site read, not inferred):

1. **BIND ONCE.** `dessertGeometry(spec)` is the ONE public form: it
   binds the tier math and builds the samples/census once per deal.
   The census forces a bound object anyway (samples are hot-path
   state); one idiom beats two. The tier math lives as PRIVATE
   functions inside core/dessert.ts — auditable in one screen, but
   NOT exported: a public free layer would let a call site import the
   CAKE_3 row directly and compile while scoring rung 5 against
   cake-3. Export a private function later only when a real customer
   appears.
2. **GEOMETRY IS AN ARGUMENT, NEVER A FIELD** on core/ classes.
   ProjectileManager.step(world, geom) and clearCakeSolids(world,
   geom) take it explicitly — the visionary's ruling: the argument is
   impossible to get wrong silently, where a field is state someone
   must remember to update. (stickyPaint stays a field only because
   it is a cross-module closure that reads through its owner live.)
3. **THE OLD ZERO-ARG ORACLES ARE DELETED, NOT ALIASED.** tsc is the
   tripwire: every call site must say where its geometry came from.
   The TOWNS-alias precedent is explicitly REJECTED here — towns are
   static so aliases are harmless; the dessert changes per deal, so a
   live-code alias bound to cake-3 is exactly the drift the zero-
   drift proof cannot see.
4. **REDEAL ORDERING:** clearCakeSolids with the OUTGOING geometry →
   tear down old dessert colliders → build the new spec's → replace
   the FrostingField. Bodies leave with the dessert they rested ON.
   Invisible while every deal is cake-3; wrong the first time a
   smaller cake follows a bigger one.
5. **CAKE_Z STAYS IN ARENA.** The arena owns WHERE the dessert sits
   (the axis towns rotate about); the spec owns WHAT it is.
6. **ZoneId generalizes to tier index**, including the WORDS:
   ZONE_LABELS' bottom/middle/top become a rule over N tiers (bottom
   and top always by name; interior tiers by ordinal). Order-facing
   text — the culprit-naming law applies.
7. **CLIENT BOOT ORDER:** bind the deal's geometry (from the wire's
   rung) BEFORE the frosting snapshot applies — frosting-view's
   length guard is the existing tripwire that fires if this slips
   (plans/11 §4 boot-order law, repeated).
8. **Knowingly stale until slice 3:** the research .mts tools (they
   import the deleted arena exports; they gain a spec parameter in
   slice 3 — research/06's header already warns) and the potential
   tables (TOWN_POTENTIAL et al. are cake-3's MEASURED numbers; they
   become per-spec rows when slice 3 measures the other specs).

### The wire law

The fresh-deal message carries the RUNG NUMBER (and thus spec id) —
never geometry. The spec table is shared code on both sides, exactly
like the event-sync law for the cake surface (plans/06 pivot record:
events + seeds, never surfaces). A headless replica fed the same deal
grows the same dessert.

## 4. THE LADDER — authored rows, measured before pinned

`game/campaign.ts` (imports core/ only, like tuning.ts):

```ts
interface Rung {
  spec: string;         // DessertSpec id
  clockSeconds: number; // per-rung order clock
  asks: { frostFrac: number; sprinkles: number; crown: boolean };
  pay: { base: number; perStar: number };
}
export const RUNGS: readonly Rung[] = [ /* rows 1..6, v1 */ ];
```

- **Rung 3 = today's cake and today's numbers, THE ANCHOR.** cake-3,
  300s, today's authored asks. Everything measured this week stays
  pinned; the ladder is authored outward from this fixed point.
- **Rungs 1–2**: cake-1 (today's base tier alone), cake-2 (base +
  middle). Short clocks (~150/210s — plans/09 §1: the genre converges
  on 2–4 minute rounds; 300s belongs to big desserts). Gentle asks.
  These are the tutorial-by-play rungs — the humble cake teaches the
  machine, rung 2 teaches the ledge.
- **Rungs 4+**: taller stacks. PROPOSED (hypothesis, authored WITH the
  re-pin tools in hand, not before): each new tier extends today's
  progression upward (~0.6–0.7 radius step, ~1.5 height step), so
  cake-4's summit sits near y 6.5, cake-5 near 8, cake-6 near 9.5.
  Near-impossible emerges from GEOMETRY: research/13 measured today's
  envelope topping out around el-for-summit at click 7 — a y-9.5
  summit may take only a sliver of (click, notch) combos, or none.
  THE LADDER'S TOP IS WHERE THE TOOLS SAY THE ENVELOPE DIES, not a
  guess. If cake-6 proves literally unreachable, cake-6 IS the
  near-impossible final rung and the ladder is 6 rows; if it proves
  merely heroic, we author cake-7.
- **Asks per rung**: authored fractions of each spec's MEASURED
  potential (the Option B split, generalized). The pass tier stays
  "50% is just passing" in spirit; the absolute workload climbs
  because the dessert grows. Sanity anchor: a rung's pass ask in
  idealized shots (greedy tool) must sit BELOW the four-friends 80%
  heroic curve with margin that shrinks as rungs climb.
- **Clock per rung is data**, same row.

## 5. THE ECONOMY — shared purse, walk-up shop, town 2 as flagship

- **Purse**: Room state, broadcast; one shared balance. Earned at each
  passed order: `pay.base + stars × pay.perStar` (stars = the coverage
  tiers already in tuning.ts; waste already gates the score — no
  double-charging). PROPOSED starting scale (feel hypothesis, one
  table): base 10×rung, perStar 5, town 2 priced ~50 (affordable by
  rung 2–3 for a decent crew), fudge unlock ~25.
- **The shop**: a STALL in the fort near the pantry — walk-up crosshair
  interaction, one E per purchase, price on the prompt (the pantry
  grammar; NEVER a menu screen — the 18s separator is also the
  town-switch window and must not be eaten by UI). Open only during
  the separator (gates law parity: buying mid-order is not a thing).
- **Inventory v1**: (a) **TOWN 2** — the fork-2 purchase finds its
  real home; `unlockTown2` already exists as a Room input, the
  purchase message replaces the dev stand-in. The campaign's
  difficulty curve is what TEACHES this purchase: rung asks climb
  toward workloads one town cannot humanly throughput (§2 numbers) —
  throughput + contested ground, the re-pinned towns rationale, made
  playable. (b) ~~**FUDGE** — the toppings-as-data row (plans/09 §8),
  a new shelf appears in the pantry.~~ [STRUCK 2026-07-09 by the
  amendment below — fudge shipped FREE in the pantry with plans/10;
  there is nothing to sell.] Everything else waits.
- Purchases are Room-validated inputs (authoritative purse debit;
  refusals are honest — "not enough coins" flash).
- **THE SHOP-SELLS-INFRASTRUCTURE AMENDMENT (2026-07-09, seventh
  session — the slice-5 discussion's rulings of record).** The fudge
  unlock is STRUCK: fudge has been live and free in the pantry since
  the projectile pass (plans/10 — the shelf-fudge crate, "E — scoop
  hot fudge", an end-to-end room test; its splat law is the measured
  moat-filler, and its paint counts toward the frost row via the one
  shared coats field). The "~25 unlock" above was drift against the
  shipped code and against toppings.ts's own recorded law: "rungs
  introduce projectiles, THE SHOP SELLS INFRASTRUCTURE." Ruled:
    - The shop sells UPGRADES only — things that change what the crew
      CAN DO, never what they can throw. Ingredients live in the
      pantry. This is structural, not taste: a patron may one day
      ORDER fudge, so fudge must be reachable without purchase — an
      order can never demand what the crew cannot have.
    - Inventory v1 = TOWN 2 alone (~50). Future inventory (recorded,
      not built): the solo turntable (a §7 non-goal until its act),
      power-ups (plans/15 item 6).
    - Purse award at each PASSED order: pay.base + stars ×
      pay.perStar — the campaign.ts pay column (authored with slice
      4, dead until now) goes live. A flourish coda pays
      +FLOURISH_BONUS_COINS on top (tuning.ts, 10 — one dial for the
      feel pass), announced with the coda: style visibly pays.
    - Inventory DIES WITH THE RUN: the purse zeroes and town 2
      re-locks at the next run's start — a run is a complete story.
      (Meta-points that persist ACROSS runs: raised this session,
      deliberately deferred — plans/15 item 8.)
    - The stall: greybox against a wall HALFWAY between pantry and
      machine (visionary: running around is part of the fun — the
      shop shares the ferry leg). Walk-up crosshair + E, price on the
      prompt, NEVER a menu. The Room refuses buys unless the order is
      concluded (the separator is the shop's hours — pickTown
      parity); the lobby is moot by arithmetic (purse 0).
    - Wire: small + additive — the purse rides a broadcast plus a
      welcome field (mid-run joiners see the balance); {t:"buy",
      item} client→server REPLACES the unlockTown2 dev stand-in.
    - FEEL-PASS WATCH (recorded so it isn't rediscovered): fudge
      counts toward frost coverage today, free, from rung 1 — its
      down-band reaches wall moats the measured envelope
      (research/11, classic-glob model) calls unreachable. Upside
      with no price; if high rungs play easier than measured, fudge
      tech is the first suspect.

## 6. THE RUN CONTAINER — states and wire

Room match flow becomes:

```
LOBBY ──all in circle──▶ RUNG(1) ──won──▶ SEPARATOR ──▶ RUNG(2) … 
                            │lost                        │lost
                            ▼                            ▼
                        RUN OVER ──────────────────▶ LOBBY
```

- **LOBBY**: no order dealt, no clock. THE READY CIRCLE — one shared
  translucent circle (post-circle furniture, distinct color, sized
  for four) near town 0's spawn. The server reads reported poses: all
  CONNECTED players inside → a short countdown → deal rung 1. No
  button, no key, no chords. Leaving the circle during countdown
  cancels it (the honest gate).
- **RUNG(r)**: today's order loop, verbatim, with rung r's spec/asks/
  clock. Two-gate Judgment unchanged.
- **SEPARATOR**: the existing 18s linger, now carrying: verdict banner
  + report (the dessert-report orbit stays PROMOTED, plans/09 §1 — it
  is the retention hook and should exist by the friend test), purse
  award, shop open, gates open (town switching unchanged), then the
  fresh deal with rung r+1's spec — colliders rebuilt, floor mess
  UNTOUCHED. If the separator proves tight in play it is one constant.
- **RUN OVER**: the run report — rungs cleared, purse earned/spent,
  the filthy floor in frame (the trophy is the mess). Then LOBBY;
  purse resets with the run (a run is a complete story).
- **Late joiners** mid-run join the crew instantly (party law — the
  ready gate guards only the run start). A joiner in LOBBY is just
  another body the circle waits for.
- Wire deltas: `{t:"deal", rung}` on the order msg; `{t:"purse", …}`;
  `{t:"phase", lobby|runover…}` (or fold into the order msg's status);
  `{t:"buy", item}` client→server. Small, additive, roster-validated.

## 7. NON-GOALS (v1 — recorded so scope cannot creep)

- No trays of small desserts (coverage restructuring — later chapter).
- No turntable (second act, after towns-split play exists).
- No new Patron verbs; wind plan and Bite/integrity re-pin remain
  ownerless ledger items (the integrity re-pin should cite §2's new
  numbers when someone owns it).
- No procedural difficulty; the ladder is authored rows only.
- No per-player wallets, no run persistence across sessions.

## 8. BUILD SEQUENCE (slices, each verified before the next)

1. **The run container + lobby + ready circle** (no ladder yet — every
   rung deals cake-3). Smallest end-to-end campaign: ready → order →
   won continues / lost ends → run over → lobby. THE FRIEND TEST
   INHERITS THIS SLICE if it lands first — it cures the
   clock-burning-before-your-friend-joins first impression.
   **[BUILT + BLESSED-PLAN 2026-07-08: RunFlow (game/run-flow.ts),
   phase-gated Room (lobby sandbox: machines fire, nothing scores/ticks),
   ready circle at (−3, 8) r 1.6 (arena.ts, gold glass in scene), run
   wire msg + welcome field, phase-aware HUD/banner/gates/carry-home,
   auto-restart when the crew never leaves the circle. 290 tests green;
   live-verified through a full loop: lobby → countdown → RUNG 1 →
   loss → THE RUN IS OVER report → lobby → auto-restart. Two law
   re-pins recorded in room.test.ts: a lost order redeals NOTHING, and
   the old "orders again" test now walks the whole container loop.]**
2. **DessertSpec core refactor**, proven by ZERO DRIFT: cake-3 as a
   spec row must reproduce every pinned number (661 census, WIN-path
   pins, tier oracles) — the refactor ships before any second row
   exists, so drift has nowhere to hide.
   **[BUILT 2026-07-08 (third session), under the §3 rulings above:
   core/dessert.ts (DessertSpec, CAKE_3, dessertGeometry — the one
   public form; tier math private), buildCensus(spec) in frosting.ts,
   FrostingField takes its census, ProjectileManager.step/
   clearCakeSolids take geometry as ARGUMENTS, judgment/order/patron
   thread it, ZoneId is a tier index with tierLabel words, arena keeps
   CAKE_Z + statics only, Room owns redealDessert() in the ruled
   ordering, the deal msg carries rung, the client rebinds colliders/
   cake meshes/blob instancing/tripod per deal behind the boot-order
   law, game/campaign.ts specForRung is the slice-3 stand-in. ZERO
   DRIFT PROVEN: 661/218/443 pins, WIN path, two-rooms-converge, the
   settle ladder — all green untouched (293 tests, both tsc legs);
   live-verified: boot → lobby cake renders from the spec → ready-up
   deals rung 1 through redealDessert with no snapshot-refused warning
   → a 6-click glob lands on the rebuilt colliders, paints the
   per-spec census, and scores.]**
3. **Spec-parameterize the re-pin tools** (research/13 + /11 take a
   spec); measure cake-1/2, THE CUPCAKE (§1 amendment), and the
   proposed cake-4/5/6 rows; author the RUNGS table against the
   measurements (§4's law). MERGED IN (2026-07-08 fourth session,
   visionary-blessed): the tilt clamp (plans/15 item 2) rides this
   slice's measurement run — the clamp check (cake-3 potentials must
   reproduce under TILT_MAX_NOTCH ~12 before the trap notches are
   cut) is the same harness as the per-spec measurements, so every
   new spec is measured under the clamped ladder ONCE instead of
   full-ladder-then-remeasure. Rider: the render-contract check that
   the visual arm rides the same tilt constants.
   **[BUILT 2026-07-08 (fourth session). Tools parameterized with ZERO
   DRIFT proven (research/11 reproduces the RE-RUN numbers exactly at
   BOTH ladders — the maxNotch-12 run doubling as the clamp check;
   research/13 reproduces 910/0, 27 combos, c7n0–3, n14-plinth); the
   grid/splat mirrors DELETED in favor of importing the real
   buildCensus/splatSamples. TILT_MAX_NOTCH 18→12 landed (notches
   13–18 bought zero coverage; scene.test.ts pins the render
   contract). All seven rows measured under the shipped ladder; the
   RUNGS table (7 rows — the cupcake is rung 4) authored in
   game/campaign.ts with the measurement record in its header and
   pins in campaign.test.ts. THE LADDER'S TOP: cake-6's summit takes
   ZERO shipped (click, notch) combos — windows exist in physics
   (~0.5–1° at tilt 13°/18°) but fall between notches, so the
   envelope dies by QUANTIZATION. RULED (visionary, same session;
   AMENDED next session by §1's FLOURISH AMENDMENT — the crown is an
   optional flourish now and the impossibility relocates to the ULTRA
   title): cake-6 KEEPS the crown ask — THE IMPOSSIBLE TRAGEDY, the one
   sanctioned impossible ask ("necessity is the mother of
   invention"): the final rung is deliberately unwinnable on today's
   machine and the future economy sells the key (power-ups/upgrades
   that reach impossible spots — the §5/plans-15-item-6 discussion,
   post-campaign). Every other row's crown must be measured
   reachable. The crown ladder
   narrows 22 → 16 → 12 → 8 → 7 → 4 → 0 summit combos; the potential
   tables GENERALIZE (solo 89.4–92.1% ≈ the 0.9 pin on every row;
   union 100.0% everywhere — frost never gates the ladder; cupcake
   97.1% outlier, served by the same pin). specForRung STILL deals
   cake-3 — the slice-3 boundary is pinned by test; slice 4 flips
   deal + asks + clock together.]**
4. **The ladder live** — THE FLIP (scoped 2026-07-08 fifth session,
   discussion rulings):
   - specForRung flips to the RUNGS table; deal + asks + clock move
     TOGETHER. The wire needs nothing new (the deal msg already
     carries the rung; both replicas resolve spec through the same
     function, so the client's geometry rebind follows).
   - **THE DEAL DECISION MOVES TO THE ROOM.** OrderFlow.tickClock
     stops self-dealing (it dealt BEFORE the Room learned the
     outcome — per-rung rows would deal the OLD rung's asks over the
     NEW rung's cake); it reports the linger's end, and the Room
     runs the one honest sequence: orderConcluded → dealFresh(rung
     row) → redealDessert → broadcast. On a loss the dormant lobby
     order deals explicitly as rung 1 (already the law).
   - Per-rung rows: frost from asks.frostFrac; sprinkles row OMITTED
     when the ask is 0 (a zero row is born met and naggable); crown
     SHELVED (the flourish is 4b). Clock = clockSeconds. activeTowns
     mechanism unchanged.
   - **PAR SCALES PER RUNG** (gap found in discussion: flat par 24
     mechanically punishes the two-town play the high rungs demand —
     cake-6 duo pass ask ≈ 25 idealized shots alone). Rung gains an
     authored parShots column priced from the yardstick at BOTH ask
     tables ({solo, duo} — the anchor forces solo rung 3 = 24
     verbatim, so one flat number cannot serve both). Waste stays a
     score-shaver (10% axis), so this is honesty, not rescue.
   - **Rung-7 win = MASTER BAKER** (the §1 flourish amendment):
     RunFlow gains the won-run terminal; the report reads rungs
     cleared and the victory banner. Skeleton only — fanfare/music/
     credits are a content pass.
   - The snapshot tripod frames per-spec (it dies on tall specs the
     moment cake-4+ deals — the fix rides IN the slice).
   - Tuning's FROST_FRAC/SPRINKLES_NEEDED/ORDER_SECONDS/
     ORDER_PAR_SHOTS become ANCHOR REFERENCES (live code reads
     RUNGS; the constants keep the anchor pins + a pointer note).
   - Test re-anchor: the WIN-line pins move to rung 3 via a test
     seam, where they become the flip's zero-drift proof — rung 3
     dealt through RUNGS must equal today's standing order exactly.
   **[BUILT 2026-07-08 (fifth session), under the scope above. The
   flip: specForRung → specById(rungRow(rung).spec); requirementsFor
   (row, towns) deals the per-rung ticket (sprinkles-0 omits the row;
   no crown row anywhere — shelved to 4b; patron rule 3 deleted);
   dealFresh(row) prices clock + par ({solo,duo} authored column,
   campaign.ts header formula — anchor forces solo rung 3 = 24);
   tickClock reports lingerOver and NEVER self-deals (the Room runs
   orderConcluded first — the ordering bug the discussion predicted);
   RunFlow gains the runWon terminal + won flag → RunWire → MASTER
   BAKER banner (skeleton); validateRungs at Room boot; the tripod
   places itself per spec (waist aim, 45° elevation, range from the
   summit — anchor frame preserved within half a meter); predictClock
   phase-gated (found live: the lobby view free-ran with its 1Hz
   correction gated off). ZERO DRIFT: the WIN script re-anchored to
   rung 3 plays today's standing order beat for beat (same rows/
   clock/par/verdict, minus the shelved crown) and its win now deals
   THE CUPCAKE (rung 4 ticket pinned on the wire). 313 tests green,
   both tsc legs; live-verified on the worker-shim harness: lobby
   clock frozen at 9000, ready-up deals rung 1 (150s clock, par 11,
   ONE row — frost 0.4, no sprinkles), live clock ticks, a 6-click
   splat paints cake-1's own census (frost row 0 → 3.3%).]**
4b. **The flourish** (the §1 amendments' build — DISCUSSED 2026-07-09,
   sixth session; rulings in §1 THE FINISH IT AMENDMENT, all of
   record). Build order: the WINDOW is the spine, built first; the
   cherry is its content.
   - The finish-it window: base judgment frozen at the rows-met tick,
     verdict completes at window end (S-MED-1 amended per §1); opens
     only on accepted + asks.crown + reveal-fired + desire-unmet;
     authored countdown constant (~12–15s), early-out when the desire
     settles; pre-met desire and every non-qualifying win render
     instantly as today.
   - The desire: separate OrderState field (topping + placement,
     v1 "cherry on the top tier"), judged from the settled ledger at
     verdict time. Toppers class + boot validation (no desire topping
     may appear in any orderable row).
   - THE CHERRY end-to-end under the lime's grammar: pantry crate,
     carry, shot, settle, visuals, mess accounting — both replicas.
   - Reveal at COVERAGE_GOOD via the patron look (golden HUD row +
     voice line); FINISH IT banner + countdown on the HUD.
   - Verdict coda (wire + report flair); rung-7 title line upgrade →
     ULTRA MASTER BAKER OF THE REALMS (skeleton — content pass later).
   - Zero-drift guard: every existing win path that doesn't qualify
     for the window must render beat-for-beat as today (the WIN
     script must not move).
   **[BUILT 2026-07-09 (sixth session), under the §1 finish-it
   rulings. OrderState gains `desire` ({topping, revealed, met} —
   dealt by freshOrder exactly on asks.crown rungs, from
   Patron.desire: the Giant's cherry) and `finishTicksLeft` (both
   ride every order-carrying msg for free — welcome included, so
   mid-window joiners just work; status stays "running" through the
   window, which keeps all seven status-keyed client seams correct
   unchanged). Patron rule 3 reborn as THE REVEAL (in-place desire
   mutation at a look when the frost check's current ≥ goodFrac;
   patience 0 — the offer is a gift). judgment.ts: crownHolder/
   crownedWith extracted (the crown row and the desire share one
   decoy-proof predicate); Judgment.flourish. The Room owns the
   window: qualification at the rows-met tick (accepted + desire +
   revealed + unmet) holds the base verdict in pendingVerdict
   unbroadcast and opens the flow's countdown (FINISH_WINDOW_TICKS,
   15s); landings during the window early-out via the live desire.met
   census; finishOver and the early-out both close through
   concludeFinishWindow — one last ledger read stamps the coda, the
   ending broadcast is the same atomic word as ever ("judgment rides
   exactly when the msg ENDS the order" stays true verbatim);
   stampFlourish also runs on every instant conclusion (pre-met =
   instant verdict + coda). runWon consumes lingerVerdict.flourish →
   RunFlow.ultra → RunWire.ultra → ULTRA MASTER BAKER OF THE REALMS
   title swap (skeleton). validateDesires (the toppers law) runs at
   Room boot beside validateRungs. Client: predictClock predicts the
   window's own countdown (order clock held); HUD golden row (★ THE
   FLOURISH, revealed-only, ✓ when met), ⭐ FINISH IT! header swap,
   banner + caption coda, ULTRA in runover header/report. The cherry
   needed ZERO topping plumbing — crate/carry/shot/settle/color all
   shipped dormant since the pantry pass. 337 tests (from 313), both
   tsc legs; the WIN script untouched except three additive
   zero-drift asserts (its 0.566 win sits under goodFrac — no reveal,
   no window, beat for beat). LIVE-VERIFIED (loopback, via the new
   DEV `__game.room` seam — net.ts exposes the loopback Room for
   jumpToRung-style state building): real-look reveal → golden row;
   window open (probe: 900 ticks counting, pendingVerdict held,
   status running, gates shut) on a real landing; timeout close →
   linger → the ladder climbed to the cupcake; the frozen-verdict law
   held live (a cherry seamed in AFTER the close changed nothing);
   pre-met path → instant ★★ verdict wearing "✨ AND THE FLOURISH — A
   CHERRY ON THE VERY TOP ✨" on the banner.]**
5. **Purse + pay + shop stall** (DISCUSSED 2026-07-09, seventh
   session; rulings in §5's SHOP-SELLS-INFRASTRUCTURE AMENDMENT —
   fudge unlock struck, ZERO fudge work; inventory v1 = town 2
   alone). Build shape:
   - Purse is run-scoped Room-side state (RunFlow's grain — it
     resets where the run resets); award at each passed conclusion
     from the rung's authored pay column; flourish coda adds
     FLOURISH_BONUS_COINS (tuning.ts, 10).
   - {t:"buy", item} replaces the unlockTown2 dev stand-in;
     Room-validated (catalog, not owned, funds, separator-only);
     honest refusals. Town 2 re-locks at run start.
   - The stall greybox against a wall halfway pantry↔machine, per
     town; crosshair + E + price prompt; purse on the HUD; the
     welcome carries the balance.
   - Zero-drift guard: a run that buys nothing plays beat for beat
     as today.
   **[BUILT 2026-07-09 (seventh session), under the §5 amendment.
   RunFlow owns the purse (earn/spend; zeroes in tickReady's start
   branch — the report and the lobby keep the finished story's
   balance); Room.awardPay at both won-conclusion sites (the instant
   verdict and concludeFinishWindow): pay.base + stars × perStar +
   FLOURISH_BONUS_COINS (tuning.ts, 10) when the verdict wears the
   coda. {t:"buy", item} REPLACES unlockTown2 (protocol + the client
   dev seam retired) — Room-validated in order: catalog whitelist,
   shop hours (phase running + order status "won" + rung below the
   top: a run-ending linger sells dead keys), not owned, purse
   debit; refusals are silent drops the client's prompt/flash
   predicts in words (interactions.ts shop branch + state.shopState,
   both drift-pinned). THE RE-LOCK: startRun shrinks towns to 1,
   re-addresses the dying fort's crew through town words BEFORE the
   fresh deal and the run word (C-MED-2's invariant in both
   directions — the client truncates machines on its run-start
   edge). The purse rides RunWire (absent = 0, so a no-coin wire is
   byte-identical to the pre-purse wire) and the welcome for free.
   The stall: arena.ts Town.shop + SHOP_HALF (a real static in both
   replicas' worlds, far off every firing line) at ±7.15 on the side
   wall, z at the pantry↔machine midpoint, per fort under the 180°
   rotation; scene counter/post/gold-coin meshes ride the
   townInteractables raycast. HUD purse row (running block), banner
   pay line (computed client-side from the SHARED tables — the words
   and the wallet agree by construction), runover purse line. FOUND
   + FIXED IN PASSING: net-handlers' run case never copied
   RunWire.won/ultra — a standing client could not render MASTER
   BAKER (only welcome-path joiners saw it); copied + pinned. The
   towns convergence test REWORKED to the honest teaching arc: two
   seam-painted 3★ wins fund the purchase over real wire (25 + 35 −
   50 = 10), buy + pick + the town-1 shot converge byte-for-byte,
   and a double-buy bounces off `owned` undebited. 355 tests (from
   337), both tsc legs. LIVE-VERIFIED (worker-shim harness, probe
   armed first): ready-up → rung-1 3★ win banner "🪙 +25 coins to
   the purse" with wire purse 25 agreeing → poor buy refused (towns
   1, purse intact) → funded buy honored mid-linger (towns 2, purse
   10, client machines 2 instantly) → rung 2 dealt for two towns →
   clock death → runover report "🪙 the purse ends at 10 coins" →
   auto-restart: towns 1, purse 0, client machines 1 — inventory
   died with the run, live. Both stalls verified standing at their
   rotated anchors by mesh census.]**
6. **Feel pass** (visionary runs the ladder), then the campaign's own
   two-PC session rides the next friend test.

## 9. Open items (flagged, not blocking the bless)

- ~~Tier radii/heights for cake-4+~~ PINNED 2026-07-08 (fourth
  session): the §4 hypothesis steps measured well — the ladder's top
  is cake-6 (summit dead by notch quantization, see §8.3 build
  record); no cake-7 (cake-5 is the last honest crown; cake-6 is the
  near-impossible finale by workload).
- Prices/pay scale — §5's table is a starting hypothesis for the feel
  pass.
- ~~Whether rung 1's humble cake wants to BE the cupcake spec row~~
  RESOLVED 2026-07-08 (fourth session): the cupcake is its OWN rung
  after rung 3 (§1 amendment) — a small surface needs a dialed-in
  crew, so it is a mid-ladder precision test, not the tutorial. Rung
  1 stays cake-1 (today's base tier alone).
- Separator length under real shop+report+switch load — one constant.
- Where the ready circle sits exactly (near spawn, clear of the
  pantry run) — greybox placement, feel pass moves it.
