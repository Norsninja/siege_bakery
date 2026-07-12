/**
 * THE VOLUME BUS (plans/20 §5, born WITH slice 6 — the sequencing rule:
 * built here, never retrofitted). One tiny shared state both audio
 * engines read: MusicBox multiplies BG_VOLUME by `music`, SfxBox routes
 * through a master gain sized by `sfx`, and `muted` silences both. M
 * (and the corner button) toggles THE BUS, not the music — the settings
 * panel later grows knobs on this object and nothing gets rewired.
 *
 * Deliberately a plain mutable object, not a class: the two boxes poll
 * it per frame (the polling-seam culture — no event plumbing for two
 * readers), and a future settings panel writes it directly.
 */

export interface AudioBus {
  /** Music level, 0–1. Scales music.ts's BG_VOLUME, never replaces it. */
  music: number;
  /** SFX level, 0–1. The sfx master gain. */
  sfx: number;
  /** The one mute: covers music AND sfx (M, the corner button). */
  muted: boolean;
}

export const createAudioBus = (): AudioBus => ({
  music: 1,
  sfx: 1,
  muted: false,
});

/** Every dial write funnels here — HTMLMediaElement.volume THROWS
 * outside [0, 1] (the ground-plane lesson, music.ts fadeStep). */
export const clampLevel = (v: number): number => Math.min(1, Math.max(0, v));
