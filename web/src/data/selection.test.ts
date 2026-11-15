// Choosing a picture, and cropping a region's circle for its thumbnail.
import { describe, expect, it } from 'vitest';
import { regionStyle } from '../components/ExploreControls';
import { selectSource, thumbCss } from './selection';
import { sourceByKey, SOURCES, type SourceKey } from './sources';

describe('selectSource', () => {
  it('picks the first region of that picture', () => {
    expect(selectSource('aerosols')).toEqual({ sourceKey: 'aerosols', regionId: sourceByKey('aerosols').scene.regions[0].id });
    expect(selectSource('ocean')).toEqual({ sourceKey: 'ocean', regionId: sourceByKey('ocean').scene.regions[0].id });
    expect(selectSource('imerg')).toEqual({ sourceKey: 'imerg', regionId: sourceByKey('imerg').scene.regions[0].id });
  });
  it('an unknown picture falls back to the first one', () => {
    expect(selectSource('practice' as SourceKey)).toEqual({ sourceKey: SOURCES[0].key, regionId: SOURCES[0].scene.regions[0].id });
  });
});

describe('thumbCss', () => {
  it('the circle fills the square, centred', () => {
    const region = { id: 'r', name: 'r', center_px: [100, 50] as [number, number], radius_px: 25, box_px: [75, 25, 50, 50] as [number, number, number, number], description: '' };
    expect(thumbCss(region, { width: 400, height: 200 }, 50)).toEqual({ backgroundSize: '400px 200px', backgroundPosition: '-75px -25px' });
  });
});

describe('thumbCss scaling', () => {
  it('a smaller square scales the picture down', () => {
    const region = { id: 'r', name: 'r', center_px: [100, 50] as [number, number], radius_px: 25, box_px: [75, 25, 50, 50] as [number, number, number, number], description: '' };
    expect(thumbCss(region, { width: 400, height: 200 }, 25)).toEqual({ backgroundSize: '200px 100px', backgroundPosition: '-37.5px -12.5px' });
  });
});

describe('region look', () => {
  const regions = sourceByKey('aerosols').scene.regions;
  it('neutral regions are ink inside a white outline', () => {
    expect(regionStyle(regions, regions[0].id, { neutral: true })).toEqual({ '--region': 'var(--ink)', '--region-outline': 'var(--white)' });
  });
  it('hue regions are violet then rose', () => {
    expect(regionStyle(regions, regions[0].id)).toEqual({ '--region': 'var(--region-a)' });
    expect(regionStyle(regions, regions[1].id, { firstLetter: 'C' })).toEqual({ '--region': 'var(--region-b)' });
  });
});
