// User voice: a melody the visitor plays live.
// Completely separate from the Earth voice: its own synth and volume, played immediately
// (not on the Transport), so it can never move, add or remove an Earth note (docs/CONTRACT.md).
//
// The API takes MIDI note numbers plus the input holding the note, so every input feeds the same
// calls: the computer keyboard ('key'), clicks on the on-screen keys ('pointer'), and later a MIDI
// piano ('midi': Web MIDI note-on/off → noteOn(note, velocity / 127, 'midi') / noteOff(note, 'midi')).

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

export type InputSource = 'key' | 'pointer' | 'midi';

const hz = (note: number) => Tone.Frequency(note, 'midi').toFrequency();

export class UserVoice {
  private synth: Tone.PolySynth | null = null;
  private volume: Tone.Volume | null = null;
  private volumeDb = -10;
  private initP: Promise<void> | null = null;
  /** Which inputs are holding each note. A note sounds while at least one input holds it. */
  private holders = new Map<number, Set<InputSource>>();
  /** Notes we have started and not yet released. Released one by one: Tone's releaseAll leaves
   *  voices unmarked, so a later release could hit the old fading voice and leave a new one stuck. */
  private sounding = new Set<number>();
  /** Per-press token, so a press released while audio is starting never starts late. */
  private tokens = new Map<number, number>();
  private seq = 0;

  /** @param onChange called whenever the set of held notes changes (for the on-screen keys). */
  constructor(private onChange: (held: ReadonlySet<number>) => void = () => {}) {}

  /** Start a note. Call from a user gesture: browsers only allow audio after one. */
  async noteOn(note: number, velocity = 0.7, source: InputSource = 'key'): Promise<void> {
    if (!Number.isInteger(note) || note < 0 || note > 127) return;
    const who = this.holders.get(note) ?? new Set<InputSource>();
    const alreadyHeld = who.size > 0;
    who.add(source);
    this.holders.set(note, who);
    if (alreadyHeld) return; // key auto-repeat, or another input is already holding this note
    this.emit();

    const token = ++this.seq;
    this.tokens.set(note, token);
    this.initP ??= this.init();
    await this.initP;
    if (this.tokens.get(note) !== token) return; // released (or pressed again) while audio started
    this.synth!.triggerAttack(hz(note), Tone.immediate(), velocity);
    this.sounding.add(note);
  }

  noteOff(note: number, source: InputSource = 'key'): void {
    const who = this.holders.get(note);
    if (!who?.delete(source)) return;
    if (who.size > 0) return; // another input still holds it
    this.holders.delete(note);
    this.tokens.delete(note);
    this.release(note);
    this.emit();
  }

  /** Stop every melody note (Stop, Esc, the pad losing focus, the window losing focus). */
  allOff(): void {
    for (const note of [...this.sounding]) this.release(note);
    this.holders.clear();
    this.tokens.clear();
    this.emit();
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

  private release(note: number): void {
    if (!this.sounding.delete(note)) return;
    this.synth?.triggerRelease(hz(note), Tone.immediate());
  }

  private emit(): void {
    this.onChange(new Set(this.holders.keys()));
  }

  private async init(): Promise<void> {
    await Tone.start();
    this.volume = new Tone.Volume(this.volumeDb).toDestination();
    // Soft, sustained timbre: clearly different from the short Earth drum pulse.
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.4 },
    }).connect(this.volume);
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      (window as unknown as { __melodySynth?: Tone.PolySynth }).__melodySynth = this.synth;
    }
  }
}
