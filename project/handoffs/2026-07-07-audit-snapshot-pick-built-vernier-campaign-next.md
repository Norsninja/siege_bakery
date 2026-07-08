# Handoff — 2026-07-07 (late night) — AUDIT LANDED; SNAPSHOT + PICK BUILT; VERNIER + CAMPAIGN PLAN NEXT

## 1. Snapshot

Big session. The holistic audit (research/12, six verified auditors) ran and
its tranches A+B landed same-day. The friend test's remaining gaps closed
under live playtest: the dessert-report snapshot (visionary amendment: photo
inset, not orbit), landing-ring cleanup at the deal, dormant-rig scenery
truth, town identity colors, and POSITION-AS-PICK — town switching finally
works in-game with no console (this was a silent friend-test blocker: no
client code ever sent pickTown). 249 tests green, both tsc legs, every
change live-verified in the preview. HEAD 92ec161. NEXT SESSION (visionary's
word, do both): (1) the elevation vernier — fine tilt notches; (2) plans/13,
the campaign rung ladder (DessertSpec) as a full plan.

## 2. What changed this session

- LINGER retune 600→1080 ticks (e6827fc): measured — a frame-perfect
  scripted switch run needs ~9.8s; 10s made dawdling optimal. 18s gives a
  realistic run ~6s slack (verified live, un-staged + 1s reaction). Three
  server tests had hardcoded the old linger's consequences; now ride the
  symbol.
- TUNNEL (0b81f22): pickWsUrl in client/net.ts — ?join wins; BUILT pages
  auto-join own origin wss-on-https (old literal-5175+ws:// check silently
  dropped tunneled friends into loopback solo). 5 pins. cloudflared.exe
  vendored at tools/ (gitignored, re-fetch cmd in plans/12). Dress-rehearsed
  live: real browser + Node-over-tunnel in one room ("2 in the bakery").
  Runbook plans/12. launch.json gains room-rehearsal (autoPort).
- AUDIT (research/12, commit 7f8d0fa): six parallel auditors (4 layers +
  goals-vs-state + knowledge hygiene), all findings code-verified. No
  CRITICALs. Two HIGHs, both fixed in tranche A.
- Tranche A (55e91e6, 4bf4c43, cd56134, d9a69bb, 5a88d7c): A1 dead-link
  pre-welcome hang now speaks (hud message; netStatus was only worded by
  the render loop which starts after the welcome await); A2 Math.hypot out
  of freeze/wake gates → slowerThan() squared-compare (cross-engine
  exactness; hypot not exactly rounded; freeze mutates body type = world
  state); A3 lingerVerdict frozen at order end, served in mid-banner
  welcomes (re-judging live state could contradict the room's banner);
  A4 town ack grows machines[] via shared growMachines (≤4-tick wrong-rig
  window killed; state.ts comment now true); A5 vite manualChunks (function
  form — rolldown) splits three/rapier: app changes re-ship 18KB gzip.
- Tranche B (b58c081): plans/11 five in-file amendment notes (open front §3/
  §9/§10, Option B supersedes §6 re-pin sentence, §11 friend-test RESOLVED);
  judgment.ts frost-coverage comment names TOWN_ASK_POTENTIAL (was the
  measured table — the exact Option B conflation); protocol.ts + step-6
  comment linger literals fixed; research/06 ENVELOPE WARNING (its click
  ladder is pre-bump; re-running as-is re-pins BACKWARDS); research/10/11
  post-split notes; ci.yml runs npm run check (headless leg was missing);
  .gitignore narrowed to tools/cloudflared.exe; setGrainCount removed
  (tombstone comment in main.ts); GRAVITY/IDLE_INPUT/IDLE_INTENT/IDLE_OP
  frozen; CLAUDE.md current-state rewritten.
- SNAPSHOT (c57de29): the dessert report, snapshot form (visionary reshaped
  plans/09 §1's orbit; closes audit V-1). client/snapshot.ts: tripod at
  (10,12,CAKE_Z) looking at cake waist (Giant's-eye, top+sides, azimuth-
  neutral), 720x540 render target, one shutter on the banner-show edge,
  data-URL developed (row flip). Framed inset top-right (#snapshot in
  index.html, polaroid style), caption = hud.ts snapshotCaption (pure,
  4 pins, Patron's voice). Photo up whole linger, down at deal. INSET NOT
  CUT — player keeps control (switch window).
- RINGS + FRAME (62093ff, playtest): landing rings now clear at the fresh
  deal (clearLandingRings in NetFx fresh branch; rings are annotations, not
  litter — floor litter law untouched); inset resized to min(27vw,48vh)
  ≈10% screen area (visionary's call), film 720x540.
- SCENERY (ffd8b04, playtest): dormant rig was cockeyed + phantom cherry —
  root cause: main render loop skips rigs with no machine state, so a
  dormant town's rig NEVER got update(); facing and dish-ball visibility
  lived only there. Constructor now bakes facing + hides ball. TOWN_COLORS
  exported [red, blue]; town-1 pennant flies BLUE (first fort identity).
- PICK (92ec161, playtest — the big one): townToPick in gates.ts (pure):
  during the linger, clearly inside (CLOSE_MARGIN, the latch's own
  threshold) a fort that isn't yours → client sends pickTown. main.ts sends
  on crossing edge (pickSent guard). Server unchanged as authority. WITH IT:
  S-MED-2 landed — roster.setTown resets held/leverPulls/loads on honored
  change (hands were teleporting to the new machine). Pins: 5 townToPick
  position pins; Room-level hands pin (held crank ground town 0 to full
  tension, pick landed, town 1 untouched). Live: town stayed 0 through
  midfield AND doorway band, flipped at clearly-inside, deal left baker in
  town 1, no carry-home.

## 3. Architecture and invariants

All prior laws hold. New/refined this session:
- pickWsUrl (net.ts) is the transport-pick law: ?join verbatim; built page
  joins own origin protocol-matched; dev page loopback. Pinned.
- slowerThan (projectiles.ts) is the exactness law at the freeze gates:
  mul/add-only squared compares wherever a comparison mutates world state.
  No Math.hypot in replica-agreeing decisions, anywhere.
- THE FROZEN VERDICT: Room.lingerVerdict captured at ended/won, served in
  every mid-banner welcome, cleared at redeal. judgeNow() is for capture,
  never for welcomes.
- POSITION IS THE PICK: townToPick + gates CLOSE_MARGIN share one "clearly
  inside" meaning. Picks are linger-only, activeTowns-bounded, server-
  refused otherwise. An honored pick OPENS THE PICKER'S HANDS (roster).
- THE SHUTTER: one photo per order end, taken on the banner-show edge
  (before linger play, matching the frozen verdict), inset never a cut.
- Fresh deal clears: paint, cake solids, stuck, LANDING RINGS (annotations
  die with the order). Floor litter (bodies) persists by law.
- TOWN_COLORS (scene.ts) is the one town-identity table; future color-by-
  town (plans/11 §9 seam) must read it.
- Dormant scenery must not lie: rig constructors bake facing + empty dish.
- growMachines (net-handlers) is the one machines[] grow rule; every writer
  that moves yourTown or lands a machine calls it first.

## 4. File map (delta over prior handoffs)

- src/client/net.ts — + pickWsUrl. net.test.ts — its 5 pins.
- src/client/snapshot.ts — NEW: DessertSnapshot (tripod, shutter, develop).
- src/client/hud.ts — + snapshotCaption (pure; pinned in hud.test.ts).
- src/client/gates.ts — + townToPick. gates.test.ts — + 5 position pins.
- src/client/scene.ts — + TOWN_COLORS, rig constructor honesty, blue flag.
- src/client/shots-view.ts — + clearLandingMarkers.
- src/client/net-handlers.ts — + growMachines, clearLandingRings in NetFx +
  fresh branch; town ack grows.
- src/client/main.ts — + snapshot wiring (show/hide/caption), pickSent edge,
  dead-link hud message, setGrainCount removed.
- src/core/projectiles.ts — slowerThan; hypot gone from gates/lastSpeed.
- src/core/constants.ts, core/baker.ts, game/catapult.ts, game/protocol.ts —
  frozen constants; comment fixes.
- src/server/room.ts — lingerVerdict field + 3 sites. roster.ts — setTown
  hands reset.
- src/server/room.test.ts — + frozen-verdict pin, + hands pin; comments.
- index.html — #snapshot polaroid frame (min(27vw,48vh)).
- vite.config.ts — manualChunks (function form).
- .github/workflows/ci.yml — npm run check.
- project/research/12-holistic-audit.md — the audit record + fix ledger.
- project/plans/12-friend-test-runbook.md — + dessert report in scope,
  photo on the watch list.
- Memory (auto): game-smoke-driver-notes gained gates-era driving + the
  preview-tab lessons (never navigate preview off-origin; PROD pages have
  no __game — prove joins from the server log).

## 5. How to run, test, verify

npm run check (249 green at HEAD). Dev preview 5174; visionary's server
5175 — never kill. Live-verify pattern: detached __probe watcher armed
BEFORE order end (orders burn ~300s; linger 1080 ticks = 18s), poll with
~25s evals wrapped in try/catch (page reloads throw inside pollers).
PREVIEW TAB GOTCHAS (hard-won today): a hidden preview tab pauses rAF —
the sim FREEZES (ticksLeft stuck = tab hidden; preview_stop + preview_start
respawns a visible tab). Never navigate the preview tab off its origin.
HMR mid-multi-edit can reload the page and kill armed watchers — arm AFTER
npm run check passes. Machine fire recipe + doorway waypoints: in memory
game-smoke-driver-notes.

## 6. Open items and decisions

DECIDED (do not re-litigate):
- Draw (tension clicks) stays COARSE — the click economy is load-bearing
  (committed work, toll geometry, potential sweeps). Elevation becomes the
  fine control (visionary agreed 2026-07-07).
- Elevation vernier shape: TILT_DEG_PER_NOTCH 15→~2.5°, notch count keeps
  45° total, SCREW_SECONDS_PER_NOTCH ~0.15s (same total held work), wire
  stays int notches, clunk-per-notch survives. HUD arc gauge needs rework
  (4 boxes can't show ~18 positions). Land BEFORE the friend test.
- Campaign = full plan (plans/13): DessertSpec tier arrays as deal data via
  rung id into a shared authored table; cake colliders rebuild at redeal;
  census derives from spec (661 pin generalizes to spec-derived length);
  per-rung authored asks (plans/09 §4 already commands this); rung 1..4 =
  1..4 tiers; cupcake = another spec row; sculpted desserts a later chapter.
  Shop/purse (fork 2) folds INTO the campaign plan as the between-rungs
  economy.
- Friend-test scope FINAL: dev toggle + cloudflared + dessert-report
  snapshot + position-as-pick. Sequence: vernier → friend test → campaign.
- Inset ≈10% screen area; town 1 flies blue.

OPEN:
- Vernier prerequisites: run a headless tilt-range study (tmp-*.mts, extend
  research/03/06 patterns) to pin the vernier table; re-run the potential
  envelope after (research/06 tool needs its click envelope fixed — audit
  H-D5 note is in its header); WIN-path + step-6 tests use screw(1) notch
  counts — re-pin deliberately.
- Audit tranche C (research/12 fix plan) still deferred post-friend-test:
  S-MED-3 welcome member roster, S-LOW-4 parse/apply split, K-MED-2 wake
  gate, K-MED-3 tierOf wall-grip truth, K-LOW-4 tripwire nets, K-LOW-5
  TOWNS geometry pins, C-MED-3 lingerTick() extraction, C-LOW-4..7, G-MED-2
  PASS_SCORE→tuning, G-LOW-4..7, NIT sweeps.
- Standing no-owner items: wind plan (pennant static; re-pins economy);
  Bite/integrity=1 re-pin obligation (recorded in CLAUDE.md).
- Dormant-fort pick refusal is silent (carry-home returns the runner at the
  deal) — legible after fork 2's unlock moment.
- Delight caption seen only in pins, not yet live (all verified orders were
  losses); will appear in play.

## 7. Next session focus

1. ELEVATION VERNIER: tilt study (headless, real ballistics) → pick
   TILT_DEG_PER_NOTCH/notch count/screw seconds → implement + HUD gauge
   rework → re-pin affected tests → live feel pass. Half-session.
2. PLANS/13 THE CAMPAIGN: full plan per §6 DECIDED shape — DessertSpec,
   rung table, census generalization, per-rung asks + measurement plan,
   shop/purse integration, progression rules (win advances rung). Discuss
   with visionary before any build.
3. Then the two-PC friend test (runbook plans/12), then build the campaign.

## 8. Recommended reading order

1. This handoff.
2. CLAUDE.md — current-state paragraph (rewritten this session).
3. project/research/12-holistic-audit.md — the audit record; §Fix plan for
   what landed (A+B) and what waits (C).
4. git log 1be7650..HEAD — SNAPSHOT/RINGS/SCENERY/PICK commit messages
   (each carries its lessons + live evidence).
5. src/game/catapult.ts (tilt/tension constants + laws) and
   src/core/ballistics.ts (launchVelocity: 55° base + tilt) — the vernier's
   subject.
6. project/plans/09-direction-and-topping-physics.md §2/§4 — campaign rungs
   sketch + rung-authored asks (plans/13's foundation).
7. src/client/gates.ts (townToPick + the pick law), src/client/snapshot.ts.
8. project/plans/12-friend-test-runbook.md — the test day procedure.
