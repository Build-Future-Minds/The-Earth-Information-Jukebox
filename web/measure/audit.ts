// Browser side of `npm run measure` (see README.md in this folder). It runs the app's own scan
// rule (src/audio/scanScore.ts) on the app's own pictures, loaded the way the app loads them, and
// returns numbers, one picture at a time. The dev server serves this file; it is never part of the
// built app.
//
// Why in the browser: the scan reads pixels from a canvas, and a JPEG can decode a grey level or
// two differently in another program. Measured here, the numbers are the ones the app plays.
//
// Each picture is measured with its own settings and returned on its own. No number of one picture
// is ever set beside another picture's (docs/mapping_spec.md, "Play along: the picture scan").
//
// A picture with a scan rule (src/data/sources.ts, `scan`) is measured as played, with its rule.
// A picture without one is measured with the settings the procedure gives, so that its rule can be
// written from measured numbers. The procedure, the same for every picture:
//   floor  the colour strength of the commonest colour among the pixels read, plus 12 grey levels
//          (12: the tolerance the ocean's floor allows for JPEG noise)
//   full   the largest cell mean on that scan, rounded up to 0.05, so no cell is clipped
//   mask   the picture's scan_mask.png, if it has one (the rain picture: its land is a photo)
// Every result also gives what the procedure gives, so a rule that differs from it can be seen.
import {
  CHIME_RULE,
  LINE_GRID,
  RADAR_GRID,
  RADAR_SAMPLES,
  STRENGTH_FLOOR,
  buildScanScore,
  colourStrength,
  findChimes,
  isBlue,
  isWarm,
  levelOf,
  radarPoint,
  regionScan,
  type ChimeColour,
  type Pixels,
  type RadarShape,
  type ScanGrid,
  type ScanMeasure,
  type ScanScore,
} from '../src/audio/scanScore';
import { loadMask, loadPicture } from '../src/scan/loadPicture';
import { PICTURES, type Picture } from '../src/data/sources';
import type { LandRule } from '../src/globe/geo';

/** Every scan mask in data/, served by the dev server. A picture without a rule may use its own. */
const MASK_FILES = import.meta.glob<string>('../../data/**/scan_mask.png', { eager: true, query: '?url', import: 'default' });

/** NASA's colour bar for a picture, as a file on this machine. */
export interface BarFile {
  /** Path from the repo root, for the report. */
  file: string;
  url: string;
  /** What the bar shows, in a word or two, for the report ("sea surface temperature", "rain"). */
  name: string;
  /** A pixel is part of the bar when its channels spread more than this (0–255). */
  coloured: number;
  /** true: the bar is made of flat steps or swatches; false: a smooth ramp. */
  stepped: boolean;
  /** Names of the steps, left to right, read by eye from the bar. */
  names?: string[];
  /** The numbers printed at the bar's two ends, read by eye. */
  ends?: [number, number];
  unit?: string;
}
/** One of NASA's full frames the still may have been made from. */
export interface FrameFile {
  file: string;
  url: string;
  /** "frame 23000", "frame 12": the name the report uses. */
  frame: string;
  time: string | null;
}
export interface PictureFiles {
  frames: FrameFile[];
  bars: BarFile[];
}
export interface AuditOptions {
  /** The NASA files on this machine, for each picture. A picture missing here skips those parts. */
  files: Record<string, PictureFiles | undefined>;
}

/** The settings a picture is measured with. */
export interface Settings {
  measure: ScanMeasure;
  floor: number;
  full: { line: number; radar: number };
  /** The mask's file, or null. */
  mask: string | null;
  /** A third instrument for colours on the blue side (the rule's `instruments.blue`). */
  blueClass: boolean;
}

/** What one scan of one picture gives. */
export interface ScanSummary {
  cells: number;
  /** Cells with a level above 0: their held note sounds. */
  sounding: number;
  /** Cells at level 1. */
  atFull: number;
  /** Cells that read nothing (masked, or outside the picture). */
  noData: number;
  /** Largest cell mean of the measure, 0–1, over the cells that read something. */
  largestCellMean: number;
  /** Peaks at or above the chime level, before any is left out. */
  peaks: number;
  /** After "peaks in one band are at least 6 columns apart". */
  afterSpacing: number;
  /** After "one chime per column": the chimes that are played. */
  chimes: number;
  warm: number;
  cool: number;
  /** Struck on the third instrument (only for a picture with a blue class). */
  blue: number;
}

const ceil20 = (x: number) => Math.ceil(x * 20 - 1e-9) / 20;
const round = (x: number, digits: number) => Number(x.toFixed(digits));
const spreadOf = (data: ArrayLike<number>, i: number) => Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);

function summarise(score: ScanScore): ScanSummary {
  const cyclic = score.shape === 'radar';
  let sounding = 0;
  let atFull = 0;
  let noData = 0;
  let largest = 0;
  for (let c = 0; c < score.levels.length; c++) {
    if (score.reads[c] === 0) {
      noData++;
      continue;
    }
    if (score.levels[c] > 0) sounding++;
    if (score.levels[c] >= 1) atFull++;
    largest = Math.max(largest, score.means[c]);
  }
  // The chime rule with its two "leave out" steps switched off, one at a time.
  const blue = score.blueClass ? score.blueShare : undefined;
  const peaks = findChimes(score.levels, score.warmShare, score.grid, cyclic, { ...CHIME_RULE, minGap: 0, perColumn: Infinity }, score.reads, blue);
  const spaced = findChimes(score.levels, score.warmShare, score.grid, cyclic, { ...CHIME_RULE, perColumn: Infinity }, score.reads, blue);
  return {
    cells: score.levels.length,
    sounding,
    atFull,
    noData,
    largestCellMean: largest,
    peaks: peaks.length,
    afterSpacing: spaced.length,
    chimes: score.chimes.length,
    warm: score.chimes.filter((c) => c.colour === 'warm').length,
    cool: score.chimes.filter((c) => c.colour === 'cool').length,
    blue: score.chimes.filter((c) => c.colour === 'blue').length,
  };
}

/** The map sweep's cell for a pixel: copied from buildScanScore; `selfCheck` proves the copy agrees. */
function lineCell(x: number, y: number, width: number, height: number, grid: ScanGrid): number {
  const band = Math.min(grid.bands - 1, Math.floor(((height - (y + 0.5)) * grid.bands) / height));
  return Math.min(grid.columns - 1, Math.floor(((x + 0.5) * grid.columns) / width)) * grid.bands + band;
}

/**
 * The map sweep's cells, measured by colour strength, with two extras the rule does not have:
 * a weight for each row, and a mask of pixels to leave out. `selfCheck` proves the copy agrees.
 */
function lineCells(pixels: Pixels, grid: ScanGrid, floor: number, blueClass: boolean, weightOfRow?: (y: number) => number, skip?: Uint8Array | null) {
  const { columns, bands } = grid;
  const { data, width, height } = pixels;
  const n = columns * bands;
  const sum = new Float64Array(n);
  const drawn = new Float64Array(n); // colour above the floor: what votes for the instrument
  const warm = new Float64Array(n);
  const blue = new Float64Array(n);
  const read = new Float64Array(n);
  for (let y = 0; y < height; y++) {
    const w = weightOfRow ? weightOfRow(y) : 1;
    for (let x = 0; x < width; x++) {
      if (skip && skip[y * width + x]) continue;
      const cell = lineCell(x, y, width, height, grid);
      const i = (y * width + x) * 4;
      const s = colourStrength(data[i], data[i + 1], data[i + 2]);
      read[cell] += w;
      sum[cell] += w * s;
      if (s <= floor) continue;
      drawn[cell] += w * s;
      if (isWarm(data[i], data[i + 1], data[i + 2])) warm[cell] += w * s;
      else if (blueClass && isBlue(data[i], data[i + 1], data[i + 2])) blue[cell] += w * s;
    }
  }
  const mean = new Float64Array(n);
  const levels = new Float32Array(n);
  const warmShare = new Float32Array(n);
  const blueShare = new Float32Array(n);
  for (let c = 0; c < n; c++) {
    if (read[c] === 0) continue;
    mean[c] = sum[c] / read[c];
    levels[c] = levelOf(mean[c], grid.fullStrength, floor);
    warmShare[c] = drawn[c] > 0 ? warm[c] / drawn[c] : 0;
    blueShare[c] = drawn[c] > 0 ? blue[c] / drawn[c] : 0;
  }
  return { mean, levels, warmShare, blueShare, read };
}

/** For each map-sweep cell: the share of the pixels it reads that `flag` marks (NaN: reads none). */
function shareOfRead(flag: Uint8Array, skip: Uint8Array | null, width: number, height: number, grid: ScanGrid): Float64Array {
  const marked = new Float64Array(grid.columns * grid.bands);
  const all = new Float64Array(grid.columns * grid.bands);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (skip && skip[p]) continue;
      const cell = lineCell(x, y, width, height, grid);
      all[cell]++;
      if (flag[p]) marked[cell]++;
    }
  }
  return marked.map((m, c) => (all[c] ? m / all[c] : NaN));
}

/** A group of cells: how many, how many sound, the largest mean among them, and (up to five) the
 *  cells that sound, so the report can say what is in them. */
function group(cells: number[], score: ScanScore) {
  const sounding = cells.filter((c) => score.levels[c] > 0);
  return {
    cells: cells.length,
    sounding: sounding.length,
    largestMean: cells.reduce((m, c) => Math.max(m, score.means[c]), 0),
    soundingCells: sounding.slice(0, 5).map((c) => ({ column: Math.floor(c / score.grid.bands), band: c % score.grid.bands, mean: score.means[c], level: score.levels[c] })),
  };
}
const cellsWhere = (share: Float64Array, keep: (s: number) => boolean) => Array.from(share.keys()).filter((c) => !Number.isNaN(share[c]) && keep(share[c]));

/**
 * The commonest colour among the pixels read: pixels are counted in bins 4 grey levels wide on each
 * channel, and the colour is the mean of the fullest bin. `near` marks every pixel read that is
 * within 12 grey levels of it on every channel (12: the tolerance the floor allows for JPEG noise).
 */
function commonestColour(pixels: Pixels, skip: Uint8Array | null) {
  const { data, width, height } = pixels;
  const n = width * height;
  const bins = new Uint32Array(1 << 18);
  const key = (i: number) => ((data[i] >> 2) << 12) | ((data[i + 1] >> 2) << 6) | (data[i + 2] >> 2);
  let read = 0;
  for (let p = 0; p < n; p++) {
    if (skip && skip[p]) continue;
    bins[key(p * 4)]++;
    read++;
  }
  let top = 0;
  for (let k = 1; k < bins.length; k++) if (bins[k] > bins[top]) top = k;
  const sum = [0, 0, 0];
  for (let p = 0; p < n; p++) {
    if ((skip && skip[p]) || key(p * 4) !== top) continue;
    for (let k = 0; k < 3; k++) sum[k] += data[p * 4 + k];
  }
  const rgb = sum.map((s) => s / bins[top]) as [number, number, number];
  const near = new Uint8Array(n);
  let nearCount = 0;
  for (let p = 0; p < n; p++) {
    if (skip && skip[p]) continue;
    const i = p * 4;
    if (Math.abs(data[i] - rgb[0]) <= 12 && Math.abs(data[i + 1] - rgb[1]) <= 12 && Math.abs(data[i + 2] - rgb[2]) <= 12) {
      near[p] = 1;
      nearCount++;
    }
  }
  return {
    rgb: rgb.map((v) => round(v, 1)) as [number, number, number],
    /** Its colour strength in grey levels (largest channel minus smallest). */
    spread: Math.max(...rgb) - Math.min(...rgb),
    binShare: bins[top] / read,
    nearShare: nearCount / read,
    near,
  };
}

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

// ---------- NASA's colour bars ----------

interface BarStep {
  from: number;
  to: number;
  rgb: [number, number, number];
  warm: boolean;
  /** On the blue side (isBlue): only matters for a picture with a blue class. */
  blue: boolean;
  strength: number;
  name: string;
}

/**
 * Where the "red is the largest channel" rule switches along one of NASA's colour bars. The bar is
 * read along the row with the most coloured pixels. Switches are counted between neighbouring
 * coloured pixels only, so gaps between swatches never count.
 */
function measureBar(bar: Pixels, file: BarFile) {
  let best = { row: 0, count: -1 };
  for (let y = 0; y < bar.height; y++) {
    let count = 0;
    for (let x = 0; x < bar.width; x++) if (spreadOf(bar.data, (y * bar.width + x) * 4) > file.coloured) count++;
    if (count > best.count) best = { row: y, count };
  }
  const at = (x: number) => (best.row * bar.width + x) * 4;
  const rgbAt = (x: number) => [bar.data[at(x)], bar.data[at(x) + 1], bar.data[at(x) + 2]] as [number, number, number];
  const coloured = Array.from({ length: bar.width }, (_, x) => x).filter((x) => spreadOf(bar.data, at(x)) > file.coloured);
  const [x0, x1] = [coloured[0], coloured[coloured.length - 1]];
  const warmAt = (x: number) => isWarm(...rgbAt(x));
  const switches: { at: number; from: [number, number, number]; to: [number, number, number] }[] = [];
  for (let k = 1; k < coloured.length; k++) {
    if (warmAt(coloured[k]) !== warmAt(coloured[k - 1])) switches.push({ at: (coloured[k] - x0) / (x1 - x0), from: rgbAt(coloured[k - 1]), to: rgbAt(coloured[k]) });
  }
  const strengthAt = (f: number) => colourStrength(...rgbAt(Math.round(x0 + f * (x1 - x0))));

  // Steps: runs of one colour (every channel within 12 of the run's mean), at least 4 pixels long.
  const steps: BarStep[] = [];
  if (file.stepped) {
    let run: number[] = [];
    let sum = [0, 0, 0];
    const close = () => {
      if (run.length >= 4) {
        const rgb = sum.map((s) => round(s / run.length, 1)) as [number, number, number];
        steps.push({ from: run[0], to: run[run.length - 1], rgb, warm: isWarm(...rgb), blue: isBlue(...rgb), strength: round(colourStrength(...rgb), 3), name: '' });
      }
      run = [];
      sum = [0, 0, 0];
    };
    for (const x of coloured) {
      const rgb = rgbAt(x);
      const mean = sum.map((s) => s / Math.max(1, run.length));
      const next = run.length > 0 && (x !== run[run.length - 1] + 1 || rgb.some((v, k) => Math.abs(v - mean[k]) > 12));
      if (next) close();
      run.push(x);
      for (let k = 0; k < 3; k++) sum[k] += rgb[k];
    }
    close();
    // Two runs of one colour split only by a thin outline (the arrow at a bar's end) are one step.
    for (let k = steps.length - 1; k > 0; k--) {
      const [a, b] = [steps[k - 1], steps[k]];
      if (b.from - a.to <= 4 && b.rgb.every((v, c) => Math.abs(v - a.rgb[c]) <= 12)) {
        a.to = b.to;
        steps.splice(k, 1);
      }
    }
    steps.forEach((s, k) => (s.name = file.names?.[k] ?? `${file.name} step ${k + 1} of ${steps.length}`));
  }
  return {
    file: file.file,
    name: file.name,
    width: bar.width,
    height: bar.height,
    row: best.row,
    from: x0,
    to: x1,
    colouredThreshold: file.coloured,
    /** Coloured pixels between the two ends; equal to the span when the bar has no gap. */
    colouredPixels: coloured.length,
    warmAtStart: warmAt(x0),
    warmAtEnd: warmAt(x1),
    /** Each place the rule changes its answer, as a share of the bar from its first coloured pixel. */
    switches,
    /** Colour strength at every tenth of the bar, first end first. */
    strength: Array.from({ length: 11 }, (_, k) => strengthAt(k / 10)),
    steps,
    names: file.names ?? null,
    ends: file.ends ?? null,
    unit: file.unit ?? null,
  };
}
type Bar = ReturnType<typeof measureBar>;

// ---------- Which colour of the legend is under a struck note ----------

/** A colour of NASA's bar, by direction only: the colour minus its smallest channel, scaled to
 *  length 1. Mixing in grey or black (or fading it) leaves the direction as it was. */
interface ColourClass {
  name: string;
  dir: [number, number, number];
}
function direction(r: number, g: number, b: number): [number, number, number] | null {
  const m = Math.min(r, g, b);
  const v = [r - m, g - m, b - m];
  const len = Math.hypot(v[0], v[1], v[2]);
  return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : null;
}
/** Classes from the bars: one per step of a stepped bar, one per tenth of a smooth one. */
function coloursOf(bars: Bar[], pixelsOf: Map<string, Pixels>): ColourClass[] {
  const out: ColourClass[] = [];
  for (const bar of bars) {
    if (bar.steps.length) {
      for (const s of bar.steps) {
        const d = direction(...s.rgb);
        if (d) out.push({ name: s.name, dir: d });
      }
    } else {
      const pixels = pixelsOf.get(bar.file)!;
      for (let k = 0; k < 10; k++) {
        const x = Math.round(bar.from + ((k + 0.5) / 10) * (bar.to - bar.from));
        const i = (bar.row * pixels.width + x) * 4;
        const d = direction(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]);
        if (d) out.push({ name: `${bar.name}, ${k * 10}–${(k + 1) * 10}% of the bar`, dir: d });
      }
    }
  }
  return out;
}
/** A pixel matches a class when the angle between their directions is at most this (cos 0.9: about 26°). */
const MATCH_COS = 0.9;
function classify(classes: ColourClass[], r: number, g: number, b: number): number {
  const d = direction(r, g, b);
  if (!d) return -1;
  let best = -1;
  let bestDot = MATCH_COS;
  classes.forEach((c, k) => {
    const dot = c.dir[0] * d[0] + c.dir[1] * d[1] + c.dir[2] * d[2];
    if (dot >= bestDot) {
      bestDot = dot;
      best = k;
    }
  });
  return best;
}
/** A struck note's colour: the class with the most votes in its cell. Each pixel read above the
 *  floor votes for its class (or "no colour of the bar"), weighted by its colour strength. */
function tally(classes: ColourClass[], chimes: { colour: ChimeColour; votes: Float64Array }[]) {
  const out: Record<ChimeColour, Record<string, number>> = { warm: {}, cool: {}, blue: {} };
  for (const c of chimes) {
    let best = -1;
    for (let k = 0; k <= classes.length; k++) if (c.votes[k] > 0 && (best < 0 || c.votes[k] > c.votes[best])) best = k;
    const name = best < 0 ? 'nothing above the floor' : best === classes.length ? 'no colour of the bar' : classes[best].name;
    out[c.colour][name] = (out[c.colour][name] ?? 0) + 1;
  }
  return out;
}

// ---------- Loading NASA's files ----------

/** A picture drawn at another size by the browser (for comparing a frame with the still). */
function loadScaled(url: string, width: number, height: number): Promise<Pixels> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      const d = ctx.getImageData(0, 0, width, height);
      resolve({ data: d.data, width, height });
    };
    img.onerror = () => reject(new Error(`${url} did not load`));
    img.src = url;
  });
}
const meanDifference = (a: Pixels, b: Pixels) => {
  let sum = 0;
  for (let p = 0; p < a.width * a.height; p++) for (let k = 0; k < 3; k++) sum += Math.abs(a.data[p * 4 + k] - b.data[p * 4 + k]);
  return sum / (3 * a.width * a.height);
};

// ---------- One picture ----------

async function auditPicture(p: Picture, files: PictureFiles | undefined) {
  const pixels = (await loadPicture(p.imageUrl)).pixels;
  const { width, height } = pixels;
  const { width: frameWidth, height: frameHeight } = p.scene.frames;
  const folder = p.key === 'ocean' ? '' : `${p.key}/`;
  const candidateMask = MASK_FILES[`../../data/${folder}scan_mask.png`] ?? null;
  const rule = p.scan;
  const maskUrl = rule ? (rule.mask?.url ?? null) : candidateMask;
  const maskFile = maskUrl ? `data/${folder}scan_mask.png` : null;
  const mask = maskUrl ? await loadMask(maskUrl, width, height) : null;
  const masked = mask ? mask.reduce((s, m) => s + m, 0) : 0;

  // ---- The procedure ----
  const background = commonestColour(pixels, mask);
  const largestOf = (score: ScanScore) => {
    let top = 0;
    for (let c = 0; c < score.means.length; c++) if (score.reads[c] > 0) top = Math.max(top, score.means[c]);
    return top;
  };
  const crops = p.scene.regions.map((r) => ({ region: r, ...regionScan(pixels, frameWidth, r, mask) }));
  const largestLine = largestOf(buildScanScore(pixels, { kind: 'line' }, { mask }));
  const largestRadar = Math.max(...crops.map((c) => largestOf(buildScanScore(c.crop, c.shape, { mask: c.mask }))));
  const blueClass = !!rule?.instruments.blue;
  const procedure: Settings = {
    measure: 'colour',
    floor: (Math.round(background.spread) + 12) / 255,
    full: { line: ceil20(largestLine), radar: ceil20(largestRadar) },
    mask: maskFile,
    blueClass,
  };
  const settings: Settings = rule ? { measure: rule.measure, floor: rule.floor, full: rule.full, mask: maskFile, blueClass } : procedure;
  const lineGrid: ScanGrid = { ...LINE_GRID, fullStrength: settings.full.line };
  const radarGrid: ScanGrid = { ...RADAR_GRID, fullStrength: settings.full.radar };
  const as = { floor: settings.floor, measure: settings.measure, blueClass: settings.blueClass };

  // ---- The map sweep ----
  const line = buildScanScore(pixels, { kind: 'line' }, { ...as, grid: lineGrid, mask });
  const lineBrightness = buildScanScore(pixels, { kind: 'line' }, { ...as, grid: lineGrid, mask, measure: 'brightness' });
  const atOceanFloor = buildScanScore(pixels, { kind: 'line' }, { ...as, grid: lineGrid, mask, floor: STRENGTH_FLOOR });
  const cells = lineCells(pixels, lineGrid, settings.floor, settings.blueClass, undefined, mask);
  let selfCheck = 0;
  for (let c = 0; c < cells.levels.length; c++) selfCheck = Math.max(selfCheck, Math.abs(cells.levels[c] - line.levels[c]));

  // ---- What "nothing drawn" looks like, and the floor ----
  const nearShare = shareOfRead(background.near, mask, width, height, LINE_GRID);
  const quiet = [1, 0.98, 0.9].map((least) => ({ least, ...group(cellsWhere(nearShare, (s) => s >= least), line) }));
  const drawn = [0.01, 0.1].map((least) => {
    const list = cellsWhere(nearShare, (s) => 1 - s >= least);
    return { least, cells: list.length, sounding: list.filter((c) => line.levels[c] > 0).length, soundingAtOceanFloor: list.filter((c) => atOceanFloor.levels[c] > 0).length };
  });
  const greyLand = p.landRule
    ? (() => {
        const share = shareOfRead(greyMask(pixels, p.landRule), mask, width, height, LINE_GRID);
        return { rule: p.landRule, ...group(cellsWhere(share, (s) => s >= 0.9), line) };
      })()
    : null;

  // ---- NASA's colour bars, and which colour is under each struck note ----
  const barPixels = new Map<string, Pixels>();
  const bars: Bar[] = [];
  const barsMissing: string[] = [];
  for (const b of files?.bars ?? []) {
    try {
      const px = (await loadPicture(b.url)).pixels;
      barPixels.set(b.file, px);
      bars.push(measureBar(px, b));
    } catch {
      barsMissing.push(b.file);
    }
  }
  const classes = coloursOf(bars, barPixels);
  const classOfPixel = new Int16Array(width * height).fill(-2); // -2: not read, or not above the floor
  const pixelTally = new Float64Array(classes.length + 1);
  for (let q = 0; q < width * height; q++) {
    if (mask && mask[q]) continue;
    const i = q * 4;
    const s = colourStrength(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]);
    if (s <= settings.floor) continue;
    const k = classify(classes, pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]);
    classOfPixel[q] = k < 0 ? classes.length : k;
    pixelTally[classOfPixel[q]]++;
  }
  const lineVotes = new Map<number, Float64Array>();
  for (const c of line.chimes) lineVotes.set(c.column * lineGrid.bands + c.band, new Float64Array(classes.length + 1));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const q = y * width + x;
      if (classOfPixel[q] < 0) continue;
      const votes = lineVotes.get(lineCell(x, y, width, height, lineGrid));
      if (votes) votes[classOfPixel[q]] += colourStrength(pixels.data[q * 4], pixels.data[q * 4 + 1], pixels.data[q * 4 + 2]);
    }
  }
  const lineColours = tally(classes, line.chimes.map((c) => ({ colour: c.colour, votes: lineVotes.get(c.column * lineGrid.bands + c.band)! })));
  // What the floor costs: cells where some pixels are drawn in a colour of NASA's bar (above the
  // floor), and how many of them sound at this floor and at the ocean's.
  const legendPixel = new Uint8Array(width * height);
  for (let q = 0; q < legendPixel.length; q++) if (classOfPixel[q] >= 0 && classOfPixel[q] < classes.length) legendPixel[q] = 1;
  const legendShare = classes.length ? shareOfRead(legendPixel, mask, width, height, LINE_GRID) : null;
  const legendDrawn = legendShare
    ? [0.01, 0.1].map((least) => {
        const list = cellsWhere(legendShare, (s) => s >= least);
        return { least, cells: list.length, sounding: list.filter((c) => line.levels[c] > 0).length, soundingAtOceanFloor: list.filter((c) => atOceanFloor.levels[c] > 0).length };
      })
    : null;
  /** What is in a cell: the share of its pixels near the commonest colour, and drawn in a legend colour. */
  const describeCells = (list: { column: number; band: number; mean: number; level: number }[]) =>
    list.map((c) => {
      const cell = c.column * LINE_GRID.bands + c.band;
      return { ...c, nearCommonest: nearShare[cell], legendColour: legendShare ? legendShare[cell] : null };
    });
  const quietDescribed = quiet.map((q) => ({ ...q, soundingCells: describeCells(q.soundingCells) }));
  const aboveFloor = pixelTally.reduce((a, b) => a + b, 0);
  const pixelColours = Object.fromEntries(
    [...classes.map((c) => c.name), 'no colour of the bar']
      .map((name, k) => [name, aboveFloor ? pixelTally[k] / aboveFloor : 0] as [string, number])
      .filter(([, share]) => share > 0),
  );

  // ---- The radar, each circle ----
  const regions = crops.map(({ region: r, crop, shape, mask: cropMask }) => {
    const score = buildScanScore(crop, shape, { ...as, grid: radarGrid, mask: cropMask });
    const votes = score.chimes.map((c) => {
      const v = new Float64Array(classes.length + 1);
      for (let i = 0; i < RADAR_SAMPLES; i++) {
        for (let j = 0; j < RADAR_SAMPLES; j++) {
          const [px, py] = radarPoint(shape as RadarShape, radarGrid, c.column, c.band, i, j);
          const x = Math.floor(px);
          const y = Math.floor(py);
          if (x < 0 || y < 0 || x >= crop.width || y >= crop.height || (cropMask && cropMask[y * crop.width + x])) continue;
          const k = (y * crop.width + x) * 4;
          const s = colourStrength(crop.data[k], crop.data[k + 1], crop.data[k + 2]);
          if (s <= settings.floor) continue;
          const cls = classify(classes, crop.data[k], crop.data[k + 1], crop.data[k + 2]);
          v[cls < 0 ? classes.length : cls] += s;
        }
      }
      return { colour: c.colour, votes: v };
    });
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
      radar: summarise(score),
      /** The same circle at the ocean's floor, 12/255, for the record. */
      radarAtOceanFloor: summarise(buildScanScore(crop, shape, { ...as, grid: radarGrid, mask: cropMask, floor: STRENGTH_FLOOR })),
      colours: tally(classes, votes),
    };
  });

  // ---- Equal latitude bands on a stretched map ----
  const { columns, bands } = LINE_GRID;
  const weighted = lineCells(pixels, lineGrid, settings.floor, settings.blueClass, (y) => Math.cos(((90 - ((y + 0.5) * 180) / height) * Math.PI) / 180), mask);
  const latitude = {
    bands: Array.from({ length: bands }, (_, band) => {
      const south = -90 + (180 * band) / bands;
      const north = south + 180 / bands;
      let sum = 0;
      let top = 0;
      let level = 0;
      let withData = 0;
      for (let column = 0; column < columns; column++) {
        const c = column * bands + band;
        if (cells.read[c] === 0) continue;
        const d = Math.abs(cells.levels[c] - weighted.levels[c]);
        sum += d;
        top = Math.max(top, d);
        level += cells.levels[c];
        withData++;
      }
      return {
        band,
        south,
        north,
        /** Share of the globe's surface in this band: (sin north − sin south) ÷ 2. */
        groundShare: (Math.sin((north * Math.PI) / 180) - Math.sin((south * Math.PI) / 180)) / 2,
        columnsWithData: withData,
        meanLevel: withData ? level / withData : 0,
        meanChange: withData ? sum / withData : 0,
        largestChange: top,
      };
    }),
    chimes: line.chimes.length,
    chimesWeighted: findChimes(weighted.levels, weighted.warmShare, lineGrid, false, CHIME_RULE, weighted.read, settings.blueClass ? weighted.blueShare : undefined).length,
  };

  // ---- Which of NASA's frames the still is, and the still against that frame ----
  let still: {
    candidates: { frame: string; time: string | null; file: string; meanDifference: number }[];
    best: { frame: string; time: string | null; file: string; meanDifference: number };
    runnerUp: { frame: string; meanDifference: number } | null;
  } | null = null;
  let frame: Record<string, unknown> | null = null;
  const frameFiles = files?.frames ?? [];
  if (frameFiles.length) {
    const candidates = [];
    for (const f of frameFiles) {
      try {
        candidates.push({ frame: f.frame, time: f.time, file: f.file, url: f.url, meanDifference: meanDifference(pixels, await loadScaled(f.url, width, height)) });
      } catch {
        // A frame missing on this machine is left out; the report lists what was compared.
      }
    }
    candidates.sort((a, b) => a.meanDifference - b.meanDifference);
    if (candidates.length) {
      const [best, second] = candidates;
      still = {
        candidates: candidates.map((c) => ({ frame: c.frame, time: c.time, file: c.file, meanDifference: c.meanDifference })),
        best: { frame: best.frame, time: best.time, file: best.file, meanDifference: best.meanDifference },
        runnerUp: second ? { frame: second.frame, meanDifference: second.meanDifference } : null,
      };
      frame = await compareWithFrame(p, best.url, best.frame, pixels, mask, maskUrl, settings, lineGrid, radarGrid, line);
    }
  }

  const summaryLine = summarise(line);
  const quoted: Record<string, number> = {
    floor255: round(settings.floor * 255, 2),
    backgroundSpread: round(background.spread, 1),
    backgroundNearPct: round(100 * background.nearShare, 1),
    quiet90Cells: quiet[2].cells,
    quiet90Sounding: quiet[2].sounding,
    quiet90Largest255: round(quiet[2].largestMean * 255, 2),
    largestLineMean: round(summaryLine.largestCellMean, 3),
    largestRadarMean: round(Math.max(...regions.map((r) => r.radar.largestCellMean)), 2),
    fullLine: settings.full.line,
    fullRadar: settings.full.radar,
    lineSoundingPct: round((100 * summaryLine.sounding) / summaryLine.cells, 1),
    lineNoData: summaryLine.noData,
    linePeaks: summaryLine.peaks,
    lineChimes: summaryLine.chimes,
    lineLeftOut: summaryLine.peaks - summaryLine.chimes,
    lineWarm: summaryLine.warm,
    lineCool: summaryLine.cool,
    lineBlue: summaryLine.blue,
    latitudeChimesWeighted: latitude.chimesWeighted,
  };
  if (still) {
    quoted.stillDifference = round(still.best.meanDifference, 2);
    if (still.runnerUp) quoted.stillRunnerUpDifference = round(still.runnerUp.meanDifference, 2);
    quoted.stillCandidates = still.candidates.length;
  }
  regions.forEach((r, i) => {
    quoted[`radar${i}Peaks`] = r.radar.peaks;
    quoted[`radar${i}Chimes`] = r.radar.chimes;
    quoted[`radar${i}LeftOut`] = r.radar.peaks - r.radar.chimes;
    quoted[`radar${i}Warm`] = r.radar.warm;
    quoted[`radar${i}Cool`] = r.radar.cool;
    quoted[`radar${i}Blue`] = r.radar.blue;
    quoted[`radar${i}LargestMean`] = round(r.radar.largestCellMean, 2);
    quoted[`radar${i}SoundingPct`] = round((100 * r.radar.sounding) / r.radar.cells, 0);
  });
  if (mask) quoted.maskPct = round((100 * masked) / (width * height), 2);
  if (legendDrawn) {
    // Cells where 10% or more of the pixels are drawn in a colour of NASA's bar: how many sound.
    quoted.legend10Cells = legendDrawn[1].cells;
    quoted.legend10Sounding = legendDrawn[1].sounding;
    quoted.legend10SoundingAtOceanFloor = legendDrawn[1].soundingAtOceanFloor;
  }
  if (greyLand) {
    quoted.greyLand90Cells = greyLand.cells;
    quoted.greyLand90Sounding = greyLand.sounding;
  }
  bars.forEach((b, i) => {
    quoted[`bar${i}Switches`] = b.switches.length;
    if (b.switches.length) quoted[`bar${i}SwitchPct`] = round(100 * b.switches[0].at, 1);
    if (b.switches.length && b.ends) quoted[`bar${i}SwitchValue`] = round(b.ends[0] + b.switches[0].at * (b.ends[1] - b.ends[0]), 1);
    const first = b.steps.findIndex((s, k) => k > 0 && s.warm !== b.steps[k - 1].warm);
    if (first > 0) quoted[`bar${i}SwitchStep`] = first + 1; // the first step on the other side, counted from 1
    quoted[`bar${i}Steps`] = b.steps.length;
    quoted[`bar${i}WarmSteps`] = b.steps.filter((s) => s.warm).length;
    quoted[`bar${i}BlueSteps`] = b.steps.filter((s) => s.blue).length;
  });
  if (frame && typeof frame.exactQuiet90Cells === 'number') {
    quoted.exactQuiet90Cells = frame.exactQuiet90Cells as number;
    quoted.exactQuiet90Sounding = frame.exactQuiet90Sounding as number;
    quoted.exactQuiet90Largest255 = frame.exactQuiet90Largest255 as number;
  }

  return {
    key: p.key,
    label: p.label,
    title: p.scene.source.title,
    svs: p.scene.source.svs_id,
    still: { width, height, from: still },
    frames: { width: frameWidth, height: frameHeight },
    /** Whether the picture has a scan rule in sources.ts; the settings measured here. */
    hasRule: !!rule,
    settings,
    procedure,
    background: { rgb: background.rgb, spread: background.spread, binShare: background.binShare, nearShare: background.nearShare },
    quiet: quietDescribed,
    drawn,
    legendDrawn,
    greyLand,
    mask: mask ? { file: maskFile, share: masked / (width * height), nothingRead: summaryLine.noData } : null,
    selfCheck,
    line: { colour: summaryLine, brightness: summarise(lineBrightness), atOceanFloor: summarise(atOceanFloor) },
    lineColours,
    pixelColours,
    classes: classes.map((c) => c.name),
    regions,
    latitude,
    bars,
    barsMissing,
    frame,
    quoted,
  };
}

/** The still against NASA's full frame: the same rule and settings on both. */
async function compareWithFrame(
  p: Picture,
  url: string,
  name: string,
  still: Pixels,
  stillMask: Uint8Array | null,
  maskUrl: string | null,
  settings: Settings,
  lineGrid: ScanGrid,
  radarGrid: ScanGrid,
  stillLine: ScanScore,
): Promise<Record<string, unknown>> {
  let exact: Pixels;
  try {
    exact = (await loadPicture(url)).pixels;
  } catch (e) {
    return { error: (e as Error).message };
  }
  const mask = maskUrl ? await loadMask(maskUrl, exact.width, exact.height) : null;
  const as = { floor: settings.floor, measure: settings.measure, blueClass: settings.blueClass };
  const b = buildScanScore(exact, { kind: 'line' }, { ...as, grid: lineGrid, mask });
  let sum = 0;
  let top = 0;
  let both = 0;
  for (let c = 0; c < stillLine.levels.length; c++) {
    if (stillLine.reads[c] === 0 || b.reads[c] === 0) continue;
    const d = Math.abs(stillLine.levels[c] - b.levels[c]);
    sum += d;
    top = Math.max(top, d);
    both++;
  }
  const key = (c: { column: number; band: number; colour: ChimeColour }) => `${c.column}:${c.band}:${c.colour}`;
  const exactChimes = new Set(b.chimes.map(key));
  const sounding = (s: ScanScore) => s.levels.filter((l) => l > 0).length;
  const out: Record<string, unknown> = {
    frame: name,
    width: exact.width,
    height: exact.height,
    levels: { meanChange: both ? sum / both : 0, largestChange: top },
    sounding: { still: sounding(stillLine), frame: sounding(b) },
    chimes: { still: stillLine.chimes.length, frame: b.chimes.length, samePlaceAndInstrument: stillLine.chimes.filter((c) => exactChimes.has(key(c))).length },
    largestCellMean: summarise(b).largestCellMean,
    regions: p.scene.regions.map((r) => {
      const s = regionScan(still, p.scene.frames.width, r, stillMask);
      const e = regionScan(exact, p.scene.frames.width, r, mask);
      const sa = buildScanScore(s.crop, s.shape, { ...as, grid: radarGrid, mask: s.mask });
      const ea = buildScanScore(e.crop, e.shape, { ...as, grid: radarGrid, mask: e.mask });
      const ek = new Set(ea.chimes.map(key));
      return { id: r.id, still: sa.chimes.length, frame: ea.chimes.length, samePlaceAndInstrument: sa.chimes.filter((c) => ek.has(key(c))).length };
    }),
  };

  // The ocean picture only: in its uncompressed frame land is exactly grey and empty sea exactly black.
  if (p.key === 'ocean' && exact.width === still.width && exact.height === still.height) {
    const quiet = new Uint8Array(exact.width * exact.height);
    const counts = { land: 0, landOver: 0, sea: 0, seaOver: 0 };
    let difference = 0;
    for (let q = 0; q < quiet.length; q++) {
      const i = q * 4;
      for (let k = 0; k < 3; k++) difference += Math.abs(exact.data[i + k] - still.data[i + k]);
      const mean = (exact.data[i] + exact.data[i + 1] + exact.data[i + 2]) / 3;
      const over = spreadOf(still.data, i) > settings.floor * 255; // above the floor in the JPEG the app reads
      if (spreadOf(exact.data, i) <= 2 && mean >= 30 && mean <= 80) {
        quiet[q] = 1;
        counts.land++;
        if (over) counts.landOver++;
      } else if (Math.max(exact.data[i], exact.data[i + 1], exact.data[i + 2]) <= 8) {
        quiet[q] = 1;
        counts.sea++;
        if (over) counts.seaOver++;
      }
    }
    const share = shareOfRead(quiet, null, exact.width, exact.height, LINE_GRID);
    const groups = [1, 0.98, 0.9].map((least) => ({ least, ...group(cellsWhere(share, (s) => s >= least), stillLine) }));
    Object.assign(out, {
      pixels: quiet.length,
      meanDifference: difference / (3 * quiet.length),
      ...counts,
      quietCells: groups,
      exactQuiet90Cells: groups[2].cells,
      exactQuiet90Sounding: groups[2].sounding,
      exactQuiet90Largest255: round(groups[2].largestMean * 255, 2),
    });
  }
  return out;
}

export async function runAudit(options: AuditOptions) {
  const real = PICTURES.filter((p) => p.key !== 'practice' && p.imageUrl);
  if (!real.length) return { error: 'No NASA picture found: the app is showing practice data. Measuring needs the real files in data/.' };
  const pictures = [];
  // One picture at a time: each is loaded, measured and let go before the next.
  for (const p of real) pictures.push(await auditPicture(p, options.files[p.key]));
  return { lineGrid: LINE_GRID, radarGrid: RADAR_GRID, radarSamples: RADAR_SAMPLES, chimeRule: CHIME_RULE, defaultFloor: STRENGTH_FLOOR, matchCos: MATCH_COS, pictures };
}

export type Audit = Exclude<Awaited<ReturnType<typeof runAudit>>, { error: string }>;
export type PictureAudit = Audit['pictures'][number];
