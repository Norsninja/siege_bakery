/**
 * THE EAT BEAT (plans/16 slice 7, ruled 2026-07-12) — the fiction's
 * missing consumption. Photo-then-eat: the verdict pose plays and the
 * polaroid files the masterpiece FIRST; only then does a low-poly
 * STAND-IN cake pop from the real cake's mark and arc to the patron's
 * mouth. The real dessert (frosting paint + settled physics) never
 * moves — its redeal reset finally has a fiction.
 *
 * THE THREE-VERDICT SPLIT (ruled): DELIGHTED = the full devour
 * (CHOMP! + crumb burst + sparkle — the trailer shot); REFUSED = eats
 * it BEGRUDGINGLY (same arc, a grudging chomp., no sparkle); HUNGRY =
 * no beat at all — he walks away mournfully, the cake uneaten.
 *
 * Laws: client-only juice, frame-counted off the linger (no wall
 * clock), Math.random legal (unsynced confetti, the crumb precedent
 * is shots-view's grains); assetless-boot — no mouth anchor means no
 * beat, ever a no-op. Drive-nodes-plus-dress culture: a proper
 * siege-engineering cake LIFT can costume this same beat later; the
 * arc timeline is the drive, the proxy is the dress.
 *
 * SFX (slice 6, built 2026-07-12): the chomp sting fires on the CHOMP
 * edge — the same frame this module speaks the word (item 13's pairing
 * law: the word and the sound are one announcement). The sound arrives
 * as a narrow callback (the ClientFx port, ruled over a singleton);
 * absent callback = the old placeholder silence, assetless-law style.
 */
import * as THREE from "three";
import { CAKE_Z } from "../core/arena";
import type { CakeTier } from "../core/dessert";
import type { Judgment } from "../game/judgment";
import { VERDICT_HOLD_FRAMES, verdictPose } from "./patron-body";
import { ComicWord } from "./comic-word";
import { TIER_COLORS } from "./scene";
import type { SfxFn } from "./sfx";

/** The beat sheet, in linger frames (~60fps; frame 1 = the verdict
 * edge). The verdict pose holds VERDICT_HOLD_FRAMES with the polaroid
 * up; the eat starts as the pose relaxes — documented BEFORE devoured
 * BY CONSTRUCTION (derived, not coincident). Everything resolves
 * before the walk-off (the word ends at CHOMP + 66; crumbs settle by
 * ~CHOMP + 60; DEPART_AT_FRAMES is 460). */
export const EAT_START_FRAME = VERDICT_HOLD_FRAMES + 10;
export const EAT_ARC_FRAMES = 80; // cake mark → mouth, ~1.3s
export const CHOMP_FRAME = EAT_START_FRAME + EAT_ARC_FRAMES; // 330

/** How the patron treats the cake — derived from the same star read as his
 * pose (plans/23 relax): devour at 2★+, begrudge at 1★. null = HUNGRY (below
 * the floor, no cake): no eat beat. */
export type EatAction = "devour" | "begrudge";
export function eatAction(
  j: Pick<Judgment, "accepted" | "stars"> | null,
): EatAction | null {
  if (!j) return null;
  const pose = verdictPose(j);
  if (pose === "delighted") return "devour";
  if (pose === "refused") return "begrudge";
  return null; // hungry — the cake goes uneaten
}

/** The comic grammar mirrors SPLAT!/plop.: joy SHOUTS, grudges
 * mutter. Widths are giant-scaled — the mouth is ~30 m up and the
 * word must read from the courtyard. Eye-pass dials. */
const CHOMP_DEVOUR = { text: "CHOMP!", color: 0xf2c14e, widthM: 9 };
const CHOMP_BEGRUDGE = { text: "chomp.", color: 0x9a8fa0, widthM: 5.5 };

/** Arc shape: a lobbed parabola — pops off the mark, clears the line
 * between cake top and mouth, shrinks into the gulp over the last
 * quarter (the swallow — the proxy never visibly clips the face). */
const ARC_LIFT_M = 8;
const POP_IN_FRAMES = 10;
const SWALLOW_FROM = 0.75; // arc t where the shrink begins
/** A slow comic tumble on the way up — one dial. */
const TUMBLE_RAD_PER_FRAME = 0.02;

/** Crumbs and sparkles (the burst): plain unsynced confetti.
 * Crumbs fall in sponge colors; sparkles are the devour's gold and
 * FLOAT — celebration, not debris. Sizes are giant-mouth scaled. */
const CRUMB_COUNT = 22;
const CRUMB_LIFE_TICKS = 55;
const CRUMB_GRAVITY = -0.045; // m/frame² (~162 m/s² reads snappy at range)
const CRUMB_SPEED = 0.55; // m/frame initial scatter
const CRUMB_SIZE_M = 0.55;
const SPARKLE_COUNT = 14;
const SPARKLE_LIFE_TICKS = 70;
const SPARKLE_RISE = 0.09; // m/frame drift upward
const SPARKLE_SIZE_M = 0.8;
const SPARKLE_COLOR = 0xffe9a8;

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  age: number;
  life: number;
  gravity: number;
}

/** Build the stand-in: the spec's tiers as low-poly cylinders in the
 * real cake's colors, base at the group origin. Pure — Node-testable;
 * geometry/material are OURS (built, not cloned) so dispose is legal. */
export function buildCakeProxy(tiers: readonly CakeTier[]): THREE.Group {
  const group = new THREE.Group();
  group.name = "eat_beat_proxy";
  tiers.forEach((t, i) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(t.radius, t.radius, t.top - t.bottom, 12),
      new THREE.MeshStandardMaterial({
        color: TIER_COLORS[Math.min(i, TIER_COLORS.length - 1)]!,
      }),
    );
    m.position.y = (t.top + t.bottom) / 2;
    group.add(m);
  });
  return group;
}

const disposeInto = (scene: THREE.Scene, obj: THREE.Object3D): void => {
  scene.remove(obj);
  obj.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
};

/**
 * One verdict's eat theatre. The owner (patron-table) creates it on
 * the verdict edge with the JUDGED dessert's tiers (a redeal may
 * rebind mid-beat; the eaten cake is the one that was judged), steps
 * it every frame with the linger count and the patron's live mouth
 * anchor, and disposes it on any snap.
 */
export class EatTheatre {
  private proxy: THREE.Group | null = null;
  private word: ComicWord | null = null;
  private particles: Particle[] = [];
  private tumble = 0;
  /** Latched at spawn: a beat that starts must finish at the same
   * mouth even if the anchor flickers; a beat with NO mouth at spawn
   * never starts (assetless law). */
  private readonly mouth = new THREE.Vector3();
  private stageName: "waiting" | "arcing" | "burst" | "done" = "waiting";

  constructor(
    private readonly scene: THREE.Scene,
    private readonly tiers: readonly CakeTier[],
    readonly action: EatAction,
    private readonly sound?: SfxFn,
  ) {}

  /** For the pins and the smoke driver. */
  get stage(): "waiting" | "arcing" | "burst" | "done" {
    return this.stageName;
  }

  /** What the chomp said — null before the CHOMP edge and after the
   * word's beat ends (the pins and the smoke driver peek here). */
  get spokenText(): string | null {
    return this.word?.text ?? null;
  }

  /** Per render frame. `lingerFrame` is the owner's linger count
   * (1 = verdict edge); `mouth` the patron's current mouth anchor
   * (null = rig-less or gone). */
  step(lingerFrame: number, mouth: THREE.Vector3 | null): void {
    if (this.stageName === "done") return;

    if (this.stageName === "waiting") {
      if (lingerFrame < EAT_START_FRAME) return;
      if (!mouth) {
        this.stageName = "done"; // no mouth, no beat — the cake stays
        return;
      }
      this.mouth.copy(mouth);
      this.proxy = buildCakeProxy(this.tiers);
      this.proxy.position.set(0, 0, CAKE_Z);
      this.scene.add(this.proxy);
      this.stageName = "arcing";
    }

    if (this.stageName === "arcing" && this.proxy) {
      if (mouth) this.mouth.copy(mouth); // track the breathing head
      const t = Math.min(
        1,
        Math.max(0, (lingerFrame - EAT_START_FRAME) / EAT_ARC_FRAMES),
      );
      // Parabolic lob off the mark, over the line, into the mouth.
      const x = this.mouth.x * t;
      const z = CAKE_Z + (this.mouth.z - CAKE_Z) * t;
      const y = this.mouth.y * t + ARC_LIFT_M * 4 * t * (1 - t);
      this.proxy.position.set(x, y, z);
      // Pop in fat, tumble up, shrink into the gulp.
      const frame = lingerFrame - EAT_START_FRAME;
      const pop = Math.min(1, frame / POP_IN_FRAMES);
      const swallow =
        t < SWALLOW_FROM ? 1 : 1 - (t - SWALLOW_FROM) / (1 - SWALLOW_FROM);
      this.proxy.scale.setScalar(Math.max(0.001, pop * Math.max(0.08, swallow)));
      this.tumble += TUMBLE_RAD_PER_FRAME;
      this.proxy.rotation.y = this.tumble;
      if (lingerFrame >= CHOMP_FRAME) this.chomp();
    }

    if (this.stageName === "burst") {
      const wordDone = this.word ? this.word.tick() : true;
      if (wordDone && this.word) {
        this.word.dispose();
        this.word = null;
      }
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i]!;
        p.age++;
        if (p.age > p.life) {
          disposeInto(this.scene, p.mesh);
          this.particles.splice(i, 1);
          continue;
        }
        p.vel.y += p.gravity;
        p.mesh.position.add(p.vel);
        const fade = 1 - p.age / p.life;
        p.mesh.scale.setScalar(Math.max(0.001, fade));
      }
      if (!this.word && this.particles.length === 0) this.stageName = "done";
    }
  }

  /** The CHOMP edge: proxy gone (swallowed), the word speaks, the
   * sting sounds — one announcement (the pairing law), one frame. */
  private chomp(): void {
    if (this.proxy) {
      disposeInto(this.scene, this.proxy);
      this.proxy = null;
    }
    this.sound?.(this.action === "devour" ? "chompDevour" : "chompBegrudge", {
      at: { x: this.mouth.x, y: this.mouth.y, z: this.mouth.z },
    });
    const spec = this.action === "devour" ? CHOMP_DEVOUR : CHOMP_BEGRUDGE;
    this.word = new ComicWord(
      spec.text,
      spec.color,
      { x: this.mouth.x, y: this.mouth.y, z: this.mouth.z },
      spec.widthM,
      this.scene,
    );
    // Crumbs — both eating verdicts spray sponge.
    for (let i = 0; i < CRUMB_COUNT; i++) {
      this.spawnParticle(
        TIER_COLORS[i % TIER_COLORS.length]!,
        CRUMB_SIZE_M,
        new THREE.Vector3(
          (Math.random() - 0.5) * CRUMB_SPEED * 2,
          Math.random() * CRUMB_SPEED * 0.8,
          (Math.random() - 0.5) * CRUMB_SPEED * 2,
        ),
        CRUMB_LIFE_TICKS,
        CRUMB_GRAVITY,
        false,
      );
    }
    // Sparkle — the devour's celebration only (the ruled split).
    if (this.action === "devour") {
      for (let i = 0; i < SPARKLE_COUNT; i++) {
        this.spawnParticle(
          SPARKLE_COLOR,
          SPARKLE_SIZE_M,
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            SPARKLE_RISE * (0.6 + Math.random() * 0.8),
            (Math.random() - 0.5) * 0.3,
          ),
          SPARKLE_LIFE_TICKS,
          0,
          true,
        );
      }
    }
    this.stageName = "burst";
  }

  private spawnParticle(
    color: number,
    size: number,
    vel: THREE.Vector3,
    life: number,
    gravity: number,
    sparkle: boolean,
  ): void {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      sparkle
        ? new THREE.MeshBasicMaterial({ color, fog: false })
        : new THREE.MeshStandardMaterial({ color }),
    );
    mesh.name = sparkle ? "eat_beat_sparkle" : "eat_beat_crumb";
    mesh.position.copy(this.mouth);
    mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    this.scene.add(mesh);
    this.particles.push({ mesh, vel, age: 0, life, gravity });
  }

  /** Abort (snap paths): everything out of the scene, immediately. */
  dispose(): void {
    if (this.proxy) disposeInto(this.scene, this.proxy);
    this.proxy = null;
    if (this.word) this.word.dispose();
    this.word = null;
    for (const p of this.particles) disposeInto(this.scene, p.mesh);
    this.particles = [];
    this.stageName = "done";
  }
}
