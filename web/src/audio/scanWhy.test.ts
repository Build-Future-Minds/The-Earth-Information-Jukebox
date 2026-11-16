// The scan's "why", checked on made-up pictures with known answers (TEST INPUTS, not NASA data).
// Each test builds a picture where the right answer can be worked out by hand, then compares.
import { describe, expect, it } from 'vitest';
import {
  CHIME_RULE,
  LINE_GRID,
  RADAR_GRID,
  ROOT_STEP_SECONDS,
  STRENGTH_FLOOR,
  TEST_CIRCLE,
  buildScanScore,
  columnMean,
  findChimes,
  findChimesDetailed,
  makeTestPicture,
  regionScan,
  type Pixels,
  type ScanScore,
} from './scanScore';
import { CHOICE_TAGS, SCAN_CHOICES } from './scanChoices';
import {
  chimeSummary,
  chosenBand,
  explainBand,
  explainChime,
  explainPick,
  explainRoot,
  heldSummary,
  nearestStruck,
  placeOf,
  whyBand,
  whyColumn,
  type WhyContext,
} from './scanWhy';

const names = { held: 'choir', warm: 'marimba', cool: 'bells' };
const plain: WhyContext = { geometry: 'plain', names };
const world: WhyContext = { geometry: 'world', names };

/** A black picture 240 by 120: one pixel column is one scan column, ten pixel rows are one band. */
function black(): Pixels {
  const data = new Uint8ClampedArray(240 * 120 * 4);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return { data, width: 240, height: 120 };
}
/** Paint a rectangle of one colour. Rows count from the top of the picture. */
function paint(p: Pixels, x: number, y: number, w: number, h: number, rgb: [number, number, number]): Pixels {
  const data = p.data as Uint8ClampedArray;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) data.set(rgb, (yy * p.width + xx) * 4);
  return p;
}
const cellOf = (s: ScanScore, column: number, band: number) => column * s.grid.bands + band;

describe('where a cell is, in words', () => {
  it('on a world map a column is 1.5° of longitude and a band 15° of latitude', () => {
    const score = buildScanScore(makeTestPicture(), { kind: 'line' });
    expect(placeOf(score, 0, 11, 'world').text).toBe('180° to 178.5° W, 75° N to 90° N');
    expect(placeOf(score, 120, 6, 'world').text).toBe('0° to 1.5° E, 0° to 15° N');
    expect(placeOf(score, 239, 0, 'world').text).toBe('178.5° E to 180°, 90° S to 75° S');
  });

  it("a band's share of the globe's surface is (sin north − sin south) ÷ 2: 12.9% at the equator, 1.7% at a pole, 100% in all", () => {
    const score = buildScanScore(makeTestPicture(), { kind: 'line' });
    const share = (band: number) => placeOf(score, 0, band, 'world').groundShare!;
    expect(share(6)).toBeCloseTo((Math.sin(Math.PI / 12)) / 2, 10);
    expect(share(6)).toBeCloseTo(0.1294, 4);
    expect(share(11)).toBeCloseTo(0.017, 3);
    let total = 0;
    for (let band = 0; band < 12; band++) total += share(band);
    expect(total).toBeCloseTo(1, 10);
  });

  it('on any other picture it is a share of the way across and up, and no ground share is claimed', () => {
    const score = buildScanScore(makeTestPicture(), { kind: 'line' });
    const place = placeOf(score, 120, 6, 'plain');
    expect(place.text).toBe('50% to 50.4% of the way across, 50% to 58.3% of the way up');
    expect(place.groundShare).toBeNull();
  });

  it('on the radar it is a bearing and a distance from the centre', () => {
    const { crop, shape } = regionScan(makeTestPicture(), 240, TEST_CIRCLE);
    const score = buildScanScore(crop, shape);
    expect(placeOf(score, 48, 9, 'plain').text).toBe('144° to 147° round (0° is east, turning anticlockwise), 75% to 83% of the way out from the centre');
    expect(placeOf(score, 48, 9, 'world').groundShare).toBeNull();
  });
});

describe('the three-dot picture: each dot explains itself', () => {
  const score = buildScanScore(makeTestPicture(), { kind: 'line' });

  it('the red dot: column 41, band 2, a marimba G4 struck at full strength', () => {
    const why = whyBand(score, 41, 1, plain);
    expect(why.chime).toMatchObject({ status: 'struck', name: 'G4', midi: 67, instrument: 'marimba', smoothed: 1, velocity: 1 });
    expect(why.reads).toBe(10);
    expect(why.mean).toBeCloseTo(1, 6);
    expect(why.level).toBe(1);
    expect(why.held.name).toBe('G3');
    expect(why.seconds).toBeCloseTo(41 / 8, 10);
    const text = explainBand(why);
    expect(text).toContain('Band 2, 17.1% to 17.5% of the way across, 8.3% to 16.7% of the way up');
    expect(text).toContain('5.1 s into the sweep');
    expect(text).toContain('read 10 pixels');
    expect(text).toContain(`mean colour strength is 1.000, so the level is (1.000 − ${STRENGTH_FLOOR.toFixed(3)}) ÷ (0.50 − ${STRENGTH_FLOOR.toFixed(3)}) = 1.00`);
    expect(text).toContain('The held note G3 sounds at 100% of its full loudness');
    expect(text).toContain('100% of its colour is on the red side of yellow (half or more), so the note is played on the marimba, an octave above the held note: G4');
  });

  it('the green dot: column 81, band 9, bells E6. No colour is on the red side of yellow', () => {
    const why = whyBand(score, 81, 8, plain);
    expect(why.chime).toMatchObject({ status: 'struck', name: 'E6', midi: 88, instrument: 'bells', warmShare: 0 });
    expect(explainChime(why)).toContain('None of its colour is on the red side of yellow, so the note is played on the bells');
  });

  it('the blue dot: column 201, band 6, bells', () => {
    const why = whyBand(score, 201, 5, world);
    expect(why.chime).toMatchObject({ status: 'struck', instrument: 'bells' });
    expect(why.place).toBe('121.5° E to 123° E, 15° S to 0°');
  });

  it("the sentence quotes the score's own level, whatever it is", () => {
    for (const [column, band] of [[41, 1], [81, 8], [201, 5], [44, 1]] as const) {
      const why = whyBand(score, column, band, plain);
      expect(explainBand(why)).toContain(`= ${score.levels[cellOf(score, column, band)].toFixed(2)}, kept between 0 and 1`);
    }
  });

  it('the grey block is silent: no held note, and the chime says there was no colour', () => {
    const why = whyBand(score, 120, 5, plain); // inside the grey block, no dot
    expect(why.level).toBe(0);
    expect(why.chime).toMatchObject({ status: 'none', reason: 'no colour' });
    const text = explainBand(why);
    expect(text).toContain('The held note A4 is silent here.');
    expect(text).toContain('has no colour to speak of');
  });

  it('inside a dot, after its first column, a cell is loud but not a peak', () => {
    const why = whyBand(score, 43, 1, plain);
    expect(why.level).toBe(1);
    expect(why.chime).toMatchObject({ status: 'none', reason: 'not a peak' });
    expect(explainChime(why)).toContain('not a peak');
  });
});

describe('a peak the rule leaves out says why', () => {
  it('two peaks in one band, 3 columns apart: the stronger is struck, the other gives way', () => {
    const p = black();
    paint(p, 100, 50, 1, 10, [128, 0, 0]); // strength 0.502: full level
    paint(p, 103, 50, 1, 10, [90, 0, 0]); // strength 0.353: level 0.675
    const score = buildScanScore(p, { kind: 'line' });
    expect(score.chimes.map((c) => [c.column, c.band])).toEqual([[100, 6]]);
    expect(score.dropped).toEqual([{ column: 103, band: 6, level: score.dropped[0].level, reason: 'spacing', by: { column: 100, band: 6 } }]);
    const why = whyBand(score, 103, 6, plain);
    expect(why.chime).toMatchObject({ status: 'left out', reason: 'spacing', by: { column: 100, band: 6 } });
    const text = explainChime(why);
    expect(text).toContain('a stronger one in the same band, 3 columns earlier, is closer than 6 columns');
    expect(explainChime(whyBand(score, 100, 6, plain))).toContain('A note is struck here');
  });

  it('two peaks in one column, different bands: the stronger is struck, the other gives way', () => {
    const p = black();
    paint(p, 100, 50, 1, 10, [128, 0, 0]); // band 7 in the sentence (index 6)
    paint(p, 100, 80, 1, 10, [90, 0, 0]); // band index 3
    const score = buildScanScore(p, { kind: 'line' });
    expect(score.chimes.map((c) => [c.column, c.band])).toEqual([[100, 6]]);
    expect(score.dropped).toMatchObject([{ column: 100, band: 3, reason: 'column', by: { column: 100, band: 6 } }]);
    const text = explainChime(whyBand(score, 100, 3, plain));
    expect(text).toContain('a stronger peak in band 7 starts in the same column, and a column starts at most 1 note');
  });

  it('a faint dot is below the level a peak needs', () => {
    const p = black();
    paint(p, 100, 50, 1, 10, [45, 0, 0]); // strength 0.176: level 0.285, smoothed 0.14
    const score = buildScanScore(p, { kind: 'line' });
    expect(score.chimes).toEqual([]);
    const why = whyBand(score, 100, 6, plain);
    expect(why.chime).toMatchObject({ status: 'none', reason: 'below level' });
    expect(explainChime(why)).toContain('below the 0.30 a peak needs');
  });

  it('the radar leaves peaks out too, and a peak at the seam is judged against the other side of the circle', () => {
    const { crop, shape } = regionScan(makeTestPicture(), 240, TEST_CIRCLE);
    const score = buildScanScore(crop, shape);
    const { chimes, dropped } = findChimesDetailed(score.levels, score.warmShare, score.grid, true);
    expect(chimes).toEqual(score.chimes);
    expect(dropped).toEqual(score.dropped);
  });
});

describe('findChimesDetailed gives the same chimes as findChimes', () => {
  const circle = regionScan(makeTestPicture(), 240, TEST_CIRCLE);
  const cases: [string, ScanScore][] = [
    ['the three-dot picture, map sweep', buildScanScore(makeTestPicture(), { kind: 'line' })],
    ['the three-dot picture, radar', buildScanScore(circle.crop, circle.shape)],
    ['by brightness', buildScanScore(makeTestPicture(), { kind: 'line' }, { measure: 'brightness' })],
    ['a looser rule', buildScanScore(makeTestPicture(), { kind: 'line' }, { rule: { ...CHIME_RULE, minGap: 0, perColumn: 9 } })],
  ];
  for (const [name, score] of cases) {
    it(name, () => {
      const rule = name === 'a looser rule' ? { ...CHIME_RULE, minGap: 0, perColumn: 9 } : CHIME_RULE;
      expect(findChimes(score.levels, score.warmShare, score.grid, score.shape === 'radar', rule)).toEqual(score.chimes);
    });
  }
  it('every left-out peak is in a column and band that has no chime of its own', () => {
    const p = black();
    for (let k = 0; k < 4; k++) paint(p, 60 + 3 * k, 50, 1, 10, [128, 0, 0]); // peaks at 60, 63, 66, 69: 63 and 69 are too close to a stronger one
    expect(buildScanScore(p, { kind: 'line' }).chimes.map((c) => c.column)).toEqual([60, 66]);
    const score = buildScanScore(p, { kind: 'line' });
    expect(score.dropped.length).toBeGreaterThan(0);
    for (const d of score.dropped) expect(score.chimes.some((c) => c.column === d.column && c.band === d.band)).toBe(false);
  });
});

describe('the whole column under the line', () => {
  const score = buildScanScore(makeTestPicture(), { kind: 'line' });

  it('has a row for every band, lowest first, and the low note', () => {
    const column = whyColumn(score, 41, plain);
    expect(column.bands).toHaveLength(12);
    expect(column.bands.map((b) => b.band)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(column.root.name).toBe('A1'); // 41 columns is 5.1 s: the second step, VIm
    expect(column.root.loudness).toBe(columnMean(score, 41));
    expect(column.bands[1].chime.status).toBe('struck');
  });

  it('keeps a column outside the picture inside it', () => {
    expect(whyColumn(score, -5, plain).column).toBe(0);
    expect(whyColumn(score, 9999, plain).column).toBe(LINE_GRID.columns - 1);
    expect(whyBand(score, 41, 99, plain).band).toBe(11);
  });

  it('the low note says it is a timetable, and what the picture does set', () => {
    const column = whyColumn(score, 41, plain);
    const text = explainRoot(column.root, column.seconds, 12);
    expect(text).toContain(`Low note ${column.root.name}`);
    expect(text).toContain('fixed by a timetable and not by the picture');
    expect(text).toContain(`one step every ${ROOT_STEP_SECONDS} s`);
    expect(text).toContain('I, VIm, IV, V');
    expect(text).toContain(`the mean level of the 12 bands, ${(100 * columnMean(score, 41)).toFixed(0).replace(/\.0+$/, '')}%`);
  });

  it('the radar column is judged on the radar grid', () => {
    const circle = regionScan(makeTestPicture(), 240, TEST_CIRCLE);
    const radar = buildScanScore(circle.crop, circle.shape);
    const why = whyBand(radar, 48, 9, plain);
    expect(why.chime).toMatchObject({ status: 'struck', instrument: 'bells', name: 'G6' });
    expect(why.seconds).toBeCloseTo((48 * RADAR_GRID.seconds) / RADAR_GRID.columns, 10);
    expect(explainBand(why)).toContain('sample points');
  });
});

describe('the fixed choices', () => {
  it('every choice has a reason, a source or a measurement, and a tag', () => {
    const ids = new Set<string>();
    for (const c of SCAN_CHOICES) {
      expect(ids.has(c.id), `${c.id} is listed twice`).toBe(false);
      ids.add(c.id);
      for (const field of ['name', 'what', 'why', 'evidence'] as const) expect(c[field].trim().length, `${c.id}.${field}`).toBeGreaterThan(20 > c[field].length ? 3 : 10);
      expect(CHOICE_TAGS).toContain(c.tag);
      expect(['rule', 'decoration']).toContain(c.kind);
    }
  });

  it('data and decoration are listed apart, and both exist', () => {
    expect(SCAN_CHOICES.some((c) => c.kind === 'rule')).toBe(true);
    expect(SCAN_CHOICES.some((c) => c.kind === 'decoration')).toBe(true);
    // The picture cannot change a decoration: these are the ones the spec names as decoration.
    const decoration = SCAN_CHOICES.filter((c) => c.kind === 'decoration').map((c) => c.id);
    expect(decoration).toEqual(expect.arrayContaining(['scale', 'bar-tones', 'low-note', 'pan', 'scan-sound']));
  });

  it('an unverified choice says what is missing', () => {
    const unverified = SCAN_CHOICES.filter((c) => c.tag === 'Unverified');
    expect(unverified.length).toBeGreaterThan(0);
    for (const c of unverified) expect(c.evidence.toLowerCase()).toMatch(/unverified|no source|not been/);
  });

  it("the numbers in a choice are the rule's own numbers", () => {
    const text = (id: string) => SCAN_CHOICES.find((c) => c.id === id)!.what;
    expect(text('chime-rule')).toContain(String(CHIME_RULE.minLevel));
    expect(text('chime-rule')).toContain(String(CHIME_RULE.minGap));
    expect(text('full-level')).toContain(String(LINE_GRID.fullStrength));
    expect(text('full-level')).toContain(String(RADAR_GRID.fullStrength));
    expect(text('sweep-time')).toContain(`${LINE_GRID.seconds} s`);
    expect(text('floor')).toContain('12 of 255');
    expect(text('low-note')).toContain('C2, A1, F2, G2');
    expect(text('pitch-spacing')).toContain('C3 G3 C4 E4 G4 A4 C5 D5 E5 G5 A5 C6');
  });
});

describe('a place picked on the picture, in a few words', () => {
  const score = buildScanScore(makeTestPicture(), { kind: 'line' });

  it("the table's words for the held and struck note", () => {
    expect(heldSummary(whyBand(score, 41, 1, plain))).toBe('G3 at 100%');
    expect(chimeSummary(whyBand(score, 41, 1, plain).chime)).toBe('marimba G4');
    expect(heldSummary(whyBand(score, 120, 5, plain))).toBe('A4, silent');
    expect(chimeSummary(whyBand(score, 120, 5, plain).chime)).toBe('none: no colour');
    expect(chimeSummary(whyBand(score, 44, 1, plain).chime)).toBe('none: not a peak');
  });

  it('the band explained: the one picked, else the loudest struck note, else the loudest, else the lowest', () => {
    const red = whyColumn(score, 41, plain).bands;
    expect(chosenBand(red, null).band).toBe(1); // the red dot's struck note
    expect(chosenBand(red, 7).band).toBe(7); // picked
    expect(chosenBand(whyColumn(score, 44, plain).bands, null).band).toBe(1); // loud, nothing struck
    expect(chosenBand(whyColumn(score, 0, plain).bands, null).band).toBe(0); // all silent
  });

  it('a struck note is named as it is', () => {
    expect(explainPick(whyBand(score, 41, 1, plain), score, plain)).toBe('Column 42 of 240, band 2. Held note: G3 at 100%. Struck note: marimba G4.');
  });

  it('the middle of the red dot names the note the dot made, 3 columns earlier', () => {
    expect(nearestStruck(score, 44, 1)).toEqual({ chime: score.chimes.find((c) => c.column === 41)!, offset: -3 });
    expect(explainPick(whyBand(score, 44, 1, plain), score, plain)).toBe(
      'Column 45 of 240, band 2. Held note: G3 at 100%. Struck note: none: not a peak. ' +
        'Nearest struck note in this band: column 42, 3 columns earlier (0.4 s at normal speed): marimba G4.',
    );
  });

  it('a band with no struck note says so', () => {
    expect(nearestStruck(score, 0, 11)).toBeNull();
    expect(explainPick(whyBand(score, 0, 11, plain), score, plain)).toBe(
      'Column 1 of 240, band 12. Held note: C6, silent. Struck note: none: no colour. No note is struck in this band in this sweep.',
    );
  });

  it('a peak left out names the note that took its place', () => {
    const p = black();
    paint(p, 100, 50, 1, 10, [128, 0, 0]);
    paint(p, 103, 50, 1, 10, [90, 0, 0]);
    const s = buildScanScore(p, { kind: 'line' });
    expect(explainPick(whyBand(s, 103, 6, plain), s, plain)).toBe(
      'Column 104 of 240, band 7. Held note: C5 at 68%. Struck note: peak, left out: too close to a stronger one. ' +
        'Nearest struck note in this band: column 101, 3 columns earlier (0.4 s at normal speed): marimba C6.',
    );
  });

  it('on the radar the nearest note is found round the circle, across the seam', () => {
    const { crop, shape } = regionScan(makeTestPicture(), 240, TEST_CIRCLE);
    const radar = buildScanScore(crop, shape);
    const green = radar.chimes.find((c) => c.column === 48 && c.band === 9)!;
    expect(green).toBeDefined();
    expect(nearestStruck(radar, 40, 9)).toEqual({ chime: green, offset: 8 });
    expect(nearestStruck(radar, 110, 9)).toEqual({ chime: green, offset: 58 }); // 58 later round the seam, not 62 earlier
    expect(nearestStruck(radar, 100, 9)).toEqual({ chime: green, offset: -52 });
  });
});
