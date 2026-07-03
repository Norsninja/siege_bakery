# Handoff — 2026-07-03 (greybox slice COMPLETE, two tabs one cake works)

## 1. Snapshot

Slice 1 (greybox, plans/01) is functionally complete: Steps 0-5 all built,
tested, human-verified, committed (HEAD 1523cfc). The full loop works solo
AND networked: first-person baker, catapult machine (three interactables),
ballistic lob with rest-position scoring, pantry/carry/toy-order/end-screen,
and a Node ws room server with the two-tab human test PASSED. 55 vitest
tests green, tsc strict clean, build clean. Visionary playtest verdict on
the solo loop: SUCCESS ("that is fun"). Remaining slice-1 item: the
tunneled PC-to-PC friend test (the pivot's literal success test). Next
session per visionary: review the work, compare against the 2D game
(E:\Projects\artillery, READ-ONLY), decide what still ports.

## 2. What changed this session

All of it — session started with only the stack proof (Step 0).

- Step 1: src/core/baker.ts — capsule + Rapier KinematicCharacterController
  (API validated in rapier3d-compat 0.19). BakerInput {forward, strafe,
  sprint, yaw} is the future wire shape. Speeds pinned by test: 24m crossing,
  walk 4 m/s (6s), sprint 6 m/s (4s). Feel-check passed (sensitivity 0.0022).
- Step 2: src/game/catapult.ts — CatapultState {traverseDeg, tensionClicks,
  loaded} + pure transitions + tickMachine (held intent → machine law:
  45 ticks/click crank, drop-winch-loses-progress, 30 deg/s traverse
  clamped ±60, lever/load edges). Client interactables: crosshair raycast,
  hold E winch, E+A/D wheel (movement suppressed while engaged), E lever,
  E bucket/crates.
- Step 3: src/core/ballistics.ts (fixed 55° elevation; speed 4+1.5/click;
  SPLAT_SPEED 13) + src/core/projectiles.ts (ProjectileManager owns
  EventQueue; step() returns {impacts, settled}).
- Step 4: src/game/order.ts (toy order, pure) + pantry crates (cherry/lime),
  carry-one, 90s clock, banner, R restart. SCORING LAW (visionary):
  final REST position — roll off the cake, score nothing. This forced
  IMPACT_ABSORPTION 0.15 (soft landing, first impact only) because without
  it NOTHING stayed on the cake. Settle ladder pinned by test: 5 clicks
  short / 6-7 ON cake / 8 skids off. Rest detection = velocity threshold
  30 ticks (Rapier sleep was seconds too slow for feedback).
- Step 5: src/core/arena.ts (single shared level definition),
  src/game/protocol.ts (ClientMsg/ServerMsg + mergeIntents),
  src/server/room.ts (THE match implementation, transport-agnostic),
  src/server/main.ts (Node ws entry, port 5175, serves dist/),
  src/client/net.ts (loopback + ws transports), main.ts rewritten to always
  speak protocol. Room auto-deals a fresh order 10s after win/loss.
- Deps added: ws; dev: @types/ws, @types/node, tsx. npm script "server".
- Docs: plans/01 updated with all verdicts; plans/02-two-tabs-one-cake.md
  (Step 5 decisions + status); CLAUDE.md commands + layering updated.

## 3. Architecture and invariants

- Layering law (vitest is the tripwire): core/ = deterministic sim, may
  import Rapier, never three.js/DOM/game/client. game/ imports core only.
  server/ imports core+game only. client/ may import anything (including
  server/room for loopback). No wall-clock/Math.random in core/game.
- ONE match implementation: server/room.ts. Client always speaks protocol
  through a Transport. Solo = loopback room-of-one ticked by the client's
  own fixed-tick loop; multiplayer = same Room driven by Node interval.
  Never create a second match code path.
- Authority: Room owns machine (intents merged: mergeIntents — crank is
  boolean not additive, turns sum/clamp, any lever fires, first load wins),
  order + clock, projectile sim, scoring. Baker poses are CLIENT-
  authoritative, relayed at 20Hz, rendered as interpolated ghosts.
- Sync-shots-not-surfaces: one `shot` event; every client + the room
  simulate the lob locally; deterministic ballistics land identically
  (verified browser-vs-Node to the centimeter: settle z=-28.95 both).
- Scoring truth = final rest position (isOnCake in core/arena.ts). Impact
  speed is only a readout (splat >= 13 m/s). No prediction UI / range
  gauge — decided; markers-as-memory only, spotter role must stay emergent.
- Design calls not to re-litigate: aim is machine state not camera state;
  mistakes execute never block; wrong ammo loads and fires; no minimap.
- Tuning knobs live in: core/baker.ts (speeds), core/ballistics.ts
  (elevation/speed-per-click/SPLAT), core/projectiles.ts (absorption,
  rest thresholds), game/catapult.ts (crank/traverse rates, max clicks),
  server/room.ts (ORDER_* constants, broadcast cadences, reset delay).

## 4. File map

- src/core/: constants.ts (FIXED_DT, GRAVITY), rng.ts (+test, ported 2D),
  baker.ts (+test), ballistics.ts (+test — includes settle-ladder pin),
  projectiles.ts, arena.ts (level geometry + buildArenaColliders + isOnCake),
  physics-smoke.test.ts (Rapier-in-Node lockstep; keep forever).
- src/game/: catapult.ts (+test 14 cases), order.ts (+test), protocol.ts
  (+test — messages + mergeIntents).
- src/server/: room.ts (+test — headless two-client match), main.ts (Node
  entry; wall-clock allowed here only).
- src/client/: main.ts (render/input/protocol client; DEV window.__game
  handle: send, getMachine/getOrder/getTarget/getCarrying/setCarrying,
  getGhosts, getNetStatus, getMyId, setDebugInput, setLook), net.ts.
- index.html: #app canvas, #hud (white-space pre-line), #crosshair, #banner.
- project/plans/01-greybox-slice.md (all verdicts recorded),
  02-two-tabs-one-cake.md (Step 5 record).

## 5. How to run, test, verify

- npm run dev → vite on 5174 (loopback solo). npm run server → room server
  on 5175 (tsx; serves dist/, ws same port). Two tabs at
  http://localhost:5175 = shared room (auto-join); or dev page with
  ?join=ws://localhost:5175.
- npm test (55), npx tsc --noEmit, npm run build (bundle ~2.7MB known).
- Headless browser verify: window.__game.send({t:"load",topping:"cherry"}),
  send op/lever, getOrder(), setLook + real KeyboardEvent dispatch works
  for full-path testing. Preview tab can go visibilityState hidden after
  reloads — rAF freezes; restart the preview server if screenshots hang.
- Sessions must open THIS folder (artillery's launch.json collides).
- Stale processes: check ports 5174/5175 before starting servers.

## 6. Open items and decisions

Decided this session: plain ws (no framework); loopback-room architecture;
client-auth transforms; rest-position scoring; no range gauge (keep pure,
revisit only on playtest pain); soft-landing absorption 0.15; order
auto-reset 10s. Earlier decisions stand (stack, layering, determinism,
first-person-not-FPS, mistakes-execute).

Open:
- Tunneled friend test (cloudflared/tailscale → http://localhost:5175).
- Game name. Long-term hosting. Bundle code-split. Reconnect/names/rooms.
- Next-slice fork presented to visionary (undecided): (1) Patron + real
  Judgment, (2) frosting surface accumulation + census scoring, (3) second
  catapult/wider arena, (4) art/sound pass. My recommendation on record:
  1 then 3; frosting deserves its own slice.
- Known limits: no server-side baker capsules (no topping-vs-baker
  collisions); solo pauses when tab hidden (fine); toppings accumulate
  across rounds (fun, unmeasured cost).

## 7. Next session focus

Visionary wants: review the work, compare against the 2D game, produce a
port-gap analysis. Sources: artillery/project/plans/02-siege-bakery-design.md
(identity, two-gate Judgment, Patron behavior trees, two towns, tone guard)
and 06-3d-realtime-pivot.md (what ports: soul + orders-as-data + judgment
math + patron trees; what doesn't: falling-sand automaton). Deliverable
should be a research doc (project/research/) listing: ported already,
ports-as-data next, ports-as-concept, deliberately dropped. Then pick the
next slice at the fork above.

## 8. Recommended reading order

1. This handoff.
2. CLAUDE.md (this repo) — law, updated commands.
3. project/plans/01-greybox-slice.md — slice record with all verdicts.
4. project/plans/02-two-tabs-one-cake.md — Step 5 decisions/record.
5. E:\Projects\artillery\project\plans\02-siege-bakery-design.md — the
   design to compare against (READ-ONLY).
6. E:\Projects\artillery\project\plans\06-3d-realtime-pivot.md — port
   rationale (READ-ONLY).
7. src/server/room.ts then src/game/protocol.ts — the match + wire truth.
8. src/client/main.ts — client shape and __game handle.
