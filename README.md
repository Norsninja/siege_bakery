# Siege Bakery 3D (working title)

Real-time first-person co-op party game: bakers run, load, and operate
catapults to build a giant dessert before the Patron's patience runs out.
Overcooked with catapults. Three.js + Rapier + TypeScript, playable in the
browser, link-to-join multiplayer planned. Nobody dies.

## Run it

```
npm install
npm run dev      # Vite dev page on 5174 — solo (in-process room)
npm run server   # Node room server on 5175 — co-op; serves dist/ too
npm run build    # tsc + vite build → dist/
npm run check    # typecheck + full test suite (the pre-commit gate)
npm test         # vitest alone
```

Co-op: `npm run build`, `npm run server`, then open `http://localhost:5175`
in two windows (or tunnel that one port to a friend). A page served by the
room server auto-joins; the dev page joins with `?join=ws://host:5175`.

## The law (see CLAUDE.md for the full text)

- `src/core/` — deterministic sim math (Rapier ok; NEVER three.js/DOM).
- `src/game/` — match rules; imports `core/` only.
- `src/server/` — the Room, THE match implementation; `core/`+`game/` only.
- `src/client/` — rendering + input; may import anything.
- Determinism: seeded RNG only, fixed 60Hz timestep, no wall clock in
  core/game. Cake state syncs as shot EVENTS, never as surfaces.
- `core/` and `game/` run headless in Node — vitest is the tripwire
  (mechanized in `.github/workflows/ci.yml` once a remote exists).

## Where things are decided

`project/plans/` (numbered slices, each with a playtest verdict),
`project/research/` (studies incl. reproducible ballistics scripts),
`project/handoffs/` (session continuity). Start with the latest handoff.
Design lineage: the 2D prototype (`../artillery`, read-only) and its
`project/plans/06-3d-realtime-pivot.md`.
