// The spacing and roughness functions, checked against what their two sources say (spacing.ts).
// Made-up tones only (TEST INPUTS); the measurement on the real choir is spacing.measure.ts.
import { describe, expect, it } from 'vitest';
import {
  CRITICAL_BANDWIDTH,
  FIRST_SPACING,
  choirPartials,
  copyCents,
  criticalBandwidth,
  dissonance,
  gaps,
  pairDissonance,
  pairPeakHz,
  type Partial,
} from './spacing';

describe('the two spacings', () => {
  it('the first spacing is the scale a step at a time from C3', () => {
    expect(FIRST_SPACING).toEqual(['C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5']);
  });
  it('a gap is the difference of the two notes in Hz, and C3 to D3 is 16.0 Hz', () => {
    expect(gaps(['C3', 'D3'])[0].gapHz).toBeCloseTo(16.02, 2);
  });
});

describe('critical bandwidth (Plomp and Levelt, Fig. 9)', () => {
  it('gives the traced value at each traced point and grows with frequency', () => {
    for (const [hz, cb] of CRITICAL_BANDWIDTH) expect(criticalBandwidth(hz)).toBeCloseTo(cb, 6);
    for (let i = 1; i < CRITICAL_BANDWIDTH.length; i++) expect(CRITICAL_BANDWIDTH[i][1]).toBeGreaterThan(CRITICAL_BANDWIDTH[i - 1][1]);
  });
  it('is flat below about 500 Hz and bends up above it, as the paper says (p. 556)', () => {
    // About 90 Hz from 100 to 200 Hz; then wider by more than half from 500 to 1000 Hz.
    expect(criticalBandwidth(200) / criticalBandwidth(100)).toBeLessThan(1.03);
    expect(criticalBandwidth(1000) / criticalBandwidth(500)).toBeGreaterThan(1.4);
  });
  it('says nothing outside the traced range', () => {
    expect(criticalBandwidth(80)).toBeNaN();
    expect(criticalBandwidth(2000)).toBeNaN();
  });
});

describe("Sethares's dissonance of two sine partials", () => {
  it('is zero at a unison', () => {
    expect(pairDissonance(440, 440, 1, 1)).toBe(0);
  });
  it('is largest where pairPeakHz says, at every frequency', () => {
    for (const low of [130, 260, 500, 1000]) {
      let best = { d: 0, at: 0 };
      for (let delta = 0.05; delta < 200; delta += 0.05) {
        const d = pairDissonance(low, low + delta, 1, 1);
        if (d > best.d) best = { d, at: delta };
      }
      expect(Math.abs(best.at - pairPeakHz(low))).toBeLessThan(0.06);
    }
  });
  it('takes the smaller of the two amplitudes, as the program does', () => {
    expect(pairDissonance(500, 520, 0.3, 1)).toBeCloseTo(0.3 * pairDissonance(500, 520, 1, 1), 12);
  });
  it('puts its peak near a quarter of Plomp and Levelt\'s critical bandwidth (the two sources agree within 20%)', () => {
    for (const hz of [150, 250, 500, 800, 1000]) {
      const ratio = (4 * pairPeakHz(hz)) / criticalBandwidth(hz);
      expect(ratio).toBeGreaterThan(0.8);
      expect(ratio).toBeLessThan(1.2);
    }
  });
});

describe('dissonance of complex tones', () => {
  /** A harmonic tone of six partials whose amplitudes fall by 0.88 each (Sethares, figure 3). */
  const tone = (f0: number, note: number): Partial[] => Array.from({ length: 6 }, (_, k) => ({ hz: (k + 1) * f0, amp: 0.88 ** k, note }));
  const curve = (base: number, ratio: number) => dissonance([...tone(base, 0), ...tone(base * ratio, 1)]).total;

  it('has its dips at the simple ratios Sethares names: 2:1, 3:2, 4:3, 5:4 and 5:3', () => {
    const base = 500;
    const ratios: number[] = [];
    const values: number[] = [];
    for (let r = 1.01; r <= 2.1; r += 0.001) {
      ratios.push(r);
      values.push(curve(base, r));
    }
    const dips = ratios.filter((_, i) => i > 0 && i < values.length - 1 && values[i] < values[i - 1] && values[i] <= values[i + 1]);
    for (const target of [2, 3 / 2, 4 / 3, 5 / 4, 5 / 3]) {
      expect(dips.some((d) => Math.abs(d - target) < 0.004), `a dip at ${target.toFixed(3)}`).toBe(true);
    }
  });
  it('with two partials, all pairs and adjacent pairs are the same thing', () => {
    const p: Partial[] = [{ hz: 300, amp: 1, note: 0 }, { hz: 330, amp: 0.5, note: 1 }];
    expect(dissonance(p, 'all').total).toBeCloseTo(dissonance(p, 'adjacent').total, 12);
  });
  it('counts pairs within one note apart from pairs between notes', () => {
    const d = dissonance([...tone(200, 0), ...tone(220, 1)]);
    expect(d.within).toBeCloseTo(dissonance(tone(200, 0)).total + dissonance(tone(220, 1)).total, 9);
    expect(d.between).toBeGreaterThan(0);
  });
});

describe("the choir's partials", () => {
  it("spreads a FatOscillator's three copies over 14 cents: −7, 0, +7", () => {
    expect(copyCents(3, 14)).toEqual([-7, 0, 7]);
  });
  it('gives each copy the harmonics of a saw wave, at 1/k', () => {
    const p = choirPartials([57], { wave: 'sawtooth', copies: 1, spread: 0 }, () => 1, 2000); // A3, 220 Hz
    expect(p.map((x) => Math.round(x.hz))).toEqual([220, 440, 660, 880, 1100, 1320, 1540, 1760, 1980]);
    p.forEach((x, k) => expect(x.amp).toBeCloseTo(1 / (k + 1), 12));
  });
});
