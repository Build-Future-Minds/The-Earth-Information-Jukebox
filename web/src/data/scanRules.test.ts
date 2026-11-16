// Each picture's scan rule (sources.ts, `scan`) must be the one `npm run measure` measured, and every
// number the app quotes about a picture must be the number that run wrote. If a setting is changed
// without measuring again, or a number is typed by hand, this fails: run `npm run measure` (web/).
import { describe, expect, it } from 'vitest';
import { AEROSOLS_SCAN, IMERG_SCAN, OCEAN_SCAN, PRACTICE_SCAN, type ScanRule } from './sources';

interface MeasuredPicture {
  key: string;
  hasRule: boolean;
  settings: { measure: string; floor: number; full: { line: number; radar: number }; mask: string | null; blueClass: boolean };
  procedure: { floor: number; full: { line: number; radar: number }; mask: string | null };
  quoted: Record<string, number>;
}
const report = Object.values(
  import.meta.glob<{ default: { pictures: MeasuredPicture[] } }>('../../../docs/measurements/scan_pictures.json', { eager: true }),
)[0]?.default;

const RULES: [string, ScanRule | null, string | null][] = [
  ['ocean', OCEAN_SCAN, null],
  ['aerosols', AEROSOLS_SCAN, null],
  ['imerg', IMERG_SCAN, 'data/imerg/scan_mask.png'],
];

describe('every picture\'s scan rule is the one that was measured', () => {
  it('the measurement report is in the repo', () => {
    expect(report, 'docs/measurements/scan_pictures.json is missing: run npm run measure').toBeTruthy();
  });

  for (const [key, rule, maskFile] of RULES) {
    describe(key, () => {
      const measured = report?.pictures.find((p) => p.key === key);

      it('has a rule, measured with that rule', () => {
        expect(rule).not.toBeNull();
        expect(rule!.status).toBe('measured');
        expect(measured, `${key} is not in the report`).toBeTruthy();
        expect(measured!.hasRule).toBe(true);
      });

      it('its settings are the ones the report was measured with', () => {
        const s = measured!.settings;
        expect(s.measure).toBe(rule!.measure);
        expect(s.floor).toBe(rule!.floor);
        expect(s.full).toEqual(rule!.full);
        expect(s.mask).toBe(maskFile);
        expect(s.blueClass).toBe(!!rule!.instruments.blue);
        expect(!!rule!.mask).toBe(!!maskFile);
      });

      it('every number it quotes is the number the report wrote', () => {
        for (const [name, value] of Object.entries(rule!.measured)) {
          expect(measured!.quoted[name], `${key}: "${name}"`).toBe(value);
        }
      });

      it('a world map, with a floor below both full levels', () => {
        expect(rule!.worldMap).toBe(true);
        expect(rule!.floor).toBeLessThan(rule!.full.line);
        expect(rule!.floor).toBeLessThan(rule!.full.radar);
      });
    });
  }

  it('the aerosol and rain settings are what the written procedure gives', () => {
    for (const key of ['aerosols', 'imerg']) {
      const p = report!.pictures.find((x) => x.key === key)!;
      expect(p.settings.floor).toBe(p.procedure.floor);
      expect(p.settings.full).toEqual(p.procedure.full);
      expect(p.settings.mask).toBe(p.procedure.mask);
    }
  });

  it('the ocean keeps the settings it was built with: 12/255, 0.5 and 0.75', () => {
    expect(OCEAN_SCAN.floor).toBe(12 / 255);
    expect(OCEAN_SCAN.full).toEqual({ line: 0.5, radar: 0.75 });
    expect(OCEAN_SCAN.mask).toBeNull();
    expect(OCEAN_SCAN.instruments.blue).toBeUndefined();
  });

  it('only the rain picture has a third instrument (snow) and a mask', () => {
    expect(IMERG_SCAN!.instruments.blue).toMatch(/snow/);
    expect(AEROSOLS_SCAN.instruments.blue).toBeUndefined();
    expect(AEROSOLS_SCAN.mask).toBeNull();
  });

  it('the practice picture is a test input on a plain picture, not a world map', () => {
    expect(PRACTICE_SCAN.status).toBe('test input');
    expect(PRACTICE_SCAN.worldMap).toBe(false);
  });

  it('a picture\'s words never name another picture', () => {
    const words: [string, ScanRule][] = [['ocean', OCEAN_SCAN], ['aerosols', AEROSOLS_SCAN], ['rain', IMERG_SCAN!]];
    for (const [name, rule] of words) {
      const text = [...Object.values(rule.instruments), rule.still.how, ...rule.limits, rule.mask?.what ?? ''].join(' ').toLowerCase();
      for (const [other] of words) if (other !== name) expect(text, `${name} names ${other}`).not.toMatch(new RegExp(`\\b${other}\\b`));
    }
  });
});
