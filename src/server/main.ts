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
 *
 * This is also the INTERNET-FACING EDGE (checkpoint audit, 2026-07-03):
 * everything ill-behaved — dying sockets, oversized frames, half-open
 * connections, join floods — must be absorbed HERE, so the Room only ever
 * sees a bounded set of well-formed members. The Room re-validates message
 * FIELDS (its own boundary); this file owns the transport's health.
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT } from "../core/constants";
import type { ClientMsg } from "../game/protocol";
import { Room } from "./room";

const rawPort = Number(process.env.PORT ?? 5175);
if (!Number.isInteger(rawPort) || rawPort <= 0 || rawPort >= 65536) {
  console.error(`Bad PORT "${process.env.PORT}" — expected 1..65535.`);
  process.exit(1);
}
const PORT = rawPort;
/** dist/ relative to this file, not the CWD — `tsx src/server/main.ts`
 * from anywhere serves the same build. */
const DIST = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../dist",
);
const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
};

/** It's a party game for a handful of friends; a join flood is not a party. */
const MAX_BAKERS = 8;
/** Largest legit client message is a pose (~60 bytes); one oversized frame
 * must never stall the tick loop for everyone. */
const MAX_PAYLOAD_BYTES = 16 * 1024;
/** Half-open sockets (laptop sleep, NAT timeout — the friend-test topology)
 * surface in minutes without a heartbeat; meanwhile a ghost's held crank
 * would keep winching the machine. Ping, and terminate the unresponsive. */
const HEARTBEAT_MS = 30_000;

await RAPIER.init();
const room = new Room();

const server = http.createServer((req, res) => {
  void (async () => {
    const url = (req.url ?? "/").split("?")[0] ?? "/";
    const rel = url === "/" ? "index.html" : url.slice(1);
    const file = path.join(DIST, path.normalize(rel));
    // Trailing separator matters: "…\dist-evil\x" startsWith "…\dist".
    if (!file.startsWith(DIST + path.sep)) {
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
server.on("error", (err) => {
  console.error("http server error:", err.message);
  process.exit(1);
});

const wss = new WebSocketServer({ server, maxPayload: MAX_PAYLOAD_BYTES });
// An unhandled 'error' event kills the whole process (checkpoint audit C1):
// a friend's WiFi drop or a port-scanner's RST must never end the party.
wss.on("error", (err) => console.error("wss error:", err.message));

wss.on("connection", (ws) => {
  ws.on("error", (err) => {
    console.error("socket error:", err.message);
    // 'close' follows on fatal errors; room.leave happens there.
  });
  if (room.memberCount() >= MAX_BAKERS) {
    ws.close(1013, "the bakery is full");
    return;
  }
  const id = room.join((msg) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  });
  console.log(`baker ${id} connected (${room.memberCount()} in the bakery)`);

  let alive = true;
  ws.on("pong", () => {
    alive = true;
  });
  const heartbeat = setInterval(() => {
    if (!alive) {
      ws.terminate(); // 'close' fires → room.leave
      return;
    }
    alive = false;
    ws.ping();
  }, HEARTBEAT_MS);

  ws.on("message", (data) => {
    try {
      room.onMessage(id, JSON.parse(String(data)) as ClientMsg);
    } catch {
      // malformed message: ignore; co-op friends, not adversaries
    }
  });
  ws.on("close", () => {
    clearInterval(heartbeat);
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
