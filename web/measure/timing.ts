// Browser side of timing.measure.ts (see README.md in this folder): does it matter when each of the
// scan's held oscillators starts? Each one is started without a time (instruments.ts: ScanChoir and
// RichBass call start()), and Tone.js reads a missing time as now(). While the audio runs, the clock
// moves during a build, so the oscillators of one set start at different moments. Two notes that
// share a partial of exactly the same frequency (C3's second harmonic is C4; the low note C2's second
// and fourth harmonics are C3 and C4) then add it with a different phase each time.
// This records the start times of real builds, then renders the same notes offline, dry (no reverb),
// started at exactly those times. Offline nothing else varies, so any difference between two renders
// comes from the start times. The app is not changed: the times are handed to Tone.js's own start(),
// in this page only, and put back afterwards. The dev server serves this file; it is never part of the
// built app.
import * as Tone from 'tone';
import { ScanChoir, createScanBass, scanSound, type ScanSoundId } from '../src/audio/instruments';
import { LINE_GRID, bandNote } from '../src/audio/scanScore';
import { bandLevels, integratedLoudness } from './meter';

/** Length of each render, and the part measured: as in repeat.ts, so the two can be compared. */
const RENDER_SECONDS = 10;
const MEASURE_FROM = 6;

interface Startable {
  start(time?: Tone.Unit.Time, ...rest: unknown[]): unknown;
  now(): number;
}

/**
 * Run `build` with every start() that is given no time replaced by start(now() + shift(k)), k
 * counting those starts in order, and return the times used. With shift 0 this is exactly what
 * Tone.js does by itself: a missing time is read as now().
 * Two start() methods are replaced: Source's, which the choir's notes (FatOscillator) and the low
 * note's oscillators (Oscillator) inherit, and LFO's (the vibrato). A FatOscillator and an LFO hand an
 * explicit time to the oscillators inside them, so each start is counted once.
 */
function withStarts<T>(shift: (k: number) => number, build: () => T): { built: T; starts: number[] } {
  const source = Object.getPrototypeOf(Tone.Oscillator.prototype) as Startable;
  if (source !== Object.getPrototypeOf(Tone.FatOscillator.prototype) || !Object.prototype.hasOwnProperty.call(source, 'start')) {
    throw new Error('Tone.js has changed: Oscillator and FatOscillator no longer share Source.start');
  }
  const prototypes = [source, Tone.LFO.prototype as unknown as Startable];
  const originals = prototypes.map((p) => p.start);
  const starts: number[] = [];
  prototypes.forEach((p, i) => {
    const original = originals[i];
    p.start = function (this: Startable, time?: Tone.Unit.Time, ...rest: unknown[]) {
      if (time !== undefined) return original.call(this, time, ...rest);
      const at = this.now() + shift(starts.length);
      starts.push(at);
      return original.call(this, at, ...rest);
    };
  });
  try {
    return { built: build(), starts };
  } finally {
    prototypes.forEach((p, i) => (p.start = originals[i]));
  }
}

/** The held notes as the scan builds them (scanPlayer.ts, buildRig): the choir, then the low note. */
function buildHeld(sound: ScanSoundId, withBass: boolean) {
  const def = scanSound(sound);
  const choir = new ScanChoir(Array.from({ length: LINE_GRID.bands }, (_, band) => bandNote(band)), def.choir);
  const bass = withBass ? createScanBass(def) : null;
  return { choir, bass };
}

/**
 * Build the held notes `count` times while the audio runs, and return each build's start times in
 * seconds after its first start. Builds are spaced as in repeat.ts (buildSpread), so each begins at
 * another point of the clock. The instruments are thrown away.
 */
export async function liveStarts(count = 20, sound: ScanSoundId = 'ocean') {
  await Tone.start();
  const builds: number[][] = [];
  for (let i = 0; i < count; i++) {
    const { built, starts } = withStarts(() => 0, () => buildHeld(sound, true));
    builds.push(starts.map((t) => t - starts[0]));
    built.choir.dispose();
    built.bass?.dispose();
    await new Promise((done) => setTimeout(done, 37 + 11 * (i % 5)));
  }
  const sampleRate = Tone.getContext().sampleRate;
  return { sampleRate, quantumSeconds: 128 / sampleRate, builds };
}

/**
 * The twelve held notes at full level and the tone fully open, with the low note (its first root, C2)
 * at full level too, or without it, rendered offline and dry. `shifts` gives each start's time after
 * the first, in build order (null: every one at the same time). Returns the loudness of the part
 * measured and the level around each held note (within 3% of its frequency, both channels), as
 * repeat.ts measures them.
 */
async function render(sound: ScanSoundId, shifts: number[] | null, withBass: boolean) {
  const bands = LINE_GRID.bands;
  let used = 0;
  const buffer = await Tone.Offline(() => {
    const { built, starts } = withStarts((k) => (shifts ? shifts[k] : 0), () => buildHeld(sound, withBass));
    used = starts.length;
    built.choir.setLevels(new Array(bands).fill(1), 1, 0, 0.01);
    built.choir.output.toDestination();
    if (built.bass) {
      built.bass.setLevel(1, 0, 0.01);
      built.bass.output.toDestination();
    }
  }, RENDER_SECONDS, 2);
  if (shifts && used > shifts.length) throw new Error(`${used} starts, but a start pattern of ${shifts.length}`);
  const rate = buffer.sampleRate;
  const from = Math.round(MEASURE_FROM * rate);
  const left = buffer.getChannelData(0).slice(from);
  const right = buffer.getChannelData(1).slice(from);
  const hz = Array.from({ length: bands }, (_, band) => Tone.Frequency(bandNote(band), 'midi').toFrequency());
  const ranges = hz.map((f) => [f * 0.97, f * 1.03] as [number, number]);
  const l = bandLevels(left, rate, ranges);
  const r = bandLevels(right, rate, ranges);
  return {
    starts: used,
    lufs: integratedLoudness({ sampleRate: rate, left, right }),
    tones: hz.map((_, k) => 10 * Math.log10(10 ** (l[k] / 10) + 10 ** (r[k] / 10))),
  };
}

/**
 * The same held notes rendered offline: twice with every oscillator started at one time (the two
 * must agree exactly), then once for each start pattern with the low note, and once without it.
 */
export async function startSpread(patterns: number[][], sound: ScanSoundId = 'ocean') {
  const together = [await render(sound, null, true), await render(sound, null, true)];
  const asBuilt = [];
  for (const shifts of patterns) asBuilt.push(await render(sound, shifts, true));
  const choirAlone = [];
  for (const shifts of patterns) choirAlone.push(await render(sound, shifts, false));
  return {
    sound,
    renderSeconds: RENDER_SECONDS,
    measuredFrom: MEASURE_FROM,
    notes: Array.from({ length: LINE_GRID.bands }, (_, band) => Tone.Frequency(bandNote(band), 'midi').toNote()),
    together,
    asBuilt,
    choirAlone,
  };
}
