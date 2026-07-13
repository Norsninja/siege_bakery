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
import { createMatchView, myMachine, type MatchView } from "./state";

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
  bound: number[];
} {
  const flashes: string[] = [];
  const spawned: string[] = [];
  const ghosts: string[] = [];
  const frosting: string[] = [];
  const bound: number[] = [];
  return {
    view: createMatchView(),
    flashes,
    spawned,
    ghosts,
    frosting,
    bound,
    fx: {
      spawnShot: (m) => spawned.push(m.topping),
      spawnResting: (t) => spawned.push(`rest:${t.topping}`),
      restoreFrosting: (coats) => frosting.push(`restore:${coats.length}`),
      bindDessert: (d) => frosting.push(`bind:${d.spec.id}`),
      clearCakeSolids: () => frosting.push("clear-cake"),
      restoreStuck: (list) => frosting.push(`stuck:${list.length}`),
      clearStuck: () => frosting.push("clear-stuck"),
      clearLandingRings: () => frosting.push("clear-rings"),
      upsertGhost: (p) => ghosts.push(`+${p.id}`),
      removeGhost: (id) => ghosts.push(`-${id}`),
      flash: (msg) => flashes.push(msg),
      bindTown: (t) => bound.push(t),
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
        machines: [
          { machine: { ...myMachine(h.view).machine, tensionClicks: 3 }, crankTicks: 5, screwTicks: 12 },
        ],
        yourTown: 0,
        order: createOrder([], 42),
        checks: [check(1)],
        poses: [{ id: 2, x: 0, y: 0, z: 0, yaw: 0 }],
        toppings: [{ topping: "cherry", x: 0, y: 3.8, z: -30 }],
        frosting: [0, 1, 2],
        stuck: [],
        run: { phase: "running", rung: 2 },
      },
      h.fx,
    );
    expect(h.view.myId).toBe(7);
    expect(h.view.run).toEqual({ phase: "running", rung: 2 });
    expect(myMachine(h.view).machine.tensionClicks).toBe(3);
    expect(myMachine(h.view).crankTicks).toBe(5);
    expect(myMachine(h.view).screwTicks).toBe(12);
    expect(h.view.yourTown).toBe(0);
    expect(h.bound).toEqual([0]); // the scene re-targeted to my town
    expect(h.view.checks[0]?.current).toBe(1);
    expect(h.ghosts).toEqual(["+2"]);
    // The world as it lies: the settled cherry is recreated locally (F2)
    // and the painted cake comes back with it (plans/07) — AFTER the
    // dessert rebind (the boot-order law, plans/13 §3: the snapshot must
    // land on the deal's census, and resting toppings need its colliders).
    expect(h.spawned).toEqual(["rest:cherry"]);
    // THE LADDER IS LIVE (plans/13 slice 4): rung 2 binds cake-2 — the
    // welcome's rebind resolves the RUNG through the shared table.
    expect(h.frosting).toEqual(["bind:cake-2", "restore:3", "stuck:0"]);
  });

  it("a fresh deal wheels out a fresh cake — clear with the OLD dessert, then bind the rung's; other order msgs never do", () => {
    const h = harness();
    applyServerMsg(h.view, orderMsg(), h.fx); // 1Hz clock correction
    expect(h.frosting).toEqual([]);
    applyServerMsg(h.view, orderMsg({ fresh: true, rung: 2 }), h.fx); // the re-deal
    // THE REDEAL ORDERING (plans/13 §3 rulings): clear-cake runs FIRST —
    // bodies leave with the dessert they rested ON (the outgoing geometry)
    // — then the incoming rung's spec binds (colliders, cake, fresh field;
    // the bind replaced the old reset). Rings ride the same clear
    // (playtest 2026-07-07): annotations about the dead order's shots
    // must not point at paint that is gone.
    // The deal's rung resolves per-spec now (slice 4): rung 2 = cake-2.
    expect(h.frosting).toEqual(["clear-cake", "bind:cake-2", "clear-stuck", "clear-rings"]);
  });

  it("THE TRAINING LOBBY (item 25): a lobby welcome binds the practice target", () => {
    const h = harness();
    applyServerMsg(
      h.view,
      {
        t: "welcome",
        id: 3,
        machines: [
          { machine: myMachine(h.view).machine, crankTicks: 0, screwTicks: 0 },
        ],
        yourTown: 0,
        order: createOrder([], 42),
        checks: [],
        poses: [],
        toppings: [],
        frosting: [],
        stuck: [],
        run: { phase: "lobby", rung: 0 },
      },
      h.fx,
    );
    // No cake before the order: the lobby joiner's mark holds the plank.
    expect(h.view.dessert.spec.id).toBe("practice");
    expect(h.frosting).toEqual(["bind:practice", "restore:0", "stuck:0"]);
  });

  it("THE TARGET RETURNS (item 25): the runover→lobby run word rebinds the plank, full redeal ordering", () => {
    const h = harness();
    // Stand mid-run on rung 1's cake, then end it: runover keeps the
    // final cake (no rebind); the lobby word wheels the plank back in.
    applyServerMsg(h.view, orderMsg({ fresh: true, rung: 1 }), h.fx);
    h.view.run = { phase: "running", rung: 1 };
    h.frosting.length = 0;
    applyServerMsg(h.view, { t: "run", phase: "runover", rung: 1 }, h.fx);
    expect(h.view.dessert.spec.id).toBe("cake-1"); // on display under the report
    expect(h.frosting).toEqual([]);
    applyServerMsg(h.view, { t: "run", phase: "lobby", rung: 0 }, h.fx);
    expect(h.view.dessert.spec.id).toBe("practice");
    // The same redeal ordering as a fresh deal (plans/13 §3): clear with
    // the OUTGOING geometry, bind the incoming, rings and stuck ride.
    expect(h.frosting).toEqual(["clear-cake", "bind:practice", "clear-stuck", "clear-rings"]);
    // A quiet lobby word (ready census) is a string compare, no rebind.
    applyServerMsg(h.view, { t: "run", phase: "lobby", rung: 0, readyIn: 1, readyOf: 1 }, h.fx);
    expect(h.frosting).toEqual(["clear-cake", "bind:practice", "clear-stuck", "clear-rings"]);
  });

  it("shot spawns the deterministic local lob and announces it", () => {
    const h = harness();
    applyServerMsg(
      h.view,
      { t: "shot", town: 0, topping: "cherry", traverseDeg: -10, tiltNotch: 1, tensionClicks: 8, seed: 7 },
      h.fx,
    );
    expect(h.spawned).toEqual(["cherry"]);
    expect(h.flashes[0]).toBe("LOOSED! cherry · 8 clicks · -10° · arc +2.5°");
  });

  it("machine broadcasts index by town — a town-1 update grows the array, never clobbers town 0", () => {
    const h = harness();
    applyServerMsg(
      h.view,
      {
        t: "machine",
        town: 1,
        state: { ...myMachine(h.view).machine, tensionClicks: 9 },
        crankTicks: 1,
        screwTicks: 2,
      },
      h.fx,
    );
    // Town 0 (mine) untouched; town 1 adopted at its index.
    expect(myMachine(h.view).machine.tensionClicks).toBe(0);
    expect(h.view.machines[1]?.machine.tensionClicks).toBe(9);
  });

  it("a town ack for ME re-targets the view and the scene; someone else's doesn't", () => {
    const h = harness();
    h.view.myId = 7;
    applyServerMsg(h.view, { t: "town", id: 9, town: 1 }, h.fx); // not me
    expect(h.view.yourTown).toBe(0);
    expect(h.bound).toEqual([]);
    applyServerMsg(h.view, { t: "town", id: 7, town: 1 }, h.fx); // me
    expect(h.view.yourTown).toBe(1);
    expect(h.bound).toEqual([1]);
    expect(h.flashes.some((f) => f.includes("town 2"))).toBe(true);
  });

  it("a town ack GROWS machines[] — myMachine never reads a foreign fort in the pre-broadcast window (audit 2026-07-07 C-MED-2)", () => {
    // The ack can beat the new town's first 15Hz machine broadcast by up
    // to 4 ticks; in that window myMachine used to fall back to town 0 —
    // HUD, prompts, and the load gate all reading the WRONG rig.
    const h = harness();
    h.view.myId = 7;
    expect(h.view.machines).toHaveLength(1); // one-town view, pre-unlock
    applyServerMsg(h.view, { t: "town", id: 7, town: 1 }, h.fx);
    expect(h.view.machines).toHaveLength(2);
    expect(myMachine(h.view)).toBe(h.view.machines[1]); // not the fallback
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

  it("run: the container's word lands in the view; the felt edges flash (plans/13)", () => {
    const h = harness();
    // Lobby census update: state only, no voice.
    applyServerMsg(
      h.view,
      { t: "run", phase: "lobby", rung: 0, readyIn: 1, readyOf: 2 },
      h.fx,
    );
    expect(h.view.run).toEqual({ phase: "lobby", rung: 0, readyIn: 1, readyOf: 2 });
    expect(h.flashes).toEqual([]);
    // The run starts: the opening is spoken once — in BAKERY words (the
    // semantic audit, plans/15 item 12: the screen never says rung/run).
    applyServerMsg(h.view, { t: "run", phase: "countdown", rung: 0, countdownTicks: 180 }, h.fx);
    applyServerMsg(h.view, { t: "run", phase: "running", rung: 1 }, h.fx);
    expect(h.flashes.pop()).toContain("THE BAKERY OPENS — the first patron is seated!");
    // The ladder climbs at the separator's end: the NEXT patron steps up
    // (the line fiction — plans/16 queue, plans/18 forge).
    applyServerMsg(h.view, { t: "run", phase: "running", rung: 2 }, h.fx);
    expect(h.flashes.pop()).toContain("PATRON 2 steps up to the table!");
    // Run over → lobby speaks the gather-again line.
    applyServerMsg(h.view, { t: "run", phase: "runover", rung: 2 }, h.fx);
    applyServerMsg(h.view, { t: "run", phase: "lobby", rung: 0 }, h.fx);
    expect(h.flashes.pop()).toContain("gather in the circle");
  });

  it("run copies the triumph flags and the purse (won/ultra FOUND DROPPED with slice 5 — the standing crew's crown never rendered)", () => {
    const h = harness();
    applyServerMsg(
      h.view,
      { t: "run", phase: "runover", rung: 7, won: true, ultra: true, purse: 15 },
      h.fx,
    );
    expect(h.view.run.won).toBe(true);
    expect(h.view.run.ultra).toBe(true);
    expect(h.view.run.purse).toBe(15);
    // Absent means absent — the next word replaces the whole container.
    applyServerMsg(h.view, { t: "run", phase: "lobby", rung: 0 }, h.fx);
    expect(h.view.run.won).toBeUndefined();
    expect(h.view.run.purse).toBeUndefined();
  });

  it("THE RE-LOCK, client half (slice 5): the run-start word shrinks machines back to home — inventory died with the last run", () => {
    const h = harness();
    // A second machine arrived last run (its 15Hz broadcast grew the list).
    applyServerMsg(
      h.view,
      { t: "machine", town: 1, state: myMachine(h.view).machine, crankTicks: 0, screwTicks: 0 },
      h.fx,
    );
    expect(h.view.machines).toHaveLength(2);
    applyServerMsg(h.view, { t: "run", phase: "runover", rung: 2 }, h.fx);
    applyServerMsg(h.view, { t: "run", phase: "lobby", rung: 0 }, h.fx);
    expect(h.view.machines).toHaveLength(2); // the lobby sandbox keeps it...
    applyServerMsg(h.view, { t: "run", phase: "running", rung: 1 }, h.fx);
    expect(h.view.machines).toHaveLength(1); // ...the next run's START re-locks
    // The C-MED-2 invariant survives the shrink: yourTown still indexes.
    expect(h.view.machines[h.view.yourTown]).toBeDefined();
  });
});
