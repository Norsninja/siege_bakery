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
import { rungRow } from "../game/campaign";
import { FLOURISH_BONUS_COINS } from "../game/tuning";
import type { OrderState } from "../game/order";
import type { RunWire } from "../game/protocol";
import { POST_KEYS, type Post, type PostKey } from "./posts";

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
  | "shelf-fudge"
  | "shop";

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

/** What the stall's prompt (and the E press — interactions.ts) reads:
 * the client's local prediction of the Room's shop law (plans/13 §5 as
 * amended 2026-07-09), built from broadcast state every tick. If the
 * Room's rules move, move this WITH them — the drift is what the
 * interaction tests exist to catch. */
export interface ShopState {
  /** Shop hours: a WON order's separator during a live run (never a
   * run-ending linger — inventory dies with the run). */
  open: boolean;
  /** Town 2 already active (machines.length > 1) — nothing to sell. */
  owned: boolean;
  price: number;
  purse: number;
}

/** The arc position as a filled ladder — the fill shows the whole scale
 * at once (the notch-1/3 misread fix, kept through the vernier). 19
 * positions since the 2.5° table (research/13): grouped in FOURS — one
 * group is 10° — so a glance counts groups, not boxes. VISIONARY CALL
 * 2026-07-08: the full ladder lives ONLY where you dial — that meant the
 * screw prompt, then the gunner's instrument line (plans/14), and with
 * the UI pass (plans/15 item 5) it means the GUNNER'S PANEL; the
 * always-on machine line carries the compact numeric form — a 23-char
 * ladder between three stats muddied which stat owned it. */
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
  shop?: ShopState | null,
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
    case "shop": {
      // THE STALL (plans/13 §5 amendment): price on the prompt, never a
      // menu. Every refusal the Room would give is predicted here in
      // words — the walk-up already knows why before pressing E.
      if (!shop) return "THE STALL — closed";
      if (shop.owned)
        return "THE STALL — SOLD OUT (the second fort is yours)";
      const tag = `TOWN 2 · ${shop.price} coins (purse ${shop.purse})`;
      if (!shop.open) return `THE STALL — ${tag} — opens between orders`;
      return shop.purse >= shop.price
        ? `E — buy ${tag}`
        : `THE STALL — ${tag} — not enough coins`;
    }
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
  /** The concluded rung (plans/13 §5 amendment): a won banner names the
   * pay — computed client-side from the SHARED tables (campaign.ts pay
   * column + the tuning bonus), the same arithmetic the Room's award
   * runs, so the words and the wallet agree. 0 = no pay line (pre-run
   * callers and the lobby's dormant order). */
  rung = 0,
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
    // Both gates cleared: tiered delight. THE CODA (plans/13 §1, slice
    // 4b): the flourish landed — the verdict upgrades, never gates.
    const coda = verdict.flourish
      ? `\n✨ AND THE FLOURISH — A ${(order.desire?.topping ?? "flourish").toUpperCase()} ON THE VERY TOP ✨`
      : "";
    // The pay line (§5 amendment): style visibly pays — the flourish
    // bonus is named right where the coda just sparkled.
    let payLine = "";
    if (rung > 0) {
      const pay = rungRow(rung).pay;
      const coins =
        pay.base +
        verdict.stars * pay.perStar +
        (verdict.flourish ? FLOURISH_BONUS_COINS : 0);
      // THE REALM PAYS (plans/17): the giants are guests — relief
    // contracts settle the order, so the pay line says who's paying.
    payLine = `\n🪙 the realm pays +${coins} coins${verdict.flourish ? ` — ${FLOURISH_BONUS_COINS} of them for the style` : ""}`;
    }
    text = `THE PATRON IS DELIGHTED! ${"★".repeat(verdict.stars)}${coda}${payLine}\n${list}\n${scoreLine}`;
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
      ? `the bakery closes in ${next.seconds}s…`
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
  return `${head}\n${"★".repeat(verdict.stars)} delighted — ${verdict.score}/100${verdict.flourish ? " — WITH A FLOURISH ✨" : ""}`;
}

/** The run report's one fact (plans/13): how far the crew climbed.
 * `rung` is the rung the run DIED on (cleared = rung − 1) — or, in
 * TRIUMPH (`won`, §1 flourish amendment), the top rung CONQUERED. */
export function runOverLine(rung: number, won = false): string {
  // THE SEMANTIC AUDIT (plans/15 item 12, landed 2026-07-10): the screen
  // counts PATRONS FED, never rungs — the queue fiction (plans/16 line,
  // plans/18 forge) is the standing read; `rung` stays code vocabulary.
  if (won) return `all ${rung} patrons fed — the realm eats well tonight`;
  const cleared = Math.max(0, rung - 1);
  return cleared === 0
    ? "the Giant left hungry at the first dessert"
    : `the crew fed ${cleared} patron${cleared === 1 ? "" : "s"}`;
}

/** The run-over banner (plans/13): the report holds the screen, the
 * filthy floor is the trophy, and the lobby circle is the next move.
 * TRIUMPH (§1 flourish amendment): the MASTER BAKER banner — the
 * skeleton of the moment; trophy/fanfare/credits are a content pass. */
export function runOverText(
  rung: number,
  won = false,
  ultra = false,
  purse = 0,
): string {
  // The run report tells the purse's end too (§5 amendment: the purse
  // dies at the NEXT run's start, so the report and the lobby still
  // hold the finished story's balance).
  const coins = purse > 0 ? `\n🪙 the purse ends at ${purse} coins` : "";
  if (won)
    // ULTRA (§1 finish-it amendment): the triumph's verdict wore the coda —
    // the title upgrades; the ceremony rides the MASTER BAKER content pass.
    return `${ultra ? "👑 ULTRA MASTER BAKER OF THE REALMS 👑" : "👑 MASTER BAKER 👑"}\n${runOverLine(rung, true)}${coins}\n— gather in the gold circle to bake again`;
  return `CLOSING TIME\n${runOverLine(rung)}${coins}\n— gather in the gold circle to bake again`;
}

/** THE FIRING MEMORY (plans/15 item 5, constraint a): the settings the
 * local machine LAST FIRED with — recorded client-side off the shot
 * broadcast (it carries town + the full solution; no wire change), keyed
 * by town in main. The crew callout anchor: "same as last, one more." */
export interface LastShot {
  tensionClicks: number;
  traverseDeg: number;
  tiltNotch: number;
}

/** A keycap row on a post panel: the caps to press, then what they do.
 * Caps are LABELS from POST_KEYS — the one table (posts.ts): the panel
 * renders what postOp reads, drift-proof by construction. */
export interface KeyHint {
  caps: string[];
  label: string;
}
const caps = (...lists: readonly (readonly PostKey[])[]): string[] =>
  lists.flatMap((l) => l.map((k) => k.label));

/** The winch panel (plans/15 item 5, ruled 2026-07-09): DEAD CENTER and
 * BIG — the tensioner's only job is the number, no time reading UI. */
export interface WinchPanel {
  post: "winch";
  title: string;
  clicks: number;
  max: number;
  /** The partial click winding right now, signed like crankPct. */
  fillPct: number;
  /** Constraint (a): what this machine last flew at. */
  lastFired: number | null;
  keys: KeyHint[];
}

/** The gunner panel (same ruling): BOTTOM-LEFT — the aim line, the arc,
 * and the cake own the center; the cluster lives in free real estate. */
export interface GunnerPanel {
  post: "gunner";
  title: string;
  traverseDeg: number;
  tiltNotch: number;
  maxNotch: number;
  tiltDeg: number;
  ladder: string;
  /** The bucket, unmissable (ruled): what F will throw — or nothing. */
  loaded: string | null;
  last: LastShot | null;
  keys: KeyHint[];
}
export type PostPanel = WinchPanel | GunnerPanel;

/** The manned post's panel data — pure, like every word in this file;
 * post-hud.ts paints it. Null on foot (the panel leaves with the post). */
export function postPanel(v: HudView): PostPanel | null {
  if (v.manned === "winch") {
    return {
      post: "winch",
      title: "WINCH POST",
      clicks: v.machine.tensionClicks,
      max: TENSION_MAX_CLICKS,
      fillPct: Math.round((v.crankTicks / CRANK_TICKS_PER_CLICK) * 100),
      lastFired: v.lastShot?.tensionClicks ?? null,
      keys: [
        { caps: caps(POST_KEYS.winch.wind), label: "wind" },
        { caps: caps(POST_KEYS.winch.unwind), label: "let out" },
        { caps: ["E"], label: "step off" },
      ],
    };
  }
  if (v.manned === "gunner") {
    return {
      post: "gunner",
      title: "GUNNER'S POST",
      traverseDeg: v.machine.traverseDeg,
      tiltNotch: v.machine.tiltNotch,
      maxNotch: TILT_MAX_NOTCH,
      tiltDeg: v.machine.tiltNotch * TILT_DEG_PER_NOTCH,
      ladder: arcGlyph(v.machine.tiltNotch),
      loaded: v.machine.loaded,
      last: v.lastShot,
      keys: [
        {
          caps: caps(POST_KEYS.gunner.wheelLeft, POST_KEYS.gunner.wheelRight),
          label: "wheel",
        },
        {
          caps: caps(POST_KEYS.gunner.screwUp, POST_KEYS.gunner.screwDown),
          label: "arc",
        },
        { caps: caps(POST_KEYS.gunner.fire), label: "FIRE" },
        { caps: ["E"], label: "step off" },
      ],
    };
  }
  return null;
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
  /** The stall's standing state (plans/13 §5 amendment) — feeds the
   * shop prompt; null before the view has a run (boot). */
  shop: ShopState | null;
  /** Active flash message, or null once expired. */
  flash: string | null;
  /** The post this baker is manning (plans/14), or null on foot. */
  manned: Post | null;
  /** The post whose zone the baker stands in (mannable with E); only
   * meaningful while on foot. */
  nearPost: Post | null;
  /** The local machine's firing memory (item 5 constraint a) — what it
   * last flew at; null before its first shot. */
  lastShot: LastShot | null;
}

const COVERAGE_BAR_W = 30;
/** THE BAR IS LOGARITHMIC (visionary, §0.5, twenty-fifth session): a linear
 * bar makes the floor a discouraging sliver. Curving the FILL makes early
 * frosting feel substantial (8% ≈ a third of the bar) and each further gain
 * fill less — so the climb toward a perfect cake visibly gets harder and
 * harder, the north star's asymptote made kinetic. The % NUMBER stays honest
 * and linear; only the bar's FEEL is curved. K sets the steepness (bigger =
 * more early boost). barFill(0)=0, barFill(1)=1. */
const COVERAGE_BAR_K = 30;
const barFill = (cov: number): number =>
  Math.log(1 + COVERAGE_BAR_K * cov) / Math.log(1 + COVERAGE_BAR_K);

/** THE COVERAGE LADDER (plans/22 §0.5 north star + §9 step 7): the frost row
 * is NOT a checkbox at the floor — it is the CLIMB toward a perfect cake.
 * The player always sees where he is, which star is next, and how far the
 * WHOLE cake still is: the empty stretch of bar is the giant's longing, the
 * futility made visible (the north star on screen). The floor is base camp,
 * the stars are milestones, and PERFECT (100%) is the goal nobody reaches.
 * Absolute coverage (step 4); the star tiers ride the order. */
function coverageLadder(
  current: number,
  floor: number,
  star2: number,
  star3: number,
): string[] {
  const p = (f: number): number => Math.round(f * 100);
  const pct = Math.floor(current * 100); // floor — never claim done early
  const stars =
    current >= star3 ? 3 : current >= star2 ? 2 : current >= floor ? 1 : 0;
  const starGlyph = "★★★".slice(0, stars) + "☆☆☆".slice(0, 3 - stars);
  const filled = Math.min(COVERAGE_BAR_W, Math.round(barFill(current) * COVERAGE_BAR_W));
  const bar = "█".repeat(filled) + "░".repeat(COVERAGE_BAR_W - filled);
  const nudge =
    stars === 0
      ? `frost ${p(floor)}% to serve the giant at all`
      : stars === 1
        ? `passing — keep frosting for ★★ at ${p(star2)}%`
        : stars === 2
          ? `so close — ★★★ at ${p(star3)}%`
          : `magnificent — now chase the perfect cake, the coins climb with it`;
  return [
    `  FROST THE CAKE ▸ ${pct}%  ${starGlyph}  ·  ${nudge}`,
    `  ▐${bar}▌  pass ${p(floor)}%  ★★ ${p(star2)}%  ★★★ ${p(star3)}%  ✦ PERFECT 100%`,
  ];
}

export function hudLines(v: HudView): string[] {
  // Signed since the unwind (plans/14): -N% is a click being let out.
  const crankPct = Math.round((v.crankTicks / CRANK_TICKS_PER_CLICK) * 100);
  const secsLeft = Math.ceil(v.order.ticksLeft * FIXED_DT);
  const clock = `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, "0")}`;
  // THE LONE HERO tag (plans/13 §5): the ticket wears its pricing — the
  // stamp is deal-time truth (order.hands), never the live headcount, so
  // a mid-order leaver can't flicker it onto a duo-priced order.
  const lone = v.order.hands === 1 ? " · 🖐 one pair of hands" : "";
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
          `THE BAKERY WAITS — the first patron is on his way   [${who}]`,
          `▸ stand in the gold circle to open the bakery (${v.run.readyIn ?? 0}/${v.run.readyOf ?? 0} in)`,
        ]
      : v.run.phase === "countdown"
        ? [
            `ALL IN — the bakery opens in ${Math.max(1, Math.ceil((v.run.countdownTicks ?? 0) * FIXED_DT))}…   [${who}]`,
            "▸ hold the circle! stepping out cancels",
          ]
        : v.run.phase === "runover"
          ? [
              v.run.won
                ? `👑 ${v.run.ultra ? "ULTRA MASTER BAKER OF THE REALMS" : "MASTER BAKER"} — ${runOverLine(v.run.rung, true)}   [${who}]`
                : `CLOSING TIME — ${runOverLine(v.run.rung)}   [${who}]`,
            ]
          : v.order.status !== "running"
            ? [
                // THE CORNER YIELDS THE LINGER (plans/15 item 21): the
                // ended order's checklist collapses — the center banner
                // already names the culprit, and the photo now hangs in
                // this corner (a timeshare, verified: the corner copy
                // was redundant exactly here). One slim line keeps the
                // patron and the purse — the stall prices from it during
                // the very window it stands open.
                `${
                  v.order.status === "won"
                    ? `PATRON ${v.run.rung} SERVED`
                    : `PATRON ${v.run.rung} GOES HUNGRY`
                } · 🪙 purse: ${v.run.purse ?? 0}   [${who}]`,
              ]
            : [
              // THE SEMANTIC AUDIT (item 12): the rung number IS the
              // patron's place in the line (plans/16 queue, plans/18) —
              // the header names the guest, never the ladder. (The order
              // runs to the buzzer now — plans/22 step 3; the finish-it
              // window it used to swap in was deleted in step 5.)
              `PATRON ${v.run.rung} · THE ORDER · ${clock}${lone}   [${who}]`,
              // The frost row is the COVERAGE LADDER now (plans/22 §0.5 north
              // star): a climb toward the perfect cake, not a checkbox at the
              // floor. Every other row stays a plain checklist line.
              ...v.checks.flatMap((c) =>
                c.req.kind === "frost-coverage"
                  ? coverageLadder(
                      c.current,
                      c.req.floorCoverage,
                      v.order.star2Coverage,
                      v.order.star3Coverage,
                    )
                  : [
                      `  ${c.met ? "✓" : "✗"} ${describeRequirement(c.req, v.topTier)} · ${describeProgress(c)}`,
                    ],
              ),
              // THE GOLDEN ROW: the revealed desire — style, never a
              // requirement (it renders only once the patron names it).
              ...(v.order.desire?.revealed
                ? [
                    `  ★ THE FLOURISH: a ${v.order.desire.topping} on the very top${v.order.desire.met ? " ✓" : " — style, not required"}`,
                  ]
                : []),
              // The shared purse (§5 amendment): one wallet, always in
              // sight during the run — the stall's prompt prices from it.
              `  🪙 purse: ${v.run.purse ?? 0} coins`,
            ];
  const lines = [
    ...top,
    v.locked
      ? "WASD move · Shift sprint · E interact · M music · Esc frees the mouse"
      : "Click to grab the mouse · WASD move · Shift sprint · E interact · M music",
    `machine — traverse ${v.machine.traverseDeg.toFixed(0)}° · arc +${v.machine.tiltNotch * TILT_DEG_PER_NOTCH}° (${v.machine.tiltNotch}/${TILT_MAX_NOTCH}) · tension ${v.machine.tensionClicks}/${TENSION_MAX_CLICKS}${crankPct !== 0 ? ` ${crankPct > 0 ? "+" : ""}${crankPct}%` : ""} · bucket: ${v.machine.loaded ?? "empty"} · hands: ${v.carrying ?? "empty"}`,
  ];
  // The crew posts (plans/14).
  // A MANNED post's instruments left the corner for their own big panel
  // (postPanel above — the UI pass, plans/15 item 5, 2026-07-09: eyes
  // are on the machine, so the numbers go where the eyes are). On foot
  // in a zone = the invitation, still corner-carried.
  if (v.manned === null && v.nearPost) {
    lines.push(
      v.nearPost === "gunner"
        ? "▸ E — man the gunner's post"
        : "▸ E — man the winch",
    );
  }
  if (v.target && v.manned === null)
    lines.push(`▸ ${promptFor(v.target, v.machine, v.carrying, v.shop)}`);
  if (v.flash) lines.push(v.flash);
  return lines;
}
