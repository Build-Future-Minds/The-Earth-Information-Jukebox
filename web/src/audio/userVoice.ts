// User voice: a melody the visitor plays live from the computer keyboard.
// Completely separate from the Earth voice: its own synth and volume, played immediately
// (not on the Transport), so it can never move, add or remove an Earth note (docs/CONTRACT.md).

import * as Tone from 'tone';

/** Home-row keys → MIDI pitches. C major pentatonic from C5, an octave above the Earth pulse (E4),
 *  so any combination sounds consonant and the two voices stay easy to tell apart. Design choice. */
export const MELODY_KEYS: Record<string, number> = {
  a: 72, // C5
  s: 74, // D5
  d: 76, // E5
  f: 79, // G5
  g: 81, // A5
  h: 84, // C6
  j: 86, // D6
  k: 88, // E6
};

export class UserVoice {
  private synth: Tone.PolySynth | null = null;
  private volume: Tone.Volume | null = null;
  private volumeDb = -10;
  private held = new Set<string>();

  /** Call from a key press: browsers only allow audio after a user gesture. */
  async noteOn(key: string): Promise<void> {
    const pitch = MELODY_KEYS[key];
    if (pitch === undefined || this.held.has(key)) return; // ignore key auto-repeat
    this.held.add(key);
    if (!this.synth) await this.init();
    this.synth!.triggerAttack(Tone.Frequency(pitch, 'midi').toFrequency(), Tone.immediate(), 0.7);
  }

  noteOff(key: string): void {
    const pitch = MELODY_KEYS[key];
    if (pitch === undefined || !this.held.delete(key)) return;
    this.synth?.triggerRelease(Tone.Frequency(pitch, 'midi').toFrequency(), Tone.immediate());
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
