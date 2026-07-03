/**
 * Every word the room says, applied to the MatchView (M3 of the decomp
 * phase, plans/06). Extracted verbatim from main.ts's handleServerMsg.
 * Pure over (view, msg) except for the declared side effects behind NetFx —
 * spawning the deterministic local lob, ghost lifecycle, and the flash
 * line — which stay where the scene lives.
 */
import { TILT_DEG_PER_NOTCH } from "../game/catapult";
import type { RequirementCheck } from "../game/judgment";
import type { PlayerPose, RestingTopping, ServerMsg } from "../game/protocol";
import type { MatchView } from "./state";

export type ShotMsg = Extract<ServerMsg, { t: "shot" }>;

export interface NetFx {
  /** Simulate the lob locally — deterministic ballistics land identically
   * everywhere (sync-shots-not-surfaces). */
  spawnShot(msg: ShotMsg): void;
  /** Recreate a topping already at rest (welcome world-sync, F2). */
  spawnResting(t: RestingTopping): void;
  upsertGhost(pose: PlayerPose): void;
  removeGhost(id: number): void;
  flash(msg: string, ms?: number): void;
}

export function applyServerMsg(
  view: MatchView,
  msg: ServerMsg,
  fx: NetFx,
): void {
  switch (msg.t) {
    case "welcome":
      view.myId = msg.id;
      view.machine = msg.machine;
      view.crankTicks = msg.crankTicks;
      view.screwTicks = msg.screwTicks;
      view.order = msg.order;
      view.checks = msg.checks;
      for (const p of msg.poses) fx.upsertGhost(p);
      for (const t of msg.toppings) fx.spawnResting(t);
      break;
    case "join":
      fx.flash(`${msg.name} ran into the bakery!`);
      break;
    case "leave":
      fx.removeGhost(msg.id);
      fx.flash("a baker left");
      break;
    case "poses":
      for (const p of msg.poses) fx.upsertGhost(p);
      break;
    case "machine":
      view.machine = msg.state;
      view.crankTicks = msg.crankTicks;
      view.screwTicks = msg.screwTicks;
      break;
    case "shot":
      fx.spawnShot(msg);
      fx.flash(
        `LOOSED! ${msg.topping} · ${msg.tensionClicks} clicks · ${msg.traverseDeg.toFixed(0)}°${msg.tiltNotch > 0 ? ` · arc +${msg.tiltNotch * TILT_DEG_PER_NOTCH}°` : ""}`,
        2500,
      );
      break;
    case "scored": {
      // Did the checklist actually advance? (A topping ON the cake can
      // still count for nothing — wrong topping, wrong row.)
      const sum = (cs: readonly RequirementCheck[]): number =>
        cs.reduce((n, c) => n + Math.min(c.current, c.target), 0);
      const progressed = sum(msg.checks) > sum(view.checks);
      view.order = msg.order;
      view.checks = msg.checks;
      if (progressed) fx.flash(`✓ the patron counts the ${msg.topping}!`);
      else if (msg.onCake)
        fx.flash(
          `the ${msg.topping} rests on the cake — but that's not what was asked`,
        );
      else fx.flash(`no good — the ${msg.topping} didn't stay on the cake`);
      break;
    }
    case "order":
      view.order = msg.order;
      view.checks = msg.checks;
      if (msg.judgment) view.verdict = msg.judgment;
      else if (msg.order.status === "running") view.verdict = null; // fresh deal
      break;
    case "patron":
      view.lastPatron = { text: msg.text, seq: msg.seq };
      fx.flash(`THE GIANT — ${msg.text}`, 6000);
      break;
  }
}
