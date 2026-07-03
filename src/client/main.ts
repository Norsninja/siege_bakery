/**
 * The client entry — boot, transport pick, and the fixed-timestep loop.
 *
 * There is no solo code path anymore. The client ALWAYS talks to a Room
 * (server/room.ts) through a Transport: in-memory loopback when playing
 * alone (the room ticks inside our own fixed-tick loop), WebSocket when
 * joined to the Node room server. Machine, order, and scoring truth arrive
 * as messages; this file's own authority is exactly: the local baker's
 * movement (client-auth transforms, plans/02), the camera, and what the
 * crosshair is pointing at.
 *
 * Decomposed (plans/06): state.ts holds the MatchView, net-handlers.ts
 * applies every room message, hud.ts words the HUD/banner, input.ts owns
 * grip semantics, scene.ts builds the world + machine rig, shots-view.ts
 * simulates the visible lobs, ghosts.ts renders the other bakers. This
 * file is the wiring and the clock.
 *
 * Mode pick: `?join=ws://host:port` joins explicitly; a page served by the
 * room server itself (port 5175) auto-joins; otherwise (vite dev) loopback.
 */
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT, GRAVITY } from "../core/constants";
import { Baker, EYE_HEIGHT_OFFSET, type BakerInput } from "../core/baker";
import { BAKER_SPAWN, buildArenaColliders } from "../core/arena";
import { tickOrder } from "../game/order";
import type { ServerMsg, HeldOp } from "../game/protocol";
import { connectLoopback, connectWs, type Transport } from "./net";
import { arcGlyph, bannerText, hudLines, type InteractableKind } from "./hud";
import {
  InputTracker,
  updateGrip,
  deriveOp,
  deriveMove,
  machineEngaged,
} from "./input";
import { createMatchView } from "./state";
import { applyServerMsg, type NetFx } from "./net-handlers";
import { GhostManager } from "./ghosts";
import { buildGameScene, TOPPING_COLORS } from "./scene";
import { ShotsView } from "./shots-view";
import { TILT_DEG_PER_NOTCH } from "../game/catapult";

const REACH_M = 2.8; // how far the baker can reach an interactable
const POSE_SEND_EVERY = 3; // ticks → 20Hz

async function main(): Promise<void> {
  await RAPIER.init();

  // --- Local physics: baker movement + visual projectile sim ---
  const physics = new RAPIER.World(GRAVITY);
  physics.timestep = FIXED_DT;
  buildArenaColliders(physics);
  const baker = new Baker(physics, BAKER_SPAWN);

  // --- The match, as this client knows it (state.ts) ---
  const view = createMatchView();

  // --- The world on screen (scene.ts) ---
  const canvas = document.getElementById("app") as HTMLCanvasElement;
  const gs = buildGameScene(canvas);
  const { renderer, scene, camera, rig, heldMesh } = gs;
  const shotsView = new ShotsView(physics, scene);
  const ghosts = new GhostManager(scene);

  const hud = document.getElementById("hud");
  const banner = document.getElementById("banner");
  let bannerShown = false;
  let flashMsg = "";
  let flashUntil = 0;
  const flash = (msg: string, ms = 4000): void => {
    flashMsg = msg;
    flashUntil = performance.now() + ms;
  };

  // --- Every word the room says (net-handlers.ts) ---
  const fx: NetFx = {
    spawnShot: (msg) => shotsView.spawn(msg),
    upsertGhost: (p) => ghosts.upsert(p),
    removeGhost: (id) => ghosts.remove(id),
    flash,
  };
  const handleServerMsg = (msg: ServerMsg): void =>
    applyServerMsg(view, msg, fx);

  // --- Transport pick: explicit ?join, room-server origin, else loopback ---
  const joinParam = new URLSearchParams(location.search).get("join");
  const wsUrl =
    joinParam ?? (location.port === "5175" ? `ws://${location.host}` : null);
  let transport: Transport;
  let tickRoom: (() => void) | null = null;
  if (wsUrl) {
    view.netStatus = "connecting";
    transport = connectWs(wsUrl, handleServerMsg, (s) => {
      view.netStatus = s;
    });
  } else {
    const loop = connectLoopback(handleServerMsg);
    transport = loop.transport;
    tickRoom = loop.tickRoom;
  }

  // --- Input: pointer-lock mouse look + WASD/Shift + E (input.ts) ---
  const input = new InputTracker(canvas);
  let debugInput: BakerInput | null = null; // DEV: preview_eval drives the baker

  window.addEventListener("keydown", (e) => {
    // Greybox restart: reload is the honest reset. Game-flow, not input
    // mechanics — stays with the order state it reads.
    if (e.code === "KeyR" && view.order.status !== "running")
      window.location.reload();
  });
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
    const hit = raycaster.intersectObjects(gs.raycastTargets, false)[0];
    const next = hit ? (gs.kindOf.get(hit.object) ?? null) : null;
    if (next !== target) {
      target = next;
      gs.setHighlight(target);
    }
  };

  // --- Fixed-timestep loop, rendering decoupled ---
  let lastOp: HeldOp = { turn: 0, screw: 0, crank: false };
  /** GRAB SEMANTICS (input.ts): the control you engage with E stays gripped
   * until E is released. */
  let heldTarget: InteractableKind | null = null;
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
      const eHeld = input.keys.has("KeyE");
      const eEdge = input.takeEdgeE();

      // Grip: latch the crosshair target while E is held; release with E.
      heldTarget = updateGrip(heldTarget, eHeld, target);
      const grip = heldTarget ?? target;

      // Pantry pickup: hands must be empty, one topping at a time.
      if (eEdge && view.carrying === null) {
        if (target === "shelf-cherry") view.carrying = "cherry";
        else if (target === "shelf-lime") view.carrying = "lime";
      }

      // Hold state on the machine → send only on change. HOLD ops read the
      // GRIP (sticky), edge ops below keep reading the live crosshair.
      const op = deriveOp(grip, eHeld, input.keys);
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
        if (view.machine.loaded === null)
          flash("dry release — the crank was for nothing", 2500);
      }
      if (
        eEdge &&
        target === "bucket" &&
        view.carrying !== null &&
        view.machine.loaded === null
      ) {
        transport.send({ t: "load", topping: view.carrying });
        view.carrying = null;
      }

      // Hands on the machine = feet planted. Otherwise, normal movement.
      const engaged = machineEngaged(grip, eHeld);
      const move: BakerInput =
        debugInput ?? deriveMove(engaged, input.keys, input.yaw);
      baker.step(move);

      if (tickCounter % POSE_SEND_EVERY === 0) {
        const p = baker.position();
        transport.send({
          t: "pose",
          pose: { x: p.x, y: p.y, z: p.z, yaw: input.yaw },
        });
      }

      // Solo: our loop drives the room. Joined: the server drives it.
      if (tickRoom) tickRoom();

      // Local clock prediction between authoritative order messages.
      view.order = tickOrder(view.order);

      // Local visual projectile sim: advances the SHARED world (after
      // Baker.step registered its movement); markers + splat readout only.
      shotsView.step(flash);

      if (view.order.status !== "running" && !bannerShown && banner) {
        bannerShown = true;
        banner.textContent = bannerText(view.order, view.checks, view.verdict);
        banner.style.display = "flex";
      } else if (view.order.status === "running" && bannerShown && banner) {
        // The room dealt a fresh order — clear the slate.
        bannerShown = false;
        banner.style.display = "none";
      }
      accumulator -= FIXED_DT;
    }

    // --- Render state ---
    const p = baker.position();
    camera.position.set(p.x, p.y + EYE_HEIGHT_OFFSET, p.z);
    camera.rotation.set(input.pitch, input.yaw, 0);

    // The moment a notch engages, say so — the CLUNK is the readout.
    rig.update(view, (notch) => {
      const dir = notch > rig.shownTiltNotch ? "raised" : "lowered";
      flash(
        `CLUNK — arc ${dir} to +${notch * TILT_DEG_PER_NOTCH}° ${arcGlyph(notch)}`,
        2500,
      );
    });
    heldMesh.visible = view.carrying !== null;
    if (view.carrying !== null)
      (heldMesh.material as THREE.MeshStandardMaterial).color.setHex(
        TOPPING_COLORS[view.carrying] ?? 0xffffff,
      );

    ghosts.update();
    shotsView.sync();

    if (hud) {
      hud.textContent = hudLines({
        order: view.order,
        checks: view.checks,
        machine: view.machine,
        crankTicks: view.crankTicks,
        carrying: view.carrying,
        netStatus: view.netStatus,
        ghostCount: ghosts.count,
        myId: view.myId,
        locked: document.pointerLockElement === canvas,
        target,
        flash: now < flashUntil ? flashMsg : null,
      }).join("\n");
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
      shots: shotsView,
      send: (m: Parameters<Transport["send"]>[0]) => transport.send(m),
      getMachine: () => ({ ...view.machine, crankTicks: view.crankTicks }),
      getTarget: () => target,
      getOrder: () => ({ ...view.order }),
      getChecks: () => view.checks.map((c) => ({ ...c })),
      getJudgment: () => (view.verdict ? { ...view.verdict } : null),
      getLastPatron: () => (view.lastPatron ? { ...view.lastPatron } : null),
      getCarrying: () => view.carrying,
      setCarrying: (t: string | null) => {
        view.carrying = t;
      },
      getGhosts: () => ghosts.ids(),
      getNetStatus: () => view.netStatus,
      getMyId: () => view.myId,
      setDebugInput: (i: BakerInput | null) => {
        debugInput = i;
      },
      setLook: (y: number, p: number) => {
        input.yaw = y;
        input.pitch = p;
      },
    };
  }
}

main().catch((err: unknown) => {
  console.error("boot failed:", err);
  const hud = document.getElementById("hud");
  if (hud) hud.textContent = `Boot failed: ${String(err)}`;
});
