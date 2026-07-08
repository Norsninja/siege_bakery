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
import { ShotsView } from "./shots-view";
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
