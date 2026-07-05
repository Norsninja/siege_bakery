/**
 * The Roster — who is in the room and what their hands are doing
 * (Room.tick decomp, research/05 parked item 4; built 2026-07-05).
 *
 * Owns the member map, the wire-input VALIDATION boundary, pose relay
 * data, and the merge of every hand on the machine into one intent. It
 * knows nothing about the match: no world, no order, no scoring — the
 * Room asks it questions and broadcasts through it.
 *
 * Layering: server-land, imports game/ protocol types only.
 */
import type { MachineIntent } from "../game/catapult";
import {
  mergeIntents,
  IDLE_OP,
  type ClientMsg,
  type ServerMsg,
  type HeldOp,
  type Pose,
  type PlayerPose,
} from "../game/protocol";
import { TOPPINGS } from "../game/toppings";

interface Member {
  send: (msg: ServerMsg) => void;
  name: string;
  pose: Pose | null;
  held: HeldOp;
  leverPulls: number;
  loads: string[];
}

export class Roster {
  private readonly members = new Map<number, Member>();
  private nextId = 1;

  /** Add a client; returns its id and settled name. */
  add(send: (msg: ServerMsg) => void, name = ""): { id: number; name: string } {
    const id = this.nextId++;
    this.members.set(id, {
      send,
      name: name || `baker ${id}`,
      pose: null,
      held: { ...IDLE_OP },
      leverPulls: 0,
      loads: [],
    });
    return { id, name: this.members.get(id)!.name };
  }

  /** Remove a client; returns whether it was present. */
  remove(id: number): boolean {
    return this.members.delete(id);
  }

  count(): number {
    return this.members.size;
  }

  /** The Room's FIELD-validation boundary (checkpoint audit, 2026-07-03).
   * The wire is typed but the internet is not: every field is re-checked
   * here, unknown fields are dropped by copying only the known ones, and
   * anything malformed is ignored whole. main.ts owns transport HEALTH
   * (frame size, heartbeats, member cap); this owns message TRUTH. */
  handleMessage(id: number, msg: ClientMsg): void {
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

  /** Merge every hand on the machine into one intent; consume the edges.
   * Loads are edges, but a full bucket REJECTS — it must not DESTROY
   * (checkpoint audit M10): two bakers loading in the same window used to
   * silently evaporate the loser's topping. Queued loads stay queued
   * (≤2/member, handleMessage) until the bucket actually accepts one, so
   * the loser's topping enters the moment the machine fires. One candidate
   * per tick; first-joined member breaks ties (Map order — deterministic). */
  machineIntent(bucketFree: boolean): MachineIntent {
    const held: HeldOp[] = [];
    let leverPulls = 0;
    for (const m of this.members.values()) {
      held.push(m.held);
      leverPulls += m.leverPulls;
      m.leverPulls = 0;
    }
    let loader: Member | null = null;
    let load: string | null = null;
    for (const m of this.members.values()) {
      if (m.loads.length > 0) {
        loader = m;
        load = m.loads[0]!;
        break;
      }
    }
    const accepted = load !== null && bucketFree;
    if (accepted) loader!.loads.shift();
    return mergeIntents(held, leverPulls, accepted ? [load!] : []);
  }

  /** Everyone else's pose, for the relay and the welcome snapshot. */
  poseList(exceptId: number): PlayerPose[] {
    const list: PlayerPose[] = [];
    for (const [id, m] of this.members) {
      if (id === exceptId || m.pose === null) continue;
      list.push({ id, ...m.pose });
    }
    return list;
  }

  /** Send to one member (the pose relay wants per-member payloads). */
  sendTo(id: number, msg: ServerMsg): void {
    this.members.get(id)?.send(msg);
  }

  /** Every member id, for per-member cadence loops. */
  ids(): number[] {
    return [...this.members.keys()];
  }

  broadcast(msg: ServerMsg, exceptId?: number): void {
    for (const [id, m] of this.members) {
      if (id === exceptId) continue;
      m.send(msg);
    }
  }
}
