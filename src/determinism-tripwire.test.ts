/**
 * The determinism tripwire (checkpoint audit 2026-07-03). The law (CLAUDE.md):
 * core/ and game/ never read wall clocks and never touch unseeded randomness —
 * that discipline is what makes authoritative multiplayer and event-based
 * cake sync possible. The culture doc said "guard it like the 2D project";
 * this test IS the guard. Transport drivers (server/main.ts, client/main.ts)
 * legitimately read performance.now — they are outside the fence on purpose.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.dirname(fileURLToPath(import.meta.url));
const FORBIDDEN = /Math\.random|Date\.now|performance\.now|new Date\(/;

/** Comments may NAME the forbidden things (rng.ts's own discipline note
 * does); only live code trips the wire. */
const stripComments = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("determinism tripwire: core/ + game/ read no clocks, roll no dice", () => {
  for (const layer of ["core", "game"] as const) {
    it(`${layer}/ is clean`, () => {
      const dir = path.join(SRC, layer);
      const files = readdirSync(dir).filter(
        (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
      );
      expect(files.length).toBeGreaterThan(0); // the fence guards something
      for (const f of files) {
        const code = stripComments(readFileSync(path.join(dir, f), "utf8"));
        const hit = FORBIDDEN.exec(code);
        expect(hit === null ? null : `${layer}/${f} contains "${hit[0]}"`).toBeNull();
      }
    });
  }
});
