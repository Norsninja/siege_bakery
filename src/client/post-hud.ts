/**
 * THE POST PANELS' PAINTER (plans/15 item 5 — the UI pass, 2026-07-09).
 * hud.postPanel says WHAT (pure, tested); this module owns the DOM and
 * WHERE — the winch panel DEAD CENTER and big (the tensioner's only job
 * is the number), the gunner cluster BOTTOM-LEFT (the aim line, the arc,
 * and the cake own the center — ruled by the visionary). Styling lives
 * in index.html beside the other overlays.
 *
 * Render discipline: the panel REBUILDS only when a structural value
 * changes (clicks, notch, bucket, last-fired) — the rebuild is what
 * retriggers the .pp-pop CSS animation, the Vegas clunk on every real
 * change. The continuous values (crank fill, traverse degrees) update
 * IN PLACE every frame so they can't spam the pop.
 *
 * Overlay laws inherited: pointer-events none (the pointer-lock click
 * must fall through — audit 2026-07-09) and the bottom-left cluster
 * stays clear of the snapshot column (top-right) by geometry.
 */
import { TILT_DEG_PER_NOTCH } from "../game/catapult";
import type { GunnerPanel, KeyHint, PostPanel, WinchPanel } from "./hud";
import { TOPPING_COLORS } from "./scene";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const capsHtml = (hints: KeyHint[]): string =>
  hints
    .map(
      (h) =>
        `<span class="pp-hint">${h.caps
          .map((c) => `<kbd class="cap">${esc(c)}</kbd>`)
          .join("")}<span class="pp-hint-label">${esc(h.label)}</span></span>`,
    )
    .join("");

/** The bucket chip — unmissable by ruling: what F will throw, or the
 * warning that it will throw NOTHING. */
const bucketHtml = (loaded: string | null): string =>
  loaded === null
    ? `<div class="pp-bucket empty">BUCKET EMPTY</div>`
    : `<div class="pp-bucket loaded" style="--tc:#${(
        TOPPING_COLORS[loaded] ?? 0xffffff
      )
        .toString(16)
        .padStart(6, "0")}">${esc(loaded.toUpperCase())} LOADED</div>`;

const winchHtml = (p: WinchPanel): string => {
  const segs = Array.from({ length: p.max }, (_, i) => {
    const cls = i < p.clicks ? "seg on" : "seg";
    // The boundary segment carries the live winding fill (in-place).
    const fill = i === p.clicks ? `<i class="seg-fill"></i>` : "";
    return `<span class="${cls}">${fill}</span>`;
  }).join("");
  return (
    `<div class="pp-title">${esc(p.title)}</div>` +
    `<div class="pp-big pp-pop"><span class="pp-num">${p.clicks}</span><span class="pp-max">/${p.max}</span></div>` +
    `<div class="pp-ladder">${segs}</div>` +
    `<div class="pp-keys">${capsHtml(p.keys)}</div>` +
    (p.lastFired !== null
      ? `<div class="pp-last">last shot flew at <b>${p.lastFired}</b></div>`
      : "")
  );
};

const fmtDeg = (d: number): string =>
  `${d > 0 ? "+" : ""}${d.toFixed(1)}°`;

const gunnerHtml = (p: GunnerPanel): string =>
  `<div class="pp-title">${esc(p.title)}</div>` +
  bucketHtml(p.loaded) +
  `<div class="pp-row"><span class="pp-stat"><span class="pp-stat-label">traverse</span><span class="pp-mid pp-trav">${fmtDeg(p.traverseDeg)}</span></span>` +
  `<span class="pp-stat"><span class="pp-stat-label">arc</span><span class="pp-mid pp-pop">+${p.tiltDeg}°<span class="pp-max"> (${p.tiltNotch}/${p.maxNotch})</span></span></span></div>` +
  `<div class="pp-arcglyph">${esc(p.ladder)}</div>` +
  `<div class="pp-keys">${capsHtml(p.keys)}</div>` +
  (p.last !== null
    ? `<div class="pp-last">last shot: <b>${fmtDeg(p.last.traverseDeg)}</b> · arc <b>+${p.last.tiltNotch * TILT_DEG_PER_NOTCH}°</b> · tension <b>${p.last.tensionClicks}</b></div>`
    : "");

/** Owns #post-hud. Call update() every rendered frame. */
export class PostHud {
  private readonly el: HTMLElement | null;
  private key = "";

  constructor() {
    this.el = document.getElementById("post-hud");
  }

  update(panel: PostPanel | null): void {
    if (!this.el) return;
    if (panel === null) {
      if (this.key !== "") {
        this.key = "";
        this.el.className = "";
        this.el.innerHTML = "";
      }
      return;
    }
    // The structural key: a change rebuilds (and pops); the continuous
    // values are deliberately left out and patched below.
    const key =
      panel.post === "winch"
        ? `w|${panel.clicks}|${panel.lastFired}`
        : `g|${panel.tiltNotch}|${panel.loaded}|${JSON.stringify(panel.last)}`;
    if (key !== this.key) {
      this.key = key;
      this.el.className = panel.post;
      this.el.innerHTML =
        panel.post === "winch" ? winchHtml(panel) : gunnerHtml(panel);
    }
    // In-place continuous updates — no rebuild, no pop.
    if (panel.post === "winch") {
      const fill = this.el.querySelector<HTMLElement>(".seg-fill");
      if (fill) fill.style.width = `${Math.min(100, Math.abs(panel.fillPct))}%`;
    } else {
      const trav = this.el.querySelector<HTMLElement>(".pp-trav");
      if (trav) trav.textContent = fmtDeg(panel.traverseDeg);
    }
  }
}
