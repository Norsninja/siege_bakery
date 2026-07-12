/**
 * THE EAT BEAT'S PINS (plans/16 slice 7, ruled 2026-07-12): the beat
 * timeline (photo-then-eat by construction, everything resolved
 * before the walk-off), the three-verdict split (devour / begrudge /
 * uneaten), and the theatre's lifecycle against a REAL scene graph —
 * what's IN the scene, not internal counters (the sticky-frosting
 * lesson). Node has no canvas: the word runs faceless here; the
 * pixels are the eye pass's job.
 */
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { CAKE_3 } from "../core/dessert";
import { CAKE_Z } from "../core/arena";
import type { Judgment } from "../game/judgment";
import { WORD_LIFE_TICKS } from "./comic-word";
import {
  buildCakeProxy,
  CHOMP_FRAME,
  EAT_START_FRAME,
  EatTheatre,
  eatAction,
} from "./eat-beat";
import { VERDICT_HOLD_FRAMES } from "./patron-body";
import { DEPART_AT_FRAMES } from "./patron-table";
import { MOMENT_TICKS } from "./report-view";

const judgment = (met: boolean, accepted: boolean): Judgment => ({
  met,
  accepted,
  score: 50,
  stars: 1,
  checks: [],
  coverage: 0.5,
  effectiveCoverage: 0.5,
  neatness: 1,
  integrity: 1,
  mess: 0,
  waste: 1,
});

/** Drive a theatre from the verdict edge to `until` with a fixed
 * mouth (a giant's head: 21 m out, 30 m up, on the cake axis). */
const MOUTH = new THREE.Vector3(21, 30, -30);
const run = (theatre: EatTheatre, from: number, until: number): void => {
  for (let f = from; f <= until; f++) theatre.step(f, MOUTH);
};

const named = (scene: THREE.Scene, name: string): THREE.Object3D[] => {
  const out: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (o.name === name) out.push(o);
  });
  return out;
};

describe("the eat action (the ruled three-verdict split)", () => {
  it("DELIGHTED devours, REFUSED begrudges, HUNGRY leaves the cake", () => {
    expect(eatAction(judgment(true, true))).toBe("devour");
    expect(eatAction(judgment(true, false))).toBe("begrudge");
    expect(eatAction(judgment(false, false))).toBeNull();
    expect(eatAction(null)).toBeNull();
  });
});

describe("the beat timeline (plans/16 slice 7)", () => {
  it("photo-then-eat BY CONSTRUCTION: the eat starts after the verdict-pose hold", () => {
    expect(EAT_START_FRAME).toBeGreaterThan(VERDICT_HOLD_FRAMES);
  });

  it("the polaroid files BEFORE the eat starts (the beat runs photo → banner → eat)", () => {
    // Ticks and render frames both run ~60 Hz; +30 covers the 0.5 s
    // CSS tween that carries the photo to its corner.
    expect(MOMENT_TICKS + 30).toBeLessThan(EAT_START_FRAME);
  });

  it("the walk-off lands inside the ruling (~450-480) and after the word dies", () => {
    expect(DEPART_AT_FRAMES).toBeGreaterThanOrEqual(450);
    expect(DEPART_AT_FRAMES).toBeLessThanOrEqual(480);
    expect(CHOMP_FRAME + WORD_LIFE_TICKS).toBeLessThan(DEPART_AT_FRAMES);
  });
});

describe("the stand-in proxy", () => {
  it("builds one low-poly mesh per spec tier — the judged cake's shape", () => {
    const proxy = buildCakeProxy(CAKE_3.tiers);
    expect(proxy.children.length).toBe(CAKE_3.tiers.length);
  });
});

describe("EatTheatre lifecycle (scene truth, not counters)", () => {
  it("the devour: waits through the photo, arcs to the mouth, CHOMP!s with sparkle, resolves before the walk-off", () => {
    const scene = new THREE.Scene();
    const theatre = new EatTheatre(scene, CAKE_3.tiers, "devour");

    // The photo beat: nothing in the world before the eat starts.
    run(theatre, 1, EAT_START_FRAME - 1);
    expect(theatre.stage).toBe("waiting");
    expect(scene.children.length).toBe(0);

    // The arc: the proxy pops from the real cake's mark…
    theatre.step(EAT_START_FRAME, MOUTH);
    const proxy = named(scene, "eat_beat_proxy")[0];
    expect(proxy).toBeDefined();
    expect(proxy!.position.x).toBeCloseTo(0, 1);
    expect(proxy!.position.z).toBeCloseTo(CAKE_Z, 1);

    // …and by the CHOMP edge it has reached the mouth (render truth:
    // the position the player sees, swallowed small).
    run(theatre, EAT_START_FRAME + 1, CHOMP_FRAME - 1);
    expect(proxy!.position.distanceTo(MOUTH)).toBeLessThan(3);
    expect(proxy!.scale.x).toBeLessThan(0.5); // mid-swallow

    // The CHOMP: proxy swallowed, the word SHOUTS, crumbs AND sparkle.
    theatre.step(CHOMP_FRAME, MOUTH);
    expect(named(scene, "eat_beat_proxy").length).toBe(0);
    expect(theatre.spokenText).toBe("CHOMP!");
    expect(named(scene, "eat_beat_crumb").length).toBeGreaterThan(0);
    expect(named(scene, "eat_beat_sparkle").length).toBeGreaterThan(0);

    // Everything resolves before the departure beat — the scene is
    // handed back empty (word, crumbs, sparkles all disposed).
    run(theatre, CHOMP_FRAME + 1, DEPART_AT_FRAMES);
    expect(theatre.stage).toBe("done");
    expect(scene.children.length).toBe(0);
  });

  it("the begrudge: same arc, a muttered chomp., NO sparkle (the ruled split)", () => {
    const scene = new THREE.Scene();
    const theatre = new EatTheatre(scene, CAKE_3.tiers, "begrudge");
    run(theatre, 1, CHOMP_FRAME);
    expect(theatre.spokenText).toBe("chomp.");
    expect(named(scene, "eat_beat_crumb").length).toBeGreaterThan(0);
    expect(named(scene, "eat_beat_sparkle").length).toBe(0);
    run(theatre, CHOMP_FRAME + 1, DEPART_AT_FRAMES);
    expect(theatre.stage).toBe("done");
    expect(scene.children.length).toBe(0);
  });

  it("no mouth, no beat: a rig-less patron leaves the cake untouched (assetless law)", () => {
    const scene = new THREE.Scene();
    const theatre = new EatTheatre(scene, CAKE_3.tiers, "devour");
    for (let f = 1; f <= DEPART_AT_FRAMES; f++) theatre.step(f, null);
    expect(theatre.stage).toBe("done");
    expect(scene.children.length).toBe(0);
  });

  it("a mid-arc snap disposes everything immediately", () => {
    const scene = new THREE.Scene();
    const theatre = new EatTheatre(scene, CAKE_3.tiers, "devour");
    run(theatre, 1, EAT_START_FRAME + 20);
    expect(scene.children.length).toBeGreaterThan(0);
    theatre.dispose();
    expect(theatre.stage).toBe("done");
    expect(scene.children.length).toBe(0);
  });

  it("an assetless spec (no tiers) still speaks and resolves — a degenerate cake, not a crash", () => {
    const scene = new THREE.Scene();
    const theatre = new EatTheatre(scene, [], "devour");
    run(theatre, 1, DEPART_AT_FRAMES);
    expect(theatre.stage).toBe("done");
    expect(scene.children.length).toBe(0);
  });
});
