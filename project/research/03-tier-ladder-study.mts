/**
 * Tier ladder study (Test Cake slice, plans/05) — headless Rapier, the same
 * physics the Room runs. Fires the full clicks × notch grid at CANDIDATE
 * three-tier cake geometries and reports where each shot comes to REST
 * (scoring truth) — the data that picks the tier dimensions and re-pins the
 * settle ladder. Reproducible: `npx tsx project/research/03-tier-ladder-study.mts`.
 *
 * Constraint discovered up front: TENSION_MAX_CLICKS = 8, and a 70° lob
 * (notch 1) at max winch only reaches z ≈ -28 at altitude — the top tier's
 * front edge must sit inside that reach or the crown is unreachable.
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
  half: number; // x/z half extent (square tiers)
  bottom: number; // y of tier bottom
  top: number; // y of tier top
}

/** Candidate geometries. halves shrink upward; PEAK_HALF 2.25 was recorded
 * as "the future top tier's footprint" — candidate A honors it verbatim. */
const CANDIDATES: Record<string, Tier[]> = {
  "A grand (tops 2/3.5/5, halves 4/3/2.25)": [
    { half: 4, bottom: 0, top: 2 },
    { half: 3, bottom: 2, top: 3.5 },
    { half: 2.25, bottom: 3.5, top: 5 },
  ],
  "B squat (tops 1.8/3/4.2, halves 4/3/2.25)": [
    { half: 4, bottom: 0, top: 1.8 },
    { half: 3, bottom: 1.8, top: 3 },
    { half: 2.25, bottom: 3, top: 4.2 },
  ],
  "C mid (tops 2/3.4/4.6, halves 4/3/2.4)": [
    { half: 4, bottom: 0, top: 2 },
    { half: 3, bottom: 2, top: 3.4 },
    { half: 2.4, bottom: 3.4, top: 4.6 },
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
      RAPIER.ColliderDesc.cuboid(t.half, hy, t.half).setTranslation(
        0,
        t.bottom + hy,
        CAKE_Z,
      ),
    );
  }
  return world;
}

/** Topmost tier whose footprint holds the rest position at its top level. */
function classify(tiers: Tier[], p: { x: number; y: number; z: number }): string {
  for (let i = tiers.length - 1; i >= 0; i--) {
    const t = tiers[i]!;
    if (
      Math.abs(p.x) <= t.half &&
      Math.abs(p.z - CAKE_Z) <= t.half &&
      p.y > t.top - 0.1
    )
      return `TIER ${i + 1}`;
    }
  if (p.z > CAKE_Z + tiers[0]!.half) return "short ";
  if (p.z < CAKE_Z - tiers[0]!.half) return "beyond";
  return "side  ";
}

await RAPIER.init();

for (const [name, tiers] of Object.entries(CANDIDATES)) {
  console.log(`\n=== ${name} ===`);
  console.log("notch clicks   rest x      y      z   impact  verdict");
  for (let notch = 0; notch <= 3; notch++) {
    for (let clicks = 3; clicks <= 8; clicks++) {
      const world = buildWorld(tiers);
      const shots = new ProjectileManager();
      shots.spawn(
        world,
        launchOrigin(MACHINE_BASE, 0),
        launchVelocity(0, clicks, notch * TILT_DEG_PER_NOTCH),
        "cherry",
      );
      let impactSpeed = 0;
      let rest: { x: number; y: number; z: number } | null = null;
      for (let i = 0; i < 3600 && !rest; i++) {
        const ev = shots.step(world);
        if (ev.impacts[0]) impactSpeed = ev.impacts[0].speed;
        if (ev.settled[0]) rest = ev.settled[0].pos;
      }
      const label = rest ? classify(tiers, rest) : "NEVER SETTLED";
      const splat = impactSpeed >= SPLAT_SPEED ? "splat" : "place";
      console.log(
        `  ${notch}     ${clicks}    ` +
          (rest
            ? `${rest.x.toFixed(2).padStart(6)} ${rest.y.toFixed(2).padStart(6)} ${rest.z.toFixed(2).padStart(7)}`
            : "      -      -       -") +
          `   ${impactSpeed.toFixed(1).padStart(5)}  ${splat}  ${label}`,
      );
    }
    console.log("");
  }
}
