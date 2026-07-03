/**
 * Other bakers — interpolated ghosts of client-auth poses relayed by the
 * room (M3 of the decomp phase, plans/06). Extracted verbatim from main.ts.
 */
import * as THREE from "three";
import { CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS } from "../core/baker";
import type { PlayerPose } from "../game/protocol";

const GHOST_COLORS = [0xe6b455, 0x6fb1e0, 0xc580d1, 0x7fcf9a, 0xd98f6d];

interface Ghost {
  group: THREE.Group;
  target: PlayerPose;
}

export class GhostManager {
  private readonly ghosts = new Map<number, Ghost>();

  constructor(private readonly scene: THREE.Scene) {}

  upsert(pose: PlayerPose): void {
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
    this.ghosts.set(pose.id, { group, target: pose });
  }

  remove(id: number): void {
    const g = this.ghosts.get(id);
    if (!g) return;
    this.scene.remove(g.group);
    this.ghosts.delete(id);
  }

  /** Per-frame: lerp toward the latest relayed pose. */
  update(): void {
    for (const g of this.ghosts.values()) {
      g.group.position.lerp(
        new THREE.Vector3(g.target.x, g.target.y, g.target.z),
        0.25,
      );
      const dy =
        ((g.target.yaw - g.group.rotation.y + Math.PI * 3) % (Math.PI * 2)) -
        Math.PI;
      g.group.rotation.y += dy * 0.25;
    }
  }

  get count(): number {
    return this.ghosts.size;
  }

  ids(): number[] {
    return [...this.ghosts.keys()];
  }
}
