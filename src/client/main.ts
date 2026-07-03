/**
 * GREYBOX SLICE — Steps 1–5: the client, speaking protocol.
 *
 * There is no solo code path anymore. The client ALWAYS talks to a Room
 * (server/room.ts) through a Transport: in-memory loopback when playing
 * alone (the room ticks inside our own fixed-tick loop), WebSocket when
 * joined to the Node room server. Machine, order, and scoring truth arrive
 * as messages; this file's own authority is exactly: the local baker's
 * movement (client-auth transforms, plans/02), the camera, and what the
 * crosshair is pointing at.
 *
 * Projectiles: on a `shot` message we simulate the lob LOCALLY in our own
 * Rapier world — deterministic ballistics land identically everywhere, so
 * flight needs no further sync (sync-shots-not-surfaces). Impact markers
 * and splat readouts are local; the `scored` message is the patron's truth.
 *
 * Mode pick: `?join=ws://host:port` joins explicitly; a page served by the
 * room server itself (port 5175) auto-joins; otherwise (vite dev) loopback.
 */
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT, GRAVITY } from "../core/constants";
import {
  Baker,
  EYE_HEIGHT_OFFSET,
  CAPSULE_HALF_HEIGHT,
  CAPSULE_RADIUS,
  type BakerInput,
} from "../core/baker";
import { SPLAT_SPEED, launchOrigin, launchVelocity } from "../core/ballistics";
import { ProjectileManager, PROJECTILE_RADIUS } from "../core/projectiles";
import {
  CROSS_HALF,
  WALLS,
  WALL_HEIGHT,
  MACHINE_BASE,
  CAKE_POS,
  CAKE_HALF,
  PANTRY_POS,
  PANTRY_HALF,
  PLINTH_POS,
  PLINTH_HALF,
  BAKER_SPAWN,
  PEAK_HALF,
  buildArenaColliders,
} from "../core/arena";
import {
  createCatapult,
  TENSION_MAX_CLICKS,
  CRANK_TICKS_PER_CLICK,
  SCREW_TICKS_PER_NOTCH,
  TILT_DEG_PER_NOTCH,
  TILT_MAX_NOTCH,
  type CatapultState,
} from "../game/catapult";
import { createOrder, tickOrder, type OrderState } from "../game/order";
import {
  describeRequirement,
  type Judgment,
  type RequirementCheck,
} from "../game/judgment";
import type { ServerMsg, HeldOp, PlayerPose } from "../game/protocol";
import { connectLoopback, connectWs, type Transport } from "./net";

const MOUSE_SENSITIVITY = 0.0022;
const MAX_PITCH = (85 * Math.PI) / 180;
const REACH_M = 2.8; // how far the baker can reach an interactable
const POSE_SEND_EVERY = 3; // ticks → 20Hz

type InteractableKind =
  | "wheel"
  | "winch"
  | "screw"
  | "lever"
  | "bucket"
  | "shelf-cherry"
  | "shelf-lime";

const TOPPING_COLORS: Record<string, number> = {
  cherry: 0xc23b4e,
  lime: 0x77c34f,
};
const GHOST_COLORS = [0xe6b455, 0x6fb1e0, 0xc580d1, 0x7fcf9a, 0xd98f6d];

async function main(): Promise<void> {
  await RAPIER.init();

  // --- Local physics: baker movement + visual projectile sim ---
  const physics = new RAPIER.World(GRAVITY);
  physics.timestep = FIXED_DT;
  buildArenaColliders(physics);
  const baker = new Baker(physics, BAKER_SPAWN);
  const shots = new ProjectileManager();

  // --- Server-echoed match state (placeholders until `welcome`) ---
  let machineState: CatapultState = createCatapult();
  let crankTicks = 0;
  let screwTicks = 0;
  let order: OrderState = createOrder([], 90 * 60); // rows arrive with `welcome`
  let checks: RequirementCheck[] = [];
  let verdict: Judgment | null = null; // rides the order message that ENDS it
  let lastPatron: { text: string; seq: number } | null = null;
  let myId: number | null = null;
  let carrying: string | null = null; // client-local inventory (plans/02)
  let netStatus: "loopback" | "connecting" | "open" | "closed" = "loopback";

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
  const sphere = (
    r: number,
    color: number,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = scene,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 16, 12),
      new THREE.MeshStandardMaterial({ color }),
    );
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // Arena visuals mirror core/arena's physics definitions exactly.
  box(80, 0.2, 80, 0x7a9e6b, 0, -0.1, 0); // ground
  for (const w of WALLS)
    box(w.hx * 2, WALL_HEIGHT, w.hz * 2, 0x9a9a9a, w.x, WALL_HEIGHT / 2, w.z);
  box(PANTRY_HALF.x * 2, PANTRY_HALF.y * 2, PANTRY_HALF.z * 2, 0xb98a4a,
    PANTRY_POS.x, PANTRY_POS.y, PANTRY_POS.z);
  box(PLINTH_HALF.x * 2, PLINTH_HALF.y * 2, PLINTH_HALF.z * 2, 0x5a5a66,
    PLINTH_POS.x, PLINTH_POS.y, PLINTH_POS.z);
  box(CAKE_HALF.x * 2, CAKE_HALF.y * 2, CAKE_HALF.z * 2, 0xd8a45c,
    CAKE_POS.x, CAKE_POS.y, CAKE_POS.z);
  // The bullseye: the peak zone painted on the cake top ("dead center"
  // orders must be READABLE from the catapult). Square, matching isInZone.
  const peakZone = new THREE.Mesh(
    new THREE.PlaneGeometry(PEAK_HALF * 2, PEAK_HALF * 2),
    new THREE.MeshBasicMaterial({ color: 0xf2e3c2, transparent: true, opacity: 0.4 }),
  );
  peakZone.rotation.x = -Math.PI / 2;
  peakZone.position.set(CAKE_POS.x, CAKE_POS.y + CAKE_HALF.y + 0.01, CAKE_POS.z);
  scene.add(peakZone);
  // The pennant stands BESIDE THE MACHINE (visionary, 2026-07-03): it is
  // the wind instrument you read from the firing position — when wind
  // arrives, this flag is the forecast. The painted square on the cake top
  // stays for the spotter to call.
  box(0.06, 2.4, 0.06, 0xefe3d0, PLINTH_POS.x + 1.8, 1.2, PLINTH_POS.z - 0.6);
  box(0.7, 0.3, 0.02, 0xd8452e, PLINTH_POS.x + 2.18, 2.2, PLINTH_POS.z - 0.6);
  for (let z = -CROSS_HALF; z <= CROSS_HALF; z += 6)
    box(3, 0.02, 0.15, 0xdddddd, 0, 0.01, z); // crossing stripes

  // --- The machine greybox, on the plinth. Group yaw = traverseDeg. ---
  const machine = new THREE.Group(); // yaw (traverse) only
  machine.position.set(MACHINE_BASE.x, MACHINE_BASE.y, MACHINE_BASE.z);
  scene.add(machine);

  // The FRAME tilts; its pivot sits at the REAR ground contact so the tail
  // stays planted on the plinth and the NOSE visibly lifts (a jacked-up
  // machine, not a see-saw — playtest note 2026-07-03).
  const tiltFrame = new THREE.Group();
  tiltFrame.position.set(0, 0, 0.7);
  machine.add(tiltFrame);

  box(1.4, 0.25, 1.4, 0x6e5233, 0, 0.125, -0.7, tiltFrame); // carriage
  const armPivot = new THREE.Group();
  armPivot.position.set(0, 0.3, -0.25);
  tiltFrame.add(armPivot);
  box(0.12, 1.5, 0.12, 0x8a6b45, 0, 0.75, 0, armPivot); // throwing arm
  const bucketMesh = box(0.34, 0.16, 0.34, 0x4a4a55, 0, 1.5, 0, armPivot);
  const toppingMesh = sphere(0.16, 0xc23b4e, 0, 1.66, 0, armPivot);

  const wheelMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.08, 20),
    new THREE.MeshStandardMaterial({ color: 0x8a6b3d }),
  );
  wheelMesh.rotation.z = Math.PI / 2;
  wheelMesh.position.set(-0.8, 0.45, -0.7);
  tiltFrame.add(wheelMesh);

  const winchGroup = new THREE.Group();
  winchGroup.position.set(0.8, 0.45, -0.55);
  tiltFrame.add(winchGroup);
  const drumMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.4, 12),
    new THREE.MeshStandardMaterial({ color: 0x50505c }),
  );
  drumMesh.rotation.z = Math.PI / 2;
  winchGroup.add(drumMesh);
  const winchHandle = box(0.05, 0.3, 0.05, 0x8a6b3d, 0.24, 0.15, 0, winchGroup);

  const leverGroup = new THREE.Group();
  leverGroup.position.set(0.55, 0.15, -1.45);
  tiltFrame.add(leverGroup);
  const leverStick = box(0.06, 0.55, 0.06, 0x777788, 0, 0.28, 0, leverGroup);
  const leverKnob = sphere(0.09, 0xc23b4e, 0, 0.58, 0, leverGroup);

  // The elevation screw AT THE FRONT (plans/04): a great ugly dwarven jack.
  // It stays PLANTED on the plinth (child of machine, not frame) and its
  // post EXTENDS to hold the lifted nose — post height IS the notch gauge.
  const screwGroup = new THREE.Group();
  screwGroup.position.set(-0.55, 0, -0.75);
  machine.add(screwGroup);
  const screwPost = box(0.1, 0.6, 0.1, 0x5a5a66, 0, 0.3, 0, screwGroup);
  const screwHandle = box(0.4, 0.06, 0.06, 0x8a6b3d, 0, 0.62, 0, screwGroup);

  // Pantry crates — the ammo. E takes ONE; you carry it by hand.
  const crateY = PANTRY_POS.y + PANTRY_HALF.y + 0.25;
  const cherryCrate = box(0.9, 0.5, 0.7, 0x8c3038, -1.1, crateY, PANTRY_POS.z);
  const cherrySample = sphere(0.2, TOPPING_COLORS.cherry ?? 0xc23b4e, -1.1, crateY + 0.4, PANTRY_POS.z);
  const limeCrate = box(0.9, 0.5, 0.7, 0x4f7a35, 1.1, crateY, PANTRY_POS.z);
  const limeSample = sphere(0.2, TOPPING_COLORS.lime ?? 0x77c34f, 1.1, crateY + 0.4, PANTRY_POS.z);

  // What's in the baker's hands, rendered at the bottom of the view.
  scene.add(camera); // camera children only render if the camera is in-scene
  const heldMesh = sphere(0.12, 0xffffff, 0.28, -0.22, -0.5, camera);
  heldMesh.visible = false;

  const interactables: Record<InteractableKind, THREE.Mesh[]> = {
    wheel: [wheelMesh],
    winch: [drumMesh, winchHandle],
    screw: [screwPost, screwHandle],
    lever: [leverStick, leverKnob],
    bucket: [bucketMesh, toppingMesh],
    "shelf-cherry": [cherryCrate, cherrySample],
    "shelf-lime": [limeCrate, limeSample],
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

  // --- Other bakers: interpolated ghosts, client-auth poses relayed ---
  interface Ghost {
    group: THREE.Group;
    target: PlayerPose;
  }
  const ghosts = new Map<number, Ghost>();
  const upsertGhost = (pose: PlayerPose): void => {
    const existing = ghosts.get(pose.id);
    if (existing) {
      existing.target = pose;
      return;
    }
    const color = GHOST_COLORS[pose.id % GHOST_COLORS.length] ?? 0xe6b455;
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(CAPSULE_RADIUS, CAPSULE_HALF_HEIGHT * 2, 6, 12),
      new THREE.MeshStandardMaterial({ color }),
    );
    group.add(body);
    box(0.3, 0.08, 0.12, 0x222222, 0, 0.45, -CAPSULE_RADIUS, group); // visor
    group.position.set(pose.x, pose.y, pose.z);
    scene.add(group);
    ghosts.set(pose.id, { group, target: pose });
  };
  const removeGhost = (id: number): void => {
    const g = ghosts.get(id);
    if (!g) return;
    scene.remove(g.group);
    ghosts.delete(id);
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

  const hud = document.getElementById("hud");
  const banner = document.getElementById("banner");
  let bannerShown = false;
  let flashMsg = "";
  let flashUntil = 0;
  const flash = (msg: string, ms = 4000): void => {
    flashMsg = msg;
    flashUntil = performance.now() + ms;
  };

  // --- Every word the room says ---
  const handleServerMsg = (msg: ServerMsg): void => {
    switch (msg.t) {
      case "welcome":
        myId = msg.id;
        machineState = msg.machine;
        crankTicks = msg.crankTicks;
        screwTicks = msg.screwTicks;
        order = msg.order;
        checks = msg.checks;
        for (const p of msg.poses) upsertGhost(p);
        break;
      case "join":
        flash(`${msg.name} ran into the bakery!`);
        break;
      case "leave":
        removeGhost(msg.id);
        flash("a baker left");
        break;
      case "poses":
        for (const p of msg.poses) upsertGhost(p);
        break;
      case "machine":
        machineState = msg.state;
        crankTicks = msg.crankTicks;
        screwTicks = msg.screwTicks;
        break;
      case "shot": {
        // Everyone simulates the same deterministic lob locally.
        const body = shots.spawn(
          physics,
          launchOrigin(MACHINE_BASE, msg.traverseDeg),
          launchVelocity(
            msg.traverseDeg,
            msg.tensionClicks,
            msg.tiltNotch * TILT_DEG_PER_NOTCH,
          ),
          msg.topping,
        );
        const mesh = sphere(
          PROJECTILE_RADIUS,
          TOPPING_COLORS[msg.topping] ?? 0xc23b4e,
          0,
          -5,
          0,
        );
        shotMeshes.push({ body, mesh });
        flash(
          `LOOSED! ${msg.topping} · ${msg.tensionClicks} clicks · ${msg.traverseDeg.toFixed(0)}°${msg.tiltNotch > 0 ? ` · arc +${msg.tiltNotch * TILT_DEG_PER_NOTCH}°` : ""}`,
          2500,
        );
        break;
      }
      case "scored": {
        // Did the checklist actually advance? (A lime ON the cake but
        // outside the bullseye is on-cake yet counts for nothing.)
        const sum = (cs: RequirementCheck[]): number =>
          cs.reduce((n, c) => n + Math.min(c.current, c.target), 0);
        const progressed = sum(msg.checks) > sum(checks);
        order = msg.order;
        checks = msg.checks;
        if (progressed) flash(`✓ the patron counts the ${msg.topping}!`);
        else if (msg.onCake)
          flash(`the ${msg.topping} rests on the cake — but that's not what was asked`);
        else flash(`no good — the ${msg.topping} didn't stay on the cake`);
        break;
      }
      case "order":
        order = msg.order;
        checks = msg.checks;
        if (msg.judgment) verdict = msg.judgment;
        else if (msg.order.status === "running") verdict = null; // fresh deal
        break;
      case "patron":
        lastPatron = { text: msg.text, seq: msg.seq };
        flash(`THE GIANT — ${msg.text}`, 6000);
        break;
    }
  };

  // --- Transport pick: explicit ?join, room-server origin, else loopback ---
  const joinParam = new URLSearchParams(location.search).get("join");
  const wsUrl =
    joinParam ?? (location.port === "5175" ? `ws://${location.host}` : null);
  let transport: Transport;
  let tickRoom: (() => void) | null = null;
  if (wsUrl) {
    netStatus = "connecting";
    transport = connectWs(wsUrl, handleServerMsg, (s) => {
      netStatus = s;
    });
  } else {
    const loop = connectLoopback(handleServerMsg);
    transport = loop.transport;
    tickRoom = loop.tickRoom;
  }

  // --- Input: pointer-lock mouse look + WASD/Shift + E ---
  let yaw = 0; // 0 faces -Z: spawn looks at the catapult and cake
  let pitch = 0;
  const keys = new Set<string>();
  let ePressed = false; // edge, consumed by the next sim tick
  let debugInput: BakerInput | null = null; // DEV: preview_eval drives the baker

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
    // Greybox restart: reload is the honest reset.
    if (e.code === "KeyR" && order.status !== "running")
      window.location.reload();
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

  const promptFor = (kind: InteractableKind): string => {
    switch (kind) {
      case "wheel":
        return "hold E + A/D — traverse wheel";
      case "winch":
        return "hold E — crank the winch";
      case "screw":
        return `hold E + W/S — elevation screw · notch ${machineState.tiltNotch}/${TILT_MAX_NOTCH} (+${machineState.tiltNotch * TILT_DEG_PER_NOTCH}°)`;
      case "lever":
        return "E — pull the release lever!";
      case "bucket":
        if (machineState.loaded !== null) return "bucket is full — fire it!";
        return carrying !== null
          ? `E — load the ${carrying}`
          : "hands empty — fetch a topping from the pantry";
      case "shelf-cherry":
        return carrying !== null ? "hands full — one at a time" : "E — take a cherry";
      case "shelf-lime":
        return carrying !== null ? "hands full — one at a time" : "E — take a lime";
    }
  };

  // --- Fixed-timestep loop, rendering decoupled ---
  let lastOp: HeldOp = { turn: 0, screw: 0, crank: false };
  let lastTiltNotch = 0;
  /** GRAB SEMANTICS: the control you engage with E stays gripped until E
   * is released — the crosshair slipping off (or the control moving under
   * it, e.g. the jack post extending) must never drop your hold and turn
   * held W/S into walking (playtest bug, 2026-07-03). */
  let heldTarget: InteractableKind | null = null;
  let totalCrankSpins = 0; // visual-only: winch drum angle
  let lastCrankTicks = 0;
  let tickCounter = 0;
  let last = performance.now();
  let accumulator = 0;
  function frame(now: number): void {
    // Cap the accumulator so a backgrounded tab doesn't spiral on return.
    accumulator = Math.min(accumulator + (now - last) / 1000, 0.25);
    last = now;

    updateTarget();

    while (accumulator >= FIXED_DT) {
      tickCounter++;
      const eHeld = keys.has("KeyE");
      const eEdge = ePressed;
      ePressed = false;

      // Grip: latch the crosshair target while E is held; release with E.
      if (!eHeld) heldTarget = null;
      else if (heldTarget === null && target !== null) heldTarget = target;
      const grip = heldTarget ?? target;

      // Pantry pickup: hands must be empty, one topping at a time.
      if (eEdge && carrying === null) {
        if (target === "shelf-cherry") carrying = "cherry";
        else if (target === "shelf-lime") carrying = "lime";
      }

      // Hold state on the machine → send only on change. HOLD ops read the
      // GRIP (sticky), edge ops below keep reading the live crosshair.
      const op: HeldOp = {
        turn:
          grip === "wheel" && eHeld
            ? keys.has("KeyA") && !keys.has("KeyD")
              ? 1
              : keys.has("KeyD") && !keys.has("KeyA")
                ? -1
                : 0
            : 0,
        screw:
          grip === "screw" && eHeld
            ? keys.has("KeyW") && !keys.has("KeyS")
              ? 1
              : keys.has("KeyS") && !keys.has("KeyW")
                ? -1
                : 0
            : 0,
        crank: grip === "winch" && eHeld,
      };
      if (
        op.turn !== lastOp.turn ||
        op.screw !== lastOp.screw ||
        op.crank !== lastOp.crank
      ) {
        transport.send({ t: "op", turn: op.turn, screw: op.screw, crank: op.crank });
        lastOp = op;
      }
      // Edges.
      if (eEdge && target === "lever") {
        transport.send({ t: "lever" });
        if (machineState.loaded === null)
          flash("dry release — the crank was for nothing", 2500);
      }
      if (
        eEdge &&
        target === "bucket" &&
        carrying !== null &&
        machineState.loaded === null
      ) {
        transport.send({ t: "load", topping: carrying });
        carrying = null;
      }

      // Hands on the machine = feet planted. Otherwise, normal movement.
      const engaged =
        eHeld &&
        (grip === "wheel" || grip === "winch" || grip === "screw");
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

      if (tickCounter % POSE_SEND_EVERY === 0) {
        const p = baker.position();
        transport.send({ t: "pose", pose: { x: p.x, y: p.y, z: p.z, yaw } });
      }

      // Solo: our loop drives the room. Joined: the server drives it.
      if (tickRoom) tickRoom();

      // Local clock prediction between authoritative order messages.
      order = tickOrder(order);

      // Local visual projectile sim: markers + splat readout only.
      const ev = shots.step(physics);
      for (const im of ev.impacts) {
        const splat = im.speed >= SPLAT_SPEED;
        addLandingMarker(im.pos.x, im.pos.y, im.pos.z, splat);
        flash(
          `${splat ? "SPLAT!" : "placed."} ${im.topping} landed at ${im.speed.toFixed(1)} m/s`,
        );
      }

      if (order.status !== "running" && !bannerShown && banner) {
        bannerShown = true;
        // The checklist names the culprit — a lost order must say WHICH row
        // failed, never contradict the player's memory (2D playtest lesson).
        const list = checks
          .map((c) => `${c.met ? "✓" : "✗"} ${describeRequirement(c.req)}`)
          .join("\n");
        const scoreLine = verdict
          ? `assembly ${verdict.score}/100 — mess ${Math.round(verdict.mess * 100)}% · ${
              verdict.waste >= 1 ? "under par" : "over par"
            }`
          : "";
        let text: string;
        if (order.status === "won" && verdict) {
          // Both gates cleared: tiered delight.
          text = `THE PATRON IS DELIGHTED! ${"★".repeat(verdict.stars)}\n${list}\n${scoreLine}`;
        } else if (verdict?.met) {
          // Gate 2 refusal — the insulting kind: every box ticked, badly.
          text = `REFUSED.\n"you did what I asked. it is TERRIBLE."\n${list}\n${scoreLine} (the patron demands ${order.passScore})`;
        } else {
          // Gate 1 failure: the clock died first.
          text = `TIME!\n${list}\nthe patron goes hungry`;
        }
        banner.textContent = `${text}\n\na new order is coming…`;
        banner.style.display = "flex";
      } else if (order.status === "running" && bannerShown && banner) {
        // The room dealt a fresh order — clear the slate.
        bannerShown = false;
        banner.style.display = "none";
      }
      accumulator -= FIXED_DT;
    }

    // --- Render state ---
    const p = baker.position();
    camera.position.set(p.x, p.y + EYE_HEIGHT_OFFSET, p.z);
    camera.rotation.set(pitch, yaw, 0);

    machine.rotation.y = (machineState.traverseDeg * Math.PI) / 180;
    // The frame tilts around its planted REAR; partial screw progress
    // previews the coming notch. The jack post extends to hold the nose —
    // its height is the analog gauge.
    const tiltDeg = Math.min(
      TILT_MAX_NOTCH * TILT_DEG_PER_NOTCH,
      Math.max(
        0,
        (machineState.tiltNotch + screwTicks / SCREW_TICKS_PER_NOTCH) *
          TILT_DEG_PER_NOTCH,
      ),
    );
    const tiltRad = (tiltDeg * Math.PI) / 180;
    tiltFrame.rotation.x = tiltRad;
    const noseLift = 1.45 * Math.sin(tiltRad); // nose height at the screw
    const postScale = (0.6 + noseLift) / 0.6;
    screwPost.scale.y = postScale;
    screwPost.position.y = 0.3 * postScale;
    screwHandle.position.y = 0.6 * postScale + 0.02;
    screwHandle.rotation.y = screwTicks * 0.3; // the jack handle works
    // The moment a notch engages, say so — the CLUNK is the readout.
    if (machineState.tiltNotch !== lastTiltNotch) {
      const dir = machineState.tiltNotch > lastTiltNotch ? "raised" : "lowered";
      flash(
        `CLUNK — arc ${dir} to +${machineState.tiltNotch * TILT_DEG_PER_NOTCH}° (notch ${machineState.tiltNotch}/${TILT_MAX_NOTCH})`,
        2500,
      );
      lastTiltNotch = machineState.tiltNotch;
    }
    const tensionFrac =
      (machineState.tensionClicks + crankTicks / CRANK_TICKS_PER_CLICK) /
      TENSION_MAX_CLICKS;
    armPivot.rotation.x = 0.5 + tensionFrac * 0.7; // arm winches down and back
    if (crankTicks !== lastCrankTicks) {
      totalCrankSpins += 1;
      lastCrankTicks = crankTicks;
    }
    drumMesh.rotation.x = totalCrankSpins * 0.05;
    toppingMesh.visible = machineState.loaded !== null;
    if (machineState.loaded !== null)
      (toppingMesh.material as THREE.MeshStandardMaterial).color.setHex(
        TOPPING_COLORS[machineState.loaded] ?? 0xc23b4e,
      );
    heldMesh.visible = carrying !== null;
    if (carrying !== null)
      (heldMesh.material as THREE.MeshStandardMaterial).color.setHex(
        TOPPING_COLORS[carrying] ?? 0xffffff,
      );

    for (const g of ghosts.values()) {
      g.group.position.lerp(
        new THREE.Vector3(g.target.x, g.target.y, g.target.z),
        0.25,
      );
      const dy =
        ((g.target.yaw - g.group.rotation.y + Math.PI * 3) % (Math.PI * 2)) -
        Math.PI;
      g.group.rotation.y += dy * 0.25;
    }

    for (const s of shotMeshes) {
      const t = s.body.translation();
      s.mesh.position.set(t.x, t.y, t.z);
    }

    if (hud) {
      const locked = document.pointerLockElement === canvas;
      const crankPct = Math.round((crankTicks / CRANK_TICKS_PER_CLICK) * 100);
      const secsLeft = Math.ceil(order.ticksLeft * FIXED_DT);
      const clock = `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, "0")}`;
      const who =
        netStatus === "loopback"
          ? "solo bakery"
          : netStatus === "open"
            ? `co-op bakery · ${ghosts.size + 1} baking · you are baker ${myId ?? "?"}`
            : netStatus === "connecting"
              ? "joining the bakery…"
              : "CONNECTION LOST — refresh to rejoin";
      const lines = [
        `THE ORDER · ${clock}   [${who}]`,
        ...checks.map(
          (c) =>
            `  ${c.met ? "✓" : "✗"} ${describeRequirement(c.req)} · ${c.current}/${c.target}`,
        ),
        locked
          ? "WASD move · Shift sprint · E interact · Esc frees the mouse"
          : "Click to grab the mouse · WASD move · Shift sprint · E interact",
        `machine — traverse ${machineState.traverseDeg.toFixed(0)}° · arc notch ${machineState.tiltNotch}/${TILT_MAX_NOTCH} (+${machineState.tiltNotch * TILT_DEG_PER_NOTCH}°) · tension ${machineState.tensionClicks}/${TENSION_MAX_CLICKS}${crankPct > 0 ? ` +${crankPct}%` : ""} · bucket: ${machineState.loaded ?? "empty"} · hands: ${carrying ?? "empty"}`,
      ];
      if (target) lines.push(`▸ ${promptFor(target)}`);
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
      send: (m: Parameters<Transport["send"]>[0]) => transport.send(m),
      getMachine: () => ({ ...machineState, crankTicks }),
      getTarget: () => target,
      getOrder: () => ({ ...order }),
      getChecks: () => checks.map((c) => ({ ...c })),
      getJudgment: () => (verdict ? { ...verdict } : null),
      getLastPatron: () => (lastPatron ? { ...lastPatron } : null),
      getCarrying: () => carrying,
      setCarrying: (t: string | null) => {
        carrying = t;
      },
      getGhosts: () => [...ghosts.keys()],
      getNetStatus: () => netStatus,
      getMyId: () => myId,
      setDebugInput: (i: BakerInput | null) => {
        debugInput = i;
      },
      setLook: (y: number, p: number) => {
        yaw = y;
        pitch = p;
      },
    };
  }
}

main().catch((err: unknown) => {
  console.error("boot failed:", err);
  const hud = document.getElementById("hud");
  if (hud) hud.textContent = `Boot failed: ${String(err)}`;
});
