/**
 * The visual projectile sim — every lob the room announces, simulated
 * locally for flight, markers, and splat readouts (M4 of the decomp phase,
 * plans/06). Extracted verbatim from main.ts. Scoring truth stays with the
 * room's `scored` messages; this is what the player SEES.
 *
 * NOTE: step() advances the SHARED client world (the same world the baker
 * moves through) — the world is stepped exactly once per fixed tick, here,
 * after Baker.step has registered its kinematic movement. Don't add a
 * second world.step anywhere.
 */
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import {
  launchOrigin,
  launchVelocity,
  SPLAT_SPEED,
  type Vec3,
} from "../core/ballistics";
import {
  ProjectileManager,
  PROJECTILE_RADIUS,
  type GrainBody,
} from "../core/projectiles";
import type { DessertGeometry } from "../core/dessert";
import { TOWNS } from "../core/arena";
import { TILT_DEG_PER_NOTCH } from "../game/catapult";
import { isPaint, TOPPINGS } from "../game/toppings";
import type { RestingTopping } from "../game/protocol";
import { ComicWord } from "./comic-word";
import type { ClientFx } from "./sfx";
import type { ShotMsg } from "./net-handlers";
import { removeAndDispose, sphere, TOPPING_COLORS } from "./scene";

/** THE RING'S RETURN ADDRESS (plans/15 item 1, 2026-07-09): landing rings
 * are ONE PER CATAPULT — each gun's last lob, replaced by its next. Core
 * echoes a single `tag` number per impact, so the client packs (deal,
 * town) into its own tag namespace. This namespace is ShotsView's alone:
 * the Room's ProjectileManager tags carry its deal generation and the two
 * managers never share events. */
export const packShotTag = (deal: number, town: number): number =>
  deal * TOWNS.length + town;
export const unpackShotTag = (tag: number): { deal: number; town: number } => ({
  deal: Math.floor(tag / TOWNS.length),
  town: tag % TOWNS.length,
});

/** Burst grains are MULTICOLOR (plans/10 — color-variety judgment stays
 * deferred; the confetti is the point). In-flight grains take the palette by
 * SPAWN INDEX; the PERCHED sprinkles (sprinkles-view) recolor by a stable hash
 * of the grip point off this same palette — so flight color and final perch
 * color need not match (both are just confetti), but a perched sprinkle keeps
 * one color for life and reads identically on every client. */
export const GRAIN_PALETTE = [0xe4572e, 0x29bb89, 0x4a7cdb, 0xf2c14e, 0xd05ce3, 0xfff0f5];

/** THE TRAIL (plans/15 item 4, 2026-07-09): a translucent, topping-colored
 * comet ribbon behind every lob — aim feedback, client-only, seen by every
 * player because every client simulates every broadcast shot. Position
 * HISTORY, never prediction — the pre-shot preview arc is a recorded design
 * boundary (plans/15 item 9). Samples ride the FIXED TICK (the trail freezes
 * honestly under __timeScale); billboarding rides the frame (sync takes the
 * camera). Grains never trail (the quiet-grain law); the burst carrier
 * trails until the pop. These three are the aesthetics-pass dials. */
export const TRAIL_WINDOW_TICKS = 36; // 0.6s of arc at the 60Hz tick
export const TRAIL_HEAD_ALPHA = 0.45; // translucent at the ball…
export const TRAIL_WIDTH = PROJECTILE_RADIUS; // …tapering to a point behind

/** THE COMIC WORD (plans/15 item 13, ruled 2026-07-09): SPLAT!/plop./POP!
 * floats up from YOUR OWN machine's landings — a comic-panel onomatopoeia
 * in the WORLD, never a screen toast (the center of the screen is where
 * people see what is going on — the visionary's ruling). Depth-test OFF:
 * the word ignores the cake's silhouette and rises high enough to be seen
 * from behind it — the far-hemisphere lob is exactly the shot whose
 * landing you cannot physically see, so the cake announces it over its
 * own crest. It says HOW it landed, never where to aim (item 9 stands).
 * Other towns' shots stay wordless for you (their trails and rings still
 * speak); grains stay quiet (the POP! marks the burst). The corner flash
 * line stays as the quiet m/s record. Spatial SFX will ride these same
 * impact events (plans/16's sound slice — the events carry the position).
 * The word machinery itself lives in comic-word.ts (shared with the eat
 * beat); these are the landing-specific aesthetics-pass dials: */
const WORD_SPLAT_WIDTH_M = 2.4; // landing energy = word size…
const WORD_PLOP_WIDTH_M = 1.5; // …a gentle placement whispers

// Per-frame scratch for the ribbon rebuild — no allocation in the loop.
const _tangent = new THREE.Vector3();
const _toCam = new THREE.Vector3();
const _side = new THREE.Vector3();

/** One lob's ribbon: a ring buffer of recent positions, rebuilt each frame
 * as a camera-facing strip with per-vertex RGBA fade (three.js renders
 * 4-component vertex colors natively — no shader). THE TRAIL IS THE FLIGHT
 * (visionary ruling 2026-07-09, amending the at-rest law): the streak a
 * fast shot draws through the air — it HALTS at first contact (halt(),
 * keyed by the impact's bodyHandle) and the arc dissolves over the window
 * while the topping may still visibly roll. The ribbon outlives its body
 * the same way after a consume/pop (the body vanishes mid-feed); the ring
 * (plans/15 item 1) is the landing record. */
class TrailRibbon {
  /** Oldest first; the head (the ball) is last. Age in fixed ticks. */
  private readonly samples: Array<{
    x: number;
    y: number;
    z: number;
    age: number;
  }> = [];
  private readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.BufferGeometry;
  private readonly pos: THREE.BufferAttribute;
  private readonly rgba: THREE.BufferAttribute;
  private readonly color = new THREE.Color();
  private readonly body: RAPIER.RigidBody;
  private readonly bodyHandle: number;
  /** True until first impact (or the body leaves the world). */
  private feeding = true;

  constructor(body: RAPIER.RigidBody, colorHex: number, scene: THREE.Scene) {
    this.body = body;
    this.bodyHandle = body.handle;
    this.color.setHex(colorHex);
    const max = TRAIL_WINDOW_TICKS + 1; // ages 0..WINDOW live at once
    this.geometry = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(max * 2 * 3), 3);
    this.rgba = new THREE.BufferAttribute(new Float32Array(max * 2 * 4), 4);
    this.pos.setUsage(THREE.DynamicDrawUsage);
    this.rgba.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("position", this.pos);
    this.geometry.setAttribute("color", this.rgba);
    const idx: number[] = [];
    for (let i = 0; i < max - 1; i++)
      idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    this.geometry.setIndex(idx);
    this.geometry.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(
      this.geometry,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true, // normal alpha, not additive — stained glass, not laser
        depthWrite: false, // never fight the cake for the depth buffer
        side: THREE.DoubleSide,
      }),
    );
    // The empty-birth culling trap (sprinkles lesson, 2026-07-06): geometry
    // that grows far from the origin keeps its born-empty bounding sphere.
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  /** One fixed tick: age the arc out the tail; while still in FLIGHT,
   * sample the body at the head. Runs right after the world stepped, so
   * on the impact tick the head sample IS the contact point — then halt()
   * (called from the impact event) stops the feed for good. */
  tick(): void {
    for (const s of this.samples) s.age++;
    while (this.samples.length && this.samples[0]!.age > TRAIL_WINDOW_TICKS)
      this.samples.shift();
    if (!this.feeding) return;
    if (!this.body.isValid()) {
      // Consumed glob or popped carrier — the body left mid-feed.
      this.feeding = false;
      return;
    }
    const t = this.body.translation();
    this.samples.push({ x: t.x, y: t.y, z: t.z, age: 0 });
  }

  /** First contact (the impact event names this ribbon by body handle):
   * the flight is over, the streak stops here — a landed topping may roll
   * on, trail-less. */
  halt(): void {
    this.feeding = false;
  }

  isFor(bodyHandle: number): boolean {
    return this.bodyHandle === bodyHandle;
  }

  /** Feed stopped AND the arc dissolved — the ribbon leaves the scene.
   * Every lob impacts (or vanishes) eventually, so nothing idles: lobby
   * test litter must not grow the scene without bound (the rings lesson,
   * plans/15 item 1, found live at 159 idle ribbons). */
  get done(): boolean {
    return !this.feeding && this.samples.length === 0;
  }

  /** Per frame: rebuild the strip facing the camera. Width and alpha fade
   * with sample age — the comet taper. */
  rebuild(camera: THREE.Camera): void {
    const n = this.samples.length;
    if (n < 2) {
      this.geometry.setDrawRange(0, 0);
      return;
    }
    for (let i = 0; i < n; i++) {
      const s = this.samples[i]!;
      const p = this.samples[Math.max(0, i - 1)]!;
      const q = this.samples[Math.min(n - 1, i + 1)]!;
      _tangent.set(q.x - p.x, q.y - p.y, q.z - p.z);
      _toCam.set(
        s.x - camera.position.x,
        s.y - camera.position.y,
        s.z - camera.position.z,
      );
      _side.crossVectors(_tangent, _toCam);
      const len = _side.length();
      if (len < 1e-6) _side.set(0, 1, 0);
      else _side.divideScalar(len);
      const fade = 1 - s.age / TRAIL_WINDOW_TICKS;
      const half = TRAIL_WIDTH * fade;
      this.pos.setXYZ(
        2 * i,
        s.x + _side.x * half,
        s.y + _side.y * half,
        s.z + _side.z * half,
      );
      this.pos.setXYZ(
        2 * i + 1,
        s.x - _side.x * half,
        s.y - _side.y * half,
        s.z - _side.z * half,
      );
      const a = TRAIL_HEAD_ALPHA * fade;
      this.rgba.setXYZW(2 * i, this.color.r, this.color.g, this.color.b, a);
      this.rgba.setXYZW(2 * i + 1, this.color.r, this.color.g, this.color.b, a);
    }
    this.pos.needsUpdate = true;
    this.rgba.needsUpdate = true;
    this.geometry.setDrawRange(0, (n - 1) * 6);
  }

  dispose(): void {
    removeAndDispose(this.mesh);
  }
}

export class ShotsView {
  private readonly shots = new ProjectileManager();
  private readonly meshes: Array<{ body: RAPIER.RigidBody; mesh: THREE.Mesh }> =
    [];
  /** One ring per firing town (plans/15 item 1): a teammate's shot must
   * never erase YOUR walk-the-fall correction, and lobby test shots must
   * not pile up — the old FIFO-30 breadcrumb trail did both. */
  private readonly markers = new Map<number, THREE.Mesh>();
  /** Every lever-pulled lob's ribbon (plans/15 item 4) — grains and
   * welcome-restored resting toppings never get one. */
  private readonly trails: TrailRibbon[] = [];
  /** The comic words in flight (plans/15 item 13) — your own machine's
   * landings only; ~1s each, disposed on their beat, nothing piles up. */
  private readonly words: ComicWord[] = [];
  /** Whose crew this client bakes for — main keeps it current (the
   * welcome and every pickTown ack). Only THIS town's landings speak. */
  yourTown = 0;
  /** A paint glob landed in the local sim — main wires this to the
   * FrostingView (the deterministic twin of the Room's field). The topping
   * rides along: fudge paints under its own splat law and renders dark. */
  onPaintImpact: ((topping: string, pos: Vec3, speed: number) => void) | null =
    null;
  /** A grain GRIPPED in the local sim (the conversion law, plans/10 §8):
   * its body is already gone — sync() sweeps the mesh — and main hands
   * the record to the SprinklesView to perch on the frosting visual. */
  onStuck: ((topping: string, pos: Vec3, normal: Vec3) => void) | null = null;
  /** The local deal generation — the mirror of the Room's stale-shot rule
   * (checkpoint audit 2026-07-03): a glob fired against the previous order
   * still visibly lands, but must not paint the fresh cake's local field
   * the Room's authoritative field will never show. */
  private deal = 0;

  constructor(
    private readonly world: RAPIER.World,
    private readonly scene: THREE.Scene,
  ) {}

  /** Everyone simulates the same deterministic lob locally — including
   * bursts: the shot event's seed replays the identical scatter here. */
  spawn(msg: ShotMsg): void {
    const burst = TOPPINGS[msg.topping]?.burst;
    // The event says WHERE FROM: replay from the firing town's base along
    // its facing, mirroring the Room exactly (the origin is part of the
    // shot's determinism — sync-shots-not-surfaces).
    const facing = TOWNS[msg.town]?.facingDeg ?? 0;
    const base = TOWNS[msg.town]?.base ?? TOWNS[0]!.base;
    const body = this.shots.spawn(
      this.world,
      launchOrigin(base, msg.traverseDeg + facing),
      launchVelocity(
        msg.traverseDeg,
        msg.tensionClicks,
        msg.tiltNotch * TILT_DEG_PER_NOTCH,
        facing,
      ),
      msg.topping,
      // Paint globs are consumed at impact (plans/07): the manager removes
      // the body; sync() sweeps the orphaned mesh.
      {
        consumeOnImpact: isPaint(msg.topping),
        // (deal, town) packed — the ring's return address (header note).
        tag: packShotTag(this.deal, msg.town),
        seed: msg.seed,
        ...(burst ? { burst } : {}),
      },
    );
    const mesh = sphere(
      PROJECTILE_RADIUS,
      TOPPING_COLORS[msg.topping] ?? 0xc23b4e,
      0,
      -5,
      0,
      this.scene,
    );
    this.meshes.push({ body, mesh });
    // The comet (plans/15 item 4): the lob wears its topping's color. A
    // burst carrier trails too — until the pop; its grains never do.
    this.trails.push(
      new TrailRibbon(body, TOPPING_COLORS[msg.topping] ?? 0xc23b4e, this.scene),
    );
  }

  /** Recreate a topping already at rest (welcome world-sync, F2): a live
   * obstacle for later shots, but no markers — its landing is old news.
   * A settled burst topping IS its grain (carriers never land). */
  spawnResting(t: RestingTopping): void {
    const grain = TOPPINGS[t.topping]?.burst?.grain;
    const body = this.shots.spawnAtRest(
      this.world,
      { x: t.x, y: t.y, z: t.z },
      t.topping,
      grain,
    );
    const mesh = grain
      ? this.grainMesh(grain, 0)
      : sphere(
          PROJECTILE_RADIUS,
          TOPPING_COLORS[t.topping] ?? 0xc23b4e,
          t.x,
          t.y,
          t.z,
          this.scene,
        );
    mesh.position.set(t.x, t.y, t.z);
    this.meshes.push({ body, mesh });
  }

  /** A fresh deal was dealt: shots already in the air belong to the old
   * order — their paint must not land on the fresh cake's clean field. */
  bumpDeal(): void {
    this.deal++;
  }

  /** The conversion law's paint oracle (plans/10 §8): main binds the local
   * FrostingView field so grains grip where they hit wet paint on the
   * dessert skin — the deterministic twin of the Room's binding. */
  bindStickyPaint(check: (pos: Vec3) => boolean): void {
    this.shots.stickyPaint = check;
  }

  /** The fresh-cake law: everything on the dessert leaves with it. The
   * Room does the same on its side; sync() sweeps the orphaned meshes.
   * `dessert` must be the OUTGOING deal's geometry (plans/13 §3 redeal
   * ordering — the caller clears BEFORE rebinding). */
  clearCakeSolids(dessert: DessertGeometry): void {
    this.shots.clearCakeSolids(this.world, dessert);
  }

  /** One fixed tick: advance the shared world; markers + splat readout.
   * `dessert` is the CURRENT deal's geometry (an argument, never a field
   * — the slice-2 ruling; this view outlives the deal). `fx` is the
   * client FX port (slice 6): the word and the sound land as ONE
   * announcement (item 13's pairing law), so both ride the same
   * own-town predicate below. */
  step(dessert: DessertGeometry, fx: ClientFx): void {
    const ev = this.shots.step(this.world, dessert);
    // Trails age and sample FIRST (the world just stepped, so an impact
    // tick's head sample is the contact point); the impacts loop below
    // then halts the landed ones, and the cull at the bottom sweeps the
    // dissolved. The trail is the FLIGHT (ruling 2026-07-09): it stops at
    // first contact even though the topping may roll on.
    for (const tr of this.trails) tr.tick();
    // Bursts: the carrier's mesh leaves with its body (sync sweeps it);
    // every grain gets a confetti capsule. One flash for the whole pop.
    for (const b of ev.bursts) {
      for (let gi = 0; gi < b.grains.length; gi++) {
        const grain = TOPPINGS[b.topping]?.burst?.grain;
        if (!grain) continue;
        const mesh = this.grainMesh(grain, gi);
        this.meshes.push({ body: b.grains[gi]!, mesh });
      }
      fx.flash(`POP! the ${b.topping} burst — ${b.grains.length} grains`);
      // The comic word (item 13): YOUR crew's pop announces itself in the
      // world; the grains land wordless below it (the quiet-grain law).
      if (unpackShotTag(b.tag).town === this.yourTown) {
        this.words.push(
          new ComicWord(
            "POP!",
            TOPPING_COLORS[b.topping] ?? 0xc23b4e,
            b.pos,
            WORD_SPLAT_WIDTH_M,
            this.scene,
          ),
        );
        fx.sound("pop", { at: b.pos });
      }
    }
    // IMPACTS BEFORE STUCK — the mirror of the Room's tickScoringPhase
    // ordering (room.ts: the impacts loop's BURIAL filter runs while
    // ev.stuck is still unprocessed, so a grip on this same tick is not yet
    // in the ledger and survives). Adding the grip FIRST and burying second
    // (the old order) removed a same-tick grip here while the Room counted
    // it — a checklist-says-N / screen-shows-N-1 split, the exact class the
    // conversion law exists to kill (audit 2026-07-06). A glob landing the
    // same tick a grain grips under its footprint must bury it on NEITHER
    // side; only a strictly-LATER glob buries (the burial law's word).
    for (const im of ev.impacts) {
      // First contact ends the flight — the lob's ribbon stops feeding
      // (grains have no ribbon; find() simply misses).
      this.trails.find((t) => t.isFor(im.bodyHandle))?.halt();
      // Grains land QUIETLY (plans/10): 40 landings must not be 40 toasts
      // and 40 rings — the burst already told the story.
      if (im.grain) continue;
      const { deal, town } = unpackShotTag(im.tag);
      const splat = im.speed >= SPLAT_SPEED;
      // The firing gun's ring moves to its newest lob — a stale-deal shot
      // still visibly lands (it always did), it just can't paint.
      this.addLandingMarker(town, im.pos.x, im.pos.y, im.pos.z, splat);
      if (isPaint(im.topping) && deal === this.deal)
        this.onPaintImpact?.(im.topping, im.pos, im.speed);
      // The comic word (item 13): your own machine's landing speaks at the
      // spot — hot lands SHOUT, gentle ones whisper. Stale shots included:
      // they visibly land (the rings' precedent), so they honestly speak.
      if (town === this.yourTown) {
        this.words.push(
          new ComicWord(
            splat ? "SPLAT!" : "plop.",
            TOPPING_COLORS[im.topping] ?? 0xc23b4e,
            im.pos,
            splat ? WORD_SPLAT_WIDTH_M : WORD_PLOP_WIDTH_M,
            this.scene,
          ),
        );
        fx.sound(splat ? "splat" : "plop", { at: im.pos });
      }
      fx.flash(
        `${splat ? "SPLAT!" : "placed."} ${im.topping} landed at ${im.speed.toFixed(1)} m/s`,
      );
    }
    // Grips are QUIET like grain landings (the burst told the story); the
    // stuck record goes to the SprinklesView, stale ones included — a
    // stale burst visibly sticking to the fresh cake is accepted décor
    // (plans/10 §8), cleared with the next fresh deal.
    for (const st of ev.stuck) this.onStuck?.(st.topping, st.pos, st.normal);
    // A done ribbon (feed halted, arc dissolved) leaves the scene; no
    // fresh-deal clearing needed, nothing outlives its 0.6s window.
    for (let i = this.trails.length - 1; i >= 0; i--) {
      if (this.trails[i]!.done) {
        this.trails[i]!.dispose();
        this.trails.splice(i, 1);
      }
    }
    // The comic words age on the same tick — a word's beat ends, it leaves.
    for (let i = this.words.length - 1; i >= 0; i--) {
      if (this.words[i]!.tick()) {
        this.words[i]!.dispose();
        this.words.splice(i, 1);
      }
    }
  }

  /** Per frame: meshes follow their bodies (position AND rotation — a
   * grain capsule lies as it fell); consumed globs' and burst carriers'
   * meshes leave with their bodies. Ribbons rebuild facing `camera`. */
  sync(camera: THREE.Camera): void {
    for (const tr of this.trails) tr.rebuild(camera);
    for (let i = this.meshes.length - 1; i >= 0; i--) {
      const s = this.meshes[i]!;
      if (!s.body.isValid()) {
        removeAndDispose(s.mesh);
        this.meshes.splice(i, 1);
        continue;
      }
      const t = s.body.translation();
      s.mesh.position.set(t.x, t.y, t.z);
      const q = s.body.rotation();
      s.mesh.quaternion.set(q.x, q.y, q.z, q.w);
    }
  }

  /** A confetti capsule (plans/10: chunky-cute; multicolor by index). */
  private grainMesh(grain: GrainBody, index: number): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(grain.radius, grain.halfHeight * 2, 2, 6),
      new THREE.MeshStandardMaterial({
        color: GRAIN_PALETTE[index % GRAIN_PALETTE.length]!,
      }),
    );
    this.scene.add(mesh);
    return mesh;
  }

  /** The fresh deal (fresh-cake law, redeal branch): rings are annotations
   * about where THIS order's shots landed — under a fresh cake they point
   * at paint and toppings that are gone. All of them come down with the
   * dessert (playtest 2026-07-07); the physical floor litter stays. */
  clearLandingMarkers(): void {
    for (const m of this.markers.values()) removeAndDispose(m);
    this.markers.clear();
  }

  /** One ring per town (plans/15 item 1): this gun's next lob replaces
   * its own ring and nobody else's. */
  private addLandingMarker(
    town: number,
    x: number,
    y: number,
    z: number,
    splat: boolean,
  ): void {
    const old = this.markers.get(town);
    if (old) removeAndDispose(old);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.25, splat ? 0.55 : 0.4, 24),
      new THREE.MeshBasicMaterial({
        color: splat ? 0xd8452e : 0x3fae5a,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, Math.max(0.02, y - PROJECTILE_RADIUS + 0.03), z);
    this.scene.add(ring);
    this.markers.set(town, ring);
  }
}
