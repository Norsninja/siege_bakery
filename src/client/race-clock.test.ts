/**
 * THE RACE CLOCK's honest half (plans/15 item 29): the green gain is driven
 * off the clock's OWN visible rise, so this pins the rise detector — a real
 * earn flashes, a normal countdown stays silent, and the sub-second jitter
 * between the per-frame prediction and the 1Hz correction never fakes a pop.
 * The DOM flashing + the seed-on-show guard are browser-verified (the
 * post-hud precedent: overlays prove by eye, logic proves by test).
 */
import { describe, it, expect } from "vitest";
import { FIXED_DT } from "../core/constants";
import { EARNED_TIME_PER_SAMPLE_S } from "../game/tuning";
import { clockGainSecs } from "./race-clock";

describe("clockGainSecs (the race clock's green-gain detector)", () => {
  it("a real earned-time jump flashes its whole seconds", () => {
    const base = 100 * 60; // 100s in ticks
    // One fresh sample buys EARNED_TIME_PER_SAMPLE_S (2s) — the smallest real
    // earn, and it must register.
    const oneSample = base + EARNED_TIME_PER_SAMPLE_S * 60;
    expect(clockGainSecs(base, oneSample)).toBe(EARNED_TIME_PER_SAMPLE_S);
    // A fat splat (~8 fresh ≈ 16s) reads its full jump.
    expect(clockGainSecs(base, base + 16 * 60)).toBe(16);
  });

  it("a normal countdown is silent — the number only ever falls", () => {
    const t = 100 * 60;
    expect(clockGainSecs(t, t - 1)).toBe(0); // one tick down (predictClock)
    expect(clockGainSecs(t, t - 60)).toBe(0); // a full second down
    expect(clockGainSecs(t, t)).toBe(0); // the seed frame: no change, no flash
  });

  it("sub-second prediction/correction jitter never fakes a flash", () => {
    const t = 100 * 60;
    // The 1Hz correction can nudge the displayed clock up a few ticks when the
    // prediction ran slightly fast — well under a second, and NOT an earn.
    expect(clockGainSecs(t, t + 3)).toBe(0); // 3 ticks = 0.05s → silent
    expect(clockGainSecs(t, t + Math.round(0.4 / FIXED_DT))).toBe(0); // ~0.4s
    // A full second up is the smallest thing we'd ever show.
    expect(clockGainSecs(t, t + 60)).toBe(1);
  });
});
