import { describe, expect, it } from "vitest";
import { POST_RADIUS_M, postAnchors, postAt, postOp } from "./posts";

const keys = (...codes: string[]): ReadonlySet<string> => new Set(codes);

describe("postAnchors", () => {
  it("town 0 (facing 0): gunner behind the frame (+Z), winch on the right flank (+X)", () => {
    const a = postAnchors({ x: 0, y: 1, z: -12 }, 0);
    expect(a).toEqual([
      { post: "gunner", x: 0, z: -10.4 },
      { post: "winch", x: 1.5, z: -12.55 },
    ]);
  });

  it("town 1 (facing 180): the whole crew layout rotates with the machine", () => {
    const a = postAnchors({ x: 0, y: 1, z: -48 }, 180);
    const gunner = a.find((p) => p.post === "gunner")!;
    const winch = a.find((p) => p.post === "winch")!;
    // Town 1 fires +Z, so "behind" is -Z and the right flank is -X.
    expect(gunner.x).toBeCloseTo(0, 10);
    expect(gunner.z).toBeCloseTo(-49.6, 10);
    expect(winch.x).toBeCloseTo(-1.5, 10);
    expect(winch.z).toBeCloseTo(-47.45, 10);
  });
});

describe("postAt", () => {
  const anchors = postAnchors({ x: 0, y: 1, z: -12 }, 0);

  it("inside a zone mans that post; outside every zone mans nothing", () => {
    expect(postAt({ x: 0.3, z: -10.2 }, anchors)).toBe("gunner");
    expect(postAt({ x: 1.4, z: -12.3 }, anchors)).toBe("winch");
    expect(postAt({ x: 0, z: -6 }, anchors)).toBeNull();
  });

  it("the zones cannot both claim: anchors sit farther apart than 2 radii", () => {
    const [g, w] = anchors;
    const d = Math.hypot(g!.x - w!.x, g!.z - w!.z);
    expect(d).toBeGreaterThan(2 * POST_RADIUS_M);
  });
});

describe("postOp — one body, one job", () => {
  it("gunner: A/D wheel, W/S screw, opposing keys cancel, Space does NOT crank", () => {
    expect(postOp("gunner", keys("KeyA"))).toEqual({ turn: 1, screw: 0, crank: false });
    expect(postOp("gunner", keys("KeyD"))).toEqual({ turn: -1, screw: 0, crank: false });
    expect(postOp("gunner", keys("KeyA", "KeyD")).turn).toBe(0);
    expect(postOp("gunner", keys("KeyW"))).toEqual({ turn: 0, screw: 1, crank: false });
    expect(postOp("gunner", keys("KeyS")).screw).toBe(-1);
    expect(postOp("gunner", keys("KeyW", "KeyS")).screw).toBe(0);
    expect(postOp("gunner", keys("Space")).crank).toBe(false);
  });

  it("winch: Space cranks, aim keys are dead — the winch-man is muscle, not gunner", () => {
    expect(postOp("winch", keys("Space"))).toEqual({ turn: 0, screw: 0, crank: true });
    expect(postOp("winch", keys("KeyA", "KeyW", "Space"))).toEqual({
      turn: 0,
      screw: 0,
      crank: true,
    });
  });

  it("no post, no op", () => {
    expect(postOp(null, keys("KeyA", "KeyW", "Space"))).toEqual({
      turn: 0,
      screw: 0,
      crank: false,
    });
  });
});
