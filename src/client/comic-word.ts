/**
 * THE COMIC WORD (plans/15 item 13, ruled 2026-07-09) — the shared
 * onomatopoeia machinery: a canvas-faced sprite that stamps in big,
 * settles, floats up, fades. Born in shots-view (SPLAT!/plop./POP!);
 * extracted for the eat beat (plans/16 slice 7 — CHOMP!) so every
 * word in the world speaks one grammar.
 *
 * Word laws (carried from birth): the word lives in the WORLD, never
 * a screen toast; depth-test OFF — it ignores the cake's silhouette
 * and paints over everything; it ages on the fixed tick (honest under
 * __timeScale). Node has no canvas (the headless test rig): the
 * sprite still exists and lives its full lifecycle there, just
 * faceless — the pins are the lifecycle; the pixels are the eye
 * pass's job (the post-hud precedent).
 */
import * as THREE from "three";

export const WORD_LIFE_TICKS = 66; // ~1.1s of comic stamp
export const WORD_RISE_M = 2.2; // floats up over whatever it marks
const WORD_START_ABOVE_M = 0.6; // born clear of the thing it marks

/** The word's face — a canvas-drawn texture (faceless in Node). */
const wordMaterial = (text: string, colorHex: number): THREE.SpriteMaterial => {
  const mat = new THREE.SpriteMaterial({
    transparent: true,
    depthTest: false, // the word ignores the world's silhouette (header)
    depthWrite: false,
  });
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "900 108px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 16;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(20, 8, 30, 0.9)"; // comic outline, readable on sky and sponge
    ctx.strokeText(text, 256, 84);
    ctx.fillStyle = `#${colorHex.toString(16).padStart(6, "0")}`;
    ctx.fillText(text, 256, 84);
    mat.map = new THREE.CanvasTexture(canvas);
  }
  return mat;
};

/** One onomatopoeia: stamps in big, settles, floats up, fades.
 * THREE.Sprite billboards itself — no per-frame work beyond tick(). */
export class ComicWord {
  /** Peeked by the tests (which word spoke?). */
  readonly text: string;
  private readonly sprite: THREE.Sprite;
  private readonly baseY: number;
  private readonly width: number;
  private age = 0;

  constructor(
    text: string,
    colorHex: number,
    pos: { x: number; y: number; z: number },
    widthM: number,
    private readonly scene: THREE.Scene,
  ) {
    this.text = text;
    this.width = widthM;
    this.baseY = pos.y + WORD_START_ABOVE_M;
    this.sprite = new THREE.Sprite(wordMaterial(text, colorHex));
    this.sprite.position.set(pos.x, this.baseY, pos.z);
    this.sprite.renderOrder = 999; // depth-test off: paint last, over everything
    this.scene.add(this.sprite);
    this.pose();
  }

  /** One fixed tick; true when the word's beat is over. */
  tick(): boolean {
    this.age++;
    if (this.age > WORD_LIFE_TICKS) return true;
    this.pose();
    return false;
  }

  private pose(): void {
    const t = this.age / WORD_LIFE_TICKS;
    // The comic stamp: lands fat, settles over the first ~10 ticks.
    const stamp = 1 + 0.6 * Math.max(0, 1 - this.age / 10);
    const w = this.width * stamp;
    this.sprite.scale.set(w, w * (160 / 512), 1);
    // Ease-out rise — clears the crest early, drifts after.
    this.sprite.position.y = this.baseY + WORD_RISE_M * (1 - (1 - t) * (1 - t));
    // Hold, then fade the last third.
    this.sprite.material.opacity = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
  }

  dispose(): void {
    this.scene.remove(this.sprite);
    this.sprite.material.map?.dispose();
    this.sprite.material.dispose();
  }
}
