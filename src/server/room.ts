/**
 * The Room — THE match implementation. There is no other.
 *
 * Transport-agnostic: join() takes a send-callback, onMessage() takes parsed
 * ClientMsg, tick() advances one fixed 60Hz step. The Node ws server drives
 * it on an interval; the solo client drives it from its own fixed-tick loop
 * over an in-memory loopback. Same class, same behavior, no drift.
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
import { buildArenaColliders, isOnCake, MACHINE_BASE } from "../core/arena";
import { FrostingField } from "../core/frosting";
import { launchOrigin, launchVelocity, type Vec3 } from "../core/ballistics";
import { isPaint, TOPPINGS } from "../game/toppings";
import { ProjectileManager } from "../core/projectiles";
import {
  createCatapult,
  tickMachine,
  TILT_DEG_PER_NOTCH,
  type CatapultState,
} from "../game/catapult";
import {
  checkRequirements,
  judge,
  type Requirement,
  type RequirementCheck,
  type SettledTopping,
} from "../game/judgment";
import { createOrder, tickOrder, evaluateOrder, type OrderState } from "../game/order";
import { createGiant, type Patron } from "../game/patron";
import {
  FROST_FRAC,
  ORDER_PAR_SHOTS,
  ORDER_RESET_TICKS,
  ORDER_SECONDS,
  PATRON_LOOK_EVERY,
  SPRINKLES_NEEDED,
} from "../game/tuning";
import { mulberry32 } from "../core/rng";
import {
  mergeIntents,
  IDLE_OP,
  type ClientMsg,
  type ServerMsg,
  type HeldOp,
  type Pose,
  type PlayerPose,
} from "../game/protocol";

// Wire cadences — transport shape, not economy; the economy knobs live in
// game/tuning.ts (THE dashboard — structural feedback session 2026-07-03).
const POSE_BROADCAST_EVERY = 3; // ticks → 20Hz
const MACHINE_BROADCAST_EVERY = 4; // ticks → 15Hz
const ORDER_CLOCK_EVERY = 60; // ticks → 1Hz clock correction

/** THE HONEST ORDER (plans/07 phase O) — the decorating truth as a ticket:
 * frost the cake, sprinkles on the frosting, and the Giant's mid-order
 * demand is the ONLY cherry row that ever exists. THE ONE-NUMBER LAW:
 * every row is one number of one thing, and a topping appears in at most
 * one row per order — the "is it 4 cherries or 5" arithmetic is impossible
 * by construction. LIMES ARE NEVER ORDERED — the lime is the pantry DECOY
 * (visionary, 2026-07-03): grab the wrong crate under pressure and it
 * fires anyway, lands anyway, counts only as mess. The NUMBERS (frac,
 * sprinkles, clock, par) live in game/tuning.ts — the dashboard — with
 * the re-pin law and the economy math; the row SHAPES live here. The
 * four-shot decorating line and the wall-census re-pin rationale are
 * recorded in plans/07 (amendment) and research/04 §3. Fresh rows every
 * deal — orders are mutable, never share row objects. */
export function standardRequirements(): Requirement[] {
  return [
    { kind: "frost-coverage", frac: FROST_FRAC },
    { kind: "on-frosting", topping: "sprinkles", needed: SPRINKLES_NEEDED },
  ];
}

interface Member {
  send: (msg: ServerMsg) => void;
  name: string;
  pose: Pose | null;
  held: HeldOp;
  leverPulls: number;
  loads: string[];
}

export class Room {
  private readonly world: RAPIER.World;
  private readonly shots = new ProjectileManager();
  private machine: CatapultState = createCatapult();
  private crankTicks = 0;
  private screwTicks = 0;
  private order: OrderState = createOrder(
    standardRequirements(),
    ORDER_SECONDS * 60,
    { parShots: ORDER_PAR_SHOTS },
  );
  /** Everything at rest THIS order — the census the checklist counts from.
   * Reset with the order: physical toppings stay in the world (the bakery
   * gets messier), but a fresh order counts fresh deliveries only.
   * LIVE TRUTH (checkpoint audit 2026-07-03, the 2D "live cell scans" law):
   * solid entries keep their body, and refreshLedger() re-reads position +
   * onCake before every census — a scored cherry BOWLED off the cake by a
   * later shot un-counts, and a wrong crown can be knocked away on purpose.
   * Recovery through play; the patron counts what he SEES. Paint entries
   * have no body: a splat can never be re-mobilized. */
  private settled: Array<SettledTopping & { body?: RAPIER.RigidBody }> = [];
  /** The frosting field — paint events accumulate here (plans/07). Reset
   * with the order: the Giant licks the cake clean between deals (paint is
   * the scoreboard; a fresh FROST row must not start half-met). */
  private readonly frosting = new FrostingField();
  /** Shots this order — the waste axis. Resets with each fresh deal. */
  private shotsFired = 0;
  /** The deal generation. Shots spawn tagged with it, and a delivery whose
   * tag is stale scores NOTHING (checkpoint audit 2026-07-03): the machine
   * stays operable through the linger — mistakes execute, they never
   * block — but a glob fired against one order can't paint the next one's
   * freshly licked cake, waste-free. Its body still lands and litters. */
  private deal = 0;
  /** The personality at the table. FRESH each deal — his nagged-once
   * flags live in his closure. Whim rng persists across deals. */
  private patron: Patron = createGiant();
  private readonly rng = mulberry32(0xcafe);
  private orderTicks = 0;
  private looks = 0;
  private prevMess = 0;
  private patronSeq = 0;
  private readonly members = new Map<number, Member>();
  private nextId = 1;
  private tickCount = 0;
  private endedTicks = 0;

  constructor() {
    this.world = new RAPIER.World(GRAVITY);
    this.world.timestep = FIXED_DT;
    buildArenaColliders(this.world);
  }

  /** Add a client; returns its id. Sends the welcome snapshot immediately. */
  join(send: (msg: ServerMsg) => void, name = ""): number {
    const id = this.nextId++;
    const member: Member = {
      send,
      name: name || `baker ${id}`,
      pose: null,
      held: { ...IDLE_OP },
      leverPulls: 0,
      loads: [],
    };
    this.members.set(id, member);
    send({
      t: "welcome",
      id,
      machine: this.machine,
      crankTicks: this.crankTicks,
      screwTicks: this.screwTicks,
      order: this.order,
      checks: this.currentChecks(),
      poses: this.poseList(id),
      toppings: this.shots
        .resting()
        .map((r) => ({ topping: r.topping, x: r.pos.x, y: r.pos.y, z: r.pos.z })),
      frosting: this.frosting.snapshot(),
      // Mid-banner joiners need the verdict (audit 2026-07-03): without it
      // a WON order renders as "TIME! the patron goes hungry".
      ...(this.order.status !== "running"
        ? {
            judgment: judge(
              this.order,
              this.ledger(),
              this.frosting,
              this.shotsFired,
            ),
          }
        : {}),
    });
    this.broadcast({ t: "join", id, name: member.name }, id);
    return id;
  }

  leave(id: number): void {
    if (!this.members.delete(id)) return;
    this.broadcast({ t: "leave", id });
  }

  /** The Room's FIELD-validation boundary (checkpoint audit, 2026-07-03).
   * The wire is typed but the internet is not: every field is re-checked
   * here, unknown fields are dropped by copying only the known ones, and
   * anything malformed is ignored whole. main.ts owns transport HEALTH
   * (frame size, heartbeats, member cap); this owns message TRUTH. */
  onMessage(id: number, msg: ClientMsg): void {
    const m = this.members.get(id);
    if (!m) return;
    switch (msg.t) {
      case "hello":
        if (typeof msg.name === "string")
          m.name = msg.name.slice(0, 24) || m.name;
        break;
      case "pose": {
        // Copy the four known fields only: a spread would re-broadcast any
        // junk a client packed in (20Hz amplification); a missing pose or a
        // non-finite coordinate would NaN-poison every ghost mesh.
        const p = msg.pose as Partial<Pose> | undefined;
        if (
          p != null &&
          Number.isFinite(p.x) &&
          Number.isFinite(p.y) &&
          Number.isFinite(p.z) &&
          Number.isFinite(p.yaw)
        )
          m.pose = { x: p.x!, y: p.y!, z: p.z!, yaw: p.yaw! };
        break;
      }
      case "op":
        m.held = {
          turn: msg.turn === 1 || msg.turn === -1 ? msg.turn : 0,
          screw: msg.screw === 1 || msg.screw === -1 ? msg.screw : 0,
          crank: msg.crank === true,
        };
        break;
      case "lever":
        m.leverPulls++;
        break;
      case "load":
        // The pantry table is the whitelist. Mistakes-execute is about
        // grabbing the wrong CRATE — every crate is in the table; a string
        // that isn't came from a hostile client, and it would live forever
        // in the ledger and every welcome snapshot. hasOwn, not `in`:
        // "__proto__" and "toString" are in every record's chain.
        if (
          typeof msg.topping === "string" &&
          Object.prototype.hasOwnProperty.call(TOPPINGS, msg.topping) &&
          m.loads.length < 2
        )
          m.loads.push(msg.topping);
        break;
    }
  }

  /** One fixed 60Hz tick: machine → physics → scoring → clock → broadcasts. */
  tick(): void {
    this.tickCount++;

    // Merge every hand on the machine into one intent; consume edges.
    const held: HeldOp[] = [];
    let leverPulls = 0;
    for (const m of this.members.values()) {
      held.push(m.held);
      leverPulls += m.leverPulls;
      m.leverPulls = 0;
    }
    // Loads are edges, but a full bucket REJECTS — it must not DESTROY
    // (checkpoint audit M10): two bakers loading in the same window used to
    // silently evaporate the loser's topping. Queued loads now stay queued
    // (≤2/member, onMessage) until the bucket actually accepts one, so the
    // loser's topping enters the moment the machine fires. One candidate
    // per tick; first-joined member breaks ties (Map order — deterministic).
    let loader: Member | null = null;
    let load: string | null = null;
    for (const m of this.members.values()) {
      if (m.loads.length > 0) {
        loader = m;
        load = m.loads[0]!;
        break;
      }
    }
    const accepted = load !== null && this.machine.loaded === null;
    if (accepted) loader!.loads.shift();
    const intent = mergeIntents(held, leverPulls, accepted ? [load!] : []);

    const r = tickMachine(this.machine, this.crankTicks, intent, this.screwTicks);
    this.machine = r.state;
    this.crankTicks = r.crankTicks;
    this.screwTicks = r.screwTicks;
    if (r.shot) {
      this.shotsFired++;
      this.shots.spawn(
        this.world,
        launchOrigin(MACHINE_BASE, r.shot.traverseDeg),
        launchVelocity(
          r.shot.traverseDeg,
          r.shot.tensionClicks,
          r.shot.tiltNotch * TILT_DEG_PER_NOTCH,
        ),
        r.shot.topping,
        { consumeOnImpact: isPaint(r.shot.topping), tag: this.deal },
      );
      this.broadcast({
        t: "shot",
        topping: r.shot.topping,
        traverseDeg: r.shot.traverseDeg,
        tiltNotch: r.shot.tiltNotch,
        tensionClicks: r.shot.tensionClicks,
      });
      // Arm state changed sharply; don't wait for the 15Hz cadence.
      this.broadcastMachine();
    }

    const ev = this.shots.step(this.world);
    // Paint lands at IMPACT: the glob is consumed, the field takes the
    // splat, and the delivery scores immediately — zero painted samples is
    // floor frosting, mess like any other miss (plans/07).
    for (const im of ev.impacts) {
      if (!isPaint(im.topping)) continue;
      if (im.tag !== this.deal) continue; // fired against a previous order
      const painted = this.frosting.paint(im.pos, im.speed);
      this.scoreDelivery(im.topping, im.pos, painted > 0);
    }
    // Solids land at REST — scoring truth unchanged. A stale solid still
    // litters the world (its body landed); it just counts for nothing.
    for (const s of ev.settled) {
      if (s.tag !== this.deal) continue;
      this.scoreDelivery(s.topping, s.pos, isOnCake(s.pos), s.body);
    }

    // The Patron looks at the cake every 12s of order time.
    if (this.order.status === "running") {
      this.orderTicks++;
      if (this.orderTicks % PATRON_LOOK_EVERY === 0) this.patronLooks();
    }

    const statusBefore = this.order.status;
    this.order = tickOrder(this.order);
    if (this.order.status !== statusBefore) {
      // The clock died first: gate 1 fails — the patron goes hungry.
      this.broadcast({
        t: "order",
        order: this.order,
        checks: this.currentChecks(),
        judgment: judge(this.order, this.ledger(), this.frosting, this.shotsFired),
      });
    }

    // A finished order lingers on the banner, then the patron orders again.
    if (this.order.status !== "running") {
      this.endedTicks++;
      if (this.endedTicks >= ORDER_RESET_TICKS) {
        this.endedTicks = 0;
        this.deal++; // in-flight shots now carry a stale tag
        this.settled = [];
        this.shotsFired = 0;
        this.patron = createGiant();
        this.orderTicks = 0;
        this.looks = 0;
        this.prevMess = 0;
        // Solid litter stays where it lies; the Giant licks the FROSTING
        // clean between deals — paint is the scoreboard (plans/07).
        this.frosting.reset();
        this.order = createOrder(standardRequirements(), ORDER_SECONDS * 60, {
          parShots: ORDER_PAR_SHOTS,
        });
        this.broadcast({
          t: "order",
          order: this.order,
          checks: this.currentChecks(),
          fresh: true,
        });
      }
    }

    if (this.tickCount % POSE_BROADCAST_EVERY === 0) {
      for (const [id, m] of this.members) {
        const others = this.poseList(id);
        if (others.length > 0) m.send({ t: "poses", poses: others });
      }
    }
    if (this.tickCount % MACHINE_BROADCAST_EVERY === 0) this.broadcastMachine();
    // 1Hz clock correction — only while the clock is actually moving, so the
    // message that ENDS an order (carrying the verdict) stays the last word.
    if (this.order.status === "running" && this.tickCount % ORDER_CLOCK_EVERY === 0)
      this.broadcast({ t: "order", order: this.order, checks: this.currentChecks() });
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
      s.onCake = isOnCake(s.pos);
    }
    return this.settled;
  }

  /** One delivery lands (solid at rest, paint at impact): ledger it,
   * re-census, tell everyone — and announce the Judgment if that met the
   * last row. */
  private scoreDelivery(
    topping: string,
    pos: Vec3,
    onCake: boolean,
    body?: RAPIER.RigidBody,
  ): void {
    this.settled.push({ topping, pos, onCake, ...(body ? { body } : {}) });
    const r = evaluateOrder(
      this.order,
      this.ledger(), // earlier deliveries may have been shoved since
      this.frosting,
      this.shotsFired,
    );
    this.order = r.state;
    this.broadcast({
      t: "scored",
      topping,
      onCake,
      order: this.order,
      checks: r.checks,
    });
    if (r.judgment)
      this.broadcast({
        t: "order",
        order: this.order,
        checks: r.checks,
        judgment: r.judgment,
      });
  }

  private currentChecks(): RequirementCheck[] {
    return checkRequirements(this.order.requirements, this.ledger(), this.frosting);
  }

  /** One Patron look: observe → act (may mutate rows) → patience lands on
   * the clock → everyone hears the voice, then the amended order. */
  private patronLooks(): void {
    const settled = this.ledger(); // he judges the cake as it LIES
    const total = settled.length;
    const mess =
      total > 0 ? settled.filter((s) => !s.onCake).length / total : 0;
    const act = this.patron.act({
      order: this.order,
      checks: this.currentChecks(),
      mess,
      prevMess: this.prevMess,
      secondsLeft: this.order.ticksLeft / 60,
      look: this.looks,
      rng: this.rng,
    });
    this.prevMess = mess;
    this.looks++;
    if (act.patienceDeltaSeconds !== 0) {
      // Patience IS the clock. Clamp to one tick — the loss itself must
      // arrive through tickOrder, so the ending broadcast stays singular.
      const ticksLeft = Math.max(
        1,
        this.order.ticksLeft + Math.round(act.patienceDeltaSeconds * 60),
      );
      this.order = { ...this.order, ticksLeft };
    }
    this.broadcast({ t: "patron", text: act.utterance, seq: ++this.patronSeq });
    this.broadcast({ t: "order", order: this.order, checks: this.currentChecks() });
  }

  memberCount(): number {
    return this.members.size;
  }

  private poseList(exceptId: number): PlayerPose[] {
    const list: PlayerPose[] = [];
    for (const [id, m] of this.members) {
      if (id === exceptId || m.pose === null) continue;
      list.push({ id, ...m.pose });
    }
    return list;
  }

  private broadcastMachine(): void {
    this.broadcast({
      t: "machine",
      state: this.machine,
      crankTicks: this.crankTicks,
      screwTicks: this.screwTicks,
    });
  }

  private broadcast(msg: ServerMsg, exceptId?: number): void {
    for (const [id, m] of this.members) {
      if (id === exceptId) continue;
      m.send(msg);
    }
  }
}
