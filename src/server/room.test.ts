/**
 * The Room, headless — two scripted clients play the actual game over the
 * actual protocol with no transport at all. If this passes, "two tabs, one
 * cake" is a wiring exercise, not a physics gamble.
 */
import { describe, it, expect, beforeAll } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { PATRON_LOOK_EVERY, Room } from "./room";
import { CRANK_TICKS_PER_CLICK } from "../game/catapult";
import type { ServerMsg } from "../game/protocol";

interface FakeClient {
  id: number;
  inbox: ServerMsg[];
  /** Last message of a given type, if any. */
  last<T extends ServerMsg["t"]>(t: T): Extract<ServerMsg, { t: T }> | undefined;
  all<T extends ServerMsg["t"]>(t: T): Array<Extract<ServerMsg, { t: T }>>;
}

function connect(room: Room, name: string): FakeClient {
  const inbox: ServerMsg[] = [];
  const id = room.join((m) => inbox.push(m), name);
  return {
    id,
    inbox,
    last: (t) => inbox.filter((m) => m.t === t).pop() as never,
    all: (t) => inbox.filter((m) => m.t === t) as never,
  };
}

function run(room: Room, ticks: number): void {
  for (let i = 0; i < ticks; i++) room.tick();
}

describe("Room: the match, headless over protocol", () => {
  beforeAll(async () => {
    await RAPIER.init();
  });

  it("welcomes joiners with a full snapshot; tells the others", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const w = a.last("welcome");
    expect(w?.id).toBe(a.id);
    expect(w?.machine.tensionClicks).toBe(0);
    expect(w?.order.status).toBe("running");
    expect(w?.checks.length).toBeGreaterThan(0); // the standing order has rows
    expect(w?.checks.every((c) => !c.met)).toBe(true);
    const b = connect(room, "bob");
    expect(a.last("join")?.id).toBe(b.id);
    expect(b.last("welcome")?.id).toBe(b.id);
  });

  it("relays poses to the other player, not back to the sender", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    room.onMessage(a.id, { t: "pose", pose: { x: 1, y: 0.86, z: 5, yaw: 0.3 } });
    run(room, 3);
    const bp = b.last("poses");
    expect(bp?.poses).toEqual([{ id: a.id, x: 1, y: 0.86, z: 5, yaw: 0.3 }]);
    // Alice has no pose from Bob yet, so she gets no poses message at all.
    expect(a.last("poses")).toBeUndefined();
  });

  it("two people cranking together is still one winch rate", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    room.onMessage(a.id, { t: "op", turn: 0, crank: true });
    room.onMessage(b.id, { t: "op", turn: 0, crank: true });
    // A few extra ticks so the 15Hz machine broadcast lands after the click.
    run(room, CRANK_TICKS_PER_CLICK + 4);
    const m = a.last("machine");
    expect(m?.state.tensionClicks).toBe(1); // not 2
  });

  it("opposite traverse turns cancel out", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    room.onMessage(a.id, { t: "op", turn: 1, crank: false });
    room.onMessage(b.id, { t: "op", turn: -1, crank: false });
    run(room, 120);
    expect(a.last("machine")?.state.traverseDeg).toBe(0);
  });

  it("load edge is consumed once, not re-applied after firing", () => {
    const room = new Room();
    const a = connect(room, "alice");
    room.onMessage(a.id, { t: "load", topping: "cherry" });
    run(room, 2);
    expect(a.last("machine")?.state.loaded ?? null).toBeNull(); // 15Hz not due yet
    run(room, 4);
    expect(a.last("machine")?.state.loaded).toBe("cherry");
    room.onMessage(a.id, { t: "lever" });
    run(room, 6);
    expect(a.last("machine")?.state.loaded).toBeNull(); // fired, and no re-load
  });

  it("the full co-op shot: load, crank to 6, fire → shot broadcast → authoritative score", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    room.onMessage(a.id, { t: "load", topping: "cherry" });
    room.onMessage(b.id, { t: "op", turn: 0, crank: true });
    run(room, CRANK_TICKS_PER_CLICK * 6);
    room.onMessage(b.id, { t: "op", turn: 0, crank: false });
    room.onMessage(a.id, { t: "lever" });
    run(room, 1);
    const shotA = a.last("shot");
    const shotB = b.last("shot");
    expect(shotA).toEqual({
      t: "shot",
      topping: "cherry",
      traverseDeg: 0,
      tensionClicks: 6,
    });
    expect(shotB).toEqual(shotA); // everyone spawns the same deterministic lob
    run(room, 600); // flight + skid + rest detection
    const scored = b.last("scored");
    expect(scored?.onCake).toBe(true); // 6 clicks is the pinned scoring window
    const cherryRow = scored?.checks.find((c) => c.req.topping === "cherry");
    expect(cherryRow?.current).toBe(1);
    expect(scored?.order.status).toBe("running"); // one cherry is not the order
  });

  it("the clock is authoritative — and the Patron BURNS it: the order dies early", () => {
    const room = new Room();
    const a = connect(room, "alice");
    // 90s of untouched machine: grumbles eat the clock, so the loss lands
    // well before the nominal 90*60 ticks. Everyone hears the verdict.
    run(room, 90 * 60);
    const msgs = a.all("order");
    const endIdx = msgs.findIndex((m) => m.order.status !== "running");
    expect(endIdx).toBeGreaterThanOrEqual(0);
    const ended = msgs[endIdx];
    expect(ended?.order.status).toBe("lost");
    expect(ended?.order.ticksLeft).toBe(0);
    // The clock died first: the verdict rides along, and it's the sad kind.
    expect(ended?.judgment?.met).toBe(false);
    expect(ended?.judgment?.stars).toBe(0);
    // Patience burned: the ending arrived measurably before nominal time.
    expect(a.all("patron").length).toBeGreaterThan(2);
  });

  it("a finished order lingers, then the patron orders again with a clean slate", () => {
    const room = new Room();
    const a = connect(room, "alice");
    run(room, 90 * 60); // long enough to lose AND re-deal
    const msgs = a.all("order");
    const endIdx = msgs.findIndex((m) => m.order.status !== "running");
    expect(endIdx).toBeGreaterThanOrEqual(0);
    const fresh = msgs.slice(endIdx + 1).find((m) => m.order.status === "running");
    expect(fresh).toBeDefined();
    // The ledger reset with the order: a fresh deal counts fresh deliveries.
    expect(fresh?.checks.every((c) => c.current === 0)).toBe(true);
  });

  it("the Patron looks on cadence and everyone hears the same words", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    run(room, PATRON_LOOK_EVERY - 2);
    expect(a.all("patron")).toHaveLength(0); // he hasn't looked yet
    run(room, 4);
    expect(a.all("patron")).toHaveLength(1);
    const heardA = a.last("patron");
    const heardB = b.last("patron");
    expect(heardA?.text.length).toBeGreaterThan(0);
    expect(heardB).toEqual(heardA); // one voice, every ear
    // The amended/corrected order follows the voice immediately.
    expect(a.last("order")?.order.status).toBe("running");
    run(room, PATRON_LOOK_EVERY);
    expect(a.all("patron")).toHaveLength(2);
    expect(a.all("patron")[1]?.seq).toBe(2);
  });

  it("leavers stop receiving; the rest are told", () => {
    const room = new Room();
    const a = connect(room, "alice");
    const b = connect(room, "bob");
    room.leave(b.id);
    expect(a.last("leave")?.id).toBe(b.id);
    const before = b.inbox.length;
    run(room, 10);
    expect(b.inbox.length).toBe(before);
    expect(room.memberCount()).toBe(1);
  });
});
