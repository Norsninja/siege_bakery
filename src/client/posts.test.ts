import { describe, expect, it } from "vitest";
import { POST_SPOTS, postAnchors, postAt, postOp } from "./posts";

const keys = (...codes: string[]): ReadonlySet<string> => new Set(codes);

describe("postAnchors", () => {
  it("town 0 (facing 0): gunner on the LEFT rear flank, winch on the right flank", () => {
    const a = postAnchors({ x: 0, y: 1, z: -12 }, 0);
    expect(a).toEqual([
      { post: "gunner", x: -1, z: -10.4, r: 0.6 },
      { post: "winch", x: 1.5, z: -12.55, r: 1.2 },
    ]);
  });

  it("town 1 (facing 180): the whole crew layout rotates with the machine", () => {
    const a = postAnchors({ x: 0, y: 1, z: -48 }, 180);
    const gunner = a.find((p) => p.post === "gunner")!;
    const winch = a.find((p) => p.post === "winch")!;
    // Town 1 fires +Z, so "behind" is -Z and its LEFT flank is +X.
    expect(gunner.x).toBeCloseTo(1, 10);
    expect(gunner.z).toBeCloseTo(-49.6, 10);
    expect(winch.x).toBeCloseTo(-1.5, 10);
    expect(winch.z).toBeCloseTo(-47.45, 10);
  });
});

describe("postAt — one clear-view flank invites; the arm and the spool do not", () => {
  const anchors = postAnchors({ x: 0, y: 1, z: -12 }, 0);

  it("the LEFT flank mans the gunner; dead center and the SPOOL side refuse (round 2)", () => {
    expect(postAt({ x: -1.0, z: -10.4 }, anchors)).toBe("gunner");
    expect(postAt({ x: 0, z: -10.4 }, anchors)).toBeNull(); // behind the arm
    expect(postAt({ x: 1.0, z: -10.4 }, anchors)).toBeNull(); // the draw spool blocks
  });

  it("winch zone claims; open ground claims nothing", () => {
    expect(postAt({ x: 1.4, z: -12.3 }, anchors)).toBe("winch");
    expect(postAt({ x: 0, z: -6 }, anchors)).toBeNull();
  });

  it("no two zones can both claim: every anchor pair is separated beyond its radii", () => {
    for (let i = 0; i < anchors.length; i++)
      for (let j = i + 1; j < anchors.length; j++) {
        const a = anchors[i]!;
        const b = anchors[j]!;
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(a.r + b.r);
      }
  });
});

describe("postOp — one body, one job; W/S is always more/less", () => {
  it("gunner: A/D wheel, W/S screw, opposing keys cancel, Space does NOT crank", () => {
    expect(postOp("gunner", keys("KeyA"))).toEqual({ turn: 1, screw: 0, crank: 0 });
    expect(postOp("gunner", keys("KeyD"))).toEqual({ turn: -1, screw: 0, crank: 0 });
    expect(postOp("gunner", keys("KeyA", "KeyD")).turn).toBe(0);
    expect(postOp("gunner", keys("KeyW"))).toEqual({ turn: 0, screw: 1, crank: 0 });
    expect(postOp("gunner", keys("KeyS")).screw).toBe(-1);
    expect(postOp("gunner", keys("KeyW", "KeyS")).screw).toBe(0);
    expect(postOp("gunner", keys("Space")).crank).toBe(0);
  });

  it("winch: Space or W winds, S unwinds, wind+unwind stalls, aim keys are dead", () => {
    expect(postOp("winch", keys("Space"))).toEqual({ turn: 0, screw: 0, crank: 1 });
    expect(postOp("winch", keys("KeyW"))).toEqual({ turn: 0, screw: 0, crank: 1 });
    expect(postOp("winch", keys("KeyS"))).toEqual({ turn: 0, screw: 0, crank: -1 });
    expect(postOp("winch", keys("Space", "KeyS")).crank).toBe(0); // the stall
    expect(postOp("winch", keys("KeyA", "KeyD", "Space"))).toEqual({
      turn: 0,
      screw: 0,
      crank: 1,
    });
  });

  it("no post, no op", () => {
    expect(postOp(null, keys("KeyA", "KeyW", "Space"))).toEqual({
      turn: 0,
      screw: 0,
      crank: 0,
    });
  });
});

describe("POST_SPOTS is the one spot table", () => {
  it("scene circles and zones share it: two spots, two posts (round 2 — one gunner flank)", () => {
    expect(POST_SPOTS).toHaveLength(2);
    expect(POST_SPOTS.filter((s) => s.post === "gunner")).toHaveLength(1);
    expect(POST_SPOTS.filter((s) => s.post === "winch")).toHaveLength(1);
  });
});
