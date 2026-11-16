// The sources the app can play (ocean currents, aerosols, or practice) and the rules that keep
// them apart: letters come from the source, aerosols are neutral, and no comparison crosses sources.
import { describe, expect, it } from 'vitest';
import { buildEarthTrack } from '../audio/earthVoice';
import { regionLabel } from '../components/ExploreControls';
import { stepAtSameMoment } from '../components/RhythmExplanation';
import { dayLabels, otherRegionOf, PICTURES, regionLetter, sourceByKey, SOURCES, timeWord, describesLine, NASA_PAGES, natureLine } from './sources';
import { mockScene } from './dataset';

describe('sources', () => {
  it('lists every picture: ocean, aerosols, rain', () =>
    expect(PICTURES.map((p) => p.key)).toEqual(['ocean', 'aerosols', 'imerg']));

  it('the app plays only pictures that have measurements', () => {
    expect(SOURCES.map((s) => s.key)).toEqual(PICTURES.filter((p) => p.features).map((p) => p.key));
    expect(SOURCES.slice(0, 2).map((s) => s.key)).toEqual(['ocean', 'aerosols']);
  });

  it('rain is regions E and F, neutral, an EIC observation', () => {
    const rain = PICTURES.find((p) => p.key === 'imerg')!;
    expect([rain.label, rain.firstLetter, rain.regionStyle, rain.resource, rain.landRule]).toEqual(['Rain', 'E', 'neutral', 'eic', null]);
    expect(rain.scene.regions.map((r) => regionLetter(rain, r.id))).toEqual(['E', 'F']);
  });

  it('letters come from the source', () => {
    const [ocean, aero] = SOURCES;
    expect(ocean.scene.regions.map((r) => regionLetter(ocean, r.id))).toEqual(['A', 'B']);
    expect(aero.scene.regions.map((r) => regionLetter(aero, r.id))).toEqual(['C', 'D']);
  });

  it('region labels start at the source\'s first letter', () => {
    const aero = sourceByKey('aerosols');
    expect(aero.scene.regions.map((r) => regionLabel(aero.scene.regions, r.id, aero.firstLetter))).toEqual(['Region C', 'Region D']);
    const ocean = sourceByKey('ocean');
    expect(regionLabel(ocean.scene.regions, ocean.scene.regions[1].id)).toBe('Region B');
  });

  it('aerosols are neutral and a challenge resource', () => {
    const aero = sourceByKey('aerosols');
    expect([aero.regionStyle, aero.resource, aero.label]).toEqual(['neutral', 'challenge', 'Aerosols']);
    expect([sourceByKey('ocean').regionStyle, sourceByKey('ocean').resource]).toEqual(['hue', 'eic']);
  });

  it('an unknown key falls back to the first source', () => {
    expect(sourceByKey('practice').key).toBe(SOURCES[0].key);
  });

  it('the other region always comes from the same source', () => {
    for (const s of SOURCES)
      for (const r of s.scene.regions) {
        const o = otherRegionOf(s, r.id)!;
        expect(s.scene.regions).toContain(o);
        expect(o.id).not.toBe(r.id);
      }
  });

  it('a comparison across sources finds nothing', () => {
    const ocean = sourceByKey('ocean'), aero = sourceByKey('aerosols');
    const step = ocean.features.steps.find((s) => s.status === 'ok')!;
    expect(stepAtSameMoment(ocean.features.steps, step, aero.scene.regions[0].id)).toBeNull();
    expect(otherRegionOf(ocean, aero.scene.regions[0].id)).toBeUndefined();
  });

  it('a one-frame source loops one beat', () => {
    const aero = sourceByKey('aerosols');
    const track = buildEarthTrack(aero.features, aero.scene.regions[0].id);
    expect(track.steps).toHaveLength(1);
    expect(track.length).toBe(aero.features.step_seconds);
    expect(track.steps[0].events).toHaveLength(2);
  });

  it('day labels mark each new day', () => {
    const ocean = sourceByKey('ocean');
    const labels = dayLabels(buildEarthTrack(ocean.features, ocean.scene.regions[0].id)).filter(Boolean);
    expect(labels[0]).toBe('25 Mar');
    expect(new Set(labels).size).toBe(labels.length);
    const aero = sourceByKey('aerosols');
    expect(dayLabels(buildEarthTrack(aero.features, aero.scene.regions[0].id))).toEqual(['19 Aug']);
  });
});

describe('timeWord', () => {
  it('model pictures say "model time"; observations say "time"', () => {
    expect(timeWord(sourceByKey('ocean'))).toBe('model time');
    expect(timeWord(sourceByKey('aerosols'))).toBe('model time');
    expect(timeWord(sourceByKey('imerg'))).toBe('time');
  });
});

describe('describesLine (honesty line 3, per picture)', () => {
  it('names what each picture does not tell you', () => {
    expect(describesLine(sourceByKey('ocean'))).toBe('It describes the picture, not water speed or ocean health.');
    expect(describesLine(sourceByKey('aerosols'))).toBe('It describes the picture, not air quality or amounts.');
    expect(describesLine(sourceByKey('imerg'))).toBe('It describes the picture, not rainfall amounts.');
  });
});

describe('natureLine (honesty line 1, per picture)', () => {
  it('model output, satellite estimates, or test input', () => {
    expect(natureLine(sourceByKey('ocean'))).toBe('A computer model (ECCO2 (MIT/JPL), surface flows only), not a photo.');
    expect(natureLine(PICTURES.find((p) => p.key === 'imerg')!)).toMatch(/^Satellite estimates \(GPM IMERG .*\), drawn as a picture\.$/);
    expect(natureLine({ scene: mockScene })).toBe('Test input made by the team, not NASA data.');
  });
});

describe('NASA_PAGES (Home quick links)', () => {
  it('one page per real picture, ocean first, read from each scene.json', () => {
    expect(NASA_PAGES.map((p) => p.svsId)).toEqual([3912, 5669, 4285]);
    for (const p of PICTURES) {
      const page = NASA_PAGES.find((n) => n.svsId === p.scene.source.svs_id)!;
      expect([page.url, page.title]).toEqual([p.scene.source.url, p.scene.source.title]);
    }
  });
});
