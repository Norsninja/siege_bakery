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
import { buildCensus, SAMPLE_SPACING, type FrostSample } from "./frosting";

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

/** THE PRACTICE TARGET (plans/15 item 25, the training lobby): a
 * cupcake painted on a wooden plank, standing on the plate — a TARGET,
 * not a dessert. It rides the whole dessert institution (colliders in
 * both worlds, the frosting field, the verdict oracle) as a spec row,
 * but it is deliberately NOT in DESSERT_SPECS: RUNGS never deals it and
 * it never rides the wire — game/campaign.dessertSpecFor derives it
 * from the run PHASE on every replica. The tier row is NOMINAL — a
 * bounding cylinder for generic readers only; the practice branch of
 * dessertGeometry() builds its real shape from PRACTICE_STAND below
 * (re-ruled 2026-07-12: the collider FITS THE STAND — the interim fat
 * cylinder around a flat board bonked honest near-misses, the exact
 * forcefield failure its own comment warned about). */
export const PRACTICE_TARGET: DessertSpec = {
  id: "practice",
  tiers: [{ radius: 2.9, bottom: 0, top: 5.4 }],
};

/** THE PRACTICE STAND (the re-ruling's shape): authored boxes from the
 * measured model — the visionary's wood_target_lg.blend (band
 * histogram 2026-07-12; blend spans w 1.900 × h 1.804 × t 0.218, feet
 * at z −0.903, painted face −Y → game +z, toward town 0 — the lobby
 * seats everyone in town 0, so one face is the whole audience).
 * RULED SCALE 3: board face w 5.31 spanning y 1.13–5.41 — the greybox
 * plank's presence, kept. The client dresses the GLB with `scale` and
 * `lift`; the sim builds these boxes — one measurement, both worlds.
 * Regenerate by re-measuring the blend, never by eye. */
export const PRACTICE_STAND = {
  /** Model multiplier (client dress) — blend units → game meters. */
  scale: 3,
  /** Y offset planting the model's feet on the plate (0.903 × scale). */
  lift: 2.71,
  /** The framed board, the paintable target face. */
  board: { halfW: 2.66, halfT: 0.33, bottom: 1.13, top: 5.41 },
  /** The two legs under the board's outer thirds. */
  legs: { x: 1.95, halfW: 0.3, halfT: 0.2, bottom: 0.46, top: 1.13 },
  /** The foot rail on the plate. */
  rail: { halfW: 2.85, halfT: 0.28, bottom: 0, top: 0.46 },
} as const;

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
// THE PRACTICE STAND's geometry (item 25 as re-ruled) — box math instead
// of tier math, PRIVATE for the same reason: dessertGeometry(spec) stays
// THE ONE PUBLIC FORM, and the branch below is the only fork. Same
// determinism discipline as the cylinders: abs/max/sqrt/mul/add only.
// ---------------------------------------------------------------------------

interface StandBox {
  cx: number;
  cy: number;
  cz: number;
  hx: number;
  hy: number;
  hz: number;
}

/** The stand as axis-aligned boxes at the cake mark (it faces town 0
 * square-on; no rotation exists to handle). */
const STAND_BOXES: readonly StandBox[] = (() => {
  const { board, legs, rail } = PRACTICE_STAND;
  const box = (
    cx: number,
    b: { halfW: number; halfT: number; bottom: number; top: number },
    hx = b.halfW,
  ): StandBox => ({
    cx,
    cy: (b.bottom + b.top) / 2,
    cz: CAKE_Z,
    hx,
    hy: (b.top - b.bottom) / 2,
    hz: b.halfT,
  });
  return [
    box(0, board),
    box(-legs.x, legs, legs.halfW),
    box(legs.x, legs, legs.halfW),
    box(0, rail),
  ];
})();

/** Distance from a point to one box's skin (0 inside). */
function boxDistance(b: StandBox, pos: Vec3): number {
  const dx = Math.max(Math.abs(pos.x - b.cx) - b.hx, 0);
  const dy = Math.max(Math.abs(pos.y - b.cy) - b.hy, 0);
  const dz = Math.max(Math.abs(pos.z - b.cz) - b.hz, 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Nearest point ON one box's skin with its outward normal — the box
 * twin of the cylinder cakeSurface: outside clamps to the skin, inside
 * projects to the shallowest face (never a downward normal for a point
 * over the top: the top face wins ties the same way). */
function boxSurface(b: StandBox, pos: Vec3): { point: Vec3; normal: Vec3 } {
  const lx = pos.x - b.cx;
  const ly = pos.y - b.cy;
  const lz = pos.z - b.cz;
  const inside =
    Math.abs(lx) <= b.hx && Math.abs(ly) <= b.hy && Math.abs(lz) <= b.hz;
  if (!inside) {
    const px = Math.min(Math.max(lx, -b.hx), b.hx);
    const py = Math.min(Math.max(ly, -b.hy), b.hy);
    const pz = Math.min(Math.max(lz, -b.hz), b.hz);
    const point: Vec3 = { x: b.cx + px, y: b.cy + py, z: b.cz + pz };
    const dx = pos.x - point.x;
    const dy = pos.y - point.y;
    const dz = pos.z - point.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return {
      point,
      normal:
        d > 0
          ? { x: dx / d, y: dy / d, z: dz / d }
          : { x: 0, y: 1, z: 0 },
    };
  }
  // Inside: shallowest penetration axis, top-face bias on the y tie.
  const penX = b.hx - Math.abs(lx);
  const penY = b.hy - Math.abs(ly);
  const penZ = b.hz - Math.abs(lz);
  if (penY <= penX && penY <= penZ) {
    const s = ly >= 0 ? 1 : -1;
    return {
      point: { x: pos.x, y: b.cy + s * b.hy, z: pos.z },
      normal: { x: 0, y: s, z: 0 },
    };
  }
  if (penZ <= penX) {
    const s = lz >= 0 ? 1 : -1;
    return {
      point: { x: pos.x, y: pos.y, z: b.cz + s * b.hz },
      normal: { x: 0, y: 0, z: s },
    };
  }
  const s = lx >= 0 ? 1 : -1;
  return {
    point: { x: b.cx + s * b.hx, y: pos.y, z: pos.z },
    normal: { x: s, y: 0, z: 0 },
  };
}

/** Rest position ON the stand — the box twin of tierOf's wedge-slack
 * law: the board's top edge and the foot rail hold a topping the way
 * tier tops do. One tier: the stand is all "tier 0". */
function standTierOf(pos: Vec3): number | null {
  const { board, rail } = PRACTICE_STAND;
  const dz = pos.z - CAKE_Z;
  if (
    Math.abs(pos.x) <= board.halfW &&
    Math.abs(dz) <= board.halfT &&
    pos.y > board.top - 0.1
  )
    return 0;
  if (
    Math.abs(pos.x) <= rail.halfW &&
    Math.abs(dz) <= rail.halfT &&
    pos.y > rail.top - 0.1
  )
    return 0;
  return null;
}

/** The stand's census: a grid over the board's PAINTED FACE (game +z —
 * the face that greets town 0; the lobby seats everyone there, so one
 * face is the whole audience). Paint finally sits ON the board — the
 * interim cylinder's samples floated in the air beside it. Plus the
 * stand's UPWARD skin, area-honest like tier tops: the board's top
 * edge (a lob grazing over the top IS a hit) and the foot rail (a
 * short shot frosting the stand's foot — the cake-wall-base ruling's
 * spirit). Same spacing as the cake skin (~120 samples). */
function practiceCensus(): FrostSample[] {
  const { board, rail } = PRACTICE_STAND;
  const z = CAKE_Z + board.halfT;
  const face: Vec3 = { x: 0, y: 0, z: 1 };
  const up: Vec3 = { x: 0, y: 1, z: 0 };
  const pts: FrostSample[] = [];
  for (let y = board.bottom + 0.3; y <= board.top - 0.2; y += SAMPLE_SPACING)
    for (
      let x = -(board.halfW - 0.25);
      x <= board.halfW - 0.25;
      x += SAMPLE_SPACING
    )
      pts.push({ pos: { x, y, z }, normal: face });
  for (
    let x = -(board.halfW - 0.25);
    x <= board.halfW - 0.25;
    x += SAMPLE_SPACING
  )
    pts.push({ pos: { x, y: board.top, z: CAKE_Z }, normal: up });
  for (
    let x = -(rail.halfW - 0.25);
    x <= rail.halfW - 0.25;
    x += SAMPLE_SPACING
  )
    pts.push({ pos: { x, y: rail.top, z: CAKE_Z }, normal: up });
  return pts;
}

/** Bind the practice spec — the one fork off the cylinder road. */
function practiceGeometry(spec: DessertSpec): DessertGeometry {
  return {
    spec,
    topTier: 0,
    samples: practiceCensus(),
    tierOf: standTierOf,
    isOnCake: (pos) => standTierOf(pos) !== null,
    isInZone: (zone, pos) => {
      const tier = standTierOf(pos);
      if (tier === null) return false;
      return zone === "cake" || tier === zone;
    },
    distanceToCake: (pos) => {
      let best = Infinity;
      for (const b of STAND_BOXES) {
        const d = boxDistance(b, pos);
        if (d < best) best = d;
      }
      return best;
    },
    cakeSurface: (pos) => {
      let best = STAND_BOXES[0]!;
      let bestD = Infinity;
      for (const b of STAND_BOXES) {
        const d = boxDistance(b, pos);
        if (d < bestD) {
          bestD = d;
          best = b;
        }
      }
      return boxSurface(best, pos);
    },
    buildColliders: (world) =>
      STAND_BOXES.map((b) =>
        world.createCollider(
          RAPIER.ColliderDesc.cuboid(b.hx, b.hy, b.hz).setTranslation(
            b.cx,
            b.cy,
            b.cz,
          ),
        ),
      ),
  };
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
 * expensive part; the oracles are cheap closures over the rows). The
 * practice target forks here to its authored box shape (PRACTICE_STAND);
 * every dessert row rides the cylinder road unchanged. */
export function dessertGeometry(spec: DessertSpec): DessertGeometry {
  if (spec.id === PRACTICE_TARGET.id) return practiceGeometry(spec);
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
