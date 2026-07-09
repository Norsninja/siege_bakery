/**
 * The run container's laws (plans/13 slice 1; the MASTER BAKER terminal
 * since slice 4): the honest ready gate, the ladder climb at the redeal
 * boundary, one lost order ends the run — and winning the TOP rung ends
 * it in triumph (§1 flourish amendment).
 */
import { describe, it, expect } from "vitest";
import { RUNGS } from "./campaign";
import { RunFlow } from "./run-flow";
import { READY_COUNTDOWN_TICKS, RUNOVER_TICKS } from "./tuning";

describe("RunFlow — lobby and the ready countdown", () => {
  it("boots in the lobby, rung 0 — no run underway", () => {
    const r = new RunFlow();
    expect(r.phase).toBe("lobby");
    expect(r.rung).toBe(0);
  });

  it("nobody ready: the lobby waits forever", () => {
    const r = new RunFlow();
    for (let i = 0; i < 1000; i++) expect(r.tickReady(false)).toBeNull();
    expect(r.phase).toBe("lobby");
  });

  it("all in the circle arms the countdown; holding it starts the run at rung 1", () => {
    const r = new RunFlow();
    expect(r.tickReady(true)).toBe("countdown");
    expect(r.phase).toBe("countdown");
    let started = 0;
    for (let i = 0; i < READY_COUNTDOWN_TICKS; i++)
      if (r.tickReady(true) === "start") started++;
    expect(started).toBe(1);
    expect(r.phase).toBe("running");
    expect(r.rung).toBe(1);
  });

  it("stepping out of the circle CANCELS the countdown — the honest gate", () => {
    const r = new RunFlow();
    r.tickReady(true);
    r.tickReady(true);
    expect(r.tickReady(false)).toBe("cancel");
    expect(r.phase).toBe("lobby");
    // The next full stand starts a FULL countdown, not a resumed one.
    expect(r.tickReady(true)).toBe("countdown");
    expect(r.countdownLeft).toBe(READY_COUNTDOWN_TICKS);
  });

  it("tickReady is a no-op outside lobby/countdown", () => {
    const r = new RunFlow();
    r.tickReady(true);
    for (let i = 0; i < READY_COUNTDOWN_TICKS; i++) r.tickReady(true);
    expect(r.phase).toBe("running");
    expect(r.tickReady(true)).toBeNull();
    expect(r.tickReady(false)).toBeNull();
    expect(r.phase).toBe("running");
  });
});

describe("RunFlow — the shared purse (plans/13 §5 as amended 2026-07-09)", () => {
  const startRun = (r: RunFlow): void => {
    r.tickReady(true);
    for (let i = 0; i < READY_COUNTDOWN_TICKS; i++) r.tickReady(true);
  };

  it("earn accumulates; spend debits exactly when it can and refuses honestly when it can't", () => {
    const r = new RunFlow();
    startRun(r);
    r.earn(25);
    r.earn(35);
    expect(r.purse).toBe(60);
    expect(r.spend(50)).toBe(true);
    expect(r.purse).toBe(10);
    // The refusal takes NOTHING — an honest "not enough coins".
    expect(r.spend(50)).toBe(false);
    expect(r.purse).toBe(10);
  });

  it("the purse SURVIVES runover and the lobby (the report tells the whole story) and dies at the NEXT run's start", () => {
    const r = new RunFlow();
    startRun(r);
    r.earn(42);
    r.orderConcluded(false); // the run dies; the balance doesn't — yet
    expect(r.phase).toBe("runover");
    expect(r.purse).toBe(42);
    for (let i = 0; i < RUNOVER_TICKS; i++) r.tickRunover();
    expect(r.phase).toBe("lobby");
    expect(r.purse).toBe(42); // the lobby still holds the finished story
    startRun(r); // ...and the next run starts its own
    expect(r.purse).toBe(0);
  });
});

describe("RunFlow — the ladder and the run's end", () => {
  const running = (): RunFlow => {
    const r = new RunFlow();
    r.tickReady(true);
    for (let i = 0; i < READY_COUNTDOWN_TICKS; i++) r.tickReady(true);
    return r;
  };

  it("a WON order climbs the ladder at the redeal boundary", () => {
    const r = running();
    expect(r.orderConcluded(true)).toBe("nextRung");
    expect(r.phase).toBe("running");
    expect(r.rung).toBe(2);
    expect(r.orderConcluded(true)).toBe("nextRung");
    expect(r.rung).toBe(3);
  });

  it("a LOST order ends the run — runover holds, then the lobby", () => {
    const r = running();
    r.orderConcluded(true); // rung 2
    expect(r.orderConcluded(false)).toBe("runOver");
    expect(r.phase).toBe("runover");
    expect(r.rung).toBe(2); // the rung it died on — cleared = rung - 1
    let toLobby = 0;
    for (let i = 0; i < RUNOVER_TICKS; i++)
      if (r.tickRunover() === "lobby") toLobby++;
    expect(toLobby).toBe(1);
    expect(r.phase).toBe("lobby");
    expect(r.rung).toBe(0); // the next run starts its own story
  });

  it("winning the TOP rung ends the run in TRIUMPH — MASTER BAKER (§1 flourish amendment)", () => {
    const r = running();
    for (let i = 1; i < RUNGS.length; i++)
      expect(r.orderConcluded(true)).toBe("nextRung");
    expect(r.rung).toBe(RUNGS.length); // standing on the top
    expect(r.orderConcluded(true)).toBe("runWon"); // no silent replay
    expect(r.phase).toBe("runover");
    expect(r.won).toBe(true);
    expect(r.rung).toBe(RUNGS.length); // conquered, not died on
    // The triumph is the RUN's story: the lobby starts clean.
    let toLobby = 0;
    for (let i = 0; i < RUNOVER_TICKS; i++)
      if (r.tickRunover() === "lobby") toLobby++;
    expect(toLobby).toBe(1);
    expect(r.won).toBe(false);
    expect(r.rung).toBe(0);
  });

  it("ULTRA (§1 finish-it amendment): the top-rung triumph WITH the flourish", () => {
    const r = running();
    for (let i = 1; i < RUNGS.length; i++)
      expect(r.orderConcluded(true, true)).toBe("nextRung"); // mid-ladder codas…
    expect(r.ultra).toBe(false); // …never set the flag (only the top consumes it)
    expect(r.orderConcluded(true, true)).toBe("runWon");
    expect(r.won).toBe(true);
    expect(r.ultra).toBe(true);
    // The lobby starts clean, ultra included.
    let toLobby = 0;
    for (let i = 0; i < RUNOVER_TICKS; i++)
      if (r.tickRunover() === "lobby") toLobby++;
    expect(toLobby).toBe(1);
    expect(r.ultra).toBe(false);
  });

  it("a plain top-rung triumph is MASTER BAKER only — no coda, no ultra", () => {
    const r = running();
    for (let i = 1; i < RUNGS.length; i++) r.orderConcluded(true);
    expect(r.orderConcluded(true, false)).toBe("runWon");
    expect(r.won).toBe(true);
    expect(r.ultra).toBe(false);
  });

  it("a LOST order never wears ultra, coda or not (won && flourish, both)", () => {
    const r = running();
    expect(r.orderConcluded(false, true)).toBe("runOver");
    expect(r.ultra).toBe(false);
  });

  it("a lost run never wears the crown — won stays false through its runover", () => {
    const r = running();
    r.orderConcluded(false);
    expect(r.phase).toBe("runover");
    expect(r.won).toBe(false);
  });

  it("tickRunover is a no-op outside runover", () => {
    const r = new RunFlow();
    expect(r.tickRunover()).toBeNull();
    expect(r.phase).toBe("lobby");
  });
});
