/**
 * Input — keyboard/pointer-lock wiring + GRIP SEMANTICS (M2 of the decomp
 * phase, plans/06). Extracted verbatim from main.ts.
 *
 * [SUPERSEDED WHILE THE GUN-CREW EXPERIMENT RUNS (plans/14, 2026-07-08):
 * main.ts now derives machine ops from posts.ts — updateGrip / deriveOp /
 * machineEngaged are kept intact BELOW, unwired, so the experiment's
 * rollback is a one-commit revert. If the posts stick, delete them with
 * their tests, on purpose.]
 *
 * The grip law (plans/04, playtest bug 2026-07-03): the control you engage
 * with E stays GRIPPED until E is released — the crosshair slipping off, or
 * the control moving under it (the jack post extends as it works), must
 * never drop your hold and turn held W/S into walking. Hold-ops and
 * feet-planting read the grip; edge-ops (lever, load, pickup) keep reading
 * the live crosshair — that stays in main's tick.
 *
 * The pure functions below ARE the law; InputTracker is just DOM wiring.
 */
import type { BakerInput } from "../core/baker";
import type { HeldOp } from "../game/protocol";
import type { InteractableKind } from "./hud";

const MOUSE_SENSITIVITY = 0.0022;
const MAX_PITCH = (85 * Math.PI) / 180;

/** Advance the grip latch one tick: released E frees it; a free hand over
 * a control takes it; an existing grip holds whatever the crosshair does. */
export function updateGrip(
  held: InteractableKind | null,
  eHeld: boolean,
  target: InteractableKind | null,
): InteractableKind | null {
  if (!eHeld) return null;
  if (held === null && target !== null) return target;
  return held;
}

/** Hold state on the machine, derived from the grip + held keys.
 * Opposing keys cancel (A+D, W+S) — the machine is honest. */
export function deriveOp(
  grip: InteractableKind | null,
  eHeld: boolean,
  keys: ReadonlySet<string>,
): HeldOp {
  return {
    turn:
      grip === "wheel" && eHeld
        ? keys.has("KeyA") && !keys.has("KeyD")
          ? 1
          : keys.has("KeyD") && !keys.has("KeyA")
            ? -1
            : 0
        : 0,
    screw:
      grip === "screw" && eHeld
        ? keys.has("KeyW") && !keys.has("KeyS")
          ? 1
          : keys.has("KeyS") && !keys.has("KeyW")
            ? -1
            : 0
        : 0,
    crank: grip === "winch" && eHeld,
  };
}

/** Hands on the machine = feet planted. */
export function machineEngaged(
  grip: InteractableKind | null,
  eHeld: boolean,
): boolean {
  return eHeld && (grip === "wheel" || grip === "winch" || grip === "screw");
}

/** Movement intent for the baker; engaged hands plant the feet. */
export function deriveMove(
  engaged: boolean,
  keys: ReadonlySet<string>,
  yaw: number,
): BakerInput {
  return {
    forward: engaged ? 0 : (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0),
    strafe: engaged ? 0 : (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
    sprint: !engaged && (keys.has("ShiftLeft") || keys.has("ShiftRight")),
    yaw,
  };
}

/** DOM wiring: pointer-lock mouse look, key set, E edge. main.ts samples
 * this once per fixed tick. */
export class InputTracker {
  readonly keys = new Set<string>();
  yaw = 0; // 0 faces -Z: spawn looks at the catapult and cake
  pitch = 0;
  private ePressed = false;
  private fPressed = false;

  constructor(canvas: HTMLCanvasElement) {
    canvas.addEventListener("click", () => {
      if (document.pointerLockElement !== canvas)
        void canvas.requestPointerLock();
    });
    document.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement !== canvas) return;
      this.yaw -= e.movementX * MOUSE_SENSITIVITY;
      // Wrap to (-π, π]: unbounded accumulation broke the ghosts'
      // shortest-path turn after ~2 clockwise spins (audit 2026-07-03).
      // One step suffices — a single mousemove is a fraction of a turn.
      if (this.yaw > Math.PI) this.yaw -= 2 * Math.PI;
      else if (this.yaw <= -Math.PI) this.yaw += 2 * Math.PI;
      this.pitch = Math.max(
        -MAX_PITCH,
        Math.min(MAX_PITCH, this.pitch - e.movementY * MOUSE_SENSITIVITY),
      );
    });
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      if (e.code === "KeyE" && !e.repeat) this.ePressed = true;
      if (e.code === "KeyF" && !e.repeat) this.fPressed = true;
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => {
      this.keys.clear();
      // A stale edge must not fire a lever pull on refocus (audit).
      this.ePressed = false;
      this.fPressed = false;
    });
  }

  /** The E edge since the last take — consumed by exactly one sim tick. */
  takeEdgeE(): boolean {
    const edge = this.ePressed;
    this.ePressed = false;
    return edge;
  }

  /** The F edge (the gunner's lever, plans/14) — same one-tick contract. */
  takeEdgeF(): boolean {
    const edge = this.fPressed;
    this.fPressed = false;
    return edge;
  }
}
