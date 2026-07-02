# Slice 1 — The Greybox (v1)

*Status as of 2026-07-02: Steps 0–4 BUILT; Step 4's formal playtest is
NEXT. Steps 1–3 feel-checked (Step 3 verdict: "that is fun"; range-judging
difficulty deliberately kept pure — no prediction UI, revisit after the
playtest). Step 4 complete: pantry crates (cherry + lime), carry one at a
time, E loads the carried topping (temp hack removed), 90s toy order in
game/order.ts, end banner + R restart. SCORING LAW (visionary's call):
final REST position — a topping that hits the cake and rolls off scores
nothing. Soft-landing absorption (IMPACT_ABSORPTION 0.15) makes the order
winnable: settle ladder pinned by test = 5 clicks short / 6-7 ON the cake /
8 skids off the back. Rest detection is a velocity-threshold counter
(~0.5s), not Rapier sleep (too slow for feedback). Browser settle position
matched the Node test to the centimeter — determinism proven cross-runtime.
NEXT: the visionary plays the full loop (the slice's exit question), record
verdict + tuning notes here, then decide Step 5 (two tabs, one cake) vs
feel iteration.*

## The one question this slice answers

**"Is run + crank + load + lob fun in real time?"**

Not rendering, not netcode, not the Giant, not frosting. If sprinting back
from the ammo shelf while the clock runs feels tense and pulling the release
lever feels good, everything in plans/06 (2D repo) is worth building. If not,
we learned it for the price of a greybox.

## Explicitly NOT in this slice

Frosting simulation, the Patron, scoring/Judgment, art, sound, multiplayer
netcode (until Step 5), towns, wind. Projectiles are spheres; the cake is a
box; the world is flat.

## Steps (each verifiable before the next)

- **Step 0 — Stack proof** (ships with scaffold): Three.js renders, Rapier
  WASM inits and steps at fixed 60Hz, a ball drops onto a box cake. Vitest +
  tsc clean.
- **Step 1 — The baker.** First-person character controller: capsule +
  Rapier `KinematicCharacterController`, WASD + mouse-look via Pointer Lock,
  walk/sprint. Tuning target: crossing the arena takes ~4–6 seconds — travel
  time is the pressure currency.
- **Step 2 — The machine.** Catapult as three interactables (raycast from
  camera + `E`/hold-to-operate): traverse wheel (yaw), tension winch (power,
  ratchets up in clicks, takes real seconds), release lever. Machine state
  `{ traverseDeg, tensionClicks, loaded }` lives in `game/` as pure data with
  unit tests — the client only renders and forwards intents. (This is the
  future network-sync boundary; get it right now.)
- **Step 3 — The lob.** Lever fires the loaded ammo from machine state:
  ballistic flight (Rapier dynamic body), landing marker/decal on the box
  cake, simple splat-vs-place readout from impact speed. Dead reckoning is
  now testable: land three in a row on the cake top.
- **Step 4 — The loop.** Ammo shelf (two dummy topping types), carry ONE at a
  time, load at the catapult; a countdown timer and a toy order ("land 3
  RED on the cake top"). Wrong ammo FIRES ANYWAY (mistakes execute, never
  block). End screen: order met or not. **← First playtest with the
  visionary happens here.**
- **Step 5 — Two tabs, one cake** (fenced until Step 4 verdict): room server
  (Colyseus/PartyKit class), machine state + player transforms + shot events
  synced, join via link from a second browser tab. The thesis test.

## Verification

- `game/` machine-state math: pure functions, vitest (crank rates, tension
  clamps, load/unload legality).
- In-browser: DEV `window.__game` handle for headless preview_eval checks,
  same culture as the 2D project.
- Steps 1–4 each end with a human feel-check; Step 4 is the formal playtest.

## Exit criteria

The visionary's verdict after Step 4: does the loop generate tension and
comedy solo? Record the verdict + tuning notes here, then decide Step 5 vs
feel iteration.
