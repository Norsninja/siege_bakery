/**
 * THE CHOREOGRAPHY CONTRACT (plans/16 slice 2, third act): the ogre's
 * state machine — look-lean on a fresh patron line, verdict snap-and-
 * hold on the ended order, relax through the linger — pinned against a
 * REAL bone hierarchy (scene.test.ts culture: verify the rotations the
 * player is shown, not internal counters). The rest-offset law rides
 * every assertion: drives are offsets from captured rest, never
 * overwrites.
 */
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import type { Judgment } from "../game/judgment";
import { HEAD_TURN_MAX_RAD, PatronBody, POSES, verdictPose } from "./patron-body";

const deg = (d: number): number => (d * Math.PI) / 180;

/** The ogre rig's shape (ogre-rig.blend): root→spine→chest→head, arms
 * off the chest. Rest rotations are non-zero ON ALL THREE AXES so any
 * overwrite (or single-axis capture) fails loudly — chest x=0.044 is
 * the documented live value. */
const REST: Record<string, [number, number, number]> = {
  root: [0, 0, 0],
  spine: [0.02, 0.01, -0.01],
  chest: [0.044, -0.02, 0.03],
  head: [-0.01, 0.02, -0.03],
  "upper_armL": [0.1, 0.2, 0.3],
  "upper_armR": [0.1, -0.2, -0.3],
};

function fakeOgre(): THREE.Object3D {
  const root = new THREE.Object3D();
  const bones = new Map<string, THREE.Bone>();
  const mk = (name: string, parent: THREE.Object3D): THREE.Bone => {
    const b = new THREE.Bone();
    b.name = name;
    const [x, y, z] = REST[name] ?? [0, 0, 0];
    b.rotation.set(x, y, z);
    parent.add(b);
    bones.set(name, b);
    return b;
  };
  const r = mk("root", root);
  const spine = mk("spine", r);
  const chest = mk("chest", spine);
  mk("head", chest);
  mk("upper_armL", chest);
  mk("upper_armR", chest);
  return root;
}

const bone = (root: THREE.Object3D, name: string): THREE.Object3D => {
  let found: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (o.name === name) found = o;
  });
  if (!found) throw new Error(`no bone ${name}`);
  return found;
};

const judgment = (met: boolean, accepted: boolean): Judgment => ({
  met,
  accepted,
  score: 50,
  stars: 1,
  checks: [],
  coverage: 0.5,
  effectiveCoverage: 0.5,
  neatness: 1,
  integrity: 1,
  mess: 0,
  waste: 1,
});

const pump = (
  body: PatronBody,
  frames: number,
  seq: number | null = null,
  verdict: Judgment | null = null,
): void => {
  for (let i = 0; i < frames; i++) body.update(seq, verdict);
};

describe("PatronBody choreography", () => {
  it("a rig-less root is a permanent no-op (assetless-boot law)", () => {
    const body = new PatronBody(new THREE.Object3D());
    expect(body.rigged).toBe(false);
    expect(() => body.update(3, judgment(true, true))).not.toThrow();
    expect(body.act).toBe("idle");
  });

  it("idle breathes about rest on the chest, holds rest elsewhere", () => {
    const root = fakeOgre();
    const body = new PatronBody(root);
    expect(body.rigged).toBe(true);
    const chest = bone(root, "chest");
    const spine = bone(root, "spine");
    let maxDev = 0;
    for (let i = 0; i < 300; i++) {
      body.update();
      maxDev = Math.max(maxDev, Math.abs(chest.rotation.x - 0.044));
    }
    expect(maxDev).toBeGreaterThan(0.01); // it actually breathes…
    expect(maxDev).toBeLessThanOrEqual(0.016); // …±0.015 about rest
    // Rest-offset law on the untouched axes: y/z stay REST, not zero.
    expect(chest.rotation.y).toBeCloseTo(-0.02, 6);
    expect(chest.rotation.z).toBeCloseTo(0.03, 6);
    expect(spine.rotation.x).toBeCloseTo(0.02, 6);
  });

  it("the FIRST update adopts a standing seq silently (late model load)", () => {
    const body = new PatronBody(fakeOgre());
    pump(body, 20, 7);
    expect(body.act).toBe("idle");
  });

  it("a fresh patron line leans him in, then the hold relaxes to idle", () => {
    const root = fakeOgre();
    const body = new PatronBody(root);
    pump(body, 1, 1); // adopt
    pump(body, 100, 2); // new line → lean, still inside the ~150-frame hold
    expect(body.act).toBe("lean");
    const spine = bone(root, "spine");
    const head = bone(root, "head");
    expect(spine.rotation.x).toBeCloseTo(0.02 + deg(14), 2);
    expect(head.rotation.z).toBeCloseTo(-0.03 + deg(25), 2);
    // The turn ingredient obeys the audition ceiling.
    expect(Math.abs(head.rotation.y - 0.02)).toBeLessThanOrEqual(
      HEAD_TURN_MAX_RAD + 1e-9,
    );
    pump(body, 400, 2); // hold expires, offsets ease home
    expect(body.act).toBe("idle");
    expect(spine.rotation.x).toBeCloseTo(0.02, 2);
  });

  it("verdictPose is the banner's two-gate read", () => {
    expect(verdictPose(judgment(true, true))).toBe("delighted");
    expect(verdictPose(judgment(true, false))).toBe("refused");
    expect(verdictPose(judgment(false, false))).toBe("hungry");
  });

  it("a verdict snaps the pose; a patron line NEVER yanks him out", () => {
    const root = fakeOgre();
    const body = new PatronBody(root);
    pump(body, 1, 1);
    const v = judgment(true, true);
    pump(body, 60, 1, v);
    expect(body.act).toBe("delighted");
    const arm = bone(root, "upper_armL");
    expect(arm.rotation.x).toBeCloseTo(0.1 + deg(-40), 2);
    expect(arm.rotation.z).toBeCloseTo(0.3 + deg(-15), 2);
    // A nag lands mid-verdict: adopted, not acted on (ruling 2026-07-11).
    pump(body, 10, 2, v);
    expect(body.act).toBe("delighted");
    // …and it does not fire retroactively once the hold relaxes.
    pump(body, 400, 2, v);
    expect(body.act).toBe("idle");
  });

  it("the same lingering verdict never re-triggers after its hold", () => {
    const root = fakeOgre();
    const body = new PatronBody(root);
    const v = judgment(false, false);
    pump(body, 30, null, v);
    expect(body.act).toBe("hungry");
    pump(body, 500, null, v); // linger continues, he has relaxed
    expect(body.act).toBe("idle");
    expect(bone(root, "head").rotation.x).toBeCloseTo(-0.01, 1);
  });

  it("a fresh deal mid-hold straightens him up", () => {
    const body = new PatronBody(fakeOgre());
    pump(body, 30, null, judgment(true, false));
    expect(body.act).toBe("refused");
    pump(body, 1, null, null); // order message with a running fresh deal
    expect(body.act).toBe("idle");
  });

  it("every authored pose keeps the head turn under the audition ceiling", () => {
    for (const pose of Object.values(POSES)) {
      const y = pose["head"]?.y ?? 0;
      expect(Math.abs(y)).toBeLessThanOrEqual(HEAD_TURN_MAX_RAD);
    }
  });
});
