# Vision Alignment — post-slice-2 discussion (2026-07-03)

*Status: recorded from the visionary's alignment dump after the slice-2
playtest SUCCESS. This doc holds decisions and backlog seeds from that
discussion; plans/04 (High Arc) gets drafted from the settled parts.*

## The state, affirmed

"Everything is going smoothly: we have the machine, we have the cake, we
have the loading dynamic, we can lob cherries and limes onto the cake, and
the Patron judges it." Slice 2 verdict stands: fun; the Giant's comments
are great.

## The world (lore anchor — first time stated)

- A **universal fantasy universe** — "like Ready Player One but for the
  fantasy genre": characters from everywhere in fantasy live here.
- **The chefs are dwarves. The Patron is a giant.**
- **The catapult is a dwarven creation** — centuries of wars across all
  the different stories; now retooled to feed giants. (The pivot's premise
  — "the war is over, the catapults remain" — gets its make and maker.)

## Decisions from this discussion

1. **The spotter is NOT a formal role.** Players won't use gunner language
   — they'll shout "you missed, too high, way off." Spotting stays totally
   informal/emergent; no UI role, no callout design constraints. With two
   players the natural split is one on toppings, one on the catapult.
   (Design consequence: notch/click granularity no longer needs to be
   optimized for shoutable corrections — it needs to be optimized for
   FEEL.)
2. **Elevation = a screw that tilts the catapult frame back**, making the
   arc more parabolic. Notched like the crank — 15° increments, possibly
   up to 90° (straight up; mistakes execute — a vertical lob comes back
   down on the crew, which is comedy, not a bug).
3. **A trajectory HINT exists — this REVISES the no-prediction-UI law.**
   Visionary's call, explicitly: "some small indicator of where the
   trajectory will go, maybe a short arc that dissolves after some time —
   it just hints at the direction." Dead reckoning must stay fun; the hint
   is a short, dissolving STUB (direction and arc shape near the machine),
   never the landing point. Proposed rider carried from the 2D pennant
   law, pending sign-off: when wind arrives, the stub always shows the
   CALM-AIR arc — wind visibly deviates the real shot, and reading the
   pennant stays the wind skill.
4. **The crank tells its strain.** SFX and other hints convey the catapult
   being stretched to its limit as tension climbs.

## Backlog seeds (recorded, NOT scheduled)

- **Overstretch → failure → repair.** Hold max draw too long and the
  machine can FAIL, introducing a repair interaction. Note the design
  function beyond flavor: it punishes pre-cranking and camping at full
  draw — you can't charge the shot and wait indefinitely for the perfect
  moment. Pairs with the strain SFX above. Needs its own design pass
  (failure odds/timer, what breaks, how repair feels).
- **The scale pass.** Dwarf chefs, giant patron: a cherry is currently
  dwarf-head-sized or smaller — giant-scale produce should be HUGE
  relative to the bakers. Retroactive justification noticed: toppings the
  size of your torso EXPLAIN the carry-one-at-a-time rule and give the
  carry its comedy silhouette. Touches ballistics tuning (projectile
  radius), the pantry, the cake tiers, and the art pass — schedule with
  or just before art.
- **Optics for the informal spotter.** Distance viewing is genuinely hard
  (verified: from ground level the cake top is nearly invisible). A
  dwarven spyglass/binoculars prop could serve the informal spotter.
  Unscheduled; greybox lives without it.

## Where this leaves the roadmap

Unchanged in shape, enriched in content: **High Arc next** (elevation
screw + notches + trajectory stub + strain-readout hooks), then the **Test
Cake slice** (three tiers + crown-as-uppermost + frosting + census), then
onward per research/01. Overstretch/repair, scale, and optics wait in the
backlog above.

## Open questions (live discussion)

- Notch set: full 15°–90° in 15° steps (6 notches), or trimmed 30°–90°
  (5)? Current fixed 55° is off-grid; nearest default is 60°.
- Stub arc: how long (fraction of flight) and how long-lived (dissolve
  seconds)? Shown while operating only, or after each change of
  tension/elevation?
- Screw feel: instant clunk per notch or a short throw (~0.4s/notch)?
