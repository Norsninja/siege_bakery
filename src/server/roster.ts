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
import { TOPPINGS } from "../game/toppings";

/** Fantasy bakers-of-the-siege name parts (2026-07-06: replacing the "baker
 * N" placeholder — the `hello` rename hook stays wired for a future custom
 * name). Drawn from a SEEDED stream (the server layer is inside the
 * determinism fence), so names are deterministic — two headless replicas
 * agree, and a fresh server hands slot-in-join-order the same flavor. Per-
 * session variety later = seed this from the driver. */
const NAME_FIRST = [
  "Bramblewick", "Thornwood", "Mossbeard", "Gilda", "Pipkin", "Fenwick",
  "Marigold", "Bruk", "Elowen", "Tamsin", "Hodgepan", "Wren", "Grimsby",
  "Dunwick", "Saffra", "Orrin",
];
const NAME_EPITHET = [
  "the Bold", "the Crumb", "Emberfall", "of the Rising Loaf", "Dourcrust",
  "the Unproofed", "Yeastborn", "Butterthumbs", "the Overbaked", "Flourfist",
  "the Half-Baked", "Sugarsworn", "of Deepcrust", "the Kneadful",
];

interface Member {
  send: (msg: ServerMsg) => void;
  name: string;
  pose: Pose | null;
  held: HeldOp;
  leverPulls: number;
  loads: string[];
  /** Which town this member crews (plans/11 §4-5): ASSIGNED state, not
   * proximity — set only by explicit pickTown (Room-gated to order
   * boundaries), default 0, never moved by the system. Input routing is
   * OWNER-IMPLICIT: op/lever/load drive the machine of THIS town; the
   * wire never carries a town on inputs and the server never trusts one. */
  town: number;
}

export class Roster {
  private readonly members = new Map<number, Member>();
  private nextId = 1;
  /** The name stream — seeded, so it stays inside the determinism fence. */
  private readonly nameRng = mulberry32(0x8a4e17);

  /** A fresh fantasy name: a given name and an epithet, both seeded draws. */
  private fantasyName(): string {
    const f = NAME_FIRST[Math.floor(this.nameRng() * NAME_FIRST.length)]!;
    const e = NAME_EPITHET[Math.floor(this.nameRng() * NAME_EPITHET.length)]!;
    return `${f} ${e}`;
  }

  /** Add a client; returns its id and settled name. A client that later
   * sends `hello` overrides it (the rename hook); until then this flavor
   * name is what the others see run into the bakery. */
  add(send: (msg: ServerMsg) => void, name = ""): { id: number; name: string } {
    const id = this.nextId++;
    this.members.set(id, {
      send,
      name: name || this.fantasyName(),
      pose: null,
      held: { ...IDLE_OP },
      leverPulls: 0,
      loads: [],
      town: 0, // everyone starts home; moving is always a choice (§1)
    });
    return { id, name: this.members.get(id)!.name };
  }

  /** The pickTown mechanism's field half (plans/11 §5). The Room owns the
   * ORDER gate (locked while running — match truth lives there); this owns
   * the FIELD truth: an integer, an ACTIVE town (a dormant fort cannot be
   * crewed), else ignored whole like any malformed wire input. Returns
   * whether the assignment CHANGED — the Room announces honored picks. */
  setTown(id: number, town: number, activeTowns: number): boolean {
    const m = this.members.get(id);
    if (!m) return false;
    if (!Number.isInteger(town) || town < 0 || town >= activeTowns) return false;
    if (m.town === town) return false;
    m.town = town;
    // THE HANDS LET GO (audit 2026-07-07 S-MED-2): intent routes purely by
    // m.town, so without this a picker's held crank, pending lever pull,
    // and queued crates would instantly drive the NEW town's machine with
    // nobody standing at it. Assignment moves the baker's ADDRESS; his
    // hands open. (Deterministic either way — this is a match rule, not a
    // convergence fix.)
    m.held = { ...IDLE_OP };
    m.leverPulls = 0;
    m.loads = [];
    return true;
  }

  /** A member's current town, for shot attribution and yourTown. */
  townOf(id: number): number {
    return this.members.get(id)?.town ?? 0;
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
          crank: msg.crank === 1 || msg.crank === -1 ? msg.crank : 0,
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

  /** Merge every hand on ONE TOWN's machine into one intent; consume the
   * edges. OWNER-IMPLICIT routing (plans/11 §4): only members ASSIGNED to
   * `town` drive it — which structurally fixes the old merge-everyone
   * behavior (it survives as the town-0 case with everyone home). Lever
   * pulls and load queues of other towns' members are left untouched for
   * their own town's pass this tick.
   * Loads are edges, but a full bucket REJECTS — it must not DESTROY
   * (checkpoint audit M10): two bakers loading in the same window used to
   * silently evaporate the loser's topping. Queued loads stay queued
   * (≤2/member, handleMessage) until the bucket actually accepts one, so
   * the loser's topping enters the moment the machine fires. One candidate
   * per tick; first-joined member breaks ties (Map order — deterministic). */
  machineIntent(town: number, bucketFree: boolean): MachineIntent {
    const held: HeldOp[] = [];
    let leverPulls = 0;
    for (const m of this.members.values()) {
      if (m.town !== town) continue;
      held.push(m.held);
      leverPulls += m.leverPulls;
      m.leverPulls = 0;
    }
    let loader: Member | null = null;
    let load: string | null = null;
    for (const m of this.members.values()) {
      if (m.town !== town) continue;
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

  /** EVERY member's pose, null where none was ever reported — the ready-
   * circle census (plans/13): a baker who hasn't spoken a position yet
   * cannot be standing in the circle. */
  allPoses(): (Pose | null)[] {
    return [...this.members.values()].map((m) => m.pose);
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
