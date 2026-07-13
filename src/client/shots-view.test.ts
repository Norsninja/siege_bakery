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
import { WORD_LIFE_TICKS } from "./comic-word";
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
    const painted = frostingView.paintImpact(topping, pos, speed);
    sprinklesView.buryBy(pos, speed, TOPPINGS[topping]?.splat);
    return painted;
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
  otherHandle: -1, // nothing named on the other side
};
const grip = { pos: { ...G }, normal: { ...N }, topping: "sprinkles", tag: 0 };
const empty: StepEvents = { impacts: [], settled: [], bursts: [], stuck: [] };
// The FX port (slice 6): tests announce into the void — no test may
// depend on what's audible (the jukebox law, extended to the table).
const noop = { flash: (): void => {}, sound: (): void => {} };

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

describe("THE EARNED-TIME POP (plans/22 step 6b): fresh coverage floats a green +Ns", () => {
  const words = (v: ShotsView): Array<{ text: string }> =>
    (v as unknown as { words: Array<{ text: string }> }).words;
  const plusNs = (v: ShotsView): number =>
    words(v).filter((w) => /^\+\d+s$/.test(w.text)).length;

  it("a live rung's FRESH paint floats +Ns; a re-coat stays silent (zero fresh)", () => {
    const { shotsView, setEvents } = harness();
    shotsView.orderLive = true;
    // First frosting glob on the naked anchor cake — all fresh, buys clock.
    setEvents({ ...empty, impacts: [coveringImpact] });
    shotsView.step(GEOM, noop);
    expect(words(shotsView).map((w) => w.text)).toContain("SPLAT!"); // still shouts
    expect(plusNs(shotsView)).toBe(1); // and the earned-time pop rides above
    // A re-coat on the SAME spot is zero fresh — the cake is saturated there,
    // so it earns the Room no clock and floats no new pop.
    setEvents({ ...empty, impacts: [coveringImpact] });
    shotsView.step(GEOM, noop);
    expect(plusNs(shotsView)).toBe(1); // no NEW "+Ns" (still just the first)
  });

  it("the SANDBOX never fakes a timer: orderLive false → no +Ns even on fresh paint", () => {
    const { shotsView, setEvents } = harness();
    shotsView.orderLive = false; // lobby: the plank paints, no clock ticks
    setEvents({ ...empty, impacts: [coveringImpact] });
    shotsView.step(GEOM, noop);
    expect(words(shotsView).map((w) => w.text)).toContain("SPLAT!"); // landing speaks
    expect(plusNs(shotsView)).toBe(0); // but no earned-time pop
  });
});

type RingRec = { mesh: THREE.Mesh; bodyHandle: number };
const rings = (v: ShotsView): Map<number, RingRec> =>
  (v as unknown as { markers: Map<number, RingRec> }).markers;
const ringColor = (v: ShotsView, town: number): number =>
  (rings(v).get(town)!.mesh.material as THREE.MeshBasicMaterial).color.getHex();

describe("landing rings: one per catapult (plans/15 item 1)", () => {
  const impactAt = (town: number, x: number, deal = 0) => ({
    pos: { x, y: 2, z: CAKE_Z },
    speed: 20,
    topping: "frosting",
    tag: packShotTag(deal, town),
    bodyHandle: -1, // no ribbon to halt in the stub rigs
    otherHandle: -1,
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
    expect(rings(shotsView).get(0)!.mesh.position.x).toBe(4); // the last lob's x
    // Town 1 fires: its own ring appears; town 0's correction ring HOLDS.
    const town0Ring = rings(shotsView).get(0)!.mesh;
    setEvents({ ...empty, impacts: [impactAt(1, 9)] });
    shotsView.step(GEOM, noop);
    expect(rings(shotsView).size).toBe(2);
    expect(rings(shotsView).get(0)!.mesh).toBe(town0Ring); // untouched, same mesh
    expect(rings(shotsView).get(1)!.mesh.position.x).toBe(9);
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
  const words = (v: ShotsView): Array<{ text: string }> =>
    (v as unknown as { words: Array<{ text: string }> }).words;
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
      view.step(GEOM, { ...noop, flash: () => (impacted = true) });
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

  it("THE COMIC WORD rides the pop: YOUR carrier's burst says POP!, its grains land wordless", () => {
    const { view } = rig();
    const played: string[] = [];
    const fx = { ...noop, sound: (key: string) => played.push(key) };
    view.spawn(lob("sprinkles")); // town 0 — and yourTown defaults to 0
    let popped = false;
    for (let i = 0; i < 600 && !popped; i++) {
      view.step(GEOM, fx);
      popped = bodies(view).length > 1;
    }
    expect(popped).toBe(true);
    expect(words(view).map((w) => w.text)).toEqual(["POP!"]);
    // The pairing law: the pop's sound landed WITH its word — one
    // announcement (and the grains below stay soundless too).
    expect(played).toEqual(["pop"]);
    // The grains rain down over the next beats — quiet, per the law: no
    // word ever joins (or replaces) the pop's own.
    for (let i = 0; i < 40; i++) view.step(GEOM, fx);
    for (const w of words(view)) expect(w.text).toBe("POP!");
    expect(words(view).length).toBeLessThanOrEqual(1);
    expect(played).toEqual(["pop"]);
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

describe("THE COMIC WORD (plans/15 item 13): your own landings speak in the world", () => {
  const words = (v: ShotsView): Array<{ text: string }> =>
    (v as unknown as { words: Array<{ text: string }> }).words;
  const landing = (town: number, speed: number, grain = false) => ({
    pos: { x: 2, y: 1, z: CAKE_Z },
    speed,
    topping: "cherry",
    tag: packShotTag(0, town),
    bodyHandle: -1,
    otherHandle: -1,
    ...(grain ? { grain: true } : {}),
  });

  it("hot SHOUTS, gentle whispers: SPLAT! over the splat, plop. over the placement", () => {
    const { shotsView, setEvents } = harness();
    setEvents({ ...empty, impacts: [landing(0, 20)] });
    shotsView.step(GEOM, noop);
    setEvents({ ...empty, impacts: [landing(0, 1)] });
    shotsView.step(GEOM, noop);
    expect(words(shotsView).map((w) => w.text)).toEqual(["SPLAT!", "plop."]);
  });

  it("only YOUR town's shots speak — the teammate crew's landings stay wordless, and the filter follows a town switch", () => {
    const { shotsView, setEvents } = harness();
    setEvents({ ...empty, impacts: [landing(1, 20)] });
    shotsView.step(GEOM, noop);
    expect(words(shotsView).length).toBe(0); // town 1's shot, our town 0 eyes
    shotsView.yourTown = 1; // the pickTown ack moved us (main's bindTown)
    setEvents({ ...empty, impacts: [landing(1, 20)] });
    shotsView.step(GEOM, noop);
    expect(words(shotsView).map((w) => w.text)).toEqual(["SPLAT!"]);
  });

  it("grains never speak (the quiet-grain law holds at the word layer too)", () => {
    const { shotsView, setEvents } = harness();
    setEvents({ ...empty, impacts: [landing(0, 20, true)] });
    shotsView.step(GEOM, noop);
    expect(words(shotsView).length).toBe(0);
  });

  it("THE PAIRING LAW (slice 6): the sound rides the word's exact predicate — splat/plop by speed, own town only, grains silent", () => {
    const { shotsView, setEvents } = harness();
    const played: string[] = [];
    const fx = { ...noop, sound: (key: string) => played.push(key) };
    setEvents({ ...empty, impacts: [landing(0, 20)] }); // hot → splat
    shotsView.step(GEOM, fx);
    setEvents({ ...empty, impacts: [landing(0, 1)] }); // gentle → plop
    shotsView.step(GEOM, fx);
    setEvents({ ...empty, impacts: [landing(1, 20)] }); // foreign → silent
    shotsView.step(GEOM, fx);
    setEvents({ ...empty, impacts: [landing(0, 20, true)] }); // grain → silent
    shotsView.step(GEOM, fx);
    expect(played).toEqual(["splat", "plop"]);
  });

  it("the word lives its beat and leaves — nothing piles up", () => {
    const { shotsView, setEvents } = harness();
    setEvents({ ...empty, impacts: [landing(0, 20)] });
    shotsView.step(GEOM, noop);
    expect(words(shotsView).length).toBe(1);
    setEvents(empty);
    for (let i = 0; i <= WORD_LIFE_TICKS; i++) shotsView.step(GEOM, noop);
    expect(words(shotsView).length).toBe(0);
  });
});

describe("THE LANDING VERDICT (plans/15 item 15): color is the verdict channel", () => {
  const GREEN = 0x3fae5a;
  const RED = 0xd8452e;
  const NEUTRAL = 0xe8e0d2;
  const paintAt = (pos: { x: number; y: number; z: number }) => ({
    pos,
    speed: 20,
    topping: "frosting",
    tag: 0,
    bodyHandle: -1,
    otherHandle: -1,
  });
  const solidAt = (bodyHandle: number, speed = 20) => ({
    pos: { x: 2, y: 1, z: CAKE_Z },
    speed,
    topping: "cherry",
    tag: 0,
    bodyHandle,
    otherHandle: -1,
  });
  const settleOf = (
    bodyHandle: number,
    pos: { x: number; y: number; z: number },
    grain = false,
  ) => ({
    pos,
    topping: "cherry",
    tag: 0,
    body: { handle: bodyHandle } as unknown as RAPIER.RigidBody,
    ...(grain ? { grain: true } : {}),
  });

  it("frosting verdicts AT IMPACT (paint scores at impact): on the cake = green", () => {
    const { shotsView, setEvents } = harness();
    setEvents({ ...empty, impacts: [paintAt({ x: 2, y: 2, z: CAKE_Z })] });
    shotsView.step(GEOM, noop);
    expect(ringColor(shotsView, 0)).toBe(GREEN);
  });

  it("frosting on the floor = red — and a STALE glob is red too (it scored nothing)", () => {
    const { shotsView, setEvents } = harness();
    setEvents({ ...empty, impacts: [paintAt({ x: 60, y: 0.3, z: 0 })] });
    shotsView.step(GEOM, noop);
    expect(ringColor(shotsView, 0)).toBe(RED);
    // Stale: painting is deal-gated, so the verdict honestly reads red
    // even over the cake (the Room scored nothing either).
    shotsView.bumpDeal();
    setEvents({ ...empty, impacts: [paintAt({ x: 2, y: 2, z: CAKE_Z })] });
    shotsView.step(GEOM, noop);
    expect(ringColor(shotsView, 0)).toBe(RED);
  });

  it("a solid rings NEUTRAL at impact — the at-rest policy will save it", () => {
    const { shotsView, setEvents } = harness();
    setEvents({ ...empty, impacts: [solidAt(41)] });
    shotsView.step(GEOM, noop);
    expect(ringColor(shotsView, 0)).toBe(NEUTRAL);
  });

  it("the at-rest verdict: the ring moves to the rest spot and takes its color", () => {
    const { shotsView, setEvents } = harness();
    setEvents({ ...empty, impacts: [solidAt(41)] });
    shotsView.step(GEOM, noop);
    // It rolled off: rest on the floor → red, ring repositioned.
    setEvents({ ...empty, settled: [settleOf(41, { x: 30, y: 0.3, z: 0 })] });
    shotsView.step(GEOM, noop);
    expect(ringColor(shotsView, 0)).toBe(RED);
    expect(rings(shotsView).get(0)!.mesh.position.x).toBe(30);
  });

  it("a rest ON the cake goes green (landed red-hot, rolled to glory)", () => {
    const { shotsView, setEvents } = harness();
    setEvents({ ...empty, impacts: [solidAt(41)] });
    shotsView.step(GEOM, noop);
    setEvents({ ...empty, settled: [settleOf(41, { x: 2, y: 2, z: CAKE_Z })] });
    shotsView.step(GEOM, noop);
    expect(ringColor(shotsView, 0)).toBe(GREEN);
  });

  it("a NEWER lob owns the ring: an old shot's rest must not recolor it", () => {
    const { shotsView, setEvents } = harness();
    setEvents({ ...empty, impacts: [solidAt(41)] });
    shotsView.step(GEOM, noop);
    setEvents({ ...empty, impacts: [solidAt(42)] }); // the next lob replaced it
    shotsView.step(GEOM, noop);
    setEvents({ ...empty, settled: [settleOf(41, { x: 30, y: 0.3, z: 0 })] });
    shotsView.step(GEOM, noop);
    expect(ringColor(shotsView, 0)).toBe(NEUTRAL); // still waiting on lob 42
  });

  it("grain settles stay quiet — no recolor, no ring (the quiet-grain law)", () => {
    const { shotsView, setEvents } = harness();
    setEvents({ ...empty, impacts: [solidAt(41)] });
    shotsView.step(GEOM, noop);
    setEvents({
      ...empty,
      settled: [settleOf(41, { x: 30, y: 0.3, z: 0 }, true)],
    });
    shotsView.step(GEOM, noop);
    expect(ringColor(shotsView, 0)).toBe(NEUTRAL); // the grain touched nothing
  });
});

describe("THE BONK (plans/15 item 16): hitting the giant is a distinct event", () => {
  const words = (v: ShotsView): Array<{ text: string }> =>
    (v as unknown as { words: Array<{ text: string }> }).words;
  const giantHit = (town: number, paint = false) => ({
    pos: { x: 21, y: 25, z: -30 },
    speed: 15,
    topping: paint ? "frosting" : "cherry",
    tag: packShotTag(0, town),
    bodyHandle: -1,
    otherHandle: 99, // the rig's capsule, by agreement below
  });

  function giantHarness() {
    const h = harness();
    h.shotsView.isGiantCollider = (handle) => handle === 99;
    const hits: Array<{ topping: string; paint: boolean }> = [];
    h.shotsView.onGiantHit = (topping, _pos, paint) =>
      hits.push({ topping, paint });
    return { ...h, hits };
  }

  it("BONK! + patronBonk for YOUR hit — one announcement, no m/s flash", () => {
    const { shotsView, setEvents, hits } = giantHarness();
    const played: string[] = [];
    const flashed: string[] = [];
    const fx = {
      flash: (m: string) => flashed.push(m),
      sound: (key: string) => played.push(key),
    };
    setEvents({ ...empty, impacts: [giantHit(0)] });
    shotsView.step(GEOM, fx);
    expect(words(shotsView).map((w) => w.text)).toEqual(["BONK!"]);
    expect(played).toEqual(["patronBonk"]);
    expect(flashed).toEqual([]); // the scold (main's port) is the flash
    expect(hits).toEqual([{ topping: "cherry", paint: false }]);
  });

  it("the giant reacts to EVERY town's hit; the word stays own-town (item 13)", () => {
    const { shotsView, setEvents, hits } = giantHarness();
    setEvents({ ...empty, impacts: [giantHit(1)] }); // the other crew's wild lob
    shotsView.step(GEOM, noop);
    expect(words(shotsView).length).toBe(0); // their shot, wordless for us
    expect(hits.length).toBe(1); // but he still flinches for everyone
  });

  it("paint on the giant reports paint (the decal port) and rings red", () => {
    const { shotsView, setEvents, hits } = giantHarness();
    setEvents({ ...empty, impacts: [giantHit(0, true)] });
    shotsView.step(GEOM, noop);
    expect(hits).toEqual([{ topping: "frosting", paint: true }]);
    expect(ringColor(shotsView, 0)).toBe(0xd8452e); // painted nothing: red
  });

  it("grains bonk silently (the quiet-grain law: 40 grains ≠ 40 scolds)", () => {
    const { shotsView, setEvents, hits } = giantHarness();
    setEvents({
      ...empty,
      impacts: [{ ...giantHit(0), grain: true }],
    });
    shotsView.step(GEOM, noop);
    expect(hits.length).toBe(0);
    expect(words(shotsView).length).toBe(0);
  });
});
