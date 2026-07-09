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
 * namespace stays audited).
 */

export type Mood = "order" | "lobby" | "linger" | "runover";

/** Mood → playlist. Paths are public/ URLs (Vite copies them into dist/,
 * the room server serves dist/ — the friend test streams these through
 * the same tunnel). An absent/empty row = that mood is silence. */
export const PLAYLISTS: Partial<Record<Mood, readonly string[]>> = {
  order: ["/audio/kitchen-chaos.mp3", "/audio/kitchen-mayhem.mp3"],
  // lobby: [],   — songs coming (visionary, 2026-07-09)
  // linger: [],  — the 18s interlude
  // runover: [], — the fatality
};

/** Background means background: one dial, sized to sit under the SFX
 * pass when it arrives. */
export const BG_VOLUME = 0.35;
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

/** Which mood the match is in — pure off the broadcast state the HUD
 * already renders by. The finish-it window keeps the ORDER's music
 * (status stays "running" — peak excitement is not an interlude);
 * won/lost during the linger is the interlude; countdown shares the
 * lobby's record. */
export function deriveMood(
  runPhase: string,
  orderStatus: string,
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
  private muted = false;
  /** Volume target: BG_VOLUME while a mood plays, 0 while fading out. */
  private target = 0;
  private pendingMood: Mood | null = null;
  private blocked = false; // autoplay refused — waiting for a gesture

  constructor() {
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

  /** M toggles it; returns the new state for the flash. */
  toggleMute(): boolean {
    this.muted = !this.muted;
    this.el.muted = this.muted;
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
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
      this.target = 0;
    }
  }

  /** Run the fades — call once per rendered frame. */
  step(dtMs: number): void {
    const v = this.el.volume;
    if (v < this.target) {
      this.el.volume = Math.min(
        this.target,
        v + (dtMs / FADE_IN_MS) * BG_VOLUME,
      );
    } else if (v > this.target) {
      this.el.volume = Math.max(
        this.target,
        v - (dtMs / FADE_OUT_MS) * BG_VOLUME,
      );
      if (this.el.volume === 0 && this.pendingMood !== null) {
        const next = this.pendingMood;
        this.pendingMood = null;
        this.begin(next, true);
      }
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
      this.target = 0;
      return;
    }
    this.track = nextTrack(list.length, this.track, Math.random);
    this.el.src = list[this.track]!;
    this.el.volume = fresh ? 0 : BG_VOLUME;
    this.target = BG_VOLUME;
    void this.el.play().catch(() => (this.blocked = true));
  }
}
