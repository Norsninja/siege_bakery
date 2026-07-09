/**
 * The run lifecycle — THE CAMPAIGN CONTAINER (plans/13 slice 1, built
 * 2026-07-08). A run is one complete story: the crew readies up, the
 * desserts escalate rung by rung, and a single failed order ends it.
 *
 *   LOBBY --all in the circle--> COUNTDOWN --held to zero--> RUNNING(rung 1)
 *     ^        (stepping out cancels — the honest gate)          |
 *     |                                                    won: rung+1 at
 *     |                                                    the redeal
 *     |                                                    boundary; lost —
 *     |                                                    OR the TOP rung
 *     |                                                    won (MASTER
 *     |                                                    BAKER, §1
 *     |                                                    flourish
 *     |                                                    amendment):
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
import { RUNGS } from "./campaign";
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
  /** 1-based rung being played (running), died on, or — when `won` —
   * conquered (runover); 0 in the lobby — no run is underway. */
  rung = 0;
  /** THE MASTER BAKER FLAG (§1 flourish amendment): the runover is a
   * TRIUMPH — the crew won the top rung; the report crowns instead of
   * mourning. False on every lost run and outside runover. */
  won = false;
  /** THE ULTRA FLAG (§1 finish-it amendment, 2026-07-09): the top-rung
   * triumph landed WITH the flourish — ULTRA MASTER BAKER OF THE REALMS.
   * Skeleton like `won` (title-line upgrade only; ceremony rides the
   * MASTER BAKER content pass). Impossible on today's machine — cake-6's
   * summit takes zero shipped combos — until the economy sells the key. */
  ultra = false;
  /** THE SHARED PURSE (plans/13 §5 as amended 2026-07-09): one bakery,
   * one wallet — run-scoped state, so it lives where the run does.
   * Earned at each passed order (the rung's pay column + the flourish
   * bonus — the Room does that arithmetic and calls earn); spent at the
   * stall. It ZEROES AT THE NEXT RUN'S START, not at run over: the
   * report and the lobby display the finished run's balance — a run is
   * a complete story, told to the end. */
  purse = 0;
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
      this.purse = 0; // inventory dies with the run (§5 amendment) —
      // the Room re-locks town 2 at this same boundary (startRun)
      return "start";
    }
    return null;
  }

  /** Coins into the shared purse — the Room calls this with the passed
   * order's award (pay column + flourish bonus) at the conclusion tick. */
  earn(coins: number): void {
    this.purse += coins;
  }

  /** An authoritative debit: true = paid, false = the honest refusal
   * ("not enough coins"). The Room applies the purchase only on true. */
  spend(cost: number): boolean {
    if (this.purse < cost) return false;
    this.purse -= cost;
    return true;
  }

  /** The Room reports how the order concluded, AT THE REDEAL BOUNDARY
   * (the linger/separator's end — the verdict banner already had its
   * ORDER_RESET_TICKS). Won below the top: the ladder climbs, the Room
   * deals the next rung. Won AT the top (RUNGS.length): MASTER BAKER —
   * the run ends in triumph (§1 flourish amendment: rung 7 is winnable
   * by workload, and a silent replay would be the worst payoff for
   * beating the near-impossible). Lost: the run is over — the Room
   * deals NOTHING; the sad cake stays on display under the report.
   * `flourish` = the concluded order's verdict wore the coda (the Room
   * reads its frozen verdict) — only the top-rung triumph consumes it:
   * MASTER BAKER upgrades to ULTRA (§1 finish-it amendment). */
  orderConcluded(
    won: boolean,
    flourish = false,
  ): "nextRung" | "runOver" | "runWon" {
    if (won && this.rung < RUNGS.length) {
      this.rung++;
      return "nextRung";
    }
    this.phase = "runover";
    this.won = won;
    this.ultra = won && flourish;
    this.runoverLeft = RUNOVER_TICKS;
    return won ? "runWon" : "runOver";
  }

  /** One runover tick; returns "lobby" when the report is done. */
  tickRunover(): RunEvent | null {
    if (this.phase !== "runover") return null;
    this.runoverLeft--;
    if (this.runoverLeft > 0) return null;
    this.phase = "lobby";
    this.rung = 0;
    this.won = false; // the triumph is the RUN's story; the lobby starts clean
    this.ultra = false;
    return "lobby";
  }
}
