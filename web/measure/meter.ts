// Sound measurements for `npm run measure`: loudness, peak, level in a band of frequencies.
// Pure functions on recorded samples, so they run in the browser (on a recording of the app) and
// in the unit tests (on signals whose answers are known). See README.md in this folder.

/** A two-channel recording. Samples run from −1 to 1; 1 is full scale (0 dBFS). */
export interface Stereo {
  sampleRate: number;
  left: Float32Array;
  right: Float32Array;
}

/** Amplitude ratio → decibels. */
export const toDb = (amplitude: number) => 20 * Math.log10(amplitude);

/** One second-order filter, run over a signal: y[n] = b0·x[n] + b1·x[n−1] + b2·x[n−2] − a1·y[n−1] − a2·y[n−2]. */
function biquad(x: ArrayLike<number>, b: number[], a: number[]): Float64Array {
  const y = new Float64Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let n = 0; n < x.length; n++) {
    const v = b[0] * x[n] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1;
    x1 = x[n];
    y2 = y1;
    y1 = v;
    y[n] = v;
  }
  return y;
}

/**
 * The two filters of "K-weighting" (ITU-R BS.1770): a shelf that lifts high frequencies by about
 * 4 dB, as a head does, and a high-pass that removes the lowest ones. The standard prints the
 * numbers for 48 000 samples a second only; these formulas give the same filters at any rate (the
 * constants are the ones the libebur128 library uses), and a unit test checks them against the
 * standard's table.
 */
export function kWeighting(sampleRate: number) {
  const gain = 3.999843853973347; // dB
  let k = Math.tan((Math.PI * 1681.974450955533) / sampleRate);
  let q = 0.7071752369554196;
  const vh = 10 ** (gain / 20);
  const vb = vh ** 0.4996667741545416;
  let a0 = 1 + k / q + k * k;
  const shelf = {
    b: [(vh + (vb * k) / q + k * k) / a0, (2 * (k * k - vh)) / a0, (vh - (vb * k) / q + k * k) / a0],
    a: [1, (2 * (k * k - 1)) / a0, (1 - k / q + k * k) / a0],
  };
  k = Math.tan((Math.PI * 38.13547087602444) / sampleRate);
  q = 0.5003270373238773;
  a0 = 1 + k / q + k * k;
  const highpass = { b: [1, -2, 1], a: [1, (2 * (k * k - 1)) / a0, (1 - k / q + k * k) / a0] };
  return { shelf, highpass };
}

/**
 * Integrated loudness in LUFS (ITU-R BS.1770-4): K-weight both channels, take the mean square in
 * blocks of 0.4 s that overlap by three quarters, drop blocks quieter than −70 LUFS, then drop
 * blocks more than 10 below the average of the rest, and average what is left. Silent blocks are
 * dropped, but a block that straddles the start or the end of the sound still counts, so cut the
 * recording to the sound before measuring (a unit test shows the size of the effect: 0.13 dB on a
 * 10 s tone). −Infinity for a silent recording.
 */
export function integratedLoudness(s: Stereo): number {
  const { shelf, highpass } = kWeighting(s.sampleRate);
  const channels = [s.left, s.right].map((c) => biquad(biquad(c, shelf.b, shelf.a), highpass.b, highpass.a));
  const block = Math.round(0.4 * s.sampleRate);
  const hop = Math.round(0.1 * s.sampleRate);
  const powers: number[] = [];
  for (let start = 0; start + block <= channels[0].length; start += hop) {
    let power = 0;
    for (const c of channels) {
      let sum = 0;
      for (let n = start; n < start + block; n++) sum += c[n] * c[n];
      power += sum / block;
    }
    powers.push(power);
  }
  const lufs = (power: number) => -0.691 + 10 * Math.log10(power);
  const mean = (list: number[]) => list.reduce((a, b) => a + b, 0) / list.length;
  const audible = powers.filter((p) => lufs(p) > -70);
  if (!audible.length) return -Infinity;
  const gate = lufs(mean(audible)) - 10;
  return lufs(mean(audible.filter((p) => lufs(p) > gate)));
}

/** The part of a recording between two times, in seconds from its start. */
export function cut(s: Stereo, from: number, to: number): Stereo {
  const a = Math.max(0, Math.round(from * s.sampleRate));
  const b = Math.min(s.left.length, Math.round(to * s.sampleRate));
  return { sampleRate: s.sampleRate, left: s.left.slice(a, Math.max(a, b)), right: s.right.slice(a, Math.max(a, b)) };
}

/** Largest sample in either channel, in dBFS. Not a "true peak": peaks between samples can be a little higher. */
export function peakDb(s: Stereo): number {
  let top = 0;
  for (const c of [s.left, s.right]) for (let n = 0; n < c.length; n++) top = Math.max(top, Math.abs(c[n]));
  return toDb(top);
}

/** Root-mean-square level of one channel, in dBFS. */
export function rmsDb(x: ArrayLike<number>): number {
  let sum = 0;
  for (let n = 0; n < x.length; n++) sum += x[n] * x[n];
  return x.length ? 10 * Math.log10(sum / x.length) : -Infinity;
}

/**
 * Level of everything between two frequencies in one channel, in dBFS (root mean square).
 * It adds up the signal's spectrum over that band, after a Hann window so that tones outside the
 * band do not leak in. A sine of amplitude A inside the band reads 20·log₁₀(A ÷ √2).
 */
export function bandDb(x: ArrayLike<number>, sampleRate: number, lowHz: number, highHz: number): number {
  const n = x.length;
  if (n < 2) return -Infinity;
  const windowed = new Float64Array(n);
  let windowPower = 0;
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    windowed[i] = w * x[i];
    windowPower += w * w;
  }
  let total = 0;
  for (let bin = Math.ceil((lowHz * n) / sampleRate); bin <= Math.floor((highHz * n) / sampleRate); bin++) {
    // One spectrum value, by turning a unit vector a fixed step per sample.
    const step = (2 * Math.PI * bin) / n;
    const cos = Math.cos(step);
    const sin = Math.sin(step);
    let c = 1;
    let s = 0;
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      re += windowed[i] * c;
      im -= windowed[i] * s;
      const next = c * cos - s * sin;
      s = s * cos + c * sin;
      c = next;
    }
    total += re * re + im * im;
  }
  return 10 * Math.log10((2 * total) / (n * windowPower));
}

/**
 * The same as `bandDb` for several bands at once, fast enough for a whole recording: one Fourier
 * transform (radix 2, the signal padded with zeros to the next power of two) instead of one sum per
 * frequency. Padding makes the frequency steps finer, so the sum over a band is divided by the
 * padded length; a unit test checks that it gives bandDb's answer.
 */
export function bandLevels(x: ArrayLike<number>, sampleRate: number, bands: [number, number][]): number[] {
  const n = x.length;
  if (n < 2) return bands.map(() => -Infinity);
  let size = 1;
  while (size < n) size *= 2;
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  let windowPower = 0;
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    re[i] = w * x[i];
    windowPower += w * w;
  }
  fft(re, im);
  return bands.map(([low, high]) => {
    let total = 0;
    for (let bin = Math.ceil((low * size) / sampleRate); bin <= Math.floor((high * size) / sampleRate); bin++) total += re[bin] * re[bin] + im[bin] * im[bin];
    return 10 * Math.log10((2 * total) / (size * windowPower));
  });
}

/** Fourier transform in place (radix 2; the length must be a power of two). */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let length = 2; length <= n; length *= 2) {
    const angle = (-2 * Math.PI) / length;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    for (let start = 0; start < n; start += length) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < length / 2; k++) {
        const a = start + k;
        const b = a + length / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const next = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = next;
      }
    }
  }
}
