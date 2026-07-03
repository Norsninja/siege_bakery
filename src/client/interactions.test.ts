/**
 * The crosshair interaction rules + banner latch, pinned (audit 2026-07-03).
 * These are the client's PREDICTIONS of Room law — when a rule here drifts
 * from room.ts, the player gets wrong flashes and blocked actions with no
 * other tripwire.
 */
import { describe, it, expect } from "vitest";
import { bannerLatch, tickInteraction } from "./interactions";

describe("tickInteraction", () => {
  it("does nothing without an E edge or a target", () => {
    expect(tickInteraction(false, "lever", "cherry", null).send).toEqual([]);
    expect(tickInteraction(true, null, "cherry", null).send).toEqual([]);
    expect(tickInteraction(false, "lever", "cherry", null).carrying).toBe(
      "cherry",
    );
  });

  it("pantry pickup wants empty hands, one topping at a time", () => {
    const took = tickInteraction(true, "shelf-frosting", null, null);
    expect(took.carrying).toBe("frosting");
    expect(took.send).toEqual([]);
    // Hands full: the shelf refuses (the prompt already says why).
    const refused = tickInteraction(true, "shelf-cherry", "lime", null);
    expect(refused.carrying).toBe("lime");
    expect(refused.send).toEqual([]);
  });

  it("the lever ALWAYS executes; a dry release flashes the comedy", () => {
    const loaded = tickInteraction(true, "lever", null, "cherry");
    expect(loaded.send).toEqual([{ t: "lever" }]);
    expect(loaded.flash).toBeNull();
    const dry = tickInteraction(true, "lever", null, null);
    expect(dry.send).toEqual([{ t: "lever" }]);
    expect(dry.flash?.msg).toContain("dry release");
  });

  it("a load wants full hands and an empty bucket, and empties the hands", () => {
    const ok = tickInteraction(true, "bucket", "sprinkles", null);
    expect(ok.send).toEqual([{ t: "load", topping: "sprinkles" }]);
    expect(ok.carrying).toBeNull();
    // Empty hands at the bucket: nothing to load.
    expect(tickInteraction(true, "bucket", null, null).send).toEqual([]);
    // Bucket (as this client knows it) already full: keep the topping —
    // the Room-side queue would accept it, but the client predicts the
    // bucket rule so hands don't empty into a full machine.
    const full = tickInteraction(true, "bucket", "lime", "cherry");
    expect(full.send).toEqual([]);
    expect(full.carrying).toBe("lime");
  });

  it("machine controls are hold-ops, not interactions: no sends", () => {
    for (const t of ["wheel", "winch", "screw"] as const)
      expect(tickInteraction(true, t, "cherry", null).send).toEqual([]);
  });
});

describe("bannerLatch", () => {
  it("shows once when the order ends, hides once on the fresh deal", () => {
    expect(bannerLatch("won", false)).toBe("show");
    expect(bannerLatch("won", true)).toBeNull(); // latched, not re-rendered
    expect(bannerLatch("lost", false)).toBe("show");
    expect(bannerLatch("running", true)).toBe("hide");
    expect(bannerLatch("running", false)).toBeNull();
  });
});
