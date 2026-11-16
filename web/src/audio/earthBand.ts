// The Earth band: the chords under the Earth voice when "Earth sound" is "Piano and band".
// Pure functions only (no audio), so every note can be tested. earthSound.ts plays them.
//
// Decoration, not data (docs/mapping_spec.md, "The Earth voice as music"):
// - The band is the same for every region, every picture and every alignment value.
// - It strikes only on beat starts, where the Earth voice's first pulse already is. Nothing here
//   has a time inside the beat, so the band can never mark a moment between the two pulses: where
//   the second pulse falls (the data) is still heard on its own.
// - Its notes all sit below the Earth note (E4), so the Earth voice is always the highest note and
//   is never doubled by a chord note.
// - While information is missing the band only holds its chord (the pad, which swells in and has
//   no attack): no strike is heard where the Earth voice has no pulse.
//
// The chords are the listening game's (tools/listening_game.html, PHRASE): C, Am7, F, Gsus and
// home to C, two beats each, a phrase of 10 beats. The game voices them up to E4, where its
// melody is; here they are moved below the Earth note, and the F chord leaves its E to the Earth
// voice, which makes it Fmaj7 whenever the Earth voice sounds.

import { Note } from 'tonal';

export type ChordId = 'C' | 'Am7' | 'F' | 'Gsus';

export interface BandChord {
  /** The chord's name with the Earth note on top. */
  name: string;
  /** The low note. It is played with its octave above. */
  bass: string;
  /** The chord's other notes, every one below the Earth note. */
  hands: string[];
}

/** Each chord moves to the next by small steps, and C4 stays on top throughout. */
export const BAND_CHORDS: Record<ChordId, BandChord> = {
  C: { name: 'C', bass: 'C2', hands: ['E3', 'G3', 'C4'] },
  Am7: { name: 'Am7', bass: 'A1', hands: ['E3', 'G3', 'C4'] },
  F: { name: 'Fmaj7', bass: 'F2', hands: ['A3', 'C4'] },
  Gsus: { name: 'Gsus4', bass: 'G2', hands: ['D3', 'G3', 'C4'] },
};

/** Two beats per chord, home to C at the end: the listening game's phrase. */
export const PHRASE: ChordId[] = ['C', 'C', 'Am7', 'Am7', 'F', 'F', 'Gsus', 'Gsus', 'C', 'C'];

/** The chord for a beat. `beat` counts beats from the start of play (0, 1, 2, …), not from the
 *  start of a region's loop, so the phrase keeps moving when a loop is shorter than it (the
 *  aerosol pictures have one step per region). */
export function chordAt(beat: number): ChordId {
  return PHRASE[((Math.round(beat) % PHRASE.length) + PHRASE.length) % PHRASE.length];
}

export type BandInstrument = 'piano' | 'bassSynth' | 'pad' | 'marimba';

/** One note of the band. It always sounds at the start of its beat: there is no other time. */
export interface BandStrike {
  instrument: BandInstrument;
  /** MIDI note number. */
  note: number;
  /** How hard, 0–1, before the instrument's own level. */
  velocity: number;
  /** How long the key is held: this many beats, plus `pedal` seconds so chords join up. */
  beats: number;
  pedal: number;
}

const midi = (name: string): number => Note.midi(name)!;

/**
 * Everything the band plays at the start of one beat.
 * @param beat    beats from the start of play (chordAt)
 * @param fresh   the band was not playing on the beat before (start, resume, seek): the chord
 *                sounds now, even on its second beat, so the band never starts with a tap alone
 * @param missing the Earth voice has no pulse on this beat (missing information)
 */
export function bandBeat(beat: number, fresh: boolean, missing: boolean): BandStrike[] {
  const chord = BAND_CHORDS[chordAt(beat)];
  const onChord = Math.round(beat) % 2 === 0 || fresh;
  if (!onChord) {
    // Second beat of a chord: the chord touched again, softly, on a marimba.
    return missing ? [] : chord.hands.map((h) => ({ instrument: 'marimba', note: midi(h), velocity: 0.12, beats: 1, pedal: 0.04 }));
  }
  // A chord joined on its second beat lasts one beat; otherwise two.
  const beats = Math.round(beat) % 2 === 0 ? 2 : 1;
  const bass = midi(chord.bass);
  // The background: a soft held pad of the chord that swells in slowly. It has no attack, so it
  // marks no time, and it keeps sounding while information is missing.
  const pad: BandStrike[] = chord.hands.map((h) => ({ instrument: 'pad', note: midi(h), velocity: 0.5, beats, pedal: 0.3 }));
  if (missing) return pad;
  return [
    { instrument: 'piano', note: bass + 12, velocity: 0.34, beats, pedal: 0.04 },
    { instrument: 'piano', note: bass, velocity: 0.22, beats, pedal: 0.04 },
    { instrument: 'bassSynth', note: bass + 12, velocity: 0.5, beats, pedal: 0.2 },
    ...chord.hands.map((h): BandStrike => ({ instrument: 'piano', note: midi(h), velocity: 0.13, beats, pedal: 0.04 })),
    ...pad,
  ];
}

/** Every note the band can play, for the tests: all must be below the Earth note. */
export function allBandNotes(): number[] {
  return Object.values(BAND_CHORDS).flatMap((c) => [midi(c.bass), midi(c.bass) + 12, ...c.hands.map(midi)]);
}
