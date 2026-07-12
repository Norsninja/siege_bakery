/**
 * THE SKINNED-CLONE LAW (plans/19, found live 2026-07-12 — "the line
 * is in the town"): Object3D.clone() does NOT rebind skeletons. A
 * cloned SkinnedMesh keeps referencing the TEMPLATE's bones, so its
 * vertices render wherever the template stands (the origin) no matter
 * where the clone's group is placed. Every live-skinned template must
 * clone through SkeletonUtils. This suite pins the law itself against
 * three.js — if an upgrade ever changes clone semantics, these tests
 * say so before the town fills with giants again.
 */
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

/** A minimal live-skinned template: one bone, one fully-bound vertex
 * at the origin, group root — the shape loadModel returns. */
function skinnedTemplate(): THREE.Group {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
  geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute([0, 0, 0, 0], 4));
  geo.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute([1, 0, 0, 0], 4),
  );
  const bone = new THREE.Bone();
  bone.name = "chest";
  const mesh = new THREE.SkinnedMesh(geo, new THREE.MeshStandardMaterial());
  const group = new THREE.Group();
  group.add(bone);
  mesh.add(bone); // bone rides the mesh hierarchy
  group.add(mesh);
  mesh.bind(new THREE.Skeleton([bone]));
  return group;
}

/** Where the skinned vertex actually renders, in world space. */
function skinnedVertexWorldX(root: THREE.Object3D): number {
  root.updateMatrixWorld(true);
  let mesh: THREE.SkinnedMesh | null = null;
  root.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) mesh = o as THREE.SkinnedMesh;
  });
  if (!mesh) throw new Error("no skinned mesh");
  const m = mesh as THREE.SkinnedMesh;
  m.skeleton.update();
  const v = new THREE.Vector3();
  m.getVertexPosition(0, v); // skinned, in mesh local space
  return m.localToWorld(v).x;
}

describe("the skinned-clone law", () => {
  it("SkeletonUtils.clone renders at the clone's own transform", () => {
    const template = skinnedTemplate();
    const clone = cloneSkinned(template) as THREE.Group;
    clone.position.set(100, 0, 0);
    expect(skinnedVertexWorldX(clone)).toBeCloseTo(100, 3);
  });

  it("plain .clone() betrays: vertices stay with the template's bones", () => {
    const template = skinnedTemplate();
    const clone = template.clone();
    clone.position.set(100, 0, 0);
    // The trap this suite exists to remember: the vertex does NOT
    // follow the group — it renders back at the template (origin).
    expect(skinnedVertexWorldX(clone)).toBeCloseTo(0, 3);
  });

  it("clones share geometry with the template (the no-dispose law)", () => {
    const template = skinnedTemplate();
    const clone = cloneSkinned(template) as THREE.Group;
    let tGeo: unknown, cGeo: unknown;
    template.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) tGeo = (o as THREE.Mesh).geometry;
    });
    clone.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) cGeo = (o as THREE.Mesh).geometry;
    });
    expect(cGeo).toBe(tGeo);
  });
});
