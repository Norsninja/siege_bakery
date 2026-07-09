/**
 * Transports — the client always speaks protocol; only the pipe differs.
 *
 * Loopback: solo play is a room of one, in-process. The client's own
 * fixed-tick loop drives the room, so solo pauses when the tab does and
 * there is exactly ONE match implementation (server/room.ts) forever.
 *
 * Ws: the same room on a Node server, over a WebSocket. Messages are JSON.
 *
 * client/ may import server/room (client may import anything); the reverse
 * stays illegal under the layering law.
 */
import { Room } from "../server/room";
import type { ClientMsg, ServerMsg } from "../game/protocol";

export interface Transport {
  send(msg: ClientMsg): void;
  close(): void;
}

/**
 * The transport pick — ?join wins, then room-server origin, else loopback.
 *
 * THE TUNNEL GATE (friend-test prep, 2026-07-07): the old rule keyed on
 * literal port 5175 with a hardcoded ws://. Behind an https tunnel
 * (cloudflared quick tunnel — the chosen friend-test transport) the page
 * arrives on port 443, so the check failed and the friend SILENTLY fell
 * back to loopback — playing alone in a private bakery with no error to
 * say so. And even with the port right, an https page may not open ws://
 * (mixed content); it must speak wss.
 *
 * The law, restated so it survives any port or tunnel: a BUILT page is
 * only ever served by the room server (it serves dist/ — CLAUDE.md), so
 * `isBuilt` auto-joins its own origin, protocol-matched. The literal 5175
 * check stays for a dev bundle served alongside the room server; the vite
 * dev page (5174) still defaults to loopback solo.
 */
export function pickWsUrl(
  loc: { protocol: string; port: string; host: string; search: string },
  isBuilt: boolean,
): string | null {
  const join = new URLSearchParams(loc.search).get("join");
  if (join) return join;
  if (isBuilt || loc.port === "5175")
    return `${loc.protocol === "https:" ? "wss" : "ws"}://${loc.host}`;
  return null;
}

export interface LoopbackConnection {
  transport: Transport;
  /** Advance the in-process room one fixed tick. Call from the sim loop. */
  tickRoom: () => void;
  /** The in-process room itself — exposed for the DEV `__game.room`
   * verification seam (main.ts; the jumpToRung culture, live): solo-only
   * by construction, never a thing over ws. Play still speaks protocol —
   * the seam is for building STATE mid-verification, exactly like the
   * room tests' private seams. */
  room: Room;
}

export function connectLoopback(
  onMsg: (m: ServerMsg) => void,
): LoopbackConnection {
  const room = new Room();
  // Clone at the boundary (checkpoint audit 2026-07-03): over ws every
  // message is JSON-round-tripped; the loopback must not hand the client
  // LIVE room objects. The Patron mutates order rows in place — an aliased
  // view would change mid-flight, and any future client-side mutation
  // would corrupt the authority. One match implementation, one message
  // semantics, whichever the pipe.
  const id = room.join((m) => onMsg(structuredClone(m)));
  return {
    transport: {
      send: (msg) => room.onMessage(id, structuredClone(msg)),
      close: () => room.leave(id),
    },
    tickRoom: () => room.tick(),
    room,
  };
}

export function connectWs(
  url: string,
  onMsg: (m: ServerMsg) => void,
  onStatus: (s: "open" | "closed") => void,
): Transport {
  const ws = new WebSocket(url);
  const queue: ClientMsg[] = [];
  let open = false;
  ws.addEventListener("open", () => {
    open = true;
    onStatus("open");
    for (const m of queue) ws.send(JSON.stringify(m));
    queue.length = 0;
  });
  ws.addEventListener("message", (e) => {
    // A frame that isn't our JSON (a proxy's noise, a wrong service at the
    // URL) must read as a WARN with the payload in view, not an uncaught
    // red error a friend screenshots in alarm (independent audit,
    // 2026-07-09). One bad frame never poisons the pipe either way — the
    // parse happens before any state is touched.
    let msg: ServerMsg;
    try {
      msg = JSON.parse(String(e.data)) as ServerMsg;
    } catch {
      console.warn("bakery wire: dropped an unparseable frame", e.data);
      return;
    }
    onMsg(msg);
  });
  ws.addEventListener("close", () => {
    open = false; // sends now drop instead of hitting a CLOSED socket
    onStatus("closed");
  });
  return {
    send: (msg) => {
      if (open) ws.send(JSON.stringify(msg));
      // Pre-open: keep edges/holds, skip poses (stale on arrival anyway),
      // and cap hard — a never-connecting URL must not accumulate 20Hz
      // messages forever (checkpoint audit 2026-07-03).
      else if (msg.t !== "pose" && queue.length < 32) queue.push(msg);
    },
    close: () => ws.close(),
  };
}
