/**
 * Cylinder tier study (Frosting slice phase R, plans/07) — headless Rapier,
 * the same physics the Room runs. The Test Cake's square tiers go ROUND
 * (playtest note 2, 2026-07-03), and round tiers ride at the FRONT of the
 * frosting slice so the coverage census is built once against final
 * geometry. This is research/03 re-run against cylinder candidates:
 *
 *   1. The full clicks × notch grid at traverse 0 — does the pinned
 *      centerline ladder survive? (Expected yes: at traverse 0 a cylinder
 *      presents the same front edge and depth as its old bounding square.)
 *   2. A traverse spread check — do the curved side ledges CATCH toppings,
 *      or shed them? (Squares had corners to wedge against; circles don't.)
 *
 * Reproducible: `npx tsx project/research/04-cylinder-tier-study.mts`.
 *
 *   3. (Added with phase F, as planned) Single-splat coverage per on-cake
 *      landing: each impact painted onto a fresh FrostingField — the data
 *      that pins the standing order's frac and parShots (phase O).
 */
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT, GRAVITY } from "../../src/core/constants";
import {
  launchOrigin,
  launchVelocity,
  SPLAT_SPEED,
} from "../../src/core/ballistics";
import { ProjectileManager } from "../../src/core/projectiles";
import {
  MACHINE_BASE,
  WALLS,
  WALL_HEIGHT,
  PANTRY_POS,
  PANTRY_HALF,
  PLINTH_POS,
  PLINTH_HALF,
} from "../../src/core/arena";
import { TILT_DEG_PER_NOTCH } from "../../src/game/catapult";

const CAKE_Z = -30; // unchanged: plinth (z -12) to cake center = 18 m

interface Tier {
  radius: number; // x/z radius (cylindrical tiers, concentric on CAKE_Z)
  bottom: number;
  top: number;
}

/** Candidates. A-round = the pinned square dims verbatim, radius = old half.
 * B-round widens the ledges in case curved edges shed the ledge shots. */
const CANDIDATES: Record<string, Tier[]> = {
  "A-round (radii 4/3/2.25, pinned heights)": [
    { radius: 4, bottom: 0, top: 2 },
    { radius: 3, bottom: 2, top: 3.5 },
    { radius: 2.25, bottom: 3.5, top: 5 },
  ],
  "B-round (radii 4.2/3.1/2.3, pinned heights)": [
    { radius: 4.2, bottom: 0, top: 2 },
    { radius: 3.1, bottom: 2, top: 3.5 },
    { radius: 2.3, bottom: 3.5, top: 5 },
  ],
};

function buildWorld(tiers: Tier[]): RAPIER.World {
  const world = new RAPIER.World(GRAVITY);
  world.timestep = FIXED_DT;
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(40, 0.1, 40).setTranslation(0, -0.1, 0),
  );
  for (const w of WALLS) {
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(w.hx, w.hy, w.hz).setTranslation(
        w.x,
        WALL_HEIGHT / 2,
        w.z,
      ),
    );
  }
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(PANTRY_HALF.x, PANTRY_HALF.y, PANTRY_HALF.z)
      .setTranslation(PANTRY_POS.x, PANTRY_POS.y, PANTRY_POS.z),
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(PLINTH_HALF.x, PLINTH_HALF.y, PLINTH_HALF.z)
      .setTranslation(PLINTH_POS.x, PLINTH_POS.y, PLINTH_POS.z),
  );
  for (const t of tiers) {
    const hy = (t.top - t.bottom) / 2;
    world.createCollider(
      RAPIER.ColliderDesc.cylinder(hy, t.radius).setTranslation(
        0,
        t.bottom + hy,
        CAKE_Z,
      ),
    );
  }
  return world;
}

/** Topmost tier whose disc holds the rest position at its top level. */
function classify(tiers: Tier[], p: { x: number; y: number; z: number }): string {
  for (let i = tiers.length - 1; i >= 0; i--) {
    const t = tiers[i]!;
    if (Math.hypot(p.x, p.z - CAKE_Z) <= t.radius && p.y > t.top - 0.1)
      return `TIER ${i + 1}`;
  }
  if (p.z > CAKE_Z + tiers[0]!.radius) return "short ";
  if (p.z < CAKE_Z - tiers[0]!.radius) return "beyond";
  return "side  ";
}

function fire(
  tiers: Tier[],
  traverseDeg: number,
  clicks: number,
  notch: number,
): { rest: { x: number; y: number; z: number } | null; impactSpeed: number } {
  const world = buildWorld(tiers);
  const shots = new ProjectileManager();
  shots.spawn(
    world,
    launchOrigin(MACHINE_BASE, traverseDeg),
    launchVelocity(traverseDeg, clicks, notch * TILT_DEG_PER_NOTCH),
    "cherry",
  );
  let impactSpeed = 0;
  let rest: { x: number; y: number; z: number } | null = null;
  for (let i = 0; i < 3600 && !rest; i++) {
    const ev = shots.step(world);
    if (ev.impacts[0]) impactSpeed = ev.impacts[0].speed;
    if (ev.settled[0]) rest = ev.settled[0].pos;
  }
  return { rest, impactSpeed };
}

function row(
  tiers: Tier[],
  traverseDeg: number,
  clicks: number,
  notch: number,
): string {
  const { rest, impactSpeed } = fire(tiers, traverseDeg, clicks, notch);
  const label = rest ? classify(tiers, rest) : "NEVER SETTLED";
  const splat = impactSpeed >= SPLAT_SPEED ? "splat" : "place";
  const pos = rest
    ? `${rest.x.toFixed(2).padStart(6)} ${rest.y.toFixed(2).padStart(6)} ${rest.z.toFixed(2).padStart(7)}`
    : "      -      -       -";
  return `${pos}   ${impactSpeed.toFixed(1).padStart(5)}  ${splat}  ${label}`;
}

await RAPIER.init();

// --- Section 3: single-splat coverage (frosting, phase F) -----------------
// Frosting scores at IMPACT, so we fire the LIVE arena (core/arena, the
// study winner now shipped) and paint each impact onto a fresh field.
// eslint-disable-next-line import/first
const { buildArenaColliders } = await import("../../src/core/arena");
const { FrostingField } = await import("../../src/core/frosting");

function frostShot(
  traverseDeg: number,
  clicks: number,
  notch: number,
): { painted: number; coverage: number; speed: number } {
  const world = new RAPIER.World(GRAVITY);
  world.timestep = FIXED_DT;
  buildArenaColliders(world);
  const shots = new ProjectileManager();
  shots.spawn(
    world,
    launchOrigin(MACHINE_BASE, traverseDeg),
    launchVelocity(traverseDeg, clicks, notch * TILT_DEG_PER_NOTCH),
    "frosting",
    { consumeOnImpact: true },
  );
  for (let i = 0; i < 3600; i++) {
    const ev = shots.step(world);
    const im = ev.impacts[0];
    if (im) {
      const field = new FrostingField();
      const painted = field.paint(im.pos, im.speed);
      return { painted, coverage: field.coverage(), speed: im.speed };
    }
  }
  return { painted: 0, coverage: 0, speed: 0 };
}

console.log("\n=== single-splat coverage (live arena, fresh field each) ===");
console.log("trav  notch clicks  impact  painted  coverage");
for (const [trav, notch, clicks] of [
  [0, 0, 4], // very short — ground splat, wall base if close enough
  [0, 0, 5], // the visionary's "short" shot — should frost the wall base now
  [0, 0, 6],
  [0, 0, 7],
  [0, 1, 6], // short splat at the foot
  [0, 1, 7], // the bottom-ledge shot
  [0, 1, 8],
  [8, 0, 6],
  [8, 1, 8],
  [14, 0, 6],
  [-11, 0, 6],
] as const) {
  const r = frostShot(trav, clicks, notch);
  console.log(
    `${String(trav).padStart(4)}   ${notch}     ${clicks}     ${r.speed.toFixed(1).padStart(5)}   ${String(r.painted).padStart(4)}    ${(r.coverage * 100).toFixed(1).padStart(5)}%`,
  );
}

for (const [name, tiers] of Object.entries(CANDIDATES)) {
  console.log(`\n=== ${name} ===`);
  console.log("--- centerline grid (traverse 0) ---");
  console.log("notch clicks   rest x      y      z   impact  verdict");
  for (let notch = 0; notch <= 3; notch++) {
    for (let clicks = 3; clicks <= 8; clicks++)
      console.log(`  ${notch}     ${clicks}    ${row(tiers, 0, clicks, notch)}`);
    console.log("");
  }
  console.log("--- traverse spread (do curved ledges catch?) ---");
  console.log("trav  notch clicks   rest x      y      z   impact  verdict");
  for (const trav of [-14, -8, 8, 14]) {
    for (const [notch, clicks] of [
      [0, 6],
      [0, 7],
      [1, 8],
    ] as const)
      console.log(
        `${String(trav).padStart(4)}   ${notch}     ${clicks}    ${row(tiers, trav, clicks, notch)}`,
      );
  }
}
