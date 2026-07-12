/**
 * THE JUKEBOX (the UI/aesthetic pass, 2026-07-09) — background music,
 * client-only ambience. Every rule the sim lives by stops at this door:
 * Math.random is legal here (the pick never touches core/game), each
 * client picks independently (syncing music would cost wire for nothing),
 * and no test may ever depend on what's playing.
 *
 * THE TABLE IS THE FEATURE: moods key playlists, and the visionary's
 * future songs are DROP-INS — copy the file to public/audio, add a row,
 * done. Today only the order has songs; the other moods are silence
 * with their names already on the door (lobby, the 18s linger
 * interlude, the run-over fatality — all announced 2026-07-09).
 *
 * Playback laws (ruled 2026-07-09): music during the ORDER; a track
 * ending mid-order hands off to another (never itself, n>1); the order's
 * end FADES out (~1.5s — a hard cut would fight the celebration); the
 * next deal fades a fresh random pick in. Silence between moods is a
 * beat, not a bug: the deal KICKS the music in.
 *
 * Browser law: audio only starts after a user gesture — play() rejects
 * until the pointer-lock click; MusicBox retries on the first gesture.
 * M toggles mute (global key — noted beside POST_KEYS so the key
 * namespace stays audited). Since slice 6 the mute and the level live
 * on THE BUS (audio-bus.ts, plans/20 §5) — this box polls it per frame
 * and owns no volume state of its own beyond the fade.
 */

import type { OrderState } from "../game/order";
import type { RunPhase } from "../game/run-flow";
import { clampLevel, type AudioBus } from "./audio-bus";

export type Mood = "order" | "lobby" | "linger" | "runover";

/** Mood → playlist. Paths are public/ URLs (Vite copies them into dist/,
 * the room server serves dist/ — the friend test streams these through
 * the same tunnel). An absent/empty row = that mood is silence. */
export const PLAYLISTS: Partial<Record<Mood, readonly string[]>> = {
  order: ["/audio/kitchen-chaos.mp3", "/audio/kitchen-mayhem.mp3"],
  lobby: ["/audio/hearth-harvest.mp3", "/audio/hearthside-yeast.mp3"],
  // linger: [],  — the 18s interlude (songs coming, visionary 2026-07-09)
  // runover: [], — the fatality (same)
};

/** Background means background: THE CEILING the bus dial scales
 * (effective = BG_VOLUME × bus.music). RULED 2026-07-12 (nineteenth
 * session, the weight session's ear pass): the music was TOO LOUD at
 * a flat 0.35 — it must never exceed ~40%, resting around 20%. The
 * ceiling is 0.4; the bus default (audio-bus.ts) rests the dial at
 * half; a future settings knob sweeps 0–40% by construction. */
export const BG_VOLUME = 0.4;
export const FADE_OUT_MS = 1500;
export const FADE_IN_MS = 800;

/** The pick law, pure and pinned: random over the playlist, but never
 * the track that just played (n = 2 alternates — the visionary's spec;
 * n = 1 may repeat, it's all there is). `rand` in [0, 1). */
export function nextTrack(
  count: number,
  last: number | null,
  rand: () => number,
): number {
  if (count <= 1) return 0;
  if (last === null) return Math.floor(rand() * count) % count;
  const step = 1 + Math.floor(rand() * (count - 1));
  return (last + step) % count;
}

/** One fade tick, pure and PINNED (the ground-plane boot bug,
 * 2026-07-09): volume moves toward target and NEVER leaves [0, 1] —
 * HTMLMediaElement.volume THROWS outside that range instead of
 * clamping, and an uncaught throw inside frame() kills the rAF chain:
 * the baker spawns, the camera never follows, and the player stares at
 * the boot camera inside the ground plane. The trigger: the FIRST rAF
 * timestamp can precede the performance.now() captured when the loop
 * was armed, so dt arrives NEGATIVE — a negative dt moves nothing. */
export function fadeStep(v: number, target: number, dtMs: number): number {
  const dt = Math.max(0, dtMs);
  const next =
    v < target
      ? Math.min(target, v + (dt / FADE_IN_MS) * BG_VOLUME)
      : Math.max(target, v - (dt / FADE_OUT_MS) * BG_VOLUME);
  return Math.min(1, Math.max(0, next));
}

/** Which mood the match is in — pure off the broadcast state the HUD
 * already renders by (the real unions, not strings — a typo'd caller is
 * a compile error). The finish-it window keeps the ORDER's music
 * (status stays "running" — peak excitement is not an interlude);
 * won/lost during the linger is the interlude; countdown shares the
 * lobby's record. */
export function deriveMood(
  runPhase: RunPhase,
  orderStatus: OrderState["status"],
): Mood {
  if (runPhase === "running")
    return orderStatus === "running" ? "order" : "linger";
  if (runPhase === "runover") return "runover";
  return "lobby";
}

/** The browser-audio shell — deliberately thin and untested (vitest runs
 * in Node; the pure laws above carry the pins). main calls setMood every
 * frame (no-op on same mood) and step(dt) to run the fades. */
export class MusicBox {
  private readonly el: HTMLAudioElement;
  private mood: Mood | null = null;
  private track: number | null = null;
  /** Audible while a mood plays; false fades out (silence rows, mood
   * swaps). The actual target level is derived per step from the bus. */
  private audible = false;
  private pendingMood: Mood | null = null;
  private blocked = false; // autoplay refused — waiting for a gesture

  constructor(private readonly bus: AudioBus) {
    this.el = new Audio();
    this.el.preload = "auto";
    this.el.volume = 0;
    // A track ending mid-mood hands off to the next pick, seamlessly
    // (no fade — the handoff is part of the same mood).
    this.el.addEventListener("ended", () => {
      if (this.mood !== null) this.begin(this.mood, false);
    });
    // The autoplay unlock: any first gesture retries a blocked play.
    const unlock = (): void => {
      if (this.blocked && this.el.src) {
        this.blocked = false;
        void this.el.play().catch(() => (this.blocked = true));
      }
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }

  /** The bus's music dial applied to the house level — every target
   * derives from here, so a settings knob turned mid-song just works. */
  private level(): number {
    return BG_VOLUME * clampLevel(this.bus.music);
  }

  /** The match's mood, every frame — same mood is a no-op; a new mood
   * fades the old out, then starts the new playlist (or rests silent). */
  setMood(mood: Mood): void {
    if (mood === this.mood) return;
    this.mood = mood;
    if (this.el.paused || this.el.volume === 0) {
      this.begin(mood, true);
    } else {
      // Fade the old song out; step() starts the new mood at zero.
      this.pendingMood = mood;
      this.audible = false;
    }
  }

  /** Run the fades — call once per rendered frame. All volume math goes
   * through fadeStep (pure, pinned): the raw setter throws out of range.
   * The bus is polled here too: mute and the music dial apply live. */
  step(dtMs: number): void {
    if (this.el.muted !== this.bus.muted) this.el.muted = this.bus.muted;
    const v = this.el.volume;
    const next = fadeStep(v, this.audible ? this.level() : 0, dtMs);
    if (next !== v) this.el.volume = next;
    if (next === 0 && this.pendingMood !== null) {
      const mood = this.pendingMood;
      this.pendingMood = null;
      this.begin(mood, true);
    }
  }

  /** Start (or hand off within) a mood. `fresh` fades in from silence;
   * an ended-handoff keeps full volume — same mood, next song. */
  private begin(mood: Mood, fresh: boolean): void {
    const list = PLAYLISTS[mood];
    if (!list || list.length === 0) {
      // Silence is a valid record. Stop cleanly.
      this.el.pause();
      this.el.removeAttribute("src");
      this.track = null;
      this.audible = false;
      return;
    }
    this.track = nextTrack(list.length, this.track, Math.random);
    this.el.src = list[this.track]!;
    this.el.volume = fresh ? 0 : this.level();
    this.audible = true;
    void this.el.play().catch(() => (this.blocked = true));
  }
}
