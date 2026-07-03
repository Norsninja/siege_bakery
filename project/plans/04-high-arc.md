# The High Arc — elevation screw (mini-pass)

*Status: BUILT + browser-verified 2026-07-03; REMAINING: the visionary's
feel check (the exit question below). Designed the same day across the
post-slice-2 discussions (see research/02-vision-alignment.md); roadmap
locked by the visionary: High Arc → Test Cake (tiers + crown) → Frosting +
census; friend test rides in parallel as an ops task.*

*Build record: 80 tests green, tsc clean. Verified live: screw op over
the wire ticked notch 1 and the HUD read "arc +15°"; a 6-click cherry —
dead-center at notch 0 — fell SHORT of the cake at +15° (steeper =
shorter, the whole point); tilt persisted through firing. tickMachine
gained an optional 4th screwTicks param so every pre-existing crank-law
test stood unchanged; notch-0 ballistics pins untouched (tilt defaults
to 0 everywhere).*

## The one question

**"Does a shapeable arc deepen dead reckoning without breaking the feel we
already called fun?"**

## Design (settled)

- **The screw is AT THE FRONT and tilts the frame back.** Raising the nose
  steepens the arc — the machine explains itself. Dwarven make; a great
  ugly screw is period-correct for this universe.
- **Notch 0 = today's exact throw, untouched.** Launch elevation = the
  arm's natural 55° + tilt. The pinned settle ladder survives verbatim as
  the notch-0 row; tilt notches ADD rows.
- **Notches of +15°: 0 / 15 / 30 / 45** (launch 55/70/85/100°). 85° is the
  nearly-straight-up comedy lob; 100° fires gently BACKWARDS over the crew
  — mistakes execute, the screw setting is part of the shot you inherit
  from your partner. Playtest prunes the set if the ends land flat.
- **Screw feel: held work, like the winch but quicker** — 0.5s per notch
  (SCREW_TICKS_PER_NOTCH = 30), hold E + W/S on the screw. Letting go
  drops partial progress; flipping direction restarts it; at a limit the
  screw just clacks (no banked progress), all mirroring the crank law.
- **Tilt PERSISTS through firing** (like traverse; only tension resets).
- **No trajectory hint** — deferred by the visionary (research/02); the
  arc itself, the landing markers, and the pennant remain the guides.

## Touches

- `game/catapult.ts` — tiltNotch state + turnScrew + screw intent +
  screwTicks progress (tickMachine gains an optional 4th param so the
  existing crank-law tests stand unchanged).
- `core/ballistics.ts` — launchVelocity(traverse, clicks, tiltDeg = 0);
  elevation = 55 + tiltDeg. Default keeps every existing call/test legal.
- `game/protocol.ts` — op carries `screw`; mergeIntents merges it like
  turns (sum → sign); shot carries tiltNotch; machine/welcome carry
  screwTicks for the handle animation.
- `server/room.ts` — threads screwTicks; shot spawn + broadcast with tilt.
- `client/main.ts` — screw interactable at the machine's nose (E + W/S),
  frame visibly leans (rotation order YXZ: traverse then tilt), HUD shows
  `arc +N°`, both loopback and ws paths spawn with tilt.

## Verification

- catapult.test: screw law (accrual, drop, flip, clamps, persistence).
- ballistics.test: analytic rows — tilt 15 flies steeper/shorter than
  tilt 0 at equal clicks; tilt 45 (100°) has a POSITIVE z velocity
  (backwards). Notch-0 sim pins untouched.
- room.test: screw intent over the wire ticks the notch; shot broadcasts
  tiltNotch; two hands on the screw merge like turns.
- Browser: raise to +15, lob at 6 clicks, confirm shorter landing; HUD and
  visible lean; then the feel check — the visionary's hands, not mine.

## Exit

Feel verdict from the visionary: does working the screw feel like
operating (good) or like menuing (bad)? Then the Test Cake slice gives the
high notches their reason to exist.
