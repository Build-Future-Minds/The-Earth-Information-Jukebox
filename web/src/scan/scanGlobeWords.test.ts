// The words the globe scan adds, and which pictures have a scan rule. The circles are the real
// approved regions from data/ (the same files the app plays).
import { describe, expect, it } from 'vitest';
import type { Scene } from '../data/types';
import { groundNote } from './groundNote';
import { scanRuleOf } from './scanRule';

const scenes = import.meta.glob<{ default: Scene }>(['../../../data/scene.json'], { eager: true });
const ocean = scenes['../../../data/scene.json'].default;
const circle = (id: string) => ocean.regions.find((r) => r.id === id)!;

describe('the sentence about a circle on the ground', () => {
  it('says the Kuroshio circle is narrower east–west on the ground, and by how much the bearings differ', () => {
    const text = groundNote(circle('kuroshio_eddies'), ocean.frames);
    expect(text).toBe(
      'On the ground this circle is 0.88 times as wide east–west as north–south, so equal turns of the line are not equal compass bearings: they differ by up to 4°.',
    );
  });

  it('says the Equatorial Pacific circle is round on the ground', () => {
    expect(groundNote(circle('equator_pacific'), ocean.frames)).toBe(
      'On the ground this circle is as wide east–west as north–south (1.00 times), so equal turns of the line are equal compass bearings.',
    );
  });

  it('never mentions the globe, so it cannot be mistaken for a corrected circle', () => {
    for (const r of ocean.regions) expect(groundNote(r, ocean.frames)).not.toMatch(/globe/i);
  });
});

describe('which pictures the scan may play', () => {
  it('has the colour rule for the ocean picture and the practice picture only, until the others are measured', () => {
    expect(scanRuleOf({ key: 'ocean' })).toEqual({ measure: 'colour' });
    expect(scanRuleOf({ key: 'practice' })).toEqual({ measure: 'colour' });
    expect(scanRuleOf({ key: 'aerosols' })).toBeNull();
    expect(scanRuleOf({ key: 'imerg' })).toBeNull();
  });
});
