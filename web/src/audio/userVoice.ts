// User voice: a melody the visitor plays live.
// Completely separate from the Earth voice: its own synth and volume, played immediately
// (not on the Transport), so it can never move, add or remove an Earth note (docs/CONTRACT.md).
//
// The API takes MIDI note numbers, not keys, so every input feeds the same two calls:
// the computer keyboard (MelodyPad), clicks on the on-screen keys, and later a MIDI piano
// (Web MIDI note-on/note-off → noteOn(note, velocity / 127) / noteOff(note)).

import * as Tone from 'tone';

/** Home-row keys → MIDI notes. C major pentatonic from C5, an octave above the Earth pulse (E4),
 *  so any combination sounds consonant and the two voices stay easy to tell apart. Design choice. */
export const KEYBOARD_NOTES: Record<string, number> = {
  a: 72, // C5
  s: 74, // D5
  d: 76, // E5
  f: 79, // G5
  g: 81, // A5
  h: 84, // C6
  j: 86, // D6
  k: 88, // E6
};

const hz = (note: number) => Tone.Frequency(note, 'midi').toFrequency();

export class UserVoice {
  private synth: Tone.PolySynth | null = null;
  private volume: Tone.Volume | null = null;
  private volumeDb = -10;
  private initP: Promise<void> | null = null;
  /** Notes currently held down, by MIDI number. */
  private held = new Set<number>();

  /** Start a note. Call from a user gesture: browsers only allow audio after one. */
  async noteOn(note: number, velocity = 0.7): Promise<void> {
    if (!Number.isInteger(note) || note < 0 || note > 127) return;
    if (this.held.has(note)) return; // key auto-repeat, or a second input already holding it
    this.held.add(note);
    this.initP ??= this.init();
    await this.initP;
    // The note may have been released while audio was starting (a quick first tap): don't start it.
    if (!this.held.has(note)) return;
    this.synth!.triggerAttack(hz(note), Tone.immediate(), velocity);
  }

  noteOff(note: number): void {
    if (!this.held.delete(note)) return;
    this.synth?.triggerRelease(hz(note), Tone.immediate());
  }

  /** Stop every melody note (Stop button, Esc, or the pad losing focus). */
  allOff(): void {
    this.held.clear();
    this.synth?.releaseAll(Tone.immediate());
  }

  setVolume(db: number): void {
    this.volumeDb = db;
    if (this.volume) this.volume.volume.value = db;
  }

  dispose(): void {
    this.allOff();
    this.synth?.dispose();
    this.volume?.dispose();
  }

  private async init(): Promise<void> {
    await Tone.start();
    this.volume = new Tone.Volume(this.volumeDb).toDestination();
    // Soft, sustained timbre: clearly different from the short Earth drum pulse.
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.4 },
    }).connect(this.volume);
    if (import.meta.env.DEV) (window as unknown as { __melodySynth?: Tone.PolySynth }).__melodySynth = this.synth;
  }
}
