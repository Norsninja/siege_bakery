/**
 * HUD + banner text — PURE string builders, no DOM, no three.js (M1 of the
 * decomp phase, plans/06). Extracted verbatim from main.ts so the words the
 * player reads are unit-testable: the culprit-naming law (a failed order
 * must NAME the row that failed — 2D playtest lesson), the three verdict
 * branches, the arc glyph, the interactable prompts.
 *
 * main.ts owns the DOM elements and WHEN to render; this module owns WHAT
 * the text says.
 */
import { FIXED_DT } from "../core/constants";
import {
  CRANK_TICKS_PER_CLICK,
  TENSION_MAX_CLICKS,
  TILT_DEG_PER_NOTCH,
  TILT_MAX_NOTCH,
  type CatapultState,
} from "../game/catapult";
import {
  describeProgress,
  describeRequirement,
  type Judgment,
  type RequirementCheck,
} from "../game/judgment";
import type { OrderState } from "../game/order";
import type { RunWire } from "../game/protocol";
import type { Post } from "./posts";

/** Everything the crosshair can engage. (Lives here for now; the decomp's
 * input/scene modules share it — re-home if it ever grows legs.) */
export type InteractableKind =
  | "wheel"
  | "winch"
  | "screw"
  | "lever"
  | "bucket"
  | "shelf-cherry"
  | "shelf-lime"
  | "shelf-frosting"
  | "shelf-sprinkles"
  | "shelf-fudge";

/** Which topping each pantry shelf hands out — main.ts's pickup reads this
 * instead of growing a branch per crate. */
export const SHELF_TOPPING: Partial<Record<InteractableKind, string>> = {
  "shelf-cherry": "cherry",
  "shelf-lime": "lime",
  "shelf-frosting": "frosting",
  "shelf-sprinkles": "sprinkles",
  "shelf-fudge": "fudge",
};

/** The machine's CONTROLS — worked from crew posts while the gun-crew
 * experiment runs (plans/14; review 2026-07-08). These kinds leave the
 * crosshair entirely: scene.bindTown drops their meshes from the raycast
 * (no highlight, no redirect prompt — the redirect lines wore an
 * interaction's costume next to the post invite) and interactions.
 * pantryTarget refuses them as the belt to that suspender. promptFor's
 * redirect cases below stay, superseded-kept, for rollback. */
export const MACHINE_CONTROL_KINDS: ReadonlySet<InteractableKind> = new Set([
  "wheel",
  "winch",
  "screw",
  "lever",
] satisfies InteractableKind[]);

export type NetStatus = "loopback" | "connecting" | "open" | "closed";

/** The arc position as a filled ladder — the fill shows the whole scale
 * at once (the notch-1/3 misread fix, kept through the vernier). 19
 * positions since the 2.5° table (research/13): grouped in FOURS — one
 * group is 10° — so a glance counts groups, not boxes. VISIONARY CALL
 * 2026-07-08: the full ladder lives ONLY where you dial — that meant the
 * screw prompt, and with the gun crew (plans/14) it means the GUNNER'S
 * instrument line; the always-on machine line carries the compact
 * numeric form — a 23-char ladder between three stats muddied which
 * stat owned it. */
export const arcGlyph = (tiltNotch: number): string => {
  let out = "";
  for (let i = 0; i <= TILT_MAX_NOTCH; i++) {
    if (i > 0 && i % 4 === 0) out += "·";
    out += i <= tiltNotch ? "▮" : "▯";
  }
  return out;
};

export function promptFor(
  kind: InteractableKind,
  machine: CatapultState,
  carrying: string | null,
): string {
  switch (kind) {
    // The machine's CONTROLS are worked from crew posts now (plans/14).
    // These redirect cases are UNREACHABLE while the experiment runs —
    // MACHINE_CONTROL_KINDS drops the meshes from the raycast (review
    // 2026-07-08: the redirects read as interactions beside the post
    // invite) — kept, like the grip law, for rollback. The bucket and
    // shelves below stay walk-up interactions — the loader is the runner.
    case "wheel":
    case "screw":
      return "worked from the GUNNER'S POST — stand behind the machine · E";
    case "winch":
      return "cranked from the WINCH POST — the machine's right flank · E";
    case "lever":
      return "the gunner fires — F, from the post";
    case "bucket":
      if (machine.loaded !== null) return "bucket is full — fire it!";
      return carrying !== null
        ? `E — load the ${carrying}`
        : "hands empty — fetch a topping from the pantry";
    case "shelf-cherry":
      return carrying !== null ? "hands full — one at a time" : "E — take a cherry";
    case "shelf-lime":
      return carrying !== null ? "hands full — one at a time" : "E — take a lime";
    case "shelf-frosting":
      return carrying !== null
        ? "hands full — one at a time"
        : "E — scoop a glob of frosting";
    case "shelf-sprinkles":
      return carrying !== null
        ? "hands full — one at a time"
        : "E — take a bag of sprinkles";
    case "shelf-fudge":
      return carrying !== null
        ? "hands full — one at a time"
        : "E — scoop hot fudge";
  }
}

/** The linger countdown as the banner tells it (2026-07-07, the carry-home
 * law): the linger window is the ONLY time the gates stand open, so the
 * banner must show the clock — and warn a baker who is out of his town
 * that the deal will CARRY him home. `seconds` is the client's local
 * prediction off ORDER_RESET_TICKS (advisory, like predictClock — the
 * fresh deal itself is server truth). */
export interface NextOrderNote {
  seconds: number;
  /** True when the local baker is NOT inside his assigned town. */
  away: boolean;
  /** True when this linger ends the RUN (plans/13: the order was lost) —
   * no fresh deal follows, so "a new order in Ns" and the carry-home
   * warning would both lie; the banner says what actually comes. */
  runEnds?: boolean;
}

/** The end-of-order banner. The checklist names the culprit — a lost order
 * must say WHICH row failed, never contradict the player's memory. */
export function bannerText(
  order: OrderState,
  checks: readonly RequirementCheck[],
  verdict: Judgment | null,
  topTier: number,
  next?: NextOrderNote,
): string {
  const list = checks
    .map((c) => `${c.met ? "✓" : "✗"} ${describeRequirement(c.req, topTier)}`)
    .join("\n");
  const scoreLine = verdict
    ? `assembly ${verdict.score}/100 — coverage ${Math.round(verdict.coverage * 100)}% · neat ${Math.round(verdict.neatness * 100)}% · mess ${Math.round(verdict.mess * 100)}% · ${
        verdict.waste >= 1 ? "under par" : "over par"
      }`
    : "";
  let text: string;
  if (order.status === "won" && verdict) {
    // Both gates cleared: tiered delight.
    text = `THE PATRON IS DELIGHTED! ${"★".repeat(verdict.stars)}\n${list}\n${scoreLine}`;
  } else if (verdict?.met) {
    // Gate 2 refusal — the insulting kind: every box ticked, badly.
    text = `REFUSED.\n"you did what I asked. it is TERRIBLE."\n${list}\n${scoreLine} (the patron demands ${order.passScore})`;
  } else {
    // Gate 1 failure: the clock died first.
    text = `TIME!\n${list}\nthe patron goes hungry`;
  }
  // The countdown + the carry-home warning (the gates close with the deal;
  // a baker out of his town is placed home — say so BEFORE it happens).
  // A run-ending loss says what actually comes: the report, not a deal.
  const coming = next
    ? next.runEnds
      ? `the run ends in ${next.seconds}s…`
      : next.away
        ? `a new order in ${next.seconds}s — YOU ARE NOT IN YOUR TOWN!\nwhen it lands you'll be carried home. HURRY!`
        : `a new order in ${next.seconds}s — the gates close with it…`
    : "a new order is coming…";
  return `${text}\n\n${coming}`;
}

/** The photograph's caption (the dessert report, snapshot form — plans/09
 * §1's promoted hook, visionary-shaped 2026-07-07): the verdict in the
 * Patron's voice, caption-sized. The banner still carries the checklist;
 * the photo carries the feeling. */
export function snapshotCaption(verdict: Judgment | null): string {
  const head = "the dessert, as the Giant saw it";
  if (!verdict) return head;
  if (!verdict.met) return `${head}\n— and he goes hungry`;
  if (!verdict.accepted)
    return `${head}\n— "it is TERRIBLE." (${verdict.score}/100)`;
  return `${head}\n${"★".repeat(verdict.stars)} delighted — ${verdict.score}/100`;
}

/** The run report's one fact (plans/13): how far the crew climbed.
 * `rung` is the rung the run DIED on; cleared = rung − 1. */
export function runOverLine(rung: number): string {
  const cleared = Math.max(0, rung - 1);
  return cleared === 0
    ? "the Giant left hungry at the first dessert"
    : `the crew cleared ${cleared} rung${cleared === 1 ? "" : "s"}`;
}

/** The run-over banner (plans/13): the report holds the screen, the
 * filthy floor is the trophy, and the lobby circle is the next move. */
export function runOverText(rung: number): string {
  return `THE RUN IS OVER\n${runOverLine(rung)}\n— gather in the gold circle to run again`;
}

export interface HudView {
  order: OrderState;
  checks: readonly RequirementCheck[];
  /** The run container (plans/13) — the top block renders by its phase:
   * the lobby invitation, the countdown, the rung header, the report. */
  run: RunWire;
  /** The deal's summit tier index (view.dessert.topTier — spec refactor,
   * plans/13 §3): zone words in the checklist are per-spec. */
  topTier: number;
  machine: CatapultState;
  crankTicks: number;
  carrying: string | null;
  netStatus: NetStatus;
  /** Other bakers visible (me excluded). */
  ghostCount: number;
  myId: number | null;
  /** Pointer lock engaged? */
  locked: boolean;
  target: InteractableKind | null;
  /** Active flash message, or null once expired. */
  flash: string | null;
  /** The post this baker is manning (plans/14), or null on foot. */
  manned: Post | null;
  /** The post whose zone the baker stands in (mannable with E); only
   * meaningful while on foot. */
  nearPost: Post | null;
}

export function hudLines(v: HudView): string[] {
  // Signed since the unwind (plans/14): -N% is a click being let out.
  const crankPct = Math.round((v.crankTicks / CRANK_TICKS_PER_CLICK) * 100);
  const secsLeft = Math.ceil(v.order.ticksLeft * FIXED_DT);
  const clock = `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, "0")}`;
  const who =
    v.netStatus === "loopback"
      ? "solo bakery"
      : v.netStatus === "open"
        ? `co-op bakery · ${v.ghostCount + 1} baking · you are baker ${v.myId ?? "?"}`
        : v.netStatus === "connecting"
          ? "joining the bakery…"
          : "CONNECTION LOST — refresh to rejoin";
  // The top block by run phase (plans/13): only a live rung shows the
  // order; the lobby invites, the countdown counts, the report reports.
  const top =
    v.run.phase === "lobby"
      ? [
          `THE BAKERY WAITS — rung 1 awaits the crew   [${who}]`,
          `▸ stand in the gold circle to start the run (${v.run.readyIn ?? 0}/${v.run.readyOf ?? 0} in)`,
        ]
      : v.run.phase === "countdown"
        ? [
            `ALL IN — the run begins in ${Math.max(1, Math.ceil((v.run.countdownTicks ?? 0) * FIXED_DT))}…   [${who}]`,
            "▸ hold the circle! stepping out cancels",
          ]
        : v.run.phase === "runover"
          ? [`RUN OVER — ${runOverLine(v.run.rung)}   [${who}]`]
          : [
              `RUNG ${v.run.rung} · THE ORDER · ${clock}   [${who}]`,
              ...v.checks.map(
                (c) =>
                  `  ${c.met ? "✓" : "✗"} ${describeRequirement(c.req, v.topTier)} · ${describeProgress(c)}`,
              ),
            ];
  const lines = [
    ...top,
    v.locked
      ? "WASD move · Shift sprint · E interact · Esc frees the mouse"
      : "Click to grab the mouse · WASD move · Shift sprint · E interact",
    `machine — traverse ${v.machine.traverseDeg.toFixed(0)}° · arc +${v.machine.tiltNotch * TILT_DEG_PER_NOTCH}° (${v.machine.tiltNotch}/${TILT_MAX_NOTCH}) · tension ${v.machine.tensionClicks}/${TENSION_MAX_CLICKS}${crankPct !== 0 ? ` ${crankPct > 0 ? "+" : ""}${crankPct}%` : ""} · bucket: ${v.machine.loaded ?? "empty"} · hands: ${v.carrying ?? "empty"}`,
  ];
  // The crew posts (plans/14). Manned = the post's own panel — the
  // gunner's carries the aiming instrument (the ladder's home, the
  // 2026-07-08 gauge-split call, moved here with the posts). On foot in
  // a zone = the invitation.
  if (v.manned === "gunner") {
    lines.push(
      "▸ GUNNER'S POST — A/D wheel · W/S screw · F fire · E step off",
      `  arc ${arcGlyph(v.machine.tiltNotch)} +${v.machine.tiltNotch * TILT_DEG_PER_NOTCH}° · traverse ${v.machine.traverseDeg.toFixed(1)}°`,
    );
  } else if (v.manned === "winch") {
    lines.push("▸ WINCH POST — hold Space/W to wind · S to unwind · E step off");
  } else if (v.nearPost) {
    lines.push(
      v.nearPost === "gunner"
        ? "▸ E — man the gunner's post"
        : "▸ E — man the winch",
    );
  }
  if (v.target && v.manned === null)
    lines.push(`▸ ${promptFor(v.target, v.machine, v.carrying)}`);
  if (v.flash) lines.push(v.flash);
  return lines;
}
