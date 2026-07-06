# Handoff — 2026-07-06 (conversion law built + verified; NEXT: impartial holistic audit before towns)

## 1. Snapshot

HEAD 69f078d. 189 vitest green (20 files), both tsc legs clean, tree clean.
This session replaced the not-cogent sticky-frosting mechanism (and the four
designed corrections from the 2026-07-05 review) with THE CONVERSION LAW
(plans/10 §8): gripped sprinkles stop being physics bodies and become
dessert surface data. Verified headless by positions AND by the visionary's
own live test ("sprinkles stick to the outside shell of the frosting").
NEXT SESSION IS NOT TOWNS: he wants an IMPARTIAL, OBJECTIVE, holistic audit
of the whole codebase first (see §7 — read that section before doing
anything).

## 2. What changed this session

One commit, 69f078d (16 files, +738/−161):

- plans/10 §8 — the design record: conversion law, burial law (his words
  verbatim), retired-knockability rationale, re-pin list. §7's sticky
  MECHANISM marked superseded; the law's intent stands.
- src/core/arena.ts — isOnCake reverted to pure tierOf (DESSERT_SKIN_M
  deleted); new cakeSurface(pos) → {point, normal}: analytic nearest point
  on the tier stack + outward normal, sqrt-only, handles inside-penetration
  (shallower of wall/top, never a downward normal).
- src/core/projectiles.ts — GRIP_SKIN_M 0.12 (the skin gate lives at the
  ONE stick site in core, not in the two stickyPaint bindings); grain first
  impact with distanceToCake ≤ gate AND stickyPaint(p) → body removed from
  world, `stuck` event {pos: skin point, normal, topping, tag} (replaces
  the impact event, as the pop replaces the carrier's); StepEvents gains
  stuck[]; spawnAtRest frozen-rejoin branch deleted (all spawns go through
  waking); wake pass skips grain-mover → frozen-grain pairs (cannot
  collide — the one kept correction).
- src/core/frosting.ts — splatCovers(target, impact, speed, spec) burial
  predicate (same band+radius math as splatSamples, one point);
  FrostingField.coatsNear(pos) (client perch oracle, max coats within
  STICKY_NEAR_M).
- src/server/room.ts — stuck events → bodiless ledger entries {onCake:
  true, stuck: true, normal} (the paint-entry class: ledger() skips them,
  settled=[] at redeal clears them); paint impacts filter out covered
  stuck entries BEFORE pushing the paint entry (burial); welcome carries
  stuck[] (pos+normal).
- src/game/protocol.ts — StuckTopping {topping,x,y,z,nx,ny,nz}; welcome
  gains stuck: StuckTopping[].
- src/client/sprinkles-view.ts (NEW) — InstancedMesh of capsules perched
  at skin + normal × blobCrest(coatsAtGrip); golden-angle twist per index;
  GRAIN_PALETTE colors; buryBy mirrors the Room's filter; frustumCulled =
  false (see §6 lesson). frosting-view.ts exports blobScale/blobCrest (the
  ONE source of blob swell math) + coatsNear wrapper. shots-view.ts:
  onStuck callback, GRAIN_PALETTE exported. net-handlers.ts: NetFx gains
  restoreStuck/clearStuck (welcome/fresh). main.ts: wiring + `sprinkles`
  on __game.
- Tests — projectiles.test: sticky test → conversion test with a REAL
  FrostingField (painted wall grips; skin point radial ≈ 4 exact; no
  impact/settle/body); crescent regression (floor impact beside painted
  base never grips, stays litter, survives clearCakeSolids); impossible-
  pair wake test (frozen grain never stirs for a passing grain — with a
  non-vacuous closest-approach assertion — but a cherry still wakes it);
  fresh-cake test re-cut (tier-top grain body instead of skin-stuck).
  room.test: burst pin 38→40 (40/40 grip, all as records, all on welcome);
  knockability pin RETIRED, replaced by burial pin (40→2 after repaint);
  WIN choreography re-cut — sprinkles fire LAST (burial law is the
  strategy), pins 40/80, crown assertion moved after burst 2 (demand is
  look-cadence-triggered). net-handlers.test: new fx hooks + stuck: [].
- game/tuning.ts SPRINKLES_NEEDED comment re-pinned (grip is 100% now;
  slack covers aim, burial is the loss mode). CLAUDE.md pointer updated.

## 3. Architecture and invariants

Unchanged: sacred layering (core/game headless, enforced twice);
determinism (seeded rng, fixed 60Hz, sqrt-only cross-engine math);
sync-shots-not-surfaces; freeze law for SOLIDS; regime law; forgiveness
ladder; rungs-introduce-projectiles vs shop-sells-infrastructure.

NEW load-bearing:
- THE CONVERSION LAW (plans/10 §8): grip = on-skin (GRIP_SKIN_M, core)
  AND on-paint (stickyPaint oracle, bound by Room + client twin). A stuck
  sprinkle is a RECORD (skin point + normal), never a body, never an
  obstacle, never knockable. Truth lives in Room.settled as bodiless
  entries; client visuals in SprinklesView; both derive from the same
  deterministic stuck events.
- THE BURIAL LAW (his ruling, verbatim in plans/10 §8): "if they are not
  on top, they are covered — they would be IN the cake." A later
  tag-matched splat whose footprint covers a record REMOVES it. This is
  the sprinkle eraser now (knockability retired FOR SPRINKLES ONLY).
- Render contract: client perch = skin + normal × blobCrest(coats at
  grip); blobScale/blobCrest in frosting-view are the single source of
  blob swell math — if refresh() changes, the perch follows automatically.
- isOnCake is pure tierOf again. No body legitimately rests off-tier yet
  on-dessert anymore.

## 4. File map

- src/core/projectiles.ts — flight, freeze law, burst, conversion (grip
  gate + stuck events), clearCakeSolids, wake pass w/ impossible-pair skip.
- src/core/arena.ts — geometry, tierOf/isOnCake, distanceToCake,
  cakeSurface (skin projection). frosting.ts — census, splat specs,
  splatCovers, coatsNear, STICKY_NEAR_M.
- src/game/toppings.ts — pantry table (burst/splat columns, canCrown,
  deliveryWeight). judgment.ts — rows over SettledTopping ledger (stuck
  records enter as ordinary entries). tuning.ts — economy dashboard.
  protocol.ts — wire (welcome now carries stuck[]).
- src/server/room.ts — THE match: ledger w/ stuck entries + burial filter;
  roster.ts. room.test.ts — protocol-level pins incl. burst/burial/WIN.
- src/client/ — main.ts (wiring, __game incl. sprinkles), shots-view
  (local sim, onStuck), sprinkles-view (perched instances), frosting-view
  (blobs, blobCrest source), net-handlers, hud, scene, input, ghosts.
- project/plans/10-projectile-pass.md §8 — the conversion/burial record.
- project/handoffs/2026-07-05-*.md — the cogency-review context this
  session resolved.

## 5. How to run, test, verify

`npm run check` (root tsc + headless tsc + vitest; check $?). Dev 5174,
room server 5175 (never kill his). Headless ground-truth pattern proven
again: tmp-*.mts at repo root, relative imports, drive Room directly,
reach internals via (room as any).shots/.settled/.frosting, delete after.
Browser smokes: __game.send driver, detached-async for >30s; check
document.hidden FIRST. VERIFY BY POSITIONS BY CATEGORY (memory:
verify-positions-not-counters — now includes: the render contract
includes the SCREEN; a numeric matrix check passed while every instance
was frustum-culled invisible). Do not fish for camera angles — one wide
screenshot, his eye does the visual pass (his explicit feedback).

## 6. Open items and decisions

DECISIONS (do not re-litigate):
- Conversion + burial laws as in §3. Sprinkle knockability retired
  deliberately (grains never crown; the eraser survives via burial).
- Buried sprinkles count NOTHING (he rejected count-stands explicitly).
- Towns/upgrades decisions from 2026-07-05 stand unchanged (town-as-data,
  one-way split at milestone, per-town purchased upgrades, counter-tool
  law, shared purse, clicks=10 bundled with towns slice).
- Fresh-cake law: records leave via settled=[]; floor litter stays.

OPEN:
- Density review still pending (his eye, 20/40/80 via setGrainCount;
  grip is 100% now so SPRINKLES_NEEDED 60 may want raising; ask ≈ 1.5 ×
  grains re-pins with the pick).
- Short shots pile legal floor litter at the cake foot (~24 grains at 5
  clicks) — honest crew mess by law, but flag to his eye if it still
  reads wrong.
- Stale burst sticking visually to fresh cake (client décor, scores
  nothing) — known-accepted, revisit if seen.
- Patron nag (+1 grain on a 60 ask) — comedy or broken, his call.
- Camera zoom/look left hacked in the preview tab (zoom 9) — a reload
  clears it.

## 7. Next session focus — READ THIS FIRST

NOT towns. The visionary wants a HOLISTIC AUDIT with Chronus in an
IMPARTIAL, OBJECTIVE, OUTSIDE-EYES role — the project is near MVP and he
wants an honest assessment before committing the next chunk. Scope he
named: (1) code organization, (2) code management, (3) correctness, and
how everything works together. Deliverable: an assessment he can act on.
Guidance for that session:
- Take the auditor stance, not the builder stance. Do not defend prior
  sessions' choices (including this one's); the value is impartiality.
- Audit against the project's own laws (layering, determinism, render
  contract, live-truth) AND general engineering judgment (dead code,
  duplication, test honesty, doc drift, wire hygiene, perf).
- Consider fresh-context subagents for independent reads (the two-agent
  review pattern on 2026-07-05 worked well); verify findings by positions
  and real predicates before reporting.
- Output should rank findings and separate MUST-FIX (correctness) from
  hygiene, so the follow-up discussion — towns vs hygiene — has a factual
  basis. AFTER the review: discuss with him which chunk is next; do not
  start either unilaterally.

## 8. Recommended reading order

1. This handoff (§7 defines the session's role; §3 the new laws).
2. CLAUDE.md — laws, layering, commands, current-state pointer.
3. project/plans/10-projectile-pass.md — full docket + §7/§8 addenda (the
   built-then-corrected arc the audit should scrutinize).
4. project/handoffs/2026-07-05-projectile-pass-and-cogency-review.md —
   how the last review was run and what it caught.
5. src/core/projectiles.ts + arena.ts + frosting.ts — the physics/geometry
   core as it now stands.
6. src/server/room.ts + game/judgment.ts — ledger, burial, scoring path.
7. src/client/sprinkles-view.ts + frosting-view.ts + shots-view.ts —
   render-contract half.
8. Memory files (auto-loaded): verify-positions-not-counters,
   game-smoke-driver-notes, design-sessions-are-discussions.
9. plans/09 + plans/08 + research/11 header — direction and economy, for
   judging whether the code serves the design.
