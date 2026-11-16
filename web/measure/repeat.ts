// Browser side of repeat.measure.ts (see README.md in this folder): the scan's held notes rendered
// offline through the scan's reverb, many times over, to see how much the reverb alone changes the
// loudness. Offline rendering has no timing to vary, so whatever changes between two renders comes
// from the reverb. The dev server serves this file; it is never part of the built app.
import * as Tone from 'tone';
import { ScanChoir, createScanBass, scanSound, type ScanSoundId } from '../src/audio/instruments';
import { LINE_GRID, bandNote } from '../src/audio/scanScore';
import { bandLevels, integratedLoudness } from './meter';

/** Length of each render, and the part measured: after the echo (5 s) has built up. */
const RENDER_SECONDS = 10;
const MEASURE_FROM = 6;

/**
 * The twelve held notes of a scan sound, all at full level and the tone fully open, rendered
 * offline for RENDER_SECONDS. With `reverb`, through a Tone.Reverb made as the scan's Room makes
 * it (instruments.ts, class Room: the sound's decay and wet share, pre-delay 0.03 s). Tone.Reverb
 * builds its echo from random noise each time one is made. Returns the loudness of the last four
 * seconds and the level around each held note (within 3% of its frequency, both channels).
 */
async function render(sound: ScanSoundId, reverb: boolean) {
  const def = scanSound(sound);
  const bands = LINE_GRID.bands;
  const buffer = await Tone.Offline(async () => {
    const choir = new ScanChoir(Array.from({ length: bands }, (_, band) => bandNote(band)), def.choir);
    choir.setLevels(new Array(bands).fill(1), 1, 0, 0.01);
    if (reverb) {
      const room = new Tone.Reverb({ decay: def.room.decay, preDelay: 0.03, wet: def.room.wet }).toDestination();
      await room.ready;
      choir.output.connect(room);
    } else {
      choir.output.toDestination();
    }
  }, RENDER_SECONDS, 2);
  const rate = buffer.sampleRate;
  const from = Math.round(MEASURE_FROM * rate);
  const left = buffer.getChannelData(0).slice(from);
  const right = buffer.getChannelData(1).slice(from);
  const hz = Array.from({ length: bands }, (_, band) => Tone.Frequency(bandNote(band), 'midi').toFrequency());
  const ranges = hz.map((f) => [f * 0.97, f * 1.03] as [number, number]);
  const l = bandLevels(left, rate, ranges);
  const r = bandLevels(right, rate, ranges);
  return {
    lufs: integratedLoudness({ sampleRate: rate, left, right }),
    tones: hz.map((_, k) => 10 * Math.log10(10 ** (l[k] / 10) + 10 ** (r[k] / 10))),
  };
}

/**
 * How far the audio clock moves while one set of the scan's held instruments is built, as the
 * scan builds it (scanPlayer.ts, buildRig: the choir's notes, then the low note). Each oscillator
 * starts at "now" as it is made, read again for each one, so if the clock moves during the build the
 * notes start at different moments, and partials of two notes that are exactly the same frequency
 * (an octave's harmonics, the low note's octave and the choir's note) add with a different phase.
 * Returns, for each build, the clock's step during it in seconds; the clock moves in steps of one
 * render quantum (128 samples). Builds while the audio runs, and throws the instruments away.
 */
export async function buildSpread(count = 20, sound: ScanSoundId = 'ocean') {
  await Tone.start();
  const def = scanSound(sound);
  const notes = Array.from({ length: LINE_GRID.bands }, (_, band) => bandNote(band));
  const steps: number[] = [];
  const milliseconds: number[] = [];
  for (let i = 0; i < count; i++) {
    const t0 = Tone.now();
    const p0 = performance.now();
    const choir = new ScanChoir(notes, def.choir);
    const bass = createScanBass(def);
    steps.push(Tone.now() - t0);
    milliseconds.push(performance.now() - p0);
    choir.dispose();
    bass.dispose();
    await new Promise((done) => setTimeout(done, 37 + 11 * (i % 5))); // start the next build at another point of the clock
  }
  return { quantumSeconds: 128 / Tone.getContext().sampleRate, steps, milliseconds };
}

/** `count` renders through a new reverb each, and two without any reverb (which must agree exactly). */
export async function reverbSpread(count = 20, sound: ScanSoundId = 'ocean') {
  const dry = [await render(sound, false), await render(sound, false)];
  const wet = [];
  for (let i = 0; i < count; i++) wet.push(await render(sound, true));
  return {
    sound,
    renderSeconds: RENDER_SECONDS,
    measuredFrom: MEASURE_FROM,
    notes: Array.from({ length: LINE_GRID.bands }, (_, band) => Tone.Frequency(bandNote(band), 'midi').toNote()),
    room: scanSound(sound).room,
    dry,
    wet,
  };
}
