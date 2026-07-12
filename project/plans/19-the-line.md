# Plan 19 — THE LINE (slice 3, BLESSED): the endless queue IS the order queue

**Status: BLESSED 2026-07-12 (sixteenth session). The visionary's
rulings of record: (1) THE UNIFIED FICTION — the line is the order
queue made flesh; order X maps to patron X; the served patron takes
the dessert and walks off, the next steps up to the table, everyone
advances; the line NEVER shortens ("that's part of the fun is the
endless line of giants waiting for orders"). (2) MAPPING HOME:
client/ now, promoted to game/ when species-themed order content +
voice land (a post-milestone design session; plans/18 FORGE
adjacency — species→palate). (3) CAST ORDER: cycles the current cast
but SHUFFLED deterministically — never a direct cycle, and NEVER two
of the same patron consecutively. Resolution degrades with distance;
instancing for repeats.**

## 0. What ships

Rung N's order belongs to the patron at the table — derived, not
synced. Behind him the endless line of upcoming patrons stands on the
giants' road, stretching into the horizon haze. Verdict → the patron
plays his species' verdict pose → takes his dessert and ambles off
down the departure lane → the whole line advances one slot → the next
patron reaches the table as the next order deals.

## 1. Laws inherited (not negotiable)

- core/ and game/ untouched; no protocol changes; everything derives
  from broadcast state (rung, verdict, patron seq) via the polling
  seam (patron-body precedent — late joiners recover by derivation).
- Assetless boot: any model null → that body simply absent; the whole
  line absent is a normal Tuesday.
- Shared-clone law; frame-driven animation, no wall clock; seeded RNG
  only (core/rng.ts — mulberry32 is sanctioned randomness).
- The atmosphere contract: far-tier impostors are named far_giant_*
  and get the pinned unlit/fog-exempt treatment.

## 2. THE CAST MAPPING (the load-bearing arithmetic)

`client/cast.ts` (pure, pinned in vitest):

- CAST = [ogre 36 m (GLB 21, visualScale 36/21), frostgiant 30 m,
  treefolk 40 m, dragon 30 m seated] — cyclops et al. join on arrival.
- `castIndexForRung(rung)`: per-rung seeded draw (mulberry32 on a
  fixed seed + rung), walked from rung 1 with ONE rule — a draw equal
  to the previous rung's pick bumps to the next index (mod n). O(rung),
  deterministic, stateless to derive, no consecutive repeats, reads
  shuffled rather than cycled.
- THE ADVANCE IDENTITY (what makes zero-sync work): the line renders
  species(rung + slot); therefore the giant at slot i after an advance
  is exactly the giant that stood at slot i+1 before it, on every
  client, without a single message. Per-giant z-stagger and yaw wobble
  hash the same queue index, so each giant KEEPS its personal stance
  as it walks forward.

## 3. The three tiers (resolution degrades backward)

- **TIER 1 — ACTORS (slots 0–2, x ≈ 66–150):** full GLB clones,
  breathing via PatronBody (shared spine/chest/head vocabulary,
  verified on all three new skeletons).
- **TIER 2 — STANDEES (slots 3–5, x ≈ 192–276):** same shared-geometry
  clones, bones at rest, never updated (fog is eating them anyway).
- **TIER 3 — HORIZON CROWD (slots 6–9, x ≈ 318–444):** low-poly
  silhouette impostors (~400 tris/species, decimated from the shipped
  meshes, haze BAKED as vertex color — the mountains' far_ language),
  ONE InstancedMesh per species, frustumCulled = false (the sprinkles
  lesson), threading the peak-ring gap the road was built through.
  Source: project/blender/giants-far.blend → public/models/
  giants_far.glb (~tens of KB, no textures).

## 4. The choreography loop (inside the existing 18 s linger)

1. Verdict edge (null→non-null, the PatronBody seam): table patron
   plays his SPECIES' verdict pose (per-species pose tables — data;
   dragon: wing-flare = delighted, neck-droop = hungry, head-turn-away
   + tight wings = refused; bipeds start from the ogre tables).
2. After the verdict hold: THE WALK-OFF — the served giant turns and
   ambles back along the DEPARTURE LANE (the road corridor is ~34 m
   wide: arrivals queue one lane, departures pass them on the other),
   despawning in the fog band he came from.
3. THE ADVANCE — every line giant slides one slot forward (~2.5 s,
   ghosts' walk-bob grammar at giant weight); a fresh impostor
   condenses at the back.
4. THE ARRIVAL — slot 0's giant covers the last ~45 m to the table
   with the walk-bob; PatronBody is re-hosted on him at the fresh-deal
   edge (verdict→null), so a standing verdict never replays on a
   fresh arrival. Late joiners skip all theatre and snap to derived
   state. Runover: the line advanced and waits forever — correct, and
   the joke.

## 5. Code shape

- `client/cast.ts` — CAST, castIndexForRung, lineSlots(rung) →
  [{queueIndex, species, x, z, yaw, tier}] (pure, pinned).
- `client/patron-body.ts` — riders: wingL/wingR join DRIVEN_BONES
  with a slow settle in the breathing idle (absent bones already
  skip — ogre unaffected, pinned); optional per-species POSES table
  in the constructor (default = ogre's).
- `client/patron-table.ts` — the table body: species swap through the
  loader seam (fallback: species model → ogre → none), departure/
  arrival state machine (frame-counted), hosts PatronBody.
- `client/line.ts` — the queue: clone management keyed by queueIndex,
  tier assignment, advance animation, far-crowd InstancedMesh.
- `client/main.ts` — the ogre block is REPLACED by PatronTable +
  LineManager; the frame loop feeds both from view (rung, verdict,
  patron seq). __game keeps getPatronBody.

## 6. Verification

- cast.test.ts: determinism; no consecutive repeats (long horizon);
  all species appear; slot geometry inside the road corridor; THE
  ADVANCE IDENTITY pinned (speciesAtSlot(r+1, i) === speciesAtSlot(r,
  i+1)).
- patron-body.test.ts: wing settle present when wing bones exist,
  ogre skeleton unaffected; species pose tables drive the right bones.
- Live structural smoke: table species matches castIndexForRung(rung)
  across seam rung-jumps; line positions match lineSlots; far crowd
  arrives MeshBasicMaterial fog:false; console clean.
- The eye pass (the loom of the full line from the post) is the
  visionary's.

## 7. Deferred out of this slice (named so they don't creep)

- Species-themed ORDER CONTENT + patron voice (game/ territory, the
  real prize — its own design session; promotes cast.ts to game/).
- The EAT beat (dessert vanishing into the patron — slice 7 verdict
  spectacle territory).
- Cyclops (walks the road when his .blend lands; CAST grows by one
  line).
- Per-species verdict pose TUNING beyond readable v1 (eye pass).

## Ledger

- 2026-07-12: proposed (endless-line ruling), then BLESSED same day
  with the unified fiction + shuffle amendment.
- 2026-07-12 (seventeenth session): the visionary's two eye notes
  tuned. THE OPENING PIN — rung 1 is ALWAYS the ogre (hard pin in
  castIndexForRung, shuffle walks from rung 2; a lucky seed would
  have reshuffled the moment the cast grows — Cyclops looms).
  LINE_SLOT0_X 66→50 (the table gap read "a little far"); arrival
  walk shortens ~2.4 s → ~1.5 s.
- 2026-07-12 (seventeenth session, eye note): THE BREATH DESYNC — the
  whole cast heaved as one metronome (every PatronBody booted phase 0
  at one fixed rate). PatronBody gains an `individuality` seed (the
  QUEUE INDEX — the advance identity keeps a giant's own breath as he
  walks up and takes the table): seeded phase offset + ~±15% rate,
  deterministic across clients. Pinned. Observed sibling, unruled:
  walk-bob phases also sync (all advancing giants bob in step).
- 2026-07-12: BUILT same session. cast.ts (12 pins — incl. the
  MULBERRY FIRST-DRAW LAW: mulberry32's first output correlates
  across nearby seeds; Knuth-hash the seed AND burn a draw, or the
  "shuffle" alternates two species for eight rungs straight — found
  live), patron-body riders (wing settle + per-species tables, 13
  pins), patron-table.ts + line.ts (thin painters), giants_far.glb
  297 KB (4 impostors, 419–784 tris). Worker-shim theatre smoke:
  verdict → same-beat handoff (table flip + head walk-off) → smooth
  advance → fresh deal with no snap; rung-jump snap verified. One
  live bug fixed: the advanced (+1) line config must be verdict-gated
  or a runover restart strands the line a slot ahead. 429 tests.
