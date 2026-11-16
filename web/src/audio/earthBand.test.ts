// The Earth band's notes (earthBand.ts): the phrase, where the notes sit against the Earth note,
// and what plays on each beat. Timing on the real audio clock is checked in web/e2e/earthMusic.e2e.ts.
import { describe, expect, it } from 'vitest';
import { Midi, Scale } from 'tonal';
import { BAND_CHORDS, allBandNotes, bandBeat, chordAt, PHRASE } from './earthBand';
import { EARTH_PITCH } from './earthVoice';

const name = (midi: number) => Midi.midiToNoteName(midi, { sharps: true });

describe('the phrase', () => {
  it("is the listening game's: C, Am7, F, Gsus, home to C, two beats each", () => {
    expect(PHRASE).toEqual(['C', 'C', 'Am7', 'Am7', 'F', 'F', 'Gsus', 'Gsus', 'C', 'C']);
    expect(Array.from({ length: 10 }, (_, b) => chordAt(b))).toEqual(PHRASE);
  });

  it('keeps moving across loops: beat 30 is beat 0 again, and a one-step loop still changes chord', () => {
    expect(chordAt(30)).toBe('C');
    expect(chordAt(12)).toBe('Am7');
    expect(chordAt(-1)).toBe('C'); // never undefined
  });
});

describe('where the band sits against the Earth note (E4)', () => {
  it('every band note is below the Earth note, so the Earth voice is the top voice and never doubled', () => {
    expect(EARTH_PITCH).toBe(64);
    expect(Math.max(...allBandNotes())).toBeLessThan(EARTH_PITCH);
  });

  it('uses only the notes of C major pentatonic, plus F, the root of the F chord', () => {
    const allowed = new Set([...Scale.get('C major pentatonic').notes, 'F']);
    const used = new Set(allBandNotes().map((m) => name(m).replace(/\d+$/, '')));
    expect([...used].filter((n) => !allowed.has(n))).toEqual([]);
  });

  it('the only band notes a semitone (or an octave and a semitone) from E are the Fs, a major seventh below it', () => {
    const near = [...new Set(allBandNotes())]
      .filter((m) => [1, 11].includes(((EARTH_PITCH - m) % 12 + 12) % 12))
      .map(name)
      .sort();
    expect(near).toEqual(['F2', 'F3']); // E4 over F: the major seventh of Fmaj7
  });

  it('no two band notes are a semitone apart within a chord', () => {
    for (const chord of Object.values(BAND_CHORDS)) {
      const midis = [chord.bass, ...chord.hands].map((n) => Midi.toMidi(n)!).concat(Midi.toMidi(chord.bass)! + 12);
      for (const a of midis) for (const b of midis) expect(Math.abs(a - b)).not.toBe(1);
    }
  });
});

describe('what plays on each beat', () => {
  const kinds = (strikes: ReturnType<typeof bandBeat>) => [...new Set(strikes.map((s) => s.instrument))].sort();

  it("a chord's first beat: bass, chord, pad, held two beats", () => {
    const strikes = bandBeat(0, false, false);
    expect(kinds(strikes)).toEqual(['bassSynth', 'pad', 'piano']);
    expect(strikes.every((s) => s.beats === 2)).toBe(true);
    expect(strikes.filter((s) => s.instrument === 'piano').map((s) => name(s.note))).toEqual(['C3', 'C2', 'E3', 'G3', 'C4']);
  });

  it("a chord's second beat: the chord touched again on a marimba, nothing else", () => {
    const strikes = bandBeat(1, false, false);
    expect(kinds(strikes)).toEqual(['marimba']);
    expect(strikes.map((s) => name(s.note))).toEqual(['E3', 'G3', 'C4']);
  });

  it('starting (or resuming) on a second beat plays the chord, for one beat, not a tap alone', () => {
    const strikes = bandBeat(5, true, false);
    expect(kinds(strikes)).toEqual(['bassSynth', 'pad', 'piano']);
    expect(strikes.every((s) => s.beats === 1)).toBe(true);
    expect(strikes.find((s) => s.instrument === 'bassSynth')!.note).toBe(Midi.toMidi('F3'));
  });

  it('missing information: no strike at all, only the held pad on a chord change', () => {
    expect(kinds(bandBeat(2, false, true))).toEqual(['pad']);
    expect(bandBeat(3, false, true)).toEqual([]);
  });

  it('the band is the same whatever the alignment: bandBeat is not given it', () => {
    expect(bandBeat.length).toBe(3); // beat, fresh, missing: no region, no alignment
  });
});
