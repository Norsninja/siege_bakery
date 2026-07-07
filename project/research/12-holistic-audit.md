# 12 — Holistic audit (2026-07-07, post-towns-spine, pre-friend-test)

Visionary-requested whole-project pass, the research/05 "Senior Dev audit"
method extended: six parallel independent auditors — the four layers
(core / game / server+wire / client+config) plus two new axes (goals-vs-
state against the 2D lineage docs; knowledge hygiene across the written
record). Every finding verified against code (file:line) before entering
this report. Fix pass to follow discussion with the visionary — findings
first, changes second.

## Baseline at HEAD 0b81f22

- 237 tests green (24 files); root tsc + headless tsc clean; vite build
  clean (2.8MB bundle, gzip ~993KB).
- Live verification this same day: solo two-town play-through (gates,
  latch, pick, rotated ladder, carry-home), 18s linger retune verified
  end-to-end, friend-test tunnel dress rehearsal (two pipes, one room).
- Since the last audit (research/05, 2026-07-03, baseline 145 tests):
  the frosting economy, the projectile pass, the towns spine (8 commits),
  gated walls + carry-home, the linger retune, the tunnel fix — all
  previously unaudited as a whole.

## Findings

### GAME layer (verdict: excellent — findings are definitional, not behavioral)

Determinism airtight (one seeded RNG `mulberry32(0xcafe)`, no clocks, no
unordered iteration feeding rules); layering clean; state machine has no
double-transition or lost-event seams; two-gate Judgment matches plans/07-08
law. Findings (spot-verified by the synthesizer):

- **G-MED-1** judgment.ts:31-37 — the `frost-coverage` type comment names
  TOWN_POTENTIAL as the dealt table; since Option B the dealt value is
  TOWN_ASK_POTENTIAL (order-flow.ts:52-55). The exact conflation Option B
  legislates against, written on the type every consumer reads first. Fix S.
- **G-MED-2** order.ts:57-58 — live gate-2 threshold is `?? 50` and the
  parShots fallback `?? 6` (4× tighter than real par 24), both OUTSIDE
  tuning.ts which claims "every knob in one file"; every live deal's
  passScore comes from the order.ts default, not the dashboard. Fix S:
  PASS_SCORE into tuning.ts; parShots default = ORDER_PAR_SHOTS.
- **G-MED-3** protocol.ts:121 — "the 10s banner linger" comment orphaned by
  the 1080-tick retune; say "the ORDER_RESET_TICKS linger", never a literal.
- **G-LOW-4** order.ts:87-91 vs judgment.ts:193/114/197 — all-rows-met rule
  and of-potential clamp each defined twice; winning tick runs the census
  twice. Fix S-M: judge accepts precomputed checks; met-predicate helper.
- **G-LOW-5** order-flow.ts:52-53 — activeTowns clamps up, not down;
  standardRequirements(0) deals potential 0 → NaN/Infinity coverage row.
  Latent (no caller passes 0). Fix S: Math.max(1, …).
- **G-LOW-6** TOWN_POTENTIAL consumed by zero code/tests; the "ask ≤
  measured" law asserted nowhere. Fix S: one invariant test (doubles as the
  stale-[3]/[4] tripwire).
- **G-LOW-7** protocol.ts:176-182 — verdict messages carry the checklist
  twice (checks + judgment.checks). Wire waste + ambiguity. Fix S-M.
- **G-NIT-8..12** — shouldLook() mutates (rename tickLook); wire `shot`
  restates Shot's fields (compose); partial crank progress survives a lever
  pull (document or drop the pawl); retune-fragile literal asserts in
  patron.test (−2/−4) and order-flow.test (0.75); IDLE_INTENT/IDLE_OP not
  frozen.
- Test-suite: high quality, real predicates; game/ correctly derives linger
  tests from ORDER_RESET_TICKS. One unbounded while-loop test (order-flow
  .test.ts:94) fails by timeout instead of assert.

### CORE layer (verdict: healthy; defects sit at the seams of its OWN laws)

Layering holds without exception; collision-group algebra bit-correct in
all six pairings (hand-verified by the auditor incl. the gate's one-sided
product); flank geometry / slab margins / 180° rotation arithmetically
right; comment culture "the best I've audited in a codebase this young."
73/73 core tests green.

- **K-HIGH-1 (verified by synthesizer)** projectiles.ts:381,420,540-541,
  565-566 — Math.hypot in the rest/wake/lastSpeed decisions, violating the
  project's own cross-engine exactness law (arena.ts:251, frosting.ts:132:
  "no hypot — not exactly rounded"). The freeze compare mutates body TYPE
  (world state): a last-ULP hypot difference on Safari (the iPad that
  "rides along") freezes a body one tick apart and the litter worlds fork.
  V8-to-V8 (the PC friend test) is safe; the law as stated is violated.
  Fix S: squared magnitudes vs squared thresholds (no sqrt at all);
  lastSpeed via Math.sqrt.
- **K-MED-2** projectiles.ts:376-383 — the wake pass counts still,
  mid-settle tracked shots as "movers" (only waking bodies get the speed
  gate): a motionless topping near a frozen pile re-wakes it every tick —
  contact jitter + O(tracked×frozen) churn. Deterministic (cost/behavior
  wart, not sync). Fix S: same restLin gate on tracked movers.
- **K-MED-3** projectiles.ts:119-121 vs arena.ts:231-238 — the Stuck doc
  claims "tierOf works on it" but tierOf returns null for EVERY wall grip
  point (y below tier top); wall grips are the common conversion case.
  Masked today by room.ts's hardcoded onCake:true; the first count-in-zone
  sprinkle row silently never counts wall-stuck grains. The arena test
  titled "reads back onto the tier" asserts something weaker than its
  name. Fix S-M: correct the comments + wall-point pin, or extend tierOf
  with a skin-point rule.
- **K-LOW-4** determinism-tripwire misses crypto.randomUUID and strips
  "//" inside string literals (silent false negative). Fix S.
- **K-LOW-5** the two-fort geometry table has NO core pin (flank algebra
  verified by hand this audit; a typo ships silently — wall holes are
  masked by client-only gates). Fix S: pin TOWNS[1] anchors + flank
  abutment.
- **K-LOW-6** launchOrigin requires caller-composed facing while
  launchVelocity composes internally — three defensive comments guarding
  one missing parameter. Fix S.
- **K-NIT-7..10** — frostedNear "band" comment describes a mechanism that
  doesn't exist (wall-base case unpinned); mid-settle on-cake body
  survives clearCakeSolids (cosmetic, stale tag scores nothing); mutable
  exported constants (GRAVITY et al — freeze them); WALL_SAMPLE_SPACING
  duplicates SAMPLE_SPACING; TOWNS[1].gate re-derives rotation inline;
  fuse loop mutates tracked during for...of (safe today, tripwire comment
  wanted).
- Rapier deprecation warning ROOT-CAUSED: fires inside rapier3d-compat
  0.19.3's own wasm-bindgen glue; all project call sites match the
  declared signature. Upstream fix; nothing to change.
- Session-length note: floor litter (bodies/frozen/world) grows unbounded
  by design — fine for a party, needs a cull before "server up all
  weekend."

### CLIENT + CONFIG layer (verdict: healthy, one real hole)

Decomposition discipline from the 07-03 audit has held (rules in tested
pure modules; resource lifecycle airtight — rings FIFO 30, splats FIFO 40
with monotonic stagger, disposals everywhere checked; accumulator capped;
gates.update before Baker.step, pinned). gates.test.ts is a model of the
positions-not-counters law. Findings (HIGH-1 verified by synthesizer):

- **C-HIGH-1 (fix before friend test)** main.ts:198-201 — pre-welcome
  connection failure hangs forever on "joining the bakery…": netStatus
  "closed" is only worded by the render loop, which starts AFTER `await
  firstWelcome`. Dead tunnel / downed server = permanent lying screen —
  the same silent-wrong-mode class the tunnel fix killed at the URL layer,
  still open at the connect layer. Fix S: word the closed status during
  the pre-welcome wait.
- **C-MED-2 (the known nit, confirmed)** net-handlers.ts "town" case
  doesn't grow machines[] (the "machine" case does); ≤4-tick window where
  myMachine reads town 0 (HUD line, promptFor, machineLoaded gate).
  state.ts:39-40 "never after" comment is FALSE until fixed. Fix S: shared
  grow helper + truth the comment + a pinning test (apply town ack to a
  one-machine view, assert myMachine === machines[1]).
- **C-MED-3** the 2026-07-07 linger/carry-home RULES (arm, decrement,
  seconds arithmetic, carry-home trigger) live untested in main.ts's tick
  body — the exact AUD-12 re-accretion class that created interactions.ts.
  ~15 rule-lines; extract a pure lingerTick() into interactions.ts. Fix M.
- **C-LOW-4** main.ts:312 hardcodes 60 in `lingerTicks / 60`; hud.ts does
  it right with FIXED_DT. Fix S.
- **C-LOW-5** frosting-view blobs InstancedMesh: bounds computed from
  zero-scale instances, never recomputed; survives only by accident of
  construction order — the 2026-07-06 invisible-sprinkles lesson
  incompletely applied. Fix S: frustumCulled = false + the comment.
- **C-LOW-6** input.ts:94 — requestPointerLock() rejection unhandled;
  Esc-then-click-back throws console errors in the flow every playtest
  hits. Fix S.
- **C-LOW-7** HUD textContent written every rAF frame, banner at 60Hz;
  guard with an if-changed comparison. Fix S.
- **C-NIT-8..12** — per-frame Vector2/Vector3/closure allocations
  (hoistable); setGrainCount dead by its own contract (remove); depth-
  IntoTown silently assumes ±Z-facing fronts (comment the constraint);
  duplicated home-placement snippet (boot vs carry-home); spawnResting
  double position-set.
- Config: tsconfig strictness exemplary; headless leg genuinely covers
  core+game+server. Bundle 2.7MB is rapier-WASM-base64 + three, not app
  bloat — but zero manualChunks means every app change re-ships 2.7MB
  through the friend's tunnel; a two-line manualChunks makes rebuilds
  a few-KB delta. Fix S.
- Test gaps: no pin on myMachine after a town ack (why C-MED-2 survived);
  linger countdown / carry-home trigger untested (C-MED-3); frosting-view
  and sprinkles-view have no test files.

### GOALS-VS-STATE map (verdict: pointed squarely at its own goals)

Portage: artillery-as-construction PORTED; splat-vs-place PORTED (frosting
half; damage half waits on carving); two-gate Judgment PORTED (2D score
formula verbatim); orders-as-data PORTED (one template); Patron behavior
trees PORTED (one personality, real rule list); two towns PARTIAL (spine
built; counted toll = fork 3); tone guard PORTED by construction; event-
based cake sync PORTED (seed S live on the wire); deterministic core PORTED
and strengthened (tripwire fences server/ too); falling-sand NON-port CLEAN.

- **V-1 (adjudicate)** plans/09 §1 PROMOTED the dessert-report orbit to
  friend-test scope ("the retention hook… should exist by the friend
  test"); plans/11 §8 defers it to fork 3; plans/12 runbook omits it. The
  first friend currently meets the game without its declared trophy moment.
  VERIFIED both citations. The visionary must pick: ship the test without
  it (annotate plans/09) or build the orbit first.
- **V-2** integrity = 1 (judgment.ts:199) — 25% of gate-2 score is constant
  free credit; every threshold being play-tuned today re-pins when the Bite
  lands. The longer tuning accretes on it, the costlier the correction.
- **V-3** wind is declared identity (plans/06 decision 4) with NO owning
  plan; all pins are calm-air measurements; re-pin law makes late wind a
  full-economy re-measurement.
- **V-4** iPad-with-controller has zero substrate (no Gamepad API anywhere);
  input isolation makes it feasible, pointer-lock camera is the one
  non-free piece.
- **V-5** "in your town" truth is client-side (sanctioned by trust model);
  fork-3 toll attribution will want server-side position truth — poses
  already relay, so the path exists.
- **V-6** un-annotated dead law in plans/11: §3 open-front AND §6's
  "TOWN_POTENTIAL[1] re-pins 0.42→~0.55 now" (superseded by Option B) carry
  no in-file deprecation; a future reader of plan 11 alone gets two wrong
  laws. VERIFIED.
- Undeclared construction: essentially none (fudge row is sanctioned
  plans/10 speculation; nothing else fails to trace to a doc).
- No-plan-yet vision items: wind/pennant/Sneeze, Bite + carving/integrity,
  Crowning finale, BakerStats (port map B4 warns retrofit cost), Patron
  variety, campaign ladder, art/sound, scale pass.

### SERVER + WIRE layer (verdict: healthy and disciplined; findings edge-of-law)

AUD-1/AUD-2 hardening FULLY INTACT (every transport defense and field gate
re-verified); the two paths added since (unlockTown2, pickTown) were built
inside the validation culture — pickTown correctly double-gated (match
truth in Room, field truth in Roster). Decomposition has not re-accreted;
determinism engineered (seeded streams, insertion-order-as-input-stream
acknowledged in comments); leave cleanup complete; ids never reused.

- **S-MED-1 (verified by synthesizer)** room.ts:174-176 — the mid-banner
  welcome RE-JUDGES via judgeNow() (live ledger + current shotsFired)
  instead of serving the verdict broadcast at "ended" (room.ts:389, also
  judgeNow at the transition tick). Machines still fire in the linger and
  noteShot ticks the waste axis → a joiner 5s into the banner can read
  refused while the room celebrates. Fix S: capture a lingerVerdict at
  "ended", serve THAT in the welcome, clear on redeal.
- **S-MED-2** roster.ts:92-99 — an honored pickTown re-routes the picker's
  STANDING inputs: held crank ops / pending leverPulls / queued loads
  instantly drive the NEW town's machine (assignment moved the hands, not
  just the body). Latent (no client sends pickTown yet — fork 2 will build
  on this plumbing). Fix S: on honored setTown, reset held/leverPulls and
  decide the loads policy. Pin what SHOULD happen.
- **S-MED-3** room.ts:155 — the welcome carries no member roster (only
  poses of members who have posed; no names, no per-member towns). Breaks
  the "late joiner reconstructs EVERYTHING" law and the reserved
  color-by-town ghost seam (protocol.ts:133). Fix S: welcome gains
  members: [{id, name, town}] — Roster owns all three.
- **S-LOW-4** main.ts:125-131 — the malformed-JSON catch also swallows
  real Room exceptions mid-mutation (half-applied state, silent). Fix S:
  parse inside try, shape-check, onMessage outside.
- **S-LOW-5** in-flight SOLIDS at join time never materialize on the
  joiner's replica (permanent invisible obstacle for him); the accepted-
  gap doc covers only the frosting glob; room.test.ts:596-603 pins the
  exclusion with a mistaken rationale. Fix S (document) / M (welcome
  in-flight shots as {event, ticksAgo} fast-forward).
- **S-LOW-6** every broadcast stringifies once per member (~8× redundant
  at party scale). Fix S/M: cache the string per broadcast — touches the
  loopback transport contract.
- **S-NIT-7/8** — hello rename is applied but unobservable (write-only
  handler); step-6 test comment still says "600t linger" (the coupling
  itself is resolved in substance at 1080 — ~2× headroom).
- Efficiency notes: per-look census triple-dip (compute once, pass twice);
  unconditional 15Hz machine broadcast (dirty flag someday); floor litter
  unbounded by design (fine for a party, cap before a weekend server).
- Test gaps worth one pin each: pickTown-with-held-op; mid-banner-joiner
  verdict consistency; leave-mid-crank; hostile hello.

## Goals-vs-state map

Folded into Findings above (GOALS-VS-STATE section).

## Knowledge-hygiene ledger

(Verdict: the record is unusually trustworthy where it matters — commit
messages verified true against the tree, arena.ts carries the open-front
deprecation at the build site, tuning.ts warnings sit on the constants,
repo status immaculate. The drift concentrates at two seams: plans/11
never annotated, and the last two commits outran CLAUDE.md + handoff.)

- **H-D1 (HIGH)** plans/11 §3/:283/:305 still state the open-front law
  with no in-file deprecation (arena.ts side done; plan side NOT). Fix S:
  three dated one-line amendment notes.
- **H-D2 (HIGH)** CLAUDE.md current-state is two commits stale: says 232
  tests (237), lists friend-test scope as OPEN (decided, plans/12), omits
  pickWsUrl/runbook/linger-retune. Next session re-litigates a settled
  decision. Fix S: refresh the paragraph.
- **H-D3 (MED)** plans/11 §11 lists friend-test scope "Not yet decided" —
  RESOLVED → plans/12. Fix S.
- **H-D4 (MED)** = G-MED-1 (judgment.ts names the wrong table).
- **H-D5 (MED)** research/06 bills itself as the STANDING RE-PIN TOOL but
  its header presents pre-bump numbers as current pins and its envelope is
  hardcoded clicks 4-8 — re-running it re-pins BACKWARDS to 0.42/0.73.
  Fix S: header note (envelope ≤9; [1]/[2] pinned from research/11).
- **H-D6 (MED)** = G-MED-3 (protocol.ts "10s banner linger").
- **H-D7 (MED)** .github/workflows/ci.yml (dormant until a remote exists)
  enforces the headless law only ONCE — missing the tsconfig.headless leg
  CLAUDE.md's "enforced TWICE" promises. Fix S: run `npm run check`.
- **H-D8 (LOW)** research/10:39 + research/11:71 say "TOWN_POTENTIAL stays
  pinned at 0.42" — post-split that value is TOWN_ASK_POTENTIAL[1]. Fix S.
- **H-D9 (LOW)** = C-MED-2's comment half (state.ts "never after" false).
- **H-NITs** research/09 cites stale file:line anchors; .gitignore blankets
  tools/ (a future checked-in tool script silently vanishes).
- Handoff delta: three §6 items CLOSED but unmarked (linger length —
  retuned to 18s; friend-test scope — decided; step-6 fragility — it bit
  and was fixed); the residual-quirk item's "10s exposure" sizing is now
  18s and nothing records that; pickWsUrl/runbook/237 exist in no handoff.
- Dead scaffolding: setGrainCount FINISHED by its own contract (remove or
  re-comment as kept-on-purpose); tmp-*.mts culture honored (none left);
  room-rehearsal launch entry live and intentional.
- Commit spot-check (last 10): every claim verified true against the tree.
  Test-name honesty: sampled broadly, no overpromising names found.

## Overall verdict

No CRITICALs. Zero layering violations, zero determinism-law breaks in the
V8 world the friend test rides on, the 07-03 hardening fully intact, and
the two message paths added since were built inside the validation culture.
The risk again concentrated at the newest seams: the towns/linger/welcome
edges and the written record's last two commits. Two HIGHs total, both
small fixes: the silent pre-welcome hang (friend-test critical path) and
the hypot exactness-law violation (matters the day Safari joins).

## Fix plan (tranches A+B APPROVED and LANDED 2026-07-07 — commits
AUD-A1..A5 55e91e6/4bf4c43/cd56134/d9a69bb/5a88d7c + AUD-B b58c081;
239 green. Tranche C deferred post-friend-test by the visionary's word.
Design answers: D1 dessert report JOINS the friend test as an in-world
snapshot camera (visionary amendment — plans/11 §11 note); D2 integrity
re-pin obligation recorded in CLAUDE.md for the future Bite plan; D3
wind revisit agreed — needs an owning plan, pennant is static scenery
today.)

**TRANCHE A — before the friend test (all S, one session):**
A1 C-HIGH-1 pre-welcome closed-status wording (the lying "joining…" hang)
A2 K-HIGH-1 hypot → squared compares in rest/wake; sqrt for lastSpeed
A3 S-MED-1 lingerVerdict captured at "ended", served in welcome + pin
A4 C-MED-2/H-D9 town-ack machine growth + comment truth + pin
A5 vite manualChunks (three/rapier split — few-KB rebuilds over tunnel)

**TRANCHE B — the record (one hygiene commit, all S):**
plans/11 deprecation notes (§3/§9/§10 + §11 resolved lines); CLAUDE.md
current-state refresh; judgment.ts table comment; protocol.ts + step-6
comment linger literals; research/06 re-pin-tool header; research/10/11
0.42 notes; ci.yml → npm run check; .gitignore tools/cloudflared.exe only;
setGrainCount removal; freeze IDLE_INTENT/IDLE_OP/GRAVITY/anchors.

**TRANCHE C — correctness batch (post-friend-test unless time allows):**
G-MED-2 PASS_SCORE→tuning + parShots default; G-LOW-4 single census +
met-predicate helper; G-LOW-5 clamp down; G-LOW-6 ask≤measured invariant
test (doubles as stale-[3]/[4] tripwire); G-LOW-7 checklist once per
verdict message; S-MED-2 pickTown resets the picker's hands + pin;
S-MED-3 welcome members roster; S-LOW-4 parse/apply split; K-MED-2 wake
gate; K-MED-3 tierOf truth + wall pin; K-LOW-4 tripwire nets; K-LOW-5
TOWNS pins; C-MED-3 lingerTick() extraction to interactions.ts;
C-LOW-4/5/6/7 + NIT sweeps.

**DESIGN DECISIONS (the visionary's, not fixes):**
D1 Dessert report: plans/09 §1 promoted it to friend-test scope; plans/11
   defers to fork 3. Ship the test without it (annotate plans/09) or
   build the orbit first?
D2 Integrity=1: 25% of gate-2 score is free credit; every threshold tuned
   today re-pins when the Bite lands. Schedule the carving axis before
   more tuning accretes?
D3 Wind: declared identity (plans/06 decision 4), no owning plan; every
   pin is calm-air. Cheapest before more pins accrete.
D4 iPad substrate: no Gamepad API anywhere; input isolation makes it
   feasible; pointer-lock camera is the non-free piece.
