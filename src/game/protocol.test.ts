/**
 * Merge law: many hands on one machine become one honest intent.
 */
import { describe, it, expect } from "vitest";
import { mergeIntents, IDLE_OP } from "./protocol";

describe("mergeIntents", () => {
  it("nobody touching the machine is idle", () => {
    expect(mergeIntents([], 0, [])).toEqual({
      turn: 0,
      screw: 0,
      crank: 0,
      pullLever: false,
      load: null,
    });
    expect(mergeIntents([IDLE_OP, IDLE_OP], 0, []).crank).toBe(0);
  });

  it("two people cranking is still ONE winch", () => {
    const m = mergeIntents(
      [
        { turn: 0, screw: 0, crank: 1 },
        { turn: 0, screw: 0, crank: 1 },
      ],
      0,
      [],
    );
    expect(m.crank).toBe(1); // one ratchet, not double-rate
  });

  it("the winch merges like the wheel since the unwind (plans/14): wind vs unwind stalls", () => {
    expect(
      mergeIntents(
        [
          { turn: 0, screw: 0, crank: 1 },
          { turn: 0, screw: 0, crank: -1 },
        ],
        0,
        [],
      ).crank,
    ).toBe(0);
    expect(mergeIntents([{ turn: 0, screw: 0, crank: -1 }], 0, []).crank).toBe(
      -1,
    );
  });

  it("opposite turns cancel; same-direction turns don't double", () => {
    expect(
      mergeIntents(
        [
          { turn: 1, screw: 0, crank: 0 },
          { turn: -1, screw: 0, crank: 0 },
        ],
        0,
        [],
      ).turn,
    ).toBe(0);
    expect(
      mergeIntents(
        [
          { turn: 1, screw: 0, crank: 0 },
          { turn: 1, screw: 0, crank: 0 },
        ],
        0,
        [],
      ).turn,
    ).toBe(1);
  });

  it("the screw merges like the wheel: opposites cancel, allies don't double", () => {
    expect(
      mergeIntents(
        [
          { turn: 0, screw: 1, crank: 0 },
          { turn: 0, screw: -1, crank: 0 },
        ],
        0,
        [],
      ).screw,
    ).toBe(0);
    expect(
      mergeIntents(
        [
          { turn: 0, screw: -1, crank: 0 },
          { turn: 0, screw: -1, crank: 0 },
        ],
        0,
        [],
      ).screw,
    ).toBe(-1);
  });

  it("any lever pull releases; first queued topping loads", () => {
    const m = mergeIntents([], 2, ["cherry", "lime"]);
    expect(m.pullLever).toBe(true);
    expect(m.load).toBe("cherry");
  });
});
