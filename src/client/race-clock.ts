/**
 * THE RACE CLOCK (plans/15 item 29 — promoted from aesthetics to
 * load-bearing, twenty-eighth session). The loop turns you AWAY from the
 * cake: you fire and you're already sprinting for ammo, so the world-space
 * pops (item 31) only land if you stop and look. The clock is where the eye
 * lives during the run — so it becomes the persistent feedback surface.
 *
 * Top-center and BIG, racing-game. Two live signals ride it:
 *   - THE GREEN GAIN: the clock IS the time left, and earned time (the ONE
 *     force on the reliable clock — plans/22 step 6; patience stopped
 *     draining it) makes it JUMP UP. So a green pulse + a "+Ns" floating off
 *     the clock is not a fake pop — it is the AUTHORITATIVE number visibly
 *     rewarding you, and it catches all three earn axes (paint, garnish,
 *     topper) at once. GREEN-ONLY by ruling: nothing subtracts time as a
 *     penalty, so there is no red event to show.
 *   - THE GOLD DRIP: the shared purse beside the clock, flashing gold each
 *     time a coin drips (room.ts's live coin, item 31's silent twin made
 *     loud). The purse only ever rises within a run (never clawed back).
 *
 * post-hud.ts is the precedent (a dedicated overlay owning its DOM, painted
 * each frame; styling in index.html). The gain DETECTION is extracted pure
 * (`clockGainSecs`) and tested; the DOM flashing is browser-verified, like
 * every overlay here.
 *
 * SEED-ON-SHOW (the false-flash guard): the clock is visible only on a live
 * order. When it first appears — a fresh deal's FULL clock, the run-start
 * empty purse — those are not "gains", so the first visible frame seeds the
 * baselines and flashes nothing. Between rungs the linger hides it (order
 * status leaves "running"), so a rung climb re-seeds on its new deal.
 */
import { FIXED_DT } from "../core/constants";

/** The clock's visible RISE, in whole seconds — earned time made the
 * one-force clock jump. The ≥1s floor filters the sub-second jitter between
 * the client's per-frame prediction (predictClock: −1 tick/frame) and the
 * 1Hz authoritative correction; a real earn is ≥ EARNED_TIME_PER_SAMPLE_S
 * (2s), well clear of it. A normal countdown (curr < prev) returns 0. Pure
 * — the honest half of the flash, unit-pinned. */
export function clockGainSecs(prevTicks: number, curTicks: number): number {
  const gain = Math.round((curTicks - prevTicks) * FIXED_DT);
  return gain >= 1 ? gain : 0;
}

export interface RaceClockView {
  /** A live order is ticking (orderLive = the Room's two gates). Off = the
   * clock hides and its baselines re-seed on the next show. */
  visible: boolean;
  /** The authoritative (predicted) clock, ticks — view.order.ticksLeft. */
  ticksLeft: number;
  /** The shared purse, coins — view.run.purse ?? 0. */
  purse: number;
}

/** Re-fire a CSS animation by clearing the class, forcing a reflow, and
 * re-adding it — the .pp-pop retrigger trick (post-hud.ts), the only way to
 * replay an animation on an element that never left the DOM. */
function retrigger(el: HTMLElement, cls: string): void {
  el.classList.remove(cls);
  void el.offsetWidth; // reflow, so the re-add is seen as a fresh start
  el.classList.add(cls);
}

/** Owns #race-clock. Call update() every rendered frame. */
export class RaceClock {
  private readonly el: HTMLElement | null;
  private readonly timeEl: HTMLElement | null;
  private readonly gainEl: HTMLElement | null;
  private readonly purseNEl: HTMLElement | null;
  private readonly purseGainEl: HTMLElement | null;
  private prevTicks = 0;
  private prevPurse = 0;
  private shown = false;

  constructor() {
    this.el = document.getElementById("race-clock");
    this.timeEl = this.el?.querySelector(".rc-time") ?? null;
    this.gainEl = this.el?.querySelector(".rc-gain") ?? null;
    this.purseNEl = this.el?.querySelector(".rc-purse-n") ?? null;
    this.purseGainEl = this.el?.querySelector(".rc-purse-gain") ?? null;
  }

  update(v: RaceClockView): void {
    if (!this.el) return;
    if (!v.visible) {
      if (this.shown) {
        this.el.style.display = "none";
        this.shown = false;
      }
      return;
    }
    if (!this.shown) {
      // Just became visible — seed the baselines so the fresh deal's full
      // clock and the empty purse don't read as a gain (no flash this frame:
      // prevTicks == ticksLeft below makes the gain exactly 0).
      this.el.style.display = "flex"; // the stylesheet default is none
      this.prevTicks = v.ticksLeft;
      this.prevPurse = v.purse;
      this.shown = true;
    }

    const secs = Math.ceil(v.ticksLeft * FIXED_DT);
    if (this.timeEl)
      this.timeEl.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

    // THE GREEN GAIN — the clock's own visible rise (earned time, the one
    // force). Pulse the clock and float the "+Ns" off it.
    const gainSecs = clockGainSecs(this.prevTicks, v.ticksLeft);
    if (gainSecs > 0) {
      if (this.gainEl) {
        this.gainEl.textContent = `+${gainSecs}s`;
        retrigger(this.gainEl, "show");
      }
      if (this.timeEl) retrigger(this.timeEl, "gaining");
    }
    this.prevTicks = v.ticksLeft;

    // THE GOLD DRIP — the purse rose (a coin dripped, or the pay landed).
    const coinGain = v.purse - this.prevPurse;
    if (coinGain > 0 && this.purseGainEl) {
      this.purseGainEl.textContent = `+${coinGain}`;
      retrigger(this.purseGainEl, "show");
    }
    this.prevPurse = v.purse;
    if (this.purseNEl) this.purseNEl.textContent = String(v.purse);
  }
}
