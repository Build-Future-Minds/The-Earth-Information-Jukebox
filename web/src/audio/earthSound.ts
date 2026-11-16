// Earth sound: what the Earth voice sounds like. Only *when* each pulse sounds carries data
// (earthVoice.ts); everything here is fixed, the same for every region, picture and alignment value
// (docs/mapping_spec.md, "The Earth voice as music"). Three choices:
//   'band'   Piano and band: every Earth note on a soft piano with a quiet bell on the same note, as
//            the listening game plays its melody, in a small room, with the Earth band under it
//            (earthBand.ts). The default.
//   'piano'  Piano only: the same notes and room, no band.
//   'plain'  Plain pulse: the first version's short drum-like pulse, dry. Kept for comparison.
//
// The instruments are the listening game's (tools/listening_game.html: pianoNote, partialsNote,
// marimbaNote, bellNote, synthNote), rebuilt with Tone.js so they can be stopped at once and cleaned
// up like the rest of the app's sound. All of it is made in the browser; nothing is recorded.

import * as Tone from 'tone';
import { bandBeat, type BandStrike } from './earthBand';
import { EARTH_PITCH, EARTH_VELOCITY } from './earthVoice';
import { midiToHz, Room } from './instruments';
import { onScanPlaying, scanPlaying } from './scanActivity';

export type EarthSoundId = 'band' | 'piano' | 'plain';

export const EARTH_SOUNDS: { id: EarthSoundId; label: string }[] = [
  { id: 'band', label: 'Piano and band' },
  { id: 'piano', label: 'Piano only' },
  { id: 'plain', label: 'Plain pulse (first version)' },
];
export const DEFAULT_EARTH_SOUND: EarthSoundId = 'band';

/** What the browser tests read (web/e2e/helpers.ts): the audio clock, and how loud the Earth voice
 *  will be at a time, where 1 is a full Earth pulse. A MembraneSynth has both, so the plain pulse
 *  is its own probe. */
export interface EarthProbe {
  immediate(): number;
  envelope: { getValueAtTime(time: number): number };
}

/** What to end when sound is cancelled. */
export interface Silence {
  /** The band's notes too (seek, Stop, Pause). A region switch keeps them: the band is the same for both. */
  band: boolean;
  /** The room's echo too (Stop, Pause). */
  echo: boolean;
}

export interface EarthSound {
  /** One Earth note at an exact audio time. Every note is played the same way. */
  note(time: number, midi: number, dur: number, velocity: number): void;
  /** A beat starts at `time`: every step, missing or not. `beat` counts beats from the start of
   *  play; `beatSeconds` is one beat in audio seconds at the current speed. */
  beat(time: number, beat: number, beatSeconds: number, missing: boolean): void;
  /** End queued and sounding notes now. */
  silence(what: Silence): void;
  /** Before play starts: let sound through again (a silence with echo closed it). */
  open(): void;
  setVolume(db: number): void;
  readonly probe: EarthProbe;
  dispose(): void;
}

export function createEarthSound(id: EarthSoundId, volumeDb: number): EarthSound {
  return id === 'plain' ? new PlainEarthSound(volumeDb) : new MusicalEarthSound(id === 'band', volumeDb);
}

// ---------- The plain pulse (the first version) ----------

class PlainEarthSound implements EarthSound {
  private readonly volume: Tone.Volume;
  private readonly synth: Tone.MembraneSynth;

  constructor(volumeDb: number) {
    this.volume = new Tone.Volume(volumeDb).toDestination();
    // A short drum-like pulse.
    this.synth = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 },
    }).connect(this.volume);
  }

  get probe(): EarthProbe {
    return this.synth;
  }

  note(time: number, midi: number, dur: number, velocity: number): void {
    this.synth.triggerAttackRelease(midiToHz(midi), dur, time, velocity);
  }

  beat(): void {}

  silence(): void {
    const now = Tone.immediate(); // not Tone.now(): that is 0.1 s ahead and would skip the queued pulses
    this.synth.envelope.cancel(now);
    this.synth.triggerRelease(now); // short release ramp from wherever the pulse is: no click
  }

  open(): void {}

  setVolume(db: number): void {
    this.volume.volume.value = db;
  }

  dispose(): void {
    this.synth.dispose();
    this.volume.dispose();
  }
}

// ---------- Notes that can be ended early ----------

/** Time constant of a note ended early (Stop, Pause, a region switch): gone in about 50 ms. */
const DAMP_SECONDS = 0.01;

/** One note being played: what makes it, and how to end it. */
interface Voice {
  /** When it starts: a note can be queued up to 0.1 s ahead (Tone's look-ahead). */
  start: number;
  /** The last gain before the output. Ending the note early closes it. */
  gate: Tone.Gain;
  /** The note's gain at a time (for the probe). */
  level: (time: number) => number;
  sources: Tone.Oscillator[];
  nodes: Tone.ToneAudioNode[];
}

class Voices {
  private readonly live = new Set<Voice>();

  add(voice: Voice): void {
    this.live.add(voice);
    // Every source of a note stops at the same moment: when the first one stops, the note is over.
    // Not in an offline render (the measurements): there Tone runs its clock to the end before any
    // sound is made, so "stopped" would come before the note had played. An offline context is
    // thrown away after its one render, so its notes need no freeing.
    if (!voice.sources[0].context.isOffline) voice.sources[0].onstop = () => this.free(voice);
  }

  /** End every note now, the queued ones too. */
  damp(): void {
    const now = Tone.immediate();
    for (const voice of this.live) {
      voice.gate.gain.cancelAndHoldAtTime(now);
      voice.gate.gain.setTargetAtTime(0, now, DAMP_SECONDS);
      // A note queued to start later still starts, silent, so it stops and is freed like the rest.
      for (const source of voice.sources) source.stop(Math.max(now, voice.start) + 0.08);
    }
  }

  /** The loudest note at a time. */
  levelAt(time: number): number {
    let max = 0;
    for (const voice of this.live) max = Math.max(max, voice.level(time));
    return max;
  }

  dispose(): void {
    for (const voice of [...this.live]) this.free(voice);
  }

  private free(voice: Voice): void {
    if (!this.live.delete(voice)) return;
    for (const source of voice.sources) source.dispose();
    for (const node of voice.nodes) node.dispose();
  }
}

// ---------- The instruments (the listening game's) ----------

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
/** Low notes a little left, high notes a little right, as on a piano. */
const panFor = (hz: number) => clamp(0.25 * Math.log2(hz / 261.63), -0.45, 0.45);

/** A piano string's tone: the fundamental and its overtones, weaker as they go up. */
const PIANO_PARTIALS = [1, 0.6, 0.35, 0.24, 0.14, 0.1, 0.07, 0.045, 0.03, 0.02, 0.014, 0.01];
const PIANO_LEVEL = 0.5;

/** The soft knock of a felt hammer: one quiet noise source, opened for a few ms at each strike.
 *  The noise runs only between Play and Stop or Pause (run, rest), not for the life of the page. */
class Knock {
  private readonly noise: Tone.Noise;
  private readonly felt: Tone.Filter;
  private readonly amp: Tone.Gain;

  constructor(destination: Tone.InputNode) {
    this.amp = new Tone.Gain(0).connect(destination);
    this.felt = new Tone.Filter({ type: 'lowpass', frequency: 2000 }).connect(this.amp);
    this.noise = new Tone.Noise('white').connect(this.felt);
  }

  /** Before play: start the noise (silent until a strike opens it). */
  run(): void {
    if (this.noise.state !== 'started') this.noise.start(Tone.immediate());
  }

  /** Stop and Pause: no strike can come, so the noise stops too. */
  rest(): void {
    if (this.noise.state === 'started') this.noise.stop(Tone.immediate());
  }

  strike(time: number, hz: number, peak: number): void {
    this.felt.frequency.setValueAtTime(Math.min(4000, hz * 6), time);
    this.amp.gain.setValueAtTime(peak * 0.06, time);
    this.amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);
    this.amp.gain.setValueAtTime(0, time + 0.021);
  }

  damp(): void {
    const now = Tone.immediate();
    this.amp.gain.cancelScheduledValues(now);
    this.amp.gain.setValueAtTime(0, now);
  }

  dispose(): void {
    this.noise.dispose();
    this.felt.dispose();
    this.amp.dispose();
  }
}

interface Player {
  voices: Voices;
  destination: Tone.InputNode;
  knock: Knock;
}

/**
 * A warm struck tone on two strings tuned a hair apart (a slow shimmer), bright at first and
 * mellowing as it rings, fading on its own the way a struck string does: a quick drop after the
 * strike, then a long slow fade (low notes ring longer). When the key is let go after `hold`
 * seconds the damper stops it with time constant `damper`. Harder notes are also brighter.
 */
function piano(p: Player, time: number, hz: number, velocity: number, hold: number, damper: number): void {
  const end = time + Math.max(0.08, hold);
  const peak = velocity * PIANO_LEVEL;
  const ring = clamp(2.4 * Math.pow(261.63 / hz, 0.6), 0.6, 5);
  const pan = new Tone.Panner(panFor(hz)).connect(p.destination);
  const env = new Tone.Gain(0).connect(pan);
  const tone = new Tone.Filter({ type: 'lowpass', Q: 0.4 }).connect(env);
  // Low notes keep enough overtones to be heard on small speakers.
  tone.frequency.setValueAtTime(clamp(hz * (5 + 12 * velocity), 2500, 18000), time);
  tone.frequency.setTargetAtTime(clamp(hz * 2.5 + 500, 1500, 9000), time + 0.01, 0.35);
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(peak, time + 0.003);
  env.gain.setTargetAtTime(peak * 0.4, time + 0.003, 0.12); // the quick drop after the strike
  if (end > time + 0.35) env.gain.setTargetAtTime(0, time + 0.35, ring); // then the long, slow fade
  env.gain.setTargetAtTime(0, end, damper); // key let go: the damper
  const stop = end + 8 * damper + 0.05;
  const sources = [-1.3, 1.3].map((cents) =>
    new Tone.Oscillator({ type: 'custom', partials: PIANO_PARTIALS, frequency: hz, detune: cents }).connect(tone).start(time).stop(stop),
  );
  p.knock.strike(time, hz, peak);
  p.voices.add({ start: time, gate: env, level: (t) => env.gain.getValueAtTime(t), sources, nodes: [tone, env, pan] });
}

/** Sine tones with their own fade times: the engine of the marimba and the bell. Each partial is
 *  [ratio to the note, loudness, fade time constant in seconds]. */
function partials(p: Player, time: number, hz: number, velocity: number, hold: number, damper: number, level: number, list: [number, number, number][]): void {
  const end = time + Math.max(0.08, hold);
  const peak = velocity * level;
  const pan = new Tone.Panner(panFor(hz)).connect(p.destination);
  const out = new Tone.Gain(1).connect(pan);
  out.gain.setValueAtTime(1, time);
  out.gain.setTargetAtTime(0, end, damper); // key let go: the damper
  const stop = end + 8 * damper + 0.05;
  const sources: Tone.Oscillator[] = [];
  const envs: Tone.Gain[] = [];
  for (const [ratio, amp, fade] of list) {
    if (hz * ratio > 16000) continue;
    const env = new Tone.Gain(0).connect(out);
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(peak * amp, time + 0.002);
    env.gain.setTargetAtTime(0, time + 0.002, fade);
    sources.push(new Tone.Oscillator(hz * ratio, 'sine').connect(env).start(time).stop(stop));
    envs.push(env);
  }
  if (!sources.length) {
    out.dispose();
    pan.dispose();
    return;
  }
  // The lowest tone is the loudest and rings longest: it stands for the note's level.
  const level0 = (t: number) => out.gain.getValueAtTime(t) * envs[0].gain.getValueAtTime(t);
  p.voices.add({ start: time, gate: out, level: level0, sources, nodes: [...envs, out, pan] });
}

/** A wooden bar struck with a soft mallet: a strong fundamental, a bar overtone near four times
 *  the pitch that dies fast, and a little of the ninth. Low bars ring a little longer. */
function marimba(p: Player, time: number, hz: number, velocity: number, hold: number, damper: number): void {
  const ring = clamp(0.6 * Math.pow(261.63 / hz, 0.5), 0.25, 1.1);
  partials(p, time, hz, velocity, hold, damper, 0.62, [[1, 1, ring], [3.93, 0.32, ring * 0.22], [9.2, 0.07, ring * 0.08]]);
}

/** A bright metal bar: overtones that are not whole multiples of the pitch, so it chimes. */
function bell(p: Player, time: number, hz: number, velocity: number, hold: number, damper: number): void {
  const ring = clamp(1.5 * Math.pow(261.63 / hz, 0.3), 0.6, 2.2);
  partials(p, time, hz, velocity, hold, Math.max(damper, 0.1), 0.42,
    [[1, 1, ring], [2.76, 0.42, ring * 0.45], [5.4, 0.22, ring * 0.2], [8.93, 0.1, ring * 0.1]]);
}

/** Two gently detuned saw waves through a warm filter that closes a little after the start. It
 *  rises over `attack` seconds, holds for the whole note, then fades out. */
function synth(p: Player, time: number, hz: number, velocity: number, hold: number, damper: number, attack: number, level: number): void {
  const end = time + Math.max(0.08, hold);
  const peak = velocity * level;
  const pan = new Tone.Panner(panFor(hz)).connect(p.destination);
  const env = new Tone.Gain(0).connect(pan);
  const tone = new Tone.Filter({ type: 'lowpass', Q: 0.7 }).connect(env);
  tone.frequency.setValueAtTime(Math.min(12000, hz * 7), time);
  tone.frequency.setTargetAtTime(Math.min(6000, hz * 3 + 300), time + attack, 0.25);
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(peak, time + attack);
  env.gain.setTargetAtTime(peak * 0.75, time + attack, 0.2);
  env.gain.setTargetAtTime(0, end, damper * 1.5);
  const stop = end + 12 * damper + 0.05;
  const sources = [-7, 7].map((cents) =>
    new Tone.Oscillator({ type: 'sawtooth', frequency: hz, detune: cents }).connect(tone).start(time).stop(stop),
  );
  p.voices.add({ start: time, gate: env, level: (t) => env.gain.getValueAtTime(t), sources, nodes: [tone, env, pan] });
}

/** One note of the band, with the game's settings for each part. */
function playStrike(p: Player, s: BandStrike, time: number, beatSeconds: number): void {
  const hz = midiToHz(s.note);
  const hold = s.beats * beatSeconds + s.pedal;
  switch (s.instrument) {
    case 'piano':
      return piano(p, time, hz, s.velocity, hold, 0.12);
    case 'bassSynth':
      return synth(p, time, hz, s.velocity, hold, 0.2, 0.08, 0.12); // warm synth under the bass
    case 'pad':
      return synth(p, time, hz, s.velocity, hold, 0.25, 0.35, 0.05); // swells in: no attack, marks no time
    case 'marimba':
      return marimba(p, time, hz, s.velocity, hold, 0.12);
  }
}

// ---------- Piano, and piano with the band ----------

/** Ears and laptop speakers hear low notes as quieter: lift them, soften high ones (1 at G4). */
const balance = (hz: number) => clamp(Math.pow(392 / hz, 0.45), 0.5, 1.6);

/** Damper of an Earth note. Every Earth note is held for its `dur` (the same for all of them,
 *  earthVoice.ts) and then damped this way, so how long it rings never depends on the gap after it. */
const PULSE_DAMPER = 0.07;
/** The quiet bell on each Earth note, for sparkle, relative to the piano (the game's 0.22). */
const PULSE_BELL = 0.22;
/** The small room around the music. Light, so the short gap stays clean (measured: earth_sound.md). */
const ROOM = { wet: 0.22, decay: 1.8 };
/** Fixed gain so the musical sounds are about as loud as the plain pulse at the same Volume.
 *  Measured with 0 here: plain −23.9 LUFS, piano −20.1, piano and band −19.2 (earth_sound.md). */
const MUSIC_TRIM_DB = -4;
/** How fast the band fades when a picture scan starts, and comes back when it stops. */
const BAND_FADE_SECONDS = 0.25;

/** An Earth note at full strength (EARTH_VELOCITY on E4): the probe's 1. */
const FULL_PULSE = EARTH_VELOCITY * balance(midiToHz(EARTH_PITCH)) * PIANO_LEVEL;

class MusicalEarthSound implements EarthSound {
  private readonly room: Room;
  private readonly volume: Tone.Volume;
  private readonly pulses: Player;
  private readonly band: (Player & { bus: Tone.Gain }) | null = null;
  /** The beat the band last played, to tell a beat that follows on from a fresh start. */
  private lastBeat = NaN;
  private ducked = false;
  private stopListening: () => void = () => {};
  readonly probe: EarthProbe;

  constructor(withBand: boolean, volumeDb: number) {
    this.room = new Room(ROOM.wet, ROOM.decay);
    this.volume = new Tone.Volume(volumeDb + MUSIC_TRIM_DB).connect(this.room.input);
    this.pulses = { voices: new Voices(), destination: this.volume, knock: new Knock(this.volume) };
    if (withBand) {
      this.ducked = scanPlaying();
      const bus = new Tone.Gain(this.ducked ? 0 : 1).connect(this.volume);
      this.band = { voices: new Voices(), destination: bus, knock: new Knock(bus), bus };
      this.stopListening = onScanPlaying((on) => this.duck(on));
    }
    this.probe = {
      immediate: () => Tone.immediate(),
      envelope: {
        getValueAtTime: (t: number) => Math.max(this.pulses.voices.levelAt(t), this.band?.voices.levelAt(t) ?? 0) / FULL_PULSE,
      },
    };
  }

  note(time: number, midi: number, dur: number, velocity: number): void {
    const hz = midiToHz(midi);
    const v = velocity * balance(hz);
    piano(this.pulses, time, hz, v, dur, PULSE_DAMPER);
    bell(this.pulses, time, hz, v * PULSE_BELL, dur, PULSE_DAMPER);
  }

  beat(time: number, beat: number, beatSeconds: number, missing: boolean): void {
    if (!this.band) return;
    const fresh = beat !== this.lastBeat + 1;
    if (this.ducked) {
      this.lastBeat = NaN; // when the band comes back, it starts with a chord
      return;
    }
    this.lastBeat = beat;
    window.__earthBand?.push({ audioTime: time, beat, missing });
    for (const strike of bandBeat(beat, fresh, missing)) playStrike(this.band, strike, time, beatSeconds);
  }

  silence(what: Silence): void {
    this.pulses.voices.damp();
    this.pulses.knock.damp();
    if (what.band && this.band) {
      this.band.voices.damp();
      this.band.knock.damp();
      this.lastBeat = NaN;
    }
    if (what.echo) {
      // Stop and Pause: the room's echo ends, and nothing will strike until the next Play.
      this.room.close();
      this.pulses.knock.rest();
      this.band?.knock.rest();
    }
  }

  open(): void {
    this.room.open();
    this.pulses.knock.run();
    this.band?.knock.run();
  }

  setVolume(db: number): void {
    this.volume.volume.value = db + MUSIC_TRIM_DB;
  }

  dispose(): void {
    this.stopListening();
    this.pulses.voices.dispose();
    this.pulses.knock.dispose();
    if (this.band) {
      this.band.voices.dispose();
      this.band.knock.dispose();
      this.band.bus.dispose();
    }
    this.volume.dispose();
    this.room.dispose();
  }

  /** A picture scan started (on) or the last one stopped: the band fades out or comes back. */
  private duck(on: boolean): void {
    if (!this.band) return;
    this.ducked = on;
    const now = Tone.immediate();
    this.band.bus.gain.cancelAndHoldAtTime(now);
    this.band.bus.gain.setTargetAtTime(on ? 0 : 1, now, BAND_FADE_SECONDS / 3);
  }
}

/** Development-only record of every beat the band played, with its exact audio time. The browser
 *  tests use it to check that the band only ever sounds on beat starts. Absent in production. */
export interface BandLogEntry {
  audioTime: number;
  beat: number;
  missing: boolean;
}
declare global {
  interface Window {
    __earthBand?: BandLogEntry[];
  }
}
if (import.meta.env.DEV && typeof window !== 'undefined') window.__earthBand = [];
