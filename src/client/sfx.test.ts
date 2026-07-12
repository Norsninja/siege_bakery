/**
 * THE SOUND TABLE's pure laws (slice 6). The browser shell (SfxBox) is
 * deliberately unpinned — Node has no AudioContext; these pin the parts
 * every play flows through: the falloff law, the table's shape, and the
 * bus the settings panel will one day put knobs on. The jukebox law
 * extends here: no test may ever depend on what's audible.
 */
import { describe, it, expect } from "vitest";
import {
  distanceGain,
  SFX_TABLE,
  SPATIAL_MIN_GAIN,
  SPATIAL_RADIUS_M,
} from "./sfx";
import { clampLevel, createAudioBus } from "./audio-bus";
import { BG_VOLUME } from "./music";

describe("distanceGain — the ruled scalar falloff (no PannerNode)", () => {
  it("point blank is full volume; the radius edge sits on the floor", () => {
    expect(distanceGain(0)).toBe(1);
    expect(distanceGain(SPATIAL_RADIUS_M)).toBe(SPATIAL_MIN_GAIN);
  });

  it("linear in between, floored beyond — a far teammate's splat is present, never gone", () => {
    expect(distanceGain(SPATIAL_RADIUS_M / 2)).toBeCloseTo(0.5, 5);
    expect(distanceGain(SPATIAL_RADIUS_M * 10)).toBe(SPATIAL_MIN_GAIN);
  });

  it("never exceeds 1, and garbage anchors resolve LOUD (a bad anchor should be heard and fixed, not swallowed)", () => {
    expect(distanceGain(-5)).toBe(1);
    expect(distanceGain(NaN)).toBe(1);
    expect(distanceGain(Infinity)).toBe(1);
  });
});

describe("the table models game language (the visionary's rule)", () => {
  it("every row's paths live under /audio/sfx/ (Vite public → dist → the one tunneled port)", () => {
    for (const paths of Object.values(SFX_TABLE))
      for (const p of paths!) expect(p).toMatch(/^\/audio\/sfx\//);
  });

  it("the first serving's rows are present; character rows (verdict stings, grumble) stay silence-with-names until the visionary's files land", () => {
    for (const key of [
      "pop",
      "splat",
      "plop",
      "leverThunk",
      "winchRatchet",
      "lobWhoosh",
      "chompDevour",
      "chompBegrudge",
    ] as const)
      expect(SFX_TABLE[key]?.length).toBeGreaterThan(0);
    expect(SFX_TABLE.verdictDelighted).toBeUndefined();
    expect(SFX_TABLE.grumbleRumble).toBeUndefined();
  });
});

describe("THE VOLUME BUS (plans/20 §5 — born with slice 6, never retrofitted)", () => {
  it("boots unmuted, sfx wide open, music resting at HALF its ceiling (ruled 2026-07-12: ~20% effective, never past 40)", () => {
    expect(createAudioBus()).toEqual({ music: 0.5, sfx: 1, muted: false });
  });

  it("THE LOUDNESS RULING (2026-07-12): the music ceiling never passes 40%, and ceiling × resting dial lands at ~20% effective", () => {
    expect(BG_VOLUME).toBeLessThanOrEqual(0.4);
    expect(BG_VOLUME * createAudioBus().music).toBeCloseTo(0.2, 5);
  });

  it("clampLevel funnels every dial write into [0, 1] (HTMLMediaElement.volume THROWS outside it — the ground-plane lesson)", () => {
    expect(clampLevel(-0.2)).toBe(0);
    expect(clampLevel(0.4)).toBe(0.4);
    expect(clampLevel(1.7)).toBe(1);
  });
});
