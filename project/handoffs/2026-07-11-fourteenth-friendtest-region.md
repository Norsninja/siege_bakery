# Handoff — 2026-07-11 (fourteenth session) — THE FRIEND TEST PASSES + THE REGION RISES

## 1. Snapshot

Four commits, all pushed, ending 81fb845. 415 tests, both tsc legs,
dist 21 MB. THE FRIEND TEST PASSED (CLAUDE.md's success line): the
visionary hosted from his PC via cloudflared quick tunnel, a real
friend joined by URL and played. Verdict: "it's fun" + "can't wait to
see it styled." This session shipped: stone walls (meshy wall optimized
25 MB → 0.34), the tunnel runbook (rehearsed end to end), the asset
diet as a pipeline command (ogre 9.6→2.5, dwarf 4.4→1.2), the ogre
re-ruled to 36 m, and THE REGION first pass (mountains, dwarf castle,
giants' road, hamlets, sky — region.glb 1.8 MB + sky.glb 127 KB).
Next session: region structure rules + populating it, possibly with
dispatched agents; the visionary is generating giant patron models
externally and bringing them back.

## 2. What changed this session

- 9225275 THE WALLS DRESS IN STONE: visionary's meshy_wall.blend
  (25 MB) audited/optimized in Blender: decimate 0.03 (6.6k tris),
  black emissive dropped (GLB parse caught exporter's white
  emissiveFactor trap — removing an emission TEXTURE node leaves
  Emission Color white × strength 1 = glowing model; zero both),
  textures resized as duplicates (base/normal 1024, ORM 512 + the §10
  roughness lift 0.67→0.85), JPEG forced on export (AUTO re-encoded
  resized images as PNG at 3 MB; JPEG = 0.34 MB). Conformed to sim:
  0.5 deep × 1.0 tall (WALL_HEIGHT), base y=0, width 1.899 = tiling
  unit. scene.ts: wallSegments() pure tiler (integer count per
  collider slab, stretch ≤ ~1.32, z-walls quarter-turned, alternates
  yaw-flipped) + thin painter; grey slabs hide-not-dispose. 86
  segments live-verified on collider lines. +3 pins.
- a4e1815 THE CAST GOES ON A DIET + the tunnel runbook:
  scripts/model-diet.mjs = `npm run diet -- <name>` (gltf-transform +
  sharp): drops measured-black emissive (meshy packs one on EVERY
  export), baseColor/normal ≤1024, metallicRoughness ≤512, JPEG q90
  one pass, HARD-FAILS if node/bone names change. ogre 9.62→2.46 MB
  (VRAM ~67→13), dwarf 4.42→1.15. Rigs live-smoked after rewrite
  (PatronBody look-lean hits recipe offsets; ghost dresses, feet
  −0.85). research/17-friend-test-tunnel-runbook.md: the recipe
  (build + server 5175 + tools/cloudflared.exe quick tunnel — already
  vendored, gitignored), measured throughput (~4–5 MB/s, ogre 2.2 s),
  MIME-restart law, THE HIDDEN-PANE TRAP (below). Art bible §10 gains
  THE SHIPPING DIET.
- af1d175 THE OGRE GROWS: 36 m ruled (OGRE_SCALE = 36/21 in main.ts;
  GLB still ships 21 m). Rationale: cake-3 was 40% of his height at
  21 m — a feast, not his dessert. Provisional until the region
  argues. plans/16 §6 ruling 8 re-ruled in place.
- 81fb845 THE REGION RISES: project/blender/region.blend (hand-
  authored, TRACKED) built via MCP on a ref scaffold (ref_* arena
  slab/ogre 36 m/cake/towns + check_cam at post eye, hidden from
  render, never exported). Contents: near_skirt (96² grid, arena flat,
  haze baked toward rim), near_road (giants' road, ogre table → +x
  horizon), mid_town_west/road/south (pink/cream/brick hamlets),
  far_range_outer/inner (peak rings r~320/~260, gaps at road exit +x
  and hero arc), far_mountain_hero (135 m, snow caps), far_castle
  (carved into hero flank, pink cone caps), sky_dome (r 430 inverted,
  gradient) + sky_cloud_0..6. All vertex color (FLOAT_COLOR "Col",
  POINT domain), one shared material, COLOR_0 exports. scene.ts:
  camera far 200→500; fog 60–120→80–280; backdropTreatment() +
  dressBackdrop() (far_/sky_ → MeshBasicMaterial vertexColors
  fog:false; near_/mid_ stay lit+fogged; unknown prefix = lit). +2
  pins. Live-verified 11 meshes at treatments, zero console errors,
  screenshot confirmed the composition in-game.

## 3. Architecture and invariants (new this session)

- THE ATMOSPHERE RULE: backdrop mesh NAME PREFIX is the contract —
  near_/mid_ lit + scene fog; far_/sky_ unlit + fog-exempt (haze is
  BAKED in vertex colors). New region meshes must keep the prefixes.
- THE SHIPPING DIET: every meshy GLB runs `npm run diet -- <name>`
  before shipping. The script guards bone names itself. Hand-road
  GLBs are a no-op through it.
- EMISSIVE TRAP (Blender): removing an emission texture node leaves
  Emission Color white — zero Color AND Strength or the GLB glows.
  Meshy ships a black emissive texture on every export — drop it.
- glTF exporter re-encodes RESIZED images as PNG under AUTO — force
  JPEG (export_image_format or the diet script).
- Region authoring map: game(x,y,z) = blender(x, z_up, −y)… stated
  plainly: blender (bx, by, bz) → game (bx, bz, −by). Ogre game
  (21, 0, −30) = blender (21, 30, 0).
- wallSegments() tiling law: integer sections per collider slab,
  length-stretch lands exactly, wall.glb authored 1.899 × 0.5 × 1.0
  at base origin = the collider cross-section (render contract).
- Camera far 500 and fog 80–280 are REGION constants — revisit both
  together if either moves.
- Fallback law held everywhere: wall/region/sky null → greybox/
  green-slab look forever.

## 4. File map (delta)

- src/client/scene.ts — WALL_SEG_LEN + wallSegments() + wall dress in
  buildGameScene; backdropTreatment()/dressBackdrop() + region/sky
  loads; camera far 500; fog 80–280.
- src/client/scene.test.ts — +5 pins (wall tiling ×3, backdrop ×2).
- src/client/main.ts — OGRE_SCALE = 36/21 at the ogre load.
- scripts/model-diet.mjs — the diet pipeline (npm run diet -- <name>).
- public/models/ — wall.glb 0.34 NEW, region.glb 1.8 NEW, sky.glb
  0.13 NEW, ogre.glb 2.46 (was 9.6), dwarf.glb 1.15 (was 4.4).
- project/blender/region.blend NEW tracked (hand road source of
  record, ref scaffold inside); meshy_wall.blend untracked (gitignored
  by name, §10 law).
- project/research/17-friend-test-tunnel-runbook.md NEW.
- project/research/16-art-bible.md — §10 + THE SHIPPING DIET.
- project/plans/15-side-quests.md — item 14 FIRST SERVING BUILT.
- project/plans/16-the-audiovisual-milestone.md — slice 4.75 THE
  REGION added; §6 ruling 8 re-ruled 36 m.

## 5. How to run, test, verify

npm run check (415 green at 81fb845). npm run diet -- <name> for any
meshy import. Tunnel: research/17 runbook (server restart for MIME,
tools/cloudflared.exe vendored). Driver facts (memory:
game-smoke-driver-notes has the full stack):
- THE HIDDEN-PANE TRAP: a hidden Browser pane fires NO rAF — HUD
  freezes at "joining the bakery…" on a HEALTHY join. Oracles: room
  server log (baker N connected), getMyId() non-null (dev), raw
  WebSocket probe, rAF-counter probe (0 = hidden, case closed). PROD
  builds have no __game — server log is the only join oracle.
- Region smoke: traverse scene for near_skirt/far_mountain_hero/
  sky_dome etc.; far_/sky_ must be MeshBasicMaterial fog:false
  vertexColors:true; near_/mid_ MeshStandardMaterial fog:true.
- Blender region work: region.blend holds check_cam at post eye
  (blender (1.5, 11, 1.6), rx 90 = look at cake axis). Sky meshes need
  visible_shadow=False + emission preview material in Blender or EEVEE
  renders black (the dome shadows the world). read_homefile
  invalidates MCP context mid-script — file switches in their own call.
- Export recipe: select near_/mid_/far_ → region.glb; sky_ → sky.glb;
  GLB use_selection export_apply; ref_/check_ never export; reassign
  the lit "vtx" material to sky pieces pre-export so COLOR_0 rides.

## 6. Open items and decisions

DECIDED (do not re-litigate): 36 m ogre (provisional only against the
region read); fog 80–280 + far 500; atmosphere prefixes; hybrid
region authorship (build sessions rough it out, visionary flairs);
splat feedback = juice first (SFX/FX), balance pass only if still
wanted after — power-ups stay the growth mechanic; SFX approach =
hybrid table (synth rows for mechanical metronomes like the winch
ratchet, sample rows for character sounds like the SPLAT); region
won't bottleneck size (hand road, vertex colors).
OPEN:
- Visionary flair pass on region.blend: hero rock/snow contrast
  (runs pale in-game), skirt-to-slab green seam, cloud placement.
- Friend-test debrief items not yet ledgered as builds: E-key
  onboarding for non-gamers (prompt AT the object, not screen edge —
  new plans/15 item candidate), splat juice rows, loading-line
  presentation ("the patron approaches…").
- Committed capture (project/concept/captures/) — pane worked this
  session; the frame has never been better.
- Audio is the fattest dist block (11.3 of 21 MB) — bitrate pass is
  the visionary's ear; check whether MP3s fetch eagerly at boot.
- Meshy license tier check (before the deck). Ear/eye passes (8).
- Standing ledger unchanged otherwise: name (slice 8), linger/runover
  playlist rows, items 6/8/11, audit tranche C, wind + Bite re-pin,
  slice 4 remainders (first-person hands, carried-topping wire
  archaeology, dwarf identity).

## 7. Next session focus

Visionary's words: continue the region — "create rules for
structures, then start populating it; we could dispatch agents with
the rules in hand to make an object, or programmatically make
objects; it is fun collaborating with many AI to build a fantasy
realm." He is generating GIANT PATRON models externally (meshy road,
slice 3 casting — distinct species per ruling) and will bring them
back for the region/line. Suggested shape: (1) author the STRUCTURE
RULES doc (a region style guide: proportions, palette hexes from the
build, silhouette language, name prefixes, export recipe — art bible
§12 or plans/19 candidate) so any agent/session can build a conforming
object; (2) then populate (more hamlets, road furniture, region props)
— possibly via dispatched agents each holding the rules; (3) receive
the visionary's giants through the meshy road + diet when they arrive.

## 8. Recommended reading order

1. This handoff.
2. project/plans/16-the-audiovisual-milestone.md — slice 4.75 THE
   REGION (what stands, open flair), slice 3 THE LINE (the giants
   return to it), §6 rulings.
3. project/research/16-art-bible.md §10–11 (+ THE SHIPPING DIET) —
   both roads; the structure-rules doc will extend these.
4. src/client/scene.ts — backdropTreatment/dressBackdrop + the region
   loads; wallSegments (the tiling pattern for repeated structures).
5. project/blender/region.blend via Blender MCP (get_objects_summary)
   — the scaffold and mesh inventory; §5 export recipe above.
6. project/research/17-friend-test-tunnel-runbook.md (if the tunnel
   comes up again).
7. git log --oneline -5; memory: game-smoke-driver-notes (hidden-pane
   trap tops the stack).
