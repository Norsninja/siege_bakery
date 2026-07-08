/**
 * Two-town union study (towns arc, plans/09 §4/§9; 2026-07-05) —
 * SPEC-PARAMETERIZED 2026-07-08 (fourth session, plans/13 slice 3).
 *
 * Usage: `npx tsx project/research/11-two-town-union.mts [specId] [maxNotch]`
 *   - specId: a DESSERT_SPECS wire id (default cake-3 — the anchor).
 *   - maxNotch: cap the tilt ladder (default TILT_MAX_NOTCH) — the clamp
 *     check (plans/15 item 2) runs cake-3 at 12 and compares.
 *
 * PARAMETERIZATION ZERO-DRIFT PIN: `cake-3` must reproduce the RE-RUN
 * 2026-07-08 numbers below EXACTLY — census 661 (218 tops / 443 walls),
 * one town 79.0% (≤8) / 81.2% (≤9) / 90.3% (≤10), union 100.0% at ≤8,
 * overlap 57.9% / 62.9% / 80.9% — or the parameterization drifted.
 * [VERIFIED 2026-07-08 fourth session, twice: at the historic 18-notch
 * ladder (11115 shots) AND at maxNotch 12 (7605 shots) — BOTH reproduce
 * every number above exactly. The second run was THE CLAMP CHECK
 * (plans/15 item 2): notches 13–18 bought zero coverage, so
 * TILT_MAX_NOTCH clamped to 12 (game/catapult.ts) and the default
 * ladder here — which rides the constant — now IS the clamped one.]
 * The grid and splat law now IMPORT the real
 * core/frosting functions (buildCensus via dessertGeometry().samples,
 * splatSamples) instead of mirroring their constants — the "keep in
 * step" hazard of the old header is gone; a census or splat ship reaches
 * this tool by import. Walls are samples whose normal has no +y (tier
 * walls face radially out).
 *
 * Original questions + method (2026-07-05), unchanged: town 2 sits
 * point-mirrored across the cake's vertical axis, so ONE physics sweep
 * (traverse −16..16 × 0.5°, notches, clicks 4..12) serves both towns —
 * every town-1 first impact (x, y, z) maps to a town-2 impact
 * (−x, y, 2·CAKE_Z − z) at the same speed. Reachable set = union of
 * splat paint-sets; union/intersect answer the ceiling, the permanent
 * gap, and the contested overlap.
 *
 * MEASURED HISTORY (cake-3, kept as the record):
 *   2026-07-05 (historic 15°×3 tilt ladder): town 1 43.7% (≤8) / 55.7%
 *     (≤9) — research/06+10 reproduction; union 75.2% (≤8) / 84.4% (≤9),
 *     clicks 10–12 flat; overlap 12.4% (≤8) / 27.4% (≤9); permanent gap
 *     15.6% = ledge slots + mid-wall moats + a thin ±x sliver. Those
 *     numbers hold ONLY for the historic ladder — reproduce them by
 *     pinning the notch loop back to 0–3 × 15°, never by trusting a
 *     vernier run to match.
 *   RE-RUN 2026-07-08 (vernier envelope, notch 0..18 × 2.5°, 11115
 *     shots): ONE TOWN 79.0% (≤8) / 81.2% (≤9) / 90.3% (≤10) — click 10
 *     buys real reach (+9.1pt). UNION 100.0% at ≤8 ALREADY — the
 *     permanent gap is GONE (trajectory diversity bridges the moat:
 *     direct tier-1 mid-wall hits 12→57; ledge slots take balls at every
 *     azimuth). OVERLAP 57.9% (≤8) / 62.9% (≤9) / 80.9% (≤10).
 *     TOWN_POTENTIAL re-pinned [0, 0.9, 1.0, 1.0, 1.0] at the shipped
 *     ≤10 envelope. DESIGN READ: towns = throughput + contested ground,
 *     not reach ceiling; campaign numbers start HERE.
 *
 * STANDING RE-PIN TOOL (the re-pin law of the ladder, plans/13 §4): no
 * rung row's ask is pinned until ITS spec has run through this and
 * research/13. Runtime ~2–4 min per spec.
 */
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT, GRAVITY } from "../../src/core/constants";
import { launchOrigin, launchVelocity } from "../../src/core/ballistics";
import { ProjectileManager } from "../../src/core/projectiles";
import { MACHINE_BASE, CAKE_Z, buildArenaColliders } from "../../src/core/arena";
import {
  DESSERT_SPECS,
  dessertGeometry,
  specById,
} from "../../src/core/dessert";
import { splatSamples } from "../../src/core/frosting";
import { TILT_DEG_PER_NOTCH, TILT_MAX_NOTCH } from "../../src/game/catapult";

const specId = process.argv[2] ?? "cake-3";
const spec = specById(specId);
if (!spec)
  throw new Error(
    `unknown spec "${specId}" — rows: ${DESSERT_SPECS.map((s) => s.id).join(", ")}`,
  );
const maxNotch = process.argv[3] ? Number(process.argv[3]) : TILT_MAX_NOTCH;
if (!Number.isInteger(maxNotch) || maxNotch < 0 || maxNotch > TILT_MAX_NOTCH)
  throw new Error(`maxNotch must be an integer 0..${TILT_MAX_NOTCH}`);

const geom = dessertGeometry(spec);
const GRID = geom.samples;
const N = GRID.length;
/** Tier walls face radially out (normal.y 0); tops face up. */
const isWall = (i: number): boolean => GRID[i]!.normal.y === 0;
const wallCount = GRID.filter((_, i) => isWall(i)).length;
console.log(
  `spec ${spec.id} · ladder 0..${maxNotch} × ${TILT_DEG_PER_NOTCH}°`,
);
console.log(
  `census: ${N} samples (${N - wallCount} tops / ${wallCount} walls)`,
);

await RAPIER.init();

// One sweep, clicks 4..12 (research/10's harness verbatim); every town-1
// AND town-2 reachable set below derives from these impacts.
interface Fired {
  label: string;
  clicks: number;
  pos: { x: number; y: number; z: number };
  speed: number;
}
const impacts: Fired[] = [];
let fired = 0;
for (let trav = -16; trav <= 16; trav += 0.5) {
  for (let notch = 0; notch <= maxNotch; notch++) {
    for (let clicks = 4; clicks <= 12; clicks++) {
      const world = new RAPIER.World(GRAVITY);
      world.timestep = FIXED_DT;
      buildArenaColliders(world); // arena statics (ground spans both forts)
      geom.buildColliders(world); // the spec's dessert, per plans/13 §3
      // Belt-and-braces far slab: the arena slab ends at z=−78; a
      // measurement shot must never fall off the world (kept from the
      // pre-extension harness — overlapping the arena ground at the same
      // height is sim-identical where they overlap).
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
        const ev = mgr.step(world, geom);
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

// Town 2 = town 1 rotated 180° about the cake axis (0, CAKE_Z):
// a town-1 splat at (x, y, z) is a town-2 splat at (−x, y, 2·CAKE_Z − z).
function mirror(p: { x: number; y: number; z: number }) {
  return { x: -p.x, y: p.y, z: 2 * CAKE_Z - p.z };
}

/** Reachable set for a click ceiling = union of all splat paint-sets
 * (research/10's greedy ceiling saturates to exactly this union). The
 * paint law is the REAL splatSamples — law A, by import. */
function reachable(maxClicks: number, mirrored: boolean): Set<number> {
  const covered = new Set<number>();
  for (const f of impacts) {
    if (f.clicks > maxClicks) continue;
    const pos = mirrored ? mirror(f.pos) : f.pos;
    for (const i of splatSamples(GRID, pos, f.speed)) covered.add(i);
  }
  return covered;
}

const pct = (s: number) => ((100 * s) / N).toFixed(1) + "%";
const catCount = (idx: Iterable<number>) => {
  let tops = 0;
  let walls = 0;
  for (const i of idx) (isWall(i) ? walls++ : tops++);
  return { tops, walls };
};

console.log("\n=== TWO-TOWN UNION / OVERLAP per TENSION_MAX_CLICKS candidate ===");
for (const maxClicks of [8, 9, 10, 11, 12]) {
  const r1 = reachable(maxClicks, false);
  const r2 = reachable(maxClicks, true);
  const union = new Set<number>([...r1, ...r2]);
  const both = new Set<number>([...r1].filter((i) => r2.has(i)));
  const neither: number[] = [];
  for (let i = 0; i < N; i++) if (!union.has(i)) neither.push(i);
  const nc = catCount(neither);
  console.log(
    `  ≤${maxClicks} clicks: T1 ${pct(r1.size)} | T2 ${pct(r2.size)} | ` +
      `UNION ${pct(union.size)} (${union.size}/${N}) | OVERLAP ${pct(both.size)} (${both.size}/${N}) | ` +
      `unreachable-by-both ${neither.length} (${nc.tops} tops, ${nc.walls} walls)`,
  );
}

// === THE GAP at the shipped ceiling (≤10 clicks): where can NEITHER town
// paint? Characterize by category, tier, height, azimuth (0° = wall
// normal faces town 1, 180° = faces town 2, 90° = pure side), and — for
// tops — distance from the upper tier's wall (ledge shadow) and the rim.
// Cake-3 under the vernier has NO gap (the RE-RUN); a new spec's gap is
// exactly what its rung's ask must never demand.
{
  const r1 = reachable(10, false);
  const r2 = reachable(10, true);
  const gapIdx: number[] = [];
  for (let i = 0; i < N; i++) if (!r1.has(i) && !r2.has(i)) gapIdx.push(i);
  const gapWalls = gapIdx.filter((i) => isWall(i));
  const gapTops = gapIdx.filter((i) => !isWall(i));
  console.log(
    `\n=== GAP at ≤10 clicks (shipped): ${gapIdx.length}/${N} (${gapTops.length} tops of ${N - wallCount}, ${gapWalls.length} walls of ${wallCount}) ===`,
  );

  if (gapTops.length > 0) {
    console.log("  --- gap TOPS (tier / radial position / |azimuth|) ---");
    for (const i of gapTops) {
      const p = GRID[i]!.pos;
      const ti = spec.tiers.findIndex((t) => Math.abs(t.top - p.y) < 1e-6);
      const t = spec.tiers[ti]!;
      const inner = spec.tiers[ti + 1]?.radius ?? 0;
      const r = Math.hypot(p.x, p.z - CAKE_Z);
      const az = Math.abs((Math.atan2(Math.abs(p.x), p.z - CAKE_Z) * 180) / Math.PI);
      console.log(
        `    tier ${ti + 1} r=${r.toFixed(2)} (ledge+${(r - inner).toFixed(2)}, rim-${(t.radius - r).toFixed(2)}) |az|=${az.toFixed(0)}°`,
      );
    }
  }

  if (gapWalls.length > 0) {
    console.log("  --- gap WALLS by |azimuth| (15° bins) ---");
    const bins = new Map<string, number>();
    let east = 0;
    let west = 0;
    for (const i of gapWalls) {
      const p = GRID[i]!.pos;
      const az = Math.abs((Math.atan2(Math.abs(p.x), p.z - CAKE_Z) * 180) / Math.PI);
      const lo = Math.floor(az / 15) * 15;
      const key = `${lo}-${lo + 15}°`;
      bins.set(key, (bins.get(key) ?? 0) + 1);
      p.x >= 0 ? east++ : west++;
    }
    for (const [k, v] of [...bins.entries()].sort((a, b) => parseInt(a[0]) - parseInt(b[0])))
      console.log(`    |azimuth| ${k}: ${v} wall samples`);
    console.log(`    split: ${east} east (x>0) / ${west} west (x<0)`);

    console.log("  --- gap WALLS by tier and height band ---");
    const byBand = new Map<string, number>();
    for (const i of gapWalls) {
      const p = GRID[i]!.pos;
      const ti = spec.tiers.findIndex((t) => p.y >= t.bottom && p.y <= t.top);
      const key = `tier ${ti + 1} y=${p.y.toFixed(2)}`;
      byBand.set(key, (byBand.get(key) ?? 0) + 1);
    }
    for (const [k, v] of [...byBand.entries()].sort()) console.log(`    ${k}: ${v}`);
  }
}

// === PER-TIER REACH at the shipped ceiling — the RUNGS authoring view:
// which tiers can each line even ASK about (an order row may only
// reference tiers its rung's crew can paint)? Union column = the
// two-town ask's honesty; T1 column = solo's.
{
  const r1 = reachable(10, false);
  const r2 = reachable(10, true);
  console.log("\n=== PER-TIER REACH ≤10 clicks (T1 / union) ===");
  for (let ti = 0; ti < spec.tiers.length; ti++) {
    const t = spec.tiers[ti]!;
    const tierIdx: number[] = [];
    for (let i = 0; i < N; i++) {
      const p = GRID[i]!.pos;
      const onTop = !isWall(i) && Math.abs(p.y - t.top) < 1e-6;
      const onWall =
        isWall(i) &&
        p.y >= t.bottom &&
        p.y <= t.top &&
        Math.abs(Math.hypot(p.x, p.z - CAKE_Z) - t.radius) < 1e-6;
      if (onTop || onWall) tierIdx.push(i);
    }
    const t1 = tierIdx.filter((i) => r1.has(i)).length;
    const un = tierIdx.filter((i) => r1.has(i) || r2.has(i)).length;
    console.log(
      `  tier ${ti + 1} (r${t.radius}, y${t.bottom}–${t.top}): ${tierIdx.length} samples · T1 ${((100 * t1) / tierIdx.length).toFixed(1)}% · union ${((100 * un) / tierIdx.length).toFixed(1)}%`,
    );
  }
}
