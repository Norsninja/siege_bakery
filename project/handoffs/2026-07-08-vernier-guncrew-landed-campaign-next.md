# Handoff — 2026-07-08 — VERNIER + GUN CREW LANDED; REVIEW, THEN PLANS/13 (CAMPAIGN)

## 1. Snapshot

Two arcs landed and feel-tested same-day. (1) THE ELEVATION VERNIER:
2.5° × 18 notches at 0.15s/notch (studied in research/13, blessed, built,
re-pinned) — and its envelope consequence is a DESIGN FACT: fine tilt
bridges the moat; two towns reach 100% of the census at ≤8 clicks;
TOWN_POTENTIAL re-pinned. (2) THE GUN CREW: crew posts replaced
crosshair grips + E-chords entirely (plans/14) — gunner post (left rear,
A/D wheel, W/S screw, F fire), winch post (right flank, Space/W wind,
S UNWIND — a new game law, signed crank on the wire), bucket unchanged.
Visionary played two feel-test rounds; verdicts built same day (unwind,
single left gunner flank, translucent green post circles). 263 tests
green, both tsc legs, every slice live-verified. HEAD 2c1a081.
NEXT SESSION: review the work together; if satisfied → plans/13, the
campaign (full plan, discussed before building).

## 2. What changed this session

- VERNIER (eb7a49e): TILT_DEG_PER_NOTCH 15→2.5, TILT_MAX_NOTCH 3→18,
  SCREW_SECONDS_PER_NOTCH 0.5→0.15 (game/catapult.ts). Study promoted to
  research/13-tilt-vernier-study.mts (STANDING RE-PIN TOOL; measured
  record in header: 0.4–1.3m per notch in the money band, 3–7 notches
  per click gap, 27 on-cake combos, click-7 n0–3 = four T3-top PLACE
  radii, n14 = own-plinth gag, n15+ backwards). Deliberate re-pins: WIN
  path screw(1)→screw(1,6) (15° = 6×2.5° exactly — identical physics),
  clamp test rides TILT_MAX_NOTCH, hud/net-handler strings, ballistics
  comment truth.
- ENVELOPE RE-RUN (same commit): research/11's tilt ladder was hardcoded
  0–3 (the H-D5 trap) — now rides TILT_MAX_NOTCH; RE-RUN record in its
  header. One town 55.7→81.2% (≤9), 90.3% (≤10 — "click 10 adds zero
  coverage" was a 15°-ladder artifact, AMENDED in catapult.ts; toll
  geometry stands). UNION 100.0% AT ≤8 — permanent gap GONE (moat
  bridged: mid-wall hits 12→57, ledge slots at every azimuth). Contested
  overlap 62.9% (≤9). TOWN_POTENTIAL re-pinned [0, 0.9, 1.0, 1.0, 1.0]
  (≤10 shipped envelope; [3]/[4] by superset). Asks UNCHANGED (Option B:
  TOWN_ASK_POTENTIAL authored). Towns rationale shifts from reach
  ceiling to throughput + contested ground — plans/13 starts from THESE
  numbers.
- 80% QUESTION (6ac9c55, measured, tmp script deleted after): greedy
  under the vernier envelope: 80% absolute = 48 one-town / 39 two-town
  idealized shots. Real translation (15–18s solo shot cycle, ~1.5×
  human aim): impossible solo, heroic edge for pipelined 4-player.
  DECIDED: curve is GOOD, do not fix — 80% is the
  four-friends-playing-well number. Pass fell to ~8–9 idealized shots
  (richer menu, less overlap waste) — per-rung asks author against the
  NEW curves, not tuning.ts's old header arithmetic.
- GAUGE SPLIT (6ac9c55): full ladder only where you dial; machine line
  compact `arc +X° (n/18)`; clunk flash glyphless.
- GUN CREW (87d4df1, plans/14): posts replace grips. client/posts.ts
  (pure, pinned): POST_SPOTS table, postAnchors (facing-rotated),
  postAt (per-spot radius, deepest claims), postOp. main.ts: E
  precedence (step off > bucket/shelf crosshair > man zone), F-edge
  lever with dry-release flash, camera gentle-snap down throw line on
  manning gunner, auto-unman on zone exit (covers carry-home/deal),
  manned = feet planted. hud.ts: post panels (gunner panel = the
  ladder's home), invites, prompt redirects for wheel/screw/winch/lever.
  input.ts: F edge added; grip law (updateGrip/deriveOp/machineEngaged)
  KEPT SUPERSEDED for rollback. Wire untouched in this commit.
- UNWIND + FLANKS (c7a072c): crank SIGNED (-1|0|1) through
  MachineIntent/HeldOp/op msg/roster validation — the screw's pattern:
  same held seconds per click both directions, reversal restarts,
  slack/max clacks, uncrankTension in catapult.ts, mergeIntents STALLS
  winder vs unwinder (pinned unit + Room). Winch keys: Space or W wind,
  S unwind (post grammar: W/S = more/less everywhere; Ctrl REJECTED —
  browser owns Ctrl+W; chords stay dead). crankTicks now signed
  (HUD shows ±%; scene arm eases during unwind for free).
- POST CIRCLES (2c1a081): flat translucent green CircleGeometry on the
  ground (opacity 0.35, depthWrite off) — opaque flagstones read as
  machine parts. Gunner spot LEFT REAR ONLY (visionary round 2: right
  rear stares into the draw spool); pinned as refusal.

## 3. Architecture and invariants

All prior laws hold. New/refined this session:
- THE VERNIER TABLE: 2.5° × 18 × 0.15s. research/13 is its standing
  re-pin tool; any tilt/launch/arena change re-runs it AND research/11.
- ONE BODY, ONE JOB AT A TIME — the co-op invariant, enforced by floor
  space (posts in different places), never by input awkwardness. The
  gunner cannot crank; the winch cannot aim.
- CAMERA TABOO RE-SCOPED: the reticle never aims (aim stays countable
  machine state — clicks/notches/degrees); camera POSITION is free;
  sightlines are welcome.
- POST_SPOTS (posts.ts) is the one spot table: zones, HUD invites, and
  scene circles all derive from it.
- THE UNWIND LAW: crank is signed; committed work = TIME symmetric both
  directions; merge stalls opposites (the honest ratchet). Dry-release
  full reset survives as the comedy alternative.
- W/S IS MORE/LESS at every post (elevation at gunner, tension at
  winch). No Ctrl anywhere (browser). No chords, ever.
- The pantry loop is sacred: bucket/shelves stay walk-up crosshair
  interactions; posts are for OPERATING only.
- interactions.ts lever branch is unreachable while the gun-crew
  experiment runs (main filters edge targets); rollback re-opens it.
- TOWN_POTENTIAL [0, 0.9, 1.0, 1.0, 1.0] at the ≤10 shipped envelope;
  honesty-only, never dealt; TOWN_ASK_POTENTIAL authored and unchanged.

## 4. File map (delta over prior handoffs)

- src/client/posts.ts — NEW: Post, POST_SPOTS, postAnchors, postAt,
  postOp. posts.test.ts — its pins (flank/spool/dead-band, stall keys).
- src/client/input.ts — + takeEdgeF; grip law superseded-kept (delete
  with tests, on purpose, if posts stick permanently).
- src/client/main.ts — posts wiring (manned/nearPostShown, E precedence,
  F lever, camera snap, auto-unman); __game + getManned/getNearPost;
  arcGlyph import gone.
- src/client/hud.ts — arcGlyph grouped 19-pos (gunner panel only),
  machine line compact arc + signed crank %, post panels/invites,
  prompt redirects; HudView + manned/nearPost.
- src/client/scene.ts — post circles (facing-only sibling group — rig
  root swings with traverse, footing must not).
- src/game/catapult.ts — vernier constants; uncrankTension; signed
  crank in MachineIntent/tickMachine; TENSION_MAX_CLICKS comment
  amended (click-10 coverage).
- src/game/protocol.ts — op/HeldOp crank signed; IDLE_OP; mergeIntents
  sums+signs crank.
- src/server/roster.ts — crank validated like turn/screw.
- src/game/tuning.ts — TOWN_POTENTIAL re-pinned + comment.
- project/research/13-tilt-vernier-study.mts — NEW standing tool.
- project/research/11-two-town-union.mts — ladder rides TILT_MAX_NOTCH;
  VERNIER AMENDMENT + RE-RUN record; old sanity pin scoped historic.
- project/plans/14-gun-crew-posts.md — the experiment record: discussion,
  shape, both feel-test rounds, rollback provision, if-it-sticks list.
- Memory (auto): game-smoke-driver-notes gained the occluded-tab lesson
  (rAF suspends while "visible"; resize can revive, else respawn
  preview; verify pacing by tick math + state polling, never wall clock).

## 5. How to run, test, verify

npm run check (263 green at HEAD). Dev preview 5174; visionary's server
5175 — never kill. PREVIEW TAB: an occluded tab suspends/throttles rAF
(sim crawls ~1 tick/frame or freezes; setTimeout stretches). Cures:
preview_resize sometimes, preview_stop+start reliably. Drive smokes by
STATE POLLING, not wall clock. Posts drive pattern: walk via
setDebugInput (MUST setDebugInput(null) before E — debugInput bypasses
feet-planting and auto-unmans), man via synthetic
KeyboardEvent(window, code KeyE/KeyF/Space/KeyW/KeyS), read
__game.getManned()/getNearPost().

## 6. Open items and decisions

DECIDED (do not re-litigate):
- Vernier 2.5°×18×0.15s. Full ladder only where you dial.
- 80% coverage curve is GOOD as measured — the 4-player heroic number;
  no rebalance. Plans/13 per-rung asks author against research/11
  RE-RUN + the greedy milestones in commit 6ac9c55's message.
- Gun-crew posts KEPT after two feel rounds. Gunner = left rear only.
  Unwind = S at winch, held work symmetric. Green translucent circles.
- Sequence: REVIEW → plans/13 (campaign) → friend test (runbook
  plans/12, now includes gun crew) → build campaign.

OPEN:
- Plans/13 campaign: full plan per prior handoff §6 shape (DessertSpec
  tier arrays as deal data via rung id, colliders rebuilt at redeal,
  census derived from spec — 661 generalizes, per-rung authored asks,
  rungs 1..4 = tiers, cupcake = spec row, shop/purse as between-rungs
  economy) — NOW FOUNDED ON the new envelope numbers (union 100%,
  contested 63%, towns = throughput not reach).
- If posts stick permanently: delete superseded grip law + its tests on
  purpose; ghost stances at posts; gunner panel → real instrument UI;
  mouse-wheel screw notches (flagged tension with committed-work law).
- Unwind feel: 0.75s/click down — one constant if it reads sluggish.
- Audit tranche C (research/12) still deferred post-friend-test.
- Standing no-owner items: wind plan; Bite/integrity re-pin obligation.
- research/06 still carries the stale 4–8 click ladder (header warns);
  research/11 is the live envelope tool.
- CLAUDE.md current-state paragraph rewritten this session (below).

## 7. Next session focus

1. REVIEW: visionary walks the vernier + gun crew build (this handoff
   §2, plans/14, the five commit messages 6e7cd4a..2c1a081). Fix
   anything the review surfaces.
2. If satisfied → PLANS/13 THE CAMPAIGN: full plan, discussed with the
   visionary before any build. Foundation: prior handoff's DECIDED
   shape + research/11 RE-RUN numbers + the 80%/pass greedy curves.
3. Then the two-PC friend test (plans/12), then build the campaign.

## 8. Recommended reading order

1. This handoff.
2. CLAUDE.md — current-state paragraph (rewritten this session).
3. project/plans/14-gun-crew-posts.md — the interaction model + both
   feel rounds + rollback provision.
4. git log 6e7cd4a..HEAD — five commits, each with its live evidence.
5. project/research/13-tilt-vernier-study.mts header +
   research/11-two-town-union.mts VERNIER AMENDMENT/RE-RUN — the
   envelope facts plans/13 builds on.
6. src/client/posts.ts (the post laws) + src/game/catapult.ts (vernier
   constants, signed crank).
7. project/plans/09 §2/§4 + game/tuning.ts — campaign rungs sketch +
   ask tables (plans/13's other foundation).
8. project/plans/12-friend-test-runbook.md — unchanged, waiting.
