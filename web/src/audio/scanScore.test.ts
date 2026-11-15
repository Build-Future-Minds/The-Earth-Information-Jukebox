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
  isWarm,
  levelOf,
  makeTestPicture,
  radarPoint,
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
  it('every root is a note of the scale, so it never clashes with the held notes', () => {
    for (const root of ROOT_NOTES) expect([0, 2, 4, 7, 9, 5]).toContain(root % 12); // F is the one note outside the five
    expect(ROOT_NOTES.filter((n) => n % 12 === 5)).toHaveLength(1);
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
