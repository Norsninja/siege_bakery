# 12 — Friend-test runbook (dress-rehearsed 2026-07-07)

The success test from CLAUDE.md line one: send a friend a link, play
PC-to-PC over the net. Scope decided (visionary, 2026-07-07): the dev
toggle unlocks town 2 — the shop is fork 2's. Transport decided:
cloudflared quick tunnel. AMENDED same day: the DESSERT REPORT rides
along (plans/09 §1's promoted hook, snapshot form — client/snapshot.ts):
at every order end a tripod photo of the dessert, the Giant's-eye view,
hangs framed in the corner through the linger with the verdict as its
caption. An inset, never a cut — the switch run stays open.

## One-time prep — DONE 2026-07-07

- `tools/cloudflared.exe` (gitignored; re-fetch if missing:
  `curl -sL -o tools/cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe`)
- The tunnel gate is FIXED and PINNED (net.ts `pickWsUrl`, net.test.ts):
  a BUILT page auto-joins its own origin, wss on https — any port, any
  tunnel. Before this, a tunneled friend silently fell back to loopback
  solo (port-5175 literal + hardcoded ws://).

## Test day — three commands (three terminals or two + background)

```
npm run build
npm run server                                   # 5175, serves dist/
tools\cloudflared.exe tunnel --url http://localhost:5175
```

Send the friend the printed `https://<random>.trycloudflare.com` URL —
the bare URL is the whole link; the built page auto-joins. The URL is
random per tunnel run: mint it fresh each session.

Host plays at `http://localhost:5174/?join=ws://localhost:5175` — the
vite dev page explicitly joined to the room server: same room as the
friend, zero tunnel hop, AND the DEV-only `__game` handle. Requires
`npm run dev` also running; if you'd rather not, play the built page
at `http://localhost:5175`.

TOWN 2 IS BOUGHT IN-GAME now (plans/13 §5, slice 5 — the
`__game.unlockTown2()` console seam is RETIRED): win an order, walk
to the stall (side wall, halfway pantry↔machine), E with 50 coins in
the shared purse. Two decent wins fund it — the campaign teaches the
purchase; no console needed. Dev shortcut if a test wants town 2
FAST: in a `__game` tab, seam the purse then buy inside a won
linger — `__game.room.run.purse = 50; __game.room.broadcastRun()`
(loopback `room` is null over ws — over the wire, earn it honestly)
or send the input directly: `__game.send({t:"buy", item:"town2"})`
in the won separator with a funded purse.

NOTE: `npm run preview` was REMOVED (independent audit 2026-07-09):
a BUILT page auto-joins its serving origin (the tunnel-gate law,
net.ts), and vite's preview server hosts no room — that command
manufactured a guaranteed dead join. The room server IS the preview:
`npm run server` serves `dist/`.

## Rehearsal evidence (2026-07-07)

- Real browser on the built page auto-joined an arbitrary-port room
  server (server log: "baker 2 connected").
- Node client through a live cloudflared URL: https page 200 (built
  bundle), wss upgrade, room welcome — then "2 in the bakery" with both
  pipes sharing one room.
- 237 tests green incl. the pickWsUrl pins; dev page still loopback solo.

## What the test is FOR — the parked feel questions (audit ledger)

1. Does the away-warning banner get READ by a sprinting human, or does
   it need the screen-edge pulse?
2. Does the 18s linger feel comfortable for the switcher without
   dragging for the stayer? (`ORDER_RESET_TICKS`, one number.)
3. Frosting splat legibility at distance — can players see their paint
   land from the fort?
4. General latency feel: machine ops round-trip through the tunnel;
   baker movement is client-auth and should feel instant.
5. THE PHOTO: do players look at it? Does the corner placement read
   without stealing the switch run? Is the Giant's-eye framing the
   trophy plans/09 promised? (First candidate for the fork-3 orbit
   upgrade if it lands.)

## Troubleshooting

- Friend sees "joining the bakery…" forever → tunnel died; restart
  cloudflared, send the NEW URL.
- Friend suspects he is alone → he isn't, if the host sees his ghost;
  the silent-loopback failure mode is pinned shut (net.test.ts).
- Port 5175 already busy → `PORT=5199 npm run server` and tunnel 5199;
  the build auto-joins whatever origin serves it.
