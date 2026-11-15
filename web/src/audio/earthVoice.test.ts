import { describe, expect, it } from 'vitest';
import { buildEarthTrack, longFraction, stepToEvents } from './earthVoice';
import { mockFeatures } from '../data/dataset';
import type { Step } from '../data/types';

describe('longFraction (rule from docs/mapping_spec.md)', () => {
  it('A = 1 gives an even 50/50 split', () => expect(longFraction(1)).toBe(0.5));
  it('A = 0.5 gives about 62/38', () => expect(longFraction(0.5)).toBeCloseTo(0.625));
  it('A = 0 gives a strong 75/25 long–short', () => expect(longFraction(0)).toBe(0.75));
  it('clamps values outside 0–1', () => {
    expect(longFraction(1.2)).toBe(0.5);
    expect(longFraction(-0.1)).toBe(0.75);
  });
});

describe('stepToEvents', () => {
  const ok: Step = { t: 0, region: 'r', status: 'ok', alignment: 0, reason: null };
  const missing: Step = { t: 0, region: 'r', status: 'missing', alignment: null, reason: 'blank' };

  it('an ok step makes two Earth pulses, the second at long_fraction of the beat', () => {
    const ev = stepToEvents(ok, 1, 0.5);
    expect(ev).toHaveLength(2);
    expect(ev[0].t).toBe(1);
    expect(ev[1].t).toBeCloseTo(1 + 0.75 * 0.5);
    expect(ev.every((e) => e.voice === 'earth')).toBe(true);
  });

  it('every Earth note carries a why that matches the step', () => {
    const [e] = stepToEvents({ ...ok, alignment: 0.82 }, 0, 0.5);
    expect(e.why).toEqual({
      region: 'r',
      alignment: 0.82,
      long_fraction: longFraction(0.82),
      rule: 'long_fraction = 0.75 - 0.25 * alignment',
    });
  });

  it('note length is the same for every alignment, even on short beats (it carries no data)', () => {
    for (const beat of [0.2, 0.3, 0.5, 1.0]) {
      const lengths = new Set([0, 0.3, 0.7, 1].map((a) => stepToEvents({ ...ok, alignment: a }, 0, beat)[0].dur));
      expect(lengths.size, `beat ${beat}s`).toBe(1);
    }
  });

  it('a pulse always ends before the next one starts', () => {
    for (const beat of [0.2, 0.5, 1.0]) {
      const [p1, p2] = stepToEvents(ok, 0, beat); // A = 0: shortest second gap
      expect(p1.t + p1.dur).toBeLessThan(p2.t);
      expect(p2.t + p2.dur).toBeLessThan(beat);
    }
  });

  it('a missing step makes no Earth notes at all (quiet, not A = 0)', () => {
    expect(stepToEvents(missing, 0, 0.5)).toEqual([]);
  });
});

describe('buildEarthTrack on the practice data', () => {
  it('replay gives the same Earth rhythm (same input, identical notes)', () => {
    const a = buildEarthTrack(mockFeatures, 'boundary_current');
    const b = buildEarthTrack(mockFeatures, 'boundary_current');
    expect(b).toEqual(a);
  });

  it('keeps missing steps in place in the timeline', () => {
    const track = buildEarthTrack(mockFeatures, 'gyre_interior');
    expect(track.steps.map((s) => s.t)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
    expect(track.steps[3].step.status).toBe('missing');
    expect(track.steps[3].events).toEqual([]);
    expect(track.length).toBe(4);
  });

  it('the aligned region sounds more even than the mixed region', () => {
    const lf = (id: string) =>
      buildEarthTrack(mockFeatures, id).steps.flatMap((s) => s.events.map((e) => e.why!.long_fraction));
    const mean = (xs: number[]) => xs.reduce((x, y) => x + y, 0) / xs.length;
    expect(mean(lf('boundary_current'))).toBeLessThan(mean(lf('gyre_interior')));
  });

  it('throws a clear error for an unknown region', () => {
    expect(() => buildEarthTrack(mockFeatures, 'nope')).toThrow(/No steps for region "nope"/);
  });
});
