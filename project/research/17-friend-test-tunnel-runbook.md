# Research 17 — THE FRIEND TEST TUNNEL (runbook, rehearsed 2026-07-11)

**Status: REHEARSED END TO END on a fresh port (36254) + cloudflared
quick tunnel. Every layer verified except the visible two-player eye
pass, which IS the friend test. The vendored `tools/cloudflared.exe`
(2026-07-07, gitignored) works as-is — no account, no install.**

## The recipe (host = the visionary's PC)

```
npm run build                                  # fresh dist (walls ride now)
npm run server                                 # 5175: dist + ws, ONE port
tools\cloudflared.exe tunnel --url http://localhost:5175
```

cloudflared prints `https://<four-words>.trycloudflare.com` after a few
seconds. Send THAT URL to the friend. Done — the served page auto-joins
its own origin, protocol-matched (net.ts pickWsUrl: built page → wss on
an https origin; the tunnel-gate law, pinned in net.test.ts).

- **RESTART THE LONG-RUNNING SERVER FIRST.** dist/ is read per-request,
  but the MIME table is process state — a server started before
  2026-07-11 serves .glb/.mp3 as octet-stream (handoff 13's note; the
  rehearsal confirmed the fresh process serves model/gltf-binary +
  audio/mpeg through the tunnel).
- **No firewall prompt, no port forwarding:** cloudflared dials OUT to
  Cloudflare's edge; nothing inbound touches the PC.
- The URL is EPHEMERAL — a new one per tunnel run. Expired-link and
  wrong-server states are already worded on the client (the dead-link
  truth + the silent-server watchdog, main.ts).

## Rehearsal measurements (2026-07-11, host PC → edge → same PC)

- Headers survive the tunnel: index text/html, wall.glb
  model/gltf-binary, mp3 audio/mpeg.
- ogre.glb (9.6 MB, the fattest asset): **2.2 s** through the tunnel
  (~4–5 MB/s). Boot-critical fetch set (page + 3 JS bundles + 4 GLBs,
  dwarf and audio lazy) ≈ 13.5 MB → expect a **~4–6 s first load** on a
  comparable link. Tolerable; the asset diet (plans/15 item 14) is
  still worth taking before the cast grows.
- Two clients joined one room through the public URL; welcome +
  broadcasts verified arriving over tunneled wss (raw-socket probe);
  sockets survive the 30 s heartbeat for minutes.

## THE HIDDEN-PANE TRAP (cost this rehearsal an hour — read this
before ever "debugging" a stuck client again)

A hidden/embedded browser pane gets **NO requestAnimationFrame
callbacks**. The client's frame loop (HUD repaint, rendering, pose
sends) never runs there — the HUD freezes at the last synchronous
write, which is literally `"joining the bakery…"` (main.ts writes it
just before `await firstWelcome`; the repainting loop starts after).
Meanwhile the join is HEALTHY: the server logs the baker, the welcome
lands (`view.myId` set), `__game` exists (dev), and the socket answers
heartbeats (browser-level pong, no JS needed).

Verification surfaces that DO work in a hidden pane: the room server's
own log (`baker N connected (M in the bakery)`), curl for headers and
sizes, a raw `new WebSocket(...)` probe collecting messages, and sync
scene-graph reads. Also: **PROD builds do not expose `__game`**
(import.meta.env.DEV gate) — through a tunnel, the server log is the
only join oracle.
