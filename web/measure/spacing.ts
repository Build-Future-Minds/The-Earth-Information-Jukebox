// How far apart the scan's held notes are, against the ear's critical bandwidth, and how rough the
// choir is with all twelve notes at full level, for the first note spacing and the current one.
// Pure functions (no audio), so the unit tests (spacing.test.ts) check them against what the two
// sources say. The browser part (the choir's real filter response, a recording of the real choir)
// is in spacing.measure.ts and tap.ts. See README.md in this folder.
//
// Sources (docs/DECISIONS.md):
//  - Plomp, R. & Levelt, W. J. M. (1965). Tonal consonance and critical bandwidth. J. Acoust. Soc.
//    Am. 38, 548–560. p. 555: "maximal tonal dissonance is produced by intervals subtending 25% of
//    the critical bandwidth, and ... maximal tonal consonance is reached for interval widths of 100%
//    of the critical bandwidth." p. 555: the dissonance of two complex tones is taken as "the sum of
//    the dissonances of each pair of adjacent partials". p. 556: "below a critical frequency, the
//    intervals become more and more dissonant, due to the bend in the critical-bandwidth curve at
//    about 500 cps".
//  - Sethares, W. A. Relating Tuning and Timbre (sethares.engr.wisc.edu/consemi.html), and its
//    dissmeasure program (sethares.engr.wisc.edu/comprog.html): Plomp and Levelt's curve as a
//    formula, with the constants below.
import { BAND_NOTE_NAMES, SCAN_SCALE } from '../src/audio/scanScore';
import type { ChoirDef } from '../src/audio/instruments';
import { Note, Scale } from 'tonal';

// ---------- Critical bandwidth ----------

/**
 * Critical bandwidth against frequency, both in Hz: the solid curve of Plomp and Levelt's Fig. 9
 * (p. 555, "The solid curve represents the critical bandwidth"; they take it from Zwicker, Flottorp
 * and Stevens, 1957). The paper gives the curve as a graph only. These points were read from a scan
 * of the page by following the curve pixel by pixel between the figure's own gridlines, every sixth
 * of an octave (15 Nov 2026); one pixel is 0.5% of the value. Between points: straight lines on
 * log–log axes. The trace was checked by drawing it over the figure. The scan is not in the repo.
 */
export const CRITICAL_BANDWIDTH: [number, number][] = [
  [100, 89.3], [112.2, 89.5], [126.0, 89.7], [141.4, 89.9], [158.7, 90.1], [178.2, 90.7], [200, 91.1],
  [224.5, 92.3], [252.0, 93.8], [282.8, 95.3], [317.5, 97.8], [400, 104.1], [449.0, 109.1], [504.0, 113.5],
  [565.7, 119.0], [635.0, 125.3], [712.7, 133.4], [800, 142.8], [898.0, 153.7], [1007.9, 168.6],
  [1131.4, 183.9], [1269.9, 202.9], [1425.4, 223.6], [1600, 248.4], [1795.9, 277.6],
];

/** Critical bandwidth at a frequency (Hz), from the curve above. NaN outside the curve's range. */
export function criticalBandwidth(hz: number): number {
  const t = CRITICAL_BANDWIDTH;
  if (hz < t[0][0] || hz > t[t.length - 1][0]) return NaN;
  for (let i = 1; i < t.length; i++) {
    if (hz <= t[i][0]) {
      const [f0, b0] = t[i - 1];
      const [f1, b1] = t[i];
      const k = Math.log(hz / f0) / Math.log(f1 / f0);
      return b0 * (b1 / b0) ** k;
    }
  }
  return t[t.length - 1][1];
}

// ---------- Sethares's dissonance of two sine partials ----------

/** The constants of Sethares's dissmeasure program, as printed on its page ("Don't change dstar or any of the variables with numbers"). */
export const SETHARES = { dStar: 0.24, s1: 0.0207, s2: 18.96, c1: 5, c2: -5, a1: -3.51, a2: -5.75 } as const;

/**
 * Dissonance of two sine partials (frequencies in Hz, amplitudes), as Sethares's program computes
 * it: s = Dstar ÷ (S1 · lower frequency + S2), and min(l1, l2) · (C1·e^(A1·s·Δf) + C2·e^(A2·s·Δf)).
 * Zero at a unison, largest at a small difference, falling back towards zero for wide ones.
 */
export function pairDissonance(f1: number, f2: number, l1: number, l2: number): number {
  const { dStar, s1, s2, c1, c2, a1, a2 } = SETHARES;
  const low = Math.min(f1, f2);
  const s = dStar / (s1 * low + s2);
  const d = Math.abs(f2 - f1);
  return Math.min(l1, l2) * (c1 * Math.exp(a1 * s * d) + c2 * Math.exp(a2 * s * d));
}

/**
 * Where the pair's dissonance is largest, in Hz above the lower frequency (derived here, not printed
 * by Sethares): the curve is 5(e^(A1·x) − e^(A2·x)) in x = s·Δf. Its slope is zero where
 * A1·e^(A1·x) = A2·e^(A2·x), at x* = ln(A2 ÷ A1) ÷ (A1 − A2) = ln(5.75 ÷ 3.51) ÷ 2.24 ≈ 0.2203,
 * so Δf* = x* ÷ s.
 */
export function pairPeakHz(lowerHz: number): number {
  const { dStar, s1, s2, a1, a2 } = SETHARES;
  const x = Math.log(a2 / a1) / (a1 - a2);
  return (x * (s1 * lowerHz + s2)) / dStar;
}

export interface Partial {
  hz: number;
  amp: number;
  /** Which held note it belongs to (band index). */
  note: number;
}

/**
 * Total dissonance of a set of partials. `all`: every pair, as Sethares's MATLAB program sums it
 * (pairs within one note included). `adjacent`: only neighbours in frequency, as Plomp and Levelt
 * did. Also returns the part between partials of different notes, the part among the three lowest
 * notes, and the part from each pair of notes.
 */
export function dissonance(partials: Partial[], pairs: 'all' | 'adjacent' = 'all') {
  const p = [...partials].sort((a, b) => a.hz - b.hz);
  let total = 0;
  let between = 0;
  let lowest = 0;
  const byPair = new Map<string, number>();
  const add = (a: Partial, b: Partial) => {
    const d = pairDissonance(a.hz, b.hz, a.amp, b.amp);
    total += d;
    if (a.note !== b.note) {
      between += d;
      if (a.note <= 2 && b.note <= 2) lowest += d;
      const key = `${Math.min(a.note, b.note)}-${Math.max(a.note, b.note)}`;
      byPair.set(key, (byPair.get(key) ?? 0) + d);
    }
  };
  if (pairs === 'adjacent') {
    for (let i = 1; i < p.length; i++) add(p[i - 1], p[i]);
  } else {
    for (let i = 0; i < p.length; i++) {
      // Pairs further apart than this add less than 1e-9 of the smaller amplitude: stop there.
      const reach = 40 * pairPeakHz(p[i].hz);
      for (let j = i + 1; j < p.length && p[j].hz - p[i].hz < reach; j++) add(p[i], p[j]);
    }
  }
  return { total, between, within: total - between, lowest, byPair };
}

// ---------- The choir's partials ----------

/** MIDI note → Hz, equal temperament with A4 = 440 Hz (as Tone.js's mtof). */
export const midiHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** The detunings of a FatOscillator's copies, in cents: spread evenly from −spread/2 to +spread/2. */
export const copyCents = (copies: number, spread: number) => Array.from({ length: copies }, (_, i) => -spread / 2 + (copies > 1 ? (spread * i) / (copies - 1) : 0));

/**
 * The partials of the choir's held notes, all at full level: each note is `copies` saw waves
 * detuned as above, each with harmonics k = 1, 2, 3 … at amplitude 1/k (a saw wave's series), up to
 * `topHz`, times the gain of the choir's filters at that frequency (`gain`, measured in the browser
 * on Web Audio's own filters). Saw waves only: the scan sounds that use triangle waves are not covered.
 */
export function choirPartials(notes: number[], def: Pick<ChoirDef, 'wave' | 'copies' | 'spread'>, gain: (hz: number) => number, topHz = 12000): Partial[] {
  if (def.wave !== 'sawtooth') throw new Error('choirPartials models saw waves only');
  const out: Partial[] = [];
  notes.forEach((midi, note) => {
    for (const cents of copyCents(def.copies, def.spread)) {
      const f0 = midiHz(midi) * 2 ** (cents / 1200);
      for (let k = 1; k * f0 <= topHz; k++) out.push({ hz: k * f0, amp: gain(k * f0) / k, note });
    }
  });
  return out;
}

// ---------- The two spacings ----------

/** The current held notes, low to high (scanScore.ts). */
export const CURRENT_SPACING = BAND_NOTE_NAMES;
/**
 * The first version's held notes: the scale a step at a time from C3. Its code is not in git; this
 * is rebuilt from the spec's words ("the first version climbed step by step from C3, so C3, D3 and
 * E3 blurred together"), with the same scale.
 */
export const FIRST_SPACING = Scale.rangeOf(SCAN_SCALE)('C3', 'C6')
  .filter((n): n is string => typeof n === 'string')
  .slice(0, BAND_NOTE_NAMES.length);

export const toMidi = (names: string[]) => names.map((n) => Note.midi(n) as number);

/** Neighbouring held notes: the gap in Hz and in critical bandwidths (at the two notes' geometric mean, as Plomp and Levelt measured it). */
export function gaps(names: string[]) {
  return names.slice(1).map((upper, i) => {
    const lower = names[i];
    const [f1, f2] = [midiHz(Note.midi(lower) as number), midiHz(Note.midi(upper) as number)];
    const mean = Math.sqrt(f1 * f2);
    const cb = criticalBandwidth(mean);
    return { lower, upper, lowerHz: f1, upperHz: f2, gapHz: f2 - f1, meanHz: mean, criticalBandwidth: cb, ofBandwidth: (f2 - f1) / cb, setharesPeakHz: pairPeakHz(f1) };
  });
}
