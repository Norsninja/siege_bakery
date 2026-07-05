/**
 * The frosting field — surface accumulation on a deterministic sample-point
 * census (plans/07 phase F). The 2D falling-sand automaton deliberately does
 * NOT port (plans/06 pivot law): frosting is a projectile whose first impact
 * becomes a PAINT EVENT here, and coverage/neatness are point-counting over
 * this field — the 2D cell census, re-bodied.
 *
 * Determinism: the sample grid is a pure function of the cake geometry
 * (core/arena), and paint events are pure functions of impact position +
 * speed — both deterministic given the shot parameters. Within one engine,
 * every field computed from the same `shot` events is byte-identical; only
 * the welcome snapshot ever carries the field itself. CROSS-ENGINE honesty
 * (audit 2026-07-03): Math.sin/cos in the grid build are implementation-
 * defined in their last ULP, so a Safari client's grid may differ from
 * V8's by hairs — paint distance math below sticks to sqrt/mul/add (exactly
 * rounded, identical everywhere), and SCORING truth is the Room's field:
 * a client field is visuals, so a one-ULP disagreement can at worst
 * grey out one blob, never a checkmark.
 *
 * Sample points sit on each tier's EXPOSED top ring (annulus up to the tier
 * above; full disc on the summit) AND on the three cylindrical WALL faces
 * (visionary playtest note, 2026-07-03 — this overrules the plan's original
 * "sides unsampled" call): a short shot that smacks the cake's foot now
 * FROSTS the wall base instead of counting as pure mess, ledge splashes
 * wrap onto the walls above and below, and the sides are honest decorating
 * surface. Walls and tops sample at the SAME density (the economy redesign,
 * plans/08, overruling the amendment's coarser walls): the census is an
 * AREA-HONEST account of the skin — walls are two-thirds of the true
 * surface and now two-thirds of the samples, so every blob is one equal
 * unit of dessert ("gather the surface area of the dessert").
 *
 * core/ law: deterministic, no DOM, no three.js.
 */
import { CAKE_TIERS, CAKE_Z } from "./arena";
import { SPLAT_SPEED, type Vec3 } from "./ballistics";

/** Target spacing between sample points (m) — ring gap and arc step. */
export const SAMPLE_SPACING = 0.45;
/** Wall rings: SAME density as tops (area-honest census, header note). */
export const WALL_SAMPLE_SPACING = 0.45;

/** Dollop (a gentle landing, below SPLAT_SPEED): thick, tidy, small.
 * SMALL SPLATS ARE THE LAW (economy redesign, plans/08): one glob paints
 * ~7–12 samples — a rough circle — because many shots IS the game;
 * coverage economics live in the pass ask and the clock (game/tuning.ts),
 * never in fatter splats. Sizes re-pinned by research/04 §3 + the ceiling
 * study (research/06). */
export const FROST_DOLLOP_RADIUS = 0.6;
export const FROST_DOLLOP_COATS = 2;
/** Splash (at/above SPLAT_SPEED): wider, thin, growing with landing energy.
 * Frosting WANTS to arrive hot — coverage per shot scales with impact
 * speed, at neatness cost (splat-vs-place as CONSEQUENCE, port map C7). */
export const FROST_SPLASH_BASE_RADIUS = 0.7;
export const FROST_SPLASH_RADIUS_PER_SPEED = 0.05;
export const FROST_SPLASH_MAX_RADIUS = 1.1;
/** Vertical reach of a splat. At these radii a splash can NEVER bridge
 * one tier's ledge to the next (max reach 1.1 < 1.5m tier gap — decided
 * ON PURPOSE, audit deferred item 1): the band's real job is shaping WALL
 * patches — an impact on a wall face paints a rough circle (arc ~2r wide,
 * ~2·band tall), and a ledge-edge splash may wrap onto the wall just
 * above or below. */
export const FROST_VERTICAL_BAND = 0.8;
/** "On the frosting": a painted sample within this 3D distance. */
export const FROSTED_NEAR_M = 0.6;
/** STICKY FROSTING (plans/10 addendum, 2026-07-05): a grain whose first
 * impact lands within this distance of a painted sample FREEZES on the
 * spot — sprinkles stick to wet frosting (and to fudge, the stickiest;
 * one shared field). Tighter than FROSTED_NEAR_M: samples sit 0.45 apart,
 * so anywhere ON a painted patch is within ~0.32 of a sample — 0.45 grips
 * the paint without gluing grains to bare sponge beside it. Every stuck
 * grain therefore also counts for the on-frosting row. */
export const STICKY_NEAR_M = 0.45;
/** Neatness tolerance: σ(coats) at which the patchwork reads as slop. */
export const NEATNESS_STD_DIVISOR = 1.25;

/** One paint topping's splat law (plans/10 §4) — the per-topping column
 * the pantry table carries (game/toppings.ts). DEFAULT_SPLAT reproduces
 * the frosting-classic constants byte-for-byte, so every existing pin and
 * every ceiling study (research/06/10/11 model the frosting glob) stays
 * valid. Fudge's spec is narrow with bandDown ≫ bandUp: a thick stream
 * that RUNS DOWN the wall from a ledge hit, then sets — the measured
 * elevation moats (research/11) are its job. */
export interface SplatSpec {
  dollopRadius: number;
  dollopCoats: number;
  splashBase: number;
  splashPerSpeed: number;
  splashMax: number;
  /** Vertical reach ABOVE the impact (the classic band is symmetric). */
  bandUp: number;
  /** Vertical reach BELOW the impact — fudge runs down, frosting doesn't. */
  bandDown: number;
}

export const DEFAULT_SPLAT: SplatSpec = {
  dollopRadius: FROST_DOLLOP_RADIUS,
  dollopCoats: FROST_DOLLOP_COATS,
  splashBase: FROST_SPLASH_BASE_RADIUS,
  splashPerSpeed: FROST_SPLASH_RADIUS_PER_SPEED,
  splashMax: FROST_SPLASH_MAX_RADIUS,
  bandUp: FROST_VERTICAL_BAND,
  bandDown: FROST_VERTICAL_BAND,
};

export function splatRadius(speed: number, spec: SplatSpec = DEFAULT_SPLAT): number {
  if (speed < SPLAT_SPEED) return spec.dollopRadius;
  return Math.min(
    spec.splashMax,
    spec.splashBase + spec.splashPerSpeed * (speed - SPLAT_SPEED),
  );
}

export function splatCoats(speed: number, spec: SplatSpec = DEFAULT_SPLAT): number {
  return speed < SPLAT_SPEED ? spec.dollopCoats : 1;
}

/** The sample indices one paint event reaches — shared by the field's
 * paint() and the client's per-splat coloring (fudge renders dark; the
 * view must see EXACTLY what the census sees, the greybox virtue). */
export function splatSamples(
  impact: Vec3,
  speed: number,
  spec: SplatSpec = DEFAULT_SPLAT,
): number[] {
  const r = splatRadius(speed, spec);
  const r2 = r * r;
  const hit: number[] = [];
  for (let i = 0; i < CAKE_SAMPLES.length; i++) {
    const s = CAKE_SAMPLES[i]!.pos;
    const dy = s.y - impact.y;
    if (dy > spec.bandUp || dy < -spec.bandDown) continue;
    // Squared distance, not Math.hypot: sqrt/mul/add are exactly rounded
    // (identical on every engine); hypot is not (header note).
    const dx = s.x - impact.x;
    const dz = s.z - impact.z;
    if (dx * dx + dz * dz > r2) continue;
    hit.push(i);
  }
  return hit;
}

/** One census point: where it sits and which way its surface faces —
 * +y on tier tops, radially outward on tier walls. The client flattens
 * its frosting blobs against the normal; nothing else reads it. */
export interface FrostSample {
  pos: Vec3;
  normal: Vec3;
}

const UP: Vec3 = { x: 0, y: 1, z: 0 };

/** The census grid: polar rings per tier over the exposed top (~SAMPLE_
 * SPACING apart) plus equal-density rings down each wall face, all
 * phase-shifted per ring so points never align. Built once at module
 * load — a pure function of CAKE_TIERS. */
function buildSamples(): FrostSample[] {
  const pts: FrostSample[] = [];
  for (let i = 0; i < CAKE_TIERS.length; i++) {
    const t = CAKE_TIERS[i]!;
    const inner = CAKE_TIERS[i + 1]?.radius ?? 0;
    if (inner === 0)
      pts.push({ pos: { x: 0, y: t.top, z: CAKE_Z }, normal: UP }); // summit center
    for (
      let r = inner + SAMPLE_SPACING * 0.6;
      r <= t.radius - 0.15;
      r += SAMPLE_SPACING
    ) {
      const n = Math.max(6, Math.round((2 * Math.PI * r) / SAMPLE_SPACING));
      for (let k = 0; k < n; k++) {
        const a = r + (2 * Math.PI * k) / n; // ring radius as phase offset
        pts.push({
          pos: { x: r * Math.cos(a), y: t.top, z: CAKE_Z + r * Math.sin(a) },
          normal: UP,
        });
      }
    }
    // The wall face: rings from just above this tier's foot (the ground, or
    // the ledge below) up to just under its top edge.
    const n = Math.max(6, Math.round((2 * Math.PI * t.radius) / WALL_SAMPLE_SPACING));
    for (
      let y = t.bottom + WALL_SAMPLE_SPACING * 0.55;
      y <= t.top - 0.2;
      y += WALL_SAMPLE_SPACING
    ) {
      for (let k = 0; k < n; k++) {
        const a = y * 2.4 + (2 * Math.PI * k) / n; // ring height as phase offset
        const c = Math.cos(a);
        const s = Math.sin(a);
        pts.push({
          pos: { x: t.radius * c, y, z: CAKE_Z + t.radius * s },
          normal: { x: c, y: 0, z: s },
        });
      }
    }
  }
  return pts;
}

export const CAKE_SAMPLES: readonly FrostSample[] = buildSamples();

export class FrostingField {
  private coats: number[] = new Array<number>(CAKE_SAMPLES.length).fill(0);

  /** Apply one paint event (a paint topping's first impact), under the
   * topping's splat law (default: the frosting classic). Returns how many
   * sample points it painted — 0 means floor frosting (mess). */
  paint(impact: Vec3, speed: number, spec: SplatSpec = DEFAULT_SPLAT): number {
    const hit = splatSamples(impact, speed, spec);
    const add = splatCoats(speed, spec);
    for (const i of hit) this.coats[i]! += add;
    return hit.length;
  }

  /** Fraction of the cake's sampled skin under at least one coat (0..1). */
  coverage(): number {
    let covered = 0;
    for (const c of this.coats) if (c > 0) covered++;
    return covered / this.coats.length;
  }

  /** Evenness of the work: 1 for uniform coats over the painted points,
   * falling as dollop-on-splash patchwork piles up. 0 with nothing painted
   * (there is no neatness to speak of on a naked cake — 2D law). */
  neatness(): number {
    const painted = this.coats.filter((c) => c > 0);
    if (painted.length === 0) return 0;
    const mean = painted.reduce((a, b) => a + b, 0) / painted.length;
    const varSum = painted.reduce((a, b) => a + (b - mean) * (b - mean), 0);
    const std = Math.sqrt(varSum / painted.length);
    return Math.max(0, 1 - std / NEATNESS_STD_DIVISOR);
  }

  /** The sprinkle support-chain oracle: is there paint under this rest
   * position? (3D distance — a sample directly under a settled ball is
   * ~0.3m away; the band keeps ground positions from reading tier paint.) */
  frostedNear(pos: Vec3, within = FROSTED_NEAR_M): boolean {
    const w2 = within * within;
    for (let i = 0; i < CAKE_SAMPLES.length; i++) {
      if (this.coats[i]! === 0) continue;
      const s = CAKE_SAMPLES[i]!.pos;
      const dx = s.x - pos.x;
      const dy = s.y - pos.y;
      const dz = s.z - pos.z;
      if (dx * dx + dy * dy + dz * dz <= w2) return true;
    }
    return false;
  }

  /** Coats at one sample index (the client view scales its blobs by this). */
  coatAt(i: number): number {
    return this.coats[i] ?? 0;
  }

  /** The wire form (welcome snapshot). */
  snapshot(): number[] {
    return [...this.coats];
  }

  /** Adopt a wire snapshot (late join / refresh). Refuses a snapshot whose
   * length disagrees with this build's sample grid — a version-skew guard;
   * the field then starts clean rather than corrupt. Returns whether it
   * adopted, so the caller can SAY so (audit 2026-07-03: the refusal was
   * silent, and "late joiner sees a naked cake" had no explanation). */
  restore(coats: readonly number[]): boolean {
    if (coats.length !== this.coats.length) return false;
    this.coats = [...coats];
    return true;
  }

  /** Fresh cake per order (the fresh-cake law, 2026-07-05): the finished
   * dessert is gone — eaten or taken away — and a naked cake wheels out.
   * The paint leaves with it. */
  reset(): void {
    this.coats.fill(0);
  }
}
