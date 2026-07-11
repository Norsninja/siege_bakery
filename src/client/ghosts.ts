/**
 * Other bakers — interpolated ghosts of client-auth poses relayed by the
 * room (M3 of the decomp phase, plans/06). Extracted verbatim from main.ts.
 *
 * BODIES (plans/16 slice 4, first act): ghosts dress in the dwarf model
 * through the loader seam when it arrives; the capsule+visor primitive is
 * the fallback law's body — headless, missing, or broken all keep it
 * forever. The dwarf clones SHARE geometry/materials with the cached
 * template, so a dressed ghost is removed WITHOUT dispose (the capsule
 * primitives own their resources and are disposed as before).
 */
import * as THREE from "three";
import {
  CAPSULE_HALF_HEIGHT,
  CAPSULE_RADIUS,
  STAND_CENTER_Y,
} from "../core/baker";
import type { PlayerPose } from "../game/protocol";
import { loadModel } from "./assets";
import { removeAndDispose } from "./scene";

const GHOST_COLORS = [0xe6b455, 0x6fb1e0, 0xc580d1, 0x7fcf9a, 0xd98f6d];

/** The dwarf model is authored 1.2 m tall (art bible §4) — but the SIM'S
 * baker is a 1.7 m capsule with the eye at 1.5 m, and the sim is the
 * truth (the cake precedent: art conforms to colliders). Scale the visual
 * to the capsule so crews meet roughly eye to eye; derived, not hardcoded,
 * so a capsule change carries the body with it. */
const DWARF_AUTHORED_HEIGHT_M = 1.2;
const DWARF_VISUAL_SCALE =
  (2 * (CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS)) / DWARF_AUTHORED_HEIGHT_M;

/** Walk-cycle feel (client-only juice, frame-driven — no wall clock):
 * phase advances only while the ghost is closing on its relayed pose. */
const WALK_PHASE_PER_FRAME = 0.35; // ~3.3 bobs/s at 60fps
const WALK_BOB_M = 0.03;
const WALK_ROCK_RAD = 0.05;
const MOVING_EPS_M = 0.02;

interface Ghost {
  group: THREE.Group;
  target: PlayerPose;
  /** The visible body (dwarf clone once dressed; capsule until then). */
  body: THREE.Object3D;
  dressed: boolean;
  walkPhase: number;
}

export class GhostManager {
  private readonly ghosts = new Map<number, Ghost>();
  private dwarfTemplate: THREE.Group | null = null;
  private dwarfRequested = false;

  constructor(private readonly scene: THREE.Scene) {}

  /** LAZY through the seam, on the first ghost (budget note 2026-07-11):
   * a solo boot never fetches the 4.4 MB dwarf — remote players are the
   * only wearers. Fire-and-forget: null (headless/missing/broken) simply
   * leaves every ghost a capsule — a normal Tuesday. */
  private requestDwarf(): void {
    if (this.dwarfRequested) return;
    this.dwarfRequested = true;
    void loadModel("dwarf").then((m) => {
      if (!m) return;
      this.dwarfTemplate = m;
      for (const g of this.ghosts.values()) this.dress(g);
    });
  }

  /** Swap the capsule primitives for a dwarf body. The capsule owns its
   * geometry/material (disposed here); the dwarf clone shares the cached
   * template's resources and must never be disposed. */
  private dress(g: Ghost): void {
    if (!this.dwarfTemplate || g.dressed) return;
    for (const child of [...g.group.children]) removeAndDispose(child);
    const body = this.dwarfTemplate.clone();
    body.scale.setScalar(DWARF_VISUAL_SCALE);
    // pose.y is the capsule CENTER; the model's origin is its standing
    // point (art bible §8) — drop it to the feet.
    body.position.y = -STAND_CENTER_Y;
    // glTF front is +z (art bible §8); a ghost at yaw 0 faces −z.
    body.rotation.y = Math.PI;
    g.group.add(body);
    g.body = body;
    g.dressed = true;
  }

  upsert(pose: PlayerPose): void {
    this.requestDwarf();
    const existing = this.ghosts.get(pose.id);
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
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.08, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x222222 }),
    );
    visor.position.set(0, 0.45, -CAPSULE_RADIUS);
    group.add(visor);
    group.position.set(pose.x, pose.y, pose.z);
    this.scene.add(group);
    const ghost: Ghost = {
      group,
      target: pose,
      body,
      dressed: false,
      walkPhase: 0,
    };
    this.ghosts.set(pose.id, ghost);
    this.dress(ghost); // template may already be here
  }

  remove(id: number): void {
    const g = this.ghosts.get(id);
    if (!g) return;
    if (g.dressed) {
      // Dwarf resources are shared with the template — remove, never dispose.
      g.group.removeFromParent();
    } else {
      removeAndDispose(g.group); // capsule + visor own their geo/materials
    }
    this.ghosts.delete(id);
  }

  /** Per-frame: lerp toward the latest relayed pose. */
  update(): void {
    for (const g of this.ghosts.values()) {
      const target = new THREE.Vector3(g.target.x, g.target.y, g.target.z);
      const moving = g.group.position.distanceTo(target) > MOVING_EPS_M;
      g.group.position.lerp(target, 0.25);
      const dy =
        ((g.target.yaw - g.group.rotation.y + Math.PI * 3) % (Math.PI * 2)) -
        Math.PI;
      g.group.rotation.y += dy * 0.25;
      // The naive walk (plans/16 slice 4: bob + rock, chunky-cute forgives
      // stiffness) — dressed bodies only; the capsule never bobbed.
      if (g.dressed) {
        if (moving) g.walkPhase += WALK_PHASE_PER_FRAME;
        const sway = moving ? Math.sin(g.walkPhase) : 0;
        g.body.position.y = -STAND_CENTER_Y + Math.abs(sway) * WALK_BOB_M;
        g.body.rotation.z = sway * WALK_ROCK_RAD;
      }
    }
  }

  get count(): number {
    return this.ghosts.size;
  }

  ids(): number[] {
    return [...this.ghosts.keys()];
  }
}
