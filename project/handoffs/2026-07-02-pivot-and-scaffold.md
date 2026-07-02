# Handoff — 2026-07-02 (3D pivot decided, repo scaffolded, Step 0 done)

## 1. Snapshot

New project. Siege Bakery 3D: a 3D real-time first-person co-op party game
derived from the 2D turn-based prototype at `E:\Projects\artillery`. This
session made the pivot decision, chose the stack, scaffolded this repo
(`E:\Projects\siege-bakery-3d`, git, initial commit f5f8c2f), and shipped
greybox Step 0 (stack proof). 6 tests pass, `npx tsc --noEmit` clean,
`npm run build` clean. Nothing playable yet — the current scene is a
throwaway proof (ball drops onto a box cake).

The 2D project continues its own development in parallel and is READ-ONLY
from this project. Never modify anything under `E:\Projects\artillery`.

## 2. What changed this session

- Pivot discussion + decision, recorded in
  `E:\Projects\artillery\project\plans\06-3d-realtime-pivot.md` (the full
  rationale; read it).
- This repo scaffolded: package.json, strict tsconfig (copied law from 2D),
  vite.config.ts (port 5174), index.html, `.claude/launch.json`,
  `.gitignore`, README.md, CLAUDE.md (project law), project/ doc tree
  with handoff template and `plans/01-greybox-slice.md`.
- `src/core/rng.ts` + test ported verbatim from the 2D repo (mulberry32).
- `src/client/main.ts`: stack-proof scene — Rapier WASM init, fixed 60Hz
  accumulator loop decoupled from render, ball drops onto box "cake".
- `src/core/physics-smoke.test.ts`: Rapier runs headless in Node; two
  identically-built worlds stay in exact lockstep for 240 ticks. This is the
  authoritative-server bet, proven. Keep this test forever.
- Dependencies installed (npm-resolved, 0 vulnerabilities): three 0.185,
  @dimforge/rapier3d-compat 0.19, typescript 6.0, vite 8.1, vitest 4.1,
  @types/three 0.185.

## 3. Architecture and invariants

- **The game**: timed Patron orders; bakers physically run between ammo
  pantry and catapult; load the correct topping; operate the machine —
  traverse wheel (aim), tension winch (power), release lever (fire); lob
  toppings onto one giant shared cake. "Overcooked with catapults."
  Success test: send a friend a link, play PC-to-PC. iPad secondary,
  phone explicitly not a design driver.
- **Why web/Three.js over Godot**: link-to-join is the success test (web's
  home turf, Godot's weak export); the strict deterministic TS core/game
  runs identically headless-in-Node (server) and in-browser (client) — one
  sim implementation. Blender→glTF→GLTFLoader is the asset pipeline.
- **Key design calls (do not re-litigate)**:
  - First-person is NOT FPS aiming. The catapult is an operated machine;
    aim is machine state, not camera state. This preserves dead reckoning
    (read pennant + last splat, crank, fire) in real time.
  - Mistakes execute, they never block (wrong ammo fires anyway).
  - Spotter role emerges free from first-person + ballistics; do not build
    UI that replaces it (no top-down minimap of shot arcs).
  - The 2D falling-sand automaton does NOT port. 3D frosting = surface
    accumulation (coverage masks + local blobs), cake = coarse carving,
    scoring = sample-point census. No voxel fluid sim.
  - Cake state syncs as deterministic events (impact at P, velocity V,
    seed S), never as surfaces.
- **Layering law** (vitest is the tripwire): `core/` = deterministic sim
  math, may import Rapier, never three.js/DOM/game/client. `game/` imports
  core only (match rules, orders, judgment, catapult machine state).
  `client/` = three.js + input + main.ts, may import anything. `server/`
  (future) imports core+game only. core/ and game/ must run headless in
  Node.
- **Determinism law**: seeded RNG only (`core/rng.ts`), never
  Math.random(); no wall-clock in core/game; fixed 60Hz timestep
  (accumulator in main.ts, capped at 0.25s so backgrounded tabs don't
  spiral).

## 4. File map

- `CLAUDE.md` — project law; loaded automatically in sessions opened here.
- `project/plans/01-greybox-slice.md` — current slice, steps 0-5.
- `project/templates/HANDOFF_TEMPLATE.md` — this template.
- `src/core/rng.ts` (+test) — mulberry32, ported from 2D.
- `src/core/physics-smoke.test.ts` — Rapier-in-Node + lockstep determinism.
- `src/client/main.ts` — stack-proof scene, entirely replaceable; contains
  the canonical fixed-timestep loop shape and DEV `window.__game` handle.
- `index.html` — canvas #app + #hud overlay div.
- `vite.config.ts` — port 5174 (2D owns 5173), PORT env overrides.
- `.claude/launch.json` — preview config "dev" for sessions opened HERE.

## 5. How to run, test, verify

- `npm run dev` → http://localhost:5174. `npm test` (vitest),
  `npx tsc --noEmit`, `npm run build`.
- Sessions must be opened in THIS folder. A session anchored to the
  artillery folder resolves preview_start to ARTILLERY's launch.json and
  starts the 2D dev server (happened this session).
- DEV builds expose `window.__game` (physics, scene, camera, ballBody,
  ball) for preview_eval verification, same culture as the 2D project.
- Unverified as of handoff: the WebGL render has not been eyeballed in a
  browser (Chrome extension was unreachable; tsc+build clean, Rapier
  proven in Node). First dev-server visit should confirm: red ball drops
  onto tan box, rolls off, HUD text visible, no console errors.

## 6. Open items and decisions

Decided: stack (Three.js+Rapier+Vite/TS+Node room server later, Colyseus/
PartyKit class); repo location (here, sibling of artillery); 2D project
continues orthogonally, read-only from here; all design calls in section 3.

Open:
- Game name (candidates in artillery plans/02 header; folder rename is
  cheap until published).
- Room-server hosting for playtests — decide at greybox Step 5.
- Bundle is 2.7MB raw / ~970KB gzip (Rapier WASM inlined base64 +
  three.js); code-split later, not now.
- Character controller approach: Rapier KinematicCharacterController
  recommended in plans/01, not yet validated in rapier3d-compat 0.19.

## 7. Next session focus

Greybox Step 1 (`project/plans/01-greybox-slice.md`): first-person baker.
Capsule + Rapier character controller, WASD + mouse-look via Pointer Lock,
walk/sprint. Tuning target: crossing the arena takes 4-6 seconds — travel
time is the pressure currency of the whole design. Then Step 2 (catapult
machine: machine state as pure tested data in game/, client renders and
forwards intents — this is the future network-sync boundary). First user
playtest lands at Step 4.

## 8. Recommended reading order

1. This handoff.
2. `CLAUDE.md` (this repo) — the law.
3. `project/plans/01-greybox-slice.md` — the work queue.
4. `E:\Projects\artillery\project\plans\06-3d-realtime-pivot.md` — full
   pivot rationale (read-only).
5. `E:\Projects\artillery\project\plans\02-siege-bakery-design.md` —
   identity, Judgment, Patron trees, two towns, tone (read-only).
6. `src/client/main.ts` — loop shape and __game handle to preserve.
7. `src/core/physics-smoke.test.ts` — what the server bet rests on.
