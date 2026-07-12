/**
 * THE CAST MAPPING (plans/19) — the pure arithmetic the unified
 * fiction stands on. These pins are the multiplayer story: every
 * client derives the same patron for the same rung with no messages.
 */
import { describe, expect, it } from "vitest";
import {
  CAST,
  castIndexForRung,
  lineSlots,
  LINE_SLOTS,
  tablePatron,
  TIER1_SLOTS,
  TIER2_SLOTS,
} from "./cast";

describe("castIndexForRung", () => {
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
        (castIndexForRung(r) + 1) % CAST.length
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
    expect(seen.size).toBe(CAST.length);
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
    const counts = new Array(CAST.length).fill(0);
    for (let r = 1; r <= 200; r++) counts[castIndexForRung(r)]++;
    for (const c of counts) expect(c).toBeGreaterThan(20);
  });

  it("clamps rung 0/negatives to the first draw (lobby safety)", () => {
    expect(castIndexForRung(0)).toBe(castIndexForRung(1));
    expect(castIndexForRung(-3)).toBe(castIndexForRung(1));
  });
});

describe("lineSlots", () => {
  it("THE ADVANCE IDENTITY: slot i after an advance is slot i+1 before", () => {
    for (let r = 1; r <= 30; r++) {
      const now = lineSlots(r);
      const next = lineSlots(r + 1);
      for (let i = 0; i < LINE_SLOTS - 1; i++) {
        expect(next[i]!.queueIndex).toBe(now[i + 1]!.queueIndex);
        expect(next[i]!.species).toBe(now[i + 1]!.species);
        // his personal stance walks with him
        expect(next[i]!.z).toBe(now[i + 1]!.z);
        expect(next[i]!.yaw).toBe(now[i + 1]!.yaw);
      }
    }
  });

  it("slot 0 is next up: he takes the table on the advance", () => {
    for (let r = 1; r <= 30; r++) {
      expect(lineSlots(r)[0]!.species).toBe(tablePatron(r + 1).species);
    }
  });

  it("stays inside the giants' road corridor (game z −26..−60)", () => {
    for (let r = 1; r <= 20; r++) {
      for (const s of lineSlots(r)) {
        expect(s.z).toBeLessThan(-25);
        expect(s.z).toBeGreaterThan(-61);
        expect(s.x).toBeGreaterThan(40); // never crowds the table
      }
    }
  });

  it("marches +x in slot order with tiers degrading backward", () => {
    const slots = lineSlots(1);
    for (let i = 0; i < LINE_SLOTS; i++) {
      if (i > 0) expect(slots[i]!.x).toBeGreaterThan(slots[i - 1]!.x);
      const want =
        i < TIER1_SLOTS ? "actor" : i < TIER2_SLOTS ? "standee" : "impostor";
      expect(slots[i]!.tier).toBe(want);
    }
  });

  it("table patron never matches the head of the line (no twins at the counter)", () => {
    for (let r = 1; r <= 60; r++) {
      expect(lineSlots(r)[0]!.species).not.toBe(tablePatron(r).species);
    }
  });
});
