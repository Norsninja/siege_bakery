/**
 * The room server — Node entry. `npm run server` (tsx), port 5175
 * (PORT overrides; 5174 is vite dev, 5173 is the 2D prototype).
 *
 * One greybox room for now. Also serves dist/ statically when it exists,
 * so the eventual friend test is ONE tunneled port: the page and the
 * WebSocket share it.
 *
 * This file is the DRIVER, not the match: wall-clock lives here (allowed),
 * never inside core/ or game/. The room ticks at a drift-corrected fixed
 * 60Hz, exactly like the client's accumulator loop.
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { WebSocketServer } from "ws";
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT } from "../core/constants";
import type { ClientMsg } from "../game/protocol";
import { Room } from "./room";

const PORT = Number(process.env.PORT ?? 5175);
const DIST = path.resolve("dist");
const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
};

await RAPIER.init();
const room = new Room();

const server = http.createServer((req, res) => {
  void (async () => {
    const url = (req.url ?? "/").split("?")[0] ?? "/";
    const rel = url === "/" ? "index.html" : url.slice(1);
    const file = path.join(DIST, path.normalize(rel));
    if (!file.startsWith(DIST)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        "content-type": MIME[path.extname(file)] ?? "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end(
        "siege-bakery room server. No dist/ build found - run `npm run build`, " +
          "or join from the vite dev page with ?join=ws://localhost:" +
          String(PORT),
      );
    }
  })();
});

const wss = new WebSocketServer({ server });
wss.on("connection", (ws) => {
  const id = room.join((msg) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  });
  console.log(`baker ${id} connected (${room.memberCount()} in the bakery)`);
  ws.on("message", (data) => {
    try {
      room.onMessage(id, JSON.parse(String(data)) as ClientMsg);
    } catch {
      // malformed message: ignore; co-op friends, not adversaries
    }
  });
  ws.on("close", () => {
    room.leave(id);
    console.log(`baker ${id} left (${room.memberCount()} remain)`);
  });
});

// Drift-corrected fixed 60Hz driver, same accumulator shape as the client.
let last = performance.now();
let acc = 0;
setInterval(() => {
  const now = performance.now();
  acc = Math.min(acc + (now - last) / 1000, 0.25);
  last = now;
  while (acc >= FIXED_DT) {
    room.tick();
    acc -= FIXED_DT;
  }
}, 4);

server.listen(PORT, () => {
  console.log(`siege-bakery room server on http://localhost:${PORT}`);
});
