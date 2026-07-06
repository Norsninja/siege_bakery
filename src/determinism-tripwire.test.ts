/**
 * The determinism tripwire (checkpoint audit 2026-07-03; widened 2026-07-06).
 * The law (CLAUDE.md): the deterministic layers never read wall clocks and
 * never touch unseeded randomness — that discipline is what makes
 * authoritative multiplayer and event-based cake sync possible. The culture
 * doc said "guard it like the 2D project"; this test IS the guard.
 *
 * SCOPE: core/ + game/ are the deterministic heart. server/ is authority too
 * and must re-run identically headless (room.ts's own comment says so) — so
 * it is fenced as well, EXCEPT the Node driver server/main.ts, which
 * legitimately owns the wall clock and the tick interval (it is outside the
 * fence on purpose). client/main.ts and the rest of client/ are the render
 * edge — not fenced.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.dirname(fileURLToPath(import.meta.url));
/** Wall clocks and unseeded dice, plus the timer/entropy sources that would
 * smuggle either in (2026-07-06: the old net omitted setTimeout/setInterval,
 * process.hrtime, crypto.getRandomValues). */
const FORBIDDEN =
  /Math\.random|Date\.now|performance\.now|process\.hrtime|new Date\(|setTimeout|setInterval|crypto\.getRandomValues/;

/** Comments may NAME the forbidden things (rng.ts's own discipline note
 * does); only live code trips the wire. */
const stripComments = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/** Every non-test .ts under dir, RECURSIVELY — a future core/foo/bar.ts must
 * not escape the fence (the old flat readdir would have let it). */
function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...tsFiles(p));
    else if (e.name.endsWith(".ts") && !e.name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

const targets: Array<{ label: string; files: string[] }> = [
  { label: "core/", files: tsFiles(path.join(SRC, "core")) },
  { label: "game/", files: tsFiles(path.join(SRC, "game")) },
  {
    label: "server/ (minus the ws+clock driver main.ts)",
    files: tsFiles(path.join(SRC, "server")).filter(
      (f) => path.basename(f) !== "main.ts",
    ),
  },
];

describe("determinism tripwire: fenced layers read no clocks, roll no dice", () => {
  for (const { label, files } of targets) {
    it(`${label} is clean`, () => {
      expect(files.length).toBeGreaterThan(0); // the fence guards something
      for (const f of files) {
        const code = stripComments(readFileSync(f, "utf8"));
        const hit = FORBIDDEN.exec(code);
        expect(
          hit === null ? null : `${path.relative(SRC, f)} contains "${hit[0]}"`,
        ).toBeNull();
      }
    });
  }
});
