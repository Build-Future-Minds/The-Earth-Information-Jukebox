// Browser side of the Earth sound measurement (earth.measure.ts). Renders the app's own Earth
// sounds (src/audio/earthSound.ts) offline, faster than real time, and measures them with meter.ts.
// The dev server serves this file; it is never part of the built app. Nothing here changes what
// the app plays: it calls the same note() and beat() the transport calls, at the same times.
// One take per page load: the rooms share one limiter, made in the first render's context.
import * as Tone from 'tone';
import { createEarthSound, type EarthSound, type EarthSoundId } from '../src/audio/earthSound';
import { buildEarthTrack, EARTH_PITCH, EARTH_VELOCITY, longFraction, LONG_AT_A0, PULSE_SECONDS } from '../src/audio/earthVoice';
import { sourceByKey } from '../src/data/sources';
import { cut, integratedLoudness, peakDb, rmsDb, type Stereo } from './meter';

/** Ten beats, one chord phrase, covering the whole range of alignment. A = 0 (the shortest gap,
 *  a quarter of a beat) comes four times: it is where the band could most easily blur the second pulse. */
export const ALIGNMENTS = [0, 1, 0.5, 0, 0.25, 1, 0, 0.75, 0.5, 0];
const VOLUME_DB = -6; // the app's default Earth volume
const TAIL = 2; // seconds after the last beat, for the echo to die away
const START = 0.2;

export type Take = { sound: EarthSoundId; notes: boolean; band: boolean; beat: number };
export const TAKES: Record<string, Take> = {
  plain: { sound: 'plain', notes: true, band: false, beat: 1 },
  piano: { sound: 'piano', notes: true, band: false, beat: 1 },
  band: { sound: 'band', notes: true, band: true, beat: 1 },
  bandOnly: { sound: 'band', notes: false, band: true, beat: 1 },
  // The practice data's beat (0.5 s) at the fastest speed (1.25×): the shortest gap the app plays, 0.1 s.
  plainFast: { sound: 'plain', notes: true, band: false, beat: 0.4 },
  pianoFast: { sound: 'piano', notes: true, band: false, beat: 0.4 },
  bandFast: { sound: 'band', notes: true, band: true, beat: 0.4 },
  bandOnlyFast: { sound: 'band', notes: false, band: true, beat: 0.4 },
};

/** Note length, as earthVoice.ts sets it for a beat. */
const durFor = (beat: number) => Math.min(PULSE_SECONDS, beat * (1 - LONG_AT_A0) * 0.9);

/** Render a sound offline. `schedule` is called with the sound once its room is ready. */
async function render(id: EarthSoundId, seconds: number, schedule: (sound: EarthSound) => void): Promise<Stereo> {
  const buffer = await Tone.Offline(async () => {
    const sound = createEarthSound(id, VOLUME_DB);
    sound.open();
    await new Promise((r) => setTimeout(r, 300)); // the room builds its echo first
    schedule(sound);
  }, seconds);
  return { sampleRate: buffer.sampleRate, left: buffer.getChannelData(0), right: buffer.getChannelData(1) };
}

const mono = (s: Stereo) => s.left.map((x, i) => (x + s.right[i]) / 2);

/** Where the first sound comes out: the room and the limiter delay the music by a few ms. */
function firstSound(x: Float32Array, sampleRate: number): number {
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > 1e-4) return i / sampleRate;
  return 0;
}

/** Level in dB of the `seconds` after `t`, floored at −120 dB so silence still gives a number. */
const levelAt = (x: Float32Array, sr: number, t: number, seconds: number) =>
  Math.max(-120, rmsDb(x.subarray(Math.max(0, Math.round(t * sr)), Math.round((t + seconds) * sr))));

/** How much the level jumps at `t`: the 15 ms after it against the 15 ms before. A struck note jumps. */
const rise = (x: Float32Array, sr: number, t: number) => levelAt(x, sr, t, 0.015) - levelAt(x, sr, t - 0.015, 0.015);

export interface TakeResult {
  name: string;
  beat: number;
  sampleRate: number;
  lufs: number;
  peakDb: number;
  latencyMs: number;
  /** Level over the 30 ms from each second pulse (all ten), for comparing Earth notes with the band. */
  secondPulseLevelDb: number[];
  /** The jump at each second pulse with A = 0 (the shortest gap). */
  secondPulseRiseDb: number[];
  /** The band alone: its biggest jump inside a beat (beat starts excluded), and its jumps at beat starts. */
  riseInsideBeatDb?: number;
  riseAtBeatDb?: number[];
}

/** Render one take and measure it. */
export async function measureTake(name: string): Promise<TakeResult> {
  const take = TAKES[name];
  const music = ALIGNMENTS.length * take.beat;
  const s = await render(take.sound, START + music + TAIL, (sound) =>
    ALIGNMENTS.forEach((a, b) => {
      const t = START + b * take.beat;
      if (take.band) sound.beat(t, b, take.beat, false);
      if (!take.notes) return;
      sound.note(t, EARTH_PITCH, durFor(take.beat), EARTH_VELOCITY);
      sound.note(t + longFraction(a) * take.beat, EARTH_PITCH, durFor(take.beat), EARTH_VELOCITY);
    }),
  );
  const sr = s.sampleRate;
  const x = mono(s);
  const lag = firstSound(x, sr) - START; // 0 for the plain pulse; the room and limiter add a little
  const second = (b: number) => START + lag + (b + longFraction(ALIGNMENTS[b])) * take.beat;
  const body = cut(s, START, START + music);
  const result: TakeResult = {
    name,
    beat: take.beat,
    sampleRate: sr,
    lufs: integratedLoudness(body),
    peakDb: peakDb(body),
    latencyMs: lag * 1000,
    secondPulseLevelDb: ALIGNMENTS.map((_, b) => levelAt(x, sr, second(b), 0.03)),
    secondPulseRiseDb: ALIGNMENTS.flatMap((a, b) => (a === 0 && take.notes ? [rise(x, sr, second(b))] : [])),
  };
  if (take.band && !take.notes) {
    let inside = -Infinity;
    const atBeat: number[] = [];
    for (let b = 0; b < ALIGNMENTS.length; b++) {
      const t0 = START + lag + b * take.beat;
      atBeat.push(rise(x, sr, t0));
      // From 30 ms after the beat start to 15 ms before the next: no new note may start in here.
      for (let t = t0 + 0.03; t < t0 + take.beat - 0.015; t += 0.005) inside = Math.max(inside, rise(x, sr, t));
    }
    result.riseInsideBeatDb = inside;
    result.riseAtBeatDb = atBeat;
  }
  return result;
}

/** 16-bit stereo samples, base64, of the real ocean regions (12 beats of each) on one Earth sound. */
export async function listeningPcm(id: EarthSoundId): Promise<{ sampleRate: number; pcm: string }> {
  const ocean = sourceByKey('ocean');
  const beats = 12;
  const beat = ocean.features.step_seconds;
  const regions = ocean.scene.regions.map((r) => buildEarthTrack(ocean.features, r.id));
  const s = await render(id, START + regions.length * beats * beat + 1.2, (sound) => {
    let t0 = START;
    let n = 0;
    for (const track of regions) {
      for (const step of track.steps.slice(0, beats)) {
        sound.beat(t0 + step.t, n++, step.dur, step.step.status !== 'ok');
        for (const ev of step.events) sound.note(t0 + ev.t, ev.pitch, ev.dur, ev.vel);
      }
      t0 += beats * beat;
    }
  });
  const bytes = new Uint8Array(s.left.length * 4);
  const v = new DataView(bytes.buffer);
  for (let i = 0; i < s.left.length; i++) {
    v.setInt16(i * 4, Math.max(-1, Math.min(1, s.left[i])) * 32767, true);
    v.setInt16(i * 4 + 2, Math.max(-1, Math.min(1, s.right[i])) * 32767, true);
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { sampleRate: s.sampleRate, pcm: btoa(bin) };
}
