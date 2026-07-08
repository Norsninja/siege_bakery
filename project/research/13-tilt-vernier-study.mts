/**
 * TILT-VERNIER STUDY (elevation vernier, 2026-07-08) —
 * SPEC-PARAMETERIZED 2026-07-08 (fourth session, plans/13 slice 3).
 *
 * Usage: `npx tsx project/research/13-tilt-vernier-study.mts [specId]`
 *   - specId: a DESSERT_SPECS wire id (default cake-3 — the anchor).
 *
 * PARAMETERIZATION ZERO-DRIFT PIN: `cake-3` must reproduce the MEASURED
 * 2026-07-08 run below — 910 shots zero lost, 27 distinct on-cake
 * (click, notch) combos on the 2.5°×18 table, click 7 notches 0–3 =
 * four distinct T3-top radii all PLACE, notch 14 (el 90°) on your own
 * plinth, 15+ backwards — or the parameterization drifted. [VERIFIED
 * 2026-07-08 fourth session: all reproduced — 910/0, 27 combos
 * (0+2+5+7+6+4+3 across c4..c10), c7n0–3 four T3-top places, n14 at
 * r≈17.8 y≈1.3 = the plinth top.] (The candidate-table comparison of
 * the original run is retired with its decision; this tool prints the
 * SHIPPED table only — which, post-clamp (plans/15 item 2), is
 * 2.5°×12. The tilt SWEEP stays 0..45° so the tool always sees past
 * the clamp.)
 *
 * Original question + method (2026-07-08), unchanged: elevation is the
 * FINE control (draw clicks stay coarse — DECIDED 2026-07-07). Measure
 * what one degree of tilt BUYS in landing position across the shipped
 * click ladder (1..10). Real Rapier, real arena statics + the spec's
 * dessert colliders, real launchVelocity. Traverse 0 (straight through
 * the dessert's max diameter), tilt 0..45 by 0.5°, one shot per
 * (click, tilt) in a fresh world; record first impact pos + speed.
 *
 * MEASURED HISTORY (cake-3, kept as the record):
 *   2026-07-08 (910 shots, zero lost) → DECISION, visionary-blessed:
 *   TILT_DEG_PER_NOTCH 2.5° × TILT_MAX_NOTCH 18 (45° total kept),
 *   SCREW_SECONDS_PER_NOTCH 0.15 (full sweep 2.7s).
 *   - Sensitivity in the money band: ~0.15–0.7 m/° at clicks 6–7, up to
 *     ~1.0 m/° at 9–10 → one 2.5° notch ≈ 0.4–1.3m of landing depth.
 *   - Adjacent-click gaps 1.8–8.1m → 3–7 notches walk one click gap:
 *     elevation is genuinely the fine knob.
 *   - 27 distinct on-cake (click, notch) combos; click 7 notches 0–3 are
 *     FOUR distinct T3-top radii, all PLACE (impact ~12.2 < SPLAT 13).
 *   - Notch 14 (el 90°) lands on your own plinth (r≈18 from cake center,
 *     ball resting at plinth-top height); notches 15–18 throw backwards.
 *   - 2.0°×23 buys 5 more combos for 5 more HUD slots (rejected);
 *     3.0°×15 skips surfaces at high clicks (rejected).
 *   - T2-top is a shadow surface at traverse 0 (~0.5–1° windows at every
 *     click — the 0.75m annulus is crossed fast by steep arcs). Geometry,
 *     not notch size; off-axis chords + splat radii still paint it. THIS
 *     is why the potential envelope re-run (research/11, extended ladder)
 *     is mandatory after any tilt-table change. [DONE 2026-07-08: union
 *     100% at ≤8 clicks — the moat is bridged; see research/11 RE-RUN.]
 *
 * STANDING RE-PIN TOOL (the re-pin law of the ladder, plans/13 §4): no
 * rung row's ask is pinned until ITS spec has run through this and
 * research/11. Tilt-table, launch-speed, or arena changes re-run it too.
 */
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT, GRAVITY } from "../../src/core/constants";
import {
  launchOrigin,
  launchVelocity,
  SPLAT_SPEED,
} from "../../src/core/ballistics";
import { ProjectileManager } from "../../src/core/projectiles";
import { MACHINE_BASE, CAKE_Z, buildArenaColliders } from "../../src/core/arena";
import {
  DESSERT_SPECS,
  dessertGeometry,
  specById,
} from "../../src/core/dessert";
import { TILT_DEG_PER_NOTCH, TILT_MAX_NOTCH } from "../../src/game/catapult";

const specId = process.argv[2] ?? "cake-3";
const spec = specById(specId);
if (!spec)
  throw new Error(
    `unknown spec "${specId}" — rows: ${DESSERT_SPECS.map((s) => s.id).join(", ")}`,
  );
const geom = dessertGeometry(spec);

await RAPIER.init();

interface Hit {
  clicks: number;
  tiltDeg: number;
  pos: { x: number; y: number; z: number };
  speed: number;
  region: string;
  /** Signed depth along the throw: machine fires -Z, so depth is measured
   * as (CAKE_Z-relative) -(z - CAKE_Z): positive = past cake center
   * (overshoot side), negative = short side. 0 = cake axis. */
  depth: number;
}

/** Best-effort region label; raw numbers always printed alongside. Ball
 * radius 0.3 rides above/outside surfaces. */
function classify(p: { x: number; y: number; z: number }): string {
  const r = Math.hypot(p.x, p.z - CAKE_Z);
  for (let i = spec.tiers.length - 1; i >= 0; i--) {
    const t = spec.tiers[i]!;
    if (Math.abs(p.y - (t.top + 0.3)) < 0.3 && r <= t.radius + 0.15)
      return `T${i + 1}-top `;
    if (p.y > t.bottom - 0.05 && p.y < t.top + 0.15 && Math.abs(r - (t.radius + 0.3)) < 0.3)
      return `T${i + 1}-wall`;
  }
  if (p.y < 0.6) {
    if (p.z > MACHINE_BASE.z) return "BACKWRD";
    return p.z - CAKE_Z > 0 ? "short  " : "over   ";
  }
  return `?(r${r.toFixed(1)},y${p.y.toFixed(1)})`;
}

console.log(`spec ${spec.id} (${spec.tiers.length} tiers, summit y ${spec.tiers[spec.tiers.length - 1]!.top})`);

const hits = new Map<string, Hit>(); // key `${clicks}|${tilt*10}`
let fired = 0;
let lost = 0;
for (let clicks = 1; clicks <= 10; clicks++) {
  for (let tilt10 = 0; tilt10 <= 450; tilt10 += 5) {
    const tiltDeg = tilt10 / 10;
    const world = new RAPIER.World(GRAVITY);
    world.timestep = FIXED_DT;
    buildArenaColliders(world); // arena statics
    geom.buildColliders(world); // the spec's dessert (plans/13 §3)
    const mgr = new ProjectileManager();
    mgr.spawn(
      world,
      launchOrigin(MACHINE_BASE, 0),
      launchVelocity(0, clicks, tiltDeg),
      "frosting",
      { consumeOnImpact: true },
    );
    fired++;
    let got = false;
    for (let i = 0; i < 2400; i++) {
      const ev = mgr.step(world, geom);
      const im = ev.impacts[0];
      if (im) {
        hits.set(`${clicks}|${tilt10}`, {
          clicks,
          tiltDeg,
          pos: im.pos,
          speed: im.speed,
          region: classify(im.pos),
          depth: -(im.pos.z - CAKE_Z),
        });
        got = true;
        break;
      }
    }
    if (!got) lost++;
  }
}
console.log(`fired ${fired}, no-impact ${lost}`);
console.log(
  `machine base z=${MACHINE_BASE.z}, cake center z=${CAKE_Z} (${(MACHINE_BASE.z - CAKE_Z).toFixed(1)}m), cake front edge depth=-${spec.tiers[0]!.radius}`,
);

const at = (clicks: number, tiltDeg: number): Hit | undefined =>
  hits.get(`${clicks}|${Math.round(tiltDeg * 10)}`);

// ---- 1. Range-vs-tilt curves: per click, 2.5° rows + region transitions.
for (let clicks = 4; clicks <= 10; clicks++) {
  console.log(`\n=== clicks ${clicks} (launch ${(4 + 1.5 * clicks).toFixed(1)} m/s) ===`);
  let prevRegion = "";
  for (let t = 0; t <= 45; t += 0.5) {
    const h = at(clicks, t);
    if (!h) continue;
    const coarseRow = Math.abs(t / 2.5 - Math.round(t / 2.5)) < 1e-9;
    const transition = h.region !== prevRegion;
    if (coarseRow || transition) {
      console.log(
        `  tilt ${t.toFixed(1).padStart(4)}°  el ${(55 + t).toFixed(1)}°  ${h.region}  depth ${h.depth.toFixed(2).padStart(6)}  y ${h.pos.y.toFixed(2)}  v ${h.speed.toFixed(1)}${h.speed < SPLAT_SPEED ? " PLACE" : " splat"}${transition ? "  <-- " + prevRegion.trim() + "→" + h.region.trim() : ""}`,
      );
    }
    prevRegion = h.region;
  }
}

// ---- 2. Sensitivity: meters of depth per degree of tilt, near key tilts.
console.log("\n=== d(depth)/d(tilt) m/° (central diff over 1°) ===");
console.log("        " + [0, 5, 10, 15, 20, 25, 30].map((t) => `t${t}`.padStart(7)).join(""));
for (let clicks = 4; clicks <= 10; clicks++) {
  const row: string[] = [];
  for (const t of [0, 5, 10, 15, 20, 25, 30]) {
    const a = at(clicks, Math.max(0, t - 0.5));
    const b = at(clicks, t + 0.5);
    row.push(
      a && b ? ((a.depth - b.depth) / (b.tiltDeg - a.tiltDeg) * -1).toFixed(2).padStart(7) : "      -",
    );
  }
  console.log(`  c${String(clicks).padStart(2)}  ${row.join("")}`);
}

// ---- 3. The click gap the vernier subdivides: depth(c) - depth(c+1) at
// fixed tilt (how far apart adjacent clicks land — the coarse step).
console.log("\n=== click gap at fixed tilt: |depth(c+1) - depth(c)| m ===");
for (const t of [0, 5, 10, 15]) {
  const row: string[] = [];
  for (let c = 4; c <= 9; c++) {
    const a = at(c, t);
    const b = at(c + 1, t);
    row.push(a && b ? `${c}→${c + 1}:${Math.abs(b.depth - a.depth).toFixed(2)}` : `${c}→${c + 1}:-`);
  }
  console.log(`  tilt ${String(t).padStart(2)}°  ${row.join("  ")}`);
}

// ---- 4. THE SHIPPED TABLE on exact fired data: per click, which notches
// land on the dessert (the machine's real HUD ladder — the original run's
// candidate comparison retired with its decision).
console.log(`\n=== SHIPPED TABLE ${TILT_DEG_PER_NOTCH}°/notch × ${TILT_MAX_NOTCH} notches ===`);
for (let clicks = 4; clicks <= 10; clicks++) {
  let onCake = 0;
  let maxGap = 0;
  let gapAt = "";
  let prev: Hit | undefined;
  const marks: string[] = [];
  for (let n = 0; n <= TILT_MAX_NOTCH; n++) {
    const h = at(clicks, n * TILT_DEG_PER_NOTCH);
    if (!h) continue;
    const cake = h.region.startsWith("T");
    if (cake) onCake++;
    marks.push(cake ? h.region.trim() : h.region.trim().slice(0, 5));
    if (prev) {
      const d = Math.hypot(
        h.pos.x - prev.pos.x,
        h.pos.y - prev.pos.y,
        h.pos.z - prev.pos.z,
      );
      // gap only matters inside the useful (non-backwards) band
      if (h.pos.z < MACHINE_BASE.z && d > maxGap) {
        maxGap = d;
        gapAt = `n${n - 1}→n${n}`;
      }
    }
    prev = h;
  }
  console.log(
    `  c${String(clicks).padStart(2)}: on-cake ${String(onCake).padStart(2)}/${TILT_MAX_NOTCH + 1}  max-step ${maxGap.toFixed(2)}m @${gapAt}`,
  );
  console.log(`       ${marks.join(" ")}`);
}

// ---- 5. THE SUMMIT SHOT (RUNGS authoring view): every (click, notch) on
// the shipped table whose first impact lands on the TOP tier — the crown
// ask's honesty. "None" at every click = the envelope died at this spec.
{
  const topRegion = `T${spec.tiers.length}-top`;
  const combos: string[] = [];
  for (let clicks = 1; clicks <= 10; clicks++) {
    for (let n = 0; n <= TILT_MAX_NOTCH; n++) {
      const h = at(clicks, n * TILT_DEG_PER_NOTCH);
      if (h && h.region.trim() === topRegion)
        combos.push(`c${clicks}n${n}${h.speed < SPLAT_SPEED ? "·place" : "·splat"}`);
    }
  }
  console.log(
    `\n=== SUMMIT (${topRegion}) on the shipped table: ${combos.length === 0 ? "NONE — the envelope is dead at traverse 0" : combos.join(" ")} ===`,
  );
}
