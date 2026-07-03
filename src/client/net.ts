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
  const id = room.join(onMsg);
  return {
    transport: {
      send: (msg) => room.onMessage(id, msg),
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
  ws.addEventListener("close", () => onStatus("closed"));
  return {
    send: (msg) => {
      if (open) ws.send(JSON.stringify(msg));
      else queue.push(msg);
    },
    close: () => ws.close(),
  };
}
