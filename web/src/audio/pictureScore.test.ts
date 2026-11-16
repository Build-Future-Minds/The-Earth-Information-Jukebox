// Listen plays each picture with its own settings (P1, decision D2): the score for a picture must use
// that picture's floor and full levels, and its mask. Each picture is checked against its own
// settings only; no number of one picture is compared with another's.
import { describe, expect, it } from 'vitest';
import { SOURCES } from '../data/sources';
import { scanChoicesFor } from './scanChoices';
import { colourStrength, LINE_GRID, levelOf, pictureScore, RADAR_GRID, type Pixels } from './scanScore';

/** A picture of one colour. */
function uniform(width: number, height: number, rgb: [number, number, number]): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < width * height; p++) data.set([...rgb, 255], p * 4);
  return { data, width, height };
}

// A dull red: strength 50/255, between every picture's floor and its full level.
const RGB: [number, number, number] = [110, 60, 60];
const CIRCLE = { box_px: [65, 5, 110, 110] as [number, number, number, number], radius_px: 55 };

describe('pictureScore: each picture is read with its own settings', () => {
  for (const s of SOURCES) {
    it(`${s.key}: its own floor and full level, on the map sweep and on the radar`, () => {
      const rule = s.scan!;
      const pixels = uniform(240, 120, RGB);
      const strength = colourStrength(...RGB);
      expect(strength).toBeGreaterThan(rule.floor);
      expect(strength).toBeLessThan(rule.full.line);

      const line = pictureScore(pixels, rule, null, { kind: 'line' });
      expect([line.shape, line.floor, line.grid.fullStrength, line.grid.columns]).toEqual(['line', rule.floor, rule.full.line, LINE_GRID.columns]);
      expect(line.levels[0]).toBeCloseTo(levelOf(strength, rule.full.line, rule.floor), 6);

      const radar = pictureScore(pixels, rule, null, { kind: 'radar', frameWidth: 240, region: CIRCLE });
      expect([radar.shape, radar.floor, radar.grid.fullStrength, radar.grid.columns]).toEqual(['radar', rule.floor, rule.full.radar, RADAR_GRID.columns]);
      expect(radar.levels[0]).toBeCloseTo(levelOf(strength, rule.full.radar, rule.floor), 6);
    });
  }

  it('a pixel the mask marks is never read: no data, not a quiet cell', () => {
    const rule = SOURCES.find((s) => s.key === 'imerg')!.scan!;
    const pixels = uniform(240, 120, RGB);
    const mask = new Uint8Array(240 * 120);
    for (let y = 0; y < 120; y++) for (let x = 0; x < 120; x++) mask[y * 240 + x] = 1; // the left half
    const score = pictureScore(pixels, rule, mask, { kind: 'line' });
    const { bands } = score.grid;
    expect(score.reads[0 * bands]).toBe(0); // column 0: never read
    expect(score.levels[0 * bands]).toBe(0);
    expect(score.reads[200 * bands]).toBeGreaterThan(0); // column 200: read
    expect(score.levels[200 * bands]).toBeGreaterThan(0);
  });
});

describe('"Why the scan sounds like this" lists each picture\'s own numbers', () => {
  for (const s of SOURCES) {
    it(`${s.key}: its floor and full levels, with its own evidence`, () => {
      const rule = s.scan!;
      const choices = scanChoicesFor({ label: s.label, scan: rule });
      const floor = choices.find((c) => c.id === 'floor')!;
      const full = choices.find((c) => c.id === 'full-level')!;
      const sw = choices.find((c) => c.id === 'instrument-switch')!;
      expect(floor.what).toContain(`${Number((rule.floor * 255).toFixed(2))} of 255`);
      expect(full.what).toContain(`${rule.full.line}`);
      expect(full.what).toContain(`${rule.full.radar}`);
      // Its own evidence: each picture says what the measurement of that picture found.
      expect(floor.evidence).toContain('docs/measurements/scan_pictures.md');
      expect(sw.what).toContain(rule.instruments.warm);
    });
  }
});
