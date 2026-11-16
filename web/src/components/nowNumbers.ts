// "What you hear now" on Compare (NowMatrix.tsx): the numbers behind the beat that is sounding,
// worked out in words. Pure functions, so every number and sentence is unit-tested.
//
// Every number in the matrix is worked out from the alignment as shown, rounded to two decimals,
// with exact arithmetic, so the sum on screen always adds up (0.75 − 0.25 × 0.30 = 0.675). The
// sound uses the unrounded alignment; the two differ by at most 0.25 × 0.005 = 0.00125 of a beat
// (1.25 ms at the NASA data's 1 s beat), which a unit test checks on every step of every picture.
import { Interval, Note } from 'tonal';
import { BAND_CHORDS, chordAt, type ChordId } from '../audio/earthBand';
import { EARTH_PITCH, LONG_AT_A0, LONG_AT_A1 } from '../audio/earthVoice';
import type { Features, Step } from '../data/types';

/** The alignment as shown: two decimals. */
export const shownAlignment = (alignment: number): string => (Math.round(alignment * 100) / 100).toFixed(2);

/** Where the second pulse lands, in ten-thousandths of the beat, from the alignment as shown.
 *  Integers only: 0.75 is 7500, 0.25 × (hundredths) is 25 × hundredths. */
function splitTenThousandths(alignment: number): number {
  const hundredths = Math.round(alignment * 100);
  return Math.round(LONG_AT_A0 * 10000) - Math.round((LONG_AT_A0 - LONG_AT_A1) * 100) * hundredths;
}

/** A number with at least `min` decimals and no trailing zeros beyond them. */
function decimals(x: number, min: number, max: number): string {
  let s = x.toFixed(max);
  while (s.split('.')[1].length > min && s.endsWith('0')) s = s.slice(0, -1);
  return s.endsWith('.') ? s.slice(0, -1) : s;
}

/** Where the second pulse lands, as a share of the beat (0.5 to 0.75), from the alignment as shown. */
export const shownSplit = (alignment: number): number => splitTenThousandths(alignment) / 10000;

/** The rhythm rule worked out with this alignment: "0.75 − 0.25 × 0.08 = 0.73". */
export function ruleWorked(alignment: number): string {
  const slope = LONG_AT_A0 - LONG_AT_A1;
  return `${LONG_AT_A0.toFixed(2)} − ${slope.toFixed(2)} × ${shownAlignment(alignment)} = ${decimals(shownSplit(alignment), 2, 4)}`;
}

/** The same share as a percentage of the beat: "73", "67.5". */
export const splitPercent = (alignment: number): string => decimals(shownSplit(alignment) * 100, 0, 2);

/** One beat's two gaps in milliseconds at this speed, as heard: pulse 1 to pulse 2 (the long one),
 *  then pulse 2 to the next beat. They always add up to one beat. */
export function gapsMs(alignment: number, stepSeconds: number, speed: number): [number, number] {
  const beatMs = Math.round((stepSeconds / speed) * 1000);
  const first = Math.round(shownSplit(alignment) * beatMs);
  return [first, beatMs - first];
}

/** A region's steps in time order. */
export function regionSteps(features: Features, regionId: string): Step[] {
  return features.steps.filter((s) => s.region === regionId).sort((a, b) => a.t - b.t);
}

/** Which frame of the loop a step is: 1-based, and how many there are. */
export function frameOf(features: Features, step: Step): { n: number; of: number } {
  const steps = regionSteps(features, step.region);
  return { n: steps.findIndex((s) => s.t === step.t) + 1, of: steps.length };
}

const ORDINAL: Record<number, string> = { 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th' };

/**
 * The band's chord on this beat, and what the Earth note (E4) is in it. The Earth note never
 * changes; the chord under it does, so the same E sounds as a different part of each chord:
 * "E is its 3rd" when the band plays an E too (C, Am7), "E adds the 7th" when it does not (F,
 * which the E makes Fmaj7; Gsus4, which it gives a 6th). Worked out from the chords themselves,
 * so it stays true if the band's chords change.
 */
export function chordNow(beat: number): { id: ChordId; name: string; role: string } {
  const id = chordAt(beat);
  const chord = BAND_CHORDS[id];
  const earth = Note.pitchClass(Note.fromMidi(EARTH_PITCH));
  const root = Note.pitchClass(chord.bass);
  const degree = Interval.get(Interval.distance(root, earth)).num;
  const inBand = chord.hands.some((h) => Note.pitchClass(h) === earth);
  const word = ORDINAL[degree] ?? `${degree}th`;
  return { id, name: chord.name, role: inBand ? `${earth} is its ${word}` : `${earth} adds the ${word}` };
}

/** The Earth note's name, for the note row: "E4". */
export const earthNoteName = (): string => Note.fromMidi(EARTH_PITCH);
