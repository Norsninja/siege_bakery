/**
 * THE LOADER SEAM's laws (plans/16 slice 1) — pinned in the environment
 * that matters: Node, where every asset is absent by definition. The
 * browser half (a real .glb arriving) is the live eye pass's job; these
 * pins guard the contract every view leans on — null is normal, nothing
 * throws, one fetch per name.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { clearModelCache, loadModel } from "./assets";

describe("loadModel — the fallback law, headless", () => {
  beforeEach(() => clearModelCache());

  it("resolves null in Node (no DOM) — never throws, never rejects", async () => {
    await expect(loadModel("crate")).resolves.toBeNull();
  });

  it("one fetch per name: concurrent callers share the same promise", () => {
    const a = loadModel("crate");
    const b = loadModel("crate");
    expect(a).toBe(b);
    // A different name is its own load.
    expect(loadModel("giant")).not.toBe(a);
  });

  it("the cache clears for a fresh start (the test seam)", () => {
    const a = loadModel("crate");
    clearModelCache();
    expect(loadModel("crate")).not.toBe(a);
  });
});
