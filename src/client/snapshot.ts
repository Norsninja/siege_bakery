/**
 * The dessert report, snapshot form (visionary, 2026-07-07 — plans/09 §1's
 * promoted retention hook, reshaped from "slow orbit" to "photograph"):
 * when the order ends, an in-world tripod camera takes ONE photo of the
 * dessert and it hangs framed in the corner for the whole linger.
 *
 * The vantage is the GIANT'S: high and looking down, so the top and the
 * sides of the cake both show — all patrons are giant, and the photo is
 * the cake as HE saw it when he judged. One tripod for the whole bakery,
 * azimuth-neutral on +x (favoring neither town's side of the cake).
 *
 * An INSET, never a cut (visionary): the player keeps full control — the
 * linger is also the town-switch window and the photo must not steal it.
 * Client-only presentation driven by the banner-show edge; zero wire
 * changes; every replica photographs the same shared cake (ghosts in
 * frame may differ by interpolation — bakers in the photo are a feature).
 */
import * as THREE from "three";
import { CAKE_TIERS, CAKE_Z } from "../core/arena";

/** The tripod: ~15m out and 12m up, aimed at the cake's waist. Pitch
 * ≈ −40° — steep enough that the summit tier reads as a top-down disc,
 * shallow enough that the tier walls (half the census) stay in frame. */
const SNAP_POS = new THREE.Vector3(10, 12, CAKE_Z);
const SNAP_TARGET = new THREE.Vector3(0, CAKE_TIERS[0]!.top, CAKE_Z);
/** 4:3, small — it develops into a ~260px corner photo. */
const SNAP_W = 480;
const SNAP_H = 360;

export class DessertSnapshot {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly target: THREE.WebGLRenderTarget;
  private readonly film: HTMLCanvasElement;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.camera = new THREE.PerspectiveCamera(45, SNAP_W / SNAP_H, 0.1, 200);
    this.camera.position.copy(SNAP_POS);
    this.camera.lookAt(SNAP_TARGET);
    this.target = new THREE.WebGLRenderTarget(SNAP_W, SNAP_H);
    this.film = document.createElement("canvas");
    this.film.width = SNAP_W;
    this.film.height = SNAP_H;
  }

  /** One shutter click: render the scene from the tripod, develop to a
   * data URL. readRenderTargetPixels hands rows bottom-up; the row flip
   * onto the 2D canvas is the development bath. */
  take(scene: THREE.Scene): string {
    const r = this.renderer;
    const prev = r.getRenderTarget();
    r.setRenderTarget(this.target);
    r.render(scene, this.camera);
    const pixels = new Uint8Array(SNAP_W * SNAP_H * 4);
    r.readRenderTargetPixels(this.target, 0, 0, SNAP_W, SNAP_H, pixels);
    r.setRenderTarget(prev);
    const ctx = this.film.getContext("2d")!;
    const img = ctx.createImageData(SNAP_W, SNAP_H);
    for (let y = 0; y < SNAP_H; y++)
      img.data.set(
        pixels.subarray((SNAP_H - 1 - y) * SNAP_W * 4, (SNAP_H - y) * SNAP_W * 4),
        y * SNAP_W * 4,
      );
    ctx.putImageData(img, 0, 0);
    return this.film.toDataURL("image/png");
  }
}
