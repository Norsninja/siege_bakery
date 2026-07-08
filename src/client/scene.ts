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
  CAKE_TIERS,
  TOWNS,
  GATE_HALF_WIDTH,
  GROUND_HALF_X,
  GROUND_HALF_Z,
  GROUND_CENTER_Z,
  PANTRY_HALF,
  PLINTH_HALF,
} from "../core/arena";
import type { Vec3 } from "../core/ballistics";
import {
  CRANK_TICKS_PER_CLICK,
  TENSION_MAX_CLICKS,
  SCREW_TICKS_PER_NOTCH,
  TILT_DEG_PER_NOTCH,
  TILT_MAX_NOTCH,
} from "../game/catapult";
import type { TownMachine } from "../game/protocol";
import type { InteractableKind } from "./hud";
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

    // CREW FLAGSTONES (plans/14): a stand-here marker per post spot,
    // drawn from posts.ts's own table so zones and stones cannot drift.
    // A SIBLING group, facing-only — this.group swings with TRAVERSE,
    // and the crew's footing must not swing with the wheel.
    const stones = new THREE.Group();
    stones.position.set(base.x, base.y, base.z);
    stones.rotation.y = this.facingRad;
    scene.add(stones);
    for (const spot of POST_SPOTS) {
      const stone = new THREE.Mesh(
        new THREE.CylinderGeometry(spot.r, spot.r, 0.04, 24),
        new THREE.MeshStandardMaterial({
          color: spot.post === "gunner" ? 0xb5a06b : 0x8f8f9a,
        }),
      );
      stone.position.set(spot.x, 0.02, spot.z);
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
    this.screwPost = box(0.1, 0.6, 0.1, 0x5a5a66, 0, 0.3, 0, screwGroup);
    this.screwHandle = box(0.4, 0.06, 0.06, 0x8a6b3d, 0, 0.62, 0, screwGroup);
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
    this.tiltFrame.rotation.x = tiltRad;
    const noseLift = 1.45 * Math.sin(tiltRad); // nose height at the screw
    const postScale = (0.6 + noseLift) / 0.6;
    this.screwPost.scale.y = postScale;
    this.screwPost.position.y = 0.3 * postScale;
    this.screwHandle.position.y = 0.6 * postScale + 0.02;
    this.screwHandle.rotation.y = tm.screwTicks * 0.3; // the jack handle works
    if (tm.machine.tiltNotch !== this.lastTiltNotch) {
      clunk(tm.machine.tiltNotch);
      this.lastTiltNotch = tm.machine.tiltNotch;
    }
    const tensionFrac =
      (tm.machine.tensionClicks + tm.crankTicks / CRANK_TICKS_PER_CLICK) /
      TENSION_MAX_CLICKS;
    this.armPivot.rotation.x = 0.5 + tensionFrac * 0.7; // arm winches down and back
    if (tm.crankTicks !== this.lastCrankTicks) {
      this.totalCrankSpins += 1;
      this.lastCrankTicks = tm.crankTicks;
    }
    this.drumMesh.rotation.x = this.totalCrankSpins * 0.05;
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
  /** Target town `t`'s rig + pantry (welcome, or an honored pickTown). */
  bindTown(t: number): void;
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

  // Arena visuals mirror core/arena's physics definitions exactly. BOTH
  // forts render (towns slice step 1): every static collider has a mesh —
  // the render contract. Crew gear (crates, pennant, machine rig) stays
  // town-0-only until the client's two-town step (plans/11 §10 step 8).
  box(GROUND_HALF_X * 2, 0.2, GROUND_HALF_Z * 2, 0x7a9e6b,
    0, -0.1, GROUND_CENTER_Z, scene); // ground — spans both forts
  for (const w of WALLS)
    box(w.hx * 2, WALL_HEIGHT, w.hz * 2, 0x9a9a9a, w.x, WALL_HEIGHT / 2, w.z, scene);
  for (const t of TOWNS) {
    box(PANTRY_HALF.x * 2, PANTRY_HALF.y * 2, PANTRY_HALF.z * 2, 0xb98a4a,
      t.pantry.x, t.pantry.y, t.pantry.z, scene);
    box(PLINTH_HALF.x * 2, PLINTH_HALF.y * 2, PLINTH_HALF.z * 2, 0x5a5a66,
      t.plinth.x, t.plinth.y, t.plinth.z, scene);
  }
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
  const townInteractables: Array<Record<InteractableKind, THREE.Mesh[]>> = [];
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
    });
  }

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
    setHighlight(kind: InteractableKind | null): void {
      for (const meshes of Object.values(gs.interactables))
        for (const m of meshes)
          (m.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
      if (kind)
        for (const m of gs.interactables[kind])
          (m.material as THREE.MeshStandardMaterial).emissive.setHex(0x443300);
    },
    bindTown(t: number): void {
      gs.setHighlight(null); // drop any glow on the old town's gear
      gs.interactables = townInteractables[t] ?? townInteractables[0]!;
      gs.raycastTargets = Object.values(gs.interactables).flat();
      gs.kindOf = new Map();
      for (const [kind, meshes] of Object.entries(gs.interactables) as Array<
        [InteractableKind, THREE.Mesh[]]
      >)
        for (const m of meshes) gs.kindOf.set(m, kind);
    },
  };
  gs.bindTown(0); // pre-welcome default; the welcome re-binds to yourTown
  return gs;
}
