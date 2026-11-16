// A click on the scan's picture names a cell of the score. These tests check that the cell named is
// the one the scan really read there, against the rule itself (buildScanScore, radarPoint, regionScan),
// on the TEST INPUT picture (not NASA data) and on the size and circles of the ocean picture.
import { describe, expect, it } from 'vitest';
import oceanScene from '../../../data/scene.json';
import {
  LINE_GRID,
  RADAR_GRID,
  RADAR_SAMPLES,
  TEST_CIRCLE,
  buildScanScore,
  radarPoint,
  regionScan,
  type Pixels,
} from './scanScore';
import { cellAt, cellCentre, cellOutline, cellTicks, lineCellBounds, type ScanPlacement } from './scanPick';

/** A black picture of any size: what is in it does not matter here, only where its pixels are counted. */
function blank(width: number, height: number): Pixels {
  return { data: new Uint8ClampedArray(width * height * 4), width, height };
}
const line = (frameW: number, frameH: number, pixelW = frameW, pixelH = frameH): Extract<ScanPlacement, { kind: 'line' }> => ({
  kind: 'line',
  frame: { width: frameW, height: frameH },
  pixels: { width: pixelW, height: pixelH },
});
const radar = (frame: { width: number; height: number }, region: { center_px: [number, number]; radius_px: number }): ScanPlacement => ({
  kind: 'radar',
  frame,
  center: region.center_px,
  radius: region.radius_px,
});

const OCEAN_FRAME = { width: oceanScene.frames.width, height: oceanScene.frames.height };
const OCEAN_REGIONS = oceanScene.regions.map((r) => ({
  id: r.id,
  center_px: r.center_px as [number, number],
  radius_px: r.radius_px,
  box_px: r.box_px as [number, number, number, number],
}));
// The test picture is 240 by 120; the ocean frames and still are 2048 by 1024. The third case is a
// still smaller than its frame whose pixel edges do not line up with the 240 columns.
const LINE_CASES: [string, Extract<ScanPlacement, { kind: 'line' }>][] = [
  ['the 240 × 120 test picture', line(240, 120)],
  ['the 2048 × 1024 ocean frame', line(2048, 1024)],
  ['a 1000 × 500 still drawn in a 2048 × 1024 frame', line(2048, 1024, 1000, 500)],
];

describe('map sweep: which cell is under a point', () => {
  for (const [name, placement] of LINE_CASES) {
    it(`every cell's centre gives that cell back (${name})`, () => {
      let wrong = 0;
      for (let column = 0; column < LINE_GRID.columns; column++) {
        for (let band = 0; band < LINE_GRID.bands; band++) {
          const [x, y] = cellCentre({ column, band }, LINE_GRID, placement);
          const cell = cellAt(x, y, LINE_GRID, placement);
          if (cell?.column !== column || cell?.band !== band) wrong++;
        }
      }
      expect(wrong).toBe(0);
    });

    it(`the pixel under the point is one the cell read: counts per cell equal the score's (${name})`, () => {
      const { width: w, height: h } = placement.pixels;
      const { width: W, height: H } = placement.frame;
      const score = buildScanScore(blank(w, h), { kind: 'line' });
      const counts = new Uint32Array(LINE_GRID.columns * LINE_GRID.bands);
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          // The centre of the pixel, in frame units: where a pointer over that pixel would be.
          const cell = cellAt(((px + 0.5) * W) / w, ((py + 0.5) * H) / h, LINE_GRID, placement)!;
          counts[cell.column * LINE_GRID.bands + cell.band]++;
        }
      }
      expect(Array.from(counts)).toEqual(Array.from(score.reads));
    });

    it(`anywhere inside one pixel gives the same cell, the one that pixel is counted in (${name})`, () => {
      // Near both edges of every pixel column and every pixel row: a pointer is rarely on a pixel's centre.
      const { width: w, height: h } = placement.pixels;
      const kx = placement.frame.width / w;
      const ky = placement.frame.height / h;
      let wrong = 0;
      for (let px = 0; px < w; px++) {
        const counted = Math.min(LINE_GRID.columns - 1, Math.floor(((px + 0.5) * LINE_GRID.columns) / w)); // buildScanScore's column
        for (const f of [0.01, 0.5, 0.99]) if (cellAt((px + f) * kx, 0.5 * ky, LINE_GRID, placement)?.column !== counted) wrong++;
      }
      for (let py = 0; py < h; py++) {
        const counted = Math.min(LINE_GRID.bands - 1, Math.floor(((h - (py + 0.5)) * LINE_GRID.bands) / h)); // buildScanScore's band
        for (const f of [0.01, 0.5, 0.99]) if (cellAt(0.5 * kx, (py + f) * ky, LINE_GRID, placement)?.band !== counted) wrong++;
      }
      expect(wrong).toBe(0);
    });

    it(`each cell's outline holds exactly the pixels the cell read (${name})`, () => {
      const score = buildScanScore(blank(placement.pixels.width, placement.pixels.height), { kind: 'line' });
      let wrong = 0;
      for (let column = 0; column < LINE_GRID.columns; column++) {
        for (let band = 0; band < LINE_GRID.bands; band++) {
          const { pixels: b } = lineCellBounds({ column, band }, LINE_GRID, placement);
          if ((b.x1 - b.x0) * (b.y1 - b.y0) !== score.reads[column * LINE_GRID.bands + band]) wrong++;
          // And the pixels inside it are counted in this cell: check its two opposite corners.
          const W = placement.frame.width / placement.pixels.width;
          const H = placement.frame.height / placement.pixels.height;
          const first = cellAt((b.x0 + 0.5) * W, (b.y0 + 0.5) * H, LINE_GRID, placement);
          const last = cellAt((b.x1 - 0.5) * W, (b.y1 - 0.5) * H, LINE_GRID, placement);
          if (first?.column !== column || first?.band !== band || last?.column !== column || last?.band !== band) wrong++;
        }
      }
      expect(wrong).toBe(0);
    });
  }

  it('on the test picture the red dot is at column 41 (0-based), band 1, where its note is struck', () => {
    // The dot covers pixels 40 to 47 across and rows 100 to 109 (makeTestPicture).
    expect(cellAt(41.5, 105, LINE_GRID, line(240, 120))).toEqual({ column: 41, band: 1 });
    expect(cellAt(44.5, 105, LINE_GRID, line(240, 120))).toEqual({ column: 44, band: 1 });
    expect(lineCellBounds({ column: 41, band: 1 }, LINE_GRID, line(240, 120))).toMatchObject({ x0: 41, x1: 42, y0: 100, y1: 110 });
  });

  it('points outside the picture are ignored; its own edges belong to the edge cells', () => {
    const p = line(240, 120);
    for (const [x, y] of [[-0.001, 60], [240.001, 60], [120, -0.001], [120, 120.001], [NaN, 60], [120, NaN], [Infinity, 0]]) {
      expect(cellAt(x, y, LINE_GRID, p)).toBeNull();
    }
    expect(cellAt(0, 120, LINE_GRID, p)).toEqual({ column: 0, band: 0 }); // bottom left corner
    expect(cellAt(240, 0, LINE_GRID, p)).toEqual({ column: 239, band: 11 }); // top right corner
  });

  it('the outline is a closed rectangle path on the cell', () => {
    expect(cellOutline({ column: 41, band: 1 }, LINE_GRID, line(240, 120))).toBe('M41 100H42V110H41Z');
  });
});

describe('radar: which cell is under a point', () => {
  const CIRCLES: [string, { width: number; height: number }, { center_px: [number, number]; radius_px: number; box_px: [number, number, number, number] }][] = [
    ['the TEST circle', { width: 240, height: 120 }, TEST_CIRCLE],
    ...OCEAN_REGIONS.map((r) => [`ocean region ${r.id}`, OCEAN_FRAME, r] as [string, typeof OCEAN_FRAME, typeof r]),
  ];

  for (const [name, frame, circle] of CIRCLES) {
    it(`the circle the radar reads is the circle drawn (${name})`, () => {
      // The app reads the region from a still the size of its frame, so the crop is not scaled.
      const { shape } = regionScan(blank(frame.width, frame.height), frame.width, circle);
      const [x0, y0] = circle.box_px;
      expect([x0 + shape.cx, y0 + shape.cy, shape.r]).toEqual([circle.center_px[0], circle.center_px[1], circle.radius_px]);
    });

    it(`every point the radar read for a cell gives that cell back, and so does its centre (${name})`, () => {
      const placement = radar(frame, circle);
      const { shape } = regionScan(blank(frame.width, frame.height), frame.width, circle);
      const [x0, y0] = circle.box_px;
      let wrong = 0;
      let points = 0;
      for (let column = 0; column < RADAR_GRID.columns; column++) {
        for (let band = 0; band < RADAR_GRID.bands; band++) {
          const centre = cellCentre({ column, band }, RADAR_GRID, placement);
          const back = cellAt(centre[0], centre[1], RADAR_GRID, placement);
          if (back?.column !== column || back?.band !== band) wrong++;
          for (let i = 0; i < RADAR_SAMPLES; i++) {
            for (let j = 0; j < RADAR_SAMPLES; j++) {
              const [px, py] = radarPoint(shape, RADAR_GRID, column, band, i, j);
              const cell = cellAt(x0 + px, y0 + py, RADAR_GRID, placement);
              points++;
              if (cell?.column !== column || cell?.band !== band) wrong++;
            }
          }
        }
      }
      expect(points).toBe(RADAR_GRID.columns * RADAR_GRID.bands * RADAR_SAMPLES * RADAR_SAMPLES);
      expect(wrong).toBe(0);
    });
  }

  const test = radar({ width: 240, height: 120 }, TEST_CIRCLE);
  it('the green dot is at column 48, band 9 (145 degrees round, 80% of the way out)', () => {
    // Inside the green dot (pixels 80 to 87, rows 30 to 39): 145.5° and 43.5 from the centre.
    const [x, y] = cellCentre({ column: 48, band: 9 }, RADAR_GRID, test);
    expect(x).toBeGreaterThanOrEqual(80);
    expect(x).toBeLessThan(88);
    expect(y).toBeGreaterThanOrEqual(30);
    expect(y).toBeLessThan(40);
    expect(cellAt(x, y, RADAR_GRID, test)).toEqual({ column: 48, band: 9 });
  });

  it('outside the circle nothing is picked; the rim is the last band; the seam is column 0 and 119', () => {
    const [cx, cy] = TEST_CIRCLE.center_px;
    const r = TEST_CIRCLE.radius_px;
    expect(cellAt(cx + r + 0.001, cy, RADAR_GRID, test)).toBeNull();
    expect(cellAt(cx - r * 0.75, cy - r * 0.75, RADAR_GRID, test)).toBeNull(); // inside the view's corner, outside the circle
    expect(cellAt(cx + r, cy, RADAR_GRID, test)).toEqual({ column: 0, band: 11 }); // on the rim, due east
    expect(cellAt(cx, cy, RADAR_GRID, test)).toEqual({ column: 0, band: 0 }); // the centre
    expect(cellAt(cx + 30, cy - 0.001, RADAR_GRID, test)?.column).toBe(0); // just above east: the start of the turn
    expect(cellAt(cx + 30, cy + 0.001, RADAR_GRID, test)?.column).toBe(119); // just below east: the end of the turn
    // Just past due north and just past due west (anticlockwise): the first columns of the second and third quarters.
    expect(cellAt(cx - 0.01, cy - 30, RADAR_GRID, test)?.column).toBe(30);
    expect(cellAt(cx - 30, cy + 0.01, RADAR_GRID, test)?.column).toBe(60);
  });

  it('a circle that runs off the picture: the part off the picture is ignored', () => {
    const edge = radar({ width: 240, height: 120 }, { center_px: [10, 60], radius_px: 30 });
    expect(cellAt(-5, 60, RADAR_GRID, edge)).toBeNull();
    expect(cellAt(5, 60.05, RADAR_GRID, edge)).toEqual({ column: 60, band: 2 }); // 0.6° past due west, 5 from the centre
    expect(cellAt(5, 60.5, RADAR_GRID, edge)).toEqual({ column: 61, band: 2 }); // 5.7° past: the next column (3° each)
  });

  it('the outline is the ring sector of the cell; the innermost band is a wedge from the centre', () => {
    expect(cellOutline({ column: 0, band: 0 }, RADAR_GRID, test)).toMatch(/^M120 60L/);
    const sector = cellOutline({ column: 30, band: 11 }, RADAR_GRID, test);
    // From the inner edge out along 90° (due north), round the rim anticlockwise, back in, and round the inner edge.
    expect(sector.startsWith('M120 9.583L120 5A55 55 0 0 0 ')).toBe(true);
    expect(sector).toMatch(/A50\.417 50\.417 0 0 1 120 9\.583Z$/);
  });
});

describe('the ticks point at the cell from outside it', () => {
  const cases: [string, ScanPlacement][] = [
    ['map sweep', line(240, 120)],
    ['radar', radar({ width: 240, height: 120 }, TEST_CIRCLE)],
  ];
  for (const [name, placement] of cases) {
    const grid = placement.kind === 'line' ? LINE_GRID : RADAR_GRID;
    it(`no tick touches the cell it points at (${name})`, () => {
      let wrong = 0;
      for (let column = 0; column < grid.columns; column += 7) {
        for (let band = 0; band < grid.bands; band++) {
          for (const [x1, y1, x2, y2] of cellTicks({ column, band }, grid, placement, 0.8, 3)) {
            for (const t of [0, 0.5, 1]) {
              const at = cellAt(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, grid, placement);
              if (at?.column === column && at?.band === band) wrong++;
            }
          }
        }
      }
      expect(wrong).toBe(0);
    });
  }
});
