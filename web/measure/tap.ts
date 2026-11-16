// Browser side of the sound measurements (`npm run measure`, see README.md): records exactly what
// the app sends to the speakers, and measures it with meter.ts. The dev server serves this file;
// it is never part of the built app. Nothing here changes what the app plays.
import * as Tone from 'tone';
import { BarInstrument, SCAN_SOUNDS, ScanChoir, scanSound, type ScanSoundId } from '../src/audio/instruments';
import { ScanPlayer } from '../src/audio/scanPlayer';
import { CHIME_RULE, LINE_GRID, STRENGTH_FLOOR, bandNote, buildScanScore, type Pixels } from '../src/audio/scanScore';
import { bandDb, bandLevels, cut, integratedLoudness, peakDb, rmsDb, type Stereo } from './meter';

// A small audio processor that passes nothing on and posts every block it is given, with the audio
// clock's time at the start of the block.
const PROCESSOR = `
class MeasureTap extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input.length) {
      this.port.postMessage({ time: currentTime, left: input[0].slice(0), right: (input[1] || input[0]).slice(0) });
    }
    return true;
  }
}
registerProcessor('measure-tap', MeasureTap);
`;

interface Block {
  time: number;
  left: Float32Array;
  right: Float32Array;
}
let blocks: Block[] = [];
let ready: Promise<void> | null = null;

/** Start recording the app's output. Safe to call more than once. */
export function startTap(): Promise<void> {
  ready ??= (async () => {
    const context = Tone.getContext();
    await context.addAudioWorkletModule(URL.createObjectURL(new Blob([PROCESSOR], { type: 'application/javascript' })));
    const node = context.createAudioWorkletNode('measure-tap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit' });
    node.port.onmessage = (e: MessageEvent<Block>) => blocks.push(e.data);
    // The last node before the speakers, so every voice and its echo is in the recording.
    Tone.connect(Tone.getDestination().output, node);
    Tone.connect(node, context.rawContext.destination); // the processor writes silence; this only keeps it running
  })();
  return ready;
}

/** Forget what has been recorded so far. */
export function clearTap(): void {
  blocks = [];
}

/** The audio clock now (no look-ahead): the same clock as the times in the app's note logs. */
export const audioNow = (): number => Tone.immediate();

/** Whether the audio is running, and the audio clock: for a test to say why something did not sound. */
export const contextState = () => ({ state: Tone.getContext().state, time: Tone.immediate(), sampleRate: Tone.getContext().sampleRate });

/** Everything recorded so far as one recording beginning at audio time `start`. A gap is silence. */
function recording(): Stereo & { start: number } {
  const sampleRate = Tone.getContext().sampleRate;
  if (!blocks.length) return { sampleRate, left: new Float32Array(0), right: new Float32Array(0), start: 0 };
  const start = blocks[0].time;
  const last = blocks[blocks.length - 1];
  const length = Math.round((last.time - start) * sampleRate) + last.left.length;
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (const b of blocks) {
    const at = Math.round((b.time - start) * sampleRate);
    left.set(b.left, at);
    right.set(b.right, at);
  }
  return { sampleRate, left, right, start };
}

/** The recording between two audio-clock times. */
function between(from: number, to: number): Stereo {
  const r = recording();
  return cut(r, from - r.start, to - r.start);
}

/** Both channels' power added, in dB: the same wherever the sound sits between left and right. */
const both = (leftDb: number, rightDb: number) => 10 * Math.log10(10 ** (leftDb / 10) + 10 ** (rightDb / 10));

/**
 * Share of the time between two audio-clock times for which blocks arrived, 0 to 1. The browser
 * hands the processor nothing while no sound at all reaches the last node, so a gap is silence,
 * but it is a different fact from "recorded, and every sample was 0", and the report says which.
 */
function recorded(from: number, to: number): number {
  const sampleRate = Tone.getContext().sampleRate;
  let seconds = 0;
  for (const b of blocks) seconds += Math.max(0, Math.min(to, b.time + b.left.length / sampleRate) - Math.max(from, b.time));
  return seconds / (to - from);
}

/** Loudness and peak of the recording between two audio-clock times. */
export function measureBetween(from: number, to: number) {
  const part = between(from, to);
  return {
    seconds: part.left.length / part.sampleRate,
    sampleRate: part.sampleRate,
    recorded: recorded(from, to),
    lufs: integratedLoudness(part),
    peakDb: peakDb(part),
    levelDb: both(rmsDb(part.left), rmsDb(part.right)),
    leftMinusRightDb: rmsDb(part.left) - rmsDb(part.right),
  };
}

/**
 * The level around each band's held note (within 3% of its frequency, both channels' power added)
 * between two audio-clock times. Other tones fall in these bands too (the octaves and the fifth
 * harmonic of lower notes, the low note's octave, the chimes), so this is a fingerprint of a
 * recording, not the level of one note. Two recordings of the same sound give the same fingerprint.
 */
export function measureHeldTones(from: number, to: number, bands = LINE_GRID.bands) {
  const part = between(from, to);
  const hz = Array.from({ length: bands }, (_, band) => Tone.Frequency(bandNote(band), 'midi').toFrequency());
  const ranges = hz.map((f) => [f * 0.97, f * 1.03] as [number, number]);
  const left = bandLevels(part.left, part.sampleRate, ranges);
  const right = bandLevels(part.right, part.sampleRate, ranges);
  return hz.map((f, band) => ({ band, note: Tone.Frequency(bandNote(band), 'midi').toNote(), hz: f, db: both(left[band], right[band]) }));
}

/**
 * Record the scan's own choir (instruments.ts, ScanChoir) holding one band's note at full level with
 * its tone fully open, dry: straight to the speakers, without the room. Returns the level of each
 * harmonic of that note (within 1.5% of k times its frequency, both channels), so a model of the
 * choir's partials (spacing.ts) can be checked against the real thing. Plays for `seconds` + 1.5 s.
 */
export async function recordChoirNote(band: number, seconds = 8, sound: ScanSoundId = 'ocean', topHz = 6000) {
  await startTap();
  await Tone.start();
  const notes = Array.from({ length: LINE_GRID.bands }, (_, b) => bandNote(b));
  const choir = new ScanChoir(notes, scanSound(sound).choir);
  choir.output.connect(Tone.getDestination());
  const start = Tone.immediate() + 0.05;
  choir.setLevels(notes.map((_, b) => (b === band ? 1 : 0)), 1, start, 0.01);
  clearTap();
  await new Promise((done) => setTimeout(done, (seconds + 1.5) * 1000));
  const part = between(start + 1, start + 1 + seconds); // from 1 s on: the level and the tone have settled
  choir.silence();
  await new Promise((done) => setTimeout(done, 300));
  choir.dispose();
  const f0 = Tone.Frequency(bandNote(band), 'midi').toFrequency();
  // Harmonics up to topHz, and only while the ±1.5% windows of neighbours do not overlap.
  const ks = Array.from({ length: Math.floor(Math.min(topHz / f0, 33)) }, (_, i) => i + 1);
  const ranges = ks.map((k) => [k * f0 * 0.985, k * f0 * 1.015] as [number, number]);
  const left = bandLevels(part.left, part.sampleRate, ranges);
  const right = bandLevels(part.right, part.sampleRate, ranges);
  return { band, note: Tone.Frequency(bandNote(band), 'midi').toNote(), hz: f0, sampleRate: part.sampleRate, harmonics: ks.map((k, i) => ({ k, hz: k * f0, db: both(left[i], right[i]) })) };
}

/**
 * Does the sound get louder as the level rises? Plays a made-up picture (TEST INPUT, not NASA
 * data) in which one band holds four known levels, one after another, and nothing else has
 * colour. The chime rule is switched off for this picture, so only the held note and the low note
 * sound. Returns, for each level, how loud that band's own tone was.
 */
export async function levelSteps(targets = [0.125, 0.25, 0.5, 1], secondsEach = 6) {
  await startTap();
  await Tone.start();
  const { columns, bands, seconds, fullStrength } = LINE_GRID;
  const band = 6;
  const width = columns; // one pixel column is one scan column
  const height = bands * 10; // ten rows a band
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  const each = Math.round((secondsEach * columns) / seconds);
  targets.forEach((target, step) => {
    // A pure red of the strength that gives this level: strength = floor + level · (full − floor).
    const red = Math.round(255 * (STRENGTH_FLOOR + target * (fullStrength - STRENGTH_FLOOR)));
    for (let x = step * each; x < (step + 1) * each; x++) {
      for (let y = height - (band + 1) * 10; y < height - band * 10; y++) data[(y * width + x) * 4] = red;
    }
  });
  const pixels: Pixels = { data, width, height };
  const score = buildScanScore(pixels, { kind: 'line' }, { rule: { ...CHIME_RULE, minLevel: 2 } });

  const player = new ScanPlayer({ onState: () => {} });
  player.setScore(score);
  clearTap();
  await player.start();
  const started = audioNow(); // the sweep begins within the audio look-ahead of this moment (0.1 s)
  await new Promise((done) => setTimeout(done, (targets.length * secondsEach + 0.5) * 1000));
  player.stop();

  const hz = Tone.Frequency(bandNote(band), 'midi').toFrequency();
  const steps = targets.map((target, step) => {
    // The middle of each step, clear of its edges: from 2.5 s to 5.5 s of 6.
    const part = between(started + step * secondsEach + 2.5, started + (step + 1) * secondsEach - 0.5);
    const tone = (x: Float32Array) => bandDb(x, part.sampleRate, hz * 0.92, hz * 1.08);
    return {
      target,
      level: score.levels[(step * each + Math.floor(each / 2)) * bands + band],
      toneDb: both(tone(part.left), tone(part.right)),
      levelDb: both(rmsDb(part.left), rmsDb(part.right)),
      lufs: integratedLoudness(part),
    };
  });
  player.dispose();
  return { band, note: Tone.Frequency(bandNote(band), 'midi').toNote(), hz, secondsEach, chimes: score.chimes.length, steps };
}

/**
 * One struck note on each instrument of each scan sound, alone, at full strength: how loud each is
 * at the level its sound gives it. The scan's volume, left–right position and room are the same for
 * all three instruments of a sound, so they are left out here.
 */
export async function strikeEach(note = 84) {
  await startTap();
  await Tone.start();
  const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));
  const strikes = [];
  for (const def of SCAN_SOUNDS) {
    const instruments = [
      { colour: 'warm', name: def.warmName, model: def.warm, level: def.warmLevel },
      { colour: 'cool', name: def.coolName, model: def.cool, level: def.coolLevel },
      { colour: 'blue', name: def.blueName, model: def.blue, level: def.blueLevel },
    ];
    for (const i of instruments) {
      const instrument = new BarInstrument(i.model, i.level);
      instrument.output.toDestination();
      clearTap();
      const at = Tone.immediate() + 0.15;
      instrument.strike(note, at, 1);
      await wait(2700);
      const m = measureBetween(at, at + 2.4);
      strikes.push({ sound: def.label, colour: i.colour, name: i.name, level: i.level, lufs: m.lufs, peakDb: m.peakDb });
      instrument.dispose();
      await wait(300);
    }
  }
  return { note: Tone.Frequency(note, 'midi').toNote(), strikes };
}
