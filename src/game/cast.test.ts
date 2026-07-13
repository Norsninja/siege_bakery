/**
 * THE CAST MAPPING (plans/19, promoted to game/ in entry 4) — the
 * pure arithmetic the unified fiction stands on. These pins are the
 * multiplayer story: every client AND the Room derive the same patron
 * for the same rung with no messages — since entry 4 the derivation
 * also places physics (the patron colliders), so these pins guard
 * trajectories, not just paint.
 */
import { describe, expect, it } from "vitest";
import {
  castIndexForRung,
  patronAtMark,
  SPECIES,
  speciesForRung,
} from "./cast";

describe("castIndexForRung", () => {
  it("THE OPENING PIN: rung 1 is always the ogre, whatever the seed", () => {
    expect(castIndexForRung(1)).toBe(0);
    expect(SPECIES[0]).toBe("ogre");
  });

  it("is deterministic — same rung, same patron, every derivation", () => {
    for (let r = 1; r <= 40; r++) {
      expect(castIndexForRung(r)).toBe(castIndexForRung(r));
    }
  });

  it("never seats the same patron twice in a row (the shuffle ruling)", () => {
    for (let r = 1; r < 500; r++) {
      expect(castIndexForRung(r + 1)).not.toBe(castIndexForRung(r));
    }
  });

  it("is not a direct cycle (the other half of the ruling)", () => {
    // A pure cycle would satisfy idx(r+1) === (idx(r)+1) mod n for all
    // r; the shuffle must break it somewhere in any long window.
    let cyclic = true;
    for (let r = 1; r < 60; r++) {
      if (
        castIndexForRung(r + 1) !==
        (castIndexForRung(r) + 1) % SPECIES.length
      ) {
        cyclic = false;
        break;
      }
    }
    expect(cyclic).toBe(false);
  });

  it("eventually casts every species", () => {
    const seen = new Set<number>();
    for (let r = 1; r <= 60; r++) seen.add(castIndexForRung(r));
    expect(seen.size).toBe(SPECIES.length);
  });

  it("is not period-2 either (the live alternation bug, 2026-07-12)", () => {
    // The unmixed first draw alternated two species for long runs —
    // legal under no-repeat, but a pattern. Any 12-rung window must
    // break idx(r+2) === idx(r) somewhere.
    for (let start = 1; start <= 60; start += 12) {
      let alternating = true;
      for (let r = start; r < start + 10; r++) {
        if (castIndexForRung(r + 2) !== castIndexForRung(r)) {
          alternating = false;
          break;
        }
      }
      expect(alternating).toBe(false);
    }
  });

  it("no species starves: each appears at least 10% over 200 rungs", () => {
    const counts = new Array(SPECIES.length).fill(0);
    for (let r = 1; r <= 200; r++) counts[castIndexForRung(r)]++;
    for (const c of counts) expect(c).toBeGreaterThan(20);
  });

  it("clamps rung 0/negatives to the first draw (lobby safety)", () => {
    expect(castIndexForRung(0)).toBe(castIndexForRung(1));
    expect(castIndexForRung(-3)).toBe(castIndexForRung(1));
  });
});

describe("patronAtMark (item 16's deal-boundary gating, one home)", () => {
  it("a running order stands its rung's patron at the mark", () => {
    for (let r = 1; r <= 20; r++) {
      expect(patronAtMark("running", r, false)).toBe(speciesForRung(r));
    }
  });

  it("the verdict clears the mark — exactly when the walk theatre plays", () => {
    expect(patronAtMark("running", 3, true)).toBeNull();
  });

  it("runover clears the mark — he walked, the report holds the stage", () => {
    expect(patronAtMark("runover", 3, false)).toBeNull();
    expect(patronAtMark("runover", 3, true)).toBeNull();
  });

  it("THE TRAINING LOBBY (item 25, entry 5): lobby and countdown clear the mark", () => {
    // Entry 5 razed the interim rule: the table is EMPTY before the
    // run — the founding patron waits on the bench (client theatre,
    // no capsules) and the practice target owns the lobby's physics.
    // The verdict flag is irrelevant with nobody at the mark.
    expect(patronAtMark("lobby", 0, false)).toBeNull();
    expect(patronAtMark("lobby", 0, true)).toBeNull();
    expect(patronAtMark("countdown", 0, false)).toBeNull();
    expect(patronAtMark("countdown", 5, true)).toBeNull();
  });

  it("is pure — both worlds asking the same question get the same shape", () => {
    for (let r = 1; r <= 30; r++) {
      expect(patronAtMark("running", r, false)).toBe(
        patronAtMark("running", r, false),
      );
    }
  });
});
