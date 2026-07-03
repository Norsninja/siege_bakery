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
 * surface. Wall rings are SPARSER than top rings — the walls are two-thirds
 * of the cake's skin and would otherwise drown the tops in the coverage
 * denominator.
 *
 * core/ law: deterministic, no DOM, no three.js.
 */
import { CAKE_TIERS, CAKE_Z } from "./arena";
import { SPLAT_SPEED, type Vec3 } from "./ballistics";

/** Target spacing between sample points (m) — ring gap and arc step. */
export const SAMPLE_SPACING = 0.45;
/** Wall rings are coarser (see header) — height gap and arc step. */
export const WALL_SAMPLE_SPACING = 0.65;

/** Dollop (a gentle landing, below SPLAT_SPEED): thick, tidy, small.
 * Sizes pinned by the study's coverage table (research/04 §3) AND a full
 * scripted playthrough (plans/07 O2): the four-shot decorating line —
 * bottom ledge (notch 1 × 7), summit front (notch 1 max crank), summit
 * back (level 7), a flank (±8° level 6) — must clear the frost row with
 * margin. Smaller radii measured fine per shot but left a coverage tail
 * only reachable by re-aiming grind, and the clock died. Decorating, not
 * grinding. */
export const FROST_DOLLOP_RADIUS = 1.3;
export const FROST_DOLLOP_COATS = 2;
/** Splash (at/above SPLAT_SPEED): wide, thin, growing with landing energy.
 * Frosting WANTS to arrive hot — coverage per shot scales with impact
 * speed, at neatness cost (splat-vs-place as CONSEQUENCE, port map C7). */
export const FROST_SPLASH_BASE_RADIUS = 2.1;
export const FROST_SPLASH_RADIUS_PER_SPEED = 0.15;
export const FROST_SPLASH_MAX_RADIUS = 3.4;
/** A splash paints one story: it may drip to the ADJACENT ledge (tier gaps
 * are 1.5m) but never two tiers down. */
export const FROST_VERTICAL_BAND = 1.2;
/** "On the frosting": a painted sample within this 3D distance. */
export const FROSTED_NEAR_M = 0.6;
/** Neatness tolerance: σ(coats) at which the patchwork reads as slop. */
export const NEATNESS_STD_DIVISOR = 1.25;

export function splatRadius(speed: number): number {
  if (speed < SPLAT_SPEED) return FROST_DOLLOP_RADIUS;
  return Math.min(
    FROST_SPLASH_MAX_RADIUS,
    FROST_SPLASH_BASE_RADIUS + FROST_SPLASH_RADIUS_PER_SPEED * (speed - SPLAT_SPEED),
  );
}

export function splatCoats(speed: number): number {
  return speed < SPLAT_SPEED ? FROST_DOLLOP_COATS : 1;
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
 * SPACING apart) plus coarser rings down each wall face, all phase-shifted
 * per ring so points never align. Built once at module load — a pure
 * function of CAKE_TIERS. */
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

  /** Apply one paint event (a frosting glob's first impact). Returns how
   * many sample points it painted — 0 means floor frosting (mess). */
  paint(impact: Vec3, speed: number): number {
    const r = splatRadius(speed);
    const add = splatCoats(speed);
    let painted = 0;
    const r2 = r * r;
    for (let i = 0; i < CAKE_SAMPLES.length; i++) {
      const s = CAKE_SAMPLES[i]!.pos;
      if (Math.abs(s.y - impact.y) > FROST_VERTICAL_BAND) continue;
      // Squared distance, not Math.hypot: sqrt/mul/add are exactly rounded
      // (identical on every engine); hypot is not (header note).
      const dx = s.x - impact.x;
      const dz = s.z - impact.z;
      if (dx * dx + dz * dz > r2) continue;
      this.coats[i]! += add;
      painted++;
    }
    return painted;
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

  /** The Giant licks the cake clean between orders (plans/07 phase F). */
  reset(): void {
    this.coats.fill(0);
  }
}
