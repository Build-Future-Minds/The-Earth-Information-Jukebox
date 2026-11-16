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
import { CHOICE_TAGS, scanChoicesFor, type ChoicePicture } from './scanChoices';
import { AEROSOLS_SCAN, IMERG_SCAN, OCEAN_SCAN, PRACTICE_SCAN } from '../data/sources';
import { explainBand, explainChime, explainRoot, placeOf, whyBand, whyColumn, type WhyContext } from './scanWhy';

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
    expect(text).toContain('100% of the colour drawn there is on the red side of yellow (half or more), so the note is played on the marimba, an octave above the held note: G4');
  });

  it('the green dot: column 81, band 9, bells E6. No colour is on the red side of yellow', () => {
    const why = whyBand(score, 81, 8, plain);
    expect(why.chime).toMatchObject({ status: 'struck', name: 'E6', midi: 88, instrument: 'bells', warmShare: 0 });
    expect(explainChime(why)).toContain('None of the colour drawn there is on the red side of yellow, so the note is played on the bells');
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

// Every picture's own list of fixed choices. The rain rule is null only when its mask file is
// missing, which would be a broken checkout.
const PICTURE_LISTS: ChoicePicture[] = [
  { label: 'Ocean', scan: OCEAN_SCAN },
  { label: 'Aerosols', scan: AEROSOLS_SCAN },
  { label: 'Rain', scan: IMERG_SCAN! },
  { label: 'Practice', scan: PRACTICE_SCAN },
];

describe('the fixed choices, for each picture', () => {
  it('the rain picture has its rule (its mask file is in data/imerg/)', () => {
    expect(IMERG_SCAN).not.toBeNull();
  });

  for (const picture of PICTURE_LISTS) {
    describe(picture.label, () => {
      const choices = scanChoicesFor(picture);

      it('every choice has a reason, a source or a measurement, and a tag', () => {
        const ids = new Set<string>();
        for (const c of choices) {
          expect(ids.has(c.id), `${c.id} is listed twice`).toBe(false);
          ids.add(c.id);
          for (const field of ['name', 'what', 'why', 'evidence'] as const) expect(c[field].trim().length, `${c.id}.${field}`).toBeGreaterThan(20 > c[field].length ? 3 : 10);
          expect(CHOICE_TAGS).toContain(c.tag);
          expect(['rule', 'decoration']).toContain(c.kind);
        }
      });

      it('data and decoration are listed apart, and both exist', () => {
        const decoration = choices.filter((c) => c.kind === 'decoration').map((c) => c.id);
        expect(choices.some((c) => c.kind === 'rule')).toBe(true);
        // The picture cannot change a decoration: these are the ones the spec names as decoration.
        expect(decoration).toEqual(expect.arrayContaining(['scale', 'bar-tones', 'low-note', 'pan', 'scan-sound']));
      });

      it('an unverified choice says what is missing', () => {
        const unverified = choices.filter((c) => c.tag === 'Unverified');
        expect(unverified.length).toBeGreaterThan(0);
        for (const c of unverified) expect(c.evidence.toLowerCase()).toMatch(/unverified|no source|not been/);
      });

      it("the numbers in a choice are this picture's own: its rule's settings", () => {
        const text = (id: string) => choices.find((c) => c.id === id)!.what;
        expect(text('chime-rule')).toContain(String(CHIME_RULE.minLevel));
        expect(text('full-level')).toContain(String(picture.scan.full.line));
        expect(text('full-level')).toContain(String(picture.scan.full.radar));
        expect(text('floor')).toContain(`${Number((picture.scan.floor * 255).toFixed(2))} of 255`);
        expect(text('sweep-time')).toContain(`${LINE_GRID.seconds} s`);
        expect(text('low-note')).toContain('C2, A1, F2, G2');
        expect(text('pitch-spacing')).toContain('C3 G3 C4 E4 G4 A4 C5 D5 E5 G5 A5 C6');
        expect(text('instrument-switch')).toContain(picture.scan.instruments.warm);
        expect(text('instrument-switch')).toContain(picture.scan.instruments.cool);
      });

      it('it never names another picture: numbers are never compared between pictures', () => {
        const others = PICTURE_LISTS.filter((o) => o.label !== picture.label && o.label !== 'Practice').map((o) => o.label.toLowerCase());
        const svs = { Ocean: '3912', Aerosols: '5669', Rain: '4285', Practice: '' } as Record<string, string>;
        const words = choices.map((c) => `${c.what} ${c.why} ${c.evidence}`).join(' ').toLowerCase();
        for (const other of others) {
          // "ocean" may only appear as the Ocean choir sound's name or, for practice, as the settings it borrows.
          const stripped = words.replace(/ocean choir/g, '').replace(/the ocean picture's settings/g, '');
          expect(stripped, `${picture.label} mentions ${other}`).not.toMatch(new RegExp(`\\b${other}\\b`));
        }
        for (const [label, number] of Object.entries(svs)) if (label !== picture.label && number) expect(words).not.toContain(number);
      });
    });
  }

  it('the ocean keeps the numbers it was built with', () => {
    const text = (id: string) => scanChoicesFor(PICTURE_LISTS[0]).find((c) => c.id === id)!;
    expect(text('floor').what).toContain('12 of 255');
    expect(text('full-level').what).toContain(String(LINE_GRID.fullStrength));
    expect(text('full-level').what).toContain(String(RADAR_GRID.fullStrength));
    expect(text('chime-rule').evidence).toContain('44 of 112');
    expect(text('instrument-switch').evidence).toContain('74.4%');
  });

  it('only the rain picture has a mask entry and the third instrument\'s tones', () => {
    for (const p of PICTURE_LISTS) {
      const ids = scanChoicesFor(p).map((c) => c.id);
      expect(ids.includes('mask')).toBe(p.label === 'Rain');
      expect(ids.includes('harp-tones')).toBe(p.label === 'Rain');
    }
  });

  it('a circle with no peak says so, instead of "0 of 0"', () => {
    const aerosols = scanChoicesFor(PICTURE_LISTS[1]).find((c) => c.id === 'chime-rule')!;
    expect(aerosols.evidence).toContain('no peak reaches the chime level');
    expect(aerosols.evidence).not.toContain('0 of 0');
  });
});

describe('a cell with no data explains itself, and is never called a zero (TEST INPUT)', () => {
  // The three-dot picture with its left half never read.
  const mask = new Uint8Array(240 * 120);
  for (let y = 0; y < 120; y++) for (let x = 0; x < 120; x++) mask[y * 240 + x] = 1;
  const score = buildScanScore(makeTestPicture(), { kind: 'line' }, { mask });
  const ctx: WhyContext = { ...plain, picture: { instruments: { warm: 'heavy rain', cool: 'light rain' }, noData: 'land, which here is a photo' } };

  it('the red dot is masked: no note, and the sentence says no data, in this picture\'s words', () => {
    const why = whyBand(score, 41, 1, ctx);
    expect(why.reads).toBe(0);
    expect(why.chime).toMatchObject({ status: 'none', reason: 'no data' });
    const text = explainBand(why);
    expect(text).toContain('The line read nothing there');
    expect(text).toContain('in this picture, land, which here is a photo');
    expect(text).toContain('This is not a zero');
    expect(text).not.toContain('level is');
  });

  it('the low note counts only the bands that read something', () => {
    const half = new Uint8Array(240 * 120);
    for (let y = 0; y < 60; y++) for (let x = 0; x < 240; x++) half[y * 240 + x] = 1; // the top six bands
    const s = buildScanScore(makeTestPicture(), { kind: 'line' }, { mask: half });
    const column = whyColumn(s, 201, plain);
    expect(column.root.bandsWithData).toBe(6);
    expect(explainRoot(column.root, column.seconds, 12)).toContain('the mean level of the 6 bands that read something (the other 6 have no data)');
    const none = whyColumn(score, 10, plain);
    expect(explainRoot(none.root, none.seconds, 12)).toContain('none of the 12 bands read anything here');
  });

  it('a struck note says what its instrument stands for in this picture', () => {
    const why = whyBand(score, 201, 5, ctx); // the blue dot, in the half that is read
    expect(why.chime).toMatchObject({ status: 'struck', instrument: 'bells' });
    expect(explainChime(why)).toContain('In this picture the bells stands for light rain.');
  });

  it('with a third instrument the blue dot names it and gives all three shares', () => {
    const three = buildScanScore(makeTestPicture(), { kind: 'line' }, { blueClass: true });
    const why = whyBand(three, 201, 5, { geometry: 'plain', names: { ...names, blue: 'harp' }, picture: { instruments: { warm: 'w', cool: 'c', blue: 'snow' } } });
    expect(why.chime).toMatchObject({ status: 'struck', instrument: 'harp', colour: 'blue' });
    const text = explainChime(why);
    expect(text).toContain('Of the colour drawn there, 0% is on the red side of yellow, 100% on the blue side and 0% neither, and the largest share wins, so the note is played on the harp');
    expect(text).toContain('In this picture the harp stands for snow.');
  });

  it('the floor in a sentence is the picture\'s own floor', () => {
    const navy = buildScanScore(makeTestPicture(), { kind: 'line' }, { floor: 48 / 255 });
    expect(explainBand(whyBand(navy, 120, 5, plain))).toContain(`− ${(48 / 255).toFixed(3)})`);
  });
});
