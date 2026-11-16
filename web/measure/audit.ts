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
import { OCEAN_LAND, type LandRule } from '../src/globe/geo';

export interface AuditOptions {
  /** Frame 23000 without compression, as a PNG, or null when it is not on this machine. */
  losslessUrl: string | null;
  /** NASA's colour bar for the ocean picture, or null when it is not on this machine. */
  barUrl: string | null;
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

/** Where the "red is the largest channel" rule switches along NASA's colour bar. */
function measureBar(bar: Pixels) {
  // The bar is the row with the most strongly coloured pixels.
  let best = { row: 0, count: -1 };
  for (let y = 0; y < bar.height; y++) {
    let count = 0;
    for (let x = 0; x < bar.width; x++) if (spreadOf(bar.data, (y * bar.width + x) * 4) > 100) count++;
    if (count > best.count) best = { row: y, count };
  }
  const at = (x: number) => (best.row * bar.width + x) * 4;
  const coloured = Array.from({ length: bar.width }, (_, x) => x).filter((x) => spreadOf(bar.data, at(x)) > 100);
  const [x0, x1] = [coloured[0], coloured[coloured.length - 1]];
  const warmAt = (x: number) => isWarm(bar.data[at(x)], bar.data[at(x) + 1], bar.data[at(x) + 2]);
  const switches: number[] = [];
  for (let x = x0 + 1; x <= x1; x++) if (warmAt(x) !== warmAt(x - 1)) switches.push((x - x0) / (x1 - x0));
  const strengthAt = (f: number) => {
    const i = at(Math.round(x0 + f * (x1 - x0)));
    return colourStrength(bar.data[i], bar.data[i + 1], bar.data[i + 2]);
  };
  return {
    width: bar.width,
    height: bar.height,
    row: best.row,
    from: x0,
    to: x1,
    warmAtColdEnd: warmAt(x0),
    warmAtWarmEnd: warmAt(x1),
    /** Each place the rule changes its answer, as a share of the bar's length. One is expected. */
    switches,
    /** Colour strength at every tenth of the bar, cold end first. */
    strength: Array.from({ length: 11 }, (_, k) => strengthAt(k / 10)),
  };
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

    if (options.barUrl) bar = measureBar((await loadPicture(options.barUrl)).pixels);

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
      }
    }
  }

  return { floor: STRENGTH_FLOOR, lineGrid: LINE_GRID, chimeRule: CHIME_RULE, pictures, latitude, bar, lossless };
}

export type Audit = Exclude<Awaited<ReturnType<typeof runAudit>>, { error: string }>;
