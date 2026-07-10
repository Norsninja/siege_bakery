/**
 * The same-tick bury/add ordering contract (audit 2026-07-06). A grain that
 * GRIPS on the exact tick a covering glob lands must be buried on NEITHER
 * side — the Room's tickScoringPhase runs its burial filter BEFORE this
 * tick's grips enter the ledger, so the grip survives and counts. ShotsView
 * must mirror that: process ev.impacts (bury) BEFORE ev.stuck (add), or the
 * client erases a sprinkle the Room is counting — a checklist/screen split.
 *
 * We stub the private ProjectileManager.step to inject the coincidence
 * deterministically (orchestrating two real projectiles into the same
 * physics tick is brittle); everything else — the FrostingView/SprinklesView
 * wiring — is the real main.ts hookup, and the assertion is the OUTCOME
 * (does the record survive), not the call order.
 */
import { describe, it, expect, beforeAll } from "vitest";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { GRAVITY } from "../core/constants";
import { CAKE_Z } from "../core/arena";
import { CAKE_3, dessertGeometry } from "../core/dessert";
import type { StepEvents } from "../core/projectiles";
import { TOPPINGS } from "../game/toppings";
import {
  packShotTag,
  unpackShotTag,
  ShotsView,
  TRAIL_WINDOW_TICKS,
} from "./shots-view";
import type { ShotMsg } from "./net-handlers";
import { FrostingView } from "./frosting-view";
import { SprinklesView } from "./sprinkles-view";

beforeAll(async () => {
  await RAPIER.init();
});

/** Wire ShotsView to the real client views exactly as main.ts does. */
function harness() {
  const world = new RAPIER.World(GRAVITY);
  const scene = new THREE.Scene();
  const shotsView = new ShotsView(world, scene);
  const frostingView = new FrostingView(scene, GEOM.samples);
  const sprinklesView = new SprinklesView(scene);
  shotsView.onPaintImpact = (topping, pos, speed) => {
    frostingView.paintImpact(topping, pos, speed);
    sprinklesView.buryBy(pos, speed, TOPPINGS[topping]?.splat);
  };
  shotsView.onStuck = (_t, pos, normal) =>
    sprinklesView.add(pos, normal, frostingView.coatsNear(pos));
  // The private manager's step is what feeds step(); replace it so we can
  // stage a known StepEvents. `deal` starts at 0, so tag 0 is current.
  const setEvents = (ev: StepEvents): void => {
    (shotsView as unknown as { shots: { step: () => StepEvents } }).shots.step =
      () => ev;
  };
  const count = (): number =>
    (sprinklesView as unknown as { mesh: THREE.InstancedMesh }).mesh.count;
  return { shotsView, setEvents, count };
}

// The deal's geometry (spec refactor, plans/13 §3) — cake-3, the anchor.
const GEOM = dessertGeometry(CAKE_3);

// A grip point on the cake skin and a glob landing on the very same point.
const G = { x: 3.5, y: 2.0, z: CAKE_Z };
const N = { x: 0, y: 1, z: 0 };
const coveringImpact = {
  pos: { ...G },
  speed: 20,
  topping: "frosting",
  tag: 0,
  bodyHandle: -1, // no ribbon to halt in the stub rigs
};
const grip = { pos: { ...G }, normal: { ...N }, topping: "sprinkles", tag: 0 };
const empty: StepEvents = { impacts: [], settled: [], bursts: [], stuck: [] };
const noop = (): void => {};

describe("ShotsView same-tick bury/add ordering (audit 2026-07-06)", () => {
  it("a grip and a covering glob on the SAME tick: the grip SURVIVES (mirrors the Room)", () => {
    const { shotsView, setEvents, count } = harness();
    setEvents({ ...empty, impacts: [coveringImpact], stuck: [grip] });
    shotsView.step(GEOM, noop);
    // Old order (add then bury) removed it → 0; the Room would have counted
    // it. The fix keeps the record: bury runs before this tick's grip exists.
    expect(count()).toBe(1);
  });

  it("a glob on a STRICTLY LATER tick still buries the grip (burial law intact)", () => {
    const { shotsView, setEvents, count } = harness();
    setEvents({ ...empty, stuck: [grip] }); // tick 1: grip only
    shotsView.step(GEOM, noop);
    expect(count()).toBe(1);
    setEvents({ ...empty, impacts: [coveringImpact] }); // tick 2: the glob
    shotsView.step(GEOM, noop);
    expect(count()).toBe(0); // buried — the record is IN the cake now
  });
});

describe("landing rings: one per catapult (plans/15 item 1)", () => {
  const rings = (v: ShotsView): Map<number, THREE.Mesh> =>
    (v as unknown as { markers: Map<number, THREE.Mesh> }).markers;
  const impactAt = (town: number, x: number, deal = 0) => ({
    pos: { x, y: 2, z: CAKE_Z },
    speed: 20,
    topping: "frosting",
    tag: packShotTag(deal, town),
    bodyHandle: -1, // no ribbon to halt in the stub rigs
  });

  it("the tag round-trips (deal, town) — and the fixtures' tag 0 IS deal 0, town 0", () => {
    expect(unpackShotTag(packShotTag(0, 0))).toEqual({ deal: 0, town: 0 });
    expect(unpackShotTag(packShotTag(3, 1))).toEqual({ deal: 3, town: 1 });
    expect(unpackShotTag(packShotTag(7, 0))).toEqual({ deal: 7, town: 0 });
    expect(packShotTag(0, 0)).toBe(0);
  });

  it("a gun's next lob replaces ITS ring; a teammate's never does — and the lobby can't pile up", () => {
    const { shotsView, setEvents } = harness();
    // Five lobby test shots from town 0: one ring stands, the newest.
    for (let i = 0; i < 5; i++) {
      setEvents({ ...empty, impacts: [impactAt(0, i)] });
      shotsView.step(GEOM, noop);
    }
    expect(rings(shotsView).size).toBe(1);
    expect(rings(shotsView).get(0)!.position.x).toBe(4); // the last lob's x
    // Town 1 fires: its own ring appears; town 0's correction ring HOLDS.
    const town0Ring = rings(shotsView).get(0)!;
    setEvents({ ...empty, impacts: [impactAt(1, 9)] });
    shotsView.step(GEOM, noop);
    expect(rings(shotsView).size).toBe(2);
    expect(rings(shotsView).get(0)).toBe(town0Ring); // untouched, same mesh
    expect(rings(shotsView).get(1)!.position.x).toBe(9);
  });

  it("a stale-deal shot still rings (it visibly landed) but its town key is honest", () => {
    const { shotsView, setEvents } = harness();
    shotsView.bumpDeal(); // the client is on deal 1 now
    setEvents({ ...empty, impacts: [impactAt(1, 5, 0)] }); // deal-0 straggler
    shotsView.step(GEOM, noop);
    expect(rings(shotsView).size).toBe(1);
    expect(rings(shotsView).get(1)).toBeDefined();
  });

  it("the fresh deal clears every gun's ring (fresh-cake law unchanged)", () => {
    const { shotsView, setEvents } = harness();
    setEvents({ ...empty, impacts: [impactAt(0, 1), impactAt(1, 2)] });
    shotsView.step(GEOM, noop);
    expect(rings(shotsView).size).toBe(2);
    shotsView.clearLandingMarkers();
    expect(rings(shotsView).size).toBe(0);
  });
});

describe("projectile trails: the comet ribbon (plans/15 item 4)", () => {
  // REAL physics here (no step stub): the trail contract is about a body's
  // actual flight — spawn, fly, land — so the tests fly real lobs over a
  // plain floor collider (any lob eventually lands on SOMETHING, like the
  // bakery floor litter does).
  type TrailPeek = {
    samples: { age: number }[];
    geometry: THREE.BufferGeometry;
  };
  const trails = (v: ShotsView): TrailPeek[] =>
    (v as unknown as { trails: TrailPeek[] }).trails;
  const bodies = (v: ShotsView): RAPIER.RigidBody[] =>
    (
      v as unknown as { meshes: Array<{ body: RAPIER.RigidBody }> }
    ).meshes.map((m) => m.body);
  const lob = (topping: string): ShotMsg => ({
    t: "shot",
    town: 0,
    topping,
    traverseDeg: 0,
    tiltNotch: 0,
    tensionClicks: 6,
    seed: 7,
  });
  function rig() {
    const world = new RAPIER.World(GRAVITY);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(400, 0.1, 400).setTranslation(0, -0.1, 0),
    );
    const view = new ShotsView(world, new THREE.Scene());
    return { world, view };
  }

  it("a lob wears a ribbon: samples accrete per tick, capped at the window", () => {
    const { view } = rig();
    view.spawn(lob("cherry"));
    expect(trails(view).length).toBe(1);
    for (let i = 0; i < 10; i++) view.step(GEOM, noop);
    expect(trails(view)[0]!.samples.length).toBe(10);
    for (let i = 0; i < TRAIL_WINDOW_TICKS + 20; i++) view.step(GEOM, noop);
    expect(trails(view)[0]!.samples.length).toBeLessThanOrEqual(
      TRAIL_WINDOW_TICKS + 1,
    );
  });

  it("a consumed glob's ribbon OUTLIVES the body, then dissolves over the window", () => {
    const { view } = rig();
    view.spawn(lob("frosting")); // paint: consumed at impact, body removed
    let landed = false;
    for (let i = 0; i < 600 && !landed; i++) {
      view.step(GEOM, noop);
      landed = !bodies(view)[0]!.isValid();
    }
    expect(landed).toBe(true);
    expect(trails(view).length).toBe(1); // the arc still hangs, dissolving
    for (let i = 0; i < TRAIL_WINDOW_TICKS + 2; i++) view.step(GEOM, noop);
    expect(trails(view).length).toBe(0); // gone — the ring is the record
  });

  it("grains never trail: the pop spawns grain meshes and ZERO new ribbons", () => {
    const { view } = rig();
    view.spawn(lob("sprinkles")); // the burst carrier
    let popped = false;
    for (let i = 0; i < 600 && !popped; i++) {
      view.step(GEOM, noop);
      popped = bodies(view).length > 1; // grains joined the mesh list
    }
    expect(popped).toBe(true);
    expect(trails(view).length).toBe(1); // the carrier's — and only ever the carrier's
  });

  it("THE FLIGHT IS THE TRAIL (ruling 2026-07-09): a solid's ribbon HALTS at first impact, then dissolves — no idle pile-up (the rings lesson)", () => {
    const { view } = rig();
    view.spawn(lob("cherry"));
    // Fly the real lob to its first contact (the flash speaks only there:
    // a cherry has no burst, and its landing is the rig's only impact).
    let impacted = false;
    for (let i = 0; i < 600 && !impacted; i++)
      view.step(GEOM, () => (impacted = true));
    expect(impacted).toBe(true);
    const atImpact = trails(view)[0]!.samples.length;
    // The feed stopped AT contact: each further tick only ages the arc out
    // — exactly one sample leaves the tail, none joins the head, even
    // though the body may still be rolling.
    view.step(GEOM, noop);
    view.step(GEOM, noop);
    expect(trails(view)[0]!.samples.length).toBe(atImpact - 2);
    for (let i = 0; i < TRAIL_WINDOW_TICKS + 2; i++) view.step(GEOM, noop);
    // The body lives on as floor litter; its ribbon must NOT idle beside it
    // forever — lobby test shots would grow the scene without bound.
    expect(bodies(view)[0]!.isValid()).toBe(true);
    expect(trails(view).length).toBe(0);
  });

  it("sync billboards the ribbon: a newborn draws nothing, a flying arc draws its strip", () => {
    const { view } = rig();
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 5, 20);
    view.spawn(lob("cherry"));
    view.sync(camera); // zero samples — zero draw range, no throw
    expect(trails(view)[0]!.geometry.drawRange.count).toBe(0);
    for (let i = 0; i < 6; i++) view.step(GEOM, noop);
    view.sync(camera);
    // 6 samples → 5 segments → 2 triangles each → 30 indices drawn.
    expect(trails(view)[0]!.geometry.drawRange.count).toBe(30);
  });
});
