/**
 * STACK PROOF — not the greybox slice yet (that's project/plans/01).
 *
 * Proves the whole pipeline in one scene: Vite serves TypeScript, Three.js
 * renders, Rapier's WASM initializes and steps under a fixed 60Hz timestep
 * decoupled from rendering. A ball drops onto a greybox "cake" and rolls off.
 * Every line here gets replaced as the greybox slice lands.
 */
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

const FIXED_DT = 1 / 60;

async function main(): Promise<void> {
  await RAPIER.init();

  // --- Physics world ---
  const physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  physics.timestep = FIXED_DT;

  // Ground slab and the "cake" (static colliders).
  physics.createCollider(
    RAPIER.ColliderDesc.cuboid(20, 0.1, 20).setTranslation(0, -0.1, 0),
  );
  physics.createCollider(
    RAPIER.ColliderDesc.cuboid(2, 1, 2).setTranslation(0, 1, 0),
  );

  // One dynamic ball, dropped off-center so it glances off the cake edge.
  const ballBody = physics.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(1.6, 9, 1.6),
  );
  physics.createCollider(
    RAPIER.ColliderDesc.ball(0.35).setRestitution(0.65),
    ballBody,
  );

  // --- Three.js scene ---
  const canvas = document.getElementById("app") as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b5e5);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200,
  );
  camera.position.set(10, 6, 12);
  camera.lookAt(0, 1.5, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
  sun.position.set(8, 14, 6);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(40, 0.2, 40),
    new THREE.MeshStandardMaterial({ color: 0x7a9e6b }),
  );
  ground.position.y = -0.1;
  scene.add(ground);

  const cake = new THREE.Mesh(
    new THREE.BoxGeometry(4, 2, 4),
    new THREE.MeshStandardMaterial({ color: 0xd8a45c }),
  );
  cake.position.y = 1;
  scene.add(cake);

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0xc23b4e }),
  );
  scene.add(ball);

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
      physics.step();
      accumulator -= FIXED_DT;
    }
    const p = ballBody.translation();
    ball.position.set(p.x, p.y, p.z);
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
      ballBody,
      ball,
    };
  }
}

main().catch((err: unknown) => {
  console.error("boot failed:", err);
  const hud = document.getElementById("hud");
  if (hud) hud.textContent = `Boot failed: ${String(err)}`;
});
