/**
 * THE RELEASE GATE (plans/20 §8, first organs pulled forward by THE
 * PATH entry 3) — the release checklist AS A SCRIPT, because the
 * stale-dist trap already fired once (s14: dist at 21 MB missing
 * three giants would have shipped a broken cast).
 *
 * `npm run release` chains, in plans/20 §8's order:
 *   1. npm run check        (tests + both tsc legs)
 *   2. npm run build        (fresh dist — never ship stale)
 *   3. size report          vs the plans/16 §4 budget (~25 MB alarm)
 *   4. diet verification    (no undieted GLB ships — art bible §10)
 *   5. untracked-asset scan (nothing ships without provenance)
 *   6. TODO boot smoke against the built dist (plans/20 §8 organ 6)
 *   7. TODO package/zip     (organ 7)
 *
 * Gates 3–5 all RUN before the script fails — one run reports every
 * problem, not the first. The budget number is plans/16 §4's law;
 * when the weight work lands under it, this script is what keeps it
 * there.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";

const BUDGET_MB = 25; // plans/16 §4: past this, compression is a slice
const MAX_TEXTURE_PX = 1024; // diet law: base/normal 1024, ORM 512
const MAX_GLB_MB = 4.5; // an undieted meshy export smells bigger than this

const failures = [];
const MB = (b) => (b / 1024 / 1024).toFixed(2);

const run = (label, cmd, args) => {
  console.log(`\n=== ${label}: ${cmd} ${args.join(" ")} ===`);
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error(`${label} FAILED (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
};

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

// --- 1 + 2: never ship red, never ship stale --------------------------
run("check", "npm", ["run", "check"]);
run("build", "npm", ["run", "build"]);

// --- 3: the size report vs the budget law ------------------------------
console.log("\n=== size report (plans/16 §4 budget) ===");
const files = walk("dist").map((p) => ({ p, size: statSync(p).size }));
const total = files.reduce((s, f) => s + f.size, 0);
const byBlock = new Map();
for (const f of files) {
  const rel = relative("dist", f.p);
  const block = rel.includes(sep) ? rel.split(sep)[0] : "(root)";
  byBlock.set(block, (byBlock.get(block) ?? 0) + f.size);
}
for (const [block, size] of [...byBlock].sort((a, b) => b[1] - a[1]))
  console.log(`  ${MB(size).padStart(8)} MB  ${block}/`);
console.log("  ---");
for (const f of [...files].sort((a, b) => b.size - a.size).slice(0, 8))
  console.log(`  ${MB(f.size).padStart(8)} MB  ${relative("dist", f.p)}`);
console.log(`  TOTAL ${MB(total)} MB  (budget ~${BUDGET_MB} MB)`);
if (total > BUDGET_MB * 1024 * 1024)
  failures.push(
    `dist ${MB(total)} MB exceeds the ~${BUDGET_MB} MB alarm — the diet ` +
      `(plans/15 item 14) owns this; do not shrug it (plans/16 §4).`,
  );

// --- 4: diet verification — no undieted GLB ships ----------------------
console.log("\n=== diet verification (art bible §10) ===");
const io = new NodeIO()
  .registerExtensions(KHRONOS_EXTENSIONS)
  .registerDependencies({ "draco3d.decoder": await draco3d.createDecoderModule() });
for (const f of files.filter((f) => f.p.endsWith(".glb"))) {
  const rel = relative("dist", f.p);
  const problems = [];
  if (f.size > MAX_GLB_MB * 1024 * 1024)
    problems.push(`${MB(f.size)} MB > ${MAX_GLB_MB} MB (undieted?)`);
  const doc = await io.read(f.p);
  for (const tex of doc.getRoot().listTextures()) {
    const size = tex.getSize();
    if (size && Math.max(...size) > MAX_TEXTURE_PX)
      problems.push(`texture ${tex.getName() || "?"} ${size.join("x")} > ${MAX_TEXTURE_PX}`);
    if (tex.getMimeType() === "image/png")
      problems.push(`texture ${tex.getName() || "?"} is PNG (the AUTO re-encode trap)`);
  }
  console.log(`  ${problems.length ? "FAIL" : "ok  "} ${rel}`);
  for (const p of problems) failures.push(`${rel}: ${p}`);
}

// --- 5: untracked-shipping-asset scan (provenance law) -----------------
console.log("\n=== untracked-shipping-asset scan ===");
const tracked = new Set(
  spawnSync("git", ["ls-files", "public"], { encoding: "utf8" })
    .stdout.split("\n")
    .filter(Boolean)
    .map((p) => p.replace(/\//g, sep)),
);
const untracked = walk("public")
  .map((p) => relative(".", p))
  .filter((p) => !tracked.has(p));
if (untracked.length === 0) console.log("  ok — everything in public/ is tracked");
for (const p of untracked)
  failures.push(`untracked shipping asset: ${p} (it would ship without provenance)`);

// --- verdict ------------------------------------------------------------
console.log("\n=== release gate ===");
if (failures.length) {
  for (const f of failures) console.error(`  FAIL ${f}`);
  console.error(`\n${failures.length} failure(s) — this dist does not ship.`);
  process.exit(1);
}
console.log("  all gates green (boot smoke + package are TODO organs).");
