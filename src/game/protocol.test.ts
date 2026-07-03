/**
 * Merge law: many hands on one machine become one honest intent.
 */
import { describe, it, expect } from "vitest";
import { mergeIntents, IDLE_OP } from "./protocol";

describe("mergeIntents", () => {
  it("nobody touching the machine is idle", () => {
    expect(mergeIntents([], 0, [])).toEqual({
      turn: 0,
      crank: false,
      pullLever: false,
      load: null,
    });
    expect(mergeIntents([IDLE_OP, IDLE_OP], 0, []).crank).toBe(false);
  });

  it("two people cranking is still ONE winch", () => {
    const m = mergeIntents(
      [
        { turn: 0, crank: true },
        { turn: 0, crank: true },
      ],
      0,
      [],
    );
    expect(m.crank).toBe(true); // boolean, not double-rate
  });

  it("opposite turns cancel; same-direction turns don't double", () => {
    expect(
      mergeIntents(
        [
          { turn: 1, crank: false },
          { turn: -1, crank: false },
        ],
        0,
        [],
      ).turn,
    ).toBe(0);
    expect(
      mergeIntents(
        [
          { turn: 1, crank: false },
          { turn: 1, crank: false },
        ],
        0,
        [],
      ).turn,
    ).toBe(1);
  });

  it("any lever pull releases; first queued topping loads", () => {
    const m = mergeIntents([], 2, ["cherry", "lime"]);
    expect(m.pullLever).toBe(true);
    expect(m.load).toBe("cherry");
  });
});
