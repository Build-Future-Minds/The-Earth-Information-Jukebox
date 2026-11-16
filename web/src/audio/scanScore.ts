// Picture scan ("Play the picture"): turns the pixels under a moving line into sound events.
// Pure functions only (no audio, no DOM), so the same picture always gives the same score and
// every number can be tested. The rule is in docs/mapping_spec.md, "Play along: the picture scan".
//
// This is a play-along extra. It is separate from the Earth rhythm (the tested rule) and never
// changes an Earth note.
//
// Method, after two NASA sonifications by SYSTEM Sounds (M. Russo, A. Santaguida):
//   - a line sweeps the picture and position sets the pitch (Chandra Galactic Center: "objects
//     located towards the top of the image are heard as higher pitches"; Caldwell 73: "stars
//     farther from the center are higher pitched");
//   - the amount of light sets the loudness ("the intensity of the light controls the volume");
//   - colour chooses the instrument (Caldwell 73: red and orange stars a marimba, blue stars a
//     glockenspiel, the whole image a choir).
//
// Note names, the scale and the low note's steps come from Tonal (a music-theory library), so the
// musical choices are written as music ("C major pentatonic", "I, VIm, IV, V") and not as numbers.

import { Chord, Note, Progression, Scale } from 'tonal';

/** RGBA pixels, row by row, 4 numbers (0–255) per pixel: what a canvas `getImageData` returns. */
export interface Pixels {
  data: ArrayLike<number>;
  width: number;
  height: number;
}

/**
 * How the line moves.
 * - `line`: a vertical line sweeps left to right (west to east on the map). Band 0 is the bottom
 *   of the picture (south), the last band is the top (north).
 * - `radar`: a radius turns once around the circle, starting at 3 o'clock (east) and turning
 *   anticlockwise (east, north, west, south). Band 0 is the centre, the last band is the rim.
 */
export type ScanShape = { kind: 'line' } | { kind: 'radar'; cx: number; cy: number; r: number };
export type RadarShape = Extract<ScanShape, { kind: 'radar' }>;

export interface ScanGrid {
  /** Time steps in one sweep. */
  columns: number;
  /** Pitch steps along the line. */
  bands: number;
  /** Seconds for one sweep at speed 1. */
  seconds: number;
  /** A cell's mean colour strength at or above this plays at full level. */
  fullStrength: number;
}

/**
 * Both scans advance 8 columns a second. Design choices, fixed for every picture:
 * - The map sweep takes 30 s, the length of the Earth rhythm's loop. One of its cells is a tall
 *   slice of the map (about 8.5 by 85 pixels on the NASA frame) and is never full of colour: the
 *   most colourful one measures 0.46, so 0.5 is its full level.
 * - The radar takes 15 s a turn. Its cells are a few pixels, and thin lines can fill them (up to
 *   about 0.8 in the Equatorial Pacific circle), so 0.75 is its full level. Both regions use the
 *   same radar settings, so they stay a fair comparison.
 */
export const LINE_GRID: ScanGrid = { columns: 240, bands: 12, seconds: 30, fullStrength: 0.5 };
export const RADAR_GRID: ScanGrid = { columns: 120, bands: 12, seconds: 15, fullStrength: 0.75 };
/** The radar reads each cell at this many evenly spaced points along the radius and along the arc
 *  (4 × 4 = 16 points), so the small cells near the centre are never empty. */
export const RADAR_SAMPLES = 4;

/**
 * Colour strength of one pixel, 0 to 1: the gap between its largest and smallest colour channel.
 * Black ocean, grey land and white all score 0; a pure colour scores 1. This is the same "spread"
 * the globe page uses to find land (`landShare` in globe/geo.ts).
 */
export function colourStrength(r: number, g: number, b: number): number {
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
}

/** Brightness of one pixel, 0 to 1: its largest colour channel (the same "brightness" as the
 *  alignment measure in docs/mapping_spec.md). For pictures that are bright but not coloured. */
export function brightness(r: number, g: number, b: number): number {
  return Math.max(r, g, b) / 255;
}

/**
 * What counts as light under the line.
 * - `colour`: colour strength. Right for pictures that draw their data in colour on black or grey,
 *   like the ocean-currents picture: grey land and black sea stay silent.
 * - `brightness`: for pictures whose data is white or grey on a dark ground (clouds, city lights).
 * A scene picks one; it is never switched by the code behind the listener's back.
 */
export type ScanMeasure = 'colour' | 'brightness';

/** Red side of yellow (red, orange): red is the largest channel. Measured on NASA's colour bar for
 *  the ocean picture, the answer switches at 74.4% of the bar's length, which is 23.8 °C if the
 *  bar's scale is even (docs/measurements/scan_pictures.md). A rule about pixels, not degrees. */
export function isWarm(r: number, g: number, b: number): boolean {
  return r >= g && r >= b;
}

/** A cell's mean colour strength at or below this plays nothing. 12 grey levels: the tolerance the
 *  team's land rule already allows for JPEG noise on grey land. Design choice. */
export const STRENGTH_FLOOR = 12 / 255;

/** Mean colour strength of a cell → level 0 to 1: a straight line from the floor to the grid's full level. */
export function levelOf(meanStrength: number, fullStrength: number): number {
  const x = (meanStrength - STRENGTH_FLOOR) / (fullStrength - STRENGTH_FLOOR);
  return Math.min(1, Math.max(0, x));
}

/** When a bright spot becomes a struck note. Design choices that keep the chimes few enough to hear one by one. */
export interface ChimeRule {
  /** A chime needs at least this (smoothed) level at its peak. */
  minLevel: number;
  /** Two chimes in the same band are at least this many columns apart. */
  minGap: number;
  /** At most this many chimes start in one column; the strongest are kept. */
  perColumn: number;
}
export const CHIME_RULE: ChimeRule = { minLevel: 0.3, minGap: 6, perColumn: 1 };

/** One struck note: the line crossing a bright spot. */
export interface Chime {
  column: number;
  band: number;
  /** 0–1, the smoothed level at the peak: sets how hard the note is struck. */
  level: number;
  /** true: marimba (red side of yellow). false: bells (yellow-green, green, blue). */
  warm: boolean;
}

export interface ScanOptions {
  grid?: ScanGrid;
  rule?: ChimeRule;
  measure?: ScanMeasure;
}

export interface ScanScore {
  shape: ScanShape['kind'];
  grid: ScanGrid;
  measure: ScanMeasure;
  /** `levels[column * bands + band]`, 0–1: how loud that band's held note is in that column. */
  levels: Float32Array;
  /** `warmShare[column * bands + band]`, 0–1: share of the cell's colour that is on the red side of yellow. */
  warmShare: Float32Array;
  /** Sorted by column, then band. */
  chimes: Chime[];
  /** `missing`: no cell has any colour, so the scan stays silent and says why. Never an invented sound. */
  status: 'ok' | 'missing';
  reason: string | null;
}

/** Where the radar reads the picture for one of a cell's sample points (i along the arc, j along the radius). */
export function radarPoint(shape: RadarShape, grid: ScanGrid, column: number, band: number, i: number, j: number): [number, number] {
  const angle = (2 * Math.PI * (column + (i + 0.5) / RADAR_SAMPLES)) / grid.columns; // 0 at 3 o'clock, anticlockwise
  const radius = (shape.r * (band + (j + 0.5) / RADAR_SAMPLES)) / grid.bands;
  // Screen y points down, so "anticlockwise" on screen means subtracting the sine.
  return [shape.cx + radius * Math.cos(angle), shape.cy - radius * Math.sin(angle)];
}

/** Measure the picture under the scan and decide which notes it makes. */
export function buildScanScore(pixels: Pixels, shape: ScanShape, options: ScanOptions = {}): ScanScore {
  const grid = options.grid ?? (shape.kind === 'line' ? LINE_GRID : RADAR_GRID);
  const rule = options.rule ?? CHIME_RULE;
  const measure = options.measure ?? 'colour';
  const { columns, bands } = grid;
  const cells = columns * bands;
  const light = new Float64Array(cells); // what sets the level: colour strength or brightness
  const colour = new Float64Array(cells); // colour strength, for the warm share
  const warmColour = new Float64Array(cells);
  const count = new Uint32Array(cells);
  const { data, width, height } = pixels;

  const read = (cell: number, x: number, y: number) => {
    const i = (y * width + x) * 4;
    const s = colourStrength(data[i], data[i + 1], data[i + 2]);
    count[cell]++;
    light[cell] += measure === 'colour' ? s : brightness(data[i], data[i + 1], data[i + 2]);
    colour[cell] += s;
    if (isWarm(data[i], data[i + 1], data[i + 2])) warmColour[cell] += s;
  };
  if (shape.kind === 'line') {
    // Every pixel is counted once, in the cell it falls in. The bottom row is band 0.
    for (let y = 0; y < height; y++) {
      const band = Math.min(bands - 1, Math.floor(((height - (y + 0.5)) * bands) / height));
      for (let x = 0; x < width; x++) {
        const column = Math.min(columns - 1, Math.floor(((x + 0.5) * columns) / width));
        read(column * bands + band, x, y);
      }
    }
  } else {
    for (let column = 0; column < columns; column++) {
      for (let band = 0; band < bands; band++) {
        for (let i = 0; i < RADAR_SAMPLES; i++) {
          for (let j = 0; j < RADAR_SAMPLES; j++) {
            const [px, py] = radarPoint(shape, grid, column, band, i, j);
            const x = Math.floor(px);
            const y = Math.floor(py);
            if (x >= 0 && x < width && y >= 0 && y < height) read(column * bands + band, x, y);
          }
        }
      }
    }
  }

  const levels = new Float32Array(cells);
  const warmShare = new Float32Array(cells);
  let sounding = 0;
  for (let c = 0; c < cells; c++) {
    if (count[c] === 0) continue;
    levels[c] = levelOf(light[c] / count[c], grid.fullStrength);
    // A cell with no colour at all (grey or white light) has no warm share: it rings bells.
    warmShare[c] = colour[c] > 0 ? warmColour[c] / colour[c] : 0;
    if (levels[c] > 0) sounding++;
  }

  const chimes = sounding > 0 ? findChimes(levels, warmShare, grid, shape.kind === 'radar', rule) : [];
  return {
    shape: shape.kind,
    grid,
    measure,
    levels,
    warmShare,
    chimes,
    status: sounding > 0 ? 'ok' : 'missing',
    reason: sounding > 0 ? null : measure === 'colour' ? 'no coloured lines under the scan' : 'nothing bright under the scan',
  };
}

/**
 * Chimes: the moments the line crosses a bright spot. In each band, smooth the level over three
 * columns (weights 1, 2, 1), then keep the peaks: columns higher than the one before and at least
 * as high as the one after, with a level of `minLevel` or more. Peaks closer than `minGap` in one
 * band give way to the stronger one, and a column keeps its `perColumn` strongest. The radar is a
 * circle, so its first and last columns are neighbours.
 */
export function findChimes(
  levels: Float32Array,
  warmShare: Float32Array,
  grid: ScanGrid,
  cyclic: boolean,
  rule: ChimeRule = CHIME_RULE,
): Chime[] {
  const { columns, bands } = grid;
  const at = (column: number, band: number): number => {
    if (cyclic) column = ((column % columns) + columns) % columns;
    else if (column < 0 || column >= columns) return 0;
    return levels[column * bands + band];
  };
  const smooth = (column: number, band: number) => (at(column - 1, band) + 2 * at(column, band) + at(column + 1, band)) / 4;

  const kept: Chime[] = [];
  for (let band = 0; band < bands; band++) {
    const peaks: Chime[] = [];
    for (let column = 0; column < columns; column++) {
      const here = smooth(column, band);
      if (here < rule.minLevel) continue;
      if (here > smooth(column - 1, band) && here >= smooth(column + 1, band)) {
        peaks.push({ column, band, level: here, warm: warmShare[column * bands + band] >= 0.5 });
      }
    }
    // Strongest first; an earlier column wins a tie, so the result never depends on sort order.
    peaks.sort((a, b) => b.level - a.level || a.column - b.column);
    const accepted: Chime[] = [];
    for (const p of peaks) {
      const tooClose = accepted.some((q) => {
        const d = Math.abs(p.column - q.column);
        return (cyclic ? Math.min(d, columns - d) : d) < rule.minGap;
      });
      if (!tooClose) accepted.push(p);
    }
    kept.push(...accepted);
  }

  const byColumn = new Map<number, Chime[]>();
  for (const chime of kept) byColumn.set(chime.column, [...(byColumn.get(chime.column) ?? []), chime]);
  const out: Chime[] = [];
  for (const group of byColumn.values()) {
    group.sort((a, b) => b.level - a.level || a.band - b.band);
    out.push(...group.slice(0, rule.perColumn));
  }
  return out.sort((a, b) => a.column - b.column || a.band - b.band);
}

// ---------- Pitch: fixed choices that carry no data beyond "which band" ----------

/** C major pentatonic (C D E G A): no two notes clash, whatever the picture plays together.
 *  The same scale as the melody keys, so playing along always fits. Design choice. */
export const SCAN_SCALE = 'C major pentatonic';
/**
 * The held note of each band, low to high. All are notes of the scale, but not every step of it:
 * the low bands are far apart (a fifth, then a fourth) and the high bands close together, the way
 * a choir or an orchestra is spaced. Notes a step apart sound muddy when they are low and clear
 * when they are high. Design choice (15 Nov; the first version climbed step by step from C3, so
 * its three lowest bands, C3 D3 E3, blurred together whenever they sounded at once, which on the
 * radar is all the time).
 */
export const BAND_NOTE_NAMES = ['C3', 'G3', 'C4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
/** A scan with more than twelve bands keeps climbing the scale, step by step, above C6. */
const BAND_NOTES: number[] = [
  ...BAND_NOTE_NAMES,
  ...Scale.rangeOf(SCAN_SCALE)('D6', 'C9').filter((name): name is string => typeof name === 'string'),
].map((name) => Note.midi(name) as number);

/** MIDI note of a band's held (choir) note: band 0 is the lowest. */
export function bandNote(band: number): number {
  return BAND_NOTES[Math.min(BAND_NOTES.length - 1, Math.max(0, band))];
}

/** "C4" for 60: for the screen. */
export function noteName(note: number): string {
  return Note.fromMidi(note);
}

/** MIDI note of a chime: one octave above its band's held note, whichever instrument plays it.
 *  The pitch says where the spot is; the instrument says which colour it is. */
export function chimeNote(chime: Pick<Chime, 'band' | 'warm'>): number {
  return bandNote(chime.band) + 12;
}

/** How hard a chime is struck, 0.35 to 1, from its level. */
export function chimeVelocity(level: number): number {
  return 0.35 + 0.65 * Math.min(1, Math.max(0, level));
}

/** Mean level across the bands of one column, 0–1: the loudness of the low root note ("the whole
 *  line"). Zero when nothing on the line has colour, so an empty picture is silent. */
export function columnMean(score: ScanScore, column: number): number {
  const { bands } = score.grid;
  let sum = 0;
  for (let band = 0; band < bands; band++) sum += score.levels[column * bands + band];
  return sum / bands;
}

/** Seconds into the sweep (speed 1) at which a column starts. */
export function columnTime(grid: ScanGrid, column: number): number {
  return (column * grid.seconds) / grid.columns;
}

// ---------- Decoration: fixed musical choices that carry no data ----------

/**
 * The low root note does not stay on C: it steps through the roots of four chords, I, VIm, IV, V
 * in C (C, A, F, G), changing every 3.75 s. The same held notes are heard over four roots, as
 * four different chords, so the scan sounds like music that moves instead of one long drone.
 * C, A and G are notes of the scale. F is not: under F the held E is a major seventh above it,
 * the one sharp interval in the scan (scanScore.test.ts names the two pairs).
 * This is decoration on a fixed timetable. It carries no data: the picture sets only how loud the
 * root is (columnMean), never which note it is. The band notes never change, so a place on the
 * picture always gives the same pitch.
 */
export const ROOT_PROGRESSION = ['I', 'VIm', 'IV', 'V'];
export const ROOT_STEP_SECONDS = 3.75;
/** Octave of each root: C2, A1, F2, G2. The last step, G up to C, is the strongest way home. */
const ROOT_OCTAVES = [2, 1, 2, 2];
export const ROOT_NOTES: number[] = Progression.fromRomanNumerals('C', ROOT_PROGRESSION).map(
  (chord, i) => Note.midi(`${Chord.get(chord).tonic}${ROOT_OCTAVES[i]}`) as number,
);

/** MIDI note of the root while a column plays. The map sweep (30 s) goes round the four roots
 *  twice, a radar turn (15 s) once, so every sweep ends on G and starts again on C. */
export function rootNoteAt(grid: ScanGrid, column: number): number {
  const step = Math.floor(columnTime(grid, column) / ROOT_STEP_SECONDS + 1e-9);
  return ROOT_NOTES[step % ROOT_NOTES.length];
}

/** How far left or right the scan sounds, at most this much of full left or full right. */
export const PAN_WIDTH = 0.7;

/**
 * Left–right position of the scan's sound, -1 (left) to 1 (right), for a place in the sweep
 * (0 to 1). The sound sits where the line is: the map sweep travels from the left speaker to the
 * right, and the radar swings right (east), centre (north), left (west), centre (south).
 * It repeats what the screen shows and is never the only way a fact is given.
 */
export function scanPan(shape: ScanShape['kind'], position: number): number {
  const p = Math.min(1, Math.max(0, position));
  return PAN_WIDTH * (shape === 'line' ? 2 * p - 1 : Math.cos(2 * Math.PI * p));
}

/** Copy a rectangle out of a picture (a region's bounding square, for the radar). Parts outside the
 *  picture stay black, which the scan treats as nothing to play. */
export function cropPixels(pixels: Pixels, x0: number, y0: number, width: number, height: number): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sy = y0 + y;
    if (sy < 0 || sy >= pixels.height) continue;
    for (let x = 0; x < width; x++) {
      const sx = x0 + x;
      if (sx < 0 || sx >= pixels.width) continue;
      const from = (sy * pixels.width + sx) * 4;
      const to = (y * width + x) * 4;
      for (let k = 0; k < 4; k++) data[to + k] = pixels.data[from + k];
    }
  }
  return { data, width, height };
}

/**
 * What the radar reads for one region: the region's bounding square cut out of the picture, and the
 * circle inside it. `frameWidth` is the width the region's pixels are counted in (the scene's
 * frames). The still may be smaller than the frames, so everything is scaled by
 * picture width ÷ frame width. The app and the measuring tool (web/measure) both call this, so
 * they read the same pixels.
 */
export function regionScan(
  pixels: Pixels,
  frameWidth: number,
  region: { box_px: [number, number, number, number]; radius_px: number },
): { crop: Pixels; shape: RadarShape } {
  const k = pixels.width / frameWidth;
  const [x, y, w, h] = region.box_px;
  const crop = cropPixels(pixels, Math.round(x * k), Math.round(y * k), Math.round(w * k), Math.round(h * k));
  return { crop, shape: { kind: 'radar', cx: crop.width / 2, cy: crop.height / 2, r: region.radius_px * k } };
}

// ---------- TEST INPUT picture (not NASA data) ----------

/**
 * TEST INPUT (MOCK): a made-up picture with a known answer, for the unit tests and for the scan in
 * practice mode, where there is no NASA image. Black ground, a grey block (stands for land), and
 * three coloured dots. Width 240 and height 120, so with LINE_GRID one pixel column is one scan
 * column and each band is 10 rows.
 */
/**
 * TEST INPUT (MOCK): a circle on the test picture for the radar, centred on the picture. The green
 * dot is inside it, up and to the left of the centre; the red and blue dots are outside; part of
 * the grey block is inside and must stay silent. Shaped like a scene region so the app can use it
 * where it uses a real one.
 */
export const TEST_CIRCLE = {
  id: 'test_circle',
  name: 'test circle (TEST INPUT, not NASA data)',
  center_px: [120, 60] as [number, number],
  radius_px: 55,
  box_px: [65, 5, 110, 110] as [number, number, number, number],
  description: 'A circle 110 pixels across on the made-up test picture.',
};

export function makeTestPicture(): Pixels {
  const width = 240;
  const height = 120;
  const data = new Uint8ClampedArray(width * height * 4);
  const fill = (x0: number, y0: number, w: number, h: number, rgb: [number, number, number]) => {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const i = (y * width + x) * 4;
        data[i] = rgb[0];
        data[i + 1] = rgb[1];
        data[i + 2] = rgb[2];
      }
    }
  };
  for (let i = 3; i < data.length; i += 4) data[i] = 255; // opaque
  fill(100, 20, 40, 80, [70, 70, 70]); // grey "land": must stay silent
  fill(40, 100, 8, 10, [255, 40, 0]); // red dot, low in the picture: band 1
  fill(80, 30, 8, 10, [0, 220, 60]); // green dot, high in the picture: band 8
  fill(200, 60, 8, 10, [0, 80, 255]); // blue dot, middle: band 5
  return { data, width, height };
}
