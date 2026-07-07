# Plan 11 — The towns slice (researched WITH the visionary, 2026-07-06/07)

## What this is

The second town made real: a second crewed catapult (its own walls, machine,
pantry, and later shop-cart) firing on the SAME shared cake. This plan
codifies the standing 2026-07-05 decisions, the 2026-07-07 clarification that
**the second town is a purchased upgrade, never a forced split**, and a
four-agent research pass (two internal code maps, two external pattern scouts,
2026-07-06) — turned into a confident build order against the real
frost-potential code. It is the deliverable of a research-not-build session;
nothing here is built yet.

Provenance: the standing decisions live in handoff 2026-07-05 §6 (fullest
statement), reaffirmed in both 2026-07-06 handoffs; the economy is measured in
research/11 (two-town union) over research/06+10; the design frame is
plans/09 §3–5. The 2026-07-07 discussion corrected the earlier "auto-split"
reading — see §1. Every number is a playtest hypothesis, not law (plans/08).

---

## 1. THE CORE LAW — the second town is a PURCHASED UPGRADE, never forced

This is the spine's guiding principle and it overrides any earlier "two towns
by default" or "auto-assign the crew" reading (that reading was rejected
2026-07-07).

- **The default is ONE town, always.** A crew that wants to work together in a
  single town does so — permanently, first-class. Nothing ever splits them.
- **The second town comes into being only when a crew BUYS it** — and only
  when *eligible*: **enough players to actually crew it, and at a difficulty
  tier whose orders demand more reach than one town has.** The **turntable is
  the alternative** upgrade for crews without the players to man a second town
  (it rotates the cake so one town reaches more — plans/09 §5).
- **Crewing the second town is a CHOICE, and its default is "stay put."** Even
  after buying it, players may keep working town 1; the system never moves
  anyone. Switching towns is opt-in, made at order boundaries (§5).
- **Scoring rises to the two-town ask ONLY once the town is purchased.** Until
  then, one-town scoring. This is not a trap (§6): buying the town raises your
  *reach* and the ask together, holding the difficulty *ratio* constant — you
  buy reach precisely when the campaign's difficulty demands reach, and only
  when you have the crew to use it.

The three worries this answers (visionary, 2026-07-07): the system never
auto-splits a crew; you can always stay in one town; the ask only goes
two-town when you *chose* to buy the second town.

**Spine consequence:** the second town is built as a **dormant capability**
gated behind an `activeTowns` value that **defaults to 1**. With it at 1 the
game is exactly today's one-town game, untouched. The spine's job: *when that
value becomes 2, a second fully-functioning town exists and can be crewed by
choice.* The thing that flips 1→2 is the **shop purchase (fork 2)**; the spine
ships a **dev stand-in** (`__game.unlockTown2()`, loopback-only) to test and
friend-test two towns before the shop exists.

---

## 2. The three strata — build the dormant capability first

- **STRATUM A — THE SPINE (this build).** The second town as a dormant,
  data-driven capability: the `TOWNS` table + mirrored enclosure arena, two
  per-town machine runtimes, per-town crew assignment, the shared cake graded
  against the authored potential, the crew-choice-at-order-end mechanism, the
  `TENSION_MAX_CLICKS→10` bump + re-pins. Activated by a dev stand-in. This is
  "two functioning towns you can play PC-to-PC once switched on."
- **STRATUM B — THE SHOP + UPGRADES (fork 2).** The shared purse, a **walk-up
  cart on the town edge between the ammo cache and the machine**, the purchase
  that flips `activeTowns` 1→2 (gated on player count + difficulty tier), the
  turntable and ladder (counter-tool law, §7), the between-rounds prep/
  all-ready surface. New subsystem — no currency exists today.
- **STRATUM C — TOLL + DESSERT REPORT (fork 3).** Collateral toll (overshoots
  bury the partner's town, per-town attribution for banter) and the Judgment
  orbit / dessert report (plans/09 §1).

Build A, verify it (dev-toggle two towns), then B, then C. The strata are
independently testable; A hard-depends on neither B nor C.

---

## 3. Town-as-data: the `TOWNS` table + the arena as two enclosures

**A `TOWNS` table in `core/arena.ts`**, same idiom as `CAKE_TIERS`. Each town
is its own **bounded enclosure** — the fiction is a *siege*: two forts
besieging a giant cake in the no-man's-land between them.

```
interface Town { base: Vec3; pantry: Vec3; spawn: Vec3; facingDeg: number; bounds: ... }
TOWNS: readonly Town[]   // [0] = today's town; [1] = the 180° rotation
```

- **Town 1 is the 180° ROTATION of town 0 about the cake axis** — research/11's
  proven transform `(x, z) → (−x, 2·CAKE_Z − z)`, which is a rotation, NOT a
  mirror flip. This is the *correct* symmetry (external scout, strongly
  sourced): mirrored layouts flip left/right and are hard to learn; rotational
  keeps each crew's "left is left." Town 0 plinth at z=−12 rotates to z=−48;
  the cake stays central at z=−30.
- **Each enclosure has side + back walls, but its FRONT (facing the cake) is
  OPEN.** The open mouth is load-bearing: it preserves the sightline across
  the firing range to the cake and the far town (§9 Visibility). This
  **replaces the old bounding walls** at z=±13 — the real arena-boundary
  redesign (bigger than the earlier "extend the ground" note). `MACHINE_BASE`/
  `PANTRY_POS`/`PLINTH_POS`/`BAKER_SPAWN` become `TOWNS[0].*` with the old
  names kept as aliases so nothing churns (research/11 imports them directly).
- **`buildArenaColliders` loops `TOWNS[]`:** per-town pantry + plinth +
  enclosure walls; the ground extends past z=−48 to span both towns and the
  cake. Still Rapier-only, core-legal.
- **The environment seam:** the greybox enclosure is a **placeholder keyed to
  the town's anchor.** Future town models, mountains, terrain (a later Blender
  pass) drop in at the SAME `TOWNS` coordinates, replacing the boxes without
  touching game logic. The sim never knows whether a town is five grey cuboids
  or a detailed model. (Full environment design is its own later discussion;
  it must not gate the spine.)

`core/` law holds: `TOWNS` is pure data + Rapier only. No DOM, no `game/`.

---

## 4. The crew / machine runtime (the real lift)

Today the Room is hardwired single-town: **one** `machine`/`crankTicks`/
`screwTicks`, and `roster.machineIntent()` *merges every member* into that one
machine (the "everyone drives the one machine" anti-pattern the external
engineering scout names explicitly). The fix:

- **Per-town machine state — a `TownRuntime` array** (the shape both the plan
  and the code independently landed on; NO ECS — at N=2 a plain typed-record
  array is strictly better, external scout):
  ```
  TownRuntime = { machine: CatapultState; crankTicks: number; screwTicks: number; base: Vec3 }
  private towns: TownRuntime[]   // length = activeTowns
  ```
  `tickMachinePhase` loops the towns; each machine is driven by its own crew.
- **Assigned membership, not proximity** (2026-07-05). Each `Member` carries a
  `town` id. **Input routing is OWNER-IMPLICIT** (external scout's cleanest
  finding, the Colyseus/Boss-Room pattern): `op`/`load`/`lever` do NOT gain a
  town field on the wire. `roster.machineIntent(town)` filters members by
  their assigned `town`; the server derives which machine an input drives from
  the sender's assignment and **never trusts a client-supplied town**. This
  structurally *fixes* the merge-everyone bug. Two crewmates on one machine =
  two field writes on one record — free.
- **`launchVelocity` gains a `facingDeg` parameter** (default 0). Town 1 fires
  +Z by folding its facing into the yaw math — a contained, core-legal
  signature change that ripples to `server/room.ts`, `core/ballistics.test.ts`,
  and `research/11` (the default keeps them running). `launchOrigin` is
  already town-agnostic. Shot origin resolves to the firing crew's
  `TOWNS[town].base` + `facingDeg`.
- **Everything else stays singular** (confirmed by both internal maps): one
  `world`, one `ProjectileManager`, one `FrostingField`, one `settled` ledger,
  one `OrderFlow`/patron/clock, one Judgment over the shared cake. Two crews,
  one dessert.
- **Determinism:** the fence includes `server/` now, so **town assignment must
  be clock-free and seeded** — which argues for deterministic **round-robin /
  explicit choice** (no RNG at all) over anything random.
- **The client boot-order hazard** (internal client map): today the `Baker`
  and initial camera yaw are constructed *synchronously at boot, before any
  `welcome` arrives*, at the fixed `BAKER_SPAWN`. With two towns the client
  doesn't learn its town until `welcome`. **Fix: gate the local spawn behind
  the first `welcome`** (a brief loading beat) rather than spawn-then-teleport,
  and pre-orient the camera to `yourTown`'s facing so the player opens looking
  at their own cake (external scout: forgetting spawn *orientation* is the
  classic bug).

---

## 5. The split — crew-choice at order-end, never forced

Only relevant once `activeTowns = 2`. The model:

- **Town assignment is explicit server state on each `Member`, changeable ONLY
  while the order is not running, locked the instant it starts.** During a
  round your town is fixed (you committed); at order-end the assignment window
  opens for the next order. This satisfies "one-way within a round,
  renegotiable between rounds" (2026-07-05) more simply than tracking
  one-way-ness — a running order just locks it.
- **The default is ALWAYS "stay where you are."** The system never moves a
  player. A crew can buy the second town and both keep working town 1 (wasting
  it) — their choice.
- **The pick is a minimal client message** (e.g. `{ t: "pickTown", town }`),
  validated in `roster.handleMessage` against `TOWNS.length` the same way
  `load`/`op` are, honored only when `order.status !== "running"`. The full
  milestone offer + preview + all-players-confirm CEREMONY is fork 2 (the same
  between-rounds prep surface as the shop) — the spine ships the mechanism, not
  the ceremony (DECISION 2, §11).

---

## 6. The potential model — rung-authored, re-pinned (DECISION 1 resolved)

The frost row stays **one global row** — `frosting.coverage() / potential ≥
frac` — over the one shared cake. Coverage is NEVER split by town. Attribution
("you frosted MY side") and the toll are a separate, softer layer (§8), never
a second coverage axis. Reassurance from the design scout: one global row
against the authored union potential already forces interdependence — a crew
*cannot* hit the two-town ask from one town, so a split crew MUST cover both
hemispheres. No extra rule needed; the geometry is the glue (§9 Overlap).

Per plans/09 §4, **potential is RUNG-AUTHORED, not runtime-measured** — the
active-town count / rung says what reach the Patron expects; `TOWN_POTENTIAL`
stays the measured reference table authors pin from. `standardRequirements()`'s
hardcoded `TOWN_POTENTIAL[1]` becomes the value for the active town count. The
frost-row *code* does not change — only the `potential` it is handed.

**The re-pins** (from the flat `clicks→10` bump; measured, no re-run —
research/11 already swept clicks 4..12):

| Config | @8 (today) | @9 = @10 for coverage | pin → |
|--------|-----------|----------------------|-------|
| One town  | 43.7% | 55.7% | `TOWN_POTENTIAL[1]` 0.42 → **~0.55** |
| Two towns | 75.2% | 84.4% | `TOWN_POTENTIAL[2]` 0.73 → **~0.84** |

(Clicks 10–12 add **nothing** to coverage — click 10 is purely the overshoot/
toll shot. Contested overlap: 12.4%@8 → 27.4%@9 — click 9 is what makes the
two economies collide.) The two-town authored ask lands in the **0.75–0.84
band** (2026-07-05 §6).

### DECISION 1 — `clicks→10` is GLOBAL FLAT (RESOLVED 2026-07-06)

`TENSION_MAX_CLICKS` stays one `game/catapult.ts` constant, set to 10 for
everyone. This buffs the one-town game too — solo reach 43.7%→~55.7% — so
**`TOWN_POTENTIAL[1]` re-pins 0.42→~0.55 now**, and today's live order re-pins
with it. On a one-town rung click 10 has nothing to overshoot into (inert —
self-mess, honest). The rung/town-scoped alternative was rejected: cleaner on
paper, needs a per-rung machine-config surface we don't have, for a welcome
flat buff.

### Why the two-town ask is NOT a trap (plans/09 §4 preserved)

Potential is a *fixed authored constant* per rung; the turntable/ladder move a
crew's *throughput toward* that bar, never raising it. Reach isn't purchased
(the clicks→10 bump is flat/free), and **buying the second town raises reach
AND the ask together, holding the difficulty ratio (`FROST_FRAC` = frost 50% of
your reach) constant** — so the town is worth buying for the higher score
ceiling and the harder tiers one town can't reach, not because it eases the
current ask. Gated on having the crew to man it, it can never be an unmanned
bar-raise.

---

## 7. The counter-tool law + shop & upgrades (STRATUM B — fork 2)

**The counter-tool law (verbatim, 2026-07-05 §6):** *"shop sells the answer to
the pain the rung introduced: ladder↔separation, turntable↔reach, flag↔future
wind rung."* Each rung introduces a pain; the shop sells its counter.

Refined 2026-07-07: **the second town itself is a purchasable upgrade** (buy a
new town OR a turntable, gated on enough players + the right difficulty tier —
§1), and the counter-tools layer on top:
- **Turntable** ↔ reach: the dwarven turntable under the cake (plans/09 §5)
  rotates the far side into reach — the small-crew alternative when you can't
  man a second town. Walk-up interact; lean scarce (one per dessert; defer
  tug-of-war).
- **Ladder** ↔ separation (verb TBD in fork-2 design).
- **Flag** ↔ a future wind rung (parked).
- **Purse + cart:** shared purse; a walk-up crate/cart on the town edge
  between the ammo cache and the machine; untimed prep + all-ready gate; shop
  opens with ≥2 items. DRG duplicated-income is the documented fallback.

Deferred wholesale. The spine leaves the seams: `activeTowns` already the
switch, `town` already on members and broadcasts, potential already authored.

---

## 8. Collateral toll + dessert report (STRATUM C — fork 3)

The toll: an overshot far-top lob lands on the OTHER town — shared penalty,
per-town attribution for banter, nobody dies (plans/09 §3); kept **cosmetic/
mild** so it breeds banter not resentment (external design scout: friendly-fire
as comedy, matching "failure = timer + low score, never a hard stop"). Needs
the toll click (10) the spine ships + the `town` attribution the spine already
threads. The dessert report (Judgment orbit, plans/09 §1) is the retention hook
and pairs with it. Both deferred; both un-blocked by the spine.

---

## 9. The integration north star (DEFERRED design guidance — the "glue")

Codified so it is not lost: the way two towns stay ONE cake felt in real time
is NOT in the physical spine — it is aesthetics, patron voice, and shared
tasks (visionary, 2026-07-07). The failure mode is "two solo games sharing a
scorecard" (external design scout); the antidote is making the crews meet
*continuously on the cake surface*, via three deepening levers:

- **Visibility** (cheapest; some rides the spine for free): open fronts +
  simultaneous independent machines → **arcs crossing over the cake in real
  time**, the strongest "we're both doing this now" signal. Later: **color by
  town on trails AND splats** so the cake visibly fills from two sources.
- **Overlap** (the north star for the economy): research/11's **contested band
  — 27.4% of the cake both towns reach at click 9** — is where their work
  literally interacts (burial, co-frosting). **Never let an order cut the cake
  cleanly in half** ("your half / my half" is what makes it two solo games);
  the economy should value the contested middle.
- **Coupling** (deepest; the forks): the **turntable** (town 2 rotates the
  cake → town 1's reachable surface changes live — co-dependence, not just
  co-presence), the **collateral toll**, and the **shared patron/clock/coverage
  bar** both crews read as one heartbeat.

None of this is spine work. It is the design compass for fork 2/3, the economy,
and the art pass — recorded here so those passes serve integration.

---

## 10. The spine build sequence (STRATUM A — ordered, each testable)

1. **`TOWNS` table + mirrored-enclosure arena** (core/arena.ts). Two towns'
   pantry/plinth/enclosure walls (open front), ground spanning past z=−48, cake
   central; old z=±13 bounding walls retired. Keep old position exports as
   aliases. VERIFY BY POSITIONS: a town-1 centered shot lands on the cake,
   rotation of town 0's.
2. **`launchVelocity` facing param** (core/ballistics.ts). Add `facingDeg`
   (default 0); update the three direct callers. Ballistics tests + research/11
   keep passing on the default.
3. **`TENSION_MAX_CLICKS`→10 + re-pins** (game/). Bump; re-pin
   `TOWN_POTENTIAL[1]`~0.55 / `[2]`~0.84 from research/11's existing sweep; move
   the room.test WIN-line pins.
4. **`activeTowns` + per-town `TownRuntime`** (server/room.ts). Default 1
   (game unchanged); `machine`/`crankTicks`/`screwTicks` → per-town array;
   `tickMachinePhase` loops; shot origin from the firing crew's town. Dev
   stand-in `__game.unlockTown2()` (loopback-only) flips to 2. Two-Room
   convergence test still byte-identical.
5. **Owner-implicit assignment** (server/roster.ts). `town` on `Member`;
   `machineIntent(town)` filters by it; `{t:"pickTown"}` honored only when the
   order isn't running; default "stay put"; deterministic, no RNG.
6. **Wire** (game/protocol.ts). `town` on `shot`/`machine` broadcasts;
   `welcome` carries both machines + `yourTown`. `op`/`load`/`lever` unchanged
   (owner-implicit). Update net-handlers.test + room.test protocol pins.
7. **Authored potential in the order** (game/order-flow.ts). Swap the hardcoded
   `TOWN_POTENTIAL[1]` for the active-town-count value. Judgment code unchanged;
   re-cut the `standardRequirements` pin.
8. **Client: two towns** (client/). `scene.ts` → `TOWNS` loop (per-town mesh +
   `MachineRig` with a base+yaw constructor); `view.machine` → `view.machines[]`;
   net-handlers index by town; **boot-order fix** (spawn after first `welcome`,
   camera pre-oriented to `yourTown`); HUD/input target the local player's town.

Each step: `npm run check` green (both tsc legs + vitest), mutation-verify new
guards, headless positions for physics, one wide loopback screenshot for the
eye. Determinism fence (server/) and sacred layering (`TOWNS` core-legal) are
non-negotiable.

---

## 11. Open decisions, research provenance & the re-pin law

**Resolved this session:**
- **The core law** (§1): second town is a purchased upgrade, never forced;
  default one town; scoring rises only on purchase; gated on players +
  difficulty tier; turntable is the small-crew alternative. (2026-07-07)
- **DECISION 1** (§6): `clicks→10` global flat; re-pin solo potential
  `TOWN_POTENTIAL[1]`→~0.55 now.
- **DECISION 2** (§5): spine ships the **functional split mechanism only**
  (assigned `town`, order-end pick, stay-put default); the milestone offer +
  preview + all-confirm ceremony rides with the shop (fork 2).
- **Input routing** (§4): owner-implicit; `op`/`load`/`lever` carry no town.
- **Symmetry** (§3): rotational (180°), already what research/11 uses.

**Open — the visionary's call:**
- **Friend-test scope:** is the dev-toggle two-town mode enough for the FIRST
  friend test (shop a fast-follow), or must experiencing the *purchase* be part
  of what the first friend test validates (making the fork-2 shop a friend-test
  prerequisite)? Not yet decided.

**Research provenance (four-agent pass, 2026-07-06):** two internal codebase
maps (server/game + client) inventoried every single-town assumption with
file:line, split agnostic vs hardwired, and surfaced the arena-boundary
redesign, the `launchVelocity` facing gap, the boot-order hazard, and the
test re-cuts. Two external scouts (co-op design + networked-station
engineering) sourced: rotational-not-mirrored symmetry, owner-implicit input
routing (Colyseus/Boss Room), no-ECS/no-InstancedMesh at N=2, per-town color +
a fixed cake landmark for orientation, and collateral-as-comedy.

**Precursor (his eye): DONE 2026-07-06.** The density review closed — **40
grains confirmed, ask held at 60**; the sprinkle economy the towns asks build
on is pinned, no re-pin.

**Re-pin law (plans/08, standing):** splat/census changes re-run research/04 §3
+ research/06; the clicks bump re-scales the *envelope*, not the splats, so
research/11's existing sweep is the source — no re-run, just the two
`TOWN_POTENTIAL` moves above. Keep research/06/10/11's mirrored constants in
step with core/frosting.ts on any future splat ship.

---

## 12. What this slice is NOT

- Not the shop, purse, turntable, ladder, or milestone ceremony (fork 2).
- Not the collateral toll or dessert report (fork 3).
- Not the integration "glue" — color-by-town, patron voice, contested-band
  order design (§9, deferred to the economy/art passes).
- Not per-town coverage scoring (coverage is one shared row — §6).
- Not an auto-split or forced assignment (§1 — the default is one town).
- Not proximity-based crew membership (assigned state — 2026-07-05).
- Not the environment/model/mountain pass (a later Blender pass on the same
  `TOWNS` anchors — §3).
- Not the falling-sand port, cookies/cupcakes, or wind (later chapters).
