# Handoff — 2026-07-03 (slice 2 Patron SUCCESS + High Arc built, Test Cake next)

## 1. Snapshot

A very productive session: port-gap analysis written and roadmap locked;
slice 2 (the Patron) built, playtested SUCCESS, and tuned from notes; the
High Arc mini-pass (elevation screw) built, feel-tested GOOD after two
feedback fixes (visual pivot, grip semantics). HEAD 22d0953, 80 vitest
tests green, tsc strict clean. The game now has: typed requirement orders
with a live ✓/✗ checklist, two-gate Judgment (mess+waste axes only until
frosting), the Giant on a 12s look cadence (grumbles/nags/demands/
reminders; patience burns the clock), and a 4-position elevation screw
(55/70/85/100° launch). NEXT SLICE: the Test Cake — three tiers + crown
rule — then frosting + census. Friend test (tunneled PC-to-PC) still
open, ops-only, can run any time.

## 2. What changed this session

- project/research/01-port-gap-analysis.md — full 2D→3D audit (ported /
  ports-next / ports-as-concept / dropped). Key number: gate 2 of the
  judgment is 75% frosting-dependent by weight. Newly recorded drops: the
  2D golf-swing power meter (the winch+visible arm IS the meter/gauge —
  diegetic), actor HP/damage, missile rows.
- Slice 2 (plans/03) all four steps:
  - game/judgment.ts (NEW): Requirement rows (count-on-cake,
    count-in-zone), SettledTopping, RequirementCheck, checkRequirements,
    describeRequirement, JudgedOrder, judge() (two gates; axes now: mess
    0.6 + waste 0.4, 2D 3:2 ratio renormalized; stars +15/+30 over
    passScore).
  - game/order.ts reworked: mutable requirements list + parShots +
    passScore + clock; evaluateOrder renders the Judgment the moment all
    rows met (accepted→won, refused→lost); empty orders can't win;
    finished never un-finishes.
  - game/patron.ts (NEW): Patron/PatronContext/PatronAct + createGiant()
    — 2D rule list translated: new-mess thunder (prevMess grudge fix),
    stalled-row nag tightens in place once, progress-based cherry demand
    appends a DEAD CENTER row once, clock-low reminder names the row,
    harmless whim (Sneeze waits for wind), grumble burns patience.
    Patience lands as SECONDS on the order clock. Fresh Patron per deal
    (once-flags live in closure). Room rng = mulberry32(0xcafe).
  - server/room.ts: settled-toppings ledger (resets per deal; physical
    toppings persist), shotsFired counter, patronLooks() every
    PATRON_LOOK_EVERY (12s order time), 1Hz clock broadcast only while
    running (so the verdict message stays last), standardRequirements()
    = 3 × cherry on-cake.
  - protocol: order/scored/welcome carry checks; order carries judgment
    exactly when it ends the order; patron {text, seq}.
  - client: checklist HUD, three-way banner (DELIGHTED ★/REFUSED/TIME-
    hungry) always with the culprit-naming checklist, "THE GIANT — …"
    flash, peak-zone painted square, __game additions (getChecks,
    getJudgment, getLastPatron).
- Playtest verdict (plans/03): SUCCESS — "it was fun. The Giant's
  comments are great." Notes folded: LIMES ARE A DECOY (never ordered);
  cherry rule is the CROWN (uppermost topping — needs 3-tier cake; peak
  zone = top-tier-footprint stand-in, PEAK_HALF 2.25); pennant moved
  beside the machine plinth (wind instrument, not bullseye marker).
- research/02-vision-alignment.md — lore anchor (universal fantasy
  universe; dwarf chefs; giant patron; catapult = dwarven war relic),
  spotter is INFORMAL (no callout-language constraints), trajectory hint
  DEFERRED (no-prediction-UI law stands; recorded shape if it returns),
  backlog: overstretch→failure→repair (also anti-camping), scale pass
  (huge toppings justify carry-one), spotter optics.
- High Arc (plans/04): elevation screw at the machine FRONT, 4th
  interactable (E+W/S), tilt notches 0..3 × +15° over the arm's natural
  55°; notch 0 = pre-existing feel exactly (settle pins untouched);
  tickMachine gained optional 4th screwTicks param (screw law mirrors
  crank: drop/flip/limit-clack); mergeIntents merges screw like turn;
  shot carries tiltNotch; machine msgs carry screwTicks. Feedback fixes:
  tilt pivots at REAR ground contact (tail planted, nose lifts), jack
  post extends as analog gauge, CLUNK flash on notch engage, GRIP
  SEMANTICS (control engaged with E stays held until E release —
  crosshair slip or control moving under it never turns W/S into
  walking), arc readout everywhere is degrees + position glyph
  ("arc +15° ▮▮▯▯" — "notch 1/3" misread as a 3-notch ladder).

## 3. Architecture and invariants

- Layering law unchanged: core (Rapier ok, no DOM/three) ← game ← server;
  client may import anything. Vitest is the tripwire.
- ONE match implementation: server/room.ts; solo = loopback room-of-one.
- Determinism: seeded rng only; sync-shots-not-surfaces (shot events
  carry topping/traverse/tiltNotch/tensionClicks; all clients simulate
  identical arcs).
- Scoring truth = REST position; Room's settled ledger is the census all
  requirement rows count from; checks ride the wire (client has no
  ledger).
- Orders are MUTABLE rows (Patron amends in place) — never share row
  objects between deals.
- Judgment renders the MOMENT all rows are met (won/refused) or at clock
  death (hungry); the ending order message carries the judgment and must
  stay the last order message.
- Design calls not to re-litigate: mistakes execute; no prediction UI
  (hint DEFERRED by visionary); aim is machine state; limes never
  ordered; power meter does NOT port (arm+winch are the diegetic meter);
  spotter informal; +15° ladder KEPT until tiers give data.

## 4. File map

- src/core/: constants, rng (+RandomFn), baker, ballistics
  (launchVelocity(traverse, clicks, tiltDeg=0); LAUNCH_ELEVATION_DEG 55),
  projectiles, arena (zones: ZoneId "cake"|"peak", PEAK_HALF 2.25,
  isInZone; cake AABB CAKE_POS/CAKE_HALF).
- src/game/: catapult (CatapultState + tiltNotch; tickMachine(state,
  crankTicks, intent, screwTicks=0); TILT_DEG_PER_NOTCH 15,
  TILT_MAX_NOTCH 3, SCREW_TICKS_PER_NOTCH 30), judgment, order, patron,
  protocol (+tests for all).
- src/server/: room.ts (THE match: machine+screw, ledger, judge, patron
  cadence, ORDER_SECONDS 90, PATRON_LOOK_EVERY 720), main.ts (Node ws
  entry 5175, serves dist/).
- src/client/: main.ts (machine group = yaw; tiltFrame child pivots at
  rear (0,0,0.7); screwGroup planted child of machine; grip semantics
  heldTarget/grip; arcGlyph()), net.ts.
- project/plans/: 01 greybox (done), 02 two-tabs (done), 03 patron slice
  (SUCCESS + notes), 04 high-arc (done incl. ladder decision).
- project/research/: 01 port-gap analysis (the roadmap), 02 vision
  alignment (lore, backlog, deferred hint).

## 5. How to run, test, verify

- npm run dev → 5174 loopback solo; npm run server → 5175 (RESTART after
  pulling protocol changes; it serves dist/ so `npm run build` first if
  testing two tabs via 5175).
- npm test (80), npx tsc --noEmit, npm run build.
- __game handle: send/getMachine (incl. tiltNotch)/getOrder/getChecks/
  getJudgment/getLastPatron/getTarget/getCarrying/setCarrying/getGhosts/
  setDebugInput/setLook; real KeyboardEvent dispatch works (used to
  verify grip semantics).
- Preview quirks: tab can go visibilityState hidden after reload — rAF
  freezes the loopback sim; restart the preview server. Poll crank at
  ~10ms or it overshoots clicks.
- Known: 6 clicks @ notch 0 lands dead center (z≈-28.95); 8 clicks @
  notch 1 (70°) lands on the cake; notch 2 ≈ 4.5m in front; notch 3
  fires gently backwards (comedy, by design).

## 6. Open items and decisions

Decided this session (do not reopen casually): roadmap High Arc → Test
Cake (tiers+crown) → frosting+census, friend test parallel ops; limes =
decoy; crown-as-uppermost replaces dead-center (peak zone is interim
stand-in); trajectory hint deferred; +15° ladder kept until tier data;
spotter informal; pennant lives by the machine.

Open:
- Test Cake slice (next): three tiers replace the box cake; crown
  requirement (cherry as uppermost topping) replaces count-in-zone peak
  stand-in and retires it from the Giant's demand; standing orders +
  Giant demand retuned; settle ladder gains tier targets (notch 1 is the
  tier-clearing shot); arena.ts geometry + colliders + isOnCake per tier
  + client visuals; plan doc to write (plans/05).
- Then frosting + sprinkles + census (research/01 §F; 2D judgment.ts
  measurement bodies port then).
- Friend test: tunnel 5175 (cloudflared/tailscale), any time.
- Patron difficulty watch items (plans/03): pre-satisfiable demands;
  stacking (12s looks × −4s grumbles ≈ ~66s effective order); knobs
  listed there.
- Backlog (research/02): overstretch/repair, scale pass, spotter optics.
- Elevation ladder re-spacing options recorded in plans/04 for the
  post-tiers revisit.

## 7. Next session focus

Write plans/05 (Test Cake) and build it: three-tier cake geometry in
core/arena.ts (shared by client visuals + Room physics + tests), crown
requirement kind in game/judgment.ts (cherry as uppermost settled topping
on the cake — physicalized version of the 2D countCrown support-chain),
retire the peak-zone stand-in (Giant demands the crown instead), re-pin
the settle ladder per tier × notch, playtest. Keep the +15° ladder;
collect tier shot data for the spacing revisit.

## 8. Recommended reading order

1. This handoff.
2. CLAUDE.md — law, commands.
3. project/research/01-port-gap-analysis.md — the roadmap and port map.
4. project/plans/03-patron-slice.md — slice 2 record, playtest notes,
   tuning knobs.
5. project/plans/04-high-arc.md — screw design, fixes, ladder decision.
6. project/research/02-vision-alignment.md — lore, deferred hint, backlog.
7. src/server/room.ts + src/game/protocol.ts — match + wire truth.
8. src/game/judgment.ts, order.ts, patron.ts — the rules layer built this
   session.
9. src/core/arena.ts + src/core/ballistics.ts — what the Test Cake slice
   will change.
