/**
 * THE SFX FORGE (plans/16 slice 6, ruled 2026-07-12) — the mechanical
 * rows of the sound table are REPRODUCIBLE SYNTH: this script IS the
 * recipe (the visionary's discipline rule — generated sounds are
 * assets with provenance, never mysterious binaries). Regenerate with
 * `node scripts/make-sfx.mjs`; never hand-edit the wavs.
 *
 * Character rows (verdict stings, grumble) are NOT forged here — they
 * are visionary-sourced like the music (the hybrid ruling). The
 * chomps ride along as first-pass placeholders: they sit on the
 * character side of the ruling and his files replace them by drop-in
 * (sfx.ts table law).
 *
 * Determinism: seeded RNG (mulberry32, core/rng.ts's cousin) — the
 * same script writes the same bytes, so a diff means a recipe change.
 * Format: 22050 Hz mono 16-bit PCM WAV — short UI sounds, ~10-30 KB
 * each; the audio diet (path entry 3) never needs to look at them.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RATE = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "audio", "sfx");

// --- The seeded noise source (reproducible-bytes law) ---------------
const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// --- Tiny DSP kit ----------------------------------------------------
/** Exponential decay envelope: 1 → ~0 over `tau` seconds. */
const decay = (t, tau) => Math.exp(-t / tau);
/** One-pole lowpass over a whole buffer; `cutoff01(i)` in (0,1]. */
const lowpass = (samples, cutoff01) => {
  let y = 0;
  return samples.map((x, i) => {
    const a = typeof cutoff01 === "function" ? cutoff01(i) : cutoff01;
    y += a * (x - y);
    return y;
  });
};
/** Peak-normalize to `peak`, then trim a 3 ms fade at both ends so no
 * sound starts or stops on a click. */
const finish = (samples, peak) => {
  const max = samples.reduce((m, s) => Math.max(m, Math.abs(s)), 1e-9);
  const fade = Math.floor(RATE * 0.003);
  return samples.map((s, i) => {
    const edge = Math.min(1, i / fade, (samples.length - 1 - i) / fade);
    return (s / max) * peak * edge;
  });
};
const seconds = (s) => Math.floor(RATE * s);
const writeWav = (name, samples) => {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  samples.forEach((s, i) =>
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), 44 + i * 2),
  );
  writeFileSync(join(OUT, name), buf);
  console.log(`  ${name}  ${(buf.length / 1024).toFixed(1)} KB`);
};

// --- The recipes ------------------------------------------------------
/** pop — the burst carrier: a bright snap with a pitch-drop blip. */
const pop = () => {
  const rnd = mulberry32(0xb0b1);
  const n = seconds(0.14);
  return Array.from({ length: n }, (_, i) => {
    const t = i / RATE;
    const snap = (rnd() * 2 - 1) * decay(t, 0.012);
    const blip = Math.sin(2 * Math.PI * (320 - 1400 * t) * t) * decay(t, 0.05) * 0.7;
    return snap + blip;
  });
};

/** splat — the money sound: a wet lowpassed smack over a soft thud. */
const splat = () => {
  const rnd = mulberry32(0x59147);
  const n = seconds(0.3);
  const noise = Array.from({ length: n }, (_, i) => {
    const t = i / RATE;
    return (rnd() * 2 - 1) * decay(t, 0.045) * (1 + 2.5 * decay(t, 0.006));
  });
  const wet = lowpass(noise, (i) => 0.32 * decay(i / RATE, 0.09) + 0.03);
  return wet.map((s, i) => {
    const t = i / RATE;
    return s + Math.sin(2 * Math.PI * 85 * t) * decay(t, 0.05) * 0.5;
  });
};

/** plop — the gentle landing: a soft descending blip, nothing more. */
const plop = () => {
  const n = seconds(0.18);
  return Array.from({ length: n }, (_, i) => {
    const t = i / RATE;
    const f = 380 - 1300 * t;
    return Math.sin(2 * Math.PI * Math.max(60, f) * t) * decay(t, 0.06) * Math.min(1, t / 0.008);
  });
};

/** lever-thunk — heavy timber and iron: a deep thump under a click. */
const leverThunk = () => {
  const rnd = mulberry32(0x7e4e);
  const n = seconds(0.24);
  const click = lowpass(
    Array.from({ length: n }, (_, i) => (rnd() * 2 - 1) * decay(i / RATE, 0.008)),
    0.5,
  );
  return click.map((c, i) => {
    const t = i / RATE;
    return c * 0.6 + Math.sin(2 * Math.PI * (62 - 40 * t) * t) * decay(t, 0.09);
  });
};

/** winch-ratchet — ONE pawl click; the metronome retriggers it. */
const winchRatchet = () => {
  const rnd = mulberry32(0x9a71);
  const n = seconds(0.055);
  const tick = Array.from({ length: n }, (_, i) => {
    const t = i / RATE;
    return (rnd() * 2 - 1) * decay(t, 0.004) + Math.sin(2 * Math.PI * 780 * t) * decay(t, 0.012) * 0.5;
  });
  return lowpass(tick, 0.75);
};

/** lob-whoosh — air over the bucket: swelling noise, cutoff riding
 * the envelope so it opens then closes. */
const lobWhoosh = () => {
  const rnd = mulberry32(0x3305);
  const n = seconds(0.6);
  const env = (t) => Math.pow(Math.sin(Math.PI * Math.min(1, t / 0.6)), 1.6);
  const noise = Array.from({ length: n }, (_, i) => {
    const t = i / RATE;
    return (rnd() * 2 - 1) * env(t);
  });
  return lowpass(noise, (i) => 0.04 + 0.3 * env(i / RATE));
};

/** chomp — jaws through sponge: staged crunch bursts. `bites` and
 * heft split devour (two big bites) from begrudge (one dull one). */
const chomp = (seed, bites, heft) => {
  const rnd = mulberry32(seed);
  const n = seconds(bites > 1 ? 0.5 : 0.3);
  const biteAt = Array.from({ length: bites }, (_, b) => (b * 0.22) / 1);
  const raw = Array.from({ length: n }, (_, i) => {
    const t = i / RATE;
    let s = 0;
    for (const at of biteAt) {
      if (t < at) continue;
      const bt = t - at;
      // A crunch is jagged: noise gated by a rough sub-pattern.
      const grit = rnd() < 0.55 ? 1 : 0.25;
      s += (rnd() * 2 - 1) * grit * decay(bt, 0.035) * (1 + 2 * decay(bt, 0.005));
      s += Math.sin(2 * Math.PI * 70 * bt) * decay(bt, 0.06) * heft;
    }
    return s;
  });
  return lowpass(raw, heft > 0.5 ? 0.28 : 0.16);
};

// --- Forge ------------------------------------------------------------
mkdirSync(OUT, { recursive: true });
console.log("forging into public/audio/sfx/:");
writeWav("pop.wav", finish(pop(), 0.8));
writeWav("splat.wav", finish(splat(), 0.9));
writeWav("plop.wav", finish(plop(), 0.55));
writeWav("lever-thunk.wav", finish(leverThunk(), 0.85));
writeWav("winch-ratchet.wav", finish(winchRatchet(), 0.5));
writeWav("lob-whoosh.wav", finish(lobWhoosh(), 0.55));
writeWav("chomp-devour.wav", finish(chomp(0xc40b, 2, 0.7), 0.9));
writeWav("chomp-begrudge.wav", finish(chomp(0xbe6d, 1, 0.35), 0.6));
console.log("done — regenerate any time; never hand-edit.");
