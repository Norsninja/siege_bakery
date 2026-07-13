/**
 * The scene — renderer, camera, arena visuals, the machine rig, and the
 * interactable meshes (M4 of the decomp phase, plans/06). Extracted
 * verbatim from main.ts. Visuals mirror core/arena's physics definitions
 * exactly; nobody duplicates geometry.
 *
 * MachineRig owns the greybox machine and its per-frame animation from the
 * MatchView: traverse yaw, rear-pivot tilt (plans/04 — tail planted, nose
 * lifts, the jack post extends as the analog gauge), winch-bent arm, drum
 * spin, the loaded topping, and the CLUNK flash the moment a notch engages.
 */
import * as THREE from "three";
import {
  WALLS,
  WALL_HEIGHT,
  CAKE_Z,
  TOWNS,
  GATE_HALF_WIDTH,
  GROUND_HALF_X,
  GROUND_HALF_Z,
  GROUND_CENTER_Z,
  PANTRY_HALF,
  PLINTH_HALF,
  READY_CIRCLE,
  SHOP_HALF,
  type Town,
  type WallDef,
} from "../core/arena";
import type { Vec3 } from "../core/ballistics";
import { PRACTICE_STAND, type DessertSpec } from "../core/dessert";
import {
  CRANK_TICKS_PER_CLICK,
  TENSION_MAX_CLICKS,
  SCREW_TICKS_PER_NOTCH,
  TILT_DEG_PER_NOTCH,
  TILT_MAX_NOTCH,
} from "../game/catapult";
import type { TownMachine } from "../game/protocol";
import { loadModel } from "./assets";
import { MACHINE_CONTROL_KINDS, type InteractableKind } from "./hud";
import { POST_SPOTS } from "./posts";

export const TOPPING_COLORS: Record<string, number> = {
  cherry: 0xc23b4e,
  lime: 0x77c34f,
  frosting: 0xfff0f5,
  sprinkles: 0xb45fd6,
  fudge: 0x4a2c17,
};

/** Town identity colors (visionary, 2026-07-07): town 0 flies red, town 1
 * blue — the FIRST distinguishing feature between the forts. Indexed like
 * TOWNS. The color-by-town seam plans/11 §9 reserves (trails, splats,
 * ghost tint) should read THIS table when it lands, so identity stays one
 * definition. */
export const TOWN_COLORS = [0xd8452e, 0x3a6ed8] as const;

/** Sponge paling toward the summit (setDessert's ramp). EXPORTED for
 * the eat beat's stand-in proxy (plans/16 slice 7): the proxy must
 * visibly BE the cake, so it reads this same table; when the FLAVORS
 * ruling lands both swap together. */
export const TIER_COLORS = [0xd8a45c, 0xe2b876, 0xefd39a] as const;

const box = (
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number,
  parent: THREE.Object3D,
): THREE.Mesh => {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color }),
  );
  m.position.set(x, y, z);
  parent.add(m);
  return m;
};

export const sphere = (
  r: number,
  color: number,
  x: number,
  y: number,
  z: number,
  parent: THREE.Object3D,
): THREE.Mesh => {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 16, 12),
    new THREE.MeshStandardMaterial({ color }),
  );
  m.position.set(x, y, z);
  parent.add(m);
  return m;
};

/** Authored width of one wall.glb stone section (the meshy road,
 * 2026-07-11): the .blend conforms depth (0.5 m) and height (1 m,
 * WALL_HEIGHT) to the wall colliders exactly — the render contract —
 * and the width is the tiling unit. */
export const WALL_SEG_LEN = 1.899;

export interface WallSegment {
  x: number;
  z: number;
  rotY: number;
  scaleX: number;
}

/** THE WALL TILING (pure — the painter in buildGameScene stays thin):
 * each collider slab is covered by an integer count of stone sections,
 * width-stretched to land exactly on the slab's length (the chunky style
 * forgives ±a third of a block). z-running walls turn the section a
 * quarter; alternate sections yaw-flip so the repeating block pattern
 * doesn't read as wallpaper. */
export function wallSegments(
  walls: readonly WallDef[],
  segLen = WALL_SEG_LEN,
): WallSegment[] {
  const out: WallSegment[] = [];
  for (const w of walls) {
    const alongX = w.hx >= w.hz;
    const len = (alongX ? w.hx : w.hz) * 2;
    const n = Math.max(1, Math.round(len / segLen));
    for (let s = 0; s < n; s++) {
      const off = ((s + 0.5) / n - 0.5) * len;
      out.push({
        x: w.x + (alongX ? off : 0),
        z: w.z + (alongX ? 0 : off),
        rotY: (alongX ? 0 : Math.PI / 2) + (s % 2 ? Math.PI : 0),
        scaleX: len / n / segLen,
      });
    }
  }
  return out;
}

/** THE BACKDROP TREATMENT (the region slice, 2026-07-11 — pure, pinned):
 * region.glb/sky.glb mesh names carry their atmosphere in a prefix.
 * near_/mid_ stay LIT and participate in scene fog like the forts do;
 * far_/sky_ go UNLIT and fog-EXEMPT — their haze is baked into vertex
 * colors (the concept art paints its own air; scene fog would erase
 * anything past its far distance). Unknown names default lit — a new
 * mesh degrades to "normal object", never to invisible. */
export type BackdropTreatment = "lit" | "unlit";
export function backdropTreatment(name: string): BackdropTreatment {
  return name.startsWith("far_") || name.startsWith("sky_") ? "unlit" : "lit";
}

/** Apply the treatment to a loaded backdrop template in place: unlit
 * meshes swap to a fogless vertex-color basic material (their glTF
 * materials are placeholders — the .blend authors color in COLOR_0). */
/** THE STALL DRESS placements (prop_stall, the counter law): the model is
 * authored at the origin — base on the ground, counter block COINCIDING
 * with core's SHOP_HALF collider box, local +x facing the walkway. The
 * anchor is the counter's ground center; town 1's 180° turn points the
 * awning back at ITS ferry leg (the fort rotation, plans/11 §3). */
export function stallPlacements(
  towns: readonly Town[],
): Array<{ x: number; z: number; rotY: number }> {
  return towns.map((t) => ({
    x: t.shop.x,
    z: t.shop.z,
    rotY: t.facingDeg === 0 ? 0 : Math.PI,
  }));
}

export function dressBackdrop(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    if (backdropTreatment(o.name) === "unlit") {
      o.material = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
    }
  });
}

/** Remove a TRANSIENT object from its parent and free its GPU resources
 * (checkpoint audit 2026-07-03: nothing in the client disposed anything —
 * consumed globs, evicted ground splats, landing rings, and departed
 * ghosts churned geometries for the whole session). Traverses children;
 * every transient mesh in this client owns its own geometry/material, so
 * disposal is safe. Session-lifetime objects (arena, rig, the frosting
 * InstancedMesh) never come through here. */
export function removeAndDispose(obj: THREE.Object3D): void {
  obj.parent?.remove(obj);
  obj.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      const mat: THREE.Material | THREE.Material[] = o.material;
      if (Array.isArray(mat)) for (const m of mat) m.dispose();
      else mat.dispose();
    }
  });
}

export class MachineRig {
  readonly group: THREE.Group; // yaw (traverse) only
  private readonly tiltFrame: THREE.Group;
  private readonly armPivot: THREE.Group;
  private readonly screwGroup: THREE.Group;
  readonly bucketMesh: THREE.Mesh;
  readonly toppingMesh: THREE.Mesh;
  readonly wheelMesh: THREE.Mesh;
  readonly drumMesh: THREE.Mesh;
  readonly winchHandle: THREE.Mesh;
  readonly leverStick: THREE.Mesh;
  readonly leverKnob: THREE.Mesh;
  readonly screwPost: THREE.Mesh;
  readonly screwHandle: THREE.Mesh;
  /** THE DRIVE NODES — update() speaks only to these. They start as the
   * greybox parts (fallback law: no model, same machine as ever) and
   * dress() re-points them at the catapult.glb nodes; the update math is
   * identical either way because the model is AUTHORED on the sim's
   * pivot scaffold (catapult.blend: same pivots, same rest dimensions). */
  private tiltNode: THREE.Object3D;
  private armNode: THREE.Object3D;
  private drumNode: THREE.Object3D;
  private postNode: THREE.Object3D;
  private handleNode: THREE.Object3D;
  /** THE GIMBAL BASKET (visionary ruling 2026-07-11): the model's dish
   * hangs on its own hinge; update() counter-rotates it against tilt +
   * arm so the bowl stays LEVEL IN THE WORLD and visibly cradles the
   * topping at every tension. Greybox has no hinge — null keeps it off. */
  private scoopNode: THREE.Object3D | null = null;
  /** The jack handle's authored rest height — greybox 0.62, model 0.66;
   * captured so the postScale reposition works for either body. */
  private handleRestY = 0.62;
  private lastTiltNotch = 0;
  private totalCrankSpins = 0; // visual-only: winch drum angle
  private lastCrankTicks = 0;
  /** The town's facing (plans/11 §4): the rig's whole yaw is facing +
   * traverse, exactly the ballistics composition — the machine LOOKS
   * where it throws. */
  private readonly facingRad: number;

  constructor(scene: THREE.Scene, base: Vec3, facingDeg: number) {
    this.facingRad = (facingDeg * Math.PI) / 180;
    this.group = new THREE.Group();
    this.group.position.set(base.x, base.y, base.z);
    // BORN FACING ITS THROW (playtest 2026-07-07): a dormant town's rig
    // gets no update() until its machine broadcasts exist, so the
    // constructor must leave an honest idle machine — faced like its
    // ballistics, dish empty. Before this, town 1's rig stood cockeyed
    // (rotation 0 = backwards) with the construction-default red ball
    // visible in the bucket.
    this.group.rotation.y = this.facingRad;
    scene.add(this.group);

    // CREW POST CIRCLES (plans/14, feel test round 2): flat translucent
    // GREEN circles ON the ground — stand-here game furniture, visually
    // nothing like the machine's wood and iron (the opaque stones read
    // as machine parts and invited nobody). Drawn from posts.ts's own
    // table so zones and circles cannot drift. A SIBLING group,
    // facing-only — this.group swings with TRAVERSE, and the crew's
    // footing must not swing with the wheel.
    const stones = new THREE.Group();
    stones.position.set(base.x, base.y, base.z);
    stones.rotation.y = this.facingRad;
    scene.add(stones);
    for (const spot of POST_SPOTS) {
      const stone = new THREE.Mesh(
        new THREE.CircleGeometry(spot.r, 32),
        new THREE.MeshBasicMaterial({
          color: 0x3ecf5a,
          transparent: true,
          opacity: 0.35,
          depthWrite: false, // translucency must not hole the ground
        }),
      );
      stone.rotation.x = -Math.PI / 2;
      stone.position.set(spot.x, 0.02, spot.z); // just above the slab: no z-fight
      stones.add(stone);
    }

    // The FRAME tilts; its pivot sits at the REAR ground contact so the
    // tail stays planted on the plinth and the NOSE visibly lifts (a
    // jacked-up machine, not a see-saw — playtest note 2026-07-03).
    this.tiltFrame = new THREE.Group();
    this.tiltFrame.position.set(0, 0, 0.7);
    this.group.add(this.tiltFrame);

    box(1.4, 0.25, 1.4, 0x6e5233, 0, 0.125, -0.7, this.tiltFrame); // carriage
    this.armPivot = new THREE.Group();
    this.armPivot.position.set(0, 0.3, -0.25);
    this.tiltFrame.add(this.armPivot);
    box(0.12, 1.5, 0.12, 0x8a6b45, 0, 0.75, 0, this.armPivot); // throwing arm
    this.bucketMesh = box(0.34, 0.16, 0.34, 0x4a4a55, 0, 1.5, 0, this.armPivot);
    this.toppingMesh = sphere(0.16, 0xc23b4e, 0, 1.66, 0, this.armPivot);
    this.toppingMesh.visible = false; // an idle machine's dish is empty

    this.wheelMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.08, 20),
      new THREE.MeshStandardMaterial({ color: 0x8a6b3d }),
    );
    this.wheelMesh.rotation.z = Math.PI / 2;
    this.wheelMesh.position.set(-0.8, 0.45, -0.7);
    this.tiltFrame.add(this.wheelMesh);

    const winchGroup = new THREE.Group();
    winchGroup.position.set(0.8, 0.45, -0.55);
    this.tiltFrame.add(winchGroup);
    this.drumMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.4, 12),
      new THREE.MeshStandardMaterial({ color: 0x50505c }),
    );
    this.drumMesh.rotation.z = Math.PI / 2;
    winchGroup.add(this.drumMesh);
    this.winchHandle = box(0.05, 0.3, 0.05, 0x8a6b3d, 0.24, 0.15, 0, winchGroup);

    const leverGroup = new THREE.Group();
    leverGroup.position.set(0.55, 0.15, -1.45);
    this.tiltFrame.add(leverGroup);
    this.leverStick = box(0.06, 0.55, 0.06, 0x777788, 0, 0.28, 0, leverGroup);
    this.leverKnob = sphere(0.09, 0xc23b4e, 0, 0.58, 0, leverGroup);

    // The elevation screw AT THE FRONT (plans/04): a great ugly dwarven
    // jack. It stays PLANTED on the plinth (child of the machine, not the
    // frame) and its post EXTENDS to hold the lifted nose.
    const screwGroup = new THREE.Group();
    screwGroup.position.set(-0.55, 0, -0.75);
    this.group.add(screwGroup);
    this.screwGroup = screwGroup;
    this.screwPost = box(0.1, 0.6, 0.1, 0x5a5a66, 0, 0.3, 0, screwGroup);
    this.screwHandle = box(0.4, 0.06, 0.06, 0x8a6b3d, 0, 0.62, 0, screwGroup);

    // Drive nodes start greybox (the fallback IS the machine until — and
    // unless — catapult.glb dresses it).
    this.tiltNode = this.tiltFrame;
    this.armNode = this.armPivot;
    this.drumNode = this.drumMesh;
    this.postNode = this.screwPost;
    this.handleNode = this.screwHandle;
  }

  /**
   * THE MACHINE DRESSES (plans/16, the hand road): swap the greybox for
   * the catapult.glb body. The model is authored ON the sim's pivot
   * scaffold with NOSE = +Y Blender (art bible: machines map 1:1 into
   * rig space — no runtime flip, no mirror), so update()'s absolute
   * rotations drive its named nodes unchanged. Clones share the cached
   * template's geometry/materials (the ghosts' law: never dispose).
   * Any missing node aborts — greybox forever (assetless-boot law).
   */
  dress(template: THREE.Object3D): void {
    const model = template.clone();
    const tilt = model.getObjectByName("tilt_frame");
    const arm = model.getObjectByName("arm_pivot");
    const scoop = model.getObjectByName("scoop_pivot");
    const drum = model.getObjectByName("winch_drum");
    const post = model.getObjectByName("screw_post");
    const handle = model.getObjectByName("screw_handle");
    if (!tilt || !arm || !scoop || !drum || !post || !handle) return;
    // The greybox retires by VISIBILITY, never disposal — it is the
    // standing fallback and the raycast proxies live on.
    this.tiltFrame.visible = false;
    this.screwGroup.visible = false;
    // The bucket is the one machine part still on the crosshair (walk-up
    // load): its raycast proxy and the topping visual move INTO the dish
    // so the aim point rides the arm honestly. Raycaster ignores
    // visibility — the invisible proxy still catches the crosshair.
    const seatY = model.getObjectByName("topping_seat")?.position.y ?? 0.2;
    scoop.add(this.toppingMesh);
    this.toppingMesh.position.set(0, seatY, 0);
    scoop.add(this.bucketMesh);
    this.bucketMesh.position.set(0, seatY - 0.12, 0);
    this.bucketMesh.visible = false;
    // Re-point the drives; update() carries on with the same math.
    this.tiltNode = tilt;
    this.armNode = arm;
    this.scoopNode = scoop;
    this.drumNode = drum;
    this.postNode = post;
    this.handleNode = handle;
    this.handleRestY = handle.position.y;
    this.group.add(model);
  }

  /** Per-frame animation from THIS town's machine state. `clunk` fires
   * the moment a notch engages — the CLUNK is the readout (main.ts passes
   * a real callback only for the LOCAL town's rig; the far fort's screw
   * must not flash your HUD). */
  update(tm: TownMachine, clunk: (notch: number) => void): void {
    this.group.rotation.y =
      this.facingRad + (tm.machine.traverseDeg * Math.PI) / 180;
    // Partial screw progress previews the coming notch; post height is the
    // analog gauge.
    const tiltDeg = Math.min(
      TILT_MAX_NOTCH * TILT_DEG_PER_NOTCH,
      Math.max(
        0,
        (tm.machine.tiltNotch + tm.screwTicks / SCREW_TICKS_PER_NOTCH) *
          TILT_DEG_PER_NOTCH,
      ),
    );
    const tiltRad = (tiltDeg * Math.PI) / 180;
    this.tiltNode.rotation.x = tiltRad;
    const noseLift = 1.45 * Math.sin(tiltRad); // nose height at the screw
    const postScale = (0.6 + noseLift) / 0.6;
    this.postNode.scale.y = postScale;
    this.postNode.position.y = 0.3 * postScale;
    this.handleNode.position.y = this.handleRestY * postScale + 0.02;
    this.handleNode.rotation.y = tm.screwTicks * 0.3; // the jack handle works
    if (tm.machine.tiltNotch !== this.lastTiltNotch) {
      clunk(tm.machine.tiltNotch);
      this.lastTiltNotch = tm.machine.tiltNotch;
    }
    const tensionFrac =
      (tm.machine.tensionClicks + tm.crankTicks / CRANK_TICKS_PER_CLICK) /
      TENSION_MAX_CLICKS;
    const armRad = 0.5 + tensionFrac * 0.7; // arm winches down and back
    this.armNode.rotation.x = armRad;
    // The gimbal basket hangs level IN THE WORLD: counter the whole
    // pitch chain (frame tilt + arm) so the dish cradles the topping at
    // every tension (visionary ruling 2026-07-11).
    if (this.scoopNode) this.scoopNode.rotation.x = -(tiltRad + armRad);
    if (tm.crankTicks !== this.lastCrankTicks) {
      this.totalCrankSpins += 1;
      this.lastCrankTicks = tm.crankTicks;
    }
    this.drumNode.rotation.x = this.totalCrankSpins * 0.05;
    this.toppingMesh.visible = tm.machine.loaded !== null;
    if (tm.machine.loaded !== null)
      (this.toppingMesh.material as THREE.MeshStandardMaterial).color.setHex(
        TOPPING_COLORS[tm.machine.loaded] ?? 0xc23b4e,
      );
  }

  /** Was the machine notched when this rig last drew it? (test/debug) */
  get shownTiltNotch(): number {
    return this.lastTiltNotch;
  }

  /** The frame tilt the player SEES, radians (test/debug) — the render
   * contract pins it to the sim's tilt law (scene.test.ts): the ball's
   * arc is real ballistics, so a frame that tilted differently would
   * teach the machine wrong. */
  get shownTiltRad(): number {
    return this.tiltNode.rotation.x;
  }
}

export interface GameScene {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** One rig per town, indexed like TOWNS/machines (plans/11 §10 step 8). */
  rigs: MachineRig[];
  /** One gate panel per town, indexed like TOWNS — visible exactly while
   * that town's fence is shut (client/gates.ts; main.ts syncs it). The
   * translucent panel is the greybox portcullis: the fence must never be
   * an invisible wall. */
  gateMeshes: THREE.Mesh[];
  /** What's in the baker's hands, rendered at the bottom of the view. */
  heldMesh: THREE.Mesh;
  /** The LOCAL town's interactables — what E can grab. Re-pointed by
   * bindTown; the far fort's controls are scenery to this player (their
   * inputs would drive the local machine — owner-implicit — so offering
   * them would be a lie). */
  interactables: Record<InteractableKind, THREE.Mesh[]>;
  raycastTargets: THREE.Mesh[];
  kindOf: Map<THREE.Object3D, InteractableKind>;
  setHighlight(kind: InteractableKind | null): void;
  /** The lobby's ready circle (plans/13): shown whenever the run is NOT
   * live — the standing invitation to start (or restart) the run. */
  setReadyCircle(visible: boolean): void;
  /** THE DESSERT REBIND, visuals half (spec refactor, plans/13 §3): the
   * deal's spec replaces the cake meshes — tiers for a dessert, the
   * wooden plank for the practice target (item 25). Every bindDessert. */
  setDessert(spec: DessertSpec): void;
  /** Target town `t`'s rig + pantry (welcome, or an honored pickTown). */
  bindTown(t: number): void;
}

export function buildGameScene(canvas: HTMLCanvasElement): GameScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b5e5);
  // THE REGION's atmosphere (2026-07-11): fog reached 60→120 when the
  // world ENDED at 120 — with a real backdrop the air recedes to 80→280
  // so the mid-ground hamlets sit in the gradient instead of behind it.
  // (Side effect for the eye pass: the far fort reads clearer than the
  // old fog showed it.) far_/sky_ meshes opt OUT of fog entirely — their
  // haze is BAKED into vertex colors, the concept art's own painted air.
  scene.fog = new THREE.Fog(0x87b5e5, 80, 280);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    // 500, was 200: the mountain rings stand at 250–350 and the sky dome
    // at ~430 — all beyond the old plane (the region slice, 2026-07-11).
    500,
  );
  camera.rotation.order = "YXZ"; // yaw, then pitch — the FPS rig

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
  sun.position.set(8, 14, 6);
  scene.add(sun);

  // Arena visuals mirror core/arena's physics definitions exactly. BOTH
  // forts render (towns slice step 1): every static collider has a mesh —
  // the render contract. Crew gear (crates, pennant, machine rig) stays
  // town-0-only until the client's two-town step (plans/11 §10 step 8).
  box(GROUND_HALF_X * 2, 0.2, GROUND_HALF_Z * 2, 0x7a9e6b,
    0, -0.1, GROUND_CENTER_Z, scene); // ground — spans both forts
  // THE REGION (plans/16, 2026-07-11): the world beyond the walls —
  // meadow skirt, the giants' road, hamlets, ranges, the dwarf castle in
  // the hero mountain, and a sky dome with clouds. Pure backdrop: no
  // colliders, no gameplay, zero systems. Both load through the seam;
  // null keeps today's green-slab-and-fog look forever (fallback law).
  for (const name of ["region", "sky"]) {
    void loadModel(name).then((t) => {
      if (!t) return;
      dressBackdrop(t);
      scene.add(t);
    });
  }

  // THE WALLS DRESS (meshy road, wall.glb 0.34 MB): stone sections tile
  // every collider slab per wallSegments(). The grey slabs retire by
  // VISIBILITY, never disposal — the standing fallback (null from the
  // seam keeps them forever, a normal Tuesday). Clones share the cached
  // template's geometry/materials (the ghosts' law: never dispose).
  const wallSlabs = WALLS.map((w) =>
    box(w.hx * 2, WALL_HEIGHT, w.hz * 2, 0x9a9a9a, w.x, WALL_HEIGHT / 2, w.z, scene),
  );
  void loadModel("wall").then((t) => {
    if (!t) return;
    for (const seg of wallSegments(WALLS)) {
      const m = t.clone();
      m.position.set(seg.x, 0, seg.z);
      m.rotation.y = seg.rotY;
      m.scale.x = seg.scaleX;
      scene.add(m);
    }
    for (const slab of wallSlabs) slab.visible = false;
  });
  for (const t of TOWNS) {
    box(PANTRY_HALF.x * 2, PANTRY_HALF.y * 2, PANTRY_HALF.z * 2, 0xb98a4a,
      t.pantry.x, t.pantry.y, t.pantry.z, scene);
    box(PLINTH_HALF.x * 2, PLINTH_HALF.y * 2, PLINTH_HALF.z * 2, 0x5a5a66,
      t.plinth.x, t.plinth.y, t.plinth.z, scene);
  }
  // The dessert: ROUND tiers from the DEAL's spec (plans/13 §3 — was the
  // module-level CAKE_TIERS), sponge paling toward the summit so the climb
  // is READABLE from the catapult. Rebuilt by setDessert at every rebind;
  // main seeds it from the placeholder view before the first frame.
  // THE PRACTICE TARGET (plans/15 item 25 as re-ruled): the visionary's
  // wood_target_lg model dresses PRACTICE_STAND's authored boxes — the
  // SAME rows the sim builds colliders from, so what you see is what
  // bounces. Greybox stands until the GLB lands and forever when it
  // can't (abort-to-greybox law); the swap is VISIBILITY, stall-dress
  // culture — the model loads once and toggles with the phase.
  let cakeMeshes: THREE.Mesh[] = [];
  let targetModel: THREE.Group | null = null;
  let practiceBound = false;
  void loadModel("target").then((t) => {
    if (!t) return; // the greybox stand carries — a normal Tuesday
    targetModel = t;
    t.scale.setScalar(PRACTICE_STAND.scale);
    // Feet to the plate; the painted face already looks +z (town 0).
    t.position.set(0, PRACTICE_STAND.lift, CAKE_Z);
    t.visible = practiceBound;
    scene.add(t);
    // A practice greybox may be standing right now — retire it.
    if (practiceBound) for (const m of cakeMeshes) m.visible = false;
  });
  const setDessert = (spec: DessertSpec): void => {
    for (const m of cakeMeshes) removeAndDispose(m);
    cakeMeshes = [];
    practiceBound = spec.id === "practice";
    if (targetModel) targetModel.visible = practiceBound;
    if (practiceBound) {
      if (targetModel) return; // the model IS the stand
      const { board, legs, rail } = PRACTICE_STAND;
      const boardY = (board.bottom + board.top) / 2;
      cakeMeshes = [
        // The framed board — its painted face greets town 0 (+z).
        box(board.halfW * 2, board.top - board.bottom, board.halfT * 2,
          0x9a7648, 0, boardY, CAKE_Z, scene),
        // The painted "cupcake" — a pale square the greybox aims at.
        box(board.halfW * 1.1, board.halfW * 1.1, 0.06, 0xefd7b8,
          0, boardY, CAKE_Z + board.halfT + 0.03, scene),
        // Legs + foot rail: it STANDS on the plate.
        box(legs.halfW * 2, legs.top - legs.bottom, legs.halfT * 2,
          0x6f5230, -legs.x, (legs.bottom + legs.top) / 2, CAKE_Z, scene),
        box(legs.halfW * 2, legs.top - legs.bottom, legs.halfT * 2,
          0x6f5230, legs.x, (legs.bottom + legs.top) / 2, CAKE_Z, scene),
        box(rail.halfW * 2, rail.top - rail.bottom, rail.halfT * 2,
          0x6f5230, 0, (rail.bottom + rail.top) / 2, CAKE_Z, scene),
      ];
      return;
    }
    cakeMeshes = spec.tiers.map((t, i) => {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(t.radius, t.radius, t.top - t.bottom, 48),
        new THREE.MeshStandardMaterial({
          // Paling toward the summit whatever the height: reuse the ramp,
          // clamp past its end (a 5-tier cake's upper tiers read palest).
          color: TIER_COLORS[Math.min(i, TIER_COLORS.length - 1)]!,
        }),
      );
      m.position.set(0, (t.top + t.bottom) / 2, CAKE_Z);
      scene.add(m);
      return m;
    });
  };
  // Crossing stripes — each town's pantry↔machine run gets its own.
  for (const t of TOWNS)
    for (let i = 0; i <= 4; i++) {
      const z = t.plinth.z + ((t.pantry.z - t.plinth.z) * i) / 4;
      box(3, 0.02, 0.15, 0xdddddd, 0, 0.01, z, scene);
    }

  // Every fort gets its full crew station (rig, pennant, crates) — the
  // 180° rotation flips local offsets by `s`, so each crew's "left is
  // left" holds for the furniture too (plans/11 §3).
  const rigs: MachineRig[] = [];
  // THE MACHINE DRESSES (plans/16, the hand road): one fetch through the
  // seam, every rig clones the template. Null (headless/missing/broken)
  // leaves the greybox machines — a normal Tuesday.
  void loadModel("catapult").then((t) => {
    if (t) for (const rig of rigs) rig.dress(t);
  });
  const townInteractables: Array<Record<InteractableKind, THREE.Mesh[]>> = [];
  const stallSlabs: THREE.Mesh[][] = [];
  // THE HIGHLIGHT FOLLOWS THE DRESS (2026-07-12): when a greybox
  // interactable is dressed with a GLB, the invisible proxy keeps
  // CATCHING the crosshair (raycast, the dish-proxy law) but the GLOW
  // must move to the visible model — else pointing at a dressed prop
  // detects with no light (the regression the visionary caught on the
  // stall). Per town, per kind: the meshes setHighlight actually glows,
  // overriding the greybox when a dress registers here. The pattern the
  // pantry/future dresses reuse. */
  const townGlow: Array<Partial<Record<InteractableKind, THREE.Mesh[]>>> =
    TOWNS.map(() => ({}));
  let boundTown = 0;
  for (let ti = 0; ti < TOWNS.length; ti++) {
    const t = TOWNS[ti]!;
    const rig = new MachineRig(scene, t.base, t.facingDeg);
    rigs.push(rig);
    const s = t.facingDeg === 0 ? 1 : -1; // rotate local offsets with the fort
    // The pennant stands BESIDE THE MACHINE (visionary, 2026-07-03): the
    // wind instrument you read from the firing position — when wind
    // arrives, this flag is the forecast. It flies the TOWN'S color
    // (TOWN_COLORS — red home, blue away): the one distinguishing feature
    // between the forts until the art pass.
    box(0.06, 2.4, 0.06, 0xefe3d0, t.plinth.x + 1.8 * s, 1.2, t.plinth.z - 0.6 * s, scene);
    box(0.7, 0.3, 0.02, TOWN_COLORS[ti] ?? TOWN_COLORS[0], t.plinth.x + 2.18 * s, 2.2, t.plinth.z - 0.6 * s, scene);
    // Pantry crates — the ammo. E takes ONE; you carry it by hand. Five
    // crates since the projectile pass (plans/10): frosting first (the
    // base layer), fudge beside the garnish, the lime decoy LAST — never
    // ordered, always tempting.
    const crateY = t.pantry.y + PANTRY_HALF.y + 0.25;
    const crate = (dx: number, bodyColor: number, topping: string): THREE.Mesh[] => [
      box(0.8, 0.5, 0.7, bodyColor, t.pantry.x + dx * s, crateY, t.pantry.z, scene),
      sphere(0.2, TOPPING_COLORS[topping] ?? 0xffffff, t.pantry.x + dx * s, crateY + 0.4, t.pantry.z, scene),
    ];
    // THE SHOP STALL (plans/13 §5 as amended 2026-07-09): against the
    // side wall, halfway along the pantry↔machine ferry leg — a walk-up
    // counter with a coin on a post, greybox like everything. The
    // collider is the arena's (core owns statics); these are the visuals
    // + the crosshair's target.
    const stall: THREE.Mesh[] = [
      box(SHOP_HALF.x * 2, SHOP_HALF.y * 2, SHOP_HALF.z * 2, 0x7a5230,
        t.shop.x, t.shop.y, t.shop.z, scene),
      box(0.06, 1.1, 0.06, 0xefe3d0,
        t.shop.x, SHOP_HALF.y * 2 + 0.55, t.shop.z, scene),
      sphere(0.22, 0xd9a92a, t.shop.x, SHOP_HALF.y * 2 + 1.25, t.shop.z, scene),
    ];
    stallSlabs.push(stall);
    townInteractables.push({
      wheel: [rig.wheelMesh],
      winch: [rig.drumMesh, rig.winchHandle],
      screw: [rig.screwPost, rig.screwHandle],
      lever: [rig.leverStick, rig.leverKnob],
      bucket: [rig.bucketMesh, rig.toppingMesh],
      "shelf-frosting": crate(-1.6, 0xc9a7b8, "frosting"),
      "shelf-cherry": crate(-0.8, 0x8c3038, "cherry"),
      "shelf-sprinkles": crate(0, 0x6b4a8a, "sprinkles"),
      "shelf-fudge": crate(0.8, 0x3a2413, "fudge"),
      "shelf-lime": crate(1.6, 0x4f7a35, "lime"),
      shop: stall,
    });
  }

  // THE STALL DRESS (prop_stall, the fleet's counter law): the model's
  // counter block coincides with the SHOP_HALF collider, so the dressed
  // stall IS the solid bakers lean on. The greybox retires by VISIBILITY,
  // never disposal — the invisible proxies still catch the crosshair (the
  // dish-proxy law above), and null from the seam keeps them forever.
  // THE GLOW FOLLOWS (2026-07-12): each town's dressed clone registers as
  // that town's "shop" highlight target (materials cloned per town so one
  // fort's glow never lights another's shared material), then the current
  // town re-binds so the crosshair lights the WOOD, not the hidden box.
  void loadModel("stall").then((t) => {
    if (!t) return;
    stallPlacements(TOWNS).forEach((p, i) => {
      const m = t.clone();
      const glow: THREE.Mesh[] = [];
      m.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.material = (o.material as THREE.Material).clone(); // per-town glow
        glow.push(o);
      });
      m.position.set(p.x, 0, p.z);
      m.rotation.y = p.rotY;
      scene.add(m);
      townGlow[i]!.shop = glow;
    });
    for (const meshes of stallSlabs) for (const m of meshes) m.visible = false;
    // No re-bind needed: setHighlight resolves townGlow live each frame,
    // so the next crosshair tick lights the wood. Raycast is unchanged —
    // still the invisible proxies (the dish-proxy law holds).
  });

  // The gate panels — the greybox portcullis. Hidden while a gate stands
  // open; main.ts shows each exactly while its fence is shut.
  const gateMeshes: THREE.Mesh[] = TOWNS.map((t) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(GATE_HALF_WIDTH * 2, WALL_HEIGHT, 0.1),
      // Wood-toned, not wall-grey (eye check 2026-07-07): a shut gate must
      // read as a DOOR in the wall line, or the doorway is never learned.
      new THREE.MeshStandardMaterial({
        color: 0x8a5a2e,
        transparent: true,
        opacity: 0.75,
      }),
    );
    m.position.set(t.gate.x, WALL_HEIGHT / 2, t.gate.z);
    m.visible = false;
    scene.add(m);
    return m;
  });

  // What's in the baker's hands, rendered at the bottom of the view.
  scene.add(camera); // camera children only render if the camera is in-scene
  const heldMesh = sphere(0.12, 0xffffff, 0.28, -0.22, -0.5, camera);
  heldMesh.visible = false;

  // THE READY CIRCLE (plans/13 slice 1): the run's front door — gold
  // glass on town 0's ground, the same furniture language as the crew
  // post circles (translucent, depthWrite off). All bakers inside =
  // the countdown; visible whenever the run is not live.
  const readyCircle = new THREE.Mesh(
    new THREE.CircleGeometry(READY_CIRCLE.r, 40),
    new THREE.MeshBasicMaterial({
      color: 0xd9a92e,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );
  readyCircle.rotation.x = -Math.PI / 2;
  readyCircle.position.set(READY_CIRCLE.x, 0.02, READY_CIRCLE.z);
  scene.add(readyCircle);

  const gs: GameScene = {
    renderer,
    scene,
    camera,
    rigs,
    gateMeshes,
    heldMesh,
    interactables: townInteractables[0]!,
    raycastTargets: [],
    kindOf: new Map(),
    setReadyCircle(visible: boolean): void {
      readyCircle.visible = visible;
    },
    setDessert,
    setHighlight(kind: InteractableKind | null): void {
      // Glow the VISIBLE surface for each kind: the dressed GLB where a
      // dress registered one (townGlow), else the greybox proxy itself.
      // Raycast still rides gs.interactables (the proxy); only the light
      // moved to the model (the highlight-follows-the-dress law above).
      const glowOf = (k: InteractableKind): THREE.Mesh[] =>
        townGlow[boundTown]?.[k] ?? gs.interactables[k];
      for (const k of Object.keys(gs.interactables) as InteractableKind[])
        for (const m of glowOf(k))
          (m.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
      if (kind)
        for (const m of glowOf(kind))
          (m.material as THREE.MeshStandardMaterial).emissive.setHex(0x443300);
    },
    bindTown(t: number): void {
      gs.setHighlight(null); // drop any glow on the old town's gear
      boundTown = t;
      gs.interactables = townInteractables[t] ?? townInteractables[0]!;
      // THE CROSSHAIR SPEAKS ONLY TO THE PANTRY LOOP while the gun crew
      // runs (plans/14; review 2026-07-08): the machine's controls leave
      // the raycast — no highlight, no redirect prompt wearing an
      // interaction's costume beside the post invite. Meshes and
      // promptFor's redirect cases stay underneath, superseded-kept;
      // rollback re-admits the kinds here.
      gs.raycastTargets = [];
      gs.kindOf = new Map();
      for (const [kind, meshes] of Object.entries(gs.interactables) as Array<
        [InteractableKind, THREE.Mesh[]]
      >) {
        if (MACHINE_CONTROL_KINDS.has(kind)) continue;
        for (const m of meshes) {
          gs.raycastTargets.push(m);
          gs.kindOf.set(m, kind);
        }
      }
    },
  };
  gs.bindTown(0); // pre-welcome default; the welcome re-binds to yourTown
  return gs;
}
