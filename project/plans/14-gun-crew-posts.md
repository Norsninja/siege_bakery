# Plan 14 — The Gun Crew: posts replace grips (EXPERIMENT, feel-test gated)

**Status: BUILT 2026-07-08, awaiting the visionary's feel test. This is an
experiment by explicit agreement — "we might need to re-evaluate our
rollback. this requires trying it." Rollback = revert the one build commit;
input.ts keeps the superseded grip law intact underneath.**

## Where this came from (the 2026-07-08 discussion)

The E+WASD chords were the pain (worse after the vernier made screw-dialing
frequent). The visionary opened the design space: mounting the machine, a
dedicated machine UI, first-person from the catapult, or just new keys —
"the only thing set in stone is that this is a 3D artillery game about
decorating desserts for Giant patrons. it's theme is a fun party game."

Discussion findings, agreed:

- **The camera taboo was re-scoped, not deleted.** The load-bearing law is
  "the reticle never aims — aim stays discrete machine state" (countable
  notches/clicks, the dead-reckoning table, controller parity). Camera
  POSITION was never the point; sighting down the throw line is the
  artillery fantasy and is now welcomed.
- **The co-op invariant is ONE BODY, ONE JOB AT A TIME** — not input
  awkwardness. A full-parallel mount (aim while cranking) would let one
  player do three jobs and erode the crew advantage; the visionary also
  disliked two bakers riding one catapult. Posts keep bodies on the
  ground, one job each, and division of labor emerges from FLOOR SPACE —
  the Overcooked way.
- **The workload data reframed**: the machine is one-person operable (solo
  pass is tight by design); two players win by parallelism (aim ∥ crank ∥
  fetch). Posts preserve exactly that parallelism shape.

## The shape (BUILT)

Three stations, matching a real siege crew:

- **GUNNER'S POST** — behind the frame (machine-local (0, +1.6), the
  sightline). E mans it (feet plant), A/D wheel at the same 30°/s, W/S
  screw at the same 0.15s/notch, **F pulls the lever** (always executes;
  dry release keeps its comedy flash), E steps off. On manning: one gentle
  camera snap down the throw line (facing + traverse), then the head is
  free. The HUD panel carries the aiming instrument — the vernier ladder
  lives here now (the gauge-split call, moved with the screw).
- **WINCH POST** — the right flank (machine-local (+1.5, −0.55), at the
  drum). E mans, **hold Space** cranks, E steps off. Muscle, nothing else.
- **BUCKET** — unchanged walk-up: carry a topping, E loads. The loader is
  the runner; the pantry loop is sacred.

Mechanics of record:

- Zones: `POST_RADIUS_M` 1.2 around each anchor; anchors rotate with the
  town's facing (client/posts.ts, pure + pinned). Your own town's machine
  only (anchors ride `view.yourTown`).
- E precedence, one edge one meaning: step off > bucket/shelf crosshair
  interaction > man the zone you stand in.
- Auto-unman: any tick the baker is outside the manned zone (carry-home,
  the fresh deal, future shoves) — feet planted means E is otherwise the
  only exit.
- **The wire is untouched.** Posts derive the same `MachineIntent` the
  grips did; server/core/game unchanged. Crosshair prompts for
  wheel/screw/winch/lever now REDIRECT to the posts; interactions.ts's
  lever branch is unreachable while the experiment runs (main filters
  edge targets to bucket/shelves).

## Feel-test questions (the rollback gate)

1. Does manning/stepping-off read instantly, or do hands miss the zones?
   (Radius 1.2 is a guess.)
2. Does the gunner's A/D-while-watching-the-arc feel like artillery joy or
   like driving a tank?
3. Does Space-to-crank at a separate post read as teamwork bait or as a
   pointless walk for the solo baker?
4. Camera snap on manning: welcome or head-yank?
5. Does F-to-fire misfire socially (F pressed while meaning to load)?

## Later, if it sticks

- Visual post markers on the greybox (a stand-here flagstone per post).
- Ghost stance at posts (position sync already tells the truth; a manned
  pose would tell it louder).
- The gunner panel grows into the real instrument UI (big dial art).
- Mouse-wheel screw notches (flagged tension: scroll is instant, the screw
  is committed held work — would need a work-queue compromise; playtest
  spice only).
- Delete the superseded grip law from input.ts on purpose, with its tests.
