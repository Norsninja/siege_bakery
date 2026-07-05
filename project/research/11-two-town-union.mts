/**
 * Two-town union study (towns arc, plans/09 §4/§9; 2026-07-05).
 * Questions for the towns slice — town 2 sits POINT-MIRRORED across the
 * cake's vertical axis (research/10's T2 base at z = 2·CAKE_Z − z₁):
 *   1. UNION CEILING: what fraction of the dessert is reachable from
 *      town 1 OR town 2 at ≤8 and ≤9 clicks? Research/10 measured one
 *      town saturating at 55.7% (≤9); does the mirror close the gap?
 *   2. THE PERMANENT GAP: what remains unreachable by BOTH towns — is
 *      there a side-wall band (wall normals perpendicular to BOTH firing
 *      lines, |azimuth| ≈ 90°) that no power can touch? Counts by
 *      category (tops vs walls), like research/10.
 *   3. OVERLAP: what fraction is reachable from BOTH towns — the
 *      contested/shared territory the two-town economy plays over?
 *
 * Method: NO second physics sweep. Town 2's firing solution is town 1's
 * rotated 180° about the cake axis at (0, CAKE_Z), so every town-1 first
 * impact (x, y, z) maps to a town-2 impact (−x, y, 2·CAKE_Z − z) with the
 * same speed. Run research/10's envelope sweep ONCE verbatim (traverse
 * −16..16 × 0.5°, notch 0–3, clicks 4..12, extra ground strip at z=−60),
 * census the SAME G1 grid twice — raw impacts (town 1) and mirrored
 * impacts (town 2) — then union/intersect the covered-point sets. A
 * reachable set is the plain union of splat paint-sets (research/10's
 * greedy ceiling runs until gain = 0, so its ceiling IS that union).
 * SANITY PIN: town-1 numbers must reproduce research/10 — 43.7% at ≤8,
 * 55.7% at ≤9 — or this harness is wrong.
 *
 * Run: `npx tsx project/research/11-two-town-union.mts` (~3–4 min).
 *
 * MEASURED 2026-07-05:
 *   SANITY PIN HOLDS: town 1 alone 43.7% (≤8), 55.7% (≤9) — exact
 *     research/06+10 reproduction. Town 2 alone (mirrored census, same
 *     grid): 43.9% / 56.1% — the +0.2/0.4pt vs town 1 is grid asymmetry
 *     (the top/wall sample spirals a = r + …, a = 2.4y + … are not
 *     mirror-symmetric), not physics; ~1–3 samples out of 661.
 *   UNION ≤8 clicks (today's power): 75.2% (497/661) — two towns at
 *     TODAY'S power already beat one town at ANY power by 19.5pt.
 *   UNION ≤9 clicks: 84.4% (558/661). Clicks 10–12 add NOTHING (84.4%
 *     flat) — same envelope saturation as research/10; the click-10
 *     toll shot buys comedy, never coverage.
 *   OVERLAP (contested, reachable by BOTH): 12.4% (82/661) at ≤8 →
 *     27.4% (181/661) at ≤9. Click 9 MORE THAN DOUBLES the contested
 *     zone — the far-top lob is what makes the two economies collide
 *     ("you frosted MY side" needs click 9 to be a real fight).
 *   THE PERMANENT GAP (≤9+, unreachable by BOTH, at any power): 103
 *     points = 15.6% (30 tops of 218, 73 walls of 443). NOT one clean
 *     side band — two mechanisms, roughly half each:
 *     (a) SIDE BAND, real but a sliver: 35 wall samples at |az| 60–120°
 *         (29 packed in 75–105°), split 37/36 east–west over the whole
 *         gap. Both firing lines run along z; ±x-facing wall patches
 *         take every trajectory grazing — no first impact lands inside
 *         the splat band. Predicted, confirmed, small.
 *     (b) THE MOAT POCKETS: 38 town-facing wall samples + all 30 gap
 *         tops. Every gap top is an annular LEDGE sample (22 of 30 on
 *         the snug ring 0.27 m from the next tier's wall; none on the
 *         crown — open tops are 100% covered). Splat-band arithmetic
 *         from the moat diagnostic: ground splash reaches walls only up
 *         to y 1.18 (max ground impact y 0.38 + 0.8 band), tier-1 ledge
 *         splash only down to y 1.33 (min ledge impact y 2.13 − 0.8),
 *         and direct mid-wall hits (y 0.75–1.75) number just 12 in the
 *         whole ≤9 envelope — so the tier-1 wall band y=1.15/1.60 (26
 *         gaps) is a moat, and tier-2's lower wall (y 2.25/2.70, 32
 *         gaps) hangs off snug ledge-slot impacts that exist only at
 *         |az| 15–75° (+ a few 105–120°) — the slots at dead-oblique
 *         12–36°/144–169° and side 85–100° azimuths never take a ball.
 *         Mirror symmetry makes both towns fail on the SAME pockets.
 *   READ FOR THE TOWNS SLICE: the mirror town closes the far-hemisphere
 *     gap (research/10's 44.3% town-2-exclusive territory is exactly
 *     what union coverage eats), the permanent 15.6% is ledge slots +
 *     mid-wall moats + a thin ±x sliver — decor bands no order should
 *     demand, or turntable/upgrade territory (plans/09 §4) — and
 *     TOWN_POTENTIAL 0.42 stays honest: each town still owns ~0.56
 *     reach over a 0.42 ask, with 0.27 contested.
 *
 * NOTE: splat/census constants MIRROR src/core/frosting.ts (law A on the
 * G1 area-honest grid) — keep in step after any splat ship, same as
 * research/06 and research/10.
 */
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT, GRAVITY } from "../../src/core/constants";
import { launchOrigin, launchVelocity, SPLAT_SPEED } from "../../src/core/ballistics";
import { ProjectileManager } from "../../src/core/projectiles";
import { MACHINE_BASE, CAKE_TIERS, CAKE_Z, buildArenaColliders } from "../../src/core/arena";
import { TILT_DEG_PER_NOTCH } from "../../src/game/catapult";

// Law A splats (shipped) on the G1 area-honest grid (0.45/0.45) —
// verbatim from research/10 so the numbers are comparable.
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
  for (let notch = 0; notch <= 3; notch++) {
    for (let clicks = 4; clicks <= 12; clicks++) {
      const world = new RAPIER.World(GRAVITY);
      world.timestep = FIXED_DT;
      buildArenaColliders(world);
      // The arena's greybox ground ends at z=-40 — 8m SHORT of the mirrored
      // town-2 base (-48). Extend it like research/10 so long overshoots
      // LAND instead of falling off the world.
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

// Town 2 = town 1 rotated 180° about the cake axis (0, CAKE_Z):
// a town-1 splat at (x, y, z) is a town-2 splat at (−x, y, 2·CAKE_Z − z).
function mirror(p: { x: number; y: number; z: number }) {
  return { x: -p.x, y: p.y, z: 2 * CAKE_Z - p.z };
}

/** Reachable set for a click ceiling = union of all splat paint-sets
 * (research/10's greedy ceiling saturates to exactly this union). */
function reachable(maxClicks: number, mirrored: boolean): Set<number> {
  const covered = new Set<number>();
  for (const f of impacts) {
    if (f.clicks > maxClicks) continue;
    const pos = mirrored ? mirror(f.pos) : f.pos;
    for (const i of paintSet(pos, f.speed)) covered.add(i);
  }
  return covered;
}

const pct = (s: number) => ((100 * s) / N).toFixed(1) + "%";
const catCount = (idx: Iterable<number>) => {
  let tops = 0;
  let walls = 0;
  for (const i of idx) (GRID[i]!.wall ? walls++ : tops++);
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

// === THE PERMANENT GAP at ≤9 clicks (the recommended skill ceiling) ===
// Where can NEITHER town paint? Characterize by category, tier, height,
// azimuth (0° = wall normal faces town 1, 180° = faces town 2, 90° =
// pure side), and — for tops — distance from the upper tier's wall
// (ledge shadow) and from the rim.
{
  const r1 = reachable(9, false);
  const r2 = reachable(9, true);
  const gap: Pt[] = [];
  for (let i = 0; i < N; i++) if (!r1.has(i) && !r2.has(i)) gap.push(GRID[i]!);
  const gapWalls = gap.filter((p) => p.wall);
  const gapTops = gap.filter((p) => !p.wall);
  console.log(
    `\n=== PERMANENT GAP ≤9 clicks: ${gap.length}/${N} (${gapTops.length} tops of ${GRID.filter((p) => !p.wall).length}, ${gapWalls.length} walls of ${GRID.filter((p) => p.wall).length}) ===`,
  );

  console.log("  --- gap TOPS (tier / radial position / |azimuth|) ---");
  for (const p of gapTops) {
    const ti = CAKE_TIERS.findIndex((t) => Math.abs(t.top - p.y) < 1e-6);
    const t = CAKE_TIERS[ti]!;
    const inner = CAKE_TIERS[ti + 1]?.radius ?? 0;
    const r = Math.hypot(p.x, p.z - CAKE_Z);
    const az = Math.abs((Math.atan2(Math.abs(p.x), p.z - CAKE_Z) * 180) / Math.PI);
    console.log(
      `    tier ${ti + 1} r=${r.toFixed(2)} (ledge+${(r - inner).toFixed(2)}, rim-${(t.radius - r).toFixed(2)}) |az|=${az.toFixed(0)}°`,
    );
  }

  console.log("  --- gap WALLS by |azimuth| (15° bins) ---");
  const bins = new Map<string, number>();
  let east = 0;
  let west = 0;
  for (const p of gapWalls) {
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
  for (const p of gapWalls) {
    const ti = CAKE_TIERS.findIndex((t) => p.y >= t.bottom && p.y <= t.top);
    const key = `tier ${ti + 1} y=${p.y.toFixed(2)}`;
    byBand.set(key, (byBand.get(key) ?? 0) + 1);
  }
  for (const [k, v] of [...byBand.entries()].sort()) console.log(`    ${k}: ${v}`);

  // Cross: for each tier×band, how many gap walls face a town (|az|<60 or
  // >120) vs side (60–120)? Facing-a-town gaps are HEIGHT shadows (the
  // splat band can't reach them from any impact), side gaps are AZIMUTH
  // shadows (grazing geometry).
  let side = 0;
  let facing = 0;
  for (const p of gapWalls) {
    const az = Math.abs((Math.atan2(Math.abs(p.x), p.z - CAKE_Z) * 180) / Math.PI);
    az >= 60 && az <= 120 ? side++ : facing++;
  }
  console.log(`    side band (60–120°): ${side} | town-facing (<60° or >120°): ${facing}`);
}

// === MOAT DIAGNOSTIC: why do TOWN-FACING wall bands gap? ===
// Splat-band arithmetic from the impact pool itself (≤9 clicks): a wall
// sample is coverable from a ground splash up to (max ground impact y +
// BAND), from a ledge splash down to (min ledge impact y − BAND), or from
// a rare direct mid-wall hit. Where none of the three exists at a given
// azimuth, the band is a moat.
{
  const le9 = impacts.filter((f) => f.clicks <= 9);
  const rOf = (f: Fired) => Math.hypot(f.pos.x, f.pos.z - CAKE_Z);
  const ground = le9.filter((f) => f.pos.y < 0.45);
  const maxGroundY = Math.max(...ground.map((f) => f.pos.y));
  console.log(
    `\n=== MOAT DIAGNOSTIC (≤9 clicks, ${le9.length} impacts) ===\n` +
      `  ground impacts ${ground.length}, max y ${maxGroundY.toFixed(2)} → ground splash reaches walls up to y ${(maxGroundY + BAND).toFixed(2)}`,
  );
  const ledge1 = le9.filter((f) => rOf(f) >= 3.0 && rOf(f) <= 4.0 && f.pos.y > 2.0 && f.pos.y < 2.6);
  const minLedgeY = Math.min(...ledge1.map((f) => f.pos.y));
  console.log(
    `  tier-1 ledge impacts ${ledge1.length}, min y ${minLedgeY.toFixed(2)} → ledge splash reaches walls down to y ${(minLedgeY - BAND).toFixed(2)}`,
  );
  const midWall = le9.filter((f) => rOf(f) > 4.0 && rOf(f) < 4.6 && f.pos.y >= 0.75 && f.pos.y < 1.75);
  console.log(`  direct tier-1 mid-wall hits (r 4.0–4.6, y 0.75–1.75): ${midWall.length} in the whole envelope`);
  const slot = le9.filter((f) => rOf(f) > 3.0 && rOf(f) < 3.6 && f.pos.y > 2.0 && f.pos.y < 3.7);
  const slotBins = new Map<string, number>();
  for (const f of slot) {
    const az = Math.abs((Math.atan2(Math.abs(f.pos.x), f.pos.z - CAKE_Z) * 180) / Math.PI);
    const lo = Math.floor(az / 15) * 15;
    const key = `${lo}-${lo + 15}°`;
    slotBins.set(key, (slotBins.get(key) ?? 0) + 1);
  }
  console.log(`  tier-1 ledge-SLOT impacts (snug vs tier-2 wall, r 3.0–3.6) by |az|:`);
  for (const [k, v] of [...slotBins.entries()].sort((a, b) => parseInt(a[0]) - parseInt(b[0])))
    console.log(`    ${k}: ${v}`);
}
