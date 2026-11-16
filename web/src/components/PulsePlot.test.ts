import { describe, expect, it } from 'vitest';
import type { EarthTrack } from '../audio/earthVoice';
import { needleAt, pulseLines, xOfBeat } from './PulsePlot';

// Two beats of one second: the first has its pulses (second at 0.73 of the beat), the second is missing.
const track = {
  regionId: 'r',
  length: 2,
  steps: [
    { t: 0, dur: 1, step: {} as never, events: [{ t: 0 }, { t: 0.73 }] as never },
    { t: 1, dur: 1, step: {} as never, events: [] },
  ],
} as unknown as EarthTrack;

describe('pulse plot', () => {
  it('puts the second peak where the second pulse lands, and leaves a missing frame without peaks', () => {
    const lines = pulseLines(track);
    expect(lines[0]).toBeCloseTo(0.73);
    expect(lines[1]).toBeNull();
  });

  it('finds the sounding beat and how far the needle is through it', () => {
    expect(needleAt(track, 0)).toEqual({ step: 0, fraction: 0 });
    expect(needleAt(track, 0.5)).toEqual({ step: 0, fraction: 0.5 });
    expect(needleAt(track, 1.25)).toEqual({ step: 1, fraction: 0.25 });
    expect(needleAt(track, 9).fraction).toBe(1);
  });

  it('draws the first pulse and the end of the beat inside the canvas, in order', () => {
    expect(xOfBeat(0)).toBeGreaterThan(0.1);
    expect(xOfBeat(1)).toBeLessThan(0.9);
    expect(xOfBeat(0.58)).toBeLessThan(xOfBeat(0.73));
  });
});
