/**
 * Every word the room says, pinned (M3 of the decomp phase, plans/06).
 * applyServerMsg mutates the MatchView and speaks through NetFx — both
 * observable headlessly. The flash strings are the shipped strings.
 */
import { describe, it, expect } from "vitest";
import { createOrder } from "../game/order";
import type { Judgment, RequirementCheck } from "../game/judgment";
import type { ServerMsg } from "../game/protocol";
import { applyServerMsg, type NetFx } from "./net-handlers";
import { createMatchView, type MatchView } from "./state";

const check = (current: number, target = 3): RequirementCheck => ({
  req: { kind: "count-on-cake", topping: "cherry", needed: target },
  current,
  target,
  met: current >= target,
});

const judgment: Judgment = {
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
};

function harness(): {
  view: MatchView;
  fx: NetFx;
  flashes: string[];
  spawned: string[];
  ghosts: string[];
  frosting: string[];
} {
  const flashes: string[] = [];
  const spawned: string[] = [];
  const ghosts: string[] = [];
  const frosting: string[] = [];
  return {
    view: createMatchView(),
    flashes,
    spawned,
    ghosts,
    frosting,
    fx: {
      spawnShot: (m) => spawned.push(m.topping),
      spawnResting: (t) => spawned.push(`rest:${t.topping}`),
      restoreFrosting: (coats) => frosting.push(`restore:${coats.length}`),
      resetFrosting: () => frosting.push("reset"),
      upsertGhost: (p) => ghosts.push(`+${p.id}`),
      removeGhost: (id) => ghosts.push(`-${id}`),
      flash: (msg) => flashes.push(msg),
    },
  };
}

const orderMsg = (
  over: Partial<Extract<ServerMsg, { t: "order" }>> = {},
): ServerMsg => ({
  t: "order",
  order: createOrder([], 100),
  checks: [check(0)],
  ...over,
});

describe("applyServerMsg", () => {
  it("welcome installs the snapshot and raises the ghosts", () => {
    const h = harness();
    applyServerMsg(
      h.view,
      {
        t: "welcome",
        id: 7,
        machine: { ...h.view.machine, tensionClicks: 3 },
        crankTicks: 5,
        screwTicks: 12,
        order: createOrder([], 42),
        checks: [check(1)],
        poses: [{ id: 2, x: 0, y: 0, z: 0, yaw: 0 }],
        toppings: [{ topping: "cherry", x: 0, y: 3.8, z: -30 }],
        frosting: [0, 1, 2],
      },
      h.fx,
    );
    expect(h.view.myId).toBe(7);
    expect(h.view.machine.tensionClicks).toBe(3);
    expect(h.view.crankTicks).toBe(5);
    expect(h.view.screwTicks).toBe(12);
    expect(h.view.checks[0]?.current).toBe(1);
    expect(h.ghosts).toEqual(["+2"]);
    // The world as it lies: the settled cherry is recreated locally (F2)
    // and the painted cake comes back with it (plans/07).
    expect(h.spawned).toEqual(["rest:cherry"]);
    expect(h.frosting).toEqual(["restore:3"]);
  });

  it("a fresh deal clears the local frosting; other order msgs never do", () => {
    const h = harness();
    applyServerMsg(h.view, orderMsg(), h.fx); // 1Hz clock correction
    expect(h.frosting).toEqual([]);
    applyServerMsg(h.view, orderMsg({ fresh: true }), h.fx); // the re-deal
    expect(h.frosting).toEqual(["reset"]);
  });

  it("shot spawns the deterministic local lob and announces it", () => {
    const h = harness();
    applyServerMsg(
      h.view,
      { t: "shot", topping: "cherry", traverseDeg: -10, tiltNotch: 1, tensionClicks: 8, seed: 7 },
      h.fx,
    );
    expect(h.spawned).toEqual(["cherry"]);
    expect(h.flashes[0]).toBe("LOOSED! cherry · 8 clicks · -10° · arc +15°");
  });

  it("scored: the flash names progress, on-cake-but-useless, or the miss", () => {
    const h = harness();
    h.view.checks = [check(0)];
    const base = { t: "scored" as const, order: createOrder([], 100) };
    applyServerMsg(h.view, { ...base, topping: "cherry", onCake: true, checks: [check(1)] }, h.fx);
    applyServerMsg(h.view, { ...base, topping: "lime", onCake: true, checks: [check(1)] }, h.fx);
    applyServerMsg(h.view, { ...base, topping: "cherry", onCake: false, checks: [check(1)] }, h.fx);
    expect(h.flashes).toEqual([
      "✓ the patron counts the cherry!",
      "the lime rests on the cake — but that's not what was asked",
      "no good — the cherry didn't stay on the cake",
    ]);
  });

  it("order: the verdict latches with the ending message and clears on a fresh deal", () => {
    const h = harness();
    applyServerMsg(h.view, orderMsg({ judgment }), h.fx);
    expect(h.view.verdict).toEqual(judgment);
    // A running order without a judgment is a fresh deal — slate cleared.
    applyServerMsg(h.view, orderMsg(), h.fx);
    expect(h.view.verdict).toBeNull();
  });

  it("patron: the voice lands in the view and on the flash line", () => {
    const h = harness();
    applyServerMsg(h.view, { t: "patron", text: "HMPH.", seq: 4 }, h.fx);
    expect(h.view.lastPatron).toEqual({ text: "HMPH.", seq: 4 });
    expect(h.flashes[0]).toBe("THE GIANT — HMPH.");
  });

  it("leave removes the ghost and says so", () => {
    const h = harness();
    applyServerMsg(h.view, { t: "leave", id: 2 }, h.fx);
    expect(h.ghosts).toEqual(["-2"]);
    expect(h.flashes[0]).toBe("a baker left");
  });
});
