/**
 * THE SOUND TABLE (plans/16 slice 6, ruled 2026-07-12) — event-keyed
 * SFX mirroring the jukebox's drop-in culture (music.ts): key → sound
 * list, absent row = silence with the name already on the door, a new
 * sound is a file copied into public/audio/sfx/ plus a row. Keys model
 * GAME LANGUAGE, never asset inventory (the visionary's rule, applied
 * to itself: chompDevour not chompLoud, verdictRefused not raspberry —
 * swap the file and the key still tells the truth).
 *
 * ENGINE (ruled): one AudioContext, decoded AudioBuffers, per-play
 * AudioBufferSourceNode → GainNode → master. Music stays OUT of the
 * graph (HTMLAudioElement suits two long crossfading tracks; SFX are
 * many, short, overlapping — the winch ratchet fires several times a
 * second). Volume rides THE BUS (audio-bus.ts): master gain = bus.sfx,
 * bus.muted covers both engines.
 *
 * SPATIAL (ruled): a distance scalar, no PannerNode — readable party
 * feedback beats headphone-grade spatialization. World-anchored sounds
 * (splat/pop/chomp/grumble) pass `at`; mechanical sounds at your own
 * machine (ratchet/thunk/whoosh) play flat.
 *
 * SOURCING (hybrid ruling): mechanical rows are REPRODUCIBLE synth —
 * scripts/make-sfx.mjs writes them; regenerate, never hand-edit the
 * wavs. Character rows (verdict stings, grumble) are visionary-sourced
 * like the music — silence until the files land.
 *
 * Same laws as the jukebox: client-only, unsynced, Math.random legal,
 * no test may depend on what's audible; autoplay unlock on the first
 * gesture (context.resume()); a suspended context DROPS the play — a
 * splat arriving late is a lie, not a sound.
 */
import { nextTrack } from "./music";
import { clampLevel, type AudioBus } from "./audio-bus";

/** Every event the game announces with sound — the union is the
 * vocabulary; rows may lag it (silence is a valid record). */
export type SfxKey =
  | "pop" // burst carrier pops (item 13's word site)
  | "splat" // hot landing — the money sound, audition variants freely
  | "plop" // gentle landing
  | "leverThunk" // the release lever fires
  | "winchRatchet" // one tension click — the metronome
  | "lobWhoosh" // your crew's lob leaves the bucket
  | "chompDevour" // eat beat, DELIGHTED (eat-beat.ts CHOMP edge)
  | "chompBegrudge" // eat beat, REFUSED
  | "verdictDelighted" // sting: fanfare (visionary-sourced)
  | "verdictRefused" // sting: the huff (visionary-sourced)
  | "verdictHungry" // sting: sad horn (visionary-sourced)
  | "grumbleRumble"; // under the patron's flash lines (visionary-sourced)

/** Key → variant list. Multiple files in a row = the audition law:
 * the pick rotates via nextTrack (never the same twice, n > 1), so
 * dropping three splats in IS the A/B test. Missing file = that
 * variant silently absent (load() skips it). */
export const SFX_TABLE: Partial<Record<SfxKey, readonly string[]>> = {
  pop: ["/audio/sfx/pop.wav"],
  splat: ["/audio/sfx/splat.wav"],
  plop: ["/audio/sfx/plop.wav"],
  leverThunk: ["/audio/sfx/lever-thunk.wav"],
  winchRatchet: ["/audio/sfx/winch-ratchet.wav"],
  lobWhoosh: ["/audio/sfx/lob-whoosh.wav"],
  chompDevour: ["/audio/sfx/chomp-devour.wav"],
  chompBegrudge: ["/audio/sfx/chomp-begrudge.wav"],
  // verdictDelighted: [], — the fanfare (visionary-sourced, like music)
  // verdictRefused: [],   — the huff
  // verdictHungry: [],    — the sad horn
  // grumbleRumble: [],    — under the flash lines (ruling 2: yes, VO never)
};

export interface SfxPlayOptions {
  /** World anchor: the play's gain scales by distance to the listener
   * (distanceGain). Omit for local/mechanical sounds. */
  at?: { x: number; y: number; z: number };
  /** Per-play scalar on top of the bus (0–1], default 1. */
  volume?: number;
}

/** The sound half of the client FX port — narrow on purpose so world
 * views (shots-view, eat-beat) depend on a function, not the box. */
export type SfxFn = (key: SfxKey, opts?: SfxPlayOptions) => void;

/** The client FX port (ruled: a port, not a global singleton): what a
 * world view may announce — a corner flash line, a sound. main builds
 * ONE of these and threads it; tests pass noop fns. */
export interface ClientFx {
  flash(msg: string, ms?: number): void;
  sound: SfxFn;
}

/** The spatial dials (ruled: scalar falloff, no PannerNode). The
 * radius is generous — a 36 m giant's chomp should reach the pantry;
 * the floor keeps far teammate splats present, never gone. */
export const SPATIAL_RADIUS_M = 120;
export const SPATIAL_MIN_GAIN = 0.12;

/** The falloff law, pure and pinned: linear to the radius, floored,
 * never above 1. Garbage distances (NaN/negative) resolve loud, not
 * silent — a bad anchor should be HEARD and fixed, not swallowed. */
export function distanceGain(
  dist: number,
  radius: number = SPATIAL_RADIUS_M,
  min: number = SPATIAL_MIN_GAIN,
): number {
  if (!Number.isFinite(dist) || dist <= 0) return 1;
  return Math.min(1, Math.max(min, 1 - dist / radius));
}

/** One recent play, for the smoke driver (__game) and nothing else —
 * vitest runs in Node, the browser shell below is deliberately thin. */
export interface SfxPlayRecord {
  key: SfxKey;
  gain: number;
}

const RECENT_CAP = 32;

/** The browser-audio shell — thin and untested like MusicBox (the pure
 * laws above carry the pins). main constructs one, calls load() at
 * boot, setListener + step() per frame, and threads sound() through
 * the ClientFx port. */
export class SfxBox {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly buffers = new Map<SfxKey, AudioBuffer[]>();
  private readonly lastPick = new Map<SfxKey, number>();
  private readonly listener = { x: 0, y: 0, z: 0 };
  /** The smoke seam: what played and how loud (capped ring). */
  private readonly played: SfxPlayRecord[] = [];

  constructor(private readonly bus: AudioBus) {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = clampLevel(bus.sfx);
    this.master.connect(this.ctx.destination);
    // The autoplay unlock (music.ts culture): the context is born
    // suspended; any first gesture wakes it.
    const unlock = (): void => {
      if (this.ctx.state === "suspended") void this.ctx.resume();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }

  /** Fetch + decode every table row, fire-and-forget: a missing file
   * leaves its variant absent (silence law), never throws to the loop. */
  load(): void {
    for (const [key, paths] of Object.entries(SFX_TABLE) as [
      SfxKey,
      readonly string[],
    ][]) {
      for (const path of paths) {
        void fetch(path)
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
          .then((ab) => this.ctx.decodeAudioData(ab))
          .then((buf) => {
            const row = this.buffers.get(key) ?? [];
            row.push(buf);
            this.buffers.set(key, row);
          })
          .catch(() => {}); // absent variant — the row plays what loaded
      }
    }
  }

  /** The listener anchor for distance falloff — main feeds the camera
   * position per frame. */
  setListener(x: number, y: number, z: number): void {
    this.listener.x = x;
    this.listener.y = y;
    this.listener.z = z;
  }

  /** Poll the bus — call once per rendered frame (polling-seam
   * culture; mute must cut a sound already ringing). */
  step(): void {
    const g = this.bus.muted ? 0 : clampLevel(this.bus.sfx);
    if (this.master.gain.value !== g) this.master.gain.value = g;
  }

  /** Play one event. Silent when: no row loaded (yet), context still
   * suspended (a late splat is a lie — drop, never queue), or the
   * computed gain rounds to nothing. */
  sound(key: SfxKey, opts?: SfxPlayOptions): void {
    const row = this.buffers.get(key);
    if (!row || row.length === 0) return;
    if (this.ctx.state !== "running") {
      void this.ctx.resume();
      return;
    }
    const pick = nextTrack(row.length, this.lastPick.get(key) ?? null, Math.random);
    this.lastPick.set(key, pick);
    const spatial = opts?.at
      ? distanceGain(
          Math.hypot(
            opts.at.x - this.listener.x,
            opts.at.y - this.listener.y,
            opts.at.z - this.listener.z,
          ),
        )
      : 1;
    const gain = clampLevel((opts?.volume ?? 1) * spatial);
    if (gain <= 0) return;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    g.connect(this.master);
    const src = this.ctx.createBufferSource();
    src.buffer = row[pick]!;
    src.connect(g);
    src.addEventListener("ended", () => {
      src.disconnect();
      g.disconnect();
    });
    src.start();
    this.played.push({ key, gain });
    if (this.played.length > RECENT_CAP) this.played.shift();
  }

  /** The smoke driver's read (__game.getSfx): recent plays + state. */
  debug(): { state: string; loaded: string[]; played: SfxPlayRecord[] } {
    return {
      state: this.ctx.state,
      loaded: [...this.buffers.keys()],
      played: [...this.played],
    };
  }
}
