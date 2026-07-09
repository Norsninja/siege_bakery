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
import { CAKE_Z } from "../core/arena";
import type { CakeTier } from "../core/dessert";

/** The tripod PLACES ITSELF per deal since the ladder went live (plans/13
 * slice 4 — the §9 ledger item paid: cake-6's y-9.5 summit walked out of
 * the old fixed frame). The law: aim at the dessert's WAIST (summit/2),
 * stand at 45° elevation, and step back exactly far enough that the whole
 * cake plus SNAP_MARGIN fits the 45° vertical fov — so every spec fills
 * its photo the same way. On the anchor (cake-3, summit y 5) this lands
 * at (10.25, 12.75) aiming y 2.5 — the old fixed tripod (10, 12 → y 2)
 * within half a meter, the giant's vantage preserved. */
const SNAP_MARGIN = 3.5;
const SNAP_HALF_VFOV = Math.PI / 8; // 45° camera, half-angle
/** 4:3. The frame is ~10% of the screen now (min(27vw, 48vh) — up to
 * ~690px wide on a 2560 display), so the film matches: crisp at that
 * size, still one cheap read per order end. */
const SNAP_W = 720;
const SNAP_H = 540;

export class DessertSnapshot {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly target: THREE.WebGLRenderTarget;
  private readonly film: HTMLCanvasElement;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.camera = new THREE.PerspectiveCamera(45, SNAP_W / SNAP_H, 0.1, 200);
    this.target = new THREE.WebGLRenderTarget(SNAP_W, SNAP_H);
    this.film = document.createElement("canvas");
    this.film.width = SNAP_W;
    this.film.height = SNAP_H;
  }

  /** Place AND aim the tripod for THIS deal (header law): waist aim, 45°
   * elevation, range from the summit so tall specs step back and the
   * cupcake leans in. Called with every dessert rebind — main.ts binds
   * at boot before any shutter click, so the camera never fires unaimed. */
  aimAt(tiers: readonly CakeTier[]): void {
    const summit = tiers[tiers.length - 1]?.top ?? 5;
    const waist = summit / 2;
    const range = (waist + SNAP_MARGIN) / Math.tan(SNAP_HALF_VFOV);
    const leg = range * Math.SQRT1_2; // 45°: equal ground and height legs
    this.camera.position.set(leg, waist + leg, CAKE_Z);
    this.camera.lookAt(new THREE.Vector3(0, waist, CAKE_Z));
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
