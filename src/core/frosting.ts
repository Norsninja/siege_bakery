/**
 * The frosting field — surface accumulation on a deterministic sample-point
 * census (plans/07 phase F). The 2D falling-sand automaton deliberately does
 * NOT port (plans/06 pivot law): frosting is a projectile whose first impact
 * becomes a PAINT EVENT here, and coverage/neatness are point-counting over
 * this field — the 2D cell census, re-bodied.
 *
 * Determinism: the sample grid is a pure function of the cake geometry
 * (core/arena), and paint events are pure functions of impact position +
 * speed — both deterministic given the shot parameters. Every client and the
 * Room compute byte-identical fields from the same `shot` events; only the
 * welcome snapshot ever carries the field itself.
 *
 * Sample points sit on each tier's EXPOSED top ring (annulus up to the tier
 * above; full disc on the summit). Tier SIDES are deliberately unsampled:
 * lobs arrive from above — demanding frosted walls from a catapult is
 * homework, not comedy (recorded in plans/07 so nobody "fixes" it).
 *
 * core/ law: deterministic, no DOM, no three.js.
 */
import { CAKE_TIERS, CAKE_Z } from "./arena";
import { SPLAT_SPEED, type Vec3 } from "./ballistics";

/** Target spacing between sample points (m) — ring gap and arc step. */
export const SAMPLE_SPACING = 0.45;

/** Dollop (a gentle landing, below SPLAT_SPEED): thick, tidy, small. */
export const FROST_DOLLOP_RADIUS = 0.9;
export const FROST_DOLLOP_COATS = 2;
/** Splash (at/above SPLAT_SPEED): wide, thin, growing with landing energy.
 * Frosting WANTS to arrive hot — coverage per shot scales with impact
 * speed, at neatness cost (splat-vs-place as CONSEQUENCE, port map C7). */
export const FROST_SPLASH_BASE_RADIUS = 1.2;
export const FROST_SPLASH_RADIUS_PER_SPEED = 0.09;
export const FROST_SPLASH_MAX_RADIUS = 2.4;
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

/** The census grid: polar rings per tier over the exposed top, ~SAMPLE_
 * SPACING apart, phase-shifted per ring so points never align radially.
 * Built once at module load — a pure function of CAKE_TIERS. */
function buildSamples(): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i < CAKE_TIERS.length; i++) {
    const t = CAKE_TIERS[i]!;
    const inner = CAKE_TIERS[i + 1]?.radius ?? 0;
    if (inner === 0) pts.push({ x: 0, y: t.top, z: CAKE_Z }); // summit center
    for (
      let r = inner + SAMPLE_SPACING * 0.6;
      r <= t.radius - 0.15;
      r += SAMPLE_SPACING
    ) {
      const n = Math.max(6, Math.round((2 * Math.PI * r) / SAMPLE_SPACING));
      for (let k = 0; k < n; k++) {
        const a = r + (2 * Math.PI * k) / n; // ring radius as phase offset
        pts.push({ x: r * Math.cos(a), y: t.top, z: CAKE_Z + r * Math.sin(a) });
      }
    }
  }
  return pts;
}

export const CAKE_SAMPLES: readonly Vec3[] = buildSamples();

export class FrostingField {
  private coats: number[] = new Array<number>(CAKE_SAMPLES.length).fill(0);

  /** Apply one paint event (a frosting glob's first impact). Returns how
   * many sample points it painted — 0 means floor frosting (mess). */
  paint(impact: Vec3, speed: number): number {
    const r = splatRadius(speed);
    const add = splatCoats(speed);
    let painted = 0;
    for (let i = 0; i < CAKE_SAMPLES.length; i++) {
      const s = CAKE_SAMPLES[i]!;
      if (Math.abs(s.y - impact.y) > FROST_VERTICAL_BAND) continue;
      if (Math.hypot(s.x - impact.x, s.z - impact.z) > r) continue;
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
    for (let i = 0; i < CAKE_SAMPLES.length; i++) {
      if (this.coats[i]! === 0) continue;
      const s = CAKE_SAMPLES[i]!;
      const d = Math.hypot(s.x - pos.x, s.y - pos.y, s.z - pos.z);
      if (d <= within) return true;
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

  /** Adopt a wire snapshot (late join / refresh). Ignores a snapshot whose
   * length disagrees with this build's sample grid — a version-skew guard;
   * the field then starts clean rather than corrupt. */
  restore(coats: readonly number[]): void {
    if (coats.length !== this.coats.length) return;
    this.coats = [...coats];
  }

  /** The Giant licks the cake clean between orders (plans/07 phase F). */
  reset(): void {
    this.coats.fill(0);
  }
}
