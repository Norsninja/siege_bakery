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
import { isPaint } from "../game/toppings";
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

const POSE_BROADCAST_EVERY = 3; // ticks → 20Hz
const MACHINE_BROADCAST_EVERY = 4; // ticks → 15Hz
const ORDER_CLOCK_EVERY = 60; // ticks → 1Hz clock correction
/** After a win/loss lingers this long, the room deals a fresh order.
 * (Clients can't reset a shared room by reloading; the room resets itself.
 * Landed toppings stay where they lie — the bakery gets messier. Good.) */
const ORDER_RESET_TICKS = 600; // 10s
/** The Patron looks at the cake every N ticks of ORDER time (12s). */
export const PATRON_LOOK_EVERY = 12 * 60;

/** 120s: the honest order asks ~7–8 good shots (3–4 varied frosting
 * splashes + sprinkles + the crown) where the toy order asked 4 in 90s.
 * First knob the playtest turns if the bakery feels rushed or slack. */
export const ORDER_SECONDS = 120;
/** Par: the good-shot count of a clean line (research/04 §3). */
export const ORDER_PAR_SHOTS = 8;

/** THE HONEST ORDER (plans/07 phase O) — the decorating truth as a ticket:
 * frost the cake, sprinkles on the frosting, and the Giant's mid-order
 * demand is the ONLY cherry row that ever exists. THE ONE-NUMBER LAW:
 * every row is one number of one thing, and a topping appears in at most
 * one row per order — the "is it 4 cherries or 5" arithmetic is impossible
 * by construction. LIMES ARE NEVER ORDERED — the lime is the pantry DECOY
 * (visionary, 2026-07-03): grab the wrong crate under pressure and it
 * fires anyway, lands anyway, counts only as mess. frac 0.3 = 3–4 varied
 * splashes (research/04 §3: a good splash covers 8–12%, and identical
 * arcs re-coat the SAME spot — spreading demands the traverse wheel).
 * Fresh rows every deal — orders are mutable, never share row objects. */
export function standardRequirements(): Requirement[] {
  return [
    { kind: "frost-coverage", frac: 0.3 },
    { kind: "on-frosting", topping: "sprinkles", needed: 3 },
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
   * gets messier), but a fresh order counts fresh deliveries only. */
  private settled: SettledTopping[] = [];
  /** The frosting field — paint events accumulate here (plans/07). Reset
   * with the order: the Giant licks the cake clean between deals (paint is
   * the scoreboard; a fresh FROST row must not start half-met). */
  private readonly frosting = new FrostingField();
  /** Shots this order — the waste axis. Resets with each fresh deal. */
  private shotsFired = 0;
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
    });
    this.broadcast({ t: "join", id, name: member.name }, id);
    return id;
  }

  leave(id: number): void {
    if (!this.members.delete(id)) return;
    this.broadcast({ t: "leave", id });
  }

  onMessage(id: number, msg: ClientMsg): void {
    const m = this.members.get(id);
    if (!m) return;
    switch (msg.t) {
      case "hello":
        m.name = msg.name || m.name;
        break;
      case "pose":
        m.pose = msg.pose;
        break;
      case "op":
        m.held = { turn: msg.turn, screw: msg.screw, crank: msg.crank };
        break;
      case "lever":
        m.leverPulls++;
        break;
      case "load":
        if (m.loads.length < 2) m.loads.push(msg.topping);
        break;
    }
  }

  /** One fixed 60Hz tick: machine → physics → scoring → clock → broadcasts. */
  tick(): void {
    this.tickCount++;

    // Merge every hand on the machine into one intent; consume edges.
    const held: HeldOp[] = [];
    let leverPulls = 0;
    const loads: string[] = [];
    for (const m of this.members.values()) {
      held.push(m.held);
      leverPulls += m.leverPulls;
      m.leverPulls = 0;
      loads.push(...m.loads);
      m.loads.length = 0;
    }
    const intent = mergeIntents(held, leverPulls, loads);

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
        { consumeOnImpact: isPaint(r.shot.topping) },
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
      const painted = this.frosting.paint(im.pos, im.speed);
      this.scoreDelivery(im.topping, im.pos, painted > 0);
    }
    // Solids land at REST — scoring truth unchanged.
    for (const s of ev.settled)
      this.scoreDelivery(s.topping, s.pos, isOnCake(s.pos));

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
        judgment: judge(this.order, this.settled, this.frosting, this.shotsFired),
      });
    }

    // A finished order lingers on the banner, then the patron orders again.
    if (this.order.status !== "running") {
      this.endedTicks++;
      if (this.endedTicks >= ORDER_RESET_TICKS) {
        this.endedTicks = 0;
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

  /** One delivery lands (solid at rest, paint at impact): ledger it,
   * re-census, tell everyone — and announce the Judgment if that met the
   * last row. */
  private scoreDelivery(topping: string, pos: Vec3, onCake: boolean): void {
    this.settled.push({ topping, pos, onCake });
    const r = evaluateOrder(
      this.order,
      this.settled,
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
    return checkRequirements(this.order.requirements, this.settled, this.frosting);
  }

  /** One Patron look: observe → act (may mutate rows) → patience lands on
   * the clock → everyone hears the voice, then the amended order. */
  private patronLooks(): void {
    const total = this.settled.length;
    const mess =
      total > 0 ? this.settled.filter((s) => !s.onCake).length / total : 0;
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
