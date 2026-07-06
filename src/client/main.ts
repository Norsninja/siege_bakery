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
import type { ServerMsg, HeldOp } from "../game/protocol";
import { TOPPINGS } from "../game/toppings";
import { connectLoopback, connectWs, type Transport } from "./net";
import {
  arcGlyph,
  bannerText,
  hudLines,
  type InteractableKind,
} from "./hud";
import {
  InputTracker,
  updateGrip,
  deriveOp,
  deriveMove,
  machineEngaged,
} from "./input";
import { createMatchView, predictClock } from "./state";
import { bannerLatch, tickInteraction } from "./interactions";
import { applyServerMsg, type NetFx } from "./net-handlers";
import { GhostManager } from "./ghosts";
import { buildGameScene, TOPPING_COLORS } from "./scene";
import { ShotsView } from "./shots-view";
import { FrostingView } from "./frosting-view";
import { SprinklesView } from "./sprinkles-view";
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
  const frostingView = new FrostingView(scene);
  const sprinklesView = new SprinklesView(scene);
  // Paint lands in the local sim → the local field (deterministic twin of
  // the Room's — sync-shots-not-surfaces). The topping rides along: fudge
  // paints under its own splat law and renders dark (plans/10). The same
  // splat BURIES stuck sprinkles under its footprint (conversion law,
  // plans/10 §8) — the mirror of the Room's ledger filter.
  shotsView.onPaintImpact = (topping, pos, speed) => {
    frostingView.paintImpact(topping, pos, speed);
    sprinklesView.buryBy(pos, speed, TOPPINGS[topping]?.splat);
  };
  // The conversion law's paint oracle (plans/10 §8): grains grip where
  // they hit wet paint — the local field twin answers, same as the Room's
  // binding. A grip becomes a perched sprinkle on the blob crest.
  shotsView.bindStickyPaint((p) => frostingView.stickyNear(p));
  shotsView.onStuck = (_topping, pos, normal) =>
    sprinklesView.add(pos, normal, frostingView.coatsNear(pos));
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
    spawnResting: (t) => shotsView.spawnResting(t),
    restoreFrosting: (coats) => frostingView.restore(coats),
    resetFrosting: () => {
      frostingView.reset();
      shotsView.bumpDeal(); // in-flight globs are the OLD order's paint
    },
    clearCakeSolids: () => shotsView.clearCakeSolids(),
    restoreStuck: (list) => {
      // The record carries its GRIP-TIME coats (plans/10 §8): replay that
      // fixed perch — never re-measure the current blob, or a sprinkle a
      // teammate frosted NEAR (not over) would float up. On top at its fixed
      // height, or buried and absent; nothing in between.
      for (const s of list)
        sprinklesView.add(
          { x: s.x, y: s.y, z: s.z },
          { x: s.nx, y: s.ny, z: s.nz },
          s.coats,
        );
    },
    clearStuck: () => sprinklesView.clear(),
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
      // Edges: pickup / lever / load — the RULES live in interactions.ts
      // (tested); this is the wiring that executes them.
      const act = tickInteraction(eEdge, target, view.carrying, view.machine.loaded);
      view.carrying = act.carrying;
      for (const m of act.send) transport.send(m);
      if (act.flash) flash(act.flash.msg, act.flash.ms);

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

      // Local clock prediction — never declares an ending (F5, state.ts).
      view.order = predictClock(view.order);

      // Local visual projectile sim: advances the SHARED world (after
      // Baker.step registered its movement); markers + splat readout only.
      shotsView.step(flash);

      if (banner) {
        const b = bannerLatch(view.order.status, bannerShown);
        if (b === "show") {
          bannerShown = true;
          banner.textContent = bannerText(view.order, view.checks, view.verdict);
          banner.style.display = "flex";
        } else if (b === "hide") {
          // The room dealt a fresh order — clear the slate.
          bannerShown = false;
          banner.style.display = "none";
        }
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
      sprinkles: sprinklesView,
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
      // The density review knob (plans/10 §2): mutates the SHARED pantry
      // table — in loopback the Room reads the same module object, so the
      // next sprinkle shot bursts at the new count on both sides. LOOPBACK
      // ONLY (a net game would desync against an unmutated server); the
      // visionary's eye picks 20/40/80, then the number gets PINNED in
      // game/toppings.ts and this knob's job is done.
      setGrainCount: (n: number) => {
        const burst = TOPPINGS["sprinkles"]?.burst;
        if (burst) burst.grains = Math.max(1, Math.round(n));
      },
    };
  }
}

main().catch((err: unknown) => {
  console.error("boot failed:", err);
  const hud = document.getElementById("hud");
  if (hud) hud.textContent = `Boot failed: ${String(err)}`;
});
