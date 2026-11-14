import { describe, expect, it } from 'vitest';
import { lineTicks } from './lineTicks';

const N = 60;
const circle = { cx: N / 2, cy: N / 2, r: N / 2 };

/** A test picture: bright lines on black, period 6 px, running along the given direction. */
function stripes(direction: 'horizontal' | 'vertical' | 'diagonal'): Uint8ClampedArray {
  const px = new Uint8ClampedArray(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const k = direction === 'horizontal' ? y : direction === 'vertical' ? x : x + y;
      const v = k % 6 < 2 ? 255 : 0;
      px.set([v, v / 2, 0, 255], (y * N + x) * 4); // coloured on purpose: brightness = max of R, G, B
    }
  }
  return px;
}

/** Smallest angle between a tick and a direction, as undirected lines (0..90°). */
const off = (a: number, target: number) => {
  const d = Math.abs(((a - target) % Math.PI + Math.PI) % Math.PI);
  return (Math.min(d, Math.PI - d) * 180) / Math.PI;
};

describe('lineTicks (illustration of line direction)', () => {
  it('horizontal lines give horizontal ticks', () => {
    const t = lineTicks(stripes('horizontal'), N, N, circle, 12, 12);
    expect(t.length).toBeGreaterThan(5);
    expect(Math.max(...t.map((k) => off(k.angle, 0)))).toBeLessThan(5);
  });

  it('vertical lines give vertical ticks', () => {
    const t = lineTicks(stripes('vertical'), N, N, circle, 12, 12);
    expect(Math.max(...t.map((k) => off(k.angle, Math.PI / 2)))).toBeLessThan(5);
  });

  it('diagonal lines give diagonal ticks', () => {
    // x + y constant: the lines run at 135° (down-left) in screen coordinates
    const t = lineTicks(stripes('diagonal'), N, N, circle, 12, 12);
    expect(Math.max(...t.map((k) => off(k.angle, (3 * Math.PI) / 4)))).toBeLessThan(5);
  });

  it('a blank picture gives no ticks', () => {
    const blank = new Uint8ClampedArray(N * N * 4).fill(30);
    expect(lineTicks(blank, N, N, circle, 12, 12)).toEqual([]);
  });

  it('only cells inside the circle get ticks', () => {
    const t = lineTicks(stripes('horizontal'), N, N, circle, 12, 12);
    for (const k of t) expect(Math.hypot(k.cx - circle.cx, k.cy - circle.cy)).toBeLessThan(circle.r);
  });
});
