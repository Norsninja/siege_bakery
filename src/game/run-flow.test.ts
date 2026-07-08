/**
 * The run container's laws (plans/13 slice 1): the honest ready gate, the
 * ladder climb at the redeal boundary, one lost order ends the run.
 */
import { describe, it, expect } from "vitest";
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

  it("tickRunover is a no-op outside runover", () => {
    const r = new RunFlow();
    expect(r.tickRunover()).toBeNull();
    expect(r.phase).toBe("lobby");
  });
});
