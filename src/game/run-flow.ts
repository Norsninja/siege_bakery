/**
 * The run lifecycle — THE CAMPAIGN CONTAINER (plans/13 slice 1, built
 * 2026-07-08). A run is one complete story: the crew readies up, the
 * desserts escalate rung by rung, and a single failed order ends it.
 *
 *   LOBBY --all in the circle--> COUNTDOWN --held to zero--> RUNNING(rung 1)
 *     ^        (stepping out cancels — the honest gate)          |
 *     |                                                    won: rung+1 at
 *     |                                                    the redeal
 *     |                                                    boundary; lost:
 *     +---- RUNOVER (the run report holds RUNOVER_TICKS) <-------+
 *
 * RunFlow owns the PHASE and the RUNG — nothing else. It ticks counters
 * and returns events, exactly OrderFlow's shape: no physics, no wire, no
 * roster. The Room feeds it "is everyone standing in the ready circle"
 * (derived from client-authoritative poses riding the message stream —
 * inside the determinism fence) and tells it how each order concluded at
 * the linger's redeal boundary; the Room owns every broadcast and every
 * physical reset. game/ law: imports core/ + sibling game modules only.
 *
 * Slice 1 deliberately deals THE SAME DESSERT every rung — the container
 * ships before the ladder (plans/13 §8: the DessertSpec refactor is
 * slice 2, measured rungs slice 3). The rung number is real from day
 * one; what it deals grows later.
 */
import { READY_COUNTDOWN_TICKS, RUNOVER_TICKS } from "./tuning";

export type RunPhase = "lobby" | "countdown" | "running" | "runover";

/** What one tick of the container asks the Room to do. */
export type RunEvent =
  /** All bakers stood in the circle: the countdown armed. */
  | "countdown"
  /** Somebody stepped out (or left mid-count): back to the lobby. */
  | "cancel"
  /** The countdown held to zero: deal rung 1 — the run begins. */
  | "start"
  /** The run-over report is done: the bakery returns to the lobby. */
  | "lobby";

export class RunFlow {
  phase: RunPhase = "lobby";
  /** 1-based rung being played (running) or died on (runover); 0 in the
   * lobby — no run is underway. */
  rung = 0;
  /** Ticks left on the ready countdown (countdown phase only). */
  countdownLeft = 0;
  /** Ticks left on the run-over report (runover phase only). */
  private runoverLeft = 0;

  /** One lobby/countdown tick. `allReady` = at least one baker connected
   * AND every connected baker stands inside the ready circle (the Room
   * derives it from roster poses). No-op in other phases. */
  tickReady(allReady: boolean): RunEvent | null {
    if (this.phase === "lobby") {
      if (!allReady) return null;
      this.phase = "countdown";
      this.countdownLeft = READY_COUNTDOWN_TICKS;
      return "countdown";
    }
    if (this.phase === "countdown") {
      if (!allReady) {
        this.phase = "lobby";
        this.countdownLeft = 0;
        return "cancel";
      }
      this.countdownLeft--;
      if (this.countdownLeft > 0) return null;
      this.phase = "running";
      this.rung = 1;
      return "start";
    }
    return null;
  }

  /** The Room reports how the order concluded, AT THE REDEAL BOUNDARY
   * (the linger/separator's end — the verdict banner already had its
   * ORDER_RESET_TICKS). Won: the ladder climbs, the Room deals the next
   * rung. Lost: the run is over — the Room deals NOTHING; the sad cake
   * stays on display under the run report. */
  orderConcluded(won: boolean): "nextRung" | "runOver" {
    if (won) {
      this.rung++;
      return "nextRung";
    }
    this.phase = "runover";
    this.runoverLeft = RUNOVER_TICKS;
    return "runOver";
  }

  /** One runover tick; returns "lobby" when the report is done. */
  tickRunover(): RunEvent | null {
    if (this.phase !== "runover") return null;
    this.runoverLeft--;
    if (this.runoverLeft > 0) return null;
    this.phase = "lobby";
    this.rung = 0;
    return "lobby";
  }
}
