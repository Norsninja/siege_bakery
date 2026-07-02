/**
 * GREYBOX SLICE — Steps 1–3: baker + machine interactables + the lob.
 *
 * The client's job under the layering law: sample input, forward plain
 * intents (BakerInput to core, MachineIntent to game) each fixed tick, and
 * render what comes back. Movement lives in core/baker.ts, machine law in
 * game/catapult.ts, launch math in core/ballistics.ts, impact detection in
 * core/projectiles.ts — all of it runs headless; none of it knows we exist.
 *
 * Arena greybox: pantry shelf at +Z, catapult plinth at -Z, 24m apart (the
 * tuned crossing), low walls around, the cake looming downrange. The machine
 * is three interactables (look + E): traverse wheel (+A/D), tension winch
 * (hold to crank), release lever. The bucket is a fourth, TEMPORARY one —
 * E loads a cherry until Step 4 brings the shelf-and-carry loop.
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
import {
  launchOrigin,
  launchVelocity,
  SPLAT_SPEED,
} from "../core/ballistics";
import { ProjectileManager, PROJECTILE_RADIUS } from "../core/projectiles";
import {
  createCatapult,
  tickMachine,
  IDLE_INTENT,
  TENSION_MAX_CLICKS,
  CRANK_TICKS_PER_CLICK,
  type CatapultState,
  type MachineIntent,
} from "../game/catapult";

// Arena layout, all in meters. Pantry and plinth sit ARENA_CROSSING_M apart.
const CROSS_HALF = ARENA_CROSSING_M / 2; // 12
const ARENA_HALF_LENGTH = CROSS_HALF + 1; // walls just beyond the endpoints
const ARENA_HALF_WIDTH = 8;
const WALL_HEIGHT = 1;
const CAKE_POS = { x: 0, y: 1.5, z: -CROSS_HALF - 18 };
/** The machine's floor point: top of the plinth. */
const MACHINE_BASE = { x: 0, y: 1, z: -CROSS_HALF };

const MOUSE_SENSITIVITY = 0.0022;
const MAX_PITCH = (85 * Math.PI) / 180;
const REACH_M = 2.8; // how far the baker can reach an interactable

type InteractableKind = "wheel" | "winch" | "lever" | "bucket";
const PROMPTS: Record<InteractableKind, string> = {
  wheel: "hold E + A/D — traverse wheel",
  winch: "hold E — crank the winch",
  lever: "E — pull the release lever!",
  bucket: "E — load a cherry (temp until the Step 4 shelf)",
};

async function main(): Promise<void> {
  await RAPIER.init();

  // --- Physics world ---
  const physics = new RAPIER.World(GRAVITY);
  physics.timestep = FIXED_DT;

  physics.createCollider(
    RAPIER.ColliderDesc.cuboid(40, 0.1, 40).setTranslation(0, -0.1, 0),
  );
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
  // Pantry shelf (+Z end), catapult plinth (-Z end), the cake downrange.
  physics.createCollider(
    RAPIER.ColliderDesc.cuboid(2, 0.75, 0.5).setTranslation(0, 0.75, CROSS_HALF),
  );
  physics.createCollider(
    RAPIER.ColliderDesc.cuboid(1, 0.5, 1).setTranslation(0, 0.5, -CROSS_HALF),
  );
  physics.createCollider(
    RAPIER.ColliderDesc.cuboid(4, 1.5, 4).setTranslation(
      CAKE_POS.x,
      CAKE_POS.y,
      CAKE_POS.z,
    ),
  );

  const baker = new Baker(physics, { x: 0, y: 1.2, z: CROSS_HALF - 2 });
  const shots = new ProjectileManager();

  // --- Machine state (game/) ---
  let machineState: CatapultState = createCatapult();
  let crankTicks = 0;
  let totalCrankSpins = 0; // visual-only: winch drum angle

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
    parent: THREE.Object3D = scene,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color }),
    );
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  box(80, 0.2, 80, 0x7a9e6b, 0, -0.1, 0); // ground
  for (const w of walls)
    box(w.hx * 2, WALL_HEIGHT, w.hz * 2, 0x9a9a9a, w.x, WALL_HEIGHT / 2, w.z);
  box(4, 1.5, 1, 0xb98a4a, 0, 0.75, CROSS_HALF); // pantry shelf
  box(2, 1, 2, 0x5a5a66, 0, 0.5, -CROSS_HALF); // catapult plinth
  box(8, 3, 8, 0xd8a45c, CAKE_POS.x, CAKE_POS.y, CAKE_POS.z); // the cake

  // Distance-marker stripes every 6m so the crossing reads on foot.
  for (let z = -CROSS_HALF; z <= CROSS_HALF; z += 6)
    box(3, 0.02, 0.15, 0xdddddd, 0, 0.01, z);

  // --- The machine greybox, on the plinth. Group yaw = traverseDeg. ---
  const machine = new THREE.Group();
  machine.position.set(MACHINE_BASE.x, MACHINE_BASE.y, MACHINE_BASE.z);
  scene.add(machine);

  box(1.4, 0.25, 1.4, 0x6e5233, 0, 0.125, 0, machine); // carriage

  const armPivot = new THREE.Group();
  armPivot.position.set(0, 0.3, 0.45);
  machine.add(armPivot);
  box(0.12, 1.5, 0.12, 0x8a6b45, 0, 0.75, 0, armPivot); // throwing arm
  const bucketMesh = box(0.34, 0.16, 0.34, 0x4a4a55, 0, 1.5, 0, armPivot);
  const toppingMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xc23b4e }),
  );
  toppingMesh.position.set(0, 1.66, 0);
  armPivot.add(toppingMesh);

  const wheelMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.08, 20),
    new THREE.MeshStandardMaterial({ color: 0x8a6b3d }),
  );
  wheelMesh.rotation.z = Math.PI / 2; // axis along X: a wheel on the side
  wheelMesh.position.set(-0.8, 0.45, 0);
  machine.add(wheelMesh);

  const winchGroup = new THREE.Group();
  winchGroup.position.set(0.8, 0.45, 0.15);
  machine.add(winchGroup);
  const drumMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.4, 12),
    new THREE.MeshStandardMaterial({ color: 0x50505c }),
  );
  drumMesh.rotation.z = Math.PI / 2;
  winchGroup.add(drumMesh);
  const winchHandle = box(0.05, 0.3, 0.05, 0x8a6b3d, 0.24, 0.15, 0, winchGroup);

  const leverGroup = new THREE.Group();
  leverGroup.position.set(0.55, 0.15, -0.75);
  machine.add(leverGroup);
  const leverStick = box(0.06, 0.55, 0.06, 0x777788, 0, 0.28, 0, leverGroup);
  const leverKnob = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xc23b4e }),
  );
  leverKnob.position.set(0, 0.58, 0);
  leverGroup.add(leverKnob);

  const interactables: Record<InteractableKind, THREE.Mesh[]> = {
    wheel: [wheelMesh],
    winch: [drumMesh, winchHandle],
    lever: [leverStick, leverKnob],
    bucket: [bucketMesh, toppingMesh],
  };
  const raycastTargets: THREE.Mesh[] = Object.values(interactables).flat();
  const kindOf = new Map<THREE.Object3D, InteractableKind>();
  for (const [kind, meshes] of Object.entries(interactables) as Array<
    [InteractableKind, THREE.Mesh[]]
  >)
    for (const m of meshes) kindOf.set(m, kind);

  const setHighlight = (kind: InteractableKind | null): void => {
    for (const meshes of Object.values(interactables))
      for (const m of meshes)
        (m.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
    if (kind)
      for (const m of interactables[kind])
        (m.material as THREE.MeshStandardMaterial).emissive.setHex(0x443300);
  };

  // Projectiles in flight / at rest, and landing markers.
  const shotMeshes: Array<{ body: RAPIER.RigidBody; mesh: THREE.Mesh }> = [];
  const addLandingMarker = (x: number, y: number, z: number, splat: boolean): void => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.25, splat ? 0.55 : 0.4, 24),
      new THREE.MeshBasicMaterial({
        color: splat ? 0xd8452e : 0x3fae5a,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, Math.max(0.02, y - PROJECTILE_RADIUS + 0.03), z);
    scene.add(ring);
  };

  // --- Input: pointer-lock mouse look + WASD/Shift + E ---
  let yaw = 0; // 0 faces -Z: spawn looks at the catapult and cake
  let pitch = 0;
  const keys = new Set<string>();
  let ePressed = false; // edge, consumed by the next sim tick
  // DEV escape hatches: preview_eval can drive baker and machine headlessly.
  let debugInput: BakerInput | null = null;
  let debugIntent: MachineIntent | null = null;

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
  window.addEventListener("keydown", (e) => {
    keys.add(e.code);
    if (e.code === "KeyE" && !e.repeat) ePressed = true;
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- Interactable targeting: raycast from the crosshair, once per frame ---
  const raycaster = new THREE.Raycaster();
  raycaster.far = REACH_M;
  let target: InteractableKind | null = null;
  const updateTarget = (): void => {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hit = raycaster.intersectObjects(raycastTargets, false)[0];
    const next = hit ? (kindOf.get(hit.object) ?? null) : null;
    if (next !== target) {
      target = next;
      setHighlight(target);
    }
  };

  const hud = document.getElementById("hud");
  let flashMsg = "";
  let flashUntil = 0;

  // --- Fixed-timestep loop, rendering decoupled ---
  let last = performance.now();
  let accumulator = 0;
  function frame(now: number): void {
    // Cap the accumulator so a backgrounded tab doesn't spiral on return.
    accumulator = Math.min(accumulator + (now - last) / 1000, 0.25);
    last = now;

    updateTarget();

    while (accumulator >= FIXED_DT) {
      const eHeld = keys.has("KeyE");
      const eEdge = ePressed;
      ePressed = false;

      // Machine intent from what the crosshair engages.
      const intent: MachineIntent = debugIntent ?? {
        turn:
          target === "wheel" && eHeld
            ? keys.has("KeyA") && !keys.has("KeyD")
              ? 1
              : keys.has("KeyD") && !keys.has("KeyA")
                ? -1
                : 0
            : 0,
        crank: target === "winch" && eHeld,
        pullLever: target === "lever" && eEdge,
        load: target === "bucket" && eEdge ? "cherry" : null,
      };
      const engaged =
        eHeld && (target === "wheel" || target === "winch") && !debugIntent;

      const r = tickMachine(machineState, crankTicks, intent);
      if (intent.crank && r.crankTicks !== crankTicks) totalCrankSpins += 1;
      machineState = r.state;
      crankTicks = r.crankTicks;
      if (r.shot) {
        const body = shots.spawn(
          physics,
          launchOrigin(MACHINE_BASE, r.shot.traverseDeg),
          launchVelocity(r.shot.traverseDeg, r.shot.tensionClicks),
          r.shot.topping,
        );
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(PROJECTILE_RADIUS, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0xc23b4e }),
        );
        scene.add(mesh);
        shotMeshes.push({ body, mesh });
        flashMsg = `LOOSED! ${r.shot.topping} · ${r.shot.tensionClicks} clicks · ${r.shot.traverseDeg.toFixed(0)}°`;
        flashUntil = now + 2500;
      } else if (intent.pullLever) {
        flashMsg = "dry release — the crank was for nothing";
        flashUntil = now + 2500;
      }

      // Hands on the machine = feet planted. Otherwise, normal movement.
      const move: BakerInput = debugInput ?? {
        forward: engaged
          ? 0
          : (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0),
        strafe: engaged
          ? 0
          : (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
        sprint: !engaged && (keys.has("ShiftLeft") || keys.has("ShiftRight")),
        yaw,
      };
      baker.step(move);

      const impacts = shots.step(physics); // steps the whole world
      for (const im of impacts) {
        const splat = im.speed >= SPLAT_SPEED;
        addLandingMarker(im.pos.x, im.pos.y, im.pos.z, splat);
        flashMsg = `${splat ? "SPLAT!" : "placed."} ${im.topping} landed at ${im.speed.toFixed(1)} m/s`;
        flashUntil = now + 4000;
      }
      accumulator -= FIXED_DT;
    }

    // --- Render state ---
    const p = baker.position();
    camera.position.set(p.x, p.y + EYE_HEIGHT_OFFSET, p.z);
    camera.rotation.set(pitch, yaw, 0);

    machine.rotation.y = (machineState.traverseDeg * Math.PI) / 180;
    const tensionFrac =
      (machineState.tensionClicks + crankTicks / CRANK_TICKS_PER_CLICK) /
      TENSION_MAX_CLICKS;
    armPivot.rotation.x = 0.5 + tensionFrac * 0.7; // arm winches down and back
    drumMesh.rotation.x = totalCrankSpins * 0.05;
    toppingMesh.visible = machineState.loaded !== null;

    for (const s of shotMeshes) {
      const t = s.body.translation();
      s.mesh.position.set(t.x, t.y, t.z);
    }

    if (hud) {
      const locked = document.pointerLockElement === canvas;
      const crankPct = Math.round((crankTicks / CRANK_TICKS_PER_CLICK) * 100);
      const lines = [
        locked
          ? "WASD move · Shift sprint · E interact · Esc frees the mouse"
          : "Click to grab the mouse · WASD move · Shift sprint · E interact",
        `machine — traverse ${machineState.traverseDeg.toFixed(0)}° · tension ${machineState.tensionClicks}/${TENSION_MAX_CLICKS}${crankPct > 0 ? ` +${crankPct}%` : ""} · bucket: ${machineState.loaded ?? "empty"}`,
      ];
      if (target) lines.push(`▸ ${PROMPTS[target]}`);
      if (now < flashUntil) lines.push(flashMsg);
      hud.textContent = lines.join("\n");
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
      shots,
      getMachine: () => ({ ...machineState, crankTicks }),
      getTarget: () => target,
      setDebugInput: (i: BakerInput | null) => {
        debugInput = i;
      },
      setDebugIntent: (i: MachineIntent | null) => {
        debugIntent = i;
      },
      setLook: (y: number, p: number) => {
        yaw = y;
        pitch = p;
      },
      IDLE_INTENT,
    };
  }
}

main().catch((err: unknown) => {
  console.error("boot failed:", err);
  const hud = document.getElementById("hud");
  if (hud) hud.textContent = `Boot failed: ${String(err)}`;
});
