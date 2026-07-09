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
import { TOWNS, buildArenaColliders } from "../core/arena";
import type { ServerMsg, HeldOp } from "../game/protocol";
import { TOPPINGS } from "../game/toppings";
import { connectLoopback, connectWs, pickWsUrl, type Transport } from "./net";
import {
  bannerText,
  hudLines,
  runOverText,
  snapshotCaption,
  type InteractableKind,
} from "./hud";
import { DessertSnapshot } from "./snapshot";
import { InputTracker, deriveMove } from "./input";
import { postAnchors, postAt, postOp, type Post } from "./posts";
import { createMatchView, myMachine, predictClock } from "./state";
import { bannerLatch, interactionActs, resolveEEdge } from "./interactions";
import { applyServerMsg, type NetFx } from "./net-handlers";
import { GhostManager } from "./ghosts";
import { depthIntoTown, townToPick, TownGates } from "./gates";
import { buildGameScene, TOPPING_COLORS } from "./scene";
import { ORDER_RESET_TICKS } from "../game/tuning";
import { ShotsView } from "./shots-view";
import { FrostingView } from "./frosting-view";
import { SprinklesView } from "./sprinkles-view";
import { TILT_DEG_PER_NOTCH } from "../game/catapult";

const REACH_M = 2.8; // how far the baker can reach an interactable
const POSE_SEND_EVERY = 3; // ticks → 20Hz

async function main(): Promise<void> {
  await RAPIER.init();

  // --- Local physics: baker movement + visual projectile sim ---
  // NOTE: the local Baker spawns AFTER the first `welcome` (below) — the
  // boot-order fix (plans/11 §4): with two towns the client doesn't know
  // WHERE to spawn until the room says which town is ours.
  const physics = new RAPIER.World(GRAVITY);
  physics.timestep = FIXED_DT;
  buildArenaColliders(physics);
  // The switch-between-orders law's fence (client/gates.ts): baker-only
  // colliders in the shared world — shots never see them (collision
  // groups), so the deterministic arcs are untouched.
  const gates = new TownGates(physics);

  // --- The match, as this client knows it (state.ts) ---
  const view = createMatchView();
  // The DEAL's dessert colliders (spec refactor, plans/13 §3): per-deal
  // state in the shared world, torn down and rebuilt by fx.bindDessert.
  // Seeded from the placeholder view; the welcome rebinds.
  let dessertColliders = view.dessert.buildColliders(physics);

  // --- The world on screen (scene.ts) ---
  const canvas = document.getElementById("app") as HTMLCanvasElement;
  const gs = buildGameScene(canvas);
  const { renderer, scene, camera, heldMesh } = gs;
  gs.setDessert(view.dessert.spec.tiers); // the placeholder cake, pre-welcome
  const shotsView = new ShotsView(physics, scene);
  const frostingView = new FrostingView(scene, view.dessert.samples);
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
  // The dessert report (client/snapshot.ts): the tripod, its corner frame,
  // and the caption slot. Photo taken on the banner-show edge below.
  const snapshot = new DessertSnapshot(renderer);
  snapshot.aimAt(view.dessert.spec.tiers); // re-aimed by every rebind
  const snapEl = document.getElementById("snapshot");
  const snapImg = snapEl?.querySelector("img") ?? null;
  const snapCaption = snapEl?.querySelector("figcaption") ?? null;
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
    bindDessert: (dessert) => {
      // THE DESSERT REBIND (plans/13 §3): colliders swap in the shared
      // world, the cake meshes rebuild, the frosting view rolls a fresh
      // field over the new census, the tripod re-aims. Called AFTER
      // clearCakeSolids (which read the OUTGOING view.dessert).
      for (const c of dessertColliders) physics.removeCollider(c, false);
      dessertColliders = dessert.buildColliders(physics);
      gs.setDessert(dessert.spec.tiers);
      frostingView.bindDessert(dessert.samples);
      snapshot.aimAt(dessert.spec.tiers);
      shotsView.bumpDeal(); // in-flight globs are the OLD order's paint
    },
    clearCakeSolids: () => shotsView.clearCakeSolids(view.dessert),
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
    clearLandingRings: () => shotsView.clearLandingMarkers(),
    upsertGhost: (p) => ghosts.upsert(p),
    removeGhost: (id) => ghosts.remove(id),
    flash,
    bindTown: (t) => gs.bindTown(t),
  };
  let welcomeSeen: (() => void) | null = null;
  const firstWelcome = new Promise<void>((res) => (welcomeSeen = res));
  const handleServerMsg = (msg: ServerMsg): void => {
    applyServerMsg(view, msg, fx);
    if (msg.t === "welcome" && welcomeSeen) {
      welcomeSeen();
      welcomeSeen = null;
    }
  };

  // --- Transport pick: explicit ?join, room-server origin, else loopback
  // (pickWsUrl, net.ts — the tunnel-gate law, pinned in net.test.ts) ---
  const wsUrl = pickWsUrl(location, import.meta.env.PROD);
  let transport: Transport;
  let tickRoom: (() => void) | null = null;
  /** Loopback only — the DEV verification seam (net.ts LoopbackConnection). */
  let loopRoom: import("../server/room").Room | null = null;
  if (wsUrl) {
    view.netStatus = "connecting";
    transport = connectWs(wsUrl, handleServerMsg, (s) => {
      view.netStatus = s;
      // THE DEAD-LINK TRUTH (audit 2026-07-07 C-HIGH-1): before the first
      // welcome, nothing else repaints — the render loop that words
      // netStatus starts only after the welcome await. Without this line a
      // friend clicking an expired tunnel stares at "joining the bakery…"
      // forever: the same silent-wrong-mode class pickWsUrl killed at the
      // URL layer, at the connect layer.
      if (s === "closed" && welcomeSeen && hud)
        hud.textContent =
          "could not reach the bakery — the link may have expired; ask the host for a fresh one, then refresh";
    });
  } else {
    const loop = connectLoopback(handleServerMsg);
    transport = loop.transport;
    tickRoom = loop.tickRoom;
    loopRoom = loop.room;
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

  // --- THE BOOT-ORDER FIX (plans/11 §4): spawn behind the first welcome ---
  // Spawn-then-teleport was the classic two-base bug the research pass
  // warned about; so is forgetting spawn ORIENTATION. Loopback welcomes
  // synchronously (no visible beat); over ws this is the brief joining
  // wait the netStatus line already narrates.
  if (hud) hud.textContent = "joining the bakery…";
  renderer.render(scene, camera); // the arena on screen while we wait
  await firstWelcome;
  const homeTown = TOWNS[view.yourTown] ?? TOWNS[0]!;
  const baker = new Baker(physics, homeTown.spawn);
  // Open looking down your own run — machine first, the shared cake beyond.
  input.yaw = (homeTown.facingDeg * Math.PI) / 180;

  // --- Fixed-timestep loop, rendering decoupled ---
  let lastOp: HeldOp = { turn: 0, screw: 0, crank: 0 };
  /** The post this baker mans (plans/14) — the whole "hands on machine"
   * state now. Null = on foot. */
  let manned: Post | null = null;
  /** The zone the baker stood in last tick — HUD invitation line. */
  let nearPostShown: Post | null = null;
  let tickCounter = 0;
  /** Linger countdown, in ticks — armed when the banner shows. */
  let lingerTicks = 0;
  /** The run phase last tick — the run-start carry-home edge (plans/13). */
  let lastRunPhase = view.run.phase;
  /** The last pickTown spoken this linger — edge guard, re-armed when the
   * rule reads null (left the fort, ack landed, or the deal closed it). */
  let pickSent: number | null = null;
  let last = performance.now();
  let accumulator = 0;
  function frame(now: number): void {
    // Cap the accumulator so a backgrounded tab doesn't spiral on return.
    accumulator = Math.min(accumulator + (now - last) / 1000, 0.25);
    last = now;

    updateTarget();

    while (accumulator >= FIXED_DT) {
      tickCounter++;
      const eEdge = input.takeEdgeE();
      const fEdge = input.takeEdgeF();

      // THE GUN CREW (plans/14, experiment 2026-07-08): machine ops come
      // from the post you MAN, not crosshair grips + E-chords. Zones ride
      // your own town's machine; a teleport out of the zone (carry-home,
      // the fresh deal) un-mans you automatically — feet planted means E
      // is otherwise the only way out.
      const bakerPos = baker.position();
      const anchors = postAnchors(
        TOWNS[view.yourTown]!.base,
        TOWNS[view.yourTown]!.facingDeg,
      );
      if (manned !== null && postAt(bakerPos, anchors) !== manned)
        manned = null;
      const nearPost = manned === null ? postAt(bakerPos, anchors) : null;
      nearPostShown = nearPost;

      // One E edge, one meaning (plans/14; review 2026-07-08): the
      // precedence chain — step off > pantry interaction > man the zone,
      // each stage consuming the edge only when it ACTS — lives in
      // interactions.resolveEEdge, TESTED; this is the wiring that
      // executes what it decides. The lever is the gunner's F now:
      // pantryTarget keeps interactions.ts's lever branch unreachable
      // while the experiment runs — rollback re-opens it.
      const resolved = resolveEEdge(
        eEdge,
        manned,
        target,
        nearPost,
        view.carrying,
        myMachine(view).machine.loaded,
      );
      manned = resolved.manned;
      if (resolved.justManned && manned === "gunner") {
        // The gunner's welcome: a gentle snap down the throw line —
        // then the head is free. The reticle never aims (plans/14 law).
        const m = myMachine(view).machine;
        let yaw =
          (((TOWNS[view.yourTown]!.facingDeg + m.traverseDeg) % 360) *
            Math.PI) /
          180;
        if (yaw > Math.PI) yaw -= 2 * Math.PI;
        else if (yaw <= -Math.PI) yaw += 2 * Math.PI;
        input.yaw = yaw;
      }
      view.carrying = resolved.act.carrying;
      for (const m of resolved.act.send) transport.send(m);
      if (resolved.act.flash)
        flash(resolved.act.flash.msg, resolved.act.flash.ms);

      // Hold state on the machine from the manned post → send on change.
      const op = postOp(manned, input.keys);
      if (
        op.turn !== lastOp.turn ||
        op.screw !== lastOp.screw ||
        op.crank !== lastOp.crank
      ) {
        transport.send({ t: "op", turn: op.turn, screw: op.screw, crank: op.crank });
        lastOp = op;
      }
      // The gunner's lever: F fires, ALWAYS — a dry release is a mistake
      // that executes (same comedy line the crosshair lever spoke).
      if (fEdge && manned === "gunner") {
        transport.send({ t: "lever" });
        if (myMachine(view).machine.loaded === null)
          flash("dry release — the crank was for nothing", 2500);
      }

      // Gate fences first (they shape THIS tick's movement): your fort's
      // gate shuts while the order runs and you're home; opens with the
      // linger window — switching towns is a run through the doorway.
      // Phase-aware since the run container (plans/13): the lobby's
      // dormant order is "running" on paper but nothing is being played
      // — the gates stand open outside a live rung.
      const orderLive =
        view.run.phase === "running" && view.order.status === "running";
      gates.update(orderLive, view.yourTown, baker.position());
      // POSITION IS THE PICK (gates.ts townToPick, visionary 2026-07-07):
      // run clearly into a fort during the linger and the client speaks
      // the pick for you — the honored ack moves yourTown (server truth,
      // plans/11 §5), re-binds your prompts, and the carry-home then
      // respects the choice. Edge-guarded: one send per fort entered.
      const pick = townToPick(
        orderLive,
        view.yourTown,
        view.machines.length,
        baker.position(),
      );
      if (pick === null) pickSent = null;
      else if (pick !== pickSent) {
        transport.send({ t: "pickTown", town: pick });
        pickSent = pick;
      }

      // Manning a post = feet planted (one body, one job — plans/14).
      // Otherwise, normal movement.
      const move: BakerInput =
        debugInput ?? deriveMove(manned !== null, input.keys, input.yaw);
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
      // Phase-gated (slice 4, found live): the lobby's DORMANT order has
      // no 1Hz correction (room.ts gates it), so an ungated prediction
      // free-ran the lobby clock down with nothing to correct it.
      // Invisible (the lobby HUD hides the order) but dishonest state.
      if (view.run.phase === "running") view.order = predictClock(view.order);

      // Local visual projectile sim: advances the SHARED world (after
      // Baker.step registered its movement); markers + splat readout only.
      shotsView.step(view.dessert, flash);

      // THE RUN'S EDGES (plans/13): rung 1 deals the moment the countdown
      // holds — a baker readied in town 0's circle while ASSIGNED to town
      // 1 is carried home, same law as the mid-run deal edge below.
      if (view.run.phase === "running" && lastRunPhase !== "running") {
        if (depthIntoTown(view.yourTown, baker.position()) <= 0) {
          const home = TOWNS[view.yourTown] ?? TOWNS[0]!;
          baker.teleport(home.spawn);
          input.yaw = (home.facingDeg * Math.PI) / 180;
          flash("the run begins — you were carried home to your town!", 5000);
        }
      }
      lastRunPhase = view.run.phase;

      if (banner) {
        if (view.run.phase === "runover") {
          // THE RUN REPORT (plans/13): replaces the order banner; the
          // loss's photo stays hung — the filthy floor is the trophy.
          bannerShown = true;
          banner.style.display = "flex";
          banner.textContent = runOverText(
            view.run.rung,
            view.run.won ?? false,
            view.run.ultra ?? false,
          );
        } else if (view.run.phase !== "running") {
          // The lobby (or the countdown): everything comes down. No deal
          // edge fired here — the run start deals fresh and the latch
          // below picks that up in the running phase.
          if (bannerShown) {
            bannerShown = false;
            banner.style.display = "none";
            if (snapEl) snapEl.style.display = "none";
          }
        } else {
        const b = bannerLatch(view.order.status, bannerShown);
        if (b === "show") {
          bannerShown = true;
          // The linger countdown, predicted locally off ORDER_RESET_TICKS
          // (advisory, like predictClock — the deal itself is server
          // truth). A mid-linger JOINER over-reads by however deep the
          // server already is; the carry-home below still fires on time.
          lingerTicks = ORDER_RESET_TICKS;
          banner.style.display = "flex";
          // THE SHUTTER (dessert report): one photo of the dessert as the
          // Giant judged it, hung in the corner for the linger. Taken on
          // the show edge — linger shots happen AFTER the photo, exactly
          // as they happen after the frozen verdict.
          if (snapEl && snapImg) {
            snapImg.src = snapshot.take(scene);
            snapEl.style.display = "block";
          }
        } else if (b === "hide") {
          // The room dealt a fresh order — clear the slate.
          bannerShown = false;
          banner.style.display = "none";
          if (snapEl) snapEl.style.display = "none"; // the photo comes down
          // THE CARRY-HOME LAW (visionary, 2026-07-07): the deal PLACES a
          // baker who isn't in his town at his town's spawn — the linger
          // banner warned him first. Client-side like all baker movement
          // (plans/02); the gate then latches shut behind him as usual.
          if (depthIntoTown(view.yourTown, baker.position()) <= 0) {
            const home = TOWNS[view.yourTown] ?? TOWNS[0]!;
            baker.teleport(home.spawn);
            input.yaw = (home.facingDeg * Math.PI) / 180;
            flash("the order landed — you were carried home to your town!", 5000);
          }
        }
        if (bannerShown) {
          // Re-worded every tick: the countdown + the away warning live.
          lingerTicks = Math.max(0, lingerTicks - 1);
          banner.textContent = bannerText(
            view.order,
            view.checks,
            view.verdict,
            view.dessert.topTier,
            {
              seconds: Math.ceil(lingerTicks / 60),
              away: depthIntoTown(view.yourTown, baker.position()) <= 0,
              // A lost order ends the run (plans/13): no deal follows this
              // linger — the banner must not promise one.
              runEnds: view.order.status === "lost",
            },
          );
          // Caption rides the same cadence: the verdict can land a beat
          // after the show edge (its broadcast races the status flip).
          if (snapCaption) snapCaption.textContent = snapshotCaption(view.verdict);
        }
        }
      }
      accumulator -= FIXED_DT;
    }

    // --- Render state ---
    const p = baker.position();
    camera.position.set(p.x, p.y + EYE_HEIGHT_OFFSET, p.z);
    camera.rotation.set(input.pitch, input.yaw, 0);

    // Every fort's rig animates from its broadcast state; only YOUR rig
    // speaks — the far crew's screw must not flash your HUD.
    gs.rigs.forEach((rig, i) => {
      const tm = view.machines[i];
      if (!tm) return;
      rig.update(
        tm,
        i === view.yourTown
          ? (notch) => {
              const dir = notch > rig.shownTiltNotch ? "raised" : "lowered";
              // No ladder here (visionary call 2026-07-08): while dialing,
              // the screw prompt already shows the full glyph.
              flash(
                `CLUNK — arc ${dir} to +${notch * TILT_DEG_PER_NOTCH}°`,
                2500,
              );
            }
          : () => {},
      );
    });
    heldMesh.visible = view.carrying !== null;
    if (view.carrying !== null)
      (heldMesh.material as THREE.MeshStandardMaterial).color.setHex(
        TOPPING_COLORS[view.carrying] ?? 0xffffff,
      );

    ghosts.update();
    shotsView.sync();
    // The portcullis panel shows exactly while its fence is shut — the
    // fence must never be an invisible wall.
    gs.gateMeshes.forEach((m, i) => {
      m.visible = gates.isClosed(i);
    });
    // The ready circle shows whenever the run is not live (plans/13) —
    // the standing invitation to start (or restart) it.
    gs.setReadyCircle(view.run.phase !== "running");

    if (hud) {
      hud.textContent = hudLines({
        order: view.order,
        checks: view.checks,
        run: view.run,
        topTier: view.dessert.topTier,
        machine: myMachine(view).machine,
        crankTicks: myMachine(view).crankTicks,
        carrying: view.carrying,
        netStatus: view.netStatus,
        ghostCount: ghosts.count,
        myId: view.myId,
        locked: document.pointerLockElement === canvas,
        target,
        flash: now < flashUntil ? flashMsg : null,
        manned,
        // The invite YIELDS to an actionable crosshair target (one press,
        // one meaning): resolveEEdge would give E to the interaction, so
        // promising a man here would lie. Non-actionable prompts ("hands
        // empty — fetch a topping") coexist with the invite honestly.
        nearPost:
          nearPostShown !== null &&
          !interactionActs(
            target,
            view.carrying,
            myMachine(view).machine.loaded,
          )
            ? nearPostShown
            : null,
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
      getMachine: () => ({
        ...myMachine(view).machine,
        crankTicks: myMachine(view).crankTicks,
      }),
      getYourTown: () => view.yourTown,
      getMachines: () =>
        view.machines.map((m) => ({ ...m.machine, crankTicks: m.crankTicks })),
      getTarget: () => target,
      getManned: () => manned,
      getNearPost: () => nearPostShown,
      getOrder: () => ({ ...view.order }),
      getRun: () => ({ ...view.run }),
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
      // setGrainCount lived here 2026-07-03..07-07: the density-review
      // knob whose own contract said "the number gets PINNED in
      // game/toppings.ts and this knob's job is done." It is (grains: 40,
      // confirmed 2026-07-06) — the knob retired with the review (audit
      // 2026-07-07). A future density review re-adds it from the TUNNEL
      // commit's parent, loopback-guarded as before.
      //
      // The fork-2 purchase's dev stand-in (plans/11 §1): activates the
      // dormant second town. Safe over the net — it is an INPUT the Room
      // applies authoritatively, not a module mutation — which is what
      // the dev-toggle friend test needs.
      unlockTown2: () => transport.send({ t: "unlockTown2" }),
      // THE LOOPBACK ROOM SEAM (slice 4b live-verify; jumpToRung culture):
      // solo/dev only — null over ws. Lets a verification script BUILD
      // state (paint, ledger entries, a rung jump) the way the room tests'
      // private seams do, while play itself still speaks protocol.
      room: loopRoom,
    };
  }
}

main().catch((err: unknown) => {
  console.error("boot failed:", err);
  const hud = document.getElementById("hud");
  if (hud) hud.textContent = `Boot failed: ${String(err)}`;
});
