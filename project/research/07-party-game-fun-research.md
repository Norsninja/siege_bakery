# Research 07 — What Makes Co-op Party Games Fun (external scout brief)

Date: 2026-07-04. Scout: web research pass over designer interviews, postmortems,
and design analyses. Sources cited inline per finding. Opinion is marked as
opinion in the final section.

---

## Q1. What makes Overcooked-style co-op FUN, per the designers

**The core loop is deliberate task overload.** Phil Duncan (Ghost Town Games,
Game Developer "Game Design Deep Dive: Building truly cooperative play in
Overcooked"): they ensured "there were generally always more actions to perform
than players available." Overload is what prevents players settling into silent,
routine role assignments — it forces renegotiation, which forces talking.
The MCV Develop postmortem confirms this was intentional: overwhelm ("too many
tasks with the amount of players you have") generates the panic that makes it fun.

**Time pressure is the cooperation driver, not the difficulty driver.** Duncan:
"time is one of the most important elements" in encouraging teamwork — the timer
exists so that dividing labor is the only way to succeed ("many hands make light
work"). Note the failure-design corollary below.

**Disruptions > static difficulty.** The single most transformative Overcooked
decision (Duncan, same Deep Dive): "adding disruptions: events which would change
the rules midway through a level" — sliding counters, earthquakes splitting the
kitchen, moving ice floes. Oli De-Vine (MCV postmortem): they moved the level
around "to get people out of position" so players "didn't get into a routine."
Ghost Town's level design formula (Duncan, Push Square interview): "building
levels around a single element, whether it be separating players, creating a
pinch point, or something like that" — one twist per level, and they *simplified
recipes whenever the environment got harder* (De-Vine) so only one axis is hard
at a time.

**Productive delays create decisions.** Deliberate wait states (pot cooking,
plates returning) create "a simple element of risk: stay with the pot, or start
preparing for the next order and risk the pot catching fire" (Duncan). Downtime
isn't dead time; it's a gamble.

**Restriction buys cooperation bandwidth.** Early Overcooked builds allowed many
error states (partial chopping, serving raw food); removing them meant "players
could suddenly focus much more on cooperating" (Deep Dive). Player attention is
a budget: spend it on coordination, not on avoiding fiddly mistakes.

**Failure design: timer, not lives.** Prototypes used a 3-lives system; "people
got a bit bogged down" (Duncan, MCV), so they switched to "a time limit within
which to serve as many orders as possible" — you always finish the level, you
just score badly. Failure is a low score + a funny story, never a hard stop.

**Role fluidity beats forced roles.** Lovers in a Dangerous Spacetime (Asteroid
Base) tried color-coded power-ups to lock players into stations and it failed;
Adam Winkels (Game Developer, "Co-op communication in Lovers in a Dangerous
Spacetime"): "We ended up saying 'We'll just let people gravitate to the roles
they want to play.'" Their station design forces coordination *spatially* (you
physically can't man turret and engine at once) rather than by rule. Winkels also
recommends watching real pairs play: "you'll see how their normal relationship
dynamics collide with your artificial systems" — the game is a social instrument.

**Communication needs a REASON, and obstacles to it are content.** Keep Talking
and Nobody Explodes (Steel Crate, GDC talk "Designing Asymmetric Gameplay...")
built every puzzle to *require* talk, then deliberately complicated the talking
(unusual glyphs that must be described, homophone-prone words). Tension +
mistakes + hilarity come from imperfect verbal encoding under pressure.

**Emergent props pay for themselves.** MCV postmortem: a convention player threw
the fire extinguisher in the bin and started a kitchen fire — undesigned, kept,
beloved. Physical objects that can be misused are comedy generators.

**Accessibility widens the couch.** Moving Out (SMG Studio, GamesRadar/GamesHub
interviews): "We want everyone to be able to finish it, and everyone to be able
to play" — assist toggles (longer timers, lighter items, skip level) with no
achievement-shaming. PlateUp! (Alastair Janse van Rensburg, TheXboxHub
interview): "You only need two buttons to interact with everything" and "a new
player doesn't need to hold everyone else up while they get themselves ready."
Low floor per-player, high ceiling per-team.

## Q2. Session and progression structure

**Round length: ~3–4 minutes.** Overcooked levels run 3–4 minutes (Overcooked
wiki / community consensus). Short enough that "again!" is cheap, long enough
for an arc (setup → rhythm → disruption → scramble). Golf With Your Friends
caps holes at 2 minutes / 12 strokes. Splatoon Turf War is exactly 3 minutes.
The genre has converged hard on 2–4 minute scored rounds inside 30–90 minute
sittings.

**The star-gate ladder.** Overcooked's campaign: every level always completable,
graded 1–3 stars; new levels gated on cumulative stars, forcing replays of old
levels with better strategy. Community guides confirm players "barely scrape by
with one or two stars jumping in blindly" and must replay deliberately for 3
stars — the 3-star is the mastery loop, the 1-star is the content loop. One new
mechanic or twist per level, difficulty rises by composition.

**Roguelite alternative: choose your own difficulty.** PlateUp! (van Rensburg,
TheXboxHub): "Every three days you'll have to add a new challenge, usually with
the option of making your menu harder or making your customers more problematic"
— the ladder is player-chosen, so "everything you face is something you've
chosen to take on." Failed runs still bank persistent XP/unlocks. Result:
~150,000 players past 50 hours. The comeback driver is "each run is unique" +
losing a run costs nothing ("you get to start a whole new run with a whole new
set of challenges").

**What keeps groups returning:** in both models it's (a) cheap restart, (b) a
visible next-thing (next gate, next unlock, next dish), and (c) variance —
either authored (new level twist) or systemic (roguelite draft).

## Q3. Physics chaos and the funny/frustrating line

**Comedy = the gap between intention and outcome, WITH agency.** Polaris Game
Design Deep Dive on mechanical comedy (Jerome, Scott, Tremblay, Simoens, Garbe,
England): players are "*performing* the joke, rather than reading or hearing
it"; QWOP-style granular input works because "the massive mismatch between the
player's intention and outcome reliably yields comedic results." The line:
unpredictability must still read as intentional design — if failure feels like
"the game bugged out" and isn't tied to player input, agency dies and humor
turns to frustration.

**Low stakes license clumsiness.** Same source: "in a more playful and low
stakes context, difficult controls support comedic participation and discovery
with less potential for frustration." Gang Beasts pairs total imprecision with
near-zero cost of losing. Human Fall Flat's Tomas Sakalauskas (TheGamer/Wikipedia)
pivoted the whole game after watching his son "do everything possible not to
solve puzzles" and just enjoy the physics — so he made puzzles "not really
watertight": every physics accident can still be a valid solution.

**Failure must be fun to WATCH.** Joel Couture (Game Developer, "7 games with
entertaining fail states"): games should be "fun to watch when someone's playing
poorly"; ask "how can I give the player space to create even more fun ways to
fail?" Worms earns its place there: high-risk aiming mechanics create memorable
moments precisely because a badly-judged shot produces a spectacular, legible
outcome (usually on your own team).

**Where imprecision belongs.** Golf With Your Friends shows the failure mode
(TechRadar "I thought I was over my gamer rage..."; Nintendo Life review): when
the GOAL is precise and the physics are precise, added randomness (random ball
shapes, pendulums) reads as rage fuel to some players and party spice to others
— they had to make it opt-in via modifiers. The safer pattern (Gang Beasts,
Heave Ho): imprecision in the ACTOR, generosity in the GOAL. Heave Ho (Le
Cartel, actugaming interview): "each level must be able to generate a unique
play memory" — the memory is the flail, not the score.

## Q4. Moving/rotating targets

Direct designer commentary is thin here; the best precedents are physical.

**The mini-golf windmill (Taylor Bros ~1930s, motorized by Lomma Golf 1950s)
is the canonical rotating obstacle** and it's beloved BECAUSE the motion is slow,
periodic, and fully predictable: success = observation + timing, "earned through
careful observation and precise timing rather than pure chance" (Miniature Golf
Solutions / Harris Mini Golf trade write-ups). It's also classically framed as
risk/reward: you can putt around it, but the quick path through is alluring.

**Leading a moving target is a real, learnable skill** (ballistics/marksmanship
literature: computing a lead point ahead of the target) — and it's the skill
expression in every carnival shooting gallery. Golf With Your Friends' hockey
mode (randomly sliding goalie) sits at the frustrating end because the motion is
random, not periodic.

**Distilled rule:** periodic + visible + player-influenced motion = timing
puzzle (fun); random or opaque motion = coin flip (frustrating). A
player-cranked turntable is the BEST case: the motion isn't just predictable,
it's negotiable — "hold it... hold it... NOW" is a Keep-Talking-style
communication mechanic for free.

## Q5. Shared canvas / the result as trophy

**Splatoon proves coverage-painting is an inclusive goal.** Christian Nutt
(Game Developer, "The essence of Splatoon and what it gets right"): "Even if
you don't engage in combat, you're doing something that's not just helpful to
your team, but necessary for a win" — painting lets weaker players contribute
meaningfully. Territory is its own persistent feedback (every painted surface
shows your work), and the **end-of-match bird's-eye map reveal** turns the
whole round into one legible picture of what the team did. Nogami's team framed
inking as play, not war: "shooting ink around for fun is like going
skateboarding" (Nintendo interviews).

**The reveal moment matters as much as the making.** Splatoon's overhead judge
screen and Passpartout/Chicory-style "behold the painting" beats share a shape:
the round ends by SHOWING the artifact. In co-op physics games the equivalent is
the replay-worthy disaster; Couture's spectator principle (Q3) applies — the
cake should be as entertaining when botched as when perfect.

**Emergent decoration is social glue.** Overcooked 2's emotes were designed to
supplement voice chat, but players communicated by "throwing uncooked chickens
at one another" (Duncan, Push Square) — given a shared surface and projectiles,
players WILL draw rude things and sign their work. That's a feature.

---

## Tensions and fits for Siege Bakery (opinionated)

**Round length / 300s clock.** Evidence says 3–4 min scored rounds is the genre
sweet spot; our 300s is at the top of the range. Fine for a full cake; the
dessert ladder's early rungs (cookies, cupcakes) should probably run SHORTER
(120–180s) so early-session "again!" is cheap. Opinion: keep 300s only for the
finale-sized desserts.

**Dessert ladder = Overcooked's one-twist-per-level law.** Cookies → cupcakes →
cake → tiered cake is a legible ladder, but the lesson is stricter: each rung
should introduce exactly ONE new demand (new topping, new target geometry, new
disruption) and RELAX something else while it does (Ghost Town simplified
recipes when levels got harder). Don't stack a new projectile AND a new dessert
AND the turntable on the same level.

**Turntable vs second town — these answer different questions; do both, in this
order.** The turntable is a Q4 slam dunk: player-cranked periodic motion is the
windmill plus Lovers-style station spatiality plus Keep-Talking-style callouts
("crank... crank... FIRE"). It converts our fixed-emplacement weakness (one town
sees half the cake — research/06) into a communication mechanic, and it adds a
STATION, which is the Lovers lesson: cooperation through physical placement, not
rules. The second town is instead an Overcooked DISRUPTION-class tool: it
"separates players" (Duncan's named level archetype) and forces the
who-goes-where negotiation. Opinion: turntable first — it's cheaper, it fixes
the coverage ceiling directly, and one shared machine with too many stations for
the player count IS the Overcooked overload formula. Second town later as the
mid-campaign disruption beat. Do NOT ship both on the same rung.

**Turntable caveat:** keep its rotation slow and legible (windmill speed), make
it a held/cranked station (stops when abandoned = productive-delay gamble:
"do I keep spinning or run for ammo?"), and never auto-rotate randomly — random
motion is the Golf With Your Friends goalie, the one proven-frustrating shape.

**Task overload is our tuning dial.** The catapult already has 3 stations
(traverse, winch, lever) + pantry runs; with 2 players that's overload, with 4
it may settle into silent routine. The turntable and second town are how we
re-overload 3–4 players. Rule of thumb from Duncan: actions available should
always exceed hands available.

**No-turn-order real-time fire is correct** — Worms' comedy survives the port
to real time because our failure is Splatoon-legible (the splat stays on the
cake). But protect the agency line (Polaris): the arc preview/feel must make a
miss traceable to MY winch tension or MY traverse, never to physics noise.
Imprecision should live in the lob and the splat, not in the controls.

**Failure design: we're already right, keep it.** Timer + graded stars + rare
3-star is exactly the Overcooked shape (never a hard fail, always a score).
The star-gate campaign is the proven comeback structure for friend groups;
PlateUp!-style chosen-modifier difficulty ("crusty cake: frosting slides for
30s") is a cheap later addition that adds variance without new levels.

**Unlockable projectiles: gate on cumulative stars, arriving WITH the rung that
needs them.** Persistent meta-progression matters less than a visible next-gate
(Q2). Opinion: unlock projectile types as the "one new demand" of specific
rungs rather than a separate shop/XP economy — Overcooked's model, not
PlateUp!'s, because we have authored levels.

**The cake IS the trophy — invest in the reveal.** Splatoon's overhead judge
map is the pattern: end every round with a slow orbit/drone shot of the cake as
Judgment reads the score, whether it's beautiful or a warcrime of sprinkles.
Screenshot-worthy failure is the retention hook (Couture's spectator principle);
players sharing ugly cakes is our marketing. Also: expect and embrace players
drawing rude things in frosting — Duncan's thrown chickens say a shared surface
plus projectiles equals self-expression.

**Judgment restriction note.** Overcooked removed fiddly error states to free
attention for coordination. Watch for neatness-grading punishing physics chaos
so hard that players slow down and aim carefully alone — if playtests show
quiet, careful play, loosen neatness, not coverage.

## Source list (primary ones)

- Game Developer — "Game Design Deep Dive: Building truly cooperative play in Overcooked" (Phil Duncan)
- MCV/DEVELOP — "The Develop Post-Mortem: Overcooked" (Duncan & De-Vine)
- Push Square — "Chewing the Fat with Overcooked 2 Developer Ghost Town Games"
- Game Developer — "Co-op communication in Lovers in a Dangerous Spacetime" (Adam Winkels)
- GDC Vault — "Designing Asymmetric Gameplay For Keep Talking and Nobody Explodes" (Steel Crate)
- TheXboxHub — PlateUp! interview (Alastair Janse van Rensburg, It's Happening)
- GamesRadar / GamesHub — Moving Out & Moving Out 2 accessibility interviews (SMG Studio)
- Polaris Game Design Deep Dive — "Mechanical Comedy in Games" (England, Tremblay, et al.)
- Game Developer — "7 games with entertaining fail states that every dev should study" (Joel Couture)
- TheGamer / Wikipedia — Human: Fall Flat, Tomas Sakalauskas design pivot
- Game Developer — "The essence of Splatoon and what it gets right" (Christian Nutt)
- Nintendo "Ask the Developer" / Nintendo Life — Splatoon (Hisashi Nogami)
- Miniature Golf Solutions / Harris Mini Golf — windmill obstacle history & appeal
- TechRadar / Nintendo Life — Golf With Your Friends frustration analyses
