// "What you hear now" (nowNumbers.ts): the numbers on screen must add up, and stay within a hair of
// what the sound uses.
import { describe, expect, it } from 'vitest';
import { chordNow, earthNoteName, frameOf, gapsMs, regionSteps, ruleWorked, shownAlignment, shownSplit, splitPercent } from './nowNumbers';
import { longFraction } from '../audio/earthVoice';
import { SOURCES } from '../data/sources';

describe('the rule, worked out', () => {
  it('shows the rule with the alignment as shown, and as many decimals as the answer needs', () => {
    expect(ruleWorked(0.08)).toBe('0.75 − 0.25 × 0.08 = 0.73');
    expect(ruleWorked(1)).toBe('0.75 − 0.25 × 1.00 = 0.50');
    expect(ruleWorked(0.3003)).toBe('0.75 − 0.25 × 0.30 = 0.675'); // the rain picture, t = 3
    expect(ruleWorked(0.07)).toBe('0.75 − 0.25 × 0.07 = 0.7325');
    expect(splitPercent(0.3003)).toBe('67.5');
    expect(splitPercent(0.08)).toBe('73');
  });

  it('on every step of every picture, the sum on screen adds up exactly, and is within 0.00125 of a beat of the sound', () => {
    for (const source of SOURCES) {
      for (const step of source.features.steps) {
        if (step.status !== 'ok') continue;
        const where = `${source.key} ${step.region} t=${step.t}`;
        // Re-do the sum from the text alone, in integers (ten-thousandths), as a reader would.
        const [, a, result] = ruleWorked(step.alignment).match(/× (\d\.\d\d) = (\d\.\d+)$/)!;
        const tenK = (s: string) => Math.round(Number(s) * 10000);
        expect(7500 - 25 * Math.round(Number(a) * 100), where).toBe(tenK(result));
        expect(a, where).toBe(shownAlignment(step.alignment));
        expect(Math.abs(shownSplit(step.alignment) - longFraction(step.alignment)), where).toBeLessThanOrEqual(0.00125 + 1e-9);
      }
    }
  });
});

describe('the gaps of one beat', () => {
  it('splits the beat at the second pulse, long first, and always adds up to one beat', () => {
    expect(gapsMs(0, 1, 1)).toEqual([750, 250]); // A = 0: strong long–short
    expect(gapsMs(1, 1, 1)).toEqual([500, 500]); // A = 1: even
    expect(gapsMs(0.3003, 1, 1)).toEqual([675, 325]); // from the alignment as shown, 0.30
    const [a, b] = gapsMs(0.37, 0.5, 1.25);
    expect(a + b).toBe(400); // half a second at 1¼×
  });
});

describe('which frame is sounding', () => {
  it('counts frames from 1 in time order, per region', () => {
    const ocean = SOURCES.find((s) => s.key === 'ocean')!;
    const region = ocean.scene.regions[0].id;
    const steps = regionSteps(ocean.features, region);
    expect(frameOf(ocean.features, steps[0])).toEqual({ n: 1, of: steps.length });
    expect(frameOf(ocean.features, steps[steps.length - 1])).toEqual({ n: steps.length, of: steps.length });
  });
});

describe('the chord under the Earth note', () => {
  it('names the chord and what E4 is in it, for each chord of the phrase', () => {
    expect(earthNoteName()).toBe('E4');
    expect(chordNow(0)).toEqual({ id: 'C', name: 'C', role: 'E is its 3rd' });
    expect(chordNow(2)).toEqual({ id: 'Am7', name: 'Am7', role: 'E is its 5th' });
    expect(chordNow(4)).toEqual({ id: 'F', name: 'Fmaj7', role: 'E adds the 7th' });
    expect(chordNow(6)).toEqual({ id: 'Gsus', name: 'Gsus4', role: 'E adds the 6th' });
    expect(chordNow(10)).toEqual(chordNow(0)); // the phrase is ten beats
  });
});
