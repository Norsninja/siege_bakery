/**
 * The words the player reads, pinned (M1 of the decomp phase, plans/06).
 * hud.ts is deliberately DOM-free so these run headless like everything
 * else. The strings below are the EXACT strings shipped before the
 * extraction — if a pin moves, the move must be on purpose.
 */
import { describe, it, expect } from "vitest";
import { createCatapult } from "../game/catapult";
import { createOrder } from "../game/order";
import type { Judgment, RequirementCheck } from "../game/judgment";
import { arcGlyph, bannerText, hudLines, promptFor, type HudView } from "./hud";

const machine = (over: Partial<ReturnType<typeof createCatapult>> = {}) => ({
  ...createCatapult(),
  ...over,
});

const check = (met: boolean, current = met ? 3 : 0): RequirementCheck => ({
  req: { kind: "count-on-cake", topping: "cherry", needed: 3 },
  current,
  target: 3,
  met,
});

const judgment = (over: Partial<Judgment> = {}): Judgment => ({
  met: true,
  accepted: true,
  score: 100,
  stars: 3,
  checks: [],
  coverage: 1,
  neatness: 1,
  integrity: 1,
  mess: 0,
  waste: 1,
  ...over,
});

describe("arcGlyph", () => {
  it("shows all four ladder positions at once (the notch-1/3 misread fix)", () => {
    expect(arcGlyph(0)).toBe("▮▯▯▯");
    expect(arcGlyph(1)).toBe("▮▮▯▯");
    expect(arcGlyph(3)).toBe("▮▮▮▮");
  });
});

describe("promptFor", () => {
  it("screw prompt carries degrees + the glyph", () => {
    expect(promptFor("screw", machine({ tiltNotch: 1 }), null)).toBe(
      "hold E + W/S — elevation screw · +15° ▮▮▯▯",
    );
  });

  it("bucket prompt follows hands and load state", () => {
    expect(promptFor("bucket", machine({ loaded: "cherry" }), null)).toBe(
      "bucket is full — fire it!",
    );
    expect(promptFor("bucket", machine(), "lime")).toBe("E — load the lime");
    expect(promptFor("bucket", machine(), null)).toBe(
      "hands empty — fetch a topping from the pantry",
    );
  });

  it("shelves refuse full hands", () => {
    expect(promptFor("shelf-cherry", machine(), "lime")).toBe(
      "hands full — one at a time",
    );
    expect(promptFor("shelf-lime", machine(), null)).toBe("E — take a lime");
  });
});

describe("bannerText — three endings, culprit always named", () => {
  const rows = [check(true), check(false)];

  it("delighted: stars + the list + the score line", () => {
    const order = { ...createOrder([], 100), status: "won" as const };
    const text = bannerText(order, rows, judgment({ stars: 2, score: 74 }));
    expect(text).toContain("THE PATRON IS DELIGHTED! ★★");
    expect(text).toContain("✗ 3 × cherry ON the cake"); // the culprit law
    expect(text).toContain("assembly 74/100");
    expect(text).toContain("a new order is coming…");
  });

  it("refused: the insulting kind, naming the demanded pass score", () => {
    const order = { ...createOrder([], 100), status: "lost" as const };
    const text = bannerText(
      order,
      rows,
      judgment({ accepted: false, score: 40, stars: 0, waste: 0.4 }),
    );
    expect(text).toContain("REFUSED.");
    expect(text).toContain("it is TERRIBLE.");
    expect(text).toContain("over par");
    expect(text).toContain("(the patron demands 50)");
  });

  it("hungry: the clock died first — no verdict, the list still names rows", () => {
    const order = { ...createOrder([], 100), status: "lost" as const };
    const text = bannerText(order, rows, null);
    expect(text).toContain("TIME!");
    expect(text).toContain("the patron goes hungry");
    expect(text).toContain("✗ 3 × cherry ON the cake");
  });
});

describe("hudLines", () => {
  const view = (over: Partial<HudView> = {}): HudView => ({
    order: createOrder([], 71 * 60),
    checks: [check(false, 1)],
    machine: machine(),
    crankTicks: 0,
    carrying: null,
    netStatus: "loopback",
    ghostCount: 0,
    myId: null,
    locked: true,
    target: null,
    flash: null,
    ...over,
  });

  it("headline clock + solo tag; checklist rows carry progress", () => {
    const lines = hudLines(view());
    expect(lines[0]).toBe("THE ORDER · 1:11   [solo bakery]");
    expect(lines[1]).toBe("  ✗ 3 × cherry ON the cake · 1/3");
  });

  it("machine line: traverse, arc glyph, tension, bucket, hands", () => {
    const lines = hudLines(
      view({
        machine: machine({ traverseDeg: -12, tiltNotch: 1, tensionClicks: 6, loaded: "cherry" }),
        carrying: "lime",
      }),
    );
    expect(lines[lines.length - 1]).toBe(
      "machine — traverse -12° · arc +15° ▮▮▯▯ · tension 6/8 · bucket: cherry · hands: lime",
    );
  });

  it("co-op tag counts every baker and names mine; flash and prompt append", () => {
    const lines = hudLines(
      view({
        netStatus: "open",
        ghostCount: 2,
        myId: 3,
        target: "lever",
        flash: "LOOSED!",
      }),
    );
    expect(lines[0]).toContain("co-op bakery · 3 baking · you are baker 3");
    expect(lines[lines.length - 2]).toBe("▸ E — pull the release lever!");
    expect(lines[lines.length - 1]).toBe("LOOSED!");
  });
});
