/**
 * THE DESSERT — one spec, arbitrary stacked geometry (plans/13 §3, slice 2).
 *
 * A DessertSpec is a data row: concentric round tiers, base first. Today's
 * cake is the `cake-3` row — its tiers are the pre-refactor CAKE_TIERS
 * verbatim, and every pinned number (the 661 census, the settle ladder,
 * the WIN path) must reproduce against it: that is the ZERO-DRIFT proof
 * this refactor ships under. A cupcake, a sundae, a taller cake: rows.
 * A tray of many small desserts: NOT a row (coverage-model restructuring,
 * a later chapter — plans/09 §6).
 *
 * `dessertGeometry(spec)` is THE ONE PUBLIC FORM (slice-2 rulings, plans/13
 * §3): it binds the tier math and builds the census once, per deal. The
 * tier math lives below as PRIVATE functions — deliberately unexported: a
 * public free layer would let a call site import a spec row directly and
 * compile while scoring rung 5 against cake-3. Everything downstream
 * receives the geometry from whoever owns the current deal (the Room
 * server-side, the view client-side) — geometry is an ARGUMENT, never a
 * field, on core/ classes (the visionary's ruling: an argument is
 * impossible to get wrong silently).
 *
 * WHERE the dessert sits is the ARENA's business (CAKE_Z — the axis the
 * towns rotate about); this module owns WHAT it is.
 *
 * core/ law: deterministic, may import Rapier, no DOM, no three.js.
 */
import RAPIER from "@dimforge/rapier3d-compat";
import { CAKE_Z } from "./arena";
import type { Vec3 } from "./ballistics";
import { buildCensus, type FrostSample } from "./frosting";

export interface CakeTier {
  /** x/z radius (tiers are cylinders, concentric on CAKE_Z). */
  radius: number;
  bottom: number;
  top: number;
}

/** One dessert, as data. The wire never carries this — the fresh-deal
 * message carries the RUNG NUMBER and both sides look the spec up in
 * shared code (the event-sync law, plans/06: events and seeds, never
 * surfaces). */
export interface DessertSpec {
  /** The wire name ("cake-3"). */
  id: string;
  /** Concentric round tiers, base first. */
  tiers: readonly CakeTier[];
}

/** THE ANCHOR (plans/13 §4): today's cake and today's numbers, verbatim.
 * Radii = the pinned square half-extents of plans/05, cylindrical since
 * plans/07 phase R; the settle ladder (6 → tier 2, 7 → tier 3, notch 1 +
 * full crank = the crown shot) and the curved-ledge catches are measured
 * against exactly these rows (research/04). Everything measured this week
 * stays pinned; the ladder is authored outward from this fixed point. */
export const CAKE_3: DessertSpec = {
  id: "cake-3",
  tiers: [
    { radius: 4, bottom: 0, top: 2 },
    { radius: 3, bottom: 2, top: 3.5 },
    { radius: 2.25, bottom: 3.5, top: 5 },
  ],
};

// ---------------------------------------------------------------------------
// THE LADDER'S CANDIDATE ROWS (plans/13 §4 + the cupcake amendment, §1).
// Authored 2026-07-08 (fourth session) as slice-3 MEASUREMENT INPUT: no
// rung's ask is pinned until its row has run research/13 + research/11
// (the re-pin law of the ladder). Nothing deals these until the RUNGS
// table goes live (slice 4) — until then game/campaign.ts still deals
// CAKE_3 every rung.
// ---------------------------------------------------------------------------

/** Rung 1: today's base tier alone — the tutorial-by-play humble cake.
 * Derived from the anchor, not copied: "today's base tier" is structural. */
export const CAKE_1: DessertSpec = {
  id: "cake-1",
  tiers: CAKE_3.tiers.slice(0, 1),
};

/** Rung 2: base + middle — the rung that teaches the ledge. */
export const CAKE_2: DessertSpec = {
  id: "cake-2",
  tiers: CAKE_3.tiers.slice(0, 2),
};

/** THE CUPCAKE (§1 amendment): one squat tiny tier — a PRECISION spike
 * (tall rungs are REACH spikes). Its ladder position is decided at
 * authoring, against its measured difficulty — after rung 3. */
export const CUPCAKE: DessertSpec = {
  id: "cupcake",
  tiers: [{ radius: 1.2, bottom: 0, top: 1.5 }],
};

/** Rungs 4+ (plans/13 §4 hypothesis): each tier extends today's
 * progression upward — radius step 0.65, height step 1.5 — so summits
 * sit near y 6.5 / 8 / 9.5. THE LADDER'S TOP IS WHERE THE TOOLS SAY THE
 * ENVELOPE DIES: if cake-6 proves unreachable it IS the near-impossible
 * final rung; if merely heroic, a cake-7 gets authored. */
const TIER_4 = { radius: 1.6, bottom: 5, top: 6.5 };
const TIER_5 = { radius: 0.95, bottom: 6.5, top: 8 };
const TIER_6 = { radius: 0.3, bottom: 8, top: 9.5 };

export const CAKE_4: DessertSpec = {
  id: "cake-4",
  tiers: [...CAKE_3.tiers, TIER_4],
};
export const CAKE_5: DessertSpec = {
  id: "cake-5",
  tiers: [...CAKE_3.tiers, TIER_4, TIER_5],
};
export const CAKE_6: DessertSpec = {
  id: "cake-6",
  tiers: [...CAKE_3.tiers, TIER_4, TIER_5, TIER_6],
};

/** Every authored row, by wire id — the research tools' lookup and (from
 * slice 4) the RUNGS table's referent. A row in this table is NOT a row
 * in the ladder; RUNGS decides what deals. */
export const DESSERT_SPECS: readonly DessertSpec[] = [
  CUPCAKE,
  CAKE_1,
  CAKE_2,
  CAKE_3,
  CAKE_4,
  CAKE_5,
  CAKE_6,
];

/** Look a spec up by its wire id (research CLI, future RUNGS validation). */
export function specById(id: string): DessertSpec | undefined {
  return DESSERT_SPECS.find((s) => s.id === id);
}

/** Named scoring zones orders can demand: the whole dessert, or one tier
 * by INDEX (0 = base). Generalized from the tier1/2/3 strings with the
 * spec refactor (plans/13 §3) — an order row may only reference tiers its
 * rung's spec actually has. "peak" retired with the box cake (plans/05);
 * the crown requirement owns the summit. */
export type ZoneId = "cake" | number;

/** The words for a tier zone — order-facing text, so the culprit-naming
 * law applies (a failed row must read as the player remembers it). The
 * rule reproduces cake-3's beloved names exactly: base = BOTTOM, summit =
 * TOP, a sole interior tier = MIDDLE; taller stacks count from the
 * bottom, 1-based ("TIER 2 (of 5)"-style words wait for a real tall spec
 * and a feel pass). */
export function tierLabel(tier: number, topTier: number): string {
  if (tier === topTier) return "on the TOP TIER";
  if (tier === 0) return "on the BOTTOM TIER";
  if (topTier === 2) return "on the MIDDLE TIER";
  return `on TIER ${tier + 1}`;
}

// ---------------------------------------------------------------------------
// The tier math — PRIVATE on purpose (header note). Moved verbatim from
// core/arena.ts (pre-slice-2), with the module-level CAKE_TIERS replaced
// by the spec's rows; the constants (wedge slack 0.1, cross-engine sqrt
// discipline) are untouched — the zero-drift proof leans on it.
// ---------------------------------------------------------------------------

/**
 * Which tier a rest position sits ON — the TOPMOST tier whose disc holds it
 * at (or a wedge-slack 0.1 below) its top level. A topping on the tier-2
 * ledge pressed against the tier-3 wall is on tier 2; a topping atop
 * another topping still reads the tier under the stack. null = not on the
 * dessert. Scoring truth is REST position; this is its geometry oracle.
 */
function tierOf(tiers: readonly CakeTier[], pos: Vec3): number | null {
  for (let i = tiers.length - 1; i >= 0; i--) {
    const t = tiers[i]!;
    if (Math.hypot(pos.x, pos.z - CAKE_Z) <= t.radius && pos.y > t.top - 0.1)
      return i;
  }
  return null;
}

/** Analytic distance from a point to the TIER STACK (the union of the
 * cylinders) — the sprinkle proximity fuse (plans/10). Zero inside a tier.
 * sqrt/mul/add ONLY (no hypot): clients REPLAY bursts from the shot event's
 * seed, so the fuse must agree across engines to the bit (the cross-engine
 * honesty law, core/frosting.ts header). */
function distanceToCake(tiers: readonly CakeTier[], pos: Vec3): number {
  const dzc = pos.z - CAKE_Z;
  const radial = Math.sqrt(pos.x * pos.x + dzc * dzc);
  let best = Infinity;
  for (const t of tiers) {
    const dr = radial > t.radius ? radial - t.radius : 0;
    const dy =
      pos.y < t.bottom ? t.bottom - pos.y : pos.y > t.top ? pos.y - t.top : 0;
    const d = Math.sqrt(dr * dr + dy * dy);
    if (d < best) best = d;
  }
  return best;
}

/** Nearest point ON the tier stack's skin, with its outward normal — the
 * conversion law's placement oracle (plans/10 §8): a gripped grain's
 * record is its skin point (scoring truth: tierOf works on it) and the
 * client perches the sprinkle visual along the normal, atop the frosting
 * blob. sqrt/mul/div only — exactly rounded, cross-engine identical, like
 * distanceToCake above. For a point INSIDE a tier (contact penetration,
 * rare) the shallower of wall/top wins — never a downward normal. */
function cakeSurface(
  tiers: readonly CakeTier[],
  pos: Vec3,
): { point: Vec3; normal: Vec3 } {
  const dzc = pos.z - CAKE_Z;
  const radial = Math.sqrt(pos.x * pos.x + dzc * dzc);
  // Radial direction; dead-center tie-break is +x (deterministic, and a
  // grain exactly on the axis cannot grip a wall anyway).
  const dirx = radial > 0 ? pos.x / radial : 1;
  const dirz = radial > 0 ? dzc / radial : 0;
  let best: { d: number; point: Vec3; normal: Vec3 } | null = null;
  for (const t of tiers) {
    let cand: { d: number; point: Vec3; normal: Vec3 };
    const inR = radial <= t.radius;
    const inY = pos.y >= t.bottom && pos.y <= t.top;
    if (inR && inY) {
      // Inside the cylinder: project to the shallower face (wall or top).
      const wallPen = t.radius - radial;
      const topPen = t.top - pos.y;
      cand =
        topPen <= wallPen
          ? {
              d: 0,
              point: { x: pos.x, y: t.top, z: pos.z },
              normal: { x: 0, y: 1, z: 0 },
            }
          : {
              d: 0,
              point: {
                x: t.radius * dirx,
                y: pos.y,
                z: CAKE_Z + t.radius * dirz,
              },
              normal: { x: dirx, y: 0, z: dirz },
            };
    } else {
      // Outside: clamp to the solid cylinder — the nearest skin point —
      // and the normal is the offset direction (top, wall, or rim blend).
      const cr = inR ? radial : t.radius;
      const cy = pos.y < t.bottom ? t.bottom : pos.y > t.top ? t.top : pos.y;
      const point: Vec3 = { x: cr * dirx, y: cy, z: CAKE_Z + cr * dirz };
      const dx = pos.x - point.x;
      const dy = pos.y - point.y;
      const dz = pos.z - point.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      cand = {
        d,
        point,
        normal:
          d > 0
            ? { x: dx / d, y: dy / d, z: dz / d }
            : { x: dirx, y: 0, z: dirz },
      };
    }
    if (best === null || cand.d < best.d) best = cand;
  }
  return { point: best!.point, normal: best!.normal };
}

// ---------------------------------------------------------------------------
// The bound form — what everything downstream actually holds.
// ---------------------------------------------------------------------------

/** One deal's dessert, bound: the spec, its tier oracles, and its census —
 * built once by dessertGeometry() and owned by the deal's owner (Room /
 * client view). Colliders are built and torn down THROUGH it so the
 * per-deal swap has one shape on both replicas. */
export interface DessertGeometry {
  readonly spec: DessertSpec;
  /** Index of the summit tier — where a crown must rest (game/judgment). */
  readonly topTier: number;
  /** The census grid (core/frosting buildCensus) — the FrostingField and
   * the client's blob instancing are sized by it, per deal. */
  readonly samples: readonly FrostSample[];
  tierOf(pos: Vec3): number | null;
  isOnCake(pos: Vec3): boolean;
  isInZone(zone: ZoneId, pos: Vec3): boolean;
  distanceToCake(pos: Vec3): number;
  cakeSurface(pos: Vec3): { point: Vec3; normal: Vec3 };
  /** Build this dessert's colliders; returns the handles so the deal
   * boundary can tear them down (the split from buildArenaColliders —
   * arena statics build once, the dessert rebuilds per deal). */
  buildColliders(world: RAPIER.World): RAPIER.Collider[];
}

/** Bind a spec into its geometry — once per deal (the samples are the
 * expensive part; the oracles are cheap closures over the rows). */
export function dessertGeometry(spec: DessertSpec): DessertGeometry {
  const tiers = spec.tiers;
  return {
    spec,
    topTier: tiers.length - 1,
    samples: buildCensus(spec),
    tierOf: (pos) => tierOf(tiers, pos),
    isOnCake: (pos) => tierOf(tiers, pos) !== null,
    isInZone: (zone, pos) => {
      const tier = tierOf(tiers, pos);
      if (tier === null) return false;
      return zone === "cake" || tier === zone;
    },
    distanceToCake: (pos) => distanceToCake(tiers, pos),
    cakeSurface: (pos) => cakeSurface(tiers, pos),
    buildColliders: (world) =>
      tiers.map((t) => {
        const hy = (t.top - t.bottom) / 2;
        return world.createCollider(
          RAPIER.ColliderDesc.cylinder(hy, t.radius).setTranslation(
            0,
            t.bottom + hy,
            CAKE_Z,
          ),
        );
      }),
  };
}
