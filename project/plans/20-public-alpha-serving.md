# Plan 20 — PUBLIC ALPHA SERVING

**Status: DRAFTED 2026-07-12 (eighteenth session) from the
visionary's standing technical notes, discussed and shaped the same
session. NOT claimed and NOT next: sound (plans/16 slice 6) and the
weight diet (plans/15 item 14 — audio bitrate + the Draco/KTX2
ruling) stay the agreed next steps. This plan is the milestone AFTER
the audiovisual milestone: the game stops being a friend-test and
starts being a link anyone can open.**

## 0. The success test

A stranger — not a friend on a call with us — opens a link, watches
the game load visibly, joins a private room by code or invite link,
adjusts their mouse sensitivity, plays a full bakery day, and when
something breaks on their machine WE FIND OUT without them telling
us. No accounts. No store page. Private link rooms are enough.

## 1. The front door

A real title/lobby flow: **Play Solo · Host Private Room · Join
Room · Settings · Credits.** The current lobby is good diegetically
— a public user needs a stable front door BEFORE pointer lock grabs
their cursor.

Relationship to plans/16 slice 8 (recorded so the two don't fight):
slice 8 is the diegetic TITLE MOMENT (the chalkboard, the logo, the
name — still blocked on the name and nothing else) and stays in the
audiovisual milestone. THIS section owns the FLOW around it: the
menu, the room join path, the settings door. Slice 8's title screen
becomes the front door's face when both exist.

Dependency: Host/Join buttons are lies until §3's room manager
exists. Build order runs through §3.

## 2. The loading pipeline

Visible loading with progress, failure copy, and "continue with
low-detail assets." A 2026 web game shows its loading; a blank canvas
reads as broken.

What the culture already built (don't rebuild it): the fallback
ladder (species → ogre → null; assetless boot is a normal Tuesday)
IS "continue with low-detail" — it needs surfacing, not inventing.
line.ts already lazy-loads templates; the dwarf already lazy-loads on
first ghost.

What's missing: an explicit PRIORITY MANIFEST and a progress UI over
the loader seam (assets.ts loadModel is the single choke point).
Priority split, per the visionary's note:

- **Critical (block the play button):** engine, cake, catapult,
  player/dwarf, the CURRENT patron.
- **Deferred (stream behind play):** the region, the waiting line,
  music, decorative props, the far crowd.

## 3. The room system

Keep the single authoritative Room — it is THE match implementation,
transport-agnostic by design — and add a THIN manager above it:

- room code / id (unguessable enough for private links)
- max players per room
- host reset
- idle room cleanup
- server health endpoint
- "copy invite link" (the ?join= seam already exists; the link just
  carries the room code too)

RULED (visionary): **do not build accounts.** Private link rooms are
enough for this milestone. Connections stay anonymous; plans/15 item
8's identity/persistence question stays deferred behind its own
design session.

This is the largest single work item in the plan and unlocks §1's
Host/Join. server/ only; core/ and game/ untouched.

## 4. The production hosting shape

Static files on a CDN/static host; the WebSocket room server on a
small VM/container — separate concerns, deployed separately.

Facts checked 2026-07-12: Cloudflare Pages' 25 MiB limit is
PER-FILE; our fattest single files are ~3.5 MB GLBs and ~2.8 MB MP3s
— fine, and the diet pipeline (plans/15 item 14) keeps it so. The
TOTAL weight (fresh dist ≈ 38 MB vs the ~25 alarm) is the real
problem and belongs to the diet item, not this plan — but this plan
inherits its result. The room server currently serves dist/
statically (the one-tunneled-port friend test); that stays as the
dev/self-host path, the CDN split is the public path.

## 5. Settings and accessibility

Minimum professional set: mouse sensitivity, invert Y, fullscreen,
graphics quality, music/SFX volume, mute, color/contrast-safe HUD,
key reference. Later (recorded, not scoped): remappable controls,
controller support. For now keyboard/mouse gets excellent.

SEQUENCING RULE (from the discussion): the music/SFX **volume bus is
built WITH plans/16 slice 6** (the SFX table), not retrofitted — the
settings panel later just grows knobs for a bus that already exists.
The key-reference panel reads posts.POST_KEYS (the one-table law,
plans/15 item 5) so it cannot drift.

## 6. First-time onboarding

The friend test already said where this goes: **in-world, at the
object, never tutorial panels.** E-key prompts AT the post/pantry/
machine ("what does this post do?"), "what am I holding?" on the
carry, and "where did my shot land?" — which plans/15 item 15 (the
green/red landing verdict) now claims as the same feature family.
This section ledgers the fourteenth session's unledgered E-prompt
ruling; it is no longer floating.

## 7. Observability

Lightweight ENGINEERING telemetry before any public link — no
personal tracking, no marketing surveillance (visionary's words).
A tiny beacon endpoint on the room server is enough; no third party.

The metric list: boot success/fail, asset load time, room join fail,
disconnect, average-FPS bucket, order/rung reached, fatal JS errors
(the window 'error' trap from the ground-plane lesson — uncaught
frame-loop deaths are exactly what we can't see remotely).

## 8. Release discipline

A release checklist AS A SCRIPT — `npm run release` chaining:

1. `npm run check` (tests + both tsc legs)
2. `npm run build` (fresh dist — never ship stale)
3. asset size report vs the plans/16 §4 budget
4. model diet verification (no undieted GLB ships)
5. untracked-shipping-asset scan
6. boot smoke against the built dist
7. package/zip

The standing argument for building this FIRST: the stale-dist trap
found this very session — dist/ at 21 MB, missing all three new
giants, would have shipped a broken cast to any friend test. The
handoff culture is strong; the build pipeline gets the same
discipline. Cheapest item in the plan, guards every other one.

## 9. Sequencing recommendation (discussed, not yet claimed)

1. **§8 release script** — cheapest, catches problems in every later
   step, pays immediately.
2. **§3 room manager** — the largest item; unlocks §1.
3. **§2 loading pipeline** — priority manifest + progress UI.
4. **§1 front door** — flow around slice 8's title moment.
5. **§5 settings** — after slice 6 ships the volume bus.
6. **§7 observability** — before the first public link goes out.
7. **§4 hosting split** — last; needs a deploy-target decision and
   inherits the diet's final weight.

§6 onboarding rides alongside as client slices (it shares plans/15
item 15's build).

## 10. Laws binding this plan

- The sacred layering holds: the room manager is server/, the front
  door and loading are client/, and core/ + game/ ship UNTOUCHED by
  this entire milestone.
- Determinism untouched: room codes and invite links are transport
  concerns; the Room's seeded, event-synced world never learns about
  them.
- No accounts, no persistence — plans/15 item 8 stays behind its own
  design session.
- The tone guard extends to failure copy: loading errors and join
  failures speak the fantasy's language where possible (the semantic
  audit, plans/15 item 12) but NEVER at the cost of clarity — a
  stranger debugging their connection needs plain words.
