// The picture scan's rule, checked on made-up pictures with known answers (TEST INPUTS, not NASA
// data). Each test states what the rule should give, then compares.
import { describe, expect, it } from 'vitest';
import {
  CHIME_RULE,
  LINE_GRID,
  PAN_WIDTH,
  RADAR_GRID,
  ROOT_NOTES,
  ROOT_PROGRESSION,
  ROOT_STEP_SECONDS,
  SCAN_SCALE,
  STRENGTH_FLOOR,
  TEST_CIRCLE,
  brightness,
  noteName,
  regionScan,
  rootNoteAt,
  scanPan,
  bandNote,
  buildScanScore,
  chimeNote,
  chimeVelocity,
  colourStrength,
  columnMean,
  columnTime,
  cropPixels,
  findChimes,
  findChimesDetailed,
  hasData,
  isWarm,
  levelOf,
  makeTestPicture,
  radarPoint,
  resampleMask,
  smoothedLevel,
  type Pixels,
  type ScanGrid,
} from './scanScore';

/** A picture filled with one colour. */
function flat(width: number, height: number, rgb: [number, number, number]): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([...rgb, 255], i);
  return { data, width, height };
}
function paint(p: Pixels, x0: number, y0: number, w: number, h: number, rgb: [number, number, number]): Pixels {
  const data = p.data as Uint8ClampedArray;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) data.set([...rgb, 255], (y * p.width + x) * 4);
  return p;
}
const level = (s: ReturnType<typeof buildScanScore>, column: number, band: number) => s.levels[column * s.grid.bands + band];

describe('colour strength and warmth of one pixel', () => {
  it('black, grey and white have no colour strength', () => {
    expect(colourStrength(0, 0, 0)).toBe(0);
    expect(colourStrength(70, 70, 70)).toBe(0);
    expect(colourStrength(255, 255, 255)).toBe(0);
  });
  it('a pure colour has strength 1, a half-strength colour 0.5', () => {
    expect(colourStrength(255, 0, 0)).toBe(1);
    expect(colourStrength(0, 0, 255)).toBe(1);
    expect(colourStrength(255, 255, 0)).toBe(1);
    expect(colourStrength(128, 0.5, 0.5)).toBeCloseTo(0.5);
  });
  it('red and orange are warm; green and blue are not', () => {
    expect(isWarm(255, 0, 0)).toBe(true);
    expect(isWarm(255, 140, 0)).toBe(true);
    expect(isWarm(160, 255, 0)).toBe(false); // yellow-green
    expect(isWarm(0, 255, 0)).toBe(false);
    expect(isWarm(0, 80, 255)).toBe(false);
  });
});

describe('level: a straight line from the floor to the full level', () => {
  it('at or below the floor is silent; at or above full is 1; half-way is 0.5', () => {
    expect(levelOf(0, 0.5)).toBe(0);
    expect(levelOf(STRENGTH_FLOOR, 0.5)).toBe(0);
    expect(levelOf(0.5, 0.5)).toBe(1);
    expect(levelOf(0.9, 0.5)).toBe(1);
    expect(levelOf((STRENGTH_FLOOR + 0.5) / 2, 0.5)).toBeCloseTo(0.5);
  });
  it('more colour never gives a lower level', () => {
    let last = -1;
    for (let s = 0; s <= 1; s += 0.01) {
      const l = levelOf(s, 0.75);
      expect(l).toBeGreaterThanOrEqual(last);
      last = l;
    }
  });
});

describe('line scan on the TEST INPUT picture (240 × 120: one pixel column per scan column, 10 rows per band)', () => {
  const score = buildScanScore(makeTestPicture(), { kind: 'line' });

  it('is ok, and repeats exactly', () => {
    expect(score.status).toBe('ok');
    const again = buildScanScore(makeTestPicture(), { kind: 'line' });
    expect(Array.from(again.levels)).toEqual(Array.from(score.levels));
    expect(again.chimes).toEqual(score.chimes);
  });

  it('black background and grey "land" are silent', () => {
    expect(level(score, 10, 6)).toBe(0); // black
    for (let column = 100; column < 140; column++) for (let band = 0; band < 12; band++) expect(level(score, column, band)).toBe(0); // grey block
  });

  it('each dot sounds only in its own columns and band', () => {
    // Red dot: x 40–47, rows 100–109 → the second band from the bottom (band 1).
    expect(level(score, 40, 1)).toBe(1);
    expect(level(score, 47, 1)).toBe(1);
    expect(level(score, 39, 1)).toBe(0);
    expect(level(score, 48, 1)).toBe(0);
    expect(level(score, 40, 0)).toBe(0);
    expect(level(score, 40, 2)).toBe(0);
    // Green dot: x 80–87, rows 30–39 → band 8. Blue dot: x 200–207, rows 60–69 → band 5.
    expect(level(score, 83, 8)).toBe(1);
    expect(level(score, 203, 5)).toBe(1);
  });

  it('three dots give exactly three chimes, each when the line first covers its dot', () => {
    // A flat-topped peak chimes where it stops rising: smoothing (1, 2, 1) reaches full level one
    // column after the dot's left edge.
    expect(score.chimes.map((c) => [c.column, c.band, c.warm])).toEqual([
      [41, 1, true], // red: marimba
      [81, 8, false], // green: bells
      [201, 5, false], // blue: bells
    ]);
    expect(score.chimes.every((c) => c.level === 1)).toBe(true);
  });

  it('time: column 41 of 240 in a 30 s sweep starts at 5.125 s', () => {
    expect(columnTime(LINE_GRID, 41)).toBeCloseTo(5.125);
    expect(columnTime(LINE_GRID, 0)).toBe(0);
  });

  it('the dot higher in the picture plays the higher note', () => {
    const [red, green, blue] = score.chimes;
    expect(bandNote(green.band)).toBeGreaterThan(bandNote(blue.band));
    expect(bandNote(blue.band)).toBeGreaterThan(bandNote(red.band));
  });

  it('the root follows the whole line: one band of twelve at full level is 1/12', () => {
    expect(columnMean(score, 44)).toBeCloseTo(1 / 12);
    expect(columnMean(score, 10)).toBe(0);
  });
});

describe('missing information', () => {
  it('a black picture is missing, with a reason, and makes no sound events', () => {
    const s = buildScanScore(flat(240, 120, [0, 0, 0]), { kind: 'line' });
    expect(s.status).toBe('missing');
    expect(s.reason).toMatch(/no coloured lines/);
    expect(s.chimes).toEqual([]);
    expect(Math.max(...s.levels)).toBe(0);
  });
  it('an all-grey picture (land only) is missing too', () => {
    expect(buildScanScore(flat(240, 120, [70, 70, 70]), { kind: 'line' }).status).toBe('missing');
  });
  it('grey with JPEG-like colour noise up to the floor (12 levels) stays silent', () => {
    expect(buildScanScore(flat(240, 120, [70, 76, 82]), { kind: 'line' }).status).toBe('missing');
  });
});

describe('brightness → loudness', () => {
  it('a stronger colour in the same place is louder, up to the full level', () => {
    const at = (value: number) => level(buildScanScore(paint(flat(240, 120, [0, 0, 0]), 0, 0, 240, 10, [value, 0, 0]), { kind: 'line' }), 5, 11);
    expect(at(40)).toBeGreaterThan(0);
    expect(at(80)).toBeGreaterThan(at(40));
    expect(at(120)).toBeGreaterThan(at(80));
    expect(at(128)).toBe(1); // strength 0.502 ≥ the line scan's full level 0.5
    expect(at(255)).toBe(1);
  });
});

describe('radar scan', () => {
  const size = 200;
  const shape = { kind: 'radar' as const, cx: 100, cy: 100, r: 100 };

  it('starts at 3 o’clock and turns anticlockwise', () => {
    const [x0, y0] = radarPoint(shape, RADAR_GRID, 0, 11, 0, 3);
    expect(x0).toBeGreaterThan(190); // first column, outer band: far right
    expect(Math.abs(y0 - 100)).toBeLessThan(3);
    const [x1, y1] = radarPoint(shape, RADAR_GRID, 30, 11, 0, 3); // a quarter turn later
    expect(Math.abs(x1 - 100)).toBeLessThan(3);
    expect(y1).toBeLessThan(10); // top of the picture: north
  });

  it('a dot straight above the centre chimes a quarter of the way round, in the band for its distance', () => {
    // Dot centred 55 px above the centre: 55% of the radius → band floor(0.55 × 12) = 6.
    const picture = paint(flat(size, size, [0, 0, 0]), 94, 39, 12, 12, [255, 60, 0]);
    const s = buildScanScore(picture, shape);
    expect(s.status).toBe('ok');
    const strongest = [...s.chimes].sort((a, b) => b.level - a.level)[0];
    expect(strongest.band).toBe(6);
    expect(strongest.warm).toBe(true);
    // A quarter turn is column 30 of 120; the dot is about 12° wide, so allow two columns each way.
    expect(Math.abs(strongest.column - 30)).toBeLessThanOrEqual(2);
    expect(columnTime(RADAR_GRID, 30)).toBeCloseTo(3.75); // a quarter of the 15 s turn
  });

  it('a dot further from the centre plays a higher note', () => {
    const near = buildScanScore(paint(flat(size, size, [0, 0, 0]), 120, 94, 12, 12, [0, 200, 255]), shape);
    const far = buildScanScore(paint(flat(size, size, [0, 0, 0]), 170, 94, 12, 12, [0, 200, 255]), shape);
    const top = (s: typeof near) => [...s.chimes].sort((a, b) => b.level - a.level)[0];
    expect(top(far).band).toBeGreaterThan(top(near).band);
    expect(chimeNote(top(far))).toBeGreaterThan(chimeNote(top(near)));
  });

  it('pixels outside the circle are never read', () => {
    // Colour only in the four corners of the square, outside the circle.
    const picture = flat(size, size, [0, 0, 0]);
    for (const [x, y] of [[0, 0], [185, 0], [0, 185], [185, 185]] as const) paint(picture, x, y, 15, 15, [255, 0, 0]);
    expect(buildScanScore(picture, shape).status).toBe('missing');
  });

  it('no cell is empty, even next to the centre', () => {
    const s = buildScanScore(flat(122, 122, [0, 255, 0]), { kind: 'radar', cx: 61, cy: 61, r: 61 });
    expect(Math.min(...s.levels)).toBe(1);
  });

  it('a full circle of one colour has no bright spot to cross: the choir holds and no chime rings', () => {
    const s = buildScanScore(flat(122, 122, [0, 255, 0]), { kind: 'radar', cx: 61, cy: 61, r: 61 });
    expect(s.chimes).toEqual([]);
  });
});

describe('radar on the TEST circle (centre 120, 60 and radius 55 on the test picture)', () => {
  const [x, y, w, h] = TEST_CIRCLE.box_px;
  const score = buildScanScore(cropPixels(makeTestPicture(), x, y, w, h), { kind: 'radar', cx: w / 2, cy: h / 2, r: TEST_CIRCLE.radius_px });

  it('the box is the square around the circle, as for a scene region', () => {
    const [cx, cy] = TEST_CIRCLE.center_px;
    const r = TEST_CIRCLE.radius_px;
    expect(TEST_CIRCLE.box_px).toEqual([cx - r, cy - r, 2 * r, 2 * r]);
  });

  it('only the green dot sounds: it is the one dot inside the circle', () => {
    // The dot's centre is 36 px left of the circle's centre and 25 px above it:
    // angle atan2(25, -36) = 145 degrees, distance 44 px = 80% of the radius.
    expect(score.status).toBe('ok');
    const sounding: [number, number][] = [];
    score.levels.forEach((value, i) => {
      if (value > 0) sounding.push([Math.floor(i / 12), i % 12]);
    });
    for (const [column, band] of sounding) {
      expect(column * 3).toBeGreaterThanOrEqual(130); // 3 degrees a column
      expect((column + 1) * 3).toBeLessThanOrEqual(160);
      expect(band).toBeGreaterThanOrEqual(8);
      expect(band).toBeLessThanOrEqual(10);
    }
  });

  it('it chimes once: 145 degrees round is column 48, 80% of the way out is band 9, and green rings the bells', () => {
    expect(score.chimes.map((c) => [c.column, c.band, c.warm])).toEqual([[48, 9, false]]);
    expect(columnTime(RADAR_GRID, 48)).toBeCloseTo(6); // 6 s into the 15 s turn
    expect(noteName(chimeNote(score.chimes[0]))).toBe('G6');
  });

  it('the grey block inside the circle is silent', () => {
    // Straight to the right of the centre (column 0), a third of the way out: inside the grey block.
    expect(level(score, 0, 3)).toBe(0);
    expect(level(score, 30, 5)).toBe(0); // straight up, still grey
  });
});

describe('chime rule', () => {
  const grid: ScanGrid = { columns: 40, bands: 2, seconds: 5, fullStrength: 0.5 };
  const make = (values: Record<number, number>, band = 0) => {
    const levels = new Float32Array(grid.columns * grid.bands);
    for (const [column, value] of Object.entries(values)) levels[Number(column) * grid.bands + band] = value;
    return levels;
  };
  const warm = new Float32Array(grid.columns * grid.bands);

  it('a spot below the minimum level makes no chime', () => {
    // One column at 0.5 smooths to 0.25 at its peak, below the minimum of 0.3.
    expect(findChimes(make({ 10: 0.5 }), warm, grid, false)).toEqual([]);
    expect(findChimes(make({ 10: 0.8 }), warm, grid, false)).toHaveLength(1); // smooths to 0.4
  });

  it('two spots closer than the minimum gap: only the stronger chimes', () => {
    const chimes = findChimes(make({ 10: 0.8, 13: 1 }), warm, grid, false);
    expect(chimes.map((c) => c.column)).toEqual([13]);
    expect(CHIME_RULE.minGap).toBe(6);
  });

  it('two spots at least the minimum gap apart both chime', () => {
    expect(findChimes(make({ 10: 0.8, 16: 1 }), warm, grid, false).map((c) => c.column)).toEqual([10, 16]);
  });

  it('one column keeps only its strongest chime', () => {
    const levels = make({ 10: 0.8 }, 0);
    levels[10 * grid.bands + 1] = 1;
    const chimes = findChimes(levels, warm, grid, false);
    expect(chimes).toHaveLength(1);
    expect(chimes[0].band).toBe(1);
  });

  it('on the radar the last and first columns are neighbours', () => {
    // Spots at columns 38 and 1 are 3 apart around the circle, not 37.
    expect(findChimes(make({ 38: 0.8, 1: 1 }), warm, grid, true).map((c) => c.column)).toEqual([1]);
    expect(findChimes(make({ 38: 0.8, 1: 1 }), warm, grid, false).map((c) => c.column)).toEqual([1, 38]);
  });
});

describe('pitch: fixed choices', () => {
  it('twelve bands climb from C3 to C6 on notes of the five-note scale', () => {
    expect(Array.from({ length: 12 }, (_, band) => bandNote(band))).toEqual([48, 55, 60, 64, 67, 69, 72, 74, 76, 79, 81, 84]);
  });
  it('low bands are far apart and high bands close together: no two notes closer than a fourth below C4', () => {
    const notes = Array.from({ length: 12 }, (_, band) => bandNote(band));
    const gaps = notes.slice(1).map((n, i) => n - notes[i]);
    expect(gaps).toEqual([7, 5, 4, 3, 2, 3, 2, 2, 3, 2, 3]);
    notes.slice(1).forEach((n, i) => {
      if (n <= 60) expect(n - notes[i]).toBeGreaterThanOrEqual(5);
    });
    expect(Math.max(...gaps.slice(4))).toBeLessThanOrEqual(3); // from G4 up: steps of the scale
  });
  it('every note is C, D, E, G or A', () => {
    for (let band = 0; band < 12; band++) {
      expect([0, 2, 4, 7, 9]).toContain(bandNote(band) % 12);
      expect([0, 2, 4, 7, 9]).toContain(chimeNote({ band, warm: true }) % 12);
      expect([0, 2, 4, 7, 9]).toContain(chimeNote({ band, warm: false }) % 12);
    }
  });
  it('a chime is one octave above its band, whichever instrument plays it: pitch says where, not which colour', () => {
    for (let band = 0; band < 12; band++) {
      expect(chimeNote({ band, warm: true })).toBe(bandNote(band) + 12);
      expect(chimeNote({ band, warm: false })).toBe(chimeNote({ band, warm: true }));
    }
  });
  it('a stronger spot is struck harder, between 0.35 and 1', () => {
    expect(chimeVelocity(0)).toBeCloseTo(0.35);
    expect(chimeVelocity(1)).toBe(1);
    expect(chimeVelocity(0.6)).toBeGreaterThan(chimeVelocity(0.4));
  });
});

describe('cropPixels', () => {
  it('copies the rectangle and leaves parts outside the picture black', () => {
    const p = paint(flat(10, 10, [0, 0, 0]), 8, 8, 2, 2, [255, 0, 0]);
    const c = cropPixels(p, 8, 8, 4, 4);
    expect([c.width, c.height]).toEqual([4, 4]);
    expect(c.data[0]).toBe(255); // (8, 8) is red
    expect(c.data[(1 * 4 + 1) * 4]).toBe(255); // (9, 9) is red
    expect(c.data[(2 * 4 + 2) * 4]).toBe(0); // (10, 10) is outside: black
  });
});

describe('regionScan: what the radar reads for a region', () => {
  it('cuts out the bounding square and puts the circle at its centre', () => {
    const { crop, shape } = regionScan(makeTestPicture(), 240, TEST_CIRCLE);
    expect([crop.width, crop.height]).toEqual([110, 110]);
    expect(shape).toEqual({ kind: 'radar', cx: 55, cy: 55, r: 55 });
    // The same score as cropping by hand, which is what the app did before this helper.
    const byHand = buildScanScore(cropPixels(makeTestPicture(), 65, 5, 110, 110), { kind: 'radar', cx: 55, cy: 55, r: 55 });
    expect(buildScanScore(crop, shape).chimes).toEqual(byHand.chimes);
  });
  it('scales the region when the still is smaller than the frames it was drawn on', () => {
    // Frames twice as wide as the picture: every length halves. 32.5 and 2.5 round up to 33 and 3.
    const { crop, shape } = regionScan(makeTestPicture(), 480, TEST_CIRCLE);
    expect([crop.width, crop.height]).toEqual([55, 55]);
    expect(shape).toEqual({ kind: 'radar', cx: 27.5, cy: 27.5, r: 27.5 });
    const direct = cropPixels(makeTestPicture(), 33, 3, 55, 55);
    expect(Array.from(crop.data)).toEqual(Array.from(direct.data));
  });
});

describe('notes come from the music library (Tonal)', () => {
  it('the band notes, by name, are all notes of C major pentatonic', async () => {
    expect(SCAN_SCALE).toBe('C major pentatonic');
    const names = Array.from({ length: 12 }, (_, band) => noteName(bandNote(band)));
    expect(names).toEqual(['C3', 'G3', 'C4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6']);
    const { Scale } = await import('tonal');
    const scale = Scale.get(SCAN_SCALE).notes; // C D E G A
    for (const name of names) expect(scale).toContain(name.slice(0, -1));
  });
  it('a band beyond the twelfth keeps climbing the same scale', () => {
    expect(noteName(bandNote(12))).toBe('D6');
    expect(noteName(bandNote(14))).toBe('G6');
  });
  it('chime notes are named for the screen', () => {
    expect(noteName(chimeNote({ band: 1, warm: true }))).toBe('G4');
    expect(noteName(chimeNote({ band: 8, warm: false }))).toBe('E6');
  });
});

describe('decoration that carries no data: the low root steps I, VIm, IV, V', () => {
  it('the four roots are C2, A1, F2 and G2', () => {
    expect(ROOT_PROGRESSION).toEqual(['I', 'VIm', 'IV', 'V']);
    expect(ROOT_NOTES.map(noteName)).toEqual(['C2', 'A1', 'F2', 'G2']);
  });
  // "Clash" in these tests: two notes a semitone, a tritone or a major seventh apart (1, 6 or 11
  // semitones, octaves aside). A stated definition, so the claims below can be checked.
  const clash = (a: number, b: number) => [1, 6, 11].includes((((a - b) % 12) + 12) % 12);
  const held = Array.from({ length: 12 }, (_, band) => bandNote(band));

  it('no two held notes clash: the five notes of the scale have no semitone, tritone or major seventh between them', () => {
    expect([...new Set(held.map((n) => n % 12))].sort((a, b) => a - b)).toEqual([0, 2, 4, 7, 9]); // C D E G A
    for (const a of held) for (const b of held) expect(clash(a, b), `${noteName(a)} with ${noteName(b)}`).toBe(false);
  });
  it('three of the four roots are notes of the scale; F is not', () => {
    expect(ROOT_NOTES.map((n) => [0, 2, 4, 7, 9].includes(n % 12))).toEqual([true, true, false, true]); // C, A, F, G
    expect(noteName(ROOT_NOTES[2])).toBe('F2');
  });
  it('the one clash in the scan: under the root F, the held E is a major seventh above it', () => {
    const pairs = ROOT_NOTES.flatMap((root) => held.filter((note) => clash(note, root)).map((note) => `${noteName(root)} with ${noteName(note)}`));
    expect(pairs).toEqual(['F2 with E4', 'F2 with E5']);
  });
  it('the root changes every 3.75 s: 30 columns at 8 columns a second', () => {
    expect(ROOT_STEP_SECONDS).toBe(3.75);
    expect(rootNoteAt(LINE_GRID, 0)).toBe(36);
    expect(rootNoteAt(LINE_GRID, 29)).toBe(36);
    expect(rootNoteAt(LINE_GRID, 30)).toBe(33);
    expect(rootNoteAt(LINE_GRID, 60)).toBe(41);
    expect(rootNoteAt(LINE_GRID, 90)).toBe(43);
  });
  it('the map sweep goes round the roots twice, a radar turn once, and both end on G', () => {
    const roots = (grid: ScanGrid) => Array.from({ length: grid.columns / 30 }, (_, step) => noteName(rootNoteAt(grid, step * 30)));
    expect(roots(LINE_GRID)).toEqual(['C2', 'A1', 'F2', 'G2', 'C2', 'A1', 'F2', 'G2']);
    expect(roots(RADAR_GRID)).toEqual(['C2', 'A1', 'F2', 'G2']);
    expect(noteName(rootNoteAt(LINE_GRID, LINE_GRID.columns - 1))).toBe('G2');
  });
  it('the root is the same for every picture: it depends only on the time', () => {
    const black = buildScanScore(flat(240, 120, [0, 0, 0]), { kind: 'line' });
    const dots = buildScanScore(makeTestPicture(), { kind: 'line' });
    for (const column of [0, 45, 100, 239]) expect(rootNoteAt(black.grid, column)).toBe(rootNoteAt(dots.grid, column));
  });
});

describe('left and right: the sound sits where the line is', () => {
  it('the map sweep travels from left to right', () => {
    expect(scanPan('line', 0)).toBeCloseTo(-PAN_WIDTH);
    expect(scanPan('line', 0.5)).toBeCloseTo(0);
    expect(scanPan('line', 1)).toBeCloseTo(PAN_WIDTH);
    expect(scanPan('line', 0.75)).toBeGreaterThan(scanPan('line', 0.25));
  });
  it('the radar swings right (east), centre (north), left (west), centre (south)', () => {
    expect(scanPan('radar', 0)).toBeCloseTo(PAN_WIDTH);
    expect(scanPan('radar', 0.25)).toBeCloseTo(0);
    expect(scanPan('radar', 0.5)).toBeCloseTo(-PAN_WIDTH);
    expect(scanPan('radar', 0.75)).toBeCloseTo(0);
  });
  it('it never reaches one speaker alone', () => {
    for (let p = 0; p <= 1; p += 0.05) {
      expect(Math.abs(scanPan('line', p))).toBeLessThanOrEqual(PAN_WIDTH + 1e-9);
      expect(Math.abs(scanPan('radar', p))).toBeLessThanOrEqual(PAN_WIDTH + 1e-9);
    }
    expect(PAN_WIDTH).toBeLessThan(1);
  });
});

describe('other kinds of picture: brightness in place of colour', () => {
  // TEST INPUT: a white dot on black, like a cloud or a city light. It has no colour at all.
  const whiteDot = () => paint(flat(240, 120, [0, 0, 0]), 80, 30, 8, 10, [255, 255, 255]);

  it('brightness of one pixel is its largest channel', () => {
    expect(brightness(0, 0, 0)).toBe(0);
    expect(brightness(255, 255, 255)).toBe(1);
    expect(brightness(0, 128, 64)).toBeCloseTo(128 / 255);
  });
  it('measured by colour, a white dot is silent and the picture is missing', () => {
    const s = buildScanScore(whiteDot(), { kind: 'line' });
    expect(s.measure).toBe('colour');
    expect(s.status).toBe('missing');
  });
  it('measured by brightness, the same dot plays: one chime, in its band, on bells', () => {
    const s = buildScanScore(whiteDot(), { kind: 'line' }, { measure: 'brightness' });
    expect(s.status).toBe('ok');
    expect(s.chimes.map((c) => [c.column, c.band, c.warm])).toEqual([[81, 8, false]]);
    expect(level(s, 83, 8)).toBe(1);
  });
  it('measured by brightness, a black picture is still missing, with its own reason', () => {
    const s = buildScanScore(flat(240, 120, [0, 0, 0]), { kind: 'line' }, { measure: 'brightness' });
    expect(s.status).toBe('missing');
    expect(s.reason).toMatch(/nothing bright/);
  });
  it('measured by brightness, grey land would sound: so the ocean picture stays on colour', () => {
    const s = buildScanScore(flat(240, 120, [70, 70, 70]), { kind: 'line' }, { measure: 'brightness' });
    expect(s.status).toBe('ok');
    expect(level(s, 10, 5)).toBeGreaterThan(0.4);
  });
});

// ---------- Each picture's own settings: floor, mask, no data ----------

/** TEST INPUT: the test picture with its black ground painted another colour. */
function onGround(rgb: [number, number, number]): Pixels {
  const p = makeTestPicture();
  const data = p.data as Uint8ClampedArray;
  for (let i = 0; i < data.length; i += 4) if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) data.set(rgb, i);
  return p;
}
/** TEST INPUT: dark navy, like an empty sea drawn in colour (colour strength 36/255). */
const NAVY: [number, number, number] = [4, 10, 40];
const NAVY_FLOOR = 36 / 255 + 12 / 255; // the ground's own strength plus the 12-level tolerance
const chimesOf = (s: ReturnType<typeof buildScanScore>) => s.chimes.map((c) => [c.column, c.band, c.warm, c.level]);

describe('a picture whose empty ground has colour needs its own floor (TEST INPUT)', () => {
  it('the level is a straight line from the given floor to the full level', () => {
    expect(levelOf(0.3, 0.5, 0.1)).toBeCloseTo(0.5, 12);
    expect(levelOf(0.1, 0.5, 0.1)).toBe(0);
    expect(levelOf(0.5, 0.5, 0.1)).toBe(1);
    expect(levelOf(0.3, 0.5)).toBe(levelOf(0.3, 0.5, STRENGTH_FLOOR)); // the default is the ocean's floor
  });
  it('at the ocean floor (12/255) every cell of a navy sea sounds', () => {
    const s = buildScanScore(flat(240, 120, NAVY), { kind: 'line' });
    expect(s.floor).toBe(STRENGTH_FLOOR);
    expect(s.levels.every((l) => l > 0)).toBe(true);
  });
  it('at the navy plus 12 levels no cell sounds, and the picture says it is missing', () => {
    const s = buildScanScore(flat(240, 120, NAVY), { kind: 'line' }, { floor: NAVY_FLOOR });
    expect(s.floor).toBe(NAVY_FLOOR);
    expect(s.levels.every((l) => l === 0)).toBe(true);
    expect(s.status).toBe('missing');
    expect(s.reason).toMatch(/no coloured lines/);
  });
  it('the three dots on navy, at that floor, give exactly the chimes they give on black', () => {
    const black = buildScanScore(makeTestPicture(), { kind: 'line' });
    const navy = buildScanScore(onGround(NAVY), { kind: 'line' }, { floor: NAVY_FLOOR });
    expect(chimesOf(navy)).toEqual(chimesOf(black));
    expect(chimesOf(navy).map(([column, band, warm]) => [column, band, warm])).toEqual([[41, 1, true], [81, 8, false], [201, 5, false]]);
  });
});

describe('a mask: pixels the scan never reads (TEST INPUT)', () => {
  /** A mask the size of a 240 × 120 picture, set where `masked(x, y)` is true. */
  const maskOf = (masked: (x: number, y: number) => boolean, width = 240, height = 120) => {
    const m = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) m[y * width + x] = masked(x, y) ? 1 : 0;
    return m;
  };

  it('no mask and an empty mask give exactly the same score as before', () => {
    const before = buildScanScore(makeTestPicture(), { kind: 'line' });
    for (const mask of [null, maskOf(() => false)]) {
      const s = buildScanScore(makeTestPicture(), { kind: 'line' }, { mask });
      expect(Array.from(s.levels)).toEqual(Array.from(before.levels));
      expect(Array.from(s.means)).toEqual(Array.from(before.means));
      expect(s.chimes).toEqual(before.chimes);
      expect(s.dropped).toEqual(before.dropped);
    }
  });
  it('a masked pixel is not read: a fully masked cell read nothing and is no data', () => {
    // One pixel column per scan column: mask columns 100 to 119 (the left half of the grey block).
    const s = buildScanScore(makeTestPicture(), { kind: 'line' }, { mask: maskOf((x) => x >= 100 && x < 120) });
    for (let band = 0; band < 12; band++) {
      expect(s.reads[110 * 12 + band]).toBe(0);
      expect(hasData(s, 110 * 12 + band)).toBe(false);
      expect(s.reads[130 * 12 + band]).toBe(10);
    }
  });
  it('a half-masked cell has the mean of the pixels it read, not of the whole cell', () => {
    // 480 wide: two pixels per column. Column 0 is a red pixel and a black one; mask the black one.
    const p = paint(flat(480, 120, [0, 0, 0]), 0, 0, 1, 120, [255, 0, 0]);
    const plain = buildScanScore(p, { kind: 'line' });
    const masked = buildScanScore(p, { kind: 'line' }, { mask: maskOf((x) => x === 1, 480, 120) });
    expect(plain.means[0]).toBeCloseTo(0.5, 6);
    expect(masked.means[0]).toBeCloseTo(1, 6);
    expect(masked.reads[0]).toBe(10);
  });
  it('a cell with no data is silent and is never a chime, even under a bright dot', () => {
    // Mask the green dot exactly (x 80–87, y 30–39): its chime in column 81, band 8 must go.
    const s = buildScanScore(makeTestPicture(), { kind: 'line' }, { mask: maskOf((x, y) => x >= 80 && x < 88 && y >= 30 && y < 40) });
    expect(s.chimes.map((c) => [c.column, c.band])).toEqual([[41, 1], [201, 5]]);
    expect(s.dropped.some((d) => d.band === 8 && d.column >= 79 && d.column <= 88)).toBe(false);
    for (let column = 80; column < 88; column++) expect(level(s, column, 8)).toBe(0);
  });
  it('the low note leaves out bands with no data: it is the mean of the bands that read something', () => {
    // A full red column 40 (every band at level 1), with the top six bands masked.
    const p = paint(flat(240, 120, [0, 0, 0]), 40, 0, 1, 120, [255, 0, 0]);
    const s = buildScanScore(p, { kind: 'line' }, { mask: maskOf((x, y) => x === 40 && y < 60) });
    expect(columnMean(s, 40)).toBe(1); // six bands at 1, six with no data: not 0.5
    const all = buildScanScore(p, { kind: 'line' }, { mask: maskOf((x) => x === 40) });
    expect(columnMean(all, 40)).toBe(0); // a column with no data at all is silent
  });
  it('everything masked: the scan is missing, and says that nothing was read', () => {
    const s = buildScanScore(makeTestPicture(), { kind: 'line' }, { mask: maskOf(() => true) });
    expect(s.status).toBe('missing');
    expect(s.reason).toMatch(/nothing under the scan was read/);
    expect(s.reads.every((r) => r === 0)).toBe(true);
  });
  it('a mask of the wrong size is an error, not a guess', () => {
    expect(() => buildScanScore(makeTestPicture(), { kind: 'line' }, { mask: new Uint8Array(10) })).toThrow(/240 × 120/);
  });
  it('the radar reads the mask too: masked sample points are not read', () => {
    const picture = flat(122, 122, [0, 255, 0]);
    const shape = { kind: 'radar' as const, cx: 61, cy: 61, r: 61 };
    const s = buildScanScore(picture, shape, { mask: maskOf((x) => x < 61, 122, 122) }); // the west half
    // Column 60 of 120 points due west: every band there read nothing. Column 0 points east: all read.
    for (let band = 0; band < 12; band++) {
      expect(s.reads[60 * 12 + band]).toBe(0);
      expect(s.reads[0 * 12 + band]).toBe(16);
    }
  });
});

describe('no data next to a peak: compared only with the neighbour that has data', () => {
  const grid: ScanGrid = { columns: 40, bands: 1, seconds: 5, fullStrength: 0.5 };
  const row = (values: Record<number, number>) => {
    const levels = new Float32Array(40);
    for (const [c, v] of Object.entries(values)) levels[Number(c)] = v;
    return levels;
  };
  const allRead = () => new Uint32Array(40).fill(10);

  it('smoothing leaves a no-data neighbour out, and the others share its weight', () => {
    const levels = row({ 10: 0.8, 11: 0.4 });
    const reads = allRead();
    reads[9] = 0;
    expect(smoothedLevel(levels, grid, false, 10, 0)).toBeCloseTo((0 + 2 * 0.8 + 0.4) / 4, 6);
    expect(smoothedLevel(levels, grid, false, 10, 0, reads)).toBeCloseTo((2 * 0.8 + 0.4) / 3, 6);
    expect(smoothedLevel(levels, grid, false, 10, 0, allRead())).toBe(smoothedLevel(levels, grid, false, 10, 0));
  });
  it('a no-data cell has no smoothed level', () => {
    const reads = allRead();
    reads[10] = 0;
    expect(smoothedLevel(row({ 10: 0.9 }), grid, false, 10, 0, reads)).toBe(0);
  });
  it('on a coast the peak is the first cell with data, not one column further on', () => {
    // Column 9 is no data (land); the sea from column 10 is bright, then fades.
    const levels = row({ 10: 0.6, 11: 0.6, 12: 0.2 });
    const reads = allRead();
    reads[9] = 0;
    const warm = new Float32Array(40);
    expect(findChimes(levels, warm, grid, false).map((c) => c.column)).toEqual([11]); // land counted as 0
    expect(findChimes(levels, warm, grid, false, undefined, reads).map((c) => c.column)).toEqual([10]);
  });
  it('a cell with no data is never a peak, whatever level it holds', () => {
    const levels = row({ 20: 1 });
    const reads = allRead();
    reads[20] = 0;
    const found = findChimesDetailed(levels, new Float32Array(40), grid, false, undefined, reads);
    expect(found.chimes).toEqual([]);
    expect(found.dropped).toEqual([]);
  });
  it('beyond the map sweep\'s ends is not no data: the first column is still compared with 0', () => {
    const levels = row({ 0: 0.8 });
    const reads = allRead();
    expect(findChimes(levels, new Float32Array(40), grid, false, undefined, reads).map((c) => c.column)).toEqual([0]);
  });
});

describe('resampleMask: one mask on a picture of another size (nearest pixel)', () => {
  it('the same size gives the same mask', () => {
    const m = Uint8Array.from([1, 0, 0, 1, 1, 1]);
    expect(Array.from(resampleMask(m, 3, 2, 3, 2))).toEqual([1, 0, 0, 1, 1, 1]);
  });
  it('twice the size repeats each pixel in a 2 × 2 square', () => {
    const m = Uint8Array.from([1, 0, 0, 1]); // 2 × 2
    expect(Array.from(resampleMask(m, 2, 2, 4, 4))).toEqual([1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1]);
  });
  it('half the size takes the pixel nearest each new centre', () => {
    // 4 × 2 → 2 × 1: centres fall on source x 1 and 3, row 1.
    const m = Uint8Array.from([0, 0, 0, 0, 0, 1, 0, 0]);
    expect(Array.from(resampleMask(m, 4, 2, 2, 1))).toEqual([1, 0]);
  });
  it('any non-zero value means masked', () => {
    expect(Array.from(resampleMask(Uint8Array.from([255, 0]), 2, 1, 2, 1))).toEqual([1, 0]);
  });
  it('a mask that is not the size it claims is an error', () => {
    expect(() => resampleMask(new Uint8Array(5), 2, 2, 4, 4)).toThrow(/2 × 2/);
  });
});

describe('regionScan cuts the mask out with the circle', () => {
  it('with no mask and a circle inside the picture, nothing is masked (the ocean as before)', () => {
    expect(regionScan(makeTestPicture(), 240, TEST_CIRCLE).mask).toBeNull();
  });
  it('the mask is cut from the same square as the picture', () => {
    const mask = new Uint8Array(240 * 120);
    for (let y = 0; y < 120; y++) for (let x = 0; x < 120; x++) mask[y * 240 + x] = 1; // the left half
    const { crop, mask: cut } = regionScan(makeTestPicture(), 240, TEST_CIRCLE, mask);
    expect(cut).not.toBeNull();
    expect(cut!.length).toBe(crop.width * crop.height);
    // The square starts at x 65, so picture x 119 is crop x 54 and picture x 120 is crop x 55.
    expect(cut![50 * crop.width + 54]).toBe(1);
    expect(cut![50 * crop.width + 55]).toBe(0);
  });
  it('a square that sticks out of the picture: the part outside is no data, not black', () => {
    const region = { box_px: [-10, 0, 40, 40] as [number, number, number, number], radius_px: 20 };
    const { crop, shape, mask } = regionScan(flat(240, 120, [0, 255, 0]), 240, region);
    expect(mask).not.toBeNull();
    expect(mask![20 * 40 + 9]).toBe(1); // picture x -1
    expect(mask![20 * 40 + 10]).toBe(0); // picture x 0
    const s = buildScanScore(crop, shape, { mask });
    expect(s.reads[60 * 12 + 11]).toBe(0); // due west at the rim: outside the picture
    expect(s.reads[0 * 12 + 11]).toBe(16); // due east at the rim: inside
  });
});
