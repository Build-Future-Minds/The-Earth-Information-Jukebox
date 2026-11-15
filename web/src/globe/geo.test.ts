import { describe, expect, it } from 'vitest';
import { boxFor, landShare, limits, lonLatToPx, pxToLonLat, regionJson } from './geo';

const W = 2048;
const H = 1024;

describe('globe map maths', () => {
  it('puts 0 degrees at the centre of the frame and matches the approved regions', () => {
    expect(lonLatToPx(0, 0, W, H)).toEqual([1024, 512]);
    expect(lonLatToPx(-132.4, 1.4, W, H)).toEqual([271, 504]); // Equatorial Pacific
    expect(lonLatToPx(149.1, 28.8, W, H)).toEqual([1872, 348]); // Kuroshio
  });

  it('turns pixels back into the same place', () => {
    const [lon, lat] = pxToLonLat(1872, 348, W, H);
    expect(lonLatToPx(lon, lat, W, H)).toEqual([1872, 348]);
  });

  it('gives the bounding square scene schema 0.2 asks for', () => {
    expect(boxFor({ center_px: [271, 504], radius_px: 61 })).toEqual([210, 443, 122, 122]);
  });

  it('keeps a radius-61 circle inside the frame', () => {
    const l = limits(61, W, H);
    const [x0] = lonLatToPx(l.lonMin, 0, W, H);
    const [, y0] = lonLatToPx(0, l.latMax, W, H);
    expect(x0 - 61).toBeGreaterThanOrEqual(0);
    expect(y0 - 61).toBeGreaterThanOrEqual(0);
  });

  it('counts grey land inside the circle only (TEST INPUT pixels)', () => {
    const w = 20;
    const h = 20;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const grey = x < 10; // left half is land
        rgba.set(grey ? [49, 49, 49, 255] : [0, 140, 255, 255], i);
      }
    }
    const share = landShare(rgba, w, h, { center_px: [10, 10], radius_px: 6 });
    expect(share).toBeGreaterThan(0.4);
    expect(share).toBeLessThan(0.6);
    expect(landShare(rgba, w, h, { center_px: [16, 10], radius_px: 3 })).toBe(0);
  });

  it('writes a region in scene 0.2 shape', () => {
    const r = regionJson('candidate', 'Spotlight', { center_px: [1872, 348], radius_px: 61 }, W, H);
    expect(r).toMatchObject({ center_px: [1872, 348], radius_px: 61, box_px: [1811, 287, 122, 122] });
  });
});
