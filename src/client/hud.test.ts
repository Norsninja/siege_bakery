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
import {
  arcGlyph,
  bannerText,
  hudLines,
  promptFor,
  SHELF_TOPPING,
  snapshotCaption,
  type HudView,
} from "./hud";

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
  effectiveCoverage: 1,
  neatness: 1,
  integrity: 1,
  mess: 0,
  waste: 1,
  ...over,
});

describe("snapshotCaption — the photo speaks the Patron's voice (dessert report, 2026-07-07)", () => {
  it("delight: stars and the score under the photo", () => {
    expect(snapshotCaption(judgment({ stars: 2, score: 81 }))).toBe(
      "the dessert, as the Giant saw it\n★★ delighted — 81/100",
    );
  });
  it("gate-2 refusal keeps the insult", () => {
    expect(snapshotCaption(judgment({ accepted: false, score: 42, stars: 0 }))).toBe(
      'the dessert, as the Giant saw it\n— "it is TERRIBLE." (42/100)',
    );
  });
  it("gate-1 hunger", () => {
    expect(snapshotCaption(judgment({ met: false, accepted: false, stars: 0 }))).toBe(
      "the dessert, as the Giant saw it\n— and he goes hungry",
    );
  });
  it("no verdict yet (the broadcast races the status flip): just the head", () => {
    expect(snapshotCaption(null)).toBe("the dessert, as the Giant saw it");
  });
});

describe("arcGlyph", () => {
  it("shows all 19 vernier positions, grouped in 10° fours (re-pinned 2026-07-08)", () => {
    expect(arcGlyph(0)).toBe("▮▯▯▯·▯▯▯▯·▯▯▯▯·▯▯▯▯·▯▯▯");
    expect(arcGlyph(1)).toBe("▮▮▯▯·▯▯▯▯·▯▯▯▯·▯▯▯▯·▯▯▯");
    expect(arcGlyph(6)).toBe("▮▮▮▮·▮▮▮▯·▯▯▯▯·▯▯▯▯·▯▯▯"); // 6 notches = the old 15°
    expect(arcGlyph(18)).toBe("▮▮▮▮·▮▮▮▮·▮▮▮▮·▮▮▮▮·▮▮▮");
  });
});

describe("promptFor", () => {
  it("screw prompt carries degrees + the glyph", () => {
    expect(promptFor("screw", machine({ tiltNotch: 1 }), null)).toBe(
      "hold E + W/S — elevation screw · +2.5° ▮▮▯▯·▯▯▯▯·▯▯▯▯·▯▯▯▯·▯▯▯",
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
    expect(promptFor("shelf-frosting", machine(), null)).toBe(
      "E — scoop a glob of frosting",
    );
    expect(promptFor("shelf-sprinkles", machine(), "cherry")).toBe(
      "hands full — one at a time",
    );
  });

  it("every shelf hands out its own topping (the pickup map)", () => {
    expect(SHELF_TOPPING["shelf-frosting"]).toBe("frosting");
    expect(SHELF_TOPPING["shelf-sprinkles"]).toBe("sprinkles");
    expect(SHELF_TOPPING["shelf-cherry"]).toBe("cherry");
    expect(SHELF_TOPPING["shelf-lime"]).toBe("lime");
    expect(SHELF_TOPPING.lever).toBeUndefined(); // machines are not snacks
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

  it("the linger countdown shows the clock; the gates close with the deal", () => {
    const order = { ...createOrder([], 100), status: "lost" as const };
    const text = bannerText(order, rows, null, { seconds: 7, away: false });
    expect(text).toContain("a new order in 7s");
    expect(text).toContain("the gates close with it");
    expect(text).not.toContain("HURRY"); // home bakers aren't nagged
  });

  it("a baker out of his town is WARNED before the deal carries him home (2026-07-07)", () => {
    const order = { ...createOrder([], 100), status: "lost" as const };
    const text = bannerText(order, rows, null, { seconds: 4, away: true });
    expect(text).toContain("a new order in 4s");
    expect(text).toContain("YOU ARE NOT IN YOUR TOWN!");
    expect(text).toContain("carried home");
    expect(text).toContain("HURRY!");
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
    // Compact arc on the always-on line (visionary call 2026-07-08): the
    // full ladder is the screw prompt's alone.
    expect(lines[lines.length - 1]).toBe(
      "machine — traverse -12° · arc +2.5° (1/18) · tension 6/10 · bucket: cherry · hands: lime",
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
