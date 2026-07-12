/**
 * THE MODEL DIET (plans/15 item 14 — the adopted shipping pipeline step).
 * `npm run diet -- <name>` rewrites public/models/<name>.glb in place:
 *
 * - drops an emissive texture that measures BLACK (meshy ships one on
 *   every export; it is dead wire weight and ~22 MB of decoded VRAM)
 * - baseColor + normal → max 1024² (the dwarf-import precedent)
 * - metallicRoughness → max 512² (the wall-ORM precedent; the channel
 *   varies slowly)
 * - everything JPEG q90, ONE re-encode pass (meshy ships JPEG anyway)
 *
 * Node/bone names are the client's drive vocabulary (MachineRig,
 * PatronBody) — the script HARD-FAILS if the set changes. Authoring
 * sources keep full resolution (.blends, meshy account); this touches
 * only the shipping copy. Hand-road GLBs (flat colors, no textures)
 * pass through unchanged — running it on them is a harmless no-op.
 */
import { NodeIO } from "@gltf-transform/core";
import { textureCompress, prune } from "@gltf-transform/functions";
import sharp from "sharp";

const name = process.argv[2];
if (!name) {
  console.error("usage: npm run diet -- <model-name>   (public/models/<name>.glb)");
  process.exit(1);
}
const path = `public/models/${name}.glb`;

const io = new NodeIO();
const doc = await io.read(path);
const root = doc.getRoot();
const before = (await import("node:fs")).statSync(path).size;
const namesBefore = JSON.stringify(root.listNodes().map((n) => n.getName()).sort());

for (const mat of root.listMaterials()) {
  const tex = mat.getEmissiveTexture();
  if (!tex) continue;
  const stats = await sharp(Buffer.from(tex.getImage())).stats();
  // RGB only — a meshy PNG emissive carries an OPAQUE ALPHA channel whose
  // mean 255 would defeat the blackness check (found on the frost giant)
  const maxMean = Math.max(...stats.channels.slice(0, 3).map((c) => c.mean));
  if (maxMean < 2) {
    mat.setEmissiveTexture(null);
    mat.setEmissiveFactor([0, 0, 0]);
    console.log(`emissive is black (max mean ${maxMean.toFixed(3)}) — dropped`);
  } else {
    console.log(`emissive kept — max channel mean ${maxMean.toFixed(3)} is not black`);
  }
}
await doc.transform(
  prune(),
  textureCompress({
    encoder: sharp,
    targetFormat: "jpeg",
    quality: 90,
    resize: [1024, 1024],
    slots: /baseColor|normal/i,
  }),
  textureCompress({
    encoder: sharp,
    targetFormat: "jpeg",
    quality: 90,
    resize: [512, 512],
    slots: /metallicRoughness/i,
  }),
);

const namesAfter = JSON.stringify(root.listNodes().map((n) => n.getName()).sort());
if (namesBefore !== namesAfter)
  throw new Error("node names changed — the rig vocabulary broke; NOT writing");

await io.write(path, doc);
const after = (await import("node:fs")).statSync(path).size;
console.log(
  `${path}: ${(before / 1e6).toFixed(2)} MB → ${(after / 1e6).toFixed(2)} MB`,
);
