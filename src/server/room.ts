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
import { launchOrigin, launchVelocity } from "../core/ballistics";
import { ProjectileManager } from "../core/projectiles";
import {
  createCatapult,
  tickMachine,
  type CatapultState,
} from "../game/catapult";
import {
  checkRequirements,
  type Requirement,
  type RequirementCheck,
  type SettledTopping,
} from "../game/judgment";
import { createOrder, tickOrder, evaluateOrder, type OrderState } from "../game/order";
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

export const ORDER_SECONDS = 90;

/** The standing toy order until the Patron deals real ones (Step 3):
 * cherries anywhere on the top, one lime in the bullseye. Fresh rows every
 * deal — orders are mutable and must never share requirement objects. */
export function standardRequirements(): Requirement[] {
  return [
    { kind: "count-on-cake", topping: "cherry", needed: 2 },
    { kind: "count-in-zone", topping: "lime", zone: "peak", needed: 1 },
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
  private order: OrderState = createOrder(
    standardRequirements(),
    ORDER_SECONDS * 60,
  );
  /** Everything at rest THIS order — the census the checklist counts from.
   * Reset with the order: physical toppings stay in the world (the bakery
   * gets messier), but a fresh order counts fresh deliveries only. */
  private settled: SettledTopping[] = [];
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
      order: this.order,
      checks: this.currentChecks(),
      poses: this.poseList(id),
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
        m.held = { turn: msg.turn, crank: msg.crank };
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

    const r = tickMachine(this.machine, this.crankTicks, intent);
    this.machine = r.state;
    this.crankTicks = r.crankTicks;
    if (r.shot) {
      this.shots.spawn(
        this.world,
        launchOrigin(MACHINE_BASE, r.shot.traverseDeg),
        launchVelocity(r.shot.traverseDeg, r.shot.tensionClicks),
        r.shot.topping,
      );
      this.broadcast({
        t: "shot",
        topping: r.shot.topping,
        traverseDeg: r.shot.traverseDeg,
        tensionClicks: r.shot.tensionClicks,
      });
      // Arm state changed sharply; don't wait for the 15Hz cadence.
      this.broadcastMachine();
    }

    const ev = this.shots.step(this.world);
    for (const s of ev.settled) {
      const onCake = isOnCake(s.pos);
      this.settled.push({ topping: s.topping, pos: s.pos, onCake });
      const r = evaluateOrder(this.order, this.settled);
      this.order = r.state;
      this.broadcast({
        t: "scored",
        topping: s.topping,
        onCake,
        order: this.order,
        checks: r.checks,
      });
    }

    const statusBefore = this.order.status;
    this.order = tickOrder(this.order);
    if (this.order.status !== statusBefore)
      this.broadcast({ t: "order", order: this.order, checks: this.currentChecks() });

    // A finished order lingers on the banner, then the patron orders again.
    if (this.order.status !== "running") {
      this.endedTicks++;
      if (this.endedTicks >= ORDER_RESET_TICKS) {
        this.endedTicks = 0;
        this.settled = [];
        this.order = createOrder(standardRequirements(), ORDER_SECONDS * 60);
        this.broadcast({ t: "order", order: this.order, checks: this.currentChecks() });
      }
    }

    if (this.tickCount % POSE_BROADCAST_EVERY === 0) {
      for (const [id, m] of this.members) {
        const others = this.poseList(id);
        if (others.length > 0) m.send({ t: "poses", poses: others });
      }
    }
    if (this.tickCount % MACHINE_BROADCAST_EVERY === 0) this.broadcastMachine();
    if (this.tickCount % ORDER_CLOCK_EVERY === 0)
      this.broadcast({ t: "order", order: this.order, checks: this.currentChecks() });
  }

  private currentChecks(): RequirementCheck[] {
    return checkRequirements(this.order.requirements, this.settled);
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
    });
  }

  private broadcast(msg: ServerMsg, exceptId?: number): void {
    for (const [id, m] of this.members) {
      if (id === exceptId) continue;
      m.send(msg);
    }
  }
}
