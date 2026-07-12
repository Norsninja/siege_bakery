# Handoff — 2026-07-12 (twentieth session) — THE FEEDBACK PAIR + THE CLOCK RELIEF, ENTRIES 4 AND 3.5 STRUCK

## 1. Snapshot

Three commits, all pushed, tip 6ccf2f7. 488 tests, both tsc legs,
`npm run check` green. Entry 4 (THE FEEDBACK PAIR — items 15 + 16)
and entry 3.5 (THE CLOCK RELIEF — item 26) both built in one session,
after a two-terminal design review (this session's discussion aligned
with the planning Chronus; visionary blessed the rings recolor and
the go). Working tree carries UNCOMMITTED visionary Blender work (see
§6 — do not touch, do not commit on his behalf without his word).
Next session (visionary's words): entry 5 — THE TRAINING LOBBY + THE
OPENING PARADE (item 25) — review first, then DISCUSS before building.

## 2. What changed this session

- 268eaa4 THE FEEDBACK PAIR:
  - src/game/cast.ts NEW — THE PROMOTION: castIndexForRung + SPECIES
    roster moved whole from client/ (client/cast.ts keeps visuals,
    derives CAST from game/'s SPECIES — alignment pinned). Plus
    patronAtMark(phase, rung, verdictPending) — the ONE predicate
    both worlds poll for the giant collider.
  - src/core/patron-collider.ts NEW — plans/21 §0's first named core
    exception: TABLE_POS/TABLE_YAW (moved from client/cast.ts, which
    re-exports), PatronCapsule data table (ogre authored — exported
    from col_* markers in ogre-rig.blend), capsuleWorldCenter,
    PatronColliderRig (reconcile per tick; species/has seams).
  - core/projectiles.ts: Impact.otherHandle NEW (the pair's other
    collider handle — owner interprets by set membership);
    Settled.grain NEW. core/constants.ts: GROUP_PATRON +
    PATRON_COLLISION_GROUPS; shots + grains filter PATRON now.
  - room.ts: patronRig reconciled at top of tick() from
    patronAtMark(run.phase, run.rung, lingerVerdict !== null).
    main.ts: identical reconcile in the fixed tick before
    shotsView.step; port wiring (isGiantCollider, onGiantHit).
  - shots-view.ts: verdict rings (color = verdict channel; markers
    now {mesh, bodyHandle}); NEW ev.settled loop (at-rest verdict —
    ring repositions + recolors, only if bodyHandle still owns the
    town ring; grains skipped); giant branch (BONK! word own-town,
    patronBonk sound, onGiantHit for every town, no m/s flash);
    paint verdict at impact via onPaintImpact's returned painted
    count (frosting-view.paintImpact now returns it).
  - patron-body.ts: flinch() — additive decaying shudder (head Y
    "no no no" + trunk Z), never yanks poses; `flinching` seam.
  - patron-table.ts: SCOLD_LINES (7 species) + scoldLine() — the
    first patron voice; splatAt() paint dabs riding the body group
    (frame-budgeted, disposed on snap); flinch() delegation.
  - sfx.ts: patronBonk key + row; make-sfx.mjs: patronBonk recipe
    (public/audio/sfx/patron-bonk.wav NEW, ~14 KB).
  - project/blender/collider-scripts/ NEW: export-patron-colliders.py
    (marker convention + blender→game axis map + --scale) and
    author-ogre-colliders.py (the ogre's four markers; idempotent).
    ogre-rig.blend modified (markers saved in).
  - __game.getPatronCollider() → {species}.
- 4b273d1 DOCS: items 15/16 marked BUILT (rulings of record), item 25
  cross-note (entry 5 razes the interim lobby branch), plans/21 entry
  4 struck, fleet lane gains SIX SPECIES' COLLIDER MARKERS.
- 6ccf2f7 THE CLOCK RELIEF: CREW_CLOCK [0,1.25,1,1,1] (tuning.ts)
  applied in OrderFlow.freshOrder (ticksLeft = round(seconds ×
  factor × 60); CREW_LABOR's clamp); rung 1 row 150→180
  (campaign.ts); research/20-clock-relief-study.md NEW (derivation,
  calibrated on the visionary's measured miss-by-~5s). Re-pins:
  order-flow.test (stretch/zero-drift/clamps/180), room.test WIN
  path (cupcake deal prices the lone hero's clock), patron-mark
  lifecycle test polls states not tick counts.

## 3. Architecture and invariants (new this session)

- ONE COLLIDER, TWO WORLDS: every client simulates every broadcast
  shot locally; a capsule on one side only forks the TRAJECTORY.
  Any sim-affecting geometry must build identically in the Room's
  world AND each client's, from broadcast-derivable state. The
  patron rig does this by RECONCILE-PER-TICK against patronAtMark —
  poll, never edges (late joiners and seam jumps fall out free).
- patronAtMark: running+no-verdict → rung's species; verdict/runover
  → null (walk theatre plays with capsules DOWN — ruled residue);
  lobby/countdown → rung 1's species (INTERIM — item 25 razes; the
  branch is deliberately the function's last lines). Accepted
  residues on record (item 16): flip-edge round-trip races (dessert
  swap's class), post-loss lobby visibly holds next-up species while
  both worlds agree on rung 1's shape.
- Impact.otherHandle: plain number, owner-interpreted (rig.has()).
  Chosen over analytic near-capsule oracle (ankle ricochets misread).
- THE VERDICT CHANNEL (rings recolor, visionary's explicit yes):
  color = verdict everywhere (green on cake, red off), energy keeps
  word choice + ring size. Paint verdicts AT IMPACT — oracle is the
  painted-sample count (the Room's own `painted > 0` truth; isOnCake
  lies red on wall splats); stale paint = red (scored nothing).
  Solids: NEUTRAL ring at impact, color + reposition AT REST
  (isOnCake at rest pos); ring recolors only while its bodyHandle
  still owns the town's marker. Knocked solids re-settle silently
  and keep the landing verdict — ring is the LANDING record, the
  checklist stays the truth surface.
- GROUP_PATRON: membership PATRON, filter SHOT|GRAIN. Bakers
  deliberately excluded (item 23's bop owns proximity feel).
- Quiet-grain law extends: grains bounce off the giant physically
  but never scold/flinch/word; grain settles never touch rings.
- COLLIDERS SHIP AT RULED HEIGHT: export --scale = the species'
  client visualScale (ogre rig is ~21 m, renders 36 — 36/21 baked).
  Marker convention: col_<part> empties, scale.x = radius, scale.z =
  halfHeight, vertical capsules, blender(bx,by,bz)→game(bx,bz,−by).
- THE CLOCK PRICES HANDS (item 26): CREW_CLOCK at the deal, rows
  VERBATIM (anchor law intact), duo zero-drift. THE ONE DIAL: a
  hot/cold solo playtest moves CREW_CLOCK[1] (or rung 1's row),
  nothing else (research/20 restates the math for any move).
- The scold is the FIRST PATRON VOICE: SCOLD_LINES keyed by
  game/cast species strings; the prize session EXTENDS it. Lines are
  session placeholders — the visionary's voice pass owns the words.

## 4. File map (delta)

- src/game/cast.ts — SPECIES, castIndexForRung, speciesForRung,
  patronAtMark. cast.test.ts — mapping pins moved here + mark pins.
- src/core/patron-collider.ts — mark, capsule table, rig.
  patron-collider.test.ts — table audits (3–6 capsules, ruled-height
  bounds), reconcile behavior, bounce + two-worlds determinism.
- src/client/cast.ts — visual half only (VISUAL_SCALE, line slots,
  stance); re-exports mapping + mark.
- src/client/shots-view.ts — verdict constants, marker records,
  giant branch, settled loop. shots-view.test.ts — verdict + BONK
  describes (28+ tests).
- src/client/patron-table.ts — scoldLine, splatAt, flinch, splat
  aging. patron-body.ts — flinch machinery.
- scripts/make-sfx.mjs — +patronBonk. project/blender/
  collider-scripts/ — the authoring/export recipes.
- src/game/tuning.ts — CREW_CLOCK. src/game/order-flow.ts —
  freshOrder applies it. src/game/campaign.ts — rung 1 = 180.
- project/research/20-clock-relief-study.md — the derivation.

## 5. How to run, test, verify

npm run check (488 green at 6ccf2f7). Smoke recipes: memory
game-smoke-driver-notes (+ twentieth-session additions: lobby cake
is cake-1 — tension 6 tilt 0 lands its top, tension 8 overshoots;
mirror-aim lobs from both towns kiss mid-air; Blender GUI may be
RUNNING AND DIRTY on his side — drive the Steam binary headless:
"/c/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe"
--background <file> --python <script>; MCP *_for_cli tools fail,
BLENDER_PATH unset). __game.getPatronCollider() → collider species;
getPatronBody().flinching → shake-off. Giant bonk aim search: column
x 21, z −30, r ≤ 9.5, y 0–36 from town 0. Collider export:
blender --background <species>-rig.blend --python
project/blender/collider-scripts/export-patron-colliders.py --
--scale <visualScale>.

## 6. Open items and decisions

DECIDED (do not re-litigate): everything in §3; the promotion is
DONE (item 16's claimer's-call closed); rings recolor ruled; interim
lobby collider ruled; CREW_CLOCK values are feel-pass hypotheses —
tuned by HIS playtest only.
OPEN:
- UNCOMMITTED IN TREE (the visionary's live Blender work, NOT ours):
  project/blender/giants-far.blend modified + untracked
  region-scripts (mid_cottages_road/south/west.py, near_bakery.py).
  He was authoring while we built. Ask him, never commit blind.
- Fleet lane READY: six species' collider markers (dispatch against
  author-ogre-colliders.py precedent + export script; all six ship
  at ruled height → --scale 1; dragon is the odd seated body).
- Visionary's ear/eye: bonk feel + patronBonk sound, scold wording
  (his voice pass), dab look, new solo clock (THE ONE DIAL), verdict
  sting + grumble FILES still drop-ins, s18 eye-pass backlog.
- Release gate TODO organs (boot smoke, package); captures debt;
  meshy license; FLAVORS ruling.

## 7. Next session focus

VISIONARY'S WORDS: entry 5 — THE TRAINING LOBBY + THE OPENING PARADE
(plans/15 item 25) — review the work and plans FIRST, then DISCUSS
before building. Entry 5 highlights: no lobby cake — practice-cake
target (run-boundary collider, third member of the phase-scoped
collider institution: dessert per deal, giant per deal, target per
run); bench ogre at the rest stop (lean audition before pose-baked
sit); horizon crowd only; the walk-up parade at ALL-IN
(loading-as-fiction); plans/20 §2 critical-list rewrite rides along.
ENTRY 5 RAZES entry 4's interim lobby rule (patronAtMark's last
lines — the cross-note in item 25 names the deletion). Costs named
in item 25: lobby smoke recipes + item 1's lobby rings retarget to
the practice cake; check what the Room holds pre-run. The practice
cake MODEL + ogre resting pose are fleet-dispatchable BEFORE/DURING
the session (fleet lane) — consider dispatching early alongside the
six collider-marker agents.

## 8. Recommended reading order

1. This handoff.
2. project/plans/15-side-quests.md item 25 IN FULL (the ruled lobby
   fiction + entry 4's cross-note) + items 15/16 status blocks (what
   just shipped) + item 26 (the clock).
3. project/plans/21-the-path.md — entry 5's framing, the fleet lane
   (collider markers + practice cake + resting pose).
4. plans/20 §2 (the critical-list rewrite entry 5 triggers).
5. src/game/cast.ts (patronAtMark — the branch entry 5 deletes) +
   src/core/patron-collider.ts (the institution the practice-cake
   collider joins).
6. src/server/room.ts (startRun/redealDessert — where the run
   boundary lives) + src/client/main.ts reconcile site.
7. git log --oneline -6; memory: game-smoke-driver-notes.
