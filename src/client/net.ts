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

export interface LoopbackConnection {
  transport: Transport;
  /** Advance the in-process room one fixed tick. Call from the sim loop. */
  tickRoom: () => void;
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
    onMsg(JSON.parse(String(e.data)) as ServerMsg);
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
