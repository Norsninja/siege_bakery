/**
 * The crosshair interaction rules + banner latch, pinned (audit 2026-07-03).
 * These are the client's PREDICTIONS of Room law — when a rule here drifts
 * from room.ts, the player gets wrong flashes and blocked actions with no
 * other tripwire.
 */
import { describe, it, expect } from "vitest";
import {
  bannerLatch,
  interactionActs,
  pantryTarget,
  resolveEEdge,
  tickInteraction,
} from "./interactions";

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

describe("the stall (plans/13 §5 as amended 2026-07-09) — E predicts the Room's shop law", () => {
  const stall = (over = {}) => ({
    open: true,
    owned: false,
    price: 50,
    purse: 60,
    ...over,
  });

  it("an affordable open stall sends the buy (and only the buy — hands untouched)", () => {
    const act = tickInteraction(true, "shop", "cherry", null, stall());
    expect(act.send).toEqual([{ t: "buy", item: "town2" }]);
    expect(act.carrying).toBe("cherry"); // a purchase is not a pickup
    expect(act.flash?.msg).toContain("TOWN 2");
  });

  it("closed hours flash the hours; a poor purse flashes the honest refusal — neither sends", () => {
    const closed = tickInteraction(true, "shop", null, null, stall({ open: false }));
    expect(closed.send).toEqual([]);
    expect(closed.flash?.msg).toContain("opens between orders");
    const poor = tickInteraction(true, "shop", null, null, stall({ purse: 25 }));
    expect(poor.send).toEqual([]);
    expect(poor.flash?.msg).toContain("not enough coins");
  });

  it("SOLD OUT presses do nothing (the prompt already says so); no context reads closed", () => {
    const owned = tickInteraction(true, "shop", null, null, stall({ owned: true }));
    expect(owned.send).toEqual([]);
    expect(owned.flash).toBeNull();
    const noCtx = tickInteraction(true, "shop", null, null);
    expect(noCtx.send).toEqual([]);
    expect(noCtx.flash).toBeNull();
  });

  it("the E chain: a stall press CONSUMES the edge (never mans a post through the counter)", () => {
    const r = resolveEEdge(true, null, "shop", "gunner", null, null, stall());
    expect(r.manned).toBeNull();
    expect(r.act.send).toEqual([{ t: "buy", item: "town2" }]);
    // ...and the HUD invite yields to it (one press, one meaning).
    expect(interactionActs("shop", null, null, stall())).toBe(true);
    // A SOLD-OUT stall acts on nothing: the edge falls through to the post.
    const sold = resolveEEdge(
      true, null, "shop", "gunner", null, null, stall({ owned: true }),
    );
    expect(sold.manned).toBe("gunner");
    expect(interactionActs("shop", null, null, stall({ owned: true }))).toBe(false);
  });
});

describe("pantryTarget — the crosshair speaks only to the pantry loop (plans/14)", () => {
  it("machine controls are refused; bucket and shelves pass; null is null", () => {
    for (const t of ["wheel", "winch", "screw", "lever"] as const)
      expect(pantryTarget(t)).toBeNull();
    expect(pantryTarget("bucket")).toBe("bucket");
    expect(pantryTarget("shelf-cherry")).toBe("shelf-cherry");
    expect(pantryTarget(null)).toBeNull();
  });
});

describe("resolveEEdge — one E edge, one meaning (review 2026-07-08)", () => {
  it("no edge: nothing moves", () => {
    const r = resolveEEdge(false, "winch", "bucket", null, "cherry", null);
    expect(r.manned).toBe("winch");
    expect(r.act.send).toEqual([]);
    expect(r.act.carrying).toBe("cherry");
    expect(r.justManned).toBe(false);
  });

  it("stepping off takes the WHOLE press — the bucket under the crosshair must NOT load (the review's double-act)", () => {
    const r = resolveEEdge(true, "winch", "bucket", null, "cherry", null);
    expect(r.manned).toBeNull();
    expect(r.act.send).toEqual([]); // no load rode along
    expect(r.act.carrying).toBe("cherry"); // hands still full
    expect(r.justManned).toBe(false);
  });

  it("an ACTING interaction claims the edge: loading beats manning", () => {
    const r = resolveEEdge(true, null, "bucket", "winch", "cherry", null);
    expect(r.act.send).toEqual([{ t: "load", topping: "cherry" }]);
    expect(r.manned).toBeNull(); // the man did NOT also happen
    expect(r.justManned).toBe(false);
  });

  it("a NO-OP interaction cannot eat the edge: empty hands at the bucket fall through to the man (the review's dead press)", () => {
    const r = resolveEEdge(true, null, "bucket", "winch", null, null);
    expect(r.manned).toBe("winch");
    expect(r.justManned).toBe(true);
    expect(r.act.send).toEqual([]);
  });

  it("a machine control under the crosshair never eats the edge — the lever branch stays unreachable, the zone mans", () => {
    const r = resolveEEdge(true, null, "lever", "gunner", null, null);
    expect(r.manned).toBe("gunner");
    expect(r.justManned).toBe(true);
    expect(r.act.send).toEqual([]); // NO lever msg: F fires now, not E
  });

  it("plain man: in the zone, no target", () => {
    const r = resolveEEdge(true, null, null, "gunner", null, null);
    expect(r.manned).toBe("gunner");
    expect(r.justManned).toBe(true);
  });

  it("edge on open ground with nothing to do: nothing happens", () => {
    const r = resolveEEdge(true, null, null, null, "cherry", null);
    expect(r.manned).toBeNull();
    expect(r.act.send).toEqual([]);
    expect(r.act.carrying).toBe("cherry");
  });
});

describe("interactionActs — the HUD invite yields only to a press that would act", () => {
  it("actionable: load with full hands, pickup with empty hands", () => {
    expect(interactionActs("bucket", "cherry", null)).toBe(true);
    expect(interactionActs("shelf-lime", null, null)).toBe(true);
  });

  it("not actionable: empty hands at the bucket, full hands at a shelf, full bucket", () => {
    expect(interactionActs("bucket", null, null)).toBe(false);
    expect(interactionActs("shelf-lime", "cherry", null)).toBe(false);
    expect(interactionActs("bucket", "lime", "cherry")).toBe(false);
  });

  it("machine controls never act — the lever's always-fire is filtered by the pantry law", () => {
    expect(interactionActs("lever", null, null)).toBe(false);
    expect(interactionActs("wheel", null, null)).toBe(false);
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
