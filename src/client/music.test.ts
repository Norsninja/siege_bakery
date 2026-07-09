/**
 * The jukebox's pure laws (the UI pass, 2026-07-09). The browser-audio
 * shell (MusicBox) is deliberately unpinned — Node has no <audio>; these
 * two functions carry everything decidable: the pick law and the mood map.
 */
import { describe, expect, it } from "vitest";
import {
  BG_VOLUME,
  deriveMood,
  FADE_IN_MS,
  FADE_OUT_MS,
  fadeStep,
  nextTrack,
  PLAYLISTS,
} from "./music";

describe("nextTrack — random, but never the song that just played", () => {
  it("two songs ALTERNATE (the visionary's spec): whatever rand says, the other plays", () => {
    for (const r of [0, 0.3, 0.7, 0.999]) {
      expect(nextTrack(2, 0, () => r)).toBe(1);
      expect(nextTrack(2, 1, () => r)).toBe(0);
    }
  });

  it("the first pick is honestly random across the list", () => {
    expect(nextTrack(2, null, () => 0)).toBe(0);
    expect(nextTrack(2, null, () => 0.99)).toBe(1);
  });

  it("n > 2: any track but the last; n = 1 repeats (it's all there is)", () => {
    for (const r of [0, 0.25, 0.5, 0.99])
      expect(nextTrack(4, 2, () => r)).not.toBe(2);
    expect(nextTrack(1, 0, () => 0.5)).toBe(0);
  });
});

describe("deriveMood — the match state the HUD already renders by", () => {
  it("a live order plays the order's record; the finish-it window IS the order", () => {
    expect(deriveMood("running", "running")).toBe("order");
  });
  it("won/lost during the linger is the 18s interlude", () => {
    expect(deriveMood("running", "won")).toBe("linger");
    expect(deriveMood("running", "lost")).toBe("linger");
  });
  it("runover is the fatality; lobby and countdown share the lobby's record", () => {
    expect(deriveMood("runover", "lost")).toBe("runover");
    expect(deriveMood("lobby", "running")).toBe("lobby");
    expect(deriveMood("countdown", "running")).toBe("lobby");
  });
});

describe("fadeStep — the volume law (THE GROUND-PLANE BOOT BUG, 2026-07-09)", () => {
  it("REGRESSION: a NEGATIVE dt moves nothing — the first rAF timestamp can precede the armed clock, and volume < 0 THROWS in the browser, killing the frame loop at boot", () => {
    expect(fadeStep(0, BG_VOLUME, -5)).toBe(0);
    expect(fadeStep(0.2, 0, -16)).toBe(0.2);
  });

  it("never leaves [0, 1], however huge the step", () => {
    expect(fadeStep(0, BG_VOLUME, 1e9)).toBe(BG_VOLUME);
    expect(fadeStep(BG_VOLUME, 0, 1e9)).toBe(0);
    expect(fadeStep(0.9, 1, 1e9)).toBe(1);
  });

  it("ramps: a full fade window closes the gap; half a window closes half", () => {
    expect(fadeStep(0, BG_VOLUME, FADE_IN_MS)).toBe(BG_VOLUME);
    expect(fadeStep(BG_VOLUME, 0, FADE_OUT_MS)).toBe(0);
    expect(fadeStep(0, BG_VOLUME, FADE_IN_MS / 2)).toBeCloseTo(
      BG_VOLUME / 2,
      10,
    );
  });
});

describe("PLAYLISTS — the drop-in table", () => {
  it("order and lobby have their two songs each; every path is a public URL", () => {
    expect(PLAYLISTS.order).toHaveLength(2);
    expect(PLAYLISTS.lobby).toHaveLength(2);
    for (const list of Object.values(PLAYLISTS))
      for (const p of list) expect(p).toMatch(/^\/audio\/.+\.mp3$/);
  });
});
