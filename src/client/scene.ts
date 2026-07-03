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
  CROSS_HALF,
  WALLS,
  WALL_HEIGHT,
  MACHINE_BASE,
  CAKE_Z,
  CAKE_TIERS,
  PANTRY_POS,
  PANTRY_HALF,
  PLINTH_POS,
  PLINTH_HALF,
} from "../core/arena";
import {
  CRANK_TICKS_PER_CLICK,
  TENSION_MAX_CLICKS,
  SCREW_TICKS_PER_NOTCH,
  TILT_DEG_PER_NOTCH,
  TILT_MAX_NOTCH,
} from "../game/catapult";
import type { InteractableKind } from "./hud";
import type { MatchView } from "./state";

export const TOPPING_COLORS: Record<string, number> = {
  cherry: 0xc23b4e,
  lime: 0x77c34f,
};

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

export class MachineRig {
  readonly group: THREE.Group; // yaw (traverse) only
  private readonly tiltFrame: THREE.Group;
  private readonly armPivot: THREE.Group;
  readonly bucketMesh: THREE.Mesh;
  readonly toppingMesh: THREE.Mesh;
  readonly wheelMesh: THREE.Mesh;
  readonly drumMesh: THREE.Mesh;
  readonly winchHandle: THREE.Mesh;
  readonly leverStick: THREE.Mesh;
  readonly leverKnob: THREE.Mesh;
  readonly screwPost: THREE.Mesh;
  readonly screwHandle: THREE.Mesh;
  private lastTiltNotch = 0;
  private totalCrankSpins = 0; // visual-only: winch drum angle
  private lastCrankTicks = 0;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.position.set(MACHINE_BASE.x, MACHINE_BASE.y, MACHINE_BASE.z);
    scene.add(this.group);

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
    this.screwPost = box(0.1, 0.6, 0.1, 0x5a5a66, 0, 0.3, 0, screwGroup);
    this.screwHandle = box(0.4, 0.06, 0.06, 0x8a6b3d, 0, 0.62, 0, screwGroup);
  }

  /** Per-frame animation from the MatchView. `clunk` fires the moment a
   * notch engages — the CLUNK is the readout. */
  update(view: MatchView, clunk: (notch: number) => void): void {
    this.group.rotation.y = (view.machine.traverseDeg * Math.PI) / 180;
    // Partial screw progress previews the coming notch; post height is the
    // analog gauge.
    const tiltDeg = Math.min(
      TILT_MAX_NOTCH * TILT_DEG_PER_NOTCH,
      Math.max(
        0,
        (view.machine.tiltNotch + view.screwTicks / SCREW_TICKS_PER_NOTCH) *
          TILT_DEG_PER_NOTCH,
      ),
    );
    const tiltRad = (tiltDeg * Math.PI) / 180;
    this.tiltFrame.rotation.x = tiltRad;
    const noseLift = 1.45 * Math.sin(tiltRad); // nose height at the screw
    const postScale = (0.6 + noseLift) / 0.6;
    this.screwPost.scale.y = postScale;
    this.screwPost.position.y = 0.3 * postScale;
    this.screwHandle.position.y = 0.6 * postScale + 0.02;
    this.screwHandle.rotation.y = view.screwTicks * 0.3; // the jack handle works
    if (view.machine.tiltNotch !== this.lastTiltNotch) {
      clunk(view.machine.tiltNotch);
      this.lastTiltNotch = view.machine.tiltNotch;
    }
    const tensionFrac =
      (view.machine.tensionClicks + view.crankTicks / CRANK_TICKS_PER_CLICK) /
      TENSION_MAX_CLICKS;
    this.armPivot.rotation.x = 0.5 + tensionFrac * 0.7; // arm winches down and back
    if (view.crankTicks !== this.lastCrankTicks) {
      this.totalCrankSpins += 1;
      this.lastCrankTicks = view.crankTicks;
    }
    this.drumMesh.rotation.x = this.totalCrankSpins * 0.05;
    this.toppingMesh.visible = view.machine.loaded !== null;
    if (view.machine.loaded !== null)
      (this.toppingMesh.material as THREE.MeshStandardMaterial).color.setHex(
        TOPPING_COLORS[view.machine.loaded] ?? 0xc23b4e,
      );
  }

  /** Was the machine notched when this rig last drew it? (test/debug) */
  get shownTiltNotch(): number {
    return this.lastTiltNotch;
  }
}

export interface GameScene {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  rig: MachineRig;
  /** What's in the baker's hands, rendered at the bottom of the view. */
  heldMesh: THREE.Mesh;
  interactables: Record<InteractableKind, THREE.Mesh[]>;
  raycastTargets: THREE.Mesh[];
  kindOf: Map<THREE.Object3D, InteractableKind>;
  setHighlight(kind: InteractableKind | null): void;
}

export function buildGameScene(canvas: HTMLCanvasElement): GameScene {
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

  // Arena visuals mirror core/arena's physics definitions exactly.
  box(80, 0.2, 80, 0x7a9e6b, 0, -0.1, 0, scene); // ground
  for (const w of WALLS)
    box(w.hx * 2, WALL_HEIGHT, w.hz * 2, 0x9a9a9a, w.x, WALL_HEIGHT / 2, w.z, scene);
  box(PANTRY_HALF.x * 2, PANTRY_HALF.y * 2, PANTRY_HALF.z * 2, 0xb98a4a,
    PANTRY_POS.x, PANTRY_POS.y, PANTRY_POS.z, scene);
  box(PLINTH_HALF.x * 2, PLINTH_HALF.y * 2, PLINTH_HALF.z * 2, 0x5a5a66,
    PLINTH_POS.x, PLINTH_POS.y, PLINTH_POS.z, scene);
  // The cake: three ROUND tiers straight from core/arena (plans/07 phase R),
  // sponge paling toward the summit so the climb is READABLE from the
  // catapult.
  const TIER_COLORS = [0xd8a45c, 0xe2b876, 0xefd39a];
  CAKE_TIERS.forEach((t, i) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(t.radius, t.radius, t.top - t.bottom, 48),
      new THREE.MeshStandardMaterial({ color: TIER_COLORS[i] ?? 0xefd39a }),
    );
    m.position.set(0, (t.top + t.bottom) / 2, CAKE_Z);
    scene.add(m);
  });
  // The pennant stands BESIDE THE MACHINE (visionary, 2026-07-03): the
  // wind instrument you read from the firing position — when wind arrives,
  // this flag is the forecast.
  box(0.06, 2.4, 0.06, 0xefe3d0, PLINTH_POS.x + 1.8, 1.2, PLINTH_POS.z - 0.6, scene);
  box(0.7, 0.3, 0.02, 0xd8452e, PLINTH_POS.x + 2.18, 2.2, PLINTH_POS.z - 0.6, scene);
  for (let z = -CROSS_HALF; z <= CROSS_HALF; z += 6)
    box(3, 0.02, 0.15, 0xdddddd, 0, 0.01, z, scene); // crossing stripes

  const rig = new MachineRig(scene);

  // Pantry crates — the ammo. E takes ONE; you carry it by hand.
  const crateY = PANTRY_POS.y + PANTRY_HALF.y + 0.25;
  const cherryCrate = box(0.9, 0.5, 0.7, 0x8c3038, -1.1, crateY, PANTRY_POS.z, scene);
  const cherrySample = sphere(0.2, TOPPING_COLORS.cherry ?? 0xc23b4e, -1.1, crateY + 0.4, PANTRY_POS.z, scene);
  const limeCrate = box(0.9, 0.5, 0.7, 0x4f7a35, 1.1, crateY, PANTRY_POS.z, scene);
  const limeSample = sphere(0.2, TOPPING_COLORS.lime ?? 0x77c34f, 1.1, crateY + 0.4, PANTRY_POS.z, scene);

  // What's in the baker's hands, rendered at the bottom of the view.
  scene.add(camera); // camera children only render if the camera is in-scene
  const heldMesh = sphere(0.12, 0xffffff, 0.28, -0.22, -0.5, camera);
  heldMesh.visible = false;

  const interactables: Record<InteractableKind, THREE.Mesh[]> = {
    wheel: [rig.wheelMesh],
    winch: [rig.drumMesh, rig.winchHandle],
    screw: [rig.screwPost, rig.screwHandle],
    lever: [rig.leverStick, rig.leverKnob],
    bucket: [rig.bucketMesh, rig.toppingMesh],
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

  return {
    renderer,
    scene,
    camera,
    rig,
    heldMesh,
    interactables,
    raycastTargets,
    kindOf,
    setHighlight,
  };
}
