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
  runOverText,
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

  it("the flourish rides the caption (slice 4b)", () => {
    expect(snapshotCaption(judgment({ stars: 2, score: 81, flourish: true }))).toBe(
      "the dessert, as the Giant saw it\n★★ delighted — 81/100 — WITH A FLOURISH ✨",
    );
  });
});

describe("arcGlyph", () => {
  it("shows all 13 vernier positions, grouped in 10° fours (clamp re-pin, plans/15 item 2)", () => {
    expect(arcGlyph(0)).toBe("▮▯▯▯·▯▯▯▯·▯▯▯▯·▯");
    expect(arcGlyph(1)).toBe("▮▮▯▯·▯▯▯▯·▯▯▯▯·▯");
    expect(arcGlyph(6)).toBe("▮▮▮▮·▮▮▮▯·▯▯▯▯·▯"); // 6 notches = the old 15°
    expect(arcGlyph(12)).toBe("▮▮▮▮·▮▮▮▮·▮▮▮▮·▮"); // the clamp: 85° total el
  });
});

describe("promptFor", () => {
  it("machine controls redirect to their crew posts (plans/14)", () => {
    expect(promptFor("screw", machine({ tiltNotch: 1 }), null)).toBe(
      "worked from the GUNNER'S POST — stand behind the machine · E",
    );
    expect(promptFor("wheel", machine(), null)).toBe(
      "worked from the GUNNER'S POST — stand behind the machine · E",
    );
    expect(promptFor("winch", machine(), null)).toBe(
      "cranked from the WINCH POST — the machine's right flank · E",
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

  it("the stall's prompt (slice 5): price on the prompt, every refusal predicted in words", () => {
    const m = machine();
    const stall = { open: true, owned: false, price: 50, purse: 60 };
    expect(promptFor("shop", m, null, stall)).toBe(
      "E — buy TOWN 2 · 50 coins (purse 60)",
    );
    expect(promptFor("shop", m, null, { ...stall, purse: 25 })).toBe(
      "THE STALL — TOWN 2 · 50 coins (purse 25) — not enough coins",
    );
    expect(promptFor("shop", m, null, { ...stall, open: false })).toBe(
      "THE STALL — TOWN 2 · 50 coins (purse 60) — opens between orders",
    );
    expect(promptFor("shop", m, null, { ...stall, owned: true })).toContain(
      "SOLD OUT",
    );
    expect(promptFor("shop", m, null, null)).toBe("THE STALL — closed");
  });
});

describe("bannerText — three endings, culprit always named", () => {
  const rows = [check(true), check(false)];

  it("delighted: stars + the list + the score line", () => {
    const order = { ...createOrder([], 100), status: "won" as const };
    const text = bannerText(order, rows, judgment({ stars: 2, score: 74 }), 2);
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
      2,
    );
    expect(text).toContain("REFUSED.");
    expect(text).toContain("it is TERRIBLE.");
    expect(text).toContain("over par");
    expect(text).toContain("(the patron demands 50)");
  });

  it("hungry: the clock died first — no verdict, the list still names rows", () => {
    const order = { ...createOrder([], 100), status: "lost" as const };
    const text = bannerText(order, rows, null, 2);
    expect(text).toContain("TIME!");
    expect(text).toContain("the patron goes hungry");
    expect(text).toContain("✗ 3 × cherry ON the cake");
  });

  it("the linger countdown shows the clock; the gates close with the deal", () => {
    const order = { ...createOrder([], 100), status: "lost" as const };
    const text = bannerText(order, rows, null, 2, { seconds: 7, away: false });
    expect(text).toContain("a new order in 7s");
    expect(text).toContain("the gates close with it");
    expect(text).not.toContain("HURRY"); // home bakers aren't nagged
  });

  it("a baker out of his town is WARNED before the deal carries him home (2026-07-07)", () => {
    const order = { ...createOrder([], 100), status: "lost" as const };
    const text = bannerText(order, rows, null, 2, { seconds: 4, away: true });
    expect(text).toContain("a new order in 4s");
    expect(text).toContain("YOU ARE NOT IN YOUR TOWN!");
    expect(text).toContain("carried home");
    expect(text).toContain("HURRY!");
  });

  it("THE CODA (slice 4b): a flourished win upgrades the delight, naming the desire", () => {
    const order = {
      ...createOrder([], 100, {
        desire: { topping: "cherry", revealed: true, met: true },
      }),
      status: "won" as const,
    };
    const text = bannerText(order, rows, judgment({ stars: 2, flourish: true }), 2);
    expect(text).toContain("THE PATRON IS DELIGHTED! ★★");
    expect(text).toContain("✨ AND THE FLOURISH — A CHERRY ON THE VERY TOP ✨");
    // No coda without the flag — the plain win reads exactly as ever.
    const plain = bannerText(order, rows, judgment({ stars: 2 }), 2);
    expect(plain).not.toContain("FLOURISH");
  });

  it("THE PAY LINE (slice 5): a won banner names the coins from the shared tables; the flourish names its bonus", () => {
    const order = { ...createOrder([], 100), status: "won" as const };
    // Rung 3, 2★: 30 + 2×5 = 40 — the same arithmetic the Room's award
    // runs, so the words and the wallet agree.
    const text = bannerText(order, rows, judgment({ stars: 2 }), 2, undefined, 3);
    expect(text).toContain("🪙 +40 coins to the purse");
    expect(text).not.toContain("for the style");
    // The coda adds its named bonus: 40 + 10.
    const styled = bannerText(
      order, rows, judgment({ stars: 2, flourish: true }), 2, undefined, 3,
    );
    expect(styled).toContain("🪙 +50 coins to the purse — 10 of them for the style");
    // No rung (pre-run callers): no pay line — the pre-slice-5 banner.
    const plain = bannerText(order, rows, judgment({ stars: 2 }), 2);
    expect(plain).not.toContain("🪙");
  });

  it("a run-ending loss promises NO new order — the run ends (plans/13)", () => {
    const order = { ...createOrder([], 100), status: "lost" as const };
    const text = bannerText(order, rows, null, 2, {
      seconds: 6,
      away: true, // no carry-home follows a loss; the warning would lie
      runEnds: true,
    });
    expect(text).toContain("the run ends in 6s");
    expect(text).not.toContain("a new order");
    expect(text).not.toContain("carried home");
  });
});

describe("runOverText — the run report banner", () => {
  it("ULTRA upgrades the title line only; the plain triumph is untouched (skeleton law)", () => {
    expect(runOverText(7, true, true)).toContain(
      "👑 ULTRA MASTER BAKER OF THE REALMS 👑",
    );
    expect(runOverText(7, true)).toContain("👑 MASTER BAKER 👑");
    expect(runOverText(7, true)).not.toContain("ULTRA");
    // Ultra never dresses a loss (the wire never sends it without won,
    // and the words agree).
    expect(runOverText(3, false, true)).toContain("THE RUN IS OVER");
  });

  it("the report tells the purse's end (slice 5) — and stays silent at zero", () => {
    expect(runOverText(3, false, false, 42)).toContain(
      "🪙 the purse ends at 42 coins",
    );
    expect(runOverText(7, true, false, 15)).toContain("the purse ends at 15");
    expect(runOverText(3, false)).not.toContain("🪙"); // the pre-purse report
  });
});

describe("hudLines", () => {
  const view = (over: Partial<HudView> = {}): HudView => ({
    order: createOrder([], 71 * 60),
    checks: [check(false, 1)],
    // A live rung by default — the pre-campaign HUD, one header deeper.
    run: { phase: "running", rung: 1 },
    topTier: 2, // cake-3's summit (spec refactor, plans/13 §3)
    machine: machine(),
    crankTicks: 0,
    carrying: null,
    netStatus: "loopback",
    ghostCount: 0,
    myId: null,
    locked: true,
    target: null,
    shop: null,
    flash: null,
    manned: null,
    nearPost: null,
    ...over,
  });

  it("headline rung + clock + solo tag; checklist rows carry progress", () => {
    const lines = hudLines(view());
    expect(lines[0]).toBe("RUNG 1 · THE ORDER · 1:11   [solo bakery]");
    expect(lines[1]).toBe("  ✗ 3 × cherry ON the cake · 1/3");
  });

  it("the purse rides the run block (slice 5): the wire's balance, absent reads 0", () => {
    const lines = hudLines(
      view({ run: { phase: "running", rung: 2, purse: 35 } }),
    );
    expect(lines).toContain("  🪙 purse: 35 coins");
    expect(hudLines(view())).toContain("  🪙 purse: 0 coins");
    // Only a live rung banks: the lobby block carries no wallet line.
    const lobby = hudLines(view({ run: { phase: "lobby", rung: 0 } }));
    expect(lobby.join("\n")).not.toContain("purse");
  });

  it("the lobby invites to the circle with the ready census; no order shows (plans/13)", () => {
    const lines = hudLines(
      view({ run: { phase: "lobby", rung: 0, readyIn: 1, readyOf: 3 } }),
    );
    expect(lines[0]).toContain("THE BAKERY WAITS");
    expect(lines[1]).toContain("stand in the gold circle");
    expect(lines[1]).toContain("(1/3 in)");
    expect(lines.join("\n")).not.toContain("THE ORDER");
  });

  it("the countdown counts seconds and warns that stepping out cancels", () => {
    const lines = hudLines(
      view({ run: { phase: "countdown", rung: 0, countdownTicks: 130 } }),
    );
    expect(lines[0]).toContain("the run begins in 3…");
    expect(lines[1]).toContain("stepping out cancels");
  });

  it("run over: the report names the rungs cleared (died on rung → cleared − 1)", () => {
    const lines = hudLines(view({ run: { phase: "runover", rung: 3 } }));
    expect(lines[0]).toContain("RUN OVER");
    expect(lines[0]).toContain("cleared 2 rungs");
    // Dying on rung 1 cleared nothing — the Giant left hungry.
    const first = hudLines(view({ run: { phase: "runover", rung: 1 } }));
    expect(first[0]).toContain("left hungry at the first dessert");
  });

  it("TRIUMPH: the runover that conquered the top wears the crown — MASTER BAKER (§1 flourish amendment)", () => {
    const lines = hudLines(
      view({ run: { phase: "runover", rung: 7, won: true } }),
    );
    expect(lines[0]).toContain("MASTER BAKER");
    expect(lines[0]).toContain("all 7 rungs conquered");
    expect(lines[0]).not.toContain("RUN OVER");
  });

  it("THE GOLDEN ROW (slice 4b): the revealed desire renders after the checklist — style, not required", () => {
    const desire = { topping: "cherry", revealed: true, met: false };
    const lines = hudLines(view({ order: createOrder([], 71 * 60, { desire }) }));
    expect(lines[2]).toBe(
      "  ★ THE FLOURISH: a cherry on the very top — style, not required",
    );
    // Landed: the golden checkmark replaces the disclaimer.
    const met = hudLines(
      view({
        order: createOrder([], 71 * 60, { desire: { ...desire, met: true } }),
      }),
    );
    expect(met[2]).toBe("  ★ THE FLOURISH: a cherry on the very top ✓");
    // Unrevealed: the desire is the patron's secret — no row.
    const secret = hudLines(
      view({
        order: createOrder([], 71 * 60, { desire: { ...desire, revealed: false } }),
      }),
    );
    expect(secret.join("\n")).not.toContain("THE FLOURISH");
  });

  it("FINISH IT (slice 4b): the window swaps the dead order clock for its own countdown", () => {
    const order = {
      ...createOrder([], 71 * 60, {
        desire: { topping: "cherry", revealed: true, met: false },
      }),
      finishTicksLeft: 300,
    };
    const lines = hudLines(view({ order }));
    expect(lines[0]).toBe("RUNG 1 · ⭐ FINISH IT! 5s ⭐   [solo bakery]");
    expect(lines.join("\n")).not.toContain("THE ORDER ·");
  });

  it("ULTRA (slice 4b): the runover header upgrades when the wire says so", () => {
    const lines = hudLines(
      view({ run: { phase: "runover", rung: 7, won: true, ultra: true } }),
    );
    expect(lines[0]).toContain("ULTRA MASTER BAKER OF THE REALMS");
    expect(lines[0]).toContain("all 7 rungs conquered");
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
      "machine — traverse -12° · arc +2.5° (1/12) · tension 6/10 · bucket: cherry · hands: lime",
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
    expect(lines[lines.length - 2]).toBe("▸ the gunner fires — F, from the post");
    expect(lines[lines.length - 1]).toBe("LOOSED!");
  });

  it("the gunner's panel: legend + the aiming instrument (the ladder's home, plans/14)", () => {
    const lines = hudLines(
      view({
        manned: "gunner",
        machine: machine({ traverseDeg: -8.5, tiltNotch: 6 }),
        target: "wheel", // crosshair prompts stay quiet while manned
      }),
    );
    expect(lines[lines.length - 2]).toBe(
      "▸ GUNNER'S POST — A/D wheel · W/S screw · F fire · E step off",
    );
    expect(lines[lines.length - 1]).toBe(
      "  arc ▮▮▮▮·▮▮▮▯·▯▯▯▯·▯ +15° · traverse -8.5°",
    );
  });

  it("winch panel and the on-foot invitations", () => {
    expect(hudLines(view({ manned: "winch" })).pop()).toBe(
      "▸ WINCH POST — hold Space/W to wind · S to unwind · E step off",
    );
    expect(hudLines(view({ nearPost: "gunner" })).pop()).toBe(
      "▸ E — man the gunner's post",
    );
    expect(hudLines(view({ nearPost: "winch" })).pop()).toBe(
      "▸ E — man the winch",
    );
  });
});
