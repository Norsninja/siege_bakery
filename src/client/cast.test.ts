/**
 * THE CAST, visual half (plans/19) — the line geometry the unified
 * fiction renders. The mapping's own pins moved to game/cast.test.ts
 * with the promotion (entry 4); what stays here is what only the
 * renderer computes: slots, tiers, stance, and the alignment pin
 * that the visual roster can never drift from game/'s.
 */
import { describe, expect, it } from "vitest";
import { SPECIES } from "../game/cast";
import {
  CAST,
  lineSlots,
  LINE_SLOTS,
  tablePatron,
  TIER1_SLOTS,
  TIER2_SLOTS,
} from "./cast";

describe("CAST (the visual roster)", () => {
  it("derives from game/'s canonical roster — one species order, one truth", () => {
    expect(CAST.map((m) => m.species)).toEqual([...SPECIES]);
  });

  it("every member ships a positive visual scale", () => {
    for (const m of CAST) expect(m.visualScale).toBeGreaterThan(0);
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
