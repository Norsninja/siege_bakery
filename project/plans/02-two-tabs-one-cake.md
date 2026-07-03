# Slice 1, Step 5 — Two Tabs, One Cake

*Status: planned AND built 2026-07-02 (same session as the Step 4 verdict).
Decisions below are settled; don't re-litigate casually. Build phases 1-4
all verified: 55 tests green incl. headless two-client Room match; browser
verified solo-loopback AND ws-joined (synthetic second client: ghost
rendering, remote co-op cranking, shot broadcast, authoritative scoring
and clock, loss banner over the network, room auto-deals a fresh order 10s
after win/loss). TWO-TAB HUMAN TEST PASSED (visionary, 2026-07-03): both
tabs load from http://localhost:5175 and share the room. REMAINING: the
tunneled PC-to-PC friend test — the literal success test of the pivot.
Comedy note from verification: the synthetic
second baker overcranked to 8 clicks while unattended and the cherry sailed
clean over the cake — the co-op failure mode works.*

## The thesis test

Join a shared bakery from a second browser tab via a link. Machine state,
player poses, and shot events sync. This is the smallest honest version of
the success test ("send a friend a link, play PC-to-PC").

## Settled decisions (visionary, 2026-07-02)

1. **Plain `ws`** — bare Node WebSocket room server, no framework. Our sim
   authority stays on the exact Node runtime vitest has been proving all
   along. Colyseus/PartyKit reconsidered only if room management becomes
   real work.
2. **Loopback room** — there is ONE match implementation, `server/room.ts`,
   transport-agnostic. Solo play is a room of one over an in-memory
   loopback; multiplayer is the same room over WebSocket. main.ts always
   speaks protocol. No solo/networked drift, ever.
3. **Client-authoritative baker transforms** — each client simulates its own
   baker (core/baker.ts, already built) and streams pose ~20Hz; others
   render interpolated ghosts. Right for co-op among friends. Machine,
   order, and scoring stay SERVER-authoritative via intents.

## Authority map

- **Server (Room)**: machine (`tickMachine` over merged intents), order +
  clock, projectile sim, scoring (settle → deliver). Its Rapier world is
  ground/walls/cake/projectiles only — NO baker capsules (bakers don't
  collide with shots in the greybox; noted limit: no bonking).
- **Client**: own baker movement, camera, crosshair targeting, edge
  detection; renders server-echoed machine state; spawns projectiles
  LOCALLY from shot events (deterministic ballistics already proven
  identical Node-vs-browser to the centimeter); impact markers local;
  score/flash from server `scored` events.
- **Both players can work the machine at once**: intents merge (any crank
  cranks, turns sum and clamp, any lever releases). `mergeIntents` is pure
  and tested in game/. Chaos is a feature.

## Protocol (JSON over ws; game/protocol.ts owns the types)

- client→server: `hello` · `pose {x,y,z,yaw}` (every 3rd tick) ·
  `op {turn, crank}` (hold state, on change) · `lever` (edge) ·
  `load {topping}` (edge)
- server→client: `welcome {id, machine, order, poses}` · `join/leave` ·
  `poses` (~20Hz) · `machine {state, crankTicks}` (~15Hz + on fire) ·
  `shot {topping, traverseDeg, tensionClicks}` · `scored {topping, onCake,
  order}` · `order` (status changes + coarse clock)

## Layering moves

- `core/arena.ts` — shared level constants (crossing, walls, cake AABB,
  machine base) + `buildArenaColliders(world)` + `isOnCake(pos)`. Client
  visuals and Room physics both read it; the ballistics test stops
  duplicating geometry.
- `server/room.ts` — Room class, imports core+game only. Driven externally:
  Node interval (ws mode) or the client's own fixed-tick loop (loopback).
- `server/main.ts` — Node entry: ws on 5175 (PORT overrides), serves
  `dist/` statically so ONE tunneled port is the whole friend test later.
  Run via tsx (devDep).
- `client/net.ts` — Transport interface + WsTransport + LoopbackTransport
  (client may import server/room; the reverse stays illegal).
- Mode pick: `?join=ws://…` param joins; page served by the Node server
  auto-joins same-origin; vite dev (5174) defaults to loopback solo.

## Build order (each verifiable)

1. core/arena.ts extraction + game/protocol.ts + mergeIntents — tests.
2. server/room.ts headless: two scripted fake clients in vitest — join,
   merged cranking, fire, shot broadcast, authoritative scoring, order end.
3. client refactor onto protocol + loopback; solo must feel IDENTICAL.
4. server/main.ts + `npm run server`; join from the dev-served page via
   `?join`; second synthetic client verifies two-tabs behavior headlessly;
   then real two-tab human test.
5. (later, on demand) tunnel the Node port for the real friend test.

## Non-goals for Step 5

Reconnect/resume, spectators, >2 players (should incidentally work, not
tested), lag compensation, binary encoding, room browser UI, hosting infra.
