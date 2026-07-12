/**
 * THE RENDER CONTRACT of the tilt (plans/15 item 2 rider, landed with
 * the notch clamp, plans/13 slice 3): the ball's arc is real sim
 * ballistics (shots-view spawns launchVelocity, 55° + tilt), so the
 * VISUAL frame must tilt by exactly the sim's tilt — same constants,
 * same clamp — or players learn the machine wrong even though the sim
 * is right. Verify POSITIONS, not counters: this reads the three.js
 * rotation the player is actually shown, off the real rig.
 */
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  createCatapult,
  TILT_DEG_PER_NOTCH,
  TILT_MAX_NOTCH,
  turnScrew,
} from "../game/catapult";
import type { TownMachine } from "../game/protocol";
import { WALLS } from "../core/arena";
import {
  MachineRig,
  WALL_SEG_LEN,
  backdropTreatment,
  dressBackdrop,
  wallSegments,
} from "./scene";

const rad = (deg: number): number => (deg * Math.PI) / 180;
const tm = (tiltNotch: number, screwTicks = 0): TownMachine => ({
  machine: { ...createCatapult(), tiltNotch },
  crankTicks: 0,
  screwTicks,
});
const noClunk = (): void => {};

describe("MachineRig tilt render contract", () => {
  const rig = new MachineRig(new THREE.Scene(), { x: 0, y: 1, z: -12 }, 0);

  it("the shown frame tilt IS the sim tilt, notch for notch", () => {
    for (const n of [0, 1, 6, TILT_MAX_NOTCH]) {
      rig.update(tm(n), noClunk);
      expect(rig.shownTiltRad).toBeCloseTo(rad(n * TILT_DEG_PER_NOTCH), 10);
    }
  });

  it("the visual clamp is the SIM clamp — one constant, no drift", () => {
    // The sim can never hold a notch above the clamp (turnScrew's law) …
    let s = createCatapult();
    for (let i = 0; i < TILT_MAX_NOTCH + 5; i++) s = turnScrew(s, 1);
    expect(s.tiltNotch).toBe(TILT_MAX_NOTCH);
    // … and if a rogue state ever did, the rig would still draw the
    // clamped angle — the player is never shown a tilt the machine
    // cannot throw.
    rig.update(tm(TILT_MAX_NOTCH + 5), noClunk);
    expect(rig.shownTiltRad).toBeCloseTo(
      rad(TILT_MAX_NOTCH * TILT_DEG_PER_NOTCH),
      10,
    );
  });

  it("partial screw progress previews the coming notch, still inside the clamp", () => {
    rig.update(tm(TILT_MAX_NOTCH, 5), noClunk); // held screw at the top
    expect(rig.shownTiltRad).toBeCloseTo(
      rad(TILT_MAX_NOTCH * TILT_DEG_PER_NOTCH),
      10,
    );
  });
});

/** THE DRESSED CONTRACT (plans/16, the hand road): catapult.glb's named
 * nodes replace the greybox as update()'s drive targets — the render
 * contract must hold on the MODEL's bones, the gimbal must keep the dish
 * level in the world, and a broken model must leave the greybox driving
 * (assetless-boot law). The fake template mirrors the .blend's rebind
 * vocabulary exactly. */
function fakeCatapult(): THREE.Group {
  const g = new THREE.Group();
  const mkNode = (name: string, parent: THREE.Object3D): THREE.Group => {
    const n = new THREE.Group();
    n.name = name;
    parent.add(n);
    return n;
  };
  const root = mkNode("machine_root", g);
  const tilt = mkNode("tilt_frame", root);
  tilt.position.set(0, 0, 0.7);
  const arm = mkNode("arm_pivot", tilt);
  const scoop = mkNode("scoop_pivot", arm);
  const seat = mkNode("topping_seat", scoop);
  seat.position.set(0, 0.2, 0);
  mkNode("winch_drum", tilt);
  const jack = mkNode("screw_jack", root);
  const post = mkNode("screw_post", jack);
  post.position.set(0, 0.3, 0);
  const handle = mkNode("screw_handle", jack);
  handle.position.set(0, 0.66, 0);
  return g;
}

describe("MachineRig dressed in catapult.glb", () => {
  it("the render contract holds on the MODEL's tilt node", () => {
    const rig = new MachineRig(new THREE.Scene(), { x: 0, y: 1, z: -12 }, 0);
    rig.dress(fakeCatapult());
    for (const n of [0, 3, TILT_MAX_NOTCH]) {
      rig.update(tm(n), noClunk);
      expect(rig.shownTiltRad).toBeCloseTo(rad(n * TILT_DEG_PER_NOTCH), 10);
    }
  });

  it("the gimbal basket hangs level in the world at every tension", () => {
    const rig = new MachineRig(new THREE.Scene(), { x: 0, y: 1, z: -12 }, 0);
    rig.dress(fakeCatapult());
    // dress() CLONES the template (shared-resource law) — the driven
    // nodes live in the clone under rig.group, so query there.
    const tilt = rig.group.getObjectByName("tilt_frame");
    const arm = rig.group.getObjectByName("arm_pivot");
    const scoop = rig.group.getObjectByName("scoop_pivot");
    if (!tilt || !arm || !scoop) throw new Error("fake template broke");
    for (const [notch, clicks] of [[0, 0], [4, 3], [TILT_MAX_NOTCH, 8]]) {
      rig.update(
        {
          machine: { ...createCatapult(), tiltNotch: notch!, tensionClicks: clicks! },
          crankTicks: 0,
          screwTicks: 0,
        },
        noClunk,
      );
      // world pitch = tilt + arm + scoop counter-rotation = ZERO (level)
      expect(tilt.rotation.x + arm.rotation.x + scoop.rotation.x).toBeCloseTo(0, 10);
      expect(arm.rotation.x).toBeGreaterThan(0); // the arm itself DID move
    }
  });

  it("the topping and its raycast proxy move into the dish", () => {
    const rig = new MachineRig(new THREE.Scene(), { x: 0, y: 1, z: -12 }, 0);
    rig.dress(fakeCatapult());
    const scoop = rig.group.getObjectByName("scoop_pivot");
    expect(rig.toppingMesh.parent).toBe(scoop);
    expect(rig.toppingMesh.position.y).toBeCloseTo(0.2, 10); // the authored seat
    expect(rig.bucketMesh.parent).toBe(scoop);
    expect(rig.bucketMesh.visible).toBe(false); // invisible proxy, still raycastable
  });

  it("a template missing a drive node leaves the greybox driving (fallback law)", () => {
    const rig = new MachineRig(new THREE.Scene(), { x: 0, y: 1, z: -12 }, 0);
    const homeBefore = rig.toppingMesh.parent;
    const broken = fakeCatapult();
    const drum = broken.getObjectByName("winch_drum");
    drum?.parent?.remove(drum);
    rig.dress(broken);
    // Nothing dressed: no clone adopted, the topping never moved, and the
    // contract still renders through the greybox.
    expect(rig.group.getObjectByName("scoop_pivot")).toBeUndefined();
    expect(rig.toppingMesh.parent).toBe(homeBefore);
    rig.update(tm(2), noClunk);
    expect(rig.shownTiltRad).toBeCloseTo(rad(2 * TILT_DEG_PER_NOTCH), 10);
  });
});

/** THE WALL TILING (meshy road, wall.glb): the stone section is authored
 * at the collider's exact cross-section, so the only degrees of freedom
 * are count, placement, and width-stretch along the wall — pure math,
 * pinned here; the buildGameScene painter stays thin. */
describe("wallSegments — stone sections tile the collider slabs", () => {
  it("covers every slab exactly: N stretched sections sum to the slab length", () => {
    for (const w of WALLS) {
      const segs = wallSegments([w]);
      const len = Math.max(w.hx, w.hz) * 2;
      const covered = segs.reduce((sum, s) => sum + s.scaleX * WALL_SEG_LEN, 0);
      expect(covered).toBeCloseTo(len, 10);
      // Sections butt end to end: centers are one stretched width apart.
      const alongX = w.hx >= w.hz;
      for (let i = 1; i < segs.length; i++) {
        const gap = alongX
          ? segs[i]!.x - segs[i - 1]!.x
          : segs[i]!.z - segs[i - 1]!.z;
        expect(gap).toBeCloseTo(segs[i]!.scaleX * WALL_SEG_LEN, 10);
      }
      // …and the run is centered on the collider.
      const first = segs[0]!;
      const last = segs[segs.length - 1]!;
      expect(alongX ? (first.x + last.x) / 2 : (first.z + last.z) / 2)
        .toBeCloseTo(alongX ? w.x : w.z, 10);
    }
  });

  it("a z-running wall turns the section a quarter; alternates yaw-flip", () => {
    const zWall = { hx: 0.25, hy: 0.5, hz: 4, x: -8, z: 0 };
    const segs = wallSegments([zWall]);
    expect(segs.length).toBe(4); // 8 m / 1.899 → 4 sections
    for (const [i, s] of segs.entries()) {
      expect(s.x).toBe(-8); // never drifts off the collider line
      expect(s.rotY).toBeCloseTo(Math.PI / 2 + (i % 2 ? Math.PI : 0), 10);
    }
    const xWall = { hx: 4, hy: 0.5, hz: 0.25, x: 0, z: -13 };
    expect(wallSegments([xWall])[0]!.rotY).toBe(0);
  });

  it("stretch stays chunky-tolerable across the real arena, shortest flank included", () => {
    for (const s of wallSegments(WALLS)) {
      expect(s.scaleX).toBeGreaterThan(0.85);
      expect(s.scaleX).toBeLessThan(1.35); // the 2.5 m gate flank is the ceiling
    }
  });
});

/** THE BACKDROP TREATMENT (the region slice): far_/sky_ meshes go unlit
 * and fog-exempt (haze is baked in vertex color); near_/mid_ stay lit and
 * fogged like the forts. An unknown prefix degrades to lit — a renamed
 * mesh must never vanish into the fog silently. */
describe("backdropTreatment — the region's atmosphere rule", () => {
  it("classifies the shipped vocabulary", () => {
    expect(backdropTreatment("far_mountain_hero")).toBe("unlit");
    expect(backdropTreatment("far_castle")).toBe("unlit");
    expect(backdropTreatment("sky_dome")).toBe("unlit");
    expect(backdropTreatment("sky_cloud_3")).toBe("unlit");
    expect(backdropTreatment("near_skirt")).toBe("lit");
    expect(backdropTreatment("mid_town_west")).toBe("lit");
    expect(backdropTreatment("mystery_prop")).toBe("lit"); // default: visible
  });

  it("dressBackdrop swaps unlit meshes to fogless vertex-color basic, leaves lit alone", () => {
    const root = new THREE.Group();
    const mk = (name: string): THREE.Mesh => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial(),
      );
      m.name = name;
      root.add(m);
      return m;
    };
    const far = mk("far_range_outer");
    const sky = mk("sky_dome");
    const near = mk("near_road");
    dressBackdrop(root);
    for (const m of [far, sky]) {
      const mat = m.material as THREE.MeshBasicMaterial;
      expect(mat.type).toBe("MeshBasicMaterial");
      expect(mat.vertexColors).toBe(true);
      expect(mat.fog).toBe(false);
    }
    expect((near.material as THREE.Material).type).toBe("MeshStandardMaterial");
  });
});
