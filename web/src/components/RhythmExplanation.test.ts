import { describe, expect, it } from 'vitest';
import { stepToEvents, type TrackStep } from '../audio/earthVoice';
import type { Step } from '../data/types';
import { SAME_BELOW, compareLine, explain, stepAtSameMoment } from './RhythmExplanation';

const ok = (region: string, alignment: number, frame = 0, t = 0): Step => ({
  t,
  frame,
  source_time: null,
  region,
  status: 'ok',
  alignment,
  reason: null,
});
const missing = (region: string, frame = 0): Step => ({
  t: 0,
  frame,
  source_time: null,
  region,
  status: 'missing',
  alignment: null,
  reason: 'too few visible lines',
});
const playing = (s: Step): TrackStep => ({ t: 0, dur: 0.5, step: s, events: stepToEvents(s, 0, 0.5) });
const regionB = (s: Step | null) => ({ label: 'Region B', step: s });

describe('compareLine', () => {
  it('says more even when this region is clearly more aligned', () => {
    const line = compareLine(playing(ok('a', 0.8)), regionB(ok('b', 0.4)))!;
    expect(line).toContain('more even');
    expect(line).toContain('second pulse at 55% of the beat, against 65% for Region B');
  });

  it('says less even, more short–long when this region is clearly less aligned', () => {
    const line = compareLine(playing(ok('a', 0.4)), regionB(ok('b', 0.8)))!;
    expect(line).toContain('less even, more short–long');
    expect(line).toContain('second pulse at 65% of the beat, against 55% for Region B');
  });

  it('says about as even as when the alignments are too close, names the cut-off, and claims nothing about hearing', () => {
    const line = compareLine(playing(ok('a', 0.5)), regionB(ok('b', 0.4)))!;
    expect(line).toContain('about as even as Region B');
    expect(line).not.toContain('sounds');
    expect(line).toContain(`less than ${SAME_BELOW.toFixed(2)}`);
    expect(line).not.toContain('more even');
  });

  it('a gap exactly at the cut-off counts as a difference (same as the quiz)', () => {
    expect(compareLine(playing(ok('a', 0.6)), regionB(ok('b', 0.4)))).toContain('more even');
    expect(compareLine(playing(ok('a', 0.4)), regionB(ok('b', 0.6)))).toContain('less even');
  });

  it('gives no line when the other region is missing, never treating it as 0', () => {
    expect(compareLine(playing(ok('a', 0.8)), regionB(missing('b')))).toBeNull();
  });

  it('gives no line when the other region has no step at that moment, or there is no other region', () => {
    expect(compareLine(playing(ok('a', 0.8)), regionB(null))).toBeNull();
    expect(compareLine(playing(ok('a', 0.8)), null)).toBeNull();
    expect(compareLine(playing(ok('a', 0.8)), undefined)).toBeNull();
  });

  it('gives no line when this region is missing or nothing is sounding', () => {
    expect(compareLine(playing(missing('a')), regionB(ok('b', 0.8)))).toBeNull();
    expect(compareLine(null, regionB(ok('b', 0.8)))).toBeNull();
  });
});

describe('explain with a comparison', () => {
  it('on real-looking values neither region is "even", but the comparison still says which is more even', () => {
    // Real patches span about 0.15 to 0.50, so the single-region words are "slight lilt" and "short–long".
    const text = explain(playing(ok('a', 0.45)), regionB(ok('b', 0.15)));
    expect(text).toContain('has a slight lilt');
    expect(text).not.toContain('is even');
    expect(text).toContain('more even');
    expect(text).toContain('Region B');
  });

  it('is unchanged when there is nothing to compare with', () => {
    const s = playing(ok('a', 0.45));
    expect(explain(s, null)).toBe(explain(s));
    expect(explain(s, regionB(missing('b')))).toBe(explain(s));
  });

  it('a missing region still just says the Earth voice is quiet', () => {
    expect(explain(playing(missing('a')), regionB(ok('b', 0.8)))).toContain('Earth voice is quiet');
    expect(explain(playing(missing('a')), regionB(ok('b', 0.8)))).not.toContain('Compared with');
  });
});

describe('stepAtSameMoment', () => {
  const steps = [ok('a', 0.1, 0, 0), ok('b', 0.2, 0, 0), ok('a', 0.3, 1, 0.5), ok('b', 0.4, 1, 0.5), missing('b', 2)];

  it('finds the other region at the same frame', () => {
    expect(stepAtSameMoment(steps, steps[2], 'b')).toBe(steps[3]);
  });

  it('does not return a step from a different moment', () => {
    expect(stepAtSameMoment(steps, steps[0], 'b')).toBe(steps[1]);
  });

  it('falls back to the playback time when steps have no frame', () => {
    const a: Step = { t: 1, region: 'a', status: 'ok', alignment: 0.5, reason: null };
    const b: Step = { t: 1, region: 'b', status: 'ok', alignment: 0.2, reason: null };
    const later: Step = { t: 2, region: 'b', status: 'ok', alignment: 0.9, reason: null };
    expect(stepAtSameMoment([later, b], a, 'b')).toBe(b);
  });

  it('returns null when the other region has no step at that moment', () => {
    expect(stepAtSameMoment(steps, ok('a', 0.5, 9, 9), 'b')).toBeNull();
  });
});
