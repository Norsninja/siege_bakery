/**
 * GREYBOX SLICE — Step 1: the first-person baker (plans/01).
 *
 * The client's job under the layering law: sample input (keys + pointer-lock
 * mouse), hand a plain BakerInput to core each fixed tick, and render what
 * core computed. Movement itself lives in core/baker.ts — the future server
 * runs that exact code.
 *
 * Arena greybox: pantry shelf at +Z, catapult plinth at -Z, 24m apart (the
 * tuned crossing), low walls around, the cake looming downrange beyond the
 * catapult. All placeholder boxes.
 */
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT, GRAVITY } from "../core/constants";
import {
  Baker,
  EYE_HEIGHT_OFFSET,
  ARENA_CROSSING_M,
  type BakerInput,
} from "../core/baker";

// Arena layout, all in meters. Pantry and plinth sit ARENA_CROSSING_M apart.
const CROSS_HALF = ARENA_CROSSING_M / 2; // 12
const ARENA_HALF_LENGTH = CROSS_HALF + 1; // walls just beyond the endpoints
const ARENA_HALF_WIDTH = 8;
const WALL_HEIGHT = 1;

const MOUSE_SENSITIVITY = 0.0022;
const MAX_PITCH = (85 * Math.PI) / 180;

async function main(): Promise<void> {
  await RAPIER.init();

  // --- Physics world ---
  const physics = new RAPIER.World(GRAVITY);
  physics.timestep = FIXED_DT;

  physics.createCollider(
    RAPIER.ColliderDesc.cuboid(40, 0.1, 40).setTranslation(0, -0.1, 0),
  );
  // Arena walls: two long sides, two ends.
  const walls: Array<{ hx: number; hy: number; hz: number; x: number; z: number }> = [
    { hx: 0.25, hy: WALL_HEIGHT / 2, hz: ARENA_HALF_LENGTH, x: -ARENA_HALF_WIDTH, z: 0 },
    { hx: 0.25, hy: WALL_HEIGHT / 2, hz: ARENA_HALF_LENGTH, x: ARENA_HALF_WIDTH, z: 0 },
    { hx: ARENA_HALF_WIDTH, hy: WALL_HEIGHT / 2, hz: 0.25, x: 0, z: -ARENA_HALF_LENGTH },
    { hx: ARENA_HALF_WIDTH, hy: WALL_HEIGHT / 2, hz: 0.25, x: 0, z: ARENA_HALF_LENGTH },
  ];
  for (const w of walls) {
    physics.createCollider(
      RAPIER.ColliderDesc.cuboid(w.hx, w.hy, w.hz).setTranslation(
        w.x,
        WALL_HEIGHT / 2,
        w.z,
      ),
    );
  }
  // Pantry shelf (+Z end) and catapult plinth (-Z end), 24m apart.
  physics.createCollider(
    RAPIER.ColliderDesc.cuboid(2, 0.75, 0.5).setTranslation(0, 0.75, CROSS_HALF),
  );
  physics.createCollider(
    RAPIER.ColliderDesc.cuboid(1, 0.5, 1).setTranslation(0, 0.5, -CROSS_HALF),
  );

  const baker = new Baker(physics, { x: 0, y: 1.2, z: CROSS_HALF - 2 });

  // --- Three.js scene ---
  const canvas = document.getElementById("app") as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b5e5);
  scene.fog = new THREE.Fog(0x87b5e5, 60, 120);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    200,
  );
  camera.rotation.order = "YXZ"; // yaw, then pitch — the FPS rig

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
  sun.position.set(8, 14, 6);
  scene.add(sun);

  const box = (
    w: number,
    h: number,
    d: number,
    color: number,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color }),
    );
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };

  box(80, 0.2, 80, 0x7a9e6b, 0, -0.1, 0); // ground
  for (const w of walls)
    box(w.hx * 2, WALL_HEIGHT, w.hz * 2, 0x9a9a9a, w.x, WALL_HEIGHT / 2, w.z);
  box(4, 1.5, 1, 0xb98a4a, 0, 0.75, CROSS_HALF); // pantry shelf
  box(2, 1, 2, 0x5a5a66, 0, 0.5, -CROSS_HALF); // catapult plinth
  box(8, 3, 8, 0xd8a45c, 0, 1.5, -CROSS_HALF - 18); // the cake, downrange

  // Distance-marker stripes every 6m so the crossing reads on foot.
  for (let z = -CROSS_HALF; z <= CROSS_HALF; z += 6)
    box(3, 0.02, 0.15, 0xdddddd, 0, 0.01, z);

  // --- Input: pointer-lock mouse look + WASD/Shift ---
  let yaw = 0; // 0 faces -Z: spawn looks at the catapult and cake
  let pitch = 0;
  const keys = new Set<string>();
  // DEV escape hatch: preview_eval can drive the baker without pointer lock.
  let debugInput: BakerInput | null = null;

  canvas.addEventListener("click", () => {
    if (document.pointerLockElement !== canvas) void canvas.requestPointerLock();
  });
  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement !== canvas) return;
    yaw -= e.movementX * MOUSE_SENSITIVITY;
    pitch = Math.max(
      -MAX_PITCH,
      Math.min(MAX_PITCH, pitch - e.movementY * MOUSE_SENSITIVITY),
    );
  });
  window.addEventListener("keydown", (e) => keys.add(e.code));
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());

  const hud = document.getElementById("hud");
  const sampleInput = (): BakerInput =>
    debugInput ?? {
      forward:
        (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0),
      strafe: (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
      sprint: keys.has("ShiftLeft") || keys.has("ShiftRight"),
      yaw,
    };

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- Fixed-timestep loop, rendering decoupled ---
  let last = performance.now();
  let accumulator = 0;
  function frame(now: number): void {
    // Cap the accumulator so a backgrounded tab doesn't spiral on return.
    accumulator = Math.min(accumulator + (now - last) / 1000, 0.25);
    last = now;
    while (accumulator >= FIXED_DT) {
      baker.step(sampleInput());
      physics.step();
      accumulator -= FIXED_DT;
    }

    const p = baker.position();
    camera.position.set(p.x, p.y + EYE_HEIGHT_OFFSET, p.z);
    camera.rotation.set(pitch, yaw, 0);

    if (hud) {
      const locked = document.pointerLockElement === canvas;
      hud.textContent = locked
        ? "WASD move · Shift sprint · Esc to release mouse"
        : "Click to grab the mouse · WASD move · Shift sprint";
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // DEV-only headless-verification handle, same culture as the 2D prototype.
  if (import.meta.env.DEV) {
    (window as unknown as { __game: unknown }).__game = {
      physics,
      scene,
      camera,
      baker,
      setDebugInput: (i: BakerInput | null) => {
        debugInput = i;
      },
      getLook: () => ({ yaw, pitch }),
    };
  }
}

main().catch((err: unknown) => {
  console.error("boot failed:", err);
  const hud = document.getElementById("hud");
  if (hud) hud.textContent = `Boot failed: ${String(err)}`;
});
