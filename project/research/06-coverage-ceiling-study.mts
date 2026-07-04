/**
 * Coverage-ceiling study (frosting-economy redesign, 2026-07-03).
 * Question from the visionary: parts of the cake one machine cannot reach
 * are WHY multiple towns exist — grade against POTENTIAL coverage.
 * Measures, with the chosen law-A splats on the area-honest census:
 *   1. ONE TOWN: fire the whole discrete aim envelope (traverse -16..16 by
 *      1° — the cake subtends ~±13° from the machine — notch 0-3, clicks
 *      4-8), greedy set-cover → max reachable coverage (the ceiling) + the
 *      efficient-shot curve.
 *   2. TWO TOWNS: town 2 mirrored across the cake plane (impact z' =
 *      2·CAKE_Z − z; valid by symmetry — cylinders are rotationally
 *      symmetric and town-1 props sit far behind the cake from town 2's
 *      firing line). Painted sets recomputed against the REAL grid.
 *   3. The greedy pick list to the pass tier for one town (win-path test
 *      shot-table source).
 *
 * STANDING RE-PIN TOOL (like research/04 §3): splat-constant or census
 * changes re-run this and re-pin the TOWN_POTENTIAL table in game/tuning.ts.
 * Reproducible: `npx tsx project/research/06-coverage-ceiling-study.mts`.
 * Measured 2026-07-03 (the numbers TOWN_POTENTIAL pins): 1 town 43.7%,
 * 2 towns 75.2%, 3 towns 86.7%, 4 towns 94.6% — one town sees only its
 * near hemisphere of a round cake; every region caps near half.
 *
 * NOTE: the constants below MIRROR src/core/frosting.ts on purpose (this
 * study also runs against PROPOSED laws before they ship); after a ship,
 * keep them in step with the shipped constants.
 */
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT, GRAVITY } from "../../src/core/constants";
import { launchOrigin, launchVelocity, SPLAT_SPEED } from "../../src/core/ballistics";
import { ProjectileManager } from "../../src/core/projectiles";
import { MACHINE_BASE, CAKE_TIERS, CAKE_Z, buildArenaColliders } from "../../src/core/arena";
import { TILT_DEG_PER_NOTCH } from "../../src/game/catapult";

// Law A splats (chosen: 7-12 globs) on the G1 area-honest grid (0.45/0.45).
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

// One sweep, impacts retained; both towns' painted sets derive from them.
interface Fired { label: string; pos: { x: number; y: number; z: number }; speed: number }
const impacts: Fired[] = [];
let fired = 0;
for (let trav = -16; trav <= 16; trav += 0.5) {
  for (let notch = 0; notch <= 3; notch++) {
    for (let clicks = 4; clicks <= 8; clicks++) {
      const world = new RAPIER.World(GRAVITY);
      world.timestep = FIXED_DT;
      buildArenaColliders(world);
      const mgr = new ProjectileManager();
      mgr.spawn(
        world,
        launchOrigin(MACHINE_BASE, trav),
        launchVelocity(trav, clicks, notch * TILT_DEG_PER_NOTCH),
        "frosting",
        { consumeOnImpact: true },
      );
      fired++;
      for (let i = 0; i < 2400; i++) {
        const ev = mgr.step(world);
        const im = ev.impacts[0];
        if (im) {
          impacts.push({ label: `t${trav}/n${notch}/c${clicks}`, pos: im.pos, speed: im.speed });
          break;
        }
      }
    }
  }
}

interface Shot { label: string; set: number[] }
const shots1: Shot[] = impacts
  .map((f) => ({ label: f.label, set: paintSet(f.pos, f.speed) }))
  .filter((s) => s.set.length > 0);
const shots2: Shot[] = impacts
  .map((f) => ({
    label: `T2:${f.label}`,
    set: paintSet({ x: f.pos.x, y: f.pos.y, z: 2 * CAKE_Z - f.pos.z }, f.speed),
  }))
  .filter((s) => s.set.length > 0);
console.log(`fired ${fired} — town-1 paint shots ${shots1.length}, town-2 mirrored ${shots2.length}`);

function greedy(shots: Shot[], reportAt: number[] = [0.5, 0.7, 0.9]): void {
  const covered = new Set<number>();
  const pending = [...reportAt];
  let n = 0;
  const picks: string[] = [];
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
    if (picks.length < 45) picks.push(best.label);
    const cov = covered.size / N;
    while (pending.length && cov >= pending[0]!) {
      console.log(`  reached ${(pending[0]! * 100).toFixed(0)}% at shot ${n}`);
      pending.shift();
    }
  }
  const walls = [...covered].filter((i) => GRID[i]!.wall).length;
  console.log(
    `  CEILING: ${covered.size}/${N} = ${((100 * covered.size) / N).toFixed(1)}% after ${n} shots (tops ${covered.size - walls}/${GRID.filter((p) => !p.wall).length}, walls ${walls}/${GRID.filter((p) => p.wall).length})`,
  );
  console.log(`  first picks: ${picks.slice(0, 24).join(" ")}`);
}

// Rotations about the cake axis for 3rd/4th towns (same symmetry argument).
function rotShots(deg: number): Shot[] {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return impacts
    .map((f) => {
      const rx = f.pos.x;
      const rz = f.pos.z - CAKE_Z;
      return {
        label: `R${deg}:${f.label}`,
        set: paintSet(
          { x: rx * c - rz * s, y: f.pos.y, z: CAKE_Z + rx * s + rz * c },
          f.speed,
        ),
      };
    })
    .filter((sh) => sh.set.length > 0);
}

console.log("\n=== ONE TOWN (greedy, idealized aim) ===");
greedy(shots1, [0.2, 0.25, 0.3, 0.35, 0.4]);
console.log("\n=== TWO TOWNS (town 2 mirrored) ===");
greedy([...shots1, ...shots2], [0.4, 0.5, 0.6, 0.7]);
console.log("\n=== THREE TOWNS (rotations 0/120/240) ===");
greedy([...shots1, ...rotShots(120), ...rotShots(240)], [0.5, 0.6, 0.7, 0.8]);
console.log("\n=== FOUR TOWNS (rotations 0/90/180/270) ===");
greedy([...shots1, ...rotShots(90), ...shots2, ...rotShots(270)], [0.5, 0.7, 0.8, 0.9]);

// Which skin is unreachable to ONE town? Region breakdown of its ceiling.
{
  const covered = new Set<number>();
  for (const s of shots1) for (const i of s.set) covered.add(i);
  console.log("\n=== one-town reachability by region ===");
  for (let ti = 0; ti < CAKE_TIERS.length; ti++) {
    const t = CAKE_TIERS[ti]!;
    for (const wall of [false, true]) {
      const idx = GRID.map((p, i) => ({ p, i })).filter(
        ({ p }) =>
          p.wall === wall &&
          (wall
            ? Math.abs(Math.hypot(p.x, p.z - CAKE_Z) - t.radius) < 0.01 &&
              p.y > t.bottom &&
              p.y < t.top
            : Math.abs(p.y - t.top) < 0.01),
      );
      const got = idx.filter(({ i }) => covered.has(i)).length;
      console.log(
        `  tier ${ti + 1} ${wall ? "wall" : "top "}: ${got}/${idx.length} (${((100 * got) / Math.max(1, idx.length)).toFixed(0)}%)`,
      );
    }
  }
}
