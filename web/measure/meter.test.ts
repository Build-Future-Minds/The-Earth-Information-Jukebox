// The sound meter, checked on made-up signals whose answers are known (TEST INPUTS, not recordings).
import { describe, expect, it } from 'vitest';
import { bandDb, bandLevels, cut, integratedLoudness, kWeighting, peakDb, rmsDb, toDb, type Stereo } from './meter';

const RATE = 48000;

/** A sine in both channels. `peak` is its amplitude; `seconds` its length. */
function sine(hz: number, peak: number, seconds: number, rate = RATE): Stereo {
  const left = new Float32Array(Math.round(seconds * rate));
  for (let n = 0; n < left.length; n++) left[n] = peak * Math.sin((2 * Math.PI * hz * n) / rate);
  return { sampleRate: rate, left, right: left.slice() };
}
const fromDb = (db: number) => 10 ** (db / 20);
const silence = (seconds: number): Stereo => ({ sampleRate: RATE, left: new Float32Array(seconds * RATE), right: new Float32Array(seconds * RATE) });
const join = (...parts: Stereo[]): Stereo => {
  const all = (pick: (s: Stereo) => Float32Array) => {
    const out = new Float32Array(parts.reduce((n, p) => n + pick(p).length, 0));
    let at = 0;
    for (const p of parts) {
      out.set(pick(p), at);
      at += pick(p).length;
    }
    return out;
  };
  return { sampleRate: RATE, left: all((s) => s.left), right: all((s) => s.right) };
};

describe('K-weighting', () => {
  it('at 48 000 samples a second the filters are the ones printed in ITU-R BS.1770', () => {
    const { shelf, highpass } = kWeighting(48000);
    const table = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [1, -1.69065929318241, 0.73248077421585] };
    shelf.b.forEach((v, i) => expect(v).toBeCloseTo(table.b[i], 8));
    shelf.a.forEach((v, i) => expect(v).toBeCloseTo(table.a[i], 8));
    expect(highpass.b).toEqual([1, -2, 1]);
    [1, -1.99004745483398, 0.99007225036621].forEach((v, i) => expect(highpass.a[i]).toBeCloseTo(v, 8));
  });
});

describe('integrated loudness (LUFS)', () => {
  // EBU Tech 3341, cases 1 and 2: a 1000 Hz stereo sine at −23 dBFS reads −23.0 LUFS, at −33 dBFS −33.0, within 0.1.
  it('a 1000 Hz stereo sine at −23 dBFS reads −23.0 LUFS', () => {
    expect(integratedLoudness(sine(1000, fromDb(-23), 20))).toBeCloseTo(-23, 1);
  });
  it('the same sine at −33 dBFS reads −33.0 LUFS', () => {
    expect(integratedLoudness(sine(1000, fromDb(-33), 20))).toBeCloseTo(-33, 1);
  });
  it('the answer does not depend on the sample rate', () => {
    expect(integratedLoudness(sine(1000, fromDb(-23), 20, 44100))).toBeCloseTo(-23, 1);
  });
  it('silence before and after the sound changes it only through the blocks that straddle the edges', () => {
    // A 10 s tone has 97 whole blocks. With silence around it, 3 more blocks at each end hold the
    // tone for 3/4, 1/2 and 1/4 of their length and still pass the gate: mean power 100/103, −0.13 dB.
    const tone = sine(1000, fromDb(-23), 10);
    const padded = integratedLoudness(join(silence(5), tone, silence(5)));
    expect(padded - integratedLoudness(tone)).toBeCloseTo(10 * Math.log10(100 / 103), 2);
  });
  it('a quiet passage more than 10 below the rest is left out (EBU Tech 3341, case 3)', () => {
    // −36 dBFS for 10 s, −23 for 60 s, −36 for 10 s: −23.0 LUFS.
    const quiet = sine(1000, fromDb(-36), 10);
    expect(integratedLoudness(join(quiet, sine(1000, fromDb(-23), 60), quiet))).toBeCloseTo(-23, 1);
  });
  it('a silent recording has no loudness', () => {
    expect(integratedLoudness(silence(3))).toBe(-Infinity);
  });
  it('a low tone counts for less than a middle one: 100 Hz reads more than 1 below 1000 Hz at the same level', () => {
    expect(integratedLoudness(sine(1000, 0.1, 5)) - integratedLoudness(sine(100, 0.1, 5))).toBeGreaterThan(1);
  });
});

describe('peak, level and level in a band', () => {
  it('peak is the largest sample', () => {
    expect(peakDb(sine(1000, 0.5, 1))).toBeCloseTo(toDb(0.5), 2);
  });
  it('the level of a sine is 3.01 dB under its peak', () => {
    expect(rmsDb(sine(1000, 0.5, 1).left)).toBeCloseTo(toDb(0.5) - 3.01, 2);
  });
  it('cut takes the seconds asked for', () => {
    const part = cut(join(silence(1), sine(1000, 0.5, 1), silence(1)), 1, 2);
    expect(part.left.length).toBe(RATE);
    expect(peakDb(part)).toBeCloseTo(toDb(0.5), 2);
  });
  it('a band holds the tone inside it and not the louder tone outside it', () => {
    // 523 Hz at amplitude 0.1 with 1046 Hz at 0.5 on top: the band 480 to 570 Hz reads the first alone.
    const quiet = sine(523, 0.1, 3).left;
    const loud = sine(1046, 0.5, 3).left;
    const both = quiet.map((v, n) => v + loud[n]);
    expect(bandDb(both, RATE, 480, 570)).toBeCloseTo(toDb(0.1 / Math.SQRT2), 1);
    expect(bandDb(both, RATE, 1000, 1100)).toBeCloseTo(toDb(0.5 / Math.SQRT2), 1);
    expect(bandDb(both, RATE, 700, 800)).toBeLessThan(-80);
  });
  it('twice the amplitude in the band is 6.02 dB more', () => {
    const a = bandDb(sine(523, 0.1, 2).left, RATE, 480, 570);
    const b = bandDb(sine(523, 0.2, 2).left, RATE, 480, 570);
    expect(b - a).toBeCloseTo(6.02, 2);
  });
  it('the fast version gives the same levels as bandDb, several bands at once', () => {
    // 1.3 s is not a power of two in samples, so the fast version pads with zeros.
    const quiet = sine(523, 0.1, 1.3).left;
    const loud = sine(1046, 0.5, 1.3).left;
    const low = sine(131, 0.03, 1.3).left;
    const mix = quiet.map((v, n) => v + loud[n] + low[n]);
    const bands: [number, number][] = [[480, 570], [1000, 1100], [120, 140], [700, 800]];
    const fast = bandLevels(mix, RATE, bands);
    bands.slice(0, 3).forEach(([lo, hi], i) => expect(fast[i]).toBeCloseTo(bandDb(mix, RATE, lo, hi), 1));
    expect(fast[0]).toBeCloseTo(toDb(0.1 / Math.SQRT2), 1);
    expect(fast[2]).toBeCloseTo(toDb(0.03 / Math.SQRT2), 1);
    expect(fast[3]).toBeLessThan(-80);
  });
});
