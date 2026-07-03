# The Decomp Phase — client/main.ts + audit fixes (housekeeping slice)

*Status: BUILT + verified 2026-07-03, same day as planned. The visionary's
call: friend test deferred (2D-parity features first), audit items now.
This phase cleared F1/F3/F5/F6/F2 and leaves client/ ready to absorb the
frosting slice — the most client-heavy work remaining.*

*Build record: ten commits exactly as planned (C1, M1–M4, X1–X4), each
gated by `npm run check`. main.ts 802 → ~310 lines across seven new
client modules. Tests 86 → 115 (hud strings, grip law regression,
net-handler message law, predictClock clamp, F3 baker-under-the-arc
byte-identical settle, F2 late-join welcome). Smoke protocol ran after
M2 and M4 — outcomes identical to the Test Cake baseline (6cl tier 2,
7cl tier 3 + crown demand, notch-1 max-crank crown, WON 100/3★). F2
verified over REAL ws: land a cherry, refresh, rejoin as a new baker —
checklist 1/3 and the cherry still sitting on the middle tier. Known
quirk reconfirmed: the preview tab can go visibilityState=hidden after
reload and freeze the rAF-driven loopback sim — restart the preview
server, it is not a game bug.*

## The one question

**"Can we restructure a fifth of the codebase and prove nothing changed?"**

## The law of this phase

**Move-commits contain ZERO behavior change; fix-commits contain ONE
finding each.** Never mixed. Every commit compiles, passes the suite, and
the move-commits are additionally proven by the smoke protocol below.
The anti-pattern this law exists to prevent: one mega-commit titled
"decompose main + fixes" that git bisect can't see inside.

Move-commits MAY add tests (pinning current behavior is proof, not
change). Fix-commits are named for their audit finding.

## Verification: the smoke protocol

The `__game`-driven end-to-end from the Test Cake verification, replayed
against the dev preview after structural steps: load cherry → 6 clicks →
fire (1/3, tier 2) → 7 clicks → fire (2/3, tier 3) → await the Giant's
crown demand → screw to notch 1 → 8 clicks → fire → WON, judgment
{met, accepted, score 100, stars 3}. Identical outcome = the move was
pure. Run after M2, after M4, and after the fix series. `npm test` +
`npx tsc --noEmit` gate every commit.

## Module map (the target shape)

`main.ts` shrinks to boot + transport pick + the fixed-step loop + wiring
(~200 lines). Everything else moves out; server-echoed match state
becomes one typed object instead of a dozen closure variables.

- `client/state.ts` — `MatchView`: machine/crankTicks/screwTicks/order/
  checks/verdict/lastPatron/myId/netStatus/carrying. One mutable object,
  passed to the modules below.
- `client/hud.ts` — PURE text builders, no DOM: arcGlyph, promptFor,
  hudLines, bannerText. (Unit-testable for the first time; the banner
  branches and the culprit-naming law get pins.)
- `client/input.ts` — keyboard/pointer-lock wiring + GRIP SEMANTICS.
  The grip law (engaged control held until E release, plans/04) becomes
  pure functions (updateGrip, deriveOp, deriveMove) with regression
  tests — this week's grip bug gets a permanent tripwire.
- `client/net-handlers.ts` — applyServerMsg(view, msg, fx): every word
  the room says, mutating MatchView, side-effects behind an fx interface
  (spawnShot/upsertGhost/removeGhost/flash).
- `client/ghosts.ts` — GhostManager (meshes, lerp targets, join/leave).
- `client/scene.ts` — renderer/camera/lights/arena visuals + the machine
  rig (build + per-frame update from MatchView).
- `client/shots-view.ts` — the visual projectile sim: ProjectileManager
  + shot meshes + landing markers + splat flashes.

## Commit plan

- **C1 — CI + README (F6, FIRST).** GitHub Action: `npx tsc --noEmit &&
  npm test` on push. The guard rail goes up before the furniture moves.
  README: what this is, how to run, the layering law, pointer to plans/.
- **M1 — extract hud.ts** (+ banner/prompt unit tests pinning today's
  strings and branches).
- **M2 — extract input.ts** (+ grip regression tests: crosshair slip
  keeps the grip; control moving under the crosshair never turns held
  W/S into walking; E release frees it). SMOKE.
- **M3 — extract state.ts + net-handlers.ts + ghosts.ts** (+ tests:
  scored-progression flash choice, verdict latch on ending order msg).
- **M4 — extract scene.ts + shots-view.ts.** main.ts is now the loop.
  SMOKE.
- **X1 — F3: collision groups in core/** — projectiles and baker
  capsules mutually ignore (membership/filter set where the colliders
  are born: projectiles.ts + baker.ts). The room has no bakers, so this
  changes nothing server-side; it stops each client's LOCAL baker from
  contaminating the shared-arc determinism. Headless pin: a lob fired
  over a baker standing in the arc settles exactly where it settles
  with no baker present.
- **X2 — F5: the client never declares an ending.** Local clock
  prediction clamps at 1 tick (mirror of the room's patience clamp);
  order.status flips ONLY on authoritative messages, so the banner
  always renders with the verdict that ends the order. (hud.bannerText
  already unit-tested; this pins the state rule.)
- **X3 — F7: baker.ts docstring** — movement is client-authoritative
  relayed pose (plans/02), not server-run; the comment still claims
  otherwise.
- **X4 — F2: welcome carries the world.** Protocol: welcome gains
  `toppings: {topping, pos}[]` — every SETTLED body in the room's world
  (in-flight shots during the join window are accepted as a gap).
  Client spawns them as dynamic bodies at rest + meshes, so a late
  joiner's local world carries the same obstacle set (prior settled
  toppings ARE obstacles for later shots — this is determinism, not
  just visuals) and refresh becomes a clean recovery. Room test: join
  after a settle → welcome names the topping at its rest position.
  SMOKE + two-tab check.

## Deferred by decision (not forgotten)

- F4 latency feel — needs the friend test (visionary: 2D-parity first).
- Elevation ladder re-spacing — needs frosting-era reasons (plans/04/05).
- Room body sweep, per-deal rng seeds, bundle splitting — noted in the
  audit, cheap, not yet earning their commit.

## Exit

main.ts ≤ ~250 lines; suite green with new hud/input/net/core pins; smoke
outcomes identical; CI running on push; F2/F3/F5 closed. Then the roadmap
resumes: 2D-parity features (frosting + sprinkles + census — with round
tiers built into the census geometry from the start, per the audit).
