// The struck bars' tones come from the equations of a vibrating bar (docs/mapping_spec.md, "Play
// along: the picture scan"). This file solves those equations again and compares the answers with
// the numbers the instruments use. No sound is made here: the audio library is not loaded.
import { describe, expect, it, vi } from 'vitest';

vi.mock('tone', () => ({}));

import { GLOCKENSPIEL, KALIMBA, MARIMBA, MUSIC_BOX } from './instruments';

/** The root of cos x · cosh x = target between lo and hi, by halving the interval. */
function root(target: number, lo: number, hi: number): number {
  const f = (x: number) => Math.cos(x) * Math.cosh(x) - target;
  expect(f(lo) * f(hi), `no sign change between ${lo} and ${hi}`).toBeLessThan(0);
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(lo) * f(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/** A bar's tones are in the ratios (xₙ ÷ x₁)², where the x are the roots of its equation. */
const ratios = (roots: number[]) => roots.map((x) => (x / roots[0]) ** 2);

describe('the bars ring at the ratios their equations give', () => {
  it('a bar free at both ends (glockenspiel): cos x · cosh x = 1', () => {
    // The roots sit near 1.5π, 2.5π, 3.5π and 4.5π. x = 0 also solves the equation and is no tone.
    const roots = [1.5, 2.5, 3.5, 4.5].map((k) => root(1, k * Math.PI - 0.5, k * Math.PI + 0.5));
    expect(roots[0]).toBeCloseTo(4.73, 3);
    const expected = ratios(roots);
    GLOCKENSPIEL.partials.forEach((p, i) => expect(p.ratio).toBeCloseTo(expected[i], 3));
    expect(expected.map((r) => r.toFixed(4))).toEqual(['1.0000', '2.7565', '5.4039', '8.9330']);
  });

  it('a bar clamped at one end (music box, kalimba): cos x · cosh x = −1', () => {
    const roots = [root(-1, 1, 3), root(-1, 4, 5.5), root(-1, 7, 8.5)];
    expect(roots[0]).toBeCloseTo(1.8751, 4);
    const expected = ratios(roots);
    for (const bar of [MUSIC_BOX, KALIMBA]) bar.partials.forEach((p, i) => expect(p.ratio).toBeCloseTo(expected[i], 3));
    expect(expected.map((r) => r.toFixed(4))).toEqual(['1.0000', '6.2669', '17.5475']);
  });

  it('the marimba is tuned by its maker, not by an equation: 1 : 4 : 9.2', () => {
    expect(MARIMBA.partials.map((p) => p.ratio)).toEqual([1, 4, 9.2]);
  });
});
