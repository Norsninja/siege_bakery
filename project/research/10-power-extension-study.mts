/**
 * Power-extension study (towns arc, plans/09 §4/§9; 2026-07-05).
 * Questions from the direction session:
 *   1. FAR TOPS: what does each winch click beyond today's 8 buy in
 *      far-hemisphere top coverage (steep lobs descending past the crown)?
 *      Far WALLS are geometry — a ballistic from one town can never strike
 *      a surface facing away — so the one-town ceiling should rise toward
 *      "all tops + near walls" and stop; the towns motive must survive.
 *   2. THE TOLL: can an overshot high-power lob reach the MIRRORED town-2
 *      plaza (z' = 2·CAKE_Z − z of the machine base)? The collateral
 *      frosting toll (research/08 §1, "you frosted MY town!") needs misses
 *      that plausibly land there.
 *
 * Method: one envelope sweep like research/06 (traverse −16..16 × 0.5°,
 * notch 0–3) but clicks 4..12; greedy set-cover per click-ceiling subset
 * (≤8 must reproduce research/06's 43.7% — the sanity pin). All first
 * impacts retained; ground impacts beyond the cake classify as overshoot
 * and report distance to the mirrored town-2 base.
 *
 * Run: `npx tsx project/research/10-power-extension-study.mts` (~3–4 min).
 *
 * MEASURED 2026-07-05 (the numbers the towns slice pins from):
 *   ≤8 clicks (today): 43.7% ceiling — reproduces research/06's pin.
 *   ≤9 clicks: 55.7% — ONE extra click buys the ENTIRE skill ceiling
 *     (far tops 27→61 of 109, terminator side-walls 17→62 of 221);
 *     clicks 10/11/12 add NOTHING to coverage — the envelope saturates.
 *     44.3% of the dessert (the back wall arc above all) stays town-2
 *     exclusive at ANY power: the towns motive survives.
 *   THE TOLL: 8 clicks can't reach the mirrored plaza (nearest 9.9m).
 *     9 clicks: fringe (21 shots within 6m). 10 CLICKS: BULLSEYE — 19
 *     within 3m, nearest 0.3m from the T2 base (matches flat-arc math:
 *     ~19.4 m/s for the 36m range). 11–12 fly OVER the town (nothing
 *     within 3m) — pure waste, no toll, no coverage.
 *   RECOMMENDATION: TENSION_MAX_CLICKS = 10. Click 9 = the far-top lob
 *     (skill); click 10 = toll range (comedy/risk); beyond = nothing.
 *     Max speed 19 m/s keeps WAKE_RADIUS 1.0 valid (0.32m/tick + 0.6
 *     closing < 1.0); 12 clicks would break it. Crank cost of a full
 *     draw rises 6s → 7.5s — the far lob stays expensive on purpose.
 *   TOWN_POTENTIAL stays pinned at 0.42 (rung-authored asks, plans/09
 *     §4): the pass never assumes expert lobs; reach 0.557 over a 0.42
 *     denominator is exactly the 2★/3★ climbing territory.
 *     [POST-SPLIT NOTE 2026-07-07: under Option B that 0.42 is now
 *     TOWN_ASK_POTENTIAL[1]; TOWN_POTENTIAL[1] is the measured 0.55.]
 *   ARENA DEBT: the greybox ground (±40) ends 8m short of the mirrored
 *     town-2 base (z=-48) — the towns slice must extend it (this study
 *     adds its own strip at z=-60, see the fire loop).
 *
 * NOTE: splat/census constants MIRROR src/core/frosting.ts (law A on the
 * G1 area-honest grid) — keep in step after any splat ship, same as
 * research/06.
 */
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT, GRAVITY } from "../../src/core/constants";
import { launchOrigin, launchVelocity, SPLAT_SPEED } from "../../src/core/ballistics";
import { ProjectileManager } from "../../src/core/projectiles";
import { MACHINE_BASE, CAKE_TIERS, CAKE_Z, buildArenaColliders } from "../../src/core/arena";
import { TILT_DEG_PER_NOTCH } from "../../src/game/catapult";

// Law A splats (shipped) on the G1 area-honest grid (0.45/0.45).
const DOLLOP = 0.6;
const BASE = 0.7;
const PER = 0.05;
const MAX = 1.1;
const BAND = 0.8;
const TOP_S = 0.45;
const WALL_S = 0.45;

interface Pt { x: number; y: number; z: number; wall: boolean }
function buildGrid(): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < CAKE_TIERS.length; i++) {
    const t = CAKE_TIERS[i]!;
    const inner = CAKE_TIERS[i + 1]?.radius ?? 0;
    if (inner === 0) pts.push({ x: 0, y: t.top, z: CAKE_Z, wall: false });
    for (let r = inner + TOP_S * 0.6; r <= t.radius - 0.15; r += TOP_S) {
      const n = Math.max(6, Math.round((2 * Math.PI * r) / TOP_S));
      for (let k = 0; k < n; k++) {
        const a = r + (2 * Math.PI * k) / n;
        pts.push({ x: r * Math.cos(a), y: t.top, z: CAKE_Z + r * Math.sin(a), wall: false });
      }
    }
    const n = Math.max(6, Math.round((2 * Math.PI * t.radius) / WALL_S));
    for (let y = t.bottom + WALL_S * 0.55; y <= t.top - 0.2; y += WALL_S) {
      for (let k = 0; k < n; k++) {
        const a = y * 2.4 + (2 * Math.PI * k) / n;
        pts.push({ x: t.radius * Math.cos(a), y, z: CAKE_Z + t.radius * Math.sin(a), wall: true });
      }
    }
  }
  return pts;
}
const GRID = buildGrid();
const N = GRID.length;
console.log(
  `census: ${N} samples (${GRID.filter((p) => !p.wall).length} tops / ${GRID.filter((p) => p.wall).length} walls)`,
);

function paintSet(pos: { x: number; y: number; z: number }, speed: number): number[] {
  const r = speed < SPLAT_SPEED ? DOLLOP : Math.min(MAX, BASE + PER * (speed - SPLAT_SPEED));
  const r2 = r * r;
  const out: number[] = [];
  for (let i = 0; i < N; i++) {
    const s = GRID[i]!;
    if (Math.abs(s.y - pos.y) > BAND) continue;
    const dx = s.x - pos.x;
    const dz = s.z - pos.z;
    if (dx * dx + dz * dz <= r2) out.push(i);
  }
  return out;
}

await RAPIER.init();

// One sweep, clicks 4..12; every ceiling below derives from subsets.
interface Fired {
  label: string;
  clicks: number;
  pos: { x: number; y: number; z: number };
  speed: number;
}
const impacts: Fired[] = [];
let fired = 0;
for (let trav = -16; trav <= 16; trav += 0.5) {
  for (let notch = 0; notch <= 3; notch++) {
    for (let clicks = 4; clicks <= 12; clicks++) {
      const world = new RAPIER.World(GRAVITY);
      world.timestep = FIXED_DT;
      buildArenaColliders(world);
      // The arena's greybox ground ends at z=-40 — 8m SHORT of the mirrored
      // town-2 base (-48). Extend it for this study so long overshoots LAND
      // instead of falling off the world (first run artifact: clicks ≥10
      // reported "no overshoots" because their landings never impacted).
      // The towns slice must grow the real arena the same way.
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(40, 0.1, 20).setTranslation(0, -0.1, -60),
      );
      const mgr = new ProjectileManager();
      mgr.spawn(
        world,
        launchOrigin(MACHINE_BASE, trav),
        launchVelocity(trav, clicks, notch * TILT_DEG_PER_NOTCH),
        "frosting",
        { consumeOnImpact: true },
      );
      fired++;
      for (let i = 0; i < 3600; i++) {
        const ev = mgr.step(world);
        const im = ev.impacts[0];
        if (im) {
          impacts.push({
            label: `t${trav}/n${notch}/c${clicks}`,
            clicks,
            pos: im.pos,
            speed: im.speed,
          });
          break;
        }
      }
    }
  }
}
console.log(`fired ${fired}, impacts ${impacts.length}`);

interface Shot { label: string; set: number[] }
function greedyCeiling(shots: Shot[]): { frac: number; farTops: number; farWalls: number; shotsUsed: number } {
  const covered = new Set<number>();
  let n = 0;
  for (;;) {
    let best: Shot | null = null;
    let gain = 0;
    for (const s of shots) {
      let g = 0;
      for (const i of s.set) if (!covered.has(i)) g++;
      if (g > gain) {
        gain = g;
        best = s;
      }
    }
    if (!best || gain === 0) break;
    for (const i of best.set) covered.add(i);
    n++;
  }
  let farTops = 0;
  let farWalls = 0;
  for (const i of covered) {
    const p = GRID[i]!;
    if (p.z < CAKE_Z) p.wall ? farWalls++ : farTops++;
  }
  return { frac: covered.size / N, farTops, farWalls, shotsUsed: n };
}

const allFarTops = GRID.filter((p) => !p.wall && p.z < CAKE_Z).length;
const allFarWalls = GRID.filter((p) => p.wall && p.z < CAKE_Z).length;
console.log(`\nfar hemisphere (z < CAKE_Z): ${allFarTops} top samples, ${allFarWalls} wall samples`);

console.log("\n=== ONE-TOWN CEILING per TENSION_MAX_CLICKS candidate ===");
for (const maxClicks of [8, 9, 10, 11, 12]) {
  const shots: Shot[] = impacts
    .filter((f) => f.clicks <= maxClicks)
    .map((f) => ({ label: f.label, set: paintSet(f.pos, f.speed) }))
    .filter((s) => s.set.length > 0);
  const r = greedyCeiling(shots);
  console.log(
    `  ≤${maxClicks} clicks: CEILING ${(100 * r.frac).toFixed(1)}% ` +
      `(far tops ${r.farTops}/${allFarTops}, far walls ${r.farWalls}/${allFarWalls}, greedy ${r.shotsUsed} shots, pool ${shots.length})`,
  );
}

// === THE TOLL: overshoot landings vs the mirrored town-2 base ===
// Ground impact beyond the cake = first contact low (ball center ~0.3m)
// and radially outside the bottom tier, on the far side (z < CAKE_Z).
const T2 = { x: MACHINE_BASE.x, z: 2 * CAKE_Z - MACHINE_BASE.z };
console.log(
  `\n=== OVERSHOOT TOLL (mirrored town-2 base at x=${T2.x.toFixed(1)}, z=${T2.z.toFixed(1)}) ===`,
);
const R0 = CAKE_TIERS[0]!.radius;
for (let clicks = 8; clicks <= 12; clicks++) {
  const overs = impacts.filter(
    (f) =>
      f.clicks === clicks &&
      f.pos.y < 0.45 &&
      f.pos.z < CAKE_Z &&
      Math.hypot(f.pos.x, f.pos.z - CAKE_Z) > R0,
  );
  if (overs.length === 0) {
    console.log(`  ${clicks} clicks: no far-side ground overshoots`);
    continue;
  }
  const dists = overs.map((f) => Math.hypot(f.pos.x - T2.x, f.pos.z - T2.z));
  const min = Math.min(...dists);
  const within3 = dists.filter((d) => d <= 3).length;
  const within6 = dists.filter((d) => d <= 6).length;
  console.log(
    `  ${clicks} clicks: ${overs.length} far overshoots — nearest ${min.toFixed(1)}m from T2 base, ${within3} within 3m, ${within6} within 6m`,
  );
}
