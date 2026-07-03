/**
 * THE TUNING DASHBOARD — every knob of the order economy in one file
 * (structural feedback session, 2026-07-03). When the economy is re-pinned,
 * this is the diff; the relationships below are the math the numbers play
 * against. game/ law: imports core/ only.
 *
 * ── The effective clock ───────────────────────────────────────────────
 * The order NOMINALLY runs ORDER_SECONDS, but patience IS the clock: the
 * Giant looks every PATRON_LOOK_EVERY ticks and his idle grumble burns
 * PATIENCE_BURN_GRUMBLE_S each look (thunder/urgency burn more/less, whims
 * burn nothing). With grumbles on most looks the EFFECTIVE clock is about
 *   ORDER_SECONDS − (ORDER_SECONDS / 12) · ~3.3s  ≈  0.7–0.8 · nominal
 * (~95s of the nominal 120 today). Budget shot counts against THAT.
 *
 * ── The shot cycle ────────────────────────────────────────────────────
 * A full solo shot ≈ pantry round-trip + load + crank (CRANK_SECONDS_PER_
 * CLICK · clicks, game/catapult.ts) + aim + flight (~3s paint, ~7s solid
 * rest). Measured ~12–18s in practice. Coverage per frost shot is set by
 * the splat radii (core/frosting.ts, FROST_* constants) against the
 * 437-sample census (pinned as WIRE FORMAT in frosting.test.ts).
 *
 * ── The re-pin law (plans/07, standing) ───────────────────────────────
 * Splat-constant or census changes REQUIRE re-running research/04 §3 and
 * re-pinning FROST_FRAC / ORDER_PAR_SHOTS / ORDER_SECONDS together — and
 * the census count pin (437) moves only on purpose.
 */
import { FIXED_DT } from "../core/constants";

/** Nominal order clock, seconds (see effective-clock note above). */
export const ORDER_SECONDS = 120;
/** Shots for full waste credit — the good-shot count of a clean line
 * (research/04 §3). */
export const ORDER_PAR_SHOTS = 8;
/** How long a finished order's banner lingers before the fresh deal. */
export const ORDER_RESET_TICKS = 600; // 10s
/** The Patron looks at the cake every N ticks of ORDER time (12s). */
export const PATRON_LOOK_EVERY = Math.round(12 / FIXED_DT);

/** The standing order's frost row — re-pinned 0.3 → 0.25 against the wall
 * census (plans/07 amendment). The economy redesign intends to move this
 * back UP (visionary notes, handoff §6) with smaller splats + pace knobs. */
export const FROST_FRAC = 0.25;
/** The standing order's sprinkle row (the nag can tighten it +1). */
export const SPRINKLES_NEEDED = 2;

/** Patience burns, seconds of clock per Patron look (patron.ts rules).
 * Positive numbers; the rules subtract them. */
export const PATIENCE_BURN_THUNDER_S = 8; // NEW mess on the floor
export const PATIENCE_BURN_GRUMBLE_S = 4; // the idle fuse
export const PATIENCE_BURN_URGENT_S = 2; // the low-clock reminder
