// Compare view helpers: the tide curve (alignment over the frames) and the word under each numeral.
import { describe, expect, it } from 'vitest';
import type { Step } from '../data/types';
import { shapeWord, tideCurve } from './compare';

const ok = (alignment: number, t = 0): Step => ({ t, region: 'r', status: 'ok', alignment, reason: null });
const gap = (t = 0): Step => ({ t, region: 'r', status: 'missing', alignment: null, reason: 'too few lines' });

describe('tideCurve', () => {
  it('one frame (a still picture) is one dot, not an empty line', () => {
    expect(tideCurve([ok(0.5)], 600, 120)).toEqual({ path: '', dots: [{ x: 0, y: 60 }] });
  });
  it('a missing frame lifts the pen; a point with no neighbour becomes a dot', () => {
    const c = tideCurve([ok(0), ok(1, 1), gap(2), ok(0.5, 3)], 300, 100);
    expect(c.path).toBe('M0.0 100.0 L100.0 0.0');
    expect(c.dots).toEqual([{ x: 300, y: 50 }]);
  });
  it('all missing: nothing drawn, never a zero line', () => {
    expect(tideCurve([gap(), gap(1)], 300, 100)).toEqual({ path: '', dots: [] });
  });
});

describe('shapeWord', () => {
  it('uses the same words as Explain', () => {
    expect(shapeWord(0.95)).toBe('Lined up');
    expect(shapeWord(0.67)).toBe('Partly lined up');
    expect(shapeWord(0.08)).toBe('Swirly');
  });
});
