// Browser side of `npm run measure` (see README.md in this folder). It runs the app's own scan
// rule (src/audio/scanScore.ts) on the app's own pictures, loaded the way the app loads them, and
// returns numbers. The dev server serves this file; it is never part of the built app.
//
// Why in the browser: the scan reads pixels from a canvas, and a JPEG can decode a grey level or
// two differently in another program. Measured here, the numbers are the ones the app plays.
import {
  CHIME_RULE,
  LINE_GRID,
  STRENGTH_FLOOR,
  buildScanScore,
  colourStrength,
  findChimes,
  isWarm,
  levelOf,
  regionScan,
  type Pixels,
  type ScanGrid,
  type ScanMeasure,
  type ScanShape,
} from '../src/audio/scanScore';
import { loadPicture } from '../src/components/PictureScan';
import { PICTURES } from '../src/data/sources';
import { OCEAN_LAND, landShare, type LandRule } from '../src/globe/geo';

export interface AuditOptions {
  /** Frame 23000 without compression, as a PNG, or null when it is not on this machine. */
  losslessUrl: string | null;
  /** NASA's colour bar for the ocean picture, or null when it is not on this machine. */
  barUrl: string | null;
  /** The numbers printed under the bar, left to right. The digits are read by eye; where they sit is measured. */
  barLabels: number[];
  /** Other copies of frame 23000 to compare with the uncompressed frame, besides the still the app reads. */
  stills: { name: string; url: string }[];
}

/** What one scan of one picture gives. */
export interface ScanSummary {
  cells: number;
  /** Cells with a level above 0: their held note sounds. */
  sounding: number;
  /** Cells at level 1. */
  atFull: number;
  /** Largest cell mean of the measure, 0–1. 0 when no cell is above the floor. */
  largestCellMean: number;
  /** Peaks at or above the chime level, before any is left out. */
  peaks: number;
  /** After "peaks in one band are at least 6 columns apart". */
  afterSpacing: number;
  /** After "one chime per column": the chimes that are played. */
  chimes: number;
  warm: number;
  cool: number;
}

function summarise(pixels: Pixels, shape: ScanShape, measure: ScanMeasure): ScanSummary {
  const score = buildScanScore(pixels, shape, { measure });
  const cyclic = shape.kind === 'radar';
  let sounding = 0;
  let atFull = 0;
  for (const level of score.levels) {
    if (level > 0) sounding++;
    if (level >= 1) atFull++;
  }
  // The same scan with a full level of 1: a level is then (mean − floor) ÷ (1 − floor), so the
  // largest level gives the largest cell mean back.
  const wide = buildScanScore(pixels, shape, { measure, grid: { ...score.grid, fullStrength: 1 } });
  let top = 0;
  for (const level of wide.levels) top = Math.max(top, level);
  // The chime rule with its two "leave out" steps switched off, one at a time.
  const peaks = findChimes(score.levels, score.warmShare, score.grid, cyclic, { ...CHIME_RULE, minGap: 0, perColumn: Infinity });
  const spaced = findChimes(score.levels, score.warmShare, score.grid, cyclic, { ...CHIME_RULE, perColumn: Infinity });
  return {
    cells: score.levels.length,
    sounding,
    atFull,
    largestCellMean: top > 0 ? STRENGTH_FLOOR + top * (1 - STRENGTH_FLOOR) : 0,
    peaks: peaks.length,
    afterSpacing: spaced.length,
    chimes: score.chimes.length,
    warm: score.chimes.filter((c) => c.warm).length,
    cool: score.chimes.filter((c) => !c.warm).length,
  };
}

/**
 * The map sweep's cells, measured by colour strength, with two extras the rule does not have:
 * a weight for each row, and a mask of pixels to leave out. The cell a pixel falls in is copied
 * from buildScanScore; `selfCheck` in the result proves the copy still agrees with it.
 */
function lineCells(pixels: Pixels, grid: ScanGrid, weightOfRow?: (y: number) => number, skip?: Uint8Array) {
  const { columns, bands } = grid;
  const { data, width, height } = pixels;
  const n = columns * bands;
  const sum = new Float64Array(n);
  const warm = new Float64Array(n);
  const read = new Float64Array(n);
  for (let y = 0; y < height; y++) {
    const band = Math.min(bands - 1, Math.floor(((height - (y + 0.5)) * bands) / height));
    const w = weightOfRow ? weightOfRow(y) : 1;
    for (let x = 0; x < width; x++) {
      if (skip && skip[y * width + x]) continue;
      const cell = Math.min(columns - 1, Math.floor(((x + 0.5) * columns) / width)) * bands + band;
      const i = (y * width + x) * 4;
      const s = colourStrength(data[i], data[i + 1], data[i + 2]);
      read[cell] += w;
      sum[cell] += w * s;
      if (isWarm(data[i], data[i + 1], data[i + 2])) warm[cell] += w * s;
    }
  }
  const mean = new Float64Array(n);
  const levels = new Float32Array(n);
  const warmShare = new Float32Array(n);
  for (let c = 0; c < n; c++) {
    if (read[c] === 0) continue;
    mean[c] = sum[c] / read[c];
    levels[c] = levelOf(mean[c], grid.fullStrength);
    warmShare[c] = sum[c] > 0 ? warm[c] / sum[c] : 0;
  }
  return { mean, levels, warmShare, read };
}

const spreadOf = (data: ArrayLike<number>, i: number) => Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);

/** 1 where a pixel is flat grey land by a land rule (mean brightness range, largest channel spread). */
function greyMask(pixels: Pixels, [low, high, maxSpread]: LandRule): Uint8Array {
  const mask = new Uint8Array(pixels.width * pixels.height);
  for (let p = 0; p < mask.length; p++) {
    const i = p * 4;
    const mean = (pixels.data[i] + pixels.data[i + 1] + pixels.data[i + 2]) / 3;
    if (spreadOf(pixels.data, i) <= maxSpread && mean >= low && mean <= high) mask[p] = 1;
  }
  return mask;
}

/** The same mask on another whole-globe map of a different size (nearest pixel). */
function resampleMask(mask: Uint8Array, width: number, height: number, toWidth: number, toHeight: number): Uint8Array {
  if (width === toWidth && height === toHeight) return mask;
  const out = new Uint8Array(toWidth * toHeight);
  for (let y = 0; y < toHeight; y++) {
    const sy = Math.min(height - 1, Math.floor(((y + 0.5) * height) / toHeight));
    for (let x = 0; x < toWidth; x++) {
      out[y * toWidth + x] = mask[sy * width + Math.min(width - 1, Math.floor(((x + 0.5) * width) / toWidth))];
    }
  }
  return out;
}

/** Share of each map-sweep cell's pixels that the mask marks. */
function cellShare(mask: Uint8Array, width: number, height: number, grid: ScanGrid): Float64Array {
  const { columns, bands } = grid;
  const marked = new Float64Array(columns * bands);
  const all = new Float64Array(columns * bands);
  for (let y = 0; y < height; y++) {
    const band = Math.min(bands - 1, Math.floor(((height - (y + 0.5)) * bands) / height));
    for (let x = 0; x < width; x++) {
      const cell = Math.min(columns - 1, Math.floor(((x + 0.5) * columns) / width)) * bands + band;
      all[cell]++;
      if (mask[y * width + x]) marked[cell]++;
    }
  }
  return marked.map((m, c) => (all[c] ? m / all[c] : 0));
}

/** A group of cells: how many, how many sound, their mean level and mean colour strength. */
function group(cells: number[], levels: Float32Array, mean: Float64Array) {
  const n = cells.length;
  return {
    cells: n,
    sounding: cells.filter((c) => levels[c] > 0).length,
    meanLevel: n ? cells.reduce((s, c) => s + levels[c], 0) / n : 0,
    meanStrength: n ? cells.reduce((s, c) => s + mean[c], 0) / n : 0,
    largestStrength: cells.reduce((m, c) => Math.max(m, mean[c]), 0),
  };
}

const indices = (share: Float64Array, keep: (s: number) => boolean) => Array.from(share.keys()).filter((c) => keep(share[c]));

/** Where the "red is the largest channel" rule switches along NASA's colour bar, and the bar's colours. */
function measureBar(bar: Pixels) {
  const counts = Array.from({ length: bar.height }, (_, y) => {
    let count = 0;
    for (let x = 0; x < bar.width; x++) if (spreadOf(bar.data, (y * bar.width + x) * 4) > 100) count++;
    return count;
  });
  const most = Math.max(...counts);
  // The bar is the row with the most strongly coloured pixels (the first, if several tie).
  const row = counts.indexOf(most);
  // Every row of the bar: the rows with nearly as many coloured pixels.
  const rows = counts.flatMap((c, y) => (c >= 0.9 * most ? [y] : []));
  const at = (x: number, y = row) => (y * bar.width + x) * 4;
  const coloured = Array.from({ length: bar.width }, (_, x) => x).filter((x) => spreadOf(bar.data, at(x)) > 100);
  const [x0, x1] = [coloured[0], coloured[coloured.length - 1]];
  const warmAt = (x: number) => isWarm(bar.data[at(x)], bar.data[at(x) + 1], bar.data[at(x) + 2]);
  const switches: number[] = [];
  /** The first pixel after each change of answer. */
  const switchPixels: number[] = [];
  for (let x = x0 + 1; x <= x1; x++) {
    if (warmAt(x) !== warmAt(x - 1)) {
      switches.push((x - x0) / (x1 - x0));
      switchPixels.push(x);
    }
  }
  const strengthAt = (f: number) => {
    const i = at(Math.round(x0 + f * (x1 - x0)));
    return colourStrength(bar.data[i], bar.data[i + 1], bar.data[i + 2]);
  };
  // Each column's colour, averaged over the bar's rows, and the most any row differs from the bar's row.
  let rowDifference = 0;
  const colours: [number, number, number][] = [];
  for (let x = x0; x <= x1; x++) {
    const sum = [0, 0, 0];
    for (const y of rows) {
      for (let k = 0; k < 3; k++) {
        sum[k] += bar.data[at(x, y) + k];
        rowDifference = Math.max(rowDifference, Math.abs(bar.data[at(x, y) + k] - bar.data[at(x) + k]));
      }
    }
    colours.push([sum[0] / rows.length, sum[1] / rows.length, sum[2] / rows.length]);
  }
  return {
    width: bar.width,
    height: bar.height,
    row,
    rows: [rows[0], rows[rows.length - 1]] as [number, number],
    rowDifference,
    from: x0,
    to: x1,
    warmAtColdEnd: warmAt(x0),
    warmAtWarmEnd: warmAt(x1),
    /** Each place the rule changes its answer, as a share of the bar's length. One is expected. */
    switches,
    switchPixels,
    /** Colour strength at every tenth of the bar, cold end first. */
    strength: Array.from({ length: 11 }, (_, k) => strengthAt(k / 10)),
    /** The colour of each column from `from` to `to`, cold end first. */
    colours,
  };
}

/**
 * Where the numbers printed under the bar sit, and whether they lie on one straight line. Below
 * the bar's coloured rows come its frame, a gap, and the row of labels. A label's place is the
 * centre of its ink (each pixel weighted by how much of the label it is); the centre of its box is
 * given too. A straight line x = a + b · value is fitted to the places by least squares.
 */
function measureBarLabels(bar: Pixels, lastBarRow: number, values: number[]) {
  const { data, width, height } = bar;
  let translucent = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) {
      translucent = true;
      break;
    }
  }
  // How much of a label a pixel is: its opacity on a transparent bar, its darkness on an opaque one.
  const ink = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return translucent ? data[i + 3] / 255 : (255 - (data[i] + data[i + 1] + data[i + 2]) / 3) / 255;
  };
  const rowInk = (y: number) => {
    let s = 0;
    for (let x = 0; x < width; x++) s += ink(x, y);
    return s;
  };
  let y = lastBarRow + 1;
  while (y < height && rowInk(y) > 0.5) y++; // the bar's frame
  while (y < height && rowInk(y) <= 0.5) y++; // the gap
  const top = y;
  while (y < height && rowInk(y) > 0.5) y++;
  const bottom = y - 1;
  if (top >= height || bottom < top) return { error: 'no row of labels was found under the bar' };

  const column = Array.from({ length: width }, (_, x) => {
    let s = 0;
    for (let r = top; r <= bottom; r++) s += ink(x, r);
    return s;
  });
  // Six empty columns or more start a new label; the digits of one label are closer than that.
  const groups: number[][] = [];
  let gap = Infinity;
  for (let x = 0; x < width; x++) {
    if (column[x] > 0.05) {
      if (gap >= 6) groups.push([]);
      groups[groups.length - 1].push(x);
      gap = 0;
    } else {
      gap++;
    }
  }
  if (groups.length !== values.length) {
    return { error: `${groups.length} labels were found under the bar (rows ${top} to ${bottom}), not ${values.length}` };
  }
  const labels = groups.map((xs, k) => {
    const mass = xs.reduce((s, x) => s + column[x], 0);
    return {
      value: values[k],
      from: xs[0],
      to: xs[xs.length - 1],
      centre: xs.reduce((s, x) => s + x * column[x], 0) / mass,
      boxCentre: (xs[0] + xs[xs.length - 1]) / 2,
    };
  });
  const fit = (place: (l: (typeof labels)[number]) => number) => {
    const n = labels.length;
    const mv = labels.reduce((s, l) => s + l.value, 0) / n;
    const mx = labels.reduce((s, l) => s + place(l), 0) / n;
    const b = labels.reduce((s, l) => s + (l.value - mv) * (place(l) - mx), 0) / labels.reduce((s, l) => s + (l.value - mv) ** 2, 0);
    const a = mx - b * mv;
    const residuals = labels.map((l) => place(l) - (a + b * l.value));
    return { a, b, residuals, largest: Math.max(...residuals.map(Math.abs)) };
  };
  return { translucent, rows: [top, bottom] as [number, number], labels, byInk: fit((l) => l.centre), byBox: fit((l) => l.boxCentre) };
}

/** A pixel's hue in degrees, 0 to 360 (red 0, green 120, blue 240). NaN for grey, which has none.
 *  Scaling all three channels by the same number does not change it, so a line drawn faintly over
 *  black (anti-aliased) keeps the hue of its colour. */
function hueOf(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return NaN;
  const h = 60 * (max === r ? (g - b) / d : max === g ? (b - r) / d + 2 : (r - g) / d + 4);
  return h < 0 ? h + 360 : h;
}
const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

/** The spread of a pixel (largest − smallest channel, 0–255) in four groups, faint to strong. */
const SPREAD_GROUPS: [number, number][] = [[13, 31], [32, 63], [64, 127], [128, 255]];

/**
 * Do the frame's coloured pixels use the colours of NASA's colour bar? For every pixel above the
 * scan's floor (spread over 12), find the bar colour with the nearest hue, and the bar colour at
 * the smallest angle between the two (red, green, blue) arrows. Neither changes when a colour is
 * drawn faintly over black. Then: is the pixel on the same side of the instrument switch as that
 * bar colour?
 */
function frameAgainstBar(frame: Pixels, colours: [number, number, number][], toleranceDegrees: number) {
  const n = colours.length;
  const barHue = colours.map(([r, g, b]) => hueOf(r, g, b));
  const barWarm = colours.map(([r, g, b]) => isWarm(r, g, b));
  const barLength = colours.map(([r, g, b]) => Math.hypot(r, g, b));
  // Is the bar's hue one-way from end to end? Then each hue is found at one place only.
  let up = 0;
  let down = 0;
  const reversals: number[] = [];
  let direction = 0;
  for (let j = 1; j < n; j++) {
    let d = barHue[j] - barHue[j - 1];
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    if (d > 0) up++;
    if (d < 0) down++;
    const s = Math.sign(d);
    if (s !== 0 && direction !== 0 && s !== direction) reversals.push(j / (n - 1));
    if (s !== 0) direction = s;
  }

  // Count each colour once: the frame has far fewer colours than pixels.
  const seen = new Map<number, number>();
  const { data } = frame;
  for (let i = 0; i < data.length; i += 4) {
    if (spreadOf(data, i) <= 12) continue;
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }

  const BINS = 3600; // 0.05° bins of hue distance, 0 to 180°
  const group = () => ({ pixels: 0, mass: 0, withinPixels: 0, withinMass: 0, adaptivePixels: 0, adaptiveMass: 0, anglePixels: 0, agreeMass: 0, agreePixels: 0, histogram: new Float64Array(BINS) });
  const groups = SPREAD_GROUPS.map(group);
  const all = group();
  const offBar = new Map<number, { mass: number; pixels: number; example: number; exampleCount: number }>();
  const disagreeAt = new Float64Array(20); // where on the bar (by twentieths) the pixels that disagree sit
  let warmMass = 0;
  let pastSwitchMass = 0;
  // For each tenth of the bar, how strong the colours of the frame's pixels of those hues are:
  // a histogram of their spread, and the brightest one's brightness against the bar's.
  const tenths = Array.from({ length: 10 }, () => ({ spread: new Float64Array(256), pixels: 0, brightest: 0, brightestBar: 0, saturation: new Float64Array(201) }));

  for (const [key, count] of seen) {
    const r = key >> 16;
    const g = (key >> 8) & 255;
    const b = key & 255;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    const strength = spread / 255;
    const h = hueOf(r, g, b);
    let nearest = 0;
    let dHue = Infinity;
    let bestCos = -Infinity;
    const length = Math.hypot(r, g, b);
    for (let j = 0; j < n; j++) {
      const d = hueGap(h, barHue[j]);
      if (d < dHue) {
        dHue = d;
        nearest = j;
      }
      const c = (r * colours[j][0] + g * colours[j][1] + b * colours[j][2]) / (length * barLength[j]);
      if (c > bestCos) bestCos = c;
    }
    const angle = (Math.acos(Math.min(1, bestCos)) * 180) / Math.PI;
    const agree = isWarm(r, g, b) === barWarm[nearest];
    const within = dHue <= toleranceDegrees;
    // Rounding to whole grey levels moves the hue by up to 60° ÷ spread for each level; allow two.
    const adaptive = dHue <= Math.max(toleranceDegrees, 120 / spread);
    const mass = count * strength;
    if (isWarm(r, g, b)) warmMass += mass;
    if (barWarm[nearest]) pastSwitchMass += mass;
    for (const target of [all, groups[SPREAD_GROUPS.findIndex(([lo, hi]) => spread >= lo && spread <= hi)]]) {
      target.pixels += count;
      target.mass += mass;
      if (within) {
        target.withinPixels += count;
        target.withinMass += mass;
      }
      if (adaptive) {
        target.adaptivePixels += count;
        target.adaptiveMass += mass;
      }
      if (angle <= toleranceDegrees) target.anglePixels += count;
      if (agree) {
        target.agreeMass += mass;
        target.agreePixels += count;
      }
      target.histogram[Math.min(BINS - 1, Math.floor(dHue / 0.05))] += count;
    }
    if (!agree) disagreeAt[Math.min(19, Math.floor((20 * nearest) / n))] += mass;
    const tenth = tenths[Math.min(9, Math.floor((10 * nearest) / n))];
    tenth.spread[spread] += count;
    tenth.pixels += count;
    const value = Math.max(r, g, b);
    const [br, bg, bb] = colours[nearest];
    const barValue = Math.max(br, bg, bb);
    if (value / barValue > tenth.brightest / Math.max(1, tenth.brightestBar)) {
      tenth.brightest = value;
      tenth.brightestBar = barValue;
    }
    // Saturation (spread ÷ largest channel) of the pixel against that of its bar colour, in hundredths, up to 2.
    const ratio = spread / value / ((barValue - Math.min(br, bg, bb)) / barValue);
    tenth.saturation[Math.min(200, Math.round(100 * ratio))] += count;
    if (!adaptive) {
      const bin = Math.floor(h / 10) * 10;
      const o = offBar.get(bin) ?? { mass: 0, pixels: 0, example: key, exampleCount: 0 };
      o.mass += mass;
      o.pixels += count;
      if (count > o.exampleCount) {
        o.example = key;
        o.exampleCount = count;
      }
      offBar.set(bin, o);
    }
  }

  const percentile = (histogram: Float64Array, total: number, p: number) => {
    let run = 0;
    for (let k = 0; k < BINS; k++) {
      run += histogram[k];
      if (run >= p * total) return (k + 1) * 0.05;
    }
    return 180;
  };
  const summary = (g: ReturnType<typeof group>) => ({
    pixels: g.pixels,
    mass: g.mass,
    /** Pixels further than the tolerance from every bar hue, and further than the tolerance or two grey levels. */
    outside: g.pixels - g.withinPixels,
    outsideAdaptive: g.pixels - g.adaptivePixels,
    within: g.pixels ? g.withinPixels / g.pixels : 0,
    withinByMass: g.mass ? g.withinMass / g.mass : 0,
    adaptive: g.pixels ? g.adaptivePixels / g.pixels : 0,
    adaptiveByMass: g.mass ? g.adaptiveMass / g.mass : 0,
    angleWithin: g.pixels ? g.anglePixels / g.pixels : 0,
    agree: g.pixels ? g.agreePixels / g.pixels : 0,
    agreeByMass: g.mass ? g.agreeMass / g.mass : 0,
    p50: percentile(g.histogram, g.pixels, 0.5),
    p90: percentile(g.histogram, g.pixels, 0.9),
    p99: percentile(g.histogram, g.pixels, 0.99),
  });
  const offTotal = Array.from(offBar.values()).reduce((s, o) => s + o.mass, 0);
  const fromHistogram = (histogram: Float64Array, total: number, p: number, scale: number) => {
    let run = 0;
    for (let k = 0; k < histogram.length; k++) {
      run += histogram[k];
      if (run >= p * total) return k / scale;
    }
    return (histogram.length - 1) / scale;
  };
  const barStrength = colours.map(([r, g, b]) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255);
  const strengthByTenth = tenths.map((t, k) => {
    const part = barStrength.slice(Math.floor((k * n) / 10), Math.floor(((k + 1) * n) / 10));
    let top = 0;
    for (let s = 255; s >= 0; s--) {
      if (t.spread[s] > 0) {
        top = s;
        break;
      }
    }
    return {
      pixels: t.pixels,
      /** The bar's own colour strength, averaged over this tenth. */
      bar: part.reduce((s, x) => s + x, 0) / part.length,
      /** The strongest frame pixel of these hues, and the strength 99% of them are below. */
      frameLargest: top / 255,
      frame99: fromHistogram(t.spread, t.pixels, 0.99, 255),
      /** The brightest pixel's largest channel against its bar colour's. */
      brightestAgainstBar: t.brightestBar ? t.brightest / t.brightestBar : 0,
      /** Middle saturation ratio, pixel against its bar colour. */
      saturationRatio: fromHistogram(t.saturation, t.pixels, 0.5, 100),
    };
  });
  return {
    toleranceDegrees,
    colours: seen.size,
    /** How far apart neighbouring bar colours are in hue, at most: any hue inside the bar's range is within half of this of a bar colour. */
    largestHueStep: Math.max(...barHue.slice(1).map((h, j) => hueGap(h, barHue[j]))),
    strengthByTenth,
    bar: { hueAtColdEnd: barHue[0], hueAtWarmEnd: barHue[n - 1], stepsUp: up, stepsDown: down, reversals },
    all: summary(all),
    groups: SPREAD_GROUPS.map((range, k) => ({ range, ...summary(groups[k]) })),
    /** Share of the colour (each pixel weighted by its colour strength) that is warm by the pixel rule. */
    warmShare: all.mass ? warmMass / all.mass : 0,
    /** Share of the colour whose nearest bar colour is past the switch. */
    pastSwitchShare: all.mass ? pastSwitchMass / all.mass : 0,
    /** Where on the bar the colour that disagrees sits, by twentieths of the bar, as a share of all colour. */
    disagreeAt: Array.from(disagreeAt, (m) => (all.mass ? m / all.mass : 0)),
    /** Colour further from the bar than the tolerance allows, by 10° of hue, largest first. */
    offBar: Array.from(offBar.entries())
      .map(([hue, o]) => ({ hue, share: all.mass ? o.mass / all.mass : 0, ofOffBar: offTotal ? o.mass / offTotal : 0, pixels: o.pixels, example: [o.example >> 16, (o.example >> 8) & 255, o.example & 255] }))
      .sort((p, q) => q.share - p.share)
      .slice(0, 6),
  };
}

/** A picture's pixels exactly as stored in the file: no colour management. The app's own path
 *  (`loadPicture`) lets the browser convert an image that carries a colour profile. */
async function rawPixels(url: string): Promise<Pixels> {
  const blob = await (await fetch(url)).blob();
  const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { data: d.data, width: d.width, height: d.height };
}

/** Largest difference in any colour channel between two decodes, over the pixels both show fully opaque. */
function largestChannelDifference(a: Pixels, b: Pixels): number {
  let top = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (a.data[i + 3] < 255 || b.data[i + 3] < 255) continue;
    for (let k = 0; k < 3; k++) top = Math.max(top, Math.abs(a.data[i + k] - b.data[i + k]));
  }
  return top;
}

export async function runAudit(options: AuditOptions) {
  const real = PICTURES.filter((p) => p.key !== 'practice' && p.imageUrl);
  if (!real.length) return { error: 'No NASA picture found: the app is showing practice data. Measuring needs the real files in data/.' };

  const loaded = new Map<string, Pixels>();
  for (const p of real) loaded.set(p.key, (await loadPicture(p.imageUrl)).pixels);
  const ocean = loaded.get('ocean') ?? null;
  // The ocean still's grey land, as an outline for the other whole-globe maps.
  const oceanLand = ocean ? greyMask(ocean, OCEAN_LAND) : null;

  const pictures = real.map((p) => {
    const pixels = loaded.get(p.key)!;
    const { width: frameWidth, height: frameHeight } = p.scene.frames;
    const cells = lineCells(pixels, LINE_GRID);
    const score = buildScanScore(pixels, { kind: 'line' });
    let selfCheck = 0;
    for (let c = 0; c < cells.levels.length; c++) selfCheck = Math.max(selfCheck, Math.abs(cells.levels[c] - score.levels[c]));

    // Land and sea, by the ocean picture's outline. Not for the ocean picture itself: its outline
    // is "pixels with no colour", which would make "land is silent" true by definition.
    let landSea = null;
    let landLeftOut = null;
    if (ocean && oceanLand && p.key !== 'ocean') {
      const outline = resampleMask(oceanLand, ocean.width, ocean.height, pixels.width, pixels.height);
      const share = cellShare(outline, pixels.width, pixels.height, LINE_GRID);
      landSea = {
        land: group(indices(share, (s) => s >= 0.9), cells.levels, cells.mean),
        sea: group(indices(share, (s) => s <= 0.1), cells.levels, cells.mean),
      };
      const without = lineCells(pixels, LINE_GRID, undefined, outline);
      const chimes = findChimes(without.levels, without.warmShare, LINE_GRID, false);
      landLeftOut = {
        sounding: without.levels.filter((l) => l > 0).length,
        nothingRead: without.read.filter((r) => r === 0).length,
        chimes: chimes.length,
        warm: chimes.filter((c) => c.warm).length,
      };
    }

    return {
      key: p.key,
      title: p.scene.source.title,
      svs: p.scene.source.svs_id,
      still: { width: pixels.width, height: pixels.height },
      frames: { width: frameWidth, height: frameHeight },
      selfCheck,
      line: { colour: summarise(pixels, { kind: 'line' }, 'colour'), brightness: summarise(pixels, { kind: 'line' }, 'brightness') },
      regions: p.scene.regions.map((r) => {
        const { crop, shape } = regionScan(pixels, frameWidth, r);
        // Where the circle is and how wide it is on the ground. The frame is a whole-globe map with
        // x = (lon + 180) · width ÷ 360 and y = (90 − lat) · height ÷ 180 (assets/source_manifest.json).
        const lat = 90 - (r.center_px[1] * 180) / frameHeight;
        const eastWest = (r.radius_px * 360) / frameWidth;
        const northSouth = (r.radius_px * 180) / frameHeight;
        return {
          id: r.id,
          name: r.name,
          lon: (r.center_px[0] * 360) / frameWidth - 180,
          lat,
          radiusDegrees: { eastWest, northSouth },
          /** Width east–west ÷ height north–south on the ground, at the centre's latitude. 1 is round. */
          groundRatio: (eastWest * Math.cos((lat * Math.PI) / 180)) / northSouth,
          radar: summarise(crop, shape, 'colour'),
        };
      }),
      landSea,
      landLeftOut,
    };
  });

  // ---------- The ocean picture only ----------
  let latitude = null;
  let bar = null;
  let lossless = null;
  let palette = null;
  let stills = null;
  if (ocean) {
    const { columns, bands } = LINE_GRID;
    const plain = lineCells(ocean, LINE_GRID);
    // Each pixel weighted by the ground it stands for: cos(latitude) of its row.
    const weighted = lineCells(ocean, LINE_GRID, (y) => Math.cos(((90 - ((y + 0.5) * 180) / ocean.height) * Math.PI) / 180));
    latitude = {
      bands: Array.from({ length: bands }, (_, band) => {
        const south = -90 + (180 * band) / bands;
        const north = south + 180 / bands;
        let sum = 0;
        let top = 0;
        let level = 0;
        for (let column = 0; column < columns; column++) {
          const d = Math.abs(plain.levels[column * bands + band] - weighted.levels[column * bands + band]);
          sum += d;
          top = Math.max(top, d);
          level += plain.levels[column * bands + band];
        }
        return {
          band,
          south,
          north,
          /** Share of the globe's surface in this band: (sin north − sin south) ÷ 2. */
          groundShare: (Math.sin((north * Math.PI) / 180) - Math.sin((south * Math.PI) / 180)) / 2,
          meanLevel: level / columns,
          meanChange: sum / columns,
          largestChange: top,
        };
      }),
      chimes: buildScanScore(ocean, { kind: 'line' }).chimes.length,
      chimesWeighted: findChimes(weighted.levels, weighted.warmShare, LINE_GRID, false).length,
    };

    if (options.barUrl) {
      // The bar file carries a colour profile, so the browser may convert it when it draws it.
      // Measure the file's own numbers, and say how far the browser's drawing is from them.
      const raw = await rawPixels(options.barUrl);
      const shown = (await loadPicture(options.barUrl)).pixels;
      const measured = measureBar(raw);
      bar = { ...measured, decodeDifference: largestChannelDifference(shown, raw), labels: measureBarLabels(raw, measured.rows[1], options.barLabels) };
    }

    if (options.losslessUrl) {
      const exact = (await loadPicture(options.losslessUrl)).pixels;
      if (exact.width !== ocean.width || exact.height !== ocean.height) {
        lossless = { error: `sizes differ: ${exact.width}×${exact.height} against ${ocean.width}×${ocean.height}` };
      } else {
        // In the uncompressed frame land is exactly grey and empty sea exactly black.
        const quiet = new Uint8Array(exact.width * exact.height);
        const counts = { land: 0, landOver: 0, sea: 0, seaOver: 0 };
        let difference = 0;
        for (let p = 0; p < quiet.length; p++) {
          const i = p * 4;
          for (let k = 0; k < 3; k++) difference += Math.abs(exact.data[i + k] - ocean.data[i + k]);
          const mean = (exact.data[i] + exact.data[i + 1] + exact.data[i + 2]) / 3;
          const over = spreadOf(ocean.data, i) > 12; // above the floor in the JPEG the app reads
          if (spreadOf(exact.data, i) <= 2 && mean >= 30 && mean <= 80) {
            quiet[p] = 1;
            counts.land++;
            if (over) counts.landOver++;
          } else if (Math.max(exact.data[i], exact.data[i + 1], exact.data[i + 2]) <= 8) {
            quiet[p] = 1;
            counts.sea++;
            if (over) counts.seaOver++;
          }
        }
        const share = cellShare(quiet, ocean.width, ocean.height, LINE_GRID);
        const a = buildScanScore(ocean, { kind: 'line' });
        const b = buildScanScore(exact, { kind: 'line' });
        let sum = 0;
        let top = 0;
        for (let c = 0; c < a.levels.length; c++) {
          const d = Math.abs(a.levels[c] - b.levels[c]);
          sum += d;
          top = Math.max(top, d);
        }
        const key = (c: { column: number; band: number; warm: boolean }) => `${c.column}:${c.band}:${c.warm}`;
        const exactChimes = new Set(b.chimes.map(key));
        lossless = {
          pixels: quiet.length,
          meanDifference: difference / (3 * quiet.length),
          ...counts,
          quietCells: [1, 0.98, 0.9].map((least) => ({ least, ...group(indices(share, (s) => s >= least), plain.levels, plain.mean) })),
          levels: { meanChange: sum / a.levels.length, largestChange: top },
          sounding: { still: a.levels.filter((l) => l > 0).length, lossless: b.levels.filter((l) => l > 0).length },
          chimes: { still: a.chimes.length, lossless: b.chimes.length, samePlaceAndInstrument: a.chimes.filter((c) => exactChimes.has(key(c))).length },
          largestCellMean: summarise(exact, { kind: 'line' }, 'colour').largestCellMean,
        };
        if (bar) palette = frameAgainstBar(exact, bar.colours, PALETTE_TOLERANCE_DEGREES);

        // Which still should the scan read? Each copy of frame 23000 against the uncompressed one.
        const oceanPicture = real.find((p) => p.key === 'ocean')!;
        const candidates: { name: string; url: string | null; pixels: Pixels }[] = [{ name: 'app', url: oceanPicture.imageUrl, pixels: ocean }];
        for (const s of options.stills) candidates.push({ name: s.name, url: s.url, pixels: (await loadPicture(s.url)).pixels });
        candidates.push({ name: 'uncompressed', url: options.losslessUrl, pixels: exact });
        stills = compareStills(candidates, exact, oceanPicture.scene.regions, oceanPicture.scene.frames.width);
      }
    }
  }

  return { floor: STRENGTH_FLOOR, lineGrid: LINE_GRID, chimeRule: CHIME_RULE, pictures, latitude, bar, lossless, palette, stills };
}

/** The hue tolerance for "uses the bar's colours", in degrees. */
const PALETTE_TOLERANCE_DEGREES = 3;

type Chimeish = { column: number; band: number; warm: boolean };
const chimeKey = (c: Chimeish) => `${c.column}:${c.band}:${c.warm}`;
const placeKey = (c: Chimeish) => `${c.column}:${c.band}`;

/** One scan of a still against the same scan of the uncompressed frame. */
function againstExact(score: ReturnType<typeof buildScanScore>, exact: ReturnType<typeof buildScanScore>) {
  const same = new Set(exact.chimes.map(chimeKey));
  const samePlace = new Set(exact.chimes.map(placeKey));
  let sum = 0;
  let top = 0;
  for (let c = 0; c < score.levels.length; c++) {
    const d = Math.abs(score.levels[c] - exact.levels[c]);
    sum += d;
    top = Math.max(top, d);
  }
  return {
    sounding: score.levels.filter((l) => l > 0).length,
    cells: score.levels.length,
    chimes: score.chimes.length,
    warm: score.chimes.filter((c) => c.warm).length,
    cool: score.chimes.filter((c) => !c.warm).length,
    /** Chimes at the same column and band as one of the uncompressed frame, on the same instrument. */
    samePlaceAndInstrument: score.chimes.filter((c) => same.has(chimeKey(c))).length,
    /** At the same column and band, whichever instrument. */
    samePlace: score.chimes.filter((c) => samePlace.has(placeKey(c))).length,
    meanLevelChange: sum / score.levels.length,
    largestLevelChange: top,
  };
}

/**
 * Each candidate still against the uncompressed frame: the map sweep and the radar on each approved
 * circle, read exactly as the app reads them, and the globe's land rule on each circle (the globe
 * draws the still at the frame's size and counts flat grey pixels: geo.ts, landShare).
 */
function compareStills(
  candidates: { name: string; url: string | null; pixels: Pixels }[],
  exact: Pixels,
  regions: { id: string; name: string; center_px: [number, number]; radius_px: number; box_px: [number, number, number, number] }[],
  frameWidth: number,
) {
  const exactLine = buildScanScore(exact, { kind: 'line' });
  const exactRadar = regions.map((r) => {
    const { crop, shape } = regionScan(exact, frameWidth, r);
    return buildScanScore(crop, shape);
  });
  return candidates.map(({ name, url, pixels }) => {
    const k = pixels.width / frameWidth;
    return {
      name,
      url,
      size: { width: pixels.width, height: pixels.height },
      /** Largest difference in any channel of any pixel from the uncompressed frame: 0 means the same picture. */
      largestPixelDifference: pixels.width === exact.width && pixels.height === exact.height ? largestChannelDifference(pixels, exact) : null,
      line: againstExact(buildScanScore(pixels, { kind: 'line' }), exactLine),
      regions: regions.map((r, i) => {
        const { crop, shape } = regionScan(pixels, frameWidth, r);
        const spot = { center_px: [Math.round(r.center_px[0] * k), Math.round(r.center_px[1] * k)] as [number, number], radius_px: Math.round(r.radius_px * k) };
        return { id: r.id, name: r.name, radar: againstExact(buildScanScore(crop, shape), exactRadar[i]), land: landShare(pixels.data, pixels.width, pixels.height, spot, OCEAN_LAND) };
      }),
    };
  });
}

export type Audit = Exclude<Awaited<ReturnType<typeof runAudit>>, { error: string }>;
