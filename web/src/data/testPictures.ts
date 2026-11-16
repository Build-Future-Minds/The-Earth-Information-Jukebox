// TEST INPUT (MOCK): made-up pictures, not NASA data, for the browser tests of each picture's scan
// rule. Practice data has no NASA still, so the dataset `practice-pictures` (VITE_DATASET) shows
// these in place of the rain and aerosol stills, read with the REAL rain and aerosol rules
// (data/sources.ts). Each has a known answer, worked out here by hand.
//
// Both are 240 × 120, like the ocean's test picture (audio/scanScore.ts, makeTestPicture), so one
// pixel column is one map-sweep column and ten rows are one band. A dot 8 wide and 10 tall fills
// whole cells, and the chime rule strikes it one column after its left edge.
import type { Pixels } from '../audio/scanScore';

const WIDTH = 240;
const HEIGHT = 120;

function picture(ground: [number, number, number], dots: [number, number, number, number, [number, number, number]][]): Pixels {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let i = 0; i < data.length; i += 4) data.set([...ground, 255], i);
  for (const [x0, y0, w, h, rgb] of dots) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) data.set([...rgb, 255], (y * WIDTH + x) * 4);
  }
  return { data, width: WIDTH, height: HEIGHT };
}

/** Where the rain test picture's "land" is: x 100–139, y 20–99 (bands 2 to 9 of columns 100 to 139). */
export const RAIN_TEST_LAND = { x: 100, y: 20, w: 40, h: 80 };

/**
 * TEST INPUT: the rain picture's look. Navy ground, RGB (2, 5, 20): the commonest colour of the real
 * rain still, as `npm run measure` found it; under the rain rule's floor, so it is silent. A desert-
 * coloured block that the mask covers, so it is never read (if it were, it would sound). Three dots
 * in the colours of NASA's bars (as the measurement read them):
 *   green rain (0, 179, 48)    x 40,  band 1  → column 41, the cool instrument (bells)
 *   orange rain (255, 147, 0)  x 80,  band 8  → column 81, the warm instrument (marimba)
 *   snow (82, 93, 255)         x 200, band 5  → column 201, the third instrument (harp)
 */
export function makeRainTestPicture(): Pixels {
  return picture([2, 5, 20], [
    [RAIN_TEST_LAND.x, RAIN_TEST_LAND.y, RAIN_TEST_LAND.w, RAIN_TEST_LAND.h, [200, 150, 90]],
    [40, 100, 8, 10, [0, 179, 48]],
    [80, 30, 8, 10, [255, 147, 0]],
    [200, 60, 8, 10, [82, 93, 255]],
  ]);
}

/** TEST INPUT: the rain test picture's mask. 1 on the block, which stands for land (a photo). */
export function makeRainTestMask(): Uint8Array {
  const mask = new Uint8Array(WIDTH * HEIGHT);
  const { x, y, w, h } = RAIN_TEST_LAND;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) mask[yy * WIDTH + xx] = 1;
  return mask;
}

/**
 * TEST INPUT: the aerosol picture's look. Grey-green ground, RGB (62, 69, 61): the commonest colour
 * of the real aerosol still (its land); under the aerosol rule's floor, so it is silent. Four dots in
 * the colours of NASA's aerosol bar (as the measurement read them):
 *   black carbon (210, 94, 69)    x 40,  band 1  → column 41, the warm instrument
 *   dust (193, 154, 220)          x 80,  band 8  → column 81, the cool instrument
 *   sulfate (83, 220, 52)         x 200, band 5  → column 201, the cool instrument
 *   sea salt (133, 170, 169)      x 150, band 3  → held note only: too faint for a struck note
 */
export function makeAerosolTestPicture(): Pixels {
  return picture([62, 69, 61], [
    [40, 100, 8, 10, [210, 94, 69]],
    [80, 30, 8, 10, [193, 154, 220]],
    [200, 60, 8, 10, [83, 220, 52]],
    [150, 80, 8, 10, [133, 170, 169]],
  ]);
}
