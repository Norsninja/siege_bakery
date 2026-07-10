/**
 * THE LOADER SEAM (plans/16 slice 1) — the ONE door glTF assets enter
 * the game through.
 *
 * LAWS (the slice's contract, binding on every future asset):
 * - CLIENT-ONLY: a headless caller (Node, the test rig) gets null and
 *   moves on — core/game never import this and never will.
 * - PRIMITIVE FALLBACKS FOREVER: every caller must keep working when a
 *   model is missing, slow, or broken — dev, tests, and a slow tunnel
 *   all boot assetless. A null from here is a normal Tuesday, not an
 *   error path.
 * - public/models/ is the COPY OF RECORD (the public/audio precedent):
 *   Vite ships it into dist/, the room server serves it, one tunneled
 *   port carries it to the friend.
 * - ONE FETCH PER NAME: the cache holds the promise, not the result —
 *   concurrent callers share the load. Callers that place a model more
 *   than once must clone() what they receive; the cached scene is a
 *   shared original.
 */
import type * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const cache = new Map<string, Promise<THREE.Group | null>>();

/** Load `public/models/<name>.glb` — null when headless, missing, or
 * broken (the fallback law: the caller's primitive carries on null). */
export function loadModel(name: string): Promise<THREE.Group | null> {
  const hit = cache.get(name);
  if (hit) return hit;
  const p = (async (): Promise<THREE.Group | null> => {
    // Node has no DOM/fetch-for-assets story and never needs one — the
    // headless legs play the whole game on primitives.
    if (typeof document === "undefined") return null;
    try {
      const gltf = await new GLTFLoader().loadAsync(`/models/${name}.glb`);
      return gltf.scene;
    } catch {
      // eslint-disable-next-line no-console
      console.warn(
        `[assets] models/${name}.glb missing or broken — the primitive fallback carries`,
      );
      return null;
    }
  })();
  cache.set(name, p);
  return p;
}

/** Test seam: forget everything loaded (each test starts assetless). */
export function clearModelCache(): void {
  cache.clear();
}
