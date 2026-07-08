# Plan 14 — The Gun Crew: posts replace grips (EXPERIMENT, feel-test gated)

**Status: BUILT 2026-07-08; FEEL TEST ROUND 1 PASSED same day — "the
posts feel good" (visionary). Round-1 findings built same day: the
UNWIND (S at the winch; signed crank on the wire) and the gunner FLANK
SPOTS + flagstones (dead-center manning put the throwing arm in the
view). Rollback provision stands — revert the build commits; input.ts
keeps the superseded grip law intact underneath.**

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

- **GUNNER'S POST** — behind the frame, TWO FLANK SPOTS since round 1
  (machine-local (±1.0, +1.6), r 0.6 — manning dead-center put the
  throwing arm in the view; the band behind the arm gives no
  invitation). E mans it (feet plant), A/D wheel at the same 30°/s, W/S
  screw at the same 0.15s/notch, **F pulls the lever** (always executes;
  dry release keeps its comedy flash), E steps off. On manning: one gentle
  camera snap down the throw line (facing + traverse), then the head is
  free. The HUD panel carries the aiming instrument — the vernier ladder
  lives here now (the gauge-split call, moved with the screw).
- **WINCH POST** — the right flank (machine-local (+1.5, −0.55), r 1.2,
  at the drum). E mans, **Space or W winds, S unwinds** (round 1: "we
  need a key to unwind" — the post grammar is W/S = more/less
  everywhere; Ctrl was REJECTED, the browser owns Ctrl+W; chords stay
  dead). E steps off.
- **BUCKET** — unchanged walk-up: carry a topping, E loads. The loader is
  the runner; the pantry loop is sacred.
- **FLAGSTONES** — a stand-here marker per spot (gold = gunner, iron =
  winch), drawn from posts.ts's own POST_SPOTS table so zones and stones
  cannot drift; a facing-only SIBLING group (the rig root swings with
  traverse; the crew's footing must not).

Mechanics of record:

- Zones: per-spot radii in POST_SPOTS; anchors rotate with the town's
  facing (client/posts.ts, pure + pinned). Your own town's machine only
  (anchors ride `view.yourTown`). Nearest-by-depth claims; the gunner
  flanks and the arm's dead band are pinned.
- E precedence, one edge one meaning: step off > bucket/shelf crosshair
  interaction > man the zone you stand in.
- Auto-unman: any tick the baker is outside the manned zone (carry-home,
  the fresh deal, future shoves) — feet planted means E is otherwise the
  only exit.
- **THE UNWIND is the slice's one game-law change** (round 1): `crank`
  went SIGNED (−1|0|1) through MachineIntent/HeldOp/the op wire msg,
  mirroring the screw — same held seconds per click both directions,
  reversal restarts the click, slack clacks, roster validates like
  turn/screw, and mergeIntents STALLS a winder against an unwinder (the
  honest ratchet — pinned at unit and Room level). Everything else on
  the wire is untouched: posts still derive the same `MachineIntent` the
  grips did. Crosshair prompts for
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

## Review round (2026-07-08, post-feel-test walk-through)

The code review of the landed build found both its issues in ONE place —
main.ts's untested E-edge wiring (the pure functions around it were
pinned; the precedence expression between them wasn't):

1. **The step-off double-act**: pressing E to step off didn't consume
   the edge, so with the bucket under the crosshair (reachable from both
   posts — REACH_M 2.8) the same press stepped off AND loaded whatever
   the baker carried. One edge, two meanings.
2. **The eaten edge**: an empty-handed press at the bucket died in a
   no-op interaction instead of manning the zone the baker stood in —
   "E doesn't work at the winch sometimes."

THE FIX (visionary-blessed): the precedence chain moved into
interactions.ts as `resolveEEdge`, TESTED — same order (step off >
pantry interaction > man), but each stage **consumes the edge only when
it ACTS**. Stepping off takes the whole press; an interaction claims the
press only by doing something; what's left mans the zone.

AND THE CROSSHAIR WENT PANTRY-ONLY (visionary's call, same discussion):
the machine's controls (wheel, screw, winch, lever) left the raycast
entirely — their redirect prompts wore an interaction's costume ("… · E"
beside "E — man the winch" was two E-lines meaning different things).
`MACHINE_CONTROL_KINDS` (hud.ts) is the one set; scene.bindTown drops
the meshes, `pantryTarget` refuses the kinds (belt + suspender), and the
HUD invite YIELDS to an actionable target via `interactionActs` (a dry
run of the real rules, never a copy). promptFor's redirect cases and the
meshes stay underneath, superseded-kept, like the grip law.

**FRIEND-TEST WATCH ITEM**: with the redirects gone, a first-time
player's only teachers are the green circles + the zone invite + the
post panel. If friends flounder at a mute machine (plans/12), reintroduce
signpost prompts — reworded WITHOUT the "· E", and suppressed while
inside a zone, so the ambiguity stays dead even if the teaching returns.

## Later, if it sticks

- Visual post markers on the greybox (a stand-here flagstone per post).
- Ghost stance at posts (position sync already tells the truth; a manned
  pose would tell it louder).
- The gunner panel grows into the real instrument UI (big dial art).
- Mouse-wheel screw notches (flagged tension: scroll is instant, the screw
  is committed held work — would need a work-queue compromise; playtest
  spice only).
- Delete the superseded grip law from input.ts on purpose, with its tests.
