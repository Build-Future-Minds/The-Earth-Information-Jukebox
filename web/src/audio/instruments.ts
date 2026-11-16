// Play-along sounds: the sound library for the picture scan and the melody keys.
// Every sound here is synthesised by this code in the browser (no samples, no recordings), and
// none of it touches the Earth voice, which keeps its own synth and its own path to the speakers.
//
// Why these sounds (docs/mapping_spec.md, "The picture scan: what Listen plays"):
// - Struck bars. A marimba, glockenspiel or music-box note is a few pure tones that fade at
//   different speeds. Where the tones lie comes from how the bar is held:
//     free at both ends (glockenspiel): frequencies in the ratio (x_n / x_1)^2 with
//       cos(x) cosh(x) = 1, x = 4.73004, 7.85320, 10.99561, 14.13717  ->  1 : 2.7565 : 5.4039 : 8.9330
//     clamped at one end (a music-box tooth, a kalimba tine): cos(x) cosh(x) = -1,
//       x = 1.87510, 4.69409, 7.85476  ->  1 : 6.2669 : 17.5475
//   (both computed 15 Nov; the Stanford CCRMA course page gives the free bar as 1 : 2.76 : 5.40).
//   Marimba bars are carved underneath so the second tone is two octaves up ("a ratio of 4.0") and
//   the third "around 9.2 times the fundamental" (same page). Wood fades much faster than steel.
//   docs/DECISIONS.md, source S12.
// - Choir pad. Slightly detuned saw waves through a low-pass filter and two vowel-like peaks. A
//   little vibrato, at three slightly different speeds so the voices do not wobble together, and a
//   tone that gets brighter as it gets louder, as voices and strings do.
// - Bass. The low root with its octave and its fifth, so the chord is clear and can be heard on
//   small speakers. A new root fades in while the old one fades out, as a player changes note.
// - Room. A reverb puts every play-along sound in one space; a gate after it lets Stop end the
//   echo at once.

import * as Tone from 'tone';

export const midiToHz = (note: number): number => Tone.Frequency(note, 'midi').toFrequency();

// ---------- Output: one limiter for all play-along sound, one room per source ----------

let master: Tone.Limiter | null = null;
/** Play-along sounds meet here. The limiter keeps many notes at once from clipping. */
function masterOut(): Tone.Limiter {
  return (master ??= new Tone.Limiter(-3).toDestination());
}

/** A reverb with a gate after it. Closing the gate silences the echo too, which a reverb alone cannot do. */
export class Room {
  readonly input: Tone.Gain;
  private readonly reverb: Tone.Reverb;
  private readonly gate: Tone.Gain;

  constructor(wet = 0.3, decay = 4) {
    this.gate = new Tone.Gain(1).connect(masterOut());
    this.reverb = new Tone.Reverb({ decay, preDelay: 0.03, wet }).connect(this.gate);
    this.input = new Tone.Gain(1).connect(this.reverb);
  }

  /** Silence at once, echo included (Stop, Esc). */
  close(): void {
    const now = Tone.immediate();
    this.gate.gain.cancelScheduledValues(now);
    this.gate.gain.setTargetAtTime(0, now, 0.012);
  }

  /** Let sound through again, before a new note. */
  open(): void {
    const now = Tone.immediate();
    this.gate.gain.cancelScheduledValues(now);
    this.gate.gain.setTargetAtTime(1, now, 0.01);
  }

  dispose(): void {
    this.input.dispose();
    this.reverb.dispose();
    this.gate.dispose();
  }
}

// ---------- Struck bars: marimba, glockenspiel, kalimba, music box ----------

export interface BarPartial {
  /** Frequency as a multiple of the note's lowest tone. */
  ratio: number;
  /** Loudness relative to the lowest tone, at a full-strength strike. */
  gain: number;
  /** Ring time as a share of the lowest tone's ring time. */
  ring: number;
}

export interface BarModel {
  partials: BarPartial[];
  /** Seconds for the lowest tone to fade by 60 dB, for a note of this frequency. Low notes ring longer. */
  ringSeconds: (hz: number) => number;
  /** A second, quieter copy of the lowest tone this many Hz above it. The two drift in and out of
   *  step about once a second, which is the slow shimmer of a ringing metal bar. */
  shimmerHz?: number;
  /** Loudness of the mallet's knock: a few milliseconds of soft noise at the strike. */
  knock?: number;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Rosewood bar, tuned 1 : 4 : 9.2, short ring, with the knock of a soft mallet. */
export const MARIMBA: BarModel = {
  partials: [
    { ratio: 1, gain: 1, ring: 1 },
    { ratio: 4, gain: 0.3, ring: 0.3 },
    { ratio: 9.2, gain: 0.1, ring: 0.08 },
  ],
  ringSeconds: (hz) => clamp(1.1 * Math.sqrt(262 / hz), 0.35, 1.6),
  knock: 0.12,
};

/** Steel bar, the free-bar series 1 : 2.7565 : 5.4039 : 8.9330, long ring with a slow shimmer. */
export const GLOCKENSPIEL: BarModel = {
  partials: [
    { ratio: 1, gain: 1, ring: 1 },
    { ratio: 2.7565, gain: 0.32, ring: 0.4 },
    { ratio: 5.4039, gain: 0.16, ring: 0.15 },
    { ratio: 8.933, gain: 0.06, ring: 0.06 },
  ],
  ringSeconds: (hz) => clamp(2.0 * Math.sqrt(1047 / hz), 0.9, 2.6),
  shimmerHz: 1.3,
};

/** A tine clamped at one end over a wooden box: 1 : 6.2669 : 17.5475, short ring, a thumb's pluck. */
export const KALIMBA: BarModel = {
  partials: [
    { ratio: 1, gain: 1, ring: 1 },
    { ratio: 6.2669, gain: 0.14, ring: 0.12 },
    { ratio: 17.5475, gain: 0.05, ring: 0.04 },
  ],
  ringSeconds: (hz) => clamp(1.0 * Math.sqrt(262 / hz), 0.35, 1.5),
  knock: 0.07,
};

/** A steel music-box tooth: the same clamped series, ringing long. */
export const MUSIC_BOX: BarModel = {
  partials: [
    { ratio: 1, gain: 1, ring: 1 },
    { ratio: 6.2669, gain: 0.2, ring: 0.3 },
    { ratio: 17.5475, gain: 0.07, ring: 0.1 },
  ],
  ringSeconds: (hz) => clamp(2.2 * Math.sqrt(1047 / hz), 0.9, 2.8),
};

/** The first version's marimba and bells (no knock, no shimmer, three tones), kept for comparison. */
export const FIRST_MARIMBA: BarModel = { partials: MARIMBA.partials, ringSeconds: MARIMBA.ringSeconds };
export const FIRST_BELLS: BarModel = {
  partials: GLOCKENSPIEL.partials.slice(0, 3),
  ringSeconds: (hz) => clamp(2.4 * Math.sqrt(1047 / hz), 1.0, 3.2),
};

/** The ear stops hearing partials above this as pitch; leaving them out also avoids aliasing. */
const HIGHEST_PARTIAL_HZ = 12000;
/** A decay of 60 dB takes ln(1000) ≈ 6.908 time constants. */
const T60_TO_TAU = 1 / Math.log(1000);
/** The shimmer copy of the lowest tone, relative to the tone itself. */
const SHIMMER_GAIN = 0.35;

interface Ringing {
  oscillators: Tone.Oscillator[];
  amps: Tone.Gain[];
}

/** A struck instrument: every strike is a few sine tones, each with its own fade. */
export class BarInstrument {
  readonly output: Tone.Gain;
  private ringing = new Set<Ringing>();
  private readonly knock: { noise: Tone.Noise; filter: Tone.Filter; amp: Tone.Gain } | null = null;

  constructor(private readonly model: BarModel, level = 0.5) {
    this.output = new Tone.Gain(level);
    if (model.knock) {
      // One quiet noise source for the whole instrument; each strike opens it for a few milliseconds.
      const amp = new Tone.Gain(0).connect(this.output);
      const filter = new Tone.Filter({ type: 'bandpass', frequency: 1600, Q: 0.7 }).connect(amp);
      const noise = new Tone.Noise('pink').connect(filter).start();
      this.knock = { noise, filter, amp };
    }
  }

  /** Strike a note at an exact audio time. Velocity 0–1: harder strikes are louder and brighter. */
  strike(note: number, time: number, velocity: number): void {
    const hz = midiToHz(note);
    const ring = this.model.ringSeconds(hz);
    const v = clamp(velocity, 0, 1);
    const voice: Ringing = { oscillators: [], amps: [] };
    const tone = (f: number, peak: number, t60: number) => {
      const amp = new Tone.Gain(0).connect(this.output);
      const osc = new Tone.Oscillator(f, 'sine').connect(amp);
      amp.gain.setValueAtTime(0, time);
      amp.gain.linearRampToValueAtTime(peak, time + 0.003); // 3 ms rise: a clean knock without a click
      amp.gain.setTargetAtTime(0, time + 0.003, t60 * T60_TO_TAU);
      osc.start(time).stop(time + 0.003 + t60 * 1.15);
      voice.oscillators.push(osc);
      voice.amps.push(amp);
    };
    for (const partial of this.model.partials) {
      const f = hz * partial.ratio;
      if (f > HIGHEST_PARTIAL_HZ) continue;
      // Soft strikes lose their upper tones first, as a soft mallet does.
      const brightness = partial.ratio === 1 ? 1 : 0.4 + 0.6 * v;
      tone(f, v * v * partial.gain * brightness, ring * partial.ring);
      if (partial.ratio === 1 && this.model.shimmerHz) tone(f + this.model.shimmerHz, v * v * SHIMMER_GAIN, ring);
    }
    if (voice.oscillators.length === 0) return;
    if (this.knock && this.model.knock) {
      const g = this.knock.amp.gain;
      g.cancelScheduledValues(time);
      g.setValueAtTime(0, time);
      g.linearRampToValueAtTime(this.model.knock * v * v, time + 0.0015);
      g.setTargetAtTime(0, time + 0.0015, 0.007);
    }
    this.ringing.add(voice);
    // The lowest tone rings longest and is always first: when it ends, the note is over.
    voice.oscillators[0].onstop = () => this.free(voice);
  }

  /** Stop every ringing note quickly (Stop, Pause). */
  damp(): void {
    const now = Tone.immediate();
    for (const voice of this.ringing) {
      for (const amp of voice.amps) {
        amp.gain.cancelScheduledValues(now);
        amp.gain.setTargetAtTime(0, now, 0.012);
      }
      for (const osc of voice.oscillators) osc.stop(now + 0.1);
    }
    if (this.knock) {
      this.knock.amp.gain.cancelScheduledValues(now);
      this.knock.amp.gain.setTargetAtTime(0, now, 0.005);
    }
  }

  dispose(): void {
    for (const voice of [...this.ringing]) this.free(voice);
    if (this.knock) {
      this.knock.noise.dispose();
      this.knock.filter.dispose();
      this.knock.amp.dispose();
    }
    this.output.dispose();
  }

  private free(voice: Ringing): void {
    if (!this.ringing.delete(voice)) return;
    for (const osc of voice.oscillators) osc.dispose();
    for (const amp of voice.amps) amp.dispose();
  }
}

// ---------- Held notes for the picture scan: the choir and the bass ----------

export interface ChoirDef {
  wave: 'sawtooth' | 'triangle';
  /** Slightly detuned copies of each note, and how far apart they are in cents. */
  copies: number;
  spread: number;
  /** Low-pass cutoff in Hz when the line is quiet and when it is loud: louder is brighter. */
  lowpass: [number, number];
  /** Two vowel-like peaks ("ah"), for a tone closer to voices. */
  vowels: boolean;
  /** Depth of the vibrato in cents (0 for none). */
  vibratoCents: number;
  /** One band's held note at full level. */
  gain: number;
}

/** The mean level along the line that counts as fully loud for the choir's brightness. */
const BRIGHT_AT_MEAN = 0.4;

/**
 * One held note per band. All notes run all the time at level 0; the scan only moves their
 * levels, so a level of 0 really is silence.
 */
export class ScanChoir {
  readonly output: Tone.Gain;
  private readonly voices: { osc: Tone.FatOscillator; amp: Tone.Gain }[] = [];
  private readonly lowpass: Tone.Filter;
  private readonly nodes: (Tone.ToneAudioNode | Tone.LFO)[] = [];

  constructor(bandNotes: number[], private readonly def: ChoirDef) {
    this.output = new Tone.Gain(1);
    let next: Tone.ToneAudioNode = this.output;
    if (def.vowels) {
      // "Ah"-like peaks near 700 and 1150 Hz: closer to voices than to a buzzing saw.
      const vowelHigh = new Tone.Filter({ type: 'peaking', frequency: 1150, Q: 3, gain: 3 }).connect(next);
      const vowelLow = new Tone.Filter({ type: 'peaking', frequency: 700, Q: 2, gain: 4 }).connect(vowelHigh);
      this.nodes.push(vowelHigh, vowelLow);
      next = vowelLow;
    }
    this.lowpass = new Tone.Filter({ type: 'lowpass', frequency: def.lowpass[0], Q: 0.6 }).connect(next);

    // Vibrato at three speeds, shared out among the notes: an ensemble, not one wobbling organ.
    const vibrato =
      def.vibratoCents > 0
        ? [4.6, 5.3, 6.1].map((hz) => new Tone.LFO({ frequency: hz, min: -def.vibratoCents, max: def.vibratoCents }).start())
        : [];
    this.nodes.push(...vibrato);

    bandNotes.forEach((note, band) => {
      const amp = new Tone.Gain(0).connect(this.lowpass);
      const osc = new Tone.FatOscillator({ frequency: midiToHz(note), type: def.wave, count: def.copies, spread: def.spread }).connect(amp).start();
      if (vibrato.length) vibrato[band % vibrato.length].connect(osc.detune);
      this.voices.push({ osc, amp });
    });
  }

  /**
   * Move every band to its level (0–1), smoothly from `time`. `mean` is the line's mean level: it
   * opens the tone, so a louder passage is also a brighter one (the same quantity, no new data).
   * `trim` is one fixed loudness setting for the whole scan (scanPlayer.ts).
   */
  setLevels(levels: ArrayLike<number>, mean: number, time: number, smoothSeconds: number, trim = 1): void {
    this.voices.forEach((voice, band) => voice.amp.gain.setTargetAtTime((levels[band] ?? 0) * this.def.gain * trim, time, smoothSeconds));
    const [dark, bright] = this.def.lowpass;
    if (bright !== dark) {
      this.lowpass.frequency.setTargetAtTime(dark + (bright - dark) * clamp(mean / BRIGHT_AT_MEAN, 0, 1), time, smoothSeconds * 3);
    }
  }

  /** Fade every note out now. */
  silence(): void {
    const now = Tone.immediate();
    for (const { amp } of this.voices) {
      amp.gain.cancelScheduledValues(now);
      amp.gain.setTargetAtTime(0, now, 0.03);
    }
  }

  dispose(): void {
    for (const { osc, amp } of this.voices) {
      osc.dispose();
      amp.dispose();
    }
    this.lowpass.dispose();
    for (const node of this.nodes) node.dispose();
    this.output.dispose();
  }
}

/** The low root under the choir. Which note it plays is decoration; how loud it is comes from the picture. */
export interface ScanBass {
  readonly output: Tone.ToneAudioNode;
  /** Move to another root at `time`. `jump`: at once, for the start of a sweep. */
  setRoot(note: number, time: number, jump?: boolean): void;
  setLevel(level: number, time: number, smoothSeconds: number): void;
  silence(): void;
  dispose(): void;
}

/** The first version's bass: one saw wave that slides to each new note. Kept for comparison. */
class PlainBass implements ScanBass {
  readonly output: Tone.Gain;
  private readonly osc: Tone.Oscillator;
  private readonly amp: Tone.Gain;
  private readonly lowpass: Tone.Filter;

  constructor(private readonly gain: number) {
    this.output = new Tone.Gain(1);
    this.lowpass = new Tone.Filter({ type: 'lowpass', frequency: 1500, Q: 0.6 }).connect(this.output);
    this.amp = new Tone.Gain(0).connect(this.lowpass);
    this.osc = new Tone.Oscillator(midiToHz(36), 'sawtooth').connect(this.amp).start();
  }
  setRoot(note: number, time: number, jump = false): void {
    if (jump) this.osc.frequency.setValueAtTime(midiToHz(note), time);
    else this.osc.frequency.setTargetAtTime(midiToHz(note), time, 0.03);
  }
  setLevel(level: number, time: number, smoothSeconds: number): void {
    this.amp.gain.setTargetAtTime(level * this.gain, time, smoothSeconds);
  }
  silence(): void {
    const now = Tone.immediate();
    this.amp.gain.cancelScheduledValues(now);
    this.amp.gain.setTargetAtTime(0, now, 0.03);
  }
  dispose(): void {
    this.osc.dispose();
    this.amp.dispose();
    this.lowpass.dispose();
    this.output.dispose();
  }
}

/** How long a new root takes to fade in while the old one fades out. */
const BASS_CHANGE_SECONDS = 0.4;

/**
 * Root, octave and fifth. The root is a saw wave kept warm by a low-pass at 480 Hz; the octave
 * and the fifth above it are what a small speaker can actually play, and they make the chord
 * clear. Two sets of the three take turns: at a chord change the next set fades in on the new
 * note while the other fades out, so the pitch never slides.
 */
class RichBass implements ScanBass {
  readonly output: Tone.Gain;
  private readonly level: Tone.Gain;
  private readonly lowpass: Tone.Filter;
  private readonly sets: { oscillators: Tone.Oscillator[]; mix: Tone.Gain[]; amp: Tone.Gain }[] = [];
  private active = 0;
  /** Each voice: semitones above the root, wave and share of the mix. */
  private static readonly VOICES = [
    { above: 0, wave: 'sawtooth', mix: 0.8 },
    { above: 12, wave: 'triangle', mix: 0.55 },
    { above: 19, wave: 'sine', mix: 0.22 },
  ] as const;

  constructor(private readonly gain: number) {
    this.output = new Tone.Gain(1);
    this.level = new Tone.Gain(0).connect(this.output);
    this.lowpass = new Tone.Filter({ type: 'lowpass', frequency: 480, Q: 0.7 }).connect(this.level);
    for (let i = 0; i < 2; i++) {
      const amp = new Tone.Gain(i === 0 ? 1 : 0).connect(this.lowpass);
      const mix = RichBass.VOICES.map((v) => new Tone.Gain(v.mix).connect(amp));
      const oscillators = RichBass.VOICES.map((v, k) => new Tone.Oscillator(midiToHz(36 + v.above), v.wave).connect(mix[k]).start());
      this.sets.push({ oscillators, mix, amp });
    }
  }

  setRoot(note: number, time: number, jump = false): void {
    const tune = (set: (typeof this.sets)[number]) =>
      set.oscillators.forEach((osc, k) => osc.frequency.setValueAtTime(midiToHz(note + RichBass.VOICES[k].above), time));
    const from = this.sets[this.active];
    if (jump) {
      tune(from);
      this.sets.forEach((set, i) => {
        set.amp.gain.cancelScheduledValues(time);
        set.amp.gain.setValueAtTime(i === this.active ? 1 : 0, time);
      });
      return;
    }
    this.active = 1 - this.active;
    const to = this.sets[this.active];
    tune(to);
    for (const [set, start, end] of [[from, 1, 0], [to, 0, 1]] as const) {
      set.amp.gain.cancelScheduledValues(time);
      set.amp.gain.setValueAtTime(start, time);
      set.amp.gain.linearRampToValueAtTime(end, time + BASS_CHANGE_SECONDS);
    }
  }

  setLevel(level: number, time: number, smoothSeconds: number): void {
    this.level.gain.setTargetAtTime(level * this.gain, time, smoothSeconds);
  }

  silence(): void {
    const now = Tone.immediate();
    this.level.gain.cancelScheduledValues(now);
    this.level.gain.setTargetAtTime(0, now, 0.03);
  }

  dispose(): void {
    for (const set of this.sets) {
      for (const osc of set.oscillators) osc.dispose();
      for (const g of set.mix) g.dispose();
      set.amp.dispose();
    }
    this.lowpass.dispose();
    this.level.dispose();
    this.output.dispose();
  }
}

// ---------- The scan's sound library ----------

export type ScanSoundId = 'ocean' | 'musicbox' | 'first';

/**
 * One complete sound for the picture scan. All of them play the same score: the same notes at the
 * same times from the same picture. Only the instruments differ, so choosing one changes how the
 * picture sounds and never what it says.
 */
export interface ScanSoundDef {
  id: ScanSoundId;
  label: string;
  /** Names for the legend: what the round and the diamond marks are played on, and the held notes. */
  warmName: string;
  coolName: string;
  heldName: string;
  choir: ChoirDef;
  bass: 'rich' | 'plain';
  /** The bass at full level. */
  bassGain: number;
  /** Red and orange spots, and how loud the instrument is. */
  warm: BarModel;
  warmLevel: number;
  /** Yellow-green, green and blue spots. */
  cool: BarModel;
  coolLevel: number;
  room: { wet: number; decay: number };
}

/** Levels were set from recordings of the NASA frame, so the three are about equally loud. */
export const SCAN_SOUNDS: ScanSoundDef[] = [
  {
    id: 'ocean',
    label: 'Ocean choir',
    warmName: 'marimba',
    coolName: 'bells',
    heldName: 'choir',
    choir: { wave: 'sawtooth', copies: 3, spread: 14, lowpass: [1100, 2400], vowels: true, vibratoCents: 4, gain: 0.28 },
    bass: 'rich',
    bassGain: 0.5,
    warm: MARIMBA,
    warmLevel: 0.5,
    cool: GLOCKENSPIEL,
    coolLevel: 0.3,
    room: { wet: 0.36, decay: 5 },
  },
  {
    id: 'musicbox',
    label: 'Music box',
    warmName: 'kalimba',
    coolName: 'music box',
    heldName: 'soft organ',
    choir: { wave: 'triangle', copies: 2, spread: 8, lowpass: [1800, 3200], vowels: false, vibratoCents: 3, gain: 0.4 },
    bass: 'rich',
    bassGain: 0.4,
    warm: KALIMBA,
    warmLevel: 0.42,
    cool: MUSIC_BOX,
    coolLevel: 0.26,
    room: { wet: 0.32, decay: 3.5 },
  },
  {
    id: 'first',
    label: 'Plain (first instruments)',
    warmName: 'marimba',
    coolName: 'bells',
    heldName: 'choir',
    choir: { wave: 'sawtooth', copies: 3, spread: 14, lowpass: [1500, 1500], vowels: true, vibratoCents: 0, gain: 0.28 },
    bass: 'plain',
    bassGain: 0.3,
    warm: FIRST_MARIMBA,
    warmLevel: 0.5,
    cool: FIRST_BELLS,
    coolLevel: 0.3,
    room: { wet: 0.34, decay: 4.5 },
  },
];
export const DEFAULT_SCAN_SOUND: ScanSoundId = 'ocean';

export function scanSound(id: ScanSoundId): ScanSoundDef {
  return SCAN_SOUNDS.find((s) => s.id === id) ?? SCAN_SOUNDS[0];
}

export function createScanBass(def: ScanSoundDef): ScanBass {
  return def.bass === 'rich' ? new RichBass(def.bassGain) : new PlainBass(def.bassGain);
}

// ---------- Melody instruments (the keys) ----------

export type MelodyInstrumentId = 'glass' | 'marimba' | 'bells' | 'musicbox' | 'choir' | 'plain';

export const MELODY_INSTRUMENTS: { id: MelodyInstrumentId; label: string }[] = [
  { id: 'glass', label: 'Glass keys' },
  { id: 'marimba', label: 'Marimba' },
  { id: 'bells', label: 'Bells' },
  { id: 'musicbox', label: 'Music box' },
  { id: 'choir', label: 'Choir pad' },
  { id: 'plain', label: 'Plain tone (first version)' },
];
export const DEFAULT_MELODY_INSTRUMENT: MelodyInstrumentId = 'glass';

export interface MelodyInstrument {
  readonly output: Tone.ToneAudioNode;
  /** true: a struck note rings and fades by itself, so letting go of the key changes nothing. */
  readonly struck: boolean;
  /** Voices sounding or fading. Struck instruments report 0: their notes always end by themselves. */
  readonly activeVoices: number;
  attack(note: number, time: number, velocity: number): void;
  release(note: number, time: number): void;
  /** End notes that ring by themselves. Held instruments do nothing here: their notes are let go
   *  one by one with release(), so no voice is ever left unmarked. */
  damp(): void;
  dispose(): void;
}

class HeldInstrument implements MelodyInstrument {
  readonly struck = false;
  constructor(
    private readonly synth: Tone.PolySynth<Tone.Synth | Tone.FMSynth>,
    readonly output: Tone.ToneAudioNode,
    private readonly extra: Tone.ToneAudioNode[] = [],
  ) {}
  get activeVoices(): number {
    return this.synth.activeVoices;
  }
  attack(note: number, time: number, velocity: number): void {
    this.synth.triggerAttack(midiToHz(note), time, velocity);
  }
  release(note: number, time: number): void {
    this.synth.triggerRelease(midiToHz(note), time);
  }
  damp(): void {}
  dispose(): void {
    this.synth.dispose();
    for (const node of this.extra) node.dispose();
  }
}

class StruckInstrument implements MelodyInstrument {
  readonly struck = true;
  readonly activeVoices = 0;
  private readonly bars: BarInstrument;
  readonly output: Tone.ToneAudioNode;
  constructor(model: BarModel, level: number) {
    this.bars = new BarInstrument(model, level);
    this.output = this.bars.output;
  }
  attack(note: number, time: number, velocity: number): void {
    this.bars.strike(note, time, velocity);
  }
  release(): void {}
  damp(): void {
    this.bars.damp();
  }
  dispose(): void {
    this.bars.dispose();
  }
}

/** Build a melody instrument. Call after audio has started (a user press). The level of each was
 *  set by recording the same short phrase on all of them, so changing the sound does not change
 *  the loudness much. */
export function createMelodyInstrument(id: MelodyInstrumentId): MelodyInstrument {
  switch (id) {
    case 'marimba':
      return new StruckInstrument(MARIMBA, 1.1);
    case 'bells':
      return new StruckInstrument(GLOCKENSPIEL, 0.7);
    case 'musicbox':
      return new StruckInstrument(MUSIC_BOX, 0.8);
    case 'choir': {
      const lowpass = new Tone.Filter({ type: 'lowpass', frequency: 2200, Q: 0.6 });
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 22 },
        envelope: { attack: 0.18, decay: 0.2, sustain: 0.85, release: 0.4 },
      }).connect(lowpass);
      synth.volume.value = -3.5;
      return new HeldInstrument(synth, lowpass, [lowpass]);
    }
    case 'plain': {
      // The first version's sound, kept for comparison.
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.4 },
      });
      synth.volume.value = -5;
      return new HeldInstrument(synth, synth);
    }
    case 'glass':
    default: {
      // A sine whose pitch is wobbled three times as fast as it sounds, strongly at the strike and
      // barely after: a glassy knock that settles into a soft, clear tone while the key is held.
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3,
        modulationIndex: 2.4,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.004, decay: 1.4, sustain: 0.28, release: 0.4 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.002, decay: 0.45, sustain: 0.08, release: 0.3 },
      });
      synth.volume.value = 4.5;
      return new HeldInstrument(synth, synth);
    }
  }
}
