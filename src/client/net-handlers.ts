/**
 * Every word the room says, applied to the MatchView (M3 of the decomp
 * phase, plans/06). Extracted verbatim from main.ts's handleServerMsg.
 * Pure over (view, msg) except for the declared side effects behind NetFx —
 * spawning the deterministic local lob, ghost lifecycle, and the flash
 * line — which stay where the scene lives.
 */
import { dessertGeometry, type DessertGeometry } from "../core/dessert";
import { specForRung } from "../game/campaign";
import { TILT_DEG_PER_NOTCH } from "../game/catapult";
import type { RequirementCheck } from "../game/judgment";
import type {
  PlayerPose,
  RestingTopping,
  ServerMsg,
  StuckTopping,
} from "../game/protocol";
import type { SfxKey, SfxPlayOptions } from "./sfx";
import { freshTownMachine, type MatchView } from "./state";

export type ShotMsg = Extract<ServerMsg, { t: "shot" }>;

/** Grow view.machines to include `town` — placeholder rigs are honest
 * until their next 15Hz broadcast. THE ONE grow rule (audit 2026-07-07
 * C-MED-2): both the machine broadcast and the town ack must uphold
 * myMachine's invariant that yourTown always indexes machines. */
function growMachines(view: MatchView, town: number): void {
  while (view.machines.length <= town) view.machines.push(freshTownMachine());
}

export interface NetFx {
  /** Simulate the lob locally — deterministic ballistics land identically
   * everywhere (sync-shots-not-surfaces). */
  spawnShot(msg: ShotMsg): void;
  /** Recreate a topping already at rest (welcome world-sync, F2). */
  spawnResting(t: RestingTopping): void;
  /** Adopt the welcome's frosting snapshot — the painted cake as it lies
   * (plans/07; the one surface that ever crosses the wire). */
  restoreFrosting(coats: number[]): void;
  /** THE DESSERT REBIND (spec refactor, plans/13 §3): the wire's rung
   * named a spec; swap the client's dessert colliders, cake visuals, and
   * frosting view to it — the fresh cake wheels out naked (this replaces
   * the old resetFrosting). Called AFTER clearCakeSolids (which must
   * read the OUTGOING geometry) and BEFORE any dessert-derived snapshot
   * state adopts (the boot-order law). */
  bindDessert(dessert: DessertGeometry): void;
  /** A fresh deal, the solid half (fresh-cake law): everything resting ON
   * the dessert leaves with it; floor litter stays. The Room removed the
   * same set from its world — body positions are the shared truth. Reads
   * view.dessert at CALL time — the outgoing geometry, by the ordering
   * above. */
  clearCakeSolids(): void;
  /** Adopt the welcome's stuck-sprinkle records (conversion law, plans/10
   * §8) — perched on the frosting the snapshot just restored. */
  restoreStuck(list: StuckTopping[]): void;
  /** A fresh deal: the stuck sprinkles left with the dessert. */
  clearStuck(): void;
  /** A fresh deal: landing rings are annotations about the DEAD order's
   * shots — under a fresh cake they point at paint that is gone (playtest
   * 2026-07-07). All come down; physical floor litter stays by law. */
  clearLandingRings(): void;
  upsertGhost(pose: PlayerPose): void;
  removeGhost(id: number): void;
  flash(msg: string, ms?: number): void;
  /** Slice 6, optional: the sound half of the FX port. The patron's
   * grumble-rumble rides his flash line here (ruling 2: the grumble
   * ACCOMPANIES the text, never replaces it — the line is load-bearing
   * comedy). Absent in tests: announcements into the void. */
  sound?(key: SfxKey, opts?: SfxPlayOptions): void;
  /** MY town changed (welcome or an honored pick): re-target the scene's
   * interactables/highlights at TOWNS[town]'s rig and pantry. Assignment,
   * not position — the baker runs to the new fort on foot. */
  bindTown(town: number): void;
}

export function applyServerMsg(
  view: MatchView,
  msg: ServerMsg,
  fx: NetFx,
): void {
  switch (msg.t) {
    case "welcome":
      view.myId = msg.id;
      view.machines = msg.machines;
      view.yourTown = msg.yourTown;
      fx.bindTown(msg.yourTown);
      view.order = msg.order;
      view.checks = msg.checks;
      view.run = msg.run;
      // THE BOOT-ORDER LAW (plans/13 §3 rulings, the plans/11 §4 discipline
      // repeated): bind the deal's dessert BEFORE adopting anything derived
      // from it — resting toppings need its colliders under them, and the
      // frosting snapshot must land on a field sized to its census
      // (frosting-view's length guard is the tripwire if this slips).
      view.dessert = dessertGeometry(specForRung(msg.run.rung));
      fx.bindDessert(view.dessert);
      // Joined mid-banner: adopt the verdict, or the banner words gate-1
      // hunger over a WON order (audit 2026-07-03).
      view.verdict = msg.judgment ?? null;
      for (const p of msg.poses) fx.upsertGhost(p);
      for (const t of msg.toppings) fx.spawnResting(t);
      fx.restoreFrosting(msg.frosting);
      fx.restoreStuck(msg.stuck); // after the frosting: the perch reads coats
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
      // Indexed by town. Grow to fit: a town-1 broadcast can precede any
      // two-town welcome (the unlock happened after we joined) — a
      // placeholder rig state is honest until its next broadcast.
      growMachines(view, msg.town);
      view.machines[msg.town] = {
        machine: msg.state,
        crankTicks: msg.crankTicks,
        screwTicks: msg.screwTicks,
      };
      break;
    case "town":
      // An honored pick. Mine re-targets HUD/controls; assignment is
      // server truth — never assumed at send time (plans/11 §5).
      if (msg.id === view.myId) {
        // Grow BEFORE re-targeting (audit 2026-07-07 C-MED-2): the ack can
        // beat the new town's first machine broadcast by up to 4 ticks,
        // and myMachine must never read a foreign fort's rig meanwhile.
        growMachines(view, msg.town);
        view.yourTown = msg.town;
        fx.bindTown(msg.town);
        fx.flash(`you now crew town ${msg.town + 1} — run to your machine!`, 5000);
      }
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
      // Batched grain landings arrive with a count (plans/10 §5).
      const times = msg.count !== undefined && msg.count > 1 ? ` ×${msg.count}` : "";
      if (progressed) fx.flash(`✓ the patron counts the ${msg.topping}${times}!`);
      else if (msg.onCake)
        fx.flash(
          `the ${msg.topping}${times} rests on the cake — but that's not what was asked`,
        );
      else fx.flash(`no good — the ${msg.topping}${times} didn't stay on the cake`);
      break;
    }
    case "order":
      view.order = msg.order;
      view.checks = msg.checks;
      if (msg.judgment) view.verdict = msg.judgment;
      else if (msg.order.status === "running") view.verdict = null; // fresh deal
      if (msg.fresh) {
        // THE REDEAL ORDERING (plans/13 §3 rulings), client half: clear
        // the cake's solids with the OUTGOING geometry — bodies leave
        // with the dessert they rested ON — THEN bind the incoming rung's
        // spec (colliders swap, naked cake, fresh field).
        fx.clearCakeSolids();
        view.dessert = dessertGeometry(specForRung(msg.rung ?? view.run.rung));
        fx.bindDessert(view.dessert);
        fx.clearStuck();
        fx.clearLandingRings();
      }
      break;
    case "patron":
      view.lastPatron = { text: msg.text, seq: msg.seq };
      fx.flash(`THE GIANT — ${msg.text}`, 6000);
      // The grumble under the line (slice 6, ruling 2) — non-spatial for
      // now: a 36 m giant's grumble fills the yard. Row silent until the
      // visionary's file lands (the drop-in law).
      fx.sound?.("grumbleRumble");
      break;
    case "run": {
      // The run container moved (plans/13). Voice the edges the crew
      // FEELS; the HUD/banner render the standing state every frame.
      const prev = view.run;
      view.run = {
        phase: msg.phase,
        rung: msg.rung,
        // The triumph flags (slice 4/4b) — FOUND MISSING with slice 5:
        // without these copies a standing client's run-over banner could
        // never crown (only a mid-report joiner saw MASTER BAKER, via
        // the welcome's whole-run assignment).
        ...(msg.won !== undefined ? { won: msg.won } : {}),
        ...(msg.ultra !== undefined ? { ultra: msg.ultra } : {}),
        // The shared purse (plans/13 §5 amendment): absent reads 0.
        ...(msg.purse !== undefined ? { purse: msg.purse } : {}),
        ...(msg.countdownTicks !== undefined
          ? { countdownTicks: msg.countdownTicks }
          : {}),
        ...(msg.readyIn !== undefined ? { readyIn: msg.readyIn } : {}),
        ...(msg.readyOf !== undefined ? { readyOf: msg.readyOf } : {}),
      };
      if (msg.phase === "running" && prev.phase !== "running") {
        // THE RE-LOCK, client half (§5 amendment): inventory died with
        // the last run — town 2's machine leaves the list at the same
        // boundary the server shrank its towns array. The server spoke
        // the town re-address BEFORE this run word, so yourTown already
        // indexes home (C-MED-2's invariant, guarded by the max).
        view.machines.length = Math.max(1, view.yourTown + 1);
        // THE SEMANTIC AUDIT (item 12) + the line fiction (plans/16,
        // plans/18): each rung is the NEXT giant in the queue stepping
        // up — the screen speaks patrons, the code keeps its rungs.
        fx.flash(`THE BAKERY OPENS — the first patron is seated!`, 5000);
      }
      else if (
        msg.phase === "running" &&
        prev.phase === "running" &&
        msg.rung !== prev.rung
      )
        fx.flash(`PATRON ${msg.rung} steps up to the table!`, 5000);
      else if (msg.phase === "lobby" && prev.phase === "runover")
        fx.flash("back to the bakery — gather in the circle to bake again", 6000);
      break;
    }
  }
}
