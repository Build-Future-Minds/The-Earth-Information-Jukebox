import { describe, expect, it } from 'vitest';
import { LINE_GRID, ROOT_STEP_SECONDS } from '../audio/scanScore';
import type { Scene } from '../data/types';
import {
  FOLLOW_OFFSET,
  FOLLOW_STEP,
  RADAR_GLOW,
  SCAN_DIM,
  SCAN_GLOW,
  ZOOM_MAX,
  boxFor,
  followLongitude,
  globeRadius,
  globeScale,
  groundBearing,
  groundShape,
  landShare,
  limits,
  lineLongitude,
  lonLatToPx,
  projectToScreen,
  pxToLonLat,
  radarView,
  regionJson,
  scanShade,
  shadeColour,
  spherePoint,
  viewRotation,
  wrapLongitude,
} from './geo';
import { sphere } from './globeRenderer';

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

const DEG = Math.PI / 180;

/** The place `distance` degrees from `from` along a compass `bearing` (great circle). */
function destination(from: { lon: number; lat: number }, bearing: number, distance: number) {
  const f = from.lat * DEG;
  const t = bearing * DEG;
  const d = distance * DEG;
  const lat = Math.asin(Math.sin(f) * Math.cos(d) + Math.cos(f) * Math.sin(d) * Math.cos(t));
  const lon = from.lon * DEG + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(f), Math.cos(d) - Math.sin(f) * Math.sin(lat));
  return { lon: wrapLongitude(lon / DEG), lat: lat / DEG };
}

/** A repeatable stream of numbers between 0 and 1 (no Math.random: a failure can be run again). */
function numbers(seed: number) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

describe('the globe on screen: the same sums as the shader', () => {
  const w = 530;
  const h = 530;

  it('puts the place the globe faces in the middle', () => {
    for (const view of [{ lon: 0, lat: 0 }, { lon: 149.1, lat: 28.8 }, { lon: -132.4, lat: 1.4 }, { lon: -179, lat: -60 }]) {
      const p = projectToScreen(view.lon, view.lat, view, 1, w, h);
      // To a thousandth of a pixel: the matrix is single precision, as on the GPU.
      expect(p.x).toBeCloseTo(w / 2, 3);
      expect(p.y).toBeCloseTo(h / 2, 3);
      expect(p.depth).toBeCloseTo(1, 6);
      expect(p.visible).toBe(true);
    }
  });

  it('puts places 90 degrees away on the edge of the globe, and hides places further away', () => {
    const view = { lon: 30, lat: 20 };
    for (const zoom of [0.6, 1, 2.5]) {
      const radius = globeRadius(zoom, w, h);
      for (const bearing of [0, 45, 90, 135, 180, 270]) {
        const edge = destination(view, bearing, 90);
        const p = projectToScreen(edge.lon, edge.lat, view, zoom, w, h);
        // Single precision, as on the GPU: a millionth of the radius.
        expect(Math.abs(Math.hypot(p.x - w / 2, p.y - h / 2) - radius)).toBeLessThan(radius * 1e-6);
        expect(p.visible).toBe(true);
        for (const distance of [91, 135, 180]) {
          const q = destination(view, bearing, distance);
          expect(projectToScreen(q.lon, q.lat, view, zoom, w, h).visible, `${distance}° away on bearing ${bearing}`).toBe(false);
        }
      }
    }
  });

  it('puts north up and east to the right when the globe faces a place', () => {
    const view = { lon: 149.1, lat: 28.8 };
    const north = projectToScreen(149.1, 38.8, view, 1, w, h);
    const east = projectToScreen(159.1, 28.8, view, 1, w, h);
    expect(north.y).toBeLessThan(h / 2);
    expect(north.x).toBeCloseTo(w / 2, 3);
    expect(east.x).toBeGreaterThan(w / 2);
  });

  it('agrees with the vertex shader: uRot (column-major) times the mesh position, then uScale', () => {
    const next = numbers(7);
    for (let i = 0; i < 1000; i++) {
      const view = { lon: next() * 360 - 180, lat: next() * 160 - 80 };
      const zoom = 0.6 + next() * 5.4;
      const cw = 200 + next() * 800;
      const ch = 200 + next() * 800;
      const lon = next() * 360 - 180;
      const lat = next() * 180 - 90;
      // The vertex shader written out: p = uRot * aPos, where GLSL reads the 9 numbers column by column.
      const m = viewRotation(view);
      const a = spherePoint(lon, lat);
      const p = [0, 1, 2].map((row) => m[row] * a[0] + m[3 + row] * a[1] + m[6 + row] * a[2]);
      const [sx, sy] = globeScale(zoom, cw, ch);
      const s = projectToScreen(lon, lat, view, zoom, cw, ch);
      expect(s.x).toBeCloseTo(((p[0] * sx + 1) / 2) * cw, 6);
      expect(s.y).toBeCloseTo(((1 - p[1] * sy) / 2) * ch, 6);
      expect(s.depth).toBeCloseTo(p[2], 6);
    }
  });

  it('uses the same sphere as the globe mesh, and the mesh is mapped like the flat frame', () => {
    const stacks = 8;
    const slices = 16;
    const mesh = sphere(stacks, slices);
    for (let k = 0; k < mesh.uvs.length / 2; k++) {
      const [u, v] = [mesh.uvs[2 * k], mesh.uvs[2 * k + 1]];
      // The map position of a vertex is the place lonLatToPx gives, as a share of the frame.
      const [lon, lat] = pxToLonLat(u * 2048, v * 1024, 2048, 1024);
      const point = spherePoint(lon, lat);
      for (let j = 0; j < 3; j++) expect(mesh.positions[3 * k + j]).toBeCloseTo(point[j], 6);
    }
  });

  it('keeps the globe round on a canvas of any shape', () => {
    for (const [cw, ch] of [[530, 530], [800, 400], [300, 900]]) {
      const [sx, sy] = globeScale(1, cw, ch);
      expect((sx * cw) / 2).toBeCloseTo((sy * ch) / 2, 9);
      expect((sx * cw) / 2).toBeCloseTo(globeRadius(1, cw, ch), 9);
    }
  });
});

describe('turning the globe with the scan line', () => {
  it('keeps the line a little right of the middle of the globe', () => {
    expect(followLongitude(0.5, false)).toBeCloseTo(-FOLLOW_OFFSET, 9);
    expect(wrapLongitude(lineLongitude(0.5) - followLongitude(0.5, false))).toBeCloseTo(FOLLOW_OFFSET, 9);
    // At the start of the sweep the line is on the 180° line; the globe faces 160° E.
    expect(followLongitude(0, false)).toBeCloseTo(160, 9);
    for (let p = 0; p < 1; p += 0.01) {
      expect(wrapLongitude(lineLongitude(p) - followLongitude(p, false))).toBeCloseTo(FOLLOW_OFFSET, 6);
    }
  });

  it('cuts once per low-note step under reduced motion: 45° of longitude, 3.75 s of the 30 s sweep', () => {
    expect(FOLLOW_STEP).toBe((360 * ROOT_STEP_SECONDS) / LINE_GRID.seconds);
    const faced = new Set<number>();
    // The line moves in whole seconds under reduced motion, as on the flat map.
    for (let second = 0; second < LINE_GRID.seconds; second++) {
      const p = second / LINE_GRID.seconds;
      const lon = followLongitude(p, true);
      faced.add(Math.round(lon * 1000) / 1000);
      // The line stays within half a step of the middle of the globe.
      expect(Math.abs(wrapLongitude(lineLongitude(p) - lon))).toBeLessThanOrEqual(FOLLOW_STEP / 2);
    }
    expect(faced.size).toBe(360 / FOLLOW_STEP);
    // Within one step the globe holds still; at the next it moves by exactly one step.
    expect(followLongitude(0.01, true)).toBe(followLongitude(0.1, true));
    expect(wrapLongitude(followLongitude(0.13, true) - followLongitude(0.1, true))).toBeCloseTo(FOLLOW_STEP, 9);
  });

  it('wraps longitude into −180 to 180', () => {
    expect(wrapLongitude(200)).toBe(-160);
    expect(wrapLongitude(-200)).toBe(160);
    expect(wrapLongitude(180)).toBe(-180);
    expect(wrapLongitude(-180)).toBe(-180);
  });
});

// The real scene files, for the circles' shapes on the ground.
const scenes = import.meta.glob<{ default: Scene }>(['../../../data/scene.json', '../../../data/aerosols/scene.json', '../../../data/imerg/scene.json'], { eager: true });
const circles = Object.values(scenes).flatMap(({ default: s }) => s.regions.map((r) => ({ id: r.id, region: r, frame: s.frames })));

describe("a region's circle on the ground (derived from the map geometry)", () => {
  // The same numbers as docs/measurements/scan_pictures.md, "The circles on the ground".
  const expected: Record<string, { ratio: string; zoom: string }> = {
    kuroshio_eddies: { ratio: '0.876', zoom: '5.00' },
    equator_pacific: { ratio: '1.000', zoom: '5.00' },
    aerosol_streaks_vanuatu: { ratio: '1.063', zoom: '5.50' },
    aerosol_cells_se_pacific: { ratio: '1.078', zoom: '5.42' },
    imerg_band_south_pacific: { ratio: '0.954', zoom: '5.36' },
    imerg_showers_equator: { ratio: '1.000', zoom: '5.36' },
  };

  it('reads all six approved circles', () => {
    expect(circles.map((c) => c.id).sort()).toEqual(Object.keys(expected).sort());
  });

  it('gives each circle its ground width over height, as in the measurements page', () => {
    for (const c of circles) expect(groundShape(c.region, c.frame.width, c.frame.height).ratio.toFixed(3), c.id).toBe(expected[c.id].ratio);
  });

  it('says how far equal turns of the radar are from equal compass bearings: 3.8° at most on Kuroshio', () => {
    const kuroshio = circles.find((c) => c.id === 'kuroshio_eddies')!;
    const g = groundShape(kuroshio.region, kuroshio.frame.width, kuroshio.frame.height);
    expect(g.bearingDifference.toFixed(2)).toBe('3.79');
    // The closed form is the largest difference over the whole turn.
    let largest = 0;
    for (let theta = 0; theta < 2 * Math.PI; theta += 0.0005) {
      const diff = Math.abs(groundBearing(theta, g.ratio) - theta);
      largest = Math.max(largest, Math.min(diff, 2 * Math.PI - diff));
    }
    expect(largest / DEG).toBeCloseTo(g.bearingDifference, 2);
    // A round circle turns in equal bearings.
    const equator = circles.find((c) => c.id === 'equator_pacific')!;
    expect(groundShape(equator.region, equator.frame.width, equator.frame.height).bearingDifference).toBeLessThan(0.05);
  });

  it('turns to each circle and zooms so it fills the view, within the zoom limit', () => {
    for (const c of circles) {
      const v = radarView(c.region, c.frame.width, c.frame.height);
      const [lon, lat] = pxToLonLat(c.region.center_px[0], c.region.center_px[1], c.frame.width, c.frame.height);
      expect(v.lon).toBeCloseTo(lon, 9);
      expect(v.lat).toBeCloseTo(lat, 9);
      expect(v.zoom.toFixed(2), c.id).toBe(expected[c.id].zoom);
      expect(v.zoom).toBeLessThanOrEqual(ZOOM_MAX);
    }
  });
});

describe('how the scan shades the picture on the globe (the rule the shader uses)', () => {
  const frame = { width: 240, height: 120 };

  it('the line: lit behind, dimmed ahead with a soft edge, a glow just behind', () => {
    const line = { mode: 'line' as const, position: 0.5, frame };
    expect(scanShade(60, 50, line)).toEqual({ dim: 0, glow: 0 }); // far behind: the picture as it is
    expect(scanShade(119.999, 50, line).glow).toBeCloseTo(SCAN_GLOW, 3); // just behind: the brightest glow
    expect(scanShade(119.999, 50, line).dim).toBe(0);
    expect(scanShade(180, 50, line)).toEqual({ dim: SCAN_DIM, glow: 0 }); // ahead: dimmed
    expect(scanShade(122.4, 50, line).dim).toBeCloseTo(SCAN_DIM / 2, 9); // half way through the 2% edge
    expect(scanShade(114, 50, line).glow).toBeCloseTo(SCAN_GLOW / 2, 9); // half way through the 5% glow
  });

  it('the radar: outside the circle and the part not reached yet are dimmed; a glow behind the needle', () => {
    const radar = { mode: 'radar' as const, position: 0.25, frame, circle: { cx: 120, cy: 60, r: 55 } };
    expect(scanShade(5, 5, radar)).toEqual({ dim: SCAN_DIM, glow: 0 }); // outside
    expect(scanShade(90, 60, radar)).toEqual({ dim: SCAN_DIM, glow: 0 }); // west: not reached yet
    expect(scanShade(120.5, 30, radar).glow).toBeCloseTo(RADAR_GLOW, 1); // just behind the needle (pointing north)
    expect(scanShade(150, 60, radar)).toEqual({ dim: 0, glow: 0 }); // east: played, 90° behind
  });

  it('only mixes toward black and white: a grey stays grey', () => {
    for (const c of shadeColour([70, 70, 70], { dim: SCAN_DIM, glow: 0 })) expect(c).toBeCloseTo(40.6, 9);
    const [r, g, b] = shadeColour([0, 220, 60], { dim: 0, glow: 0.2 });
    expect([r, g, b].map((c) => Math.round(c))).toEqual([51, 227, 99]);
  });
});
