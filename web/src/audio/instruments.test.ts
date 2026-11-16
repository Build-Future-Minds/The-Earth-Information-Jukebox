// The struck bars' tones come from the equations of a vibrating bar (docs/mapping_spec.md, "Play
// along: the picture scan"). This file solves those equations again and compares the answers with
// the numbers the instruments use. No sound is made here: the audio library is not loaded.
import { describe, expect, it, vi } from 'vitest';

vi.mock('tone', () => ({}));

import { GLOCKENSPIEL, HARP, HARP_PLUCK, KALIMBA, MARIMBA, MUSIC_BOX, pluckedString } from './instruments';

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

describe('the harp: a string plucked at a fraction p of its length', () => {
  const p = HARP_PLUCK;
  /** The pluck's shape: a triangle from 0 up to height 1 at x = p, and back down to 0 at x = 1. */
  const triangle = (x: number) => (x <= p ? x / p : (1 - x) / (1 - p));
  /** Its Fourier sine coefficients: bₙ = 2·sin(nπp) ÷ (n²π²·p(1 − p)), for height 1. */
  const b = (n: number) => (2 * Math.sin(n * Math.PI * p)) / (n * n * Math.PI * Math.PI * p * (1 - p));

  it('the coefficients add back up to the triangle the finger makes', () => {
    for (const x of [0.05, 0.2, 0.3, 0.5, 0.77, 0.95]) {
      let y = 0;
      // The tail after N terms is at most 2 ÷ (π²·p(1 − p)·N): under 0.0001 for N = 20 000.
      for (let n = 1; n <= 20000; n++) y += b(n) * Math.sin(n * Math.PI * x);
      expect(y).toBeCloseTo(triangle(x), 3);
    }
  });

  it('the force on the bridge multiplies tone n by n, so each tone is |sin(nπp)| ÷ n, relative to the first', () => {
    // The bridge feels T · ∂y/∂x at x = 0; ∂/∂x of bₙ·sin(nπx) at 0 is nπ·bₙ.
    const bridge = (n: number) => Math.abs(n * Math.PI * b(n));
    HARP.partials.forEach((partial, k) => {
      expect(partial.ratio).toBe(k + 1); // harmonic: 1, 2, 3, ...
      expect(partial.gain).toBeCloseTo(bridge(k + 1) / bridge(1), 12);
    });
    expect(pluckedString(p, 8)).toEqual(HARP.partials);
  });

  it('plucked at 0.3, none of the eight tones is missing; plucked in the middle, every even tone would be', () => {
    expect(HARP.partials.every((t) => t.gain > 0.01)).toBe(true);
    pluckedString(0.5, 8).forEach((t) => (t.ratio % 2 === 0 ? expect(t.gain).toBeLessThan(1e-12) : expect(t.gain).toBeGreaterThan(0.1)));
  });

  it('higher tones fade sooner: tone n rings 1 ÷ n as long as the first', () => {
    HARP.partials.forEach((t) => expect(t.ring).toBeCloseTo(1 / t.ratio, 12));
  });
});
