# Plan 18 — THE ORDER FORGE: patrons × desserts × the envelope

**Status: SHAPE RECORDED 2026-07-10 (discussion session, visionary's
design + the session's constraints). POST-MILESTONE: this is a real
system (game/ changes, new requirement kinds, harness-in-the-pipeline)
— excluded from plans/16 by its own zero-systems law, and better after
it: patron bodies and the dessert asset pipeline are exactly the
libraries this system indexes. It joins plans/15 items 6 (power-ups)
and 8 (run points) as the post-milestone design pillars, and it is the
biggest of the three — the content-scalability answer. DISCUSS →
BLESS → BUILD; nothing here is buildable until a design session walks
the open questions in §6.**

## 1. The shape (visionary, 2026-07-10)

Orders become a GENERATED QUEUE instead of a fixed authored list.
Three libraries, all data:

- **PATRONS** — personality (the plans/03 behavior-tree brain, which
  already exists) EXTENDED with TASTE: what this patron tends to ask
  for and how harshly he judges. Mapped to a body/model (plans/16).
- **DESSERTS** — constructable specs (core/dessert.ts DessertSpec —
  the cupcake and cake-1..6 already prove desserts are data rows),
  mapped to models once the plans/16 pipeline exists.
- **THE ENVELOPE** — per-progress difficulty constraints (what rung N
  is allowed to ask: difficulty band, clock band, permitted
  requirement kinds, pay).

The generator matches the player's progress (rung N) with a patron
and a compatible dessert and composes an order — unique combinations
by construction: a three-tier cake covered in fudge instead of
frosting; each tier in a different topping. The orders are always
different because the libraries recombine, and the library grows by
adding DATA ROWS, never systems.

## 2. THE MEASURED-ATOMS LAW (the one law — binding on any build)

Every ask in today's ladder is pinned against MEASURED physics
(campaign.ts header: census per spec, summit-window table, reach
envelopes; the cake-6 finding — crown windows that exist in physics
but fall BETWEEN the machine's 2.5° notches, an ask that looks
reasonable and is undialable). A naive generator mints cake-6s daily.

Therefore: **the generator composes from measured atoms, never
generates from hope.** A dessert does not enter the library until the
measurement harness has run against it (research/11 + research/13 are
already spec-parameterized — this is their retirement job). The
MEASUREMENT SHEET — census per tier/zone, reach fraction, summit
windows, hot-vs-place arrival — rides WITH the spec, and the
generator may only compose requirements the sheet certifies.
Feasibility by construction. The harness becomes part of the
authoring pipeline: add a dessert → measure → the envelope rides with
it → the forge may use it.

## 3. The vocabulary rule

**The generator can only ask what the census can count.** Every
requirement kind must have a sample-point census predicate (the
scoring law, plans/06 — surface accumulation + census, never voxels).
The visionary's two examples, mapped:

- "Covered in fudge instead of frosting" → needs ONE new kind:
  coverage BY PAINT TYPE. Fudge already paints under its own splat
  law; "fudge-counts-toward-frost" is a standing watch that this
  design would settle deliberately.
- "Each tier a different topping" → per-tier coverage/count
  predicates; tier zones already exist in the census (tierLabel,
  zone asks).

New kinds are data + one predicate each; anything the census cannot
count cannot be asked, full stop.

## 4. THE ANTI-MUSH POSITION (patrons are the memory, the envelope is the story)

Pure variety curdles: when every order is a novel combination, no
order is memorable, and party games live on narratable moments. Two
anchors, both agreed in the discussion:

- **Patrons carry taste.** Orders are generated THROUGH the patron,
  never from a flat distribution: the fudge fiend always wants fudge
  on something; the neat freak asks less but judges at a higher
  passScore; the glutton wants counts. A generated order is never
  "random requirements" — it is THAT GUY'S order, and the patron's
  face (plans/16 slice 2) is the mnemonic.
- **The envelope stays authored.** Today's ladder tells a designed
  story (tutorial → the ledge → THE ANCHOR → the cupcake's precision
  spike → the climb → the heroic flourish → the impossible tragedy).
  The forge varies the SURFACE (which patron, which dessert from the
  band, which toppings, which tiers); the authored difficulty curve
  and its dramaturgy stand. Same story arc every run, different
  telling every run.

## 5. THE QUEUE IS THE LINE (one object, three plans)

The line of patrons (plans/16 slice 3) IS the order queue: seed it at
run start, render it as the milestone already plans to, and the queue
becomes a free strategy layer — the crew can SEE the fudge fiend two
places back and start stocking fudge. Foreshadowing with zero new
messages. And it is plans/17's lore made mechanical: a queue of
hungry giants, each with a name and a palate, fed one at a time while
the realm settles the bill. The lore, the embodiment milestone, and
the forge describe the same scene from three directions.

## 6. Determinism and the wire (recorded so the build session starts right)

- The forge lives in `game/`, pure, seeded (core/rng.ts) — property-
  testable: every generated order is certified by its spec's
  measurement sheet, by construction.
- Server-authoritative: the Room generates; the order broadcasts as
  DATA exactly as today (clients never know the order was forged, not
  authored). The wire law (plans/13 §3 — the deal carries the rung
  number, replicas look up the spec) will need the deal to carry the
  forged order or its seed — a design-session choice, not a hard
  problem.

OPEN QUESTIONS for the design session (do not build past these):
1. Patron taste schema — how much personality lives in taste vs the
   existing demand rules (they should be ONE brain, not two).
2. Envelope schema — what exactly rung N constrains (kinds allowed,
   ask-budget formula, clock band); how the authored dramaturgy beats
   (anchor, spike, tragedy) are expressed as envelope rows.
3. Wire form — forged order data vs seed-and-regenerate.
4. How the queue is seeded and revealed (whole run at start? next K
   visible?) — interacts with plans/16 slice 3's rendering.
5. Whether the flourish/desire system generalizes into taste (the
   patron's desire IS a taste expression already).

## 7. What this plan does NOT contain

No build slices — this is a shape-of-record, awaiting its design
session AFTER the plans/16 milestone. No mechanics changes to the
two-gate Judgment, patience, or the splat/census laws; the forge
composes ASKS, it never touches how they are scored.
