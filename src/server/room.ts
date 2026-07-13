/**
 * The Room — THE match implementation. There is no other.
 *
 * Transport-agnostic: join() takes a send-callback, onMessage() takes parsed
 * ClientMsg, tick() advances one fixed 60Hz step. The Node ws server drives
 * it on an interval; the solo client drives it from its own fixed-tick loop
 * over an in-memory loopback. Same class, same behavior, no drift.
 *
 * DECOMPOSED (research/05 parked item 4, built 2026-07-05) into three
 * owners the Room orchestrates:
 *   - Roster (server/roster.ts) — members, wire validation, intent merge,
 *     pose relay, broadcast. Knows nothing about the match.
 *   - OrderFlow (game/order-flow.ts) — the order lifecycle state machine:
 *     clock, patron cadence, linger, re-deal, deal tags, shot count.
 *     Ticks counters, returns events; touches no physics and no wire.
 *   - The Room itself — the PHYSICAL match: world, machine, projectiles,
 *     frosting, the live-truth ledger — and the wiring between all three.
 *
 * Layering law: server-land imports core/ + game/ ONLY. No DOM, no three.js,
 * no ws — the transport lives outside. RAPIER.init() must have resolved
 * before constructing a Room (caller's job: Node entry awaits it at boot,
 * the browser client already awaits it, vitest awaits in beforeAll).
 *
 * Authority: machine (merged intents), order + clock, projectile sim,
 * scoring (rest position). NOT baker movement — poses are client-
 * authoritative and merely relayed (co-op among friends; see plans/02).
 */
import RAPIER from "@dimforge/rapier3d-compat";
import { FIXED_DT, GRAVITY } from "../core/constants";
import { buildArenaColliders, inReadyCircle, TOWNS } from "../core/arena";
import { dessertGeometry, type DessertGeometry } from "../core/dessert";
import { FrostingField, splatCovers, STICKY_NEAR_M } from "../core/frosting";
import { launchOrigin, launchVelocity, type Vec3 } from "../core/ballistics";
import { mulberry32 } from "../core/rng";
import { isPaint, TOPPINGS } from "../game/toppings";
import { ProjectileManager } from "../core/projectiles";
import { PatronColliderRig } from "../core/patron-collider";
import { patronAtMark } from "../game/cast";
import {
  createCatapult,
  tickMachine,
  TILT_DEG_PER_NOTCH,
  type CatapultState,
} from "../game/catapult";
import {
  checkRequirements,
  crownedWith,
  judge,
  type Judgment,
  type RequirementCheck,
  type SettledTopping,
} from "../game/judgment";
import {
  RUNGS,
  dessertSpecFor,
  rungRow,
  validateRungs,
  type Rung,
} from "../game/campaign";
import { FLOURISH_BONUS_COINS, TOWN2_PRICE } from "../game/tuning";
import { evaluateOrder } from "../game/order";
import {
  OrderFlow,
  standardRequirements,
  validateDesires,
} from "../game/order-flow";
import { RunFlow } from "../game/run-flow";
import type { ClientMsg, RunWire, ServerMsg } from "../game/protocol";
import { Roster } from "./roster";

// Re-export: the standing order's shape moved to game/order-flow.ts with
// the decomp; scripts and studies that imported it from here still work.
export { standardRequirements };

// Wire cadences — transport shape, not economy; the economy knobs live in
// game/tuning.ts (THE dashboard — structural feedback session 2026-07-03).
const POSE_BROADCAST_EVERY = 3; // ticks → 20Hz
const MACHINE_BROADCAST_EVERY = 4; // ticks → 15Hz
const ORDER_CLOCK_EVERY = 60; // ticks → 1Hz clock correction

/** One town's live machine — the per-crew slice of Room state (plans/11
 * §4). Everything ELSE stays singular: one world, one ProjectileManager,
 * one FrostingField, one settled ledger, one OrderFlow — two crews, one
 * dessert. The town's GEOMETRY (base, facing) is not runtime state; it
 * reads from core's TOWNS table by index. NO ECS at N=2 — a plain typed
 * record array is strictly better (external scout, plans/11 §11). */
interface TownRuntime {
  machine: CatapultState;
  crankTicks: number;
  screwTicks: number;
}

const freshTown = (): TownRuntime => ({
  machine: createCatapult(),
  crankTicks: 0,
  screwTicks: 0,
});

export class Room {
  private readonly world: RAPIER.World;
  private readonly shots = new ProjectileManager();
  /** THE CORE LAW (plans/11 §1): the second town is a PURCHASED upgrade,
   * never a forced split. This array's length IS activeTowns; it starts
   * at 1 — the exact pre-towns game — and grows to 2 only through the
   * `buy` input at the stall (plans/13 §5 as amended 2026-07-09 — the
   * real purchase the unlockTown2 dev stand-in always promised). It
   * shrinks exactly once per story: INVENTORY DIES WITH THE RUN — the
   * next run's start re-locks it (startRun). Nothing here ever moves a
   * player mid-play; the re-lock re-addresses the dying fort's crew
   * home through the same town word a pick uses. */
  private towns: TownRuntime[] = [freshTown()];
  /** The order lifecycle — clock, patron, linger, deal tags (game/). */
  private readonly flow = new OrderFlow();
  /** THE PATRON AT THE MARK (plans/15 item 16): the giant's coarse
   * capsules in THIS world, reconciled every tick against game/cast's
   * pure predicate — never a client signal, never an edge. Every
   * client runs the identical reconcile on its local world, so both
   * sides of every arc agree about the shape at the mark. */
  private readonly patronRig = new PatronColliderRig();
  /** THE RUN CONTAINER (plans/13 slice 1): lobby → countdown → running
   * rungs → runover → lobby. Outside "running" the match is a SANDBOX:
   * machines crank and fire (warmup comedy), landings litter, but the
   * order neither ticks nor scores — the flow's dealt order lies DORMANT
   * (never broadcast as live) until startRun deals fresh. */
  private readonly run = new RunFlow();
  /** How the order that just ENDED concluded — captured at the "ended"
   * event (the flow's fresh deal replaces the order before "redeal"). */
  private endedWon = false;
  /** Last lobby readiness broadcast (`in/of`) — broadcast on change only. */
  private lastReadyKey = "";
  /** Everything at rest THIS order — the census the checklist counts from.
   * Reset with the order: physical toppings stay in the world (the bakery
   * gets messier), but a fresh order counts fresh deliveries only.
   * LIVE TRUTH (checkpoint audit 2026-07-03, the 2D "live cell scans" law):
   * solid entries keep their body, and the ledger() seam re-reads position +
   * onCake before every census — a scored cherry BOWLED off the cake by a
   * later shot un-counts, and a wrong crown can be knocked away on purpose.
   * Recovery through play; the patron counts what he SEES. (The freeze law,
   * plans/09 §7, bounds this to real disturbances — frozen solids only move
   * when something flies near.) Paint entries have no body: a splat can
   * never be re-mobilized. STUCK entries (conversion law, plans/10 §8)
   * have no body either — a gripped sprinkle is dessert surface data,
   * permanent until a later splat BURIES it (removed here, the count
   * drops — his law: "if they are not on top, they are IN the cake") or
   * the fresh deal clears the ledger. The normal rides for the welcome
   * snapshot's perch data. */
  private settled: Array<
    SettledTopping & {
      body?: RAPIER.RigidBody;
      stuck?: true;
      normal?: Vec3;
      /** Stuck records only: the coat level GRIPPED ON — the fixed perch
       * height, sent to late joiners so they never re-measure (plans/10 §8). */
      coats?: number;
    }
  > = [];
  /** THE DEAL'S DESSERT (spec refactor, plans/13 §3): bound once per deal
   * by redealDessert() — the Room is the geometry's server-side owner;
   * core/ classes receive it as an ARGUMENT, never hold it. Slice 2 deals
   * cake-3 every rung (game/campaign.ts stand-in) but the swap path runs
   * for real at every deal boundary. */
  private dessert: DessertGeometry;
  /** The dessert's collider handles — torn down and rebuilt at the deal
   * (arena statics build once in the constructor; the dessert is per-deal
   * state, the collider split of plans/13 §3). */
  private dessertColliders: RAPIER.Collider[];
  /** The frosting field — paint events accumulate here (plans/07).
   * REPLACED with the deal (was reset): a fresh cake wheels out between
   * deals, and the field's census is per-spec now. stickyPaint reads it
   * through `this`, so replacement follows automatically. */
  private frosting: FrostingField;
  private readonly roster = new Roster();
  private tickCount = 0;
  private patronSeq = 0;
  /** THE FROZEN VERDICT (audit 2026-07-07 S-MED-1): the judgment captured
   * at the moment the order ended — what the room's banner shows. Machines
   * still fire during the linger and the ledger stays live, so a welcome
   * that RE-judged would hand a mid-banner joiner a different score than
   * everyone else is celebrating. Served in the welcome; cleared at the
   * redeal. */
  private lingerVerdict: Judgment | null = null;
  /** Mints the per-shot seed S (plans/10): a burst's scatter is drawn from
   * mulberry32(seed) on every replica — the wire carries the seed, never
   * the grains. The stream itself is seeded, so a headless re-run of the
   * same inputs mints the same seeds (determinism law). */
  private readonly shotSeed = mulberry32(0x5eed5);

  constructor() {
    // The ladder's authoring tripwire (slice 4): every RUNGS row must
    // name a real spec row before anything deals — fails loud at boot,
    // not undefined at rung 5. The toppers law rides beside it (slice
    // 4b): no desire topping may be orderable.
    validateRungs();
    validateDesires();
    this.world = new RAPIER.World(GRAVITY);
    this.world.timestep = FIXED_DT;
    buildArenaColliders(this.world);
    // THE TRAINING LOBBY (plans/15 item 25): no cake before the order —
    // the boot mark holds the PRACTICE TARGET (the plank); the dormant
    // order still deals internally as the next run's rung 1, but the
    // dessert arrives WITH the first deal (startRun's redeal).
    this.dessert = dessertGeometry(dessertSpecFor(this.run.phase, 1));
    this.dessertColliders = this.dessert.buildColliders(this.world);
    this.frosting = new FrostingField(this.dessert.samples);
    // The conversion law's paint oracle (plans/10 §8): grains grip where
    // they hit wet paint ON the dessert skin — walls included. The client
    // binds its own field twin. Reads through `this` — the per-deal field
    // replacement follows without rebinding.
    this.shots.stickyPaint = (p) => this.frosting.frostedNear(p, STICKY_NEAR_M);
  }

  /** Add a client; returns its id. Sends the welcome snapshot immediately. */
  join(send: (msg: ServerMsg) => void, name = ""): number {
    const { id, name: settledName } = this.roster.add(send, name);
    send({
      t: "welcome",
      id,
      machines: this.towns.map((t) => ({
        machine: t.machine,
        crankTicks: t.crankTicks,
        screwTicks: t.screwTicks,
      })),
      yourTown: this.roster.townOf(id),
      order: this.flow.order,
      checks: this.currentChecks(),
      poses: this.roster.poseList(id),
      toppings: this.shots
        .resting()
        .map((r) => ({ topping: r.topping, x: r.pos.x, y: r.pos.y, z: r.pos.z })),
      frosting: this.frosting.snapshot(),
      stuck: this.settled
        .filter((s) => s.stuck)
        .map((s) => ({
          topping: s.topping,
          x: s.pos.x,
          y: s.pos.y,
          z: s.pos.z,
          nx: s.normal!.x,
          ny: s.normal!.y,
          nz: s.normal!.z,
          coats: s.coats ?? 0,
        })),
      // Mid-banner joiners need the verdict (audit 2026-07-03): without it
      // a WON order renders as "TIME! the patron goes hungry". They get
      // the FROZEN one (audit 2026-07-07 S-MED-1) — re-judging here read
      // the live ledger + shot count, so linger play could hand the
      // joiner a verdict the room's banner disagrees with.
      ...(this.lingerVerdict ? { judgment: this.lingerVerdict } : {}),
      run: this.runWire(),
    });
    this.roster.broadcast({ t: "join", id, name: settledName }, id);
    return id;
  }

  leave(id: number): void {
    if (!this.roster.remove(id)) return;
    this.roster.broadcast({ t: "leave", id });
  }

  /** Wire-input validation lives in the Roster (message TRUTH; main.ts
   * owns transport HEALTH — frame size, heartbeats, member cap). The one
   * ROOM-level message is town activation: it mutates match state (the
   * towns array), which the Roster by design knows nothing about. */
  onMessage(id: number, msg: ClientMsg): void {
    if (msg.t === "buy") {
      // THE STALL (plans/13 §5 as amended 2026-07-09): Room-validated,
      // refusals silent — the client's prompt predicts every one from
      // the same broadcast state ("not enough coins" is a local flash).
      // Rides the input stream like its unlockTown2 predecessor: a
      // headless replica fed the same messages grows the same array at
      // the same tick (determinism law — no out-of-band mutation).
      if (msg.item !== "town2") return; // the catalog is the whitelist
      // SHOP HOURS: a WON order's separator during a live run — the
      // gates-law parity, and never a run-ending linger (a loss ends
      // the run; the top-rung triumph ends it too; inventory dies with
      // the run, so either would sell a dead key).
      if (this.run.phase !== "running" || this.flow.order.status !== "won")
        return;
      if (this.run.rung >= RUNGS.length) return; // the triumph's linger
      if (this.towns.length >= TOWNS.length) return; // already owned
      if (!this.run.spend(TOWN2_PRICE)) return; // the honest refusal
      this.towns.push(freshTown());
      // The ask follows at the NEXT deal (plans/11 §6): the concluded
      // order keeps the rows it was dealt; the rung the crew climbs to
      // prices for two towns.
      this.flow.activeTowns = this.towns.length;
      this.broadcastRun(); // the purse moved
      this.broadcastMachine(this.towns.length - 1); // the new fort wakes
      return;
    }
    if (msg.t === "pickTown") {
      // The split mechanism (plans/11 §5): changeable ONLY while the order
      // is not running — a running order locks the crew (you committed).
      // The gate is MATCH truth so it lives here; the field validation
      // (integer, active town) is the Roster's. Deterministic, no RNG:
      // the system never assigns, the player always chooses. Phase-aware
      // since the run container (plans/13): the lobby's dormant order is
      // "running" on paper but nothing is being played — picks are free
      // there; only a LIVE rung locks the crew.
      if (this.run.phase === "running" && this.flow.order.status === "running")
        return;
      if (this.roster.setTown(id, msg.town, this.towns.length))
        this.roster.broadcast({ t: "town", id, town: msg.town });
      return;
    }
    this.roster.handleMessage(id, msg);
  }

  /** One fixed 60Hz tick: machine → physics → scoring → clock → broadcasts. */
  tick(): void {
    this.tickCount++;
    // The patron's capsules reconcile FIRST — before anything spawns a
    // shot or steps the world, so the shape at the mark is settled for
    // this tick's physics. One string compare on the quiet path.
    this.patronRig.reconcile(
      this.world,
      patronAtMark(this.run.phase, this.run.rung, this.lingerVerdict !== null),
    );
    this.tickMachinePhase();
    this.tickScoringPhase();
    this.tickLifecyclePhase();
    this.tickBroadcastPhase();
  }

  /** Merged intents drive each town's machine; a release becomes a tagged
   * shot from that town's base, along that town's facing. Towns tick in
   * index order — deterministic. */
  private tickMachinePhase(): void {
    for (let i = 0; i < this.towns.length; i++) {
      const town = this.towns[i]!;
      // Owner-implicit: this machine is driven by exactly the members
      // ASSIGNED to town i (plans/11 §4). A crewless town idles.
      const intent = this.roster.machineIntent(i, town.machine.loaded === null);
      const r = tickMachine(town.machine, town.crankTicks, intent, town.screwTicks);
      town.machine = r.state;
      town.crankTicks = r.crankTicks;
      town.screwTicks = r.screwTicks;
      if (!r.shot) continue;
      this.flow.noteShot();
      const seed = Math.floor(this.shotSeed() * 0x100000000);
      const facing = TOWNS[i]!.facingDeg;
      this.shots.spawn(
        this.world,
        // Full yaw = traverse + facing: the clearance nudge must point at
        // the actual throw (core/ballistics.ts launchOrigin note).
        launchOrigin(TOWNS[i]!.base, r.shot.traverseDeg + facing),
        launchVelocity(
          r.shot.traverseDeg,
          r.shot.tensionClicks,
          r.shot.tiltNotch * TILT_DEG_PER_NOTCH,
          facing,
        ),
        r.shot.topping,
        {
          consumeOnImpact: isPaint(r.shot.topping),
          tag: this.flow.deal,
          seed,
          ...(TOPPINGS[r.shot.topping]?.burst
            ? { burst: TOPPINGS[r.shot.topping]!.burst }
            : {}),
        },
      );
      this.roster.broadcast({
        t: "shot",
        town: i,
        topping: r.shot.topping,
        traverseDeg: r.shot.traverseDeg,
        tiltNotch: r.shot.tiltNotch,
        tensionClicks: r.shot.tensionClicks,
        seed,
      });
      // Arm state changed sharply; don't wait for the 15Hz cadence.
      this.broadcastMachine(i);
    }
  }

  /** THE FRESH-CAKE LAW's physical half, per-spec since the refactor
   * (plans/13 §3 rulings — THE REDEAL ORDERING): clear the cake's solids
   * with the OUTGOING geometry (bodies leave with the dessert they rested
   * ON), tear down its colliders, bind the incoming rung's spec, build its
   * colliders, and roll a fresh field over its census. Floor litter is the
   * crew's mess and stays. Every deal boundary — startRun and the rung
   * climb — walks this one path. */
  private redealDessert(): void {
    this.shots.clearCakeSolids(this.world, this.dessert);
    for (const c of this.dessertColliders) this.world.removeCollider(c, false);
    // Phase-aware since entry 5 (the training lobby): a live run deals
    // the rung's spec; outside it the practice target takes the mark
    // (both replicas derive the same answer — dessertSpecFor).
    this.dessert = dessertGeometry(dessertSpecFor(this.run.phase, this.run.rung));
    this.dessertColliders = this.dessert.buildColliders(this.world);
    this.frosting = new FrostingField(this.dessert.samples);
    this.settled = [];
    this.lingerVerdict = null; // the fresh deal owes nobody a verdict
  }

  /** Step physics; landings become scored deliveries (stale tags litter,
   * score nothing — audit AUD-4). Same-tick landings BATCH (plans/10 §5):
   * one census + one `scored` per (topping, fate) group — a settling burst
   * must not be forty broadcasts. Singles behave exactly as before. */
  private tickScoringPhase(): void {
    const ev = this.shots.step(this.world, this.dessert);
    const groups = new Map<string, { topping: string; onCake: boolean; count: number }>();
    // EARNED TIME (plans/22 step 6): fresh cake coverage this tick buys
    // clock. Accumulated across the paint impacts below (they land even in
    // the sandbox — the field paints regardless), but only SPENT on a live
    // order (the running gate + earnTime's own guard). Off-cake paint hits
    // no census sample, so it contributes zero fresh — floor frosting earns
    // no time, exactly like it scores nothing.
    let freshThisTick = 0;
    const note = (topping: string, onCake: boolean): void => {
      const k = `${topping}|${onCake ? 1 : 0}`;
      const g = groups.get(k);
      if (g) g.count++;
      else groups.set(k, { topping, onCake, count: 1 });
    };
    // Paint lands at IMPACT: the glob is consumed, the field takes the
    // splat — under the topping's OWN splat law (plans/10: fudge runs down
    // walls) — and the delivery scores immediately; zero painted samples
    // is floor frosting, mess like any other miss (plans/07).
    for (const im of ev.impacts) {
      if (!isPaint(im.topping)) continue;
      if (im.tag !== this.flow.deal) continue; // fired against a previous order
      const spec = TOPPINGS[im.topping]?.splat;
      const { footprint, fresh } = this.frosting.paint(im.pos, im.speed, spec);
      freshThisTick += fresh;
      // BURIAL (conversion law, plans/10 §8): stuck sprinkles under this
      // splat's footprint are covered — IN the cake now, not on it. Their
      // records leave the ledger and the count drops; the checks riding
      // this tick's `scored` broadcast already show it.
      this.settled = this.settled.filter(
        (s) => !(s.stuck && splatCovers(s.pos, im.pos, im.speed, spec)),
      );
      this.settled.push({ topping: im.topping, pos: im.pos, onCake: footprint > 0 });
      note(im.topping, footprint > 0);
    }
    // Solids land at REST — scoring truth unchanged. A stale solid still
    // litters the world (its body landed); it just counts for nothing.
    for (const s of ev.settled) {
      if (s.tag !== this.flow.deal) continue;
      const onCake = this.dessert.isOnCake(s.pos);
      this.settled.push({ topping: s.topping, pos: s.pos, onCake, body: s.body });
      note(s.topping, onCake);
    }
    // Gripped grains CONVERTED (plans/10 §8): bodiless ledger entries, on
    // the cake by definition — they stuck to its skin, on its paint. A
    // stale grip renders client-side but scores nothing, like any stale
    // shot; it isn't even remembered here.
    for (const st of ev.stuck) {
      if (st.tag !== this.flow.deal) continue;
      this.settled.push({
        topping: st.topping,
        pos: st.pos,
        onCake: true,
        stuck: true,
        normal: st.normal,
        // The blob it gripped ON — captured NOW (after this tick's paint, the
        // impacts loop above already applied it), the same moment and field
        // the live client reads in its onStuck. The perch is fixed here; a
        // joiner replays this number, never re-measures (plans/10 §8).
        coats: this.frosting.coatsNear(st.pos),
      });
      note(st.topping, true);
    }
    if (groups.size === 0) return;
    // Outside a live rung the bakery is a SANDBOX (plans/13): landings
    // litter honestly (the bodies are real, the mess persists into the
    // run) but nothing scores and no order-flavored word goes out — the
    // dormant order must not advance before the run starts. startRun's
    // fresh deal wipes the cake and the ledger anyway.
    if (this.run.phase !== "running") return;
    // EARNED TIME lands here (plans/22 step 6), before the broadcast so the
    // `scored` order carries the risen ticksLeft (the client's authoritative
    // clock; the "+Ns" pop-up is client-local juice off its own frosting
    // twin). No-op off a running order or at the cap (earnTime guards both).
    if (freshThisTick > 0) this.flow.earnTime(freshThisTick);
    // THE DESIRE'S LIVE CHECKMARK (slice 4b): ledger truth for the HUD's
    // golden row, refreshed before this tick's broadcasts carry the order.
    // Presentation only — every VERDICT re-reads the ledger at its own
    // conclusion tick (the stamp below; physical truth, never this cache).
    const desire = this.flow.order.desire;
    if (desire && this.flow.order.status === "running")
      desire.met = crownedWith(this.dessert, this.ledger(), desire.topping);
    // THE BUZZER MODEL (plans/22 step 3): the scoring phase no longer
    // concludes. Meeting the rows renders no verdict — the order runs to
    // the clock (or, later, a serve), and the Judgment is the Room's at
    // conclusion (concludeOrder). evaluateOrder is CHECK-ONLY now; this
    // phase censuses the rows for the live HUD and broadcasts them, then
    // gets out of the way. (The finish window is inert once the instant
    // win is gone — its trigger lived exactly here; the machinery goes in
    // step 5, the flourish already survives via stampFlourish at the buzzer.)
    const checks = evaluateOrder(
      this.dessert,
      this.flow.order,
      this.ledger(), // earlier deliveries may have been shoved since
      this.frosting,
    );
    for (const g of groups.values())
      this.roster.broadcast({
        t: "scored",
        topping: g.topping,
        onCake: g.onCake,
        ...(g.count > 1 ? { count: g.count } : {}),
        order: this.flow.order,
        checks,
      });
  }

  /** THE ONE CONCLUSION PATH (plans/22 step 3, grade-at-the-buzzer). The
   * order is judged HERE, at conclusion — the clock's death today, a serve
   * tomorrow (step 7) — never on rows-met (the flip deleted that). Freeze
   * the verdict (stampFlourish stamps the coda from the live ledger — a
   * no-op unless the flourish rests met), own the status flip (an accepted
   * buzzer verdict is a WIN — the clock set "lost", we upgrade so the shop
   * gate + linger read "won"; anything else stays lost), record HOW it
   * ended for the run container, broadcast the ending word, and pay
   * (awardPay gates on accepted — a no-op on a loss). `endedWon = accepted`
   * is the win/loss truth now: unlike the pre-flip clock death (always
   * unmet, since a met order concluded instantly), a buzzer verdict on a
   * finished cake CAN be accepted — that is the whole point of the redesign. */
  private concludeOrder(judgment: Judgment, checks: RequirementCheck[]): void {
    this.lingerVerdict = this.stampFlourish(judgment);
    this.endedWon = this.lingerVerdict.accepted;
    this.flow.order = {
      ...this.flow.order,
      status: this.endedWon ? "won" : "lost",
    };
    this.roster.broadcast({
      t: "order",
      order: this.flow.order,
      checks,
      judgment: this.lingerVerdict,
    });
    this.awardPay(this.lingerVerdict);
  }

  /** THE PAY (plans/13 §5 as amended 2026-07-09): each PASSED order
   * earns the rung's authored pay column — base + stars × perStar —
   * plus the flourish bonus when the verdict wears the coda. Runs at
   * the conclusion tick, right after the ending word, so the purse
   * rides the run broadcast out while the banner is naming the coins.
   * A refusal or a clock death pays nothing (§5: "at each passed
   * order"); the run-ending linger still pays — the run report tells
   * the whole story, purse included. */
  private awardPay(j: Judgment): void {
    if (!j.accepted) return;
    const pay = rungRow(this.run.rung).pay;
    this.run.earn(
      pay.base + j.stars * pay.perStar + (j.flourish ? FLOURISH_BONUS_COINS : 0),
    );
    this.broadcastRun();
  }

  /** THE CODA STAMP (plans/13 §1 finish-it amendment): accepted verdicts
   * wear the flourish exactly when the desire rests met on the LIVE
   * ledger at the conclusion tick — physical truth, whenever the topping
   * was thrown (pre-styling counts; the reveal is presentation, never
   * eligibility). Also settles the golden row's checkmark so the ending
   * broadcast carries it. */
  private stampFlourish(j: Judgment): Judgment {
    const desire = this.flow.order.desire;
    if (!j.accepted || !desire) return j;
    if (!crownedWith(this.dessert, this.ledger(), desire.topping)) return j;
    desire.met = true;
    return { ...j, flourish: true };
  }

  /** The lifecycle, phase-driven since the run container (plans/13):
   * lobby/countdown tick the ready gate, runover ticks the report, and
   * only a live run ticks the ORDER lifecycle (patron looks, the clock,
   * linger, re-deal). The flows tick counters and say what happened; the
   * Room owns the physical resets and the wire. */
  private tickLifecyclePhase(): void {
    if (this.run.phase === "lobby" || this.run.phase === "countdown") {
      const ev = this.run.tickReady(this.allReady());
      if (ev === "start") this.startRun();
      else if (ev === "countdown" || ev === "cancel") this.broadcastRun();
      else if (this.run.phase === "countdown") {
        // The countdown's 1Hz word — the beats ARE the display: the HUD
        // renders the last beat raw (no client prediction), and 180/120/60
        // read as 3…2…1.
        if (this.run.countdownLeft % 60 === 0) this.broadcastRun();
      } else {
        // Lobby: speak the ready census when it changes (n/m in).
        const key = `${this.readyCount()}/${this.roster.count()}`;
        if (key !== this.lastReadyKey) {
          this.lastReadyKey = key;
          this.broadcastRun();
        }
      }
      return;
    }
    if (this.run.phase === "runover") {
      if (this.run.tickRunover() === "lobby") {
        this.lastReadyKey = ""; // re-speak the census on lobby entry
        // THE TARGET RETURNS (item 25): the report's final cake wheels
        // off and the practice plank takes the mark for the next crew.
        // Same redeal path as every boundary; clients mirror it off the
        // run word's phase (net-handlers' spec reconcile).
        this.redealDessert();
        this.broadcastRun();
      }
      return;
    }

    // A live rung. The Patron looks at the cake every 12s of order time.
    if (this.flow.shouldLook()) {
      const { utterance } = this.flow.patronLook(
        this.ledger(), // he judges the cake as it LIES
        this.currentChecks(),
        this.dessert.topTier,
      );
      this.roster.broadcast({ t: "patron", text: utterance, seq: ++this.patronSeq });
      this.roster.broadcast({
        t: "order",
        order: this.flow.order,
        checks: this.currentChecks(),
      });
    }

    for (const event of this.flow.tickClock()) {
      if (event === "ended") {
        // THE BUZZER (plans/22 step 3): the clock died — judge the cake as
        // it lies. This is now the SOLE conclusion (the instant win is
        // gone): a finished cake that met the rows AND cleared gate 2 wins
        // here, stars and all; anything less is refused or hungry.
        // concludeOrder owns the verdict, the status flip, and the pay.
        this.concludeOrder(this.judgeNow(), this.currentChecks());
      } else if (
        this.run.orderConcluded(
          this.endedWon,
          // The concluded order's coda (§1 finish-it amendment): only the
          // top-rung triumph consumes it — MASTER BAKER turns ULTRA.
          this.lingerVerdict?.flourish === true,
        ) === "nextRung"
      ) {
        // "lingerOver" on a WON order below the top: the ladder climbs.
        // THE DEAL DECISION IS THE ROOM'S (plans/13 slice 4): the rung
        // incremented in orderConcluded ABOVE, so the deal prices the
        // rung the crew climbed TO — a flow self-deal would have priced
        // the old rung's asks over the new rung's cake. Then THE
        // FRESH-CAKE LAW (2026-07-05): the finished dessert is gone and
        // the next rung's wheels out (redealDessert — the per-spec swap,
        // plans/13 §3). Everything ON it leaves with it; floor litter is
        // the crew's mess, not the dessert's; it stays, all run long.
        this.dealAt(rungRow(this.run.rung));
        this.redealDessert();
        this.roster.broadcast({
          t: "order",
          order: this.flow.order,
          checks: this.currentChecks(),
          fresh: true,
          rung: this.run.rung,
        });
        this.broadcastRun();
      } else {
        // "lingerOver" on a LOST order — or the TOP rung WON (MASTER
        // BAKER, §1 flourish amendment): THE RUN IS OVER either way. No
        // fresh deal goes OUT: the final cake stays on display under the
        // run report (sad or triumphant — runWire carries `won`). The
        // dormant lobby order still deals internally as the next run's
        // rung 1 (exactly the old self-deal's timing; never broadcast as
        // live), and the frozen verdict stays for mid-report joiners.
        this.dealAt(rungRow(1));
        this.broadcastRun();
      }
    }
  }

  /** All connected bakers stand in the ready circle (and there IS at
   * least one) — the lobby gate. A member who never reported a pose
   * cannot be standing anywhere. */
  private allReady(): boolean {
    const poses = this.roster.allPoses();
    if (poses.length === 0) return false;
    return poses.every((p) => p !== null && inReadyCircle(p));
  }

  private readyCount(): number {
    return this.roster.allPoses().filter((p) => p !== null && inReadyCircle(p))
      .length;
  }

  /** EVERY deal goes through here (THE LONE HERO AMENDMENT, plans/13 §5):
   * the ticket prices its labor from the roster's connected truth AT DEAL
   * TIME — the towns law verbatim: a joiner or leaver never retro-changes
   * a running order; the ask follows at the next deal. */
  private dealAt(row: Rung): void {
    this.flow.activeCrew = this.roster.count();
    this.flow.dealFresh(row);
  }

  /** The countdown held: deal rung 1 — the run begins. The fresh deal is
   * the same physical reset as the linger redeal (fresh-cake law), so
   * lobby warmup mess on the cake is wiped and floor litter honestly
   * carries into the run. */
  private startRun(): void {
    // INVENTORY DIES WITH THE RUN (plans/13 §5 as amended 2026-07-09):
    // the last run's town 2 re-locks at this boundary — the same tick
    // tickReady zeroed the purse. A run is a complete story; the next
    // one earns its own. The dying fort's crew is re-addressed home
    // FIRST: the town word must precede the fresh deal and the run
    // word, so every client's yourTown indexes machines before any
    // list shrinks (the C-MED-2 invariant, now in both directions).
    if (this.towns.length > 1) {
      this.towns = [this.towns[0]!];
      this.flow.activeTowns = 1;
      for (const id of this.roster.ids())
        if (this.roster.townOf(id) > 0 && this.roster.setTown(id, 0, 1))
          this.roster.broadcast({ t: "town", id, town: 0 });
    }
    this.dealAt(rungRow(this.run.rung)); // rung 1 — tickReady set it
    this.redealDessert();
    this.roster.broadcast({
      t: "order",
      order: this.flow.order,
      checks: this.currentChecks(),
      fresh: true,
      rung: this.run.rung,
    });
    this.broadcastRun();
  }

  private runWire(): RunWire {
    return {
      phase: this.run.phase,
      rung: this.run.rung,
      // The triumph flag (§1 flourish amendment): only a runover that
      // CONQUERED the top rung wears it — MASTER BAKER. `ultra` rides
      // only with it (§1 finish-it amendment): the triumph's verdict
      // wore the coda — ULTRA MASTER BAKER OF THE REALMS.
      ...(this.run.phase === "runover" && this.run.won ? { won: true as const } : {}),
      ...(this.run.phase === "runover" && this.run.ultra
        ? { ultra: true as const }
        : {}),
      // The purse rides its container (§5 amendment): absent reads 0,
      // so a no-coin wire is byte-identical to the pre-purse wire.
      ...(this.run.purse > 0 ? { purse: this.run.purse } : {}),
      ...(this.run.phase === "countdown"
        ? { countdownTicks: this.run.countdownLeft }
        : {}),
      ...(this.run.phase === "lobby"
        ? { readyIn: this.readyCount(), readyOf: this.roster.count() }
        : {}),
    };
  }

  private broadcastRun(): void {
    this.roster.broadcast({ t: "run", ...this.runWire() });
  }

  /** The steady wire cadences: poses 20Hz, machine 15Hz, clock 1Hz. */
  private tickBroadcastPhase(): void {
    if (this.tickCount % POSE_BROADCAST_EVERY === 0) {
      for (const id of this.roster.ids()) {
        const others = this.roster.poseList(id);
        if (others.length > 0) this.roster.sendTo(id, { t: "poses", poses: others });
      }
    }
    if (this.tickCount % MACHINE_BROADCAST_EVERY === 0)
      for (let i = 0; i < this.towns.length; i++) this.broadcastMachine(i);
    // 1Hz clock correction — only while the clock is actually moving, so the
    // message that ENDS an order (carrying the verdict) stays the last word.
    // Phase-gated (plans/13): the lobby's dormant order is "running" on
    // paper but its clock is frozen — no correction to speak.
    if (
      this.run.phase === "running" &&
      this.flow.order.status === "running" &&
      this.tickCount % ORDER_CLOCK_EVERY === 0
    )
      this.roster.broadcast({
        t: "order",
        order: this.flow.order,
        checks: this.currentChecks(),
      });
  }

  /** THE LEDGER SEAM (structural feedback session 2026-07-03): every READ
   * for scoring flows through here, so the live-truth refresh can never be
   * forgotten at a new census site — position AND onCake follow the world
   * as it lies NOW (audit AUD-6, the 2D "live cell scans" law). Paint
   * entries (no body) keep their impact record — for them onCake means
   * "painted something", not a position. Mutations (push/reset) use
   * this.settled directly; checks/judge/mess NEVER do. */
  private ledger(): readonly SettledTopping[] {
    for (const s of this.settled) {
      if (!s.body || !s.body.isValid()) continue;
      const p = s.body.translation();
      s.pos = { x: p.x, y: p.y, z: p.z };
      s.onCake = this.dessert.isOnCake(s.pos);
    }
    return this.settled;
  }

  private currentChecks(): RequirementCheck[] {
    return checkRequirements(
      this.dessert,
      this.flow.order.requirements,
      this.ledger(),
      this.frosting,
    );
  }

  private judgeNow() {
    return judge(
      this.dessert,
      this.flow.order,
      this.ledger(),
      this.frosting,
      this.flow.shotsFired,
    );
  }

  memberCount(): number {
    return this.roster.count();
  }

  private broadcastMachine(town: number): void {
    this.roster.broadcast({
      t: "machine",
      town,
      state: this.towns[town]!.machine,
      crankTicks: this.towns[town]!.crankTicks,
      screwTicks: this.towns[town]!.screwTicks,
    });
  }
}
