/**
 * THE REPORT'S PAINTER (tech-debt pass, 2026-07-09) — the order banner,
 * the run report, and the dessert photo: WHEN they hang and when they
 * come down. Extracted VERBATIM from main.ts's frame loop, where the
 * block had grown five concerns deep inside the fixed tick (the misindented
 * else was the tell). The established split: hud.ts words everything
 * (pure, tested), interactions.bannerLatch decides the show/hide edge
 * (pure, tested), this module owns the DOM elements and the linger clock
 * — like post-hud.ts owns the post panels.
 *
 * The one thing that did NOT move: the carry-home teleport. Baker
 * movement is main's own authority (plans/02), so tick() RETURNS the
 * fresh-deal edge ("dealt") and main moves the away baker home.
 */
import type * as THREE from "three";
import { ORDER_RESET_TICKS } from "../game/tuning";
import { bannerText, runOverText, snapshotCaption } from "./hud";
import { bannerLatch } from "./interactions";
import type { DessertSnapshot } from "./snapshot";
import type { MatchView } from "./state";

export class ReportView {
  private readonly banner = document.getElementById("banner");
  private readonly snapEl = document.getElementById("snapshot");
  private readonly snapImg: HTMLImageElement | null;
  private readonly snapCaption: Element | null;
  private shown = false;
  /** Linger countdown, in ticks — armed when the banner shows. */
  private lingerTicks = 0;

  constructor(
    /** The tripod (client/snapshot.ts) — main still owns it: the dessert
     * rebind re-aims it (fx.bindDessert), this module only clicks the
     * shutter on the banner-show edge. */
    private readonly snapshot: DessertSnapshot,
    private readonly scene: THREE.Scene,
  ) {
    this.snapImg = this.snapEl?.querySelector("img") ?? null;
    this.snapCaption = this.snapEl?.querySelector("figcaption") ?? null;
  }

  /** One fixed tick. `away` = the local baker is out of his town (the
   * banner's carry-home warning reads it). Returns "dealt" on the
   * fresh-deal edge — the banner just came down — so main can run the
   * carry-home law. */
  tick(view: MatchView, away: boolean): "dealt" | null {
    if (!this.banner) return null;
    if (view.run.phase === "runover") {
      // THE RUN REPORT (plans/13): replaces the order banner; the
      // loss's photo stays hung — the filthy floor is the trophy.
      this.shown = true;
      this.banner.style.display = "flex";
      this.banner.textContent = runOverText(
        view.run.rung,
        view.run.won ?? false,
        view.run.ultra ?? false,
        view.run.purse ?? 0,
      );
      return null;
    }
    if (view.run.phase !== "running") {
      // The lobby (or the countdown): everything comes down. No deal
      // edge fired here — the run start deals fresh and the latch
      // below picks that up in the running phase.
      if (this.shown) {
        this.shown = false;
        this.banner.style.display = "none";
        if (this.snapEl) this.snapEl.style.display = "none";
      }
      return null;
    }
    let dealt: "dealt" | null = null;
    const b = bannerLatch(view.order.status, this.shown);
    if (b === "show") {
      this.shown = true;
      // The linger countdown, predicted locally off ORDER_RESET_TICKS
      // (advisory, like predictClock — the deal itself is server
      // truth). A mid-linger JOINER over-reads by however deep the
      // server already is; main's carry-home still fires on time.
      this.lingerTicks = ORDER_RESET_TICKS;
      this.banner.style.display = "flex";
      // THE SHUTTER (dessert report): one photo of the dessert as the
      // Giant judged it, hung in the corner for the linger. Taken on
      // the show edge — linger shots happen AFTER the photo, exactly
      // as they happen after the frozen verdict.
      if (this.snapEl && this.snapImg) {
        this.snapImg.src = this.snapshot.take(this.scene);
        this.snapEl.style.display = "block";
      }
    } else if (b === "hide") {
      // The room dealt a fresh order — clear the slate; the caller
      // hears the edge (the carry-home law rides it).
      this.shown = false;
      this.banner.style.display = "none";
      if (this.snapEl) this.snapEl.style.display = "none"; // the photo comes down
      dealt = "dealt";
    }
    if (this.shown) {
      // Re-worded every tick: the countdown + the away warning live.
      this.lingerTicks = Math.max(0, this.lingerTicks - 1);
      this.banner.textContent = bannerText(
        view.order,
        view.checks,
        view.verdict,
        view.dessert.topTier,
        {
          seconds: Math.ceil(this.lingerTicks / 60),
          away,
          // A lost order ends the run (plans/13): no deal follows this
          // linger — the banner must not promise one.
          runEnds: view.order.status === "lost",
        },
        // The concluded rung prices the banner's pay line (§5
        // amendment) — the climb happens at the redeal, after this
        // banner comes down, so run.rung is still the rung just won.
        view.run.rung,
      );
      // Caption rides the same cadence: the verdict can land a beat
      // after the show edge (its broadcast races the status flip).
      if (this.snapCaption)
        this.snapCaption.textContent = snapshotCaption(view.verdict);
    }
    return dealt;
  }
}
