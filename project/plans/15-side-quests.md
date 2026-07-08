# Plan 15 — SIDE QUESTS: the standing notes ledger

**Status: LIVE LEDGER, opened 2026-07-08 from a discussion session
(visionary's playtest notes, triaged). This file replaces nothing — it
is the page the CLAUDE.md one-line ledger items grew into. Sessions
CLAIM an item by editing its status line; decisions of record are
final unless the visionary reopens them. Keep entries to decisions,
constraints, and open questions — the discussion that produced them is
not re-recorded here.**

Buckets: **PRE-FRIEND-TEST** (lands before plans/12 runs) ·
**AESTHETICS PASS** (a later dedicated sweep) · **POST-CAMPAIGN
DISCUSSION** (needs a design session after plans/13 economy exists) ·
**OPEN QUESTION** (no action; recorded so it isn't re-derived).

---

## 1. Landing rings: last shot PER CATAPULT — PRE-FRIEND-TEST

**Status: unclaimed.**

Decision of record: one ring per catapult, replaced by that gun's next
lob. NOT last-shot-global (a teammate's shot must never erase your
walk-the-fall correction) and NOT the current FIFO-30 breadcrumb trail
(shots-view.ts `LANDING_MARKER_MAX`, audit 2026-07-03) — in the LOBBY
no redeal ever clears it and test shots pile up visibly (playtest
2026-07-08, the note that opened this file).

Scope: `shots-view.ts` only. The marker needs to know its firing town
(the ShotMsg already says); `addLandingMarker` keys by town instead of
FIFO. Grain landings stay QUIET (plans/10) — unchanged. The
fresh-deal `clearLandingMarkers` law stays.

## 2. The tilt ladder's dead top — PRE-FRIEND-TEST, harness-gated

**Status: unclaimed. NOT an eyeball change — verification obligation
below.**

The facts (so nobody re-derives them): the arm's release elevation is
FIXED at 55° (`ballistics.ts LAUNCH_ELEVATION_DEG`); the vernier ADDS
tilt, 2.5°/notch × 18 notches, so total runs 55°→100°. Tension buys
SPEED ONLY — pull-back does not change the release angle (physically
honest: a real arm releases at the crossbar regardless of draw). At
~notch 12 the total passes 85° (near-vertical); ~notch 14 is 90°
(straight up); above that the cosine goes negative and the machine
lobs gently BACKWARDS. The top ~5 notches are a trap: a player winds
to max expecting MORE and gets the ball on their own head.

Proposed (pending harness): clamp `TILT_MAX_NOTCH` to ~12 (≤85°
total). MUST re-run the research/11 coverage harness first — the
pinned TOWN_POTENTIAL numbers were measured riding the full ladder,
and fine tilt is what bridges the moat; confirm the clamped notches
contribute nothing to the envelope before cutting them.

Rider (same claimant): render-contract check that the VISUAL arm
releases at ~55° + tilt — if the animation reads a different release
angle, players learn the machine wrong even though the sim is right
(the verify-positions-not-counters rule).

## 3. Order-report inset frame: responsive — PRE-FRIEND-TEST

**Status: unclaimed.**

The end-of-order report's inset frame covers its own text at some
viewport sizes (seen in the web interface). Decision: the inset is
10% of screen size, responsive. Trivial scope in `hud.ts`. It WILL
bite on the friend's monitor — that's a different resolution by
definition.

## 4. Projectile trails — PRE-FRIEND-TEST (promoted by the visionary)

**Status: unclaimed.**

Transparent, fading trails on projectiles. Promoted out of the
aesthetics pass 2026-07-08: playtest brains want them, the loop is
simple (shoot a catapult, dress a cake) so the juice IS the content —
and trails are secretly functional aim feedback (you see your arc, you
correct). Cheap ribbon/line, client-only, `shots-view.ts` territory.

## 5. Post-local HUD — AESTHETICS PASS

**Status: parked until the pass. Promotion trigger: if friend-test
first-timers can't find their post's numbers, this jumps the queue.**

At each post, that post's stats front and center — no corner-left
glances. Winch: tension amount BIG, center screen, the keys to press,
and the LAST fired tension setting. Gunner: all relevant stats large
but NOT center. Two constraints recorded now: (a) "last tension"
needs a small remembered state (last fired clicks per catapult);
(b) whatever keys are displayed must render from ONE shared table per
post so the W/S = more/less law (plans/14) cannot drift between HUD
and input.

## 6. Power-ups — POST-CAMPAIGN DISCUSSION (do not build early)

**Status: awaiting a design session AFTER plans/13's economy lands.**

The idea: increased frosting coverage/spread, 2× carry, baker speed,
etc. Visionary's shape (2026-07-08): TWO channels — you can BUY them
(the shop), and the team can be AWARDED them, in which case they
APPEAR PHYSICALLY IN YOUR BAKERY AREA. The award channel is the
game's soul — rewards as objects you walk to, not menu buffs; the
delivery mechanism is a thing on the floor you interact with (fits
one-body-one-job).

Engineering constraints binding on any design: (a) power-ups are
ROOM-AUTHORITATIVE match state that RIDES THE SHOT EVENTS — a spread
multiplier changes the splat law, and cake state syncs as
deterministic events, so the modifier must be event/match data, never
a client-side effect; (b) 2× carry loosens the ferry loop, which is
the co-op pressure — legitimate as a PURCHASED relief valve, priced
like one. Reason it waits: the shop (plans/13 §5) is the natural
delivery vehicle; building power-ups first means inventing a second
progression system and reconciling later.

## 7. The 55° floor — OPEN QUESTION, no action

The machine can never fire flatter than 55° (item 2's facts). If
playtests ever want a flat, direct shot — skim under something, rope a
low wall — that is a DESIGN change (a second machine type or an
arm-geometry rework), not a tuning tweak. Recorded so the wish, if it
arrives, lands here instead of in a tuning session.
