// Checks that the data the app plays matches the shared contract in contracts/*.schema.json.
// When real scene/features files arrive, this test catches format drift before the demo does.
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import featuresSchema from '../../../contracts/features.schema.json';
import sceneSchema from '../../../contracts/scene.schema.json';
import musicEventSchema from '../../../contracts/music-event.schema.json';
import { ACTIVE, mockFeatures, mockScene } from './dataset';
import { SOURCES } from './sources';
import { buildEarthTrack } from '../audio/earthVoice';

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validFeatures = ajv.compile(featuresSchema);
const validScene = ajv.compile(sceneSchema);
const validEvent = ajv.compile(musicEventSchema);

describe('data matches the contract', () => {
  // Practice, the active data, and every source the app can play (ocean and data/aerosols/).
  for (const [name, scene, features] of [
    ['practice', mockScene, mockFeatures],
    ['active', ACTIVE.scene, ACTIVE.features],
    ...SOURCES.map((s) => [s.key, s.scene, s.features] as const),
  ] as const) {
    it(`${name} scene.json is valid`, () => {
      expect(validScene(scene), JSON.stringify(validScene.errors)).toBe(true);
    });
    it(`${name} features.json is valid`, () => {
      expect(validFeatures(features), JSON.stringify(validFeatures.errors)).toBe(true);
    });
    it(`${name} features only use region ids from the scene`, () => {
      const ids = new Set(scene.regions.map((r) => r.id));
      expect(features.steps.filter((s) => !ids.has(s.region))).toEqual([]);
    });
    it(`${name} each region's box_px is the bounding square of its circle`, () => {
      for (const r of scene.regions) {
        const [cx, cy] = r.center_px;
        const d = r.radius_px;
        expect(r.box_px, r.id).toEqual([cx - d, cy - d, 2 * d, 2 * d]);
      }
    });
    it(`${name} all regions have the same radius (fair comparison: docs/mapping_spec.md)`, () => {
      expect(new Set(scene.regions.map((r) => r.radius_px)).size).toBe(1);
    });
    it(`${name} every circle fits inside the frame`, () => {
      for (const r of scene.regions) {
        const [cx, cy] = r.center_px;
        expect(cx - r.radius_px >= 0 && cy - r.radius_px >= 0, r.id).toBe(true);
        expect(cx + r.radius_px <= scene.frames.width && cy + r.radius_px <= scene.frames.height, r.id).toBe(true);
      }
    });
    it(`${name} every scene region has steps to play`, () => {
      const used = new Set(features.steps.map((s) => s.region));
      expect(scene.regions.map((r) => r.id).filter((id) => !used.has(id))).toEqual([]);
    });
    it(`${name} missing steps have a reason and no value; ok steps have a value`, () => {
      const bad = features.steps.filter((s) =>
        s.status === 'missing' ? !s.reason || s.alignment !== null : s.alignment === null || s.reason !== null,
      );
      expect(bad).toEqual([]);
    });
    it(`${name} Earth notes are valid music events`, () => {
      for (const r of scene.regions) {
        for (const ev of buildEarthTrack(features, r.id).steps.flatMap((s) => s.events)) {
          expect(validEvent(ev), JSON.stringify(validEvent.errors)).toBe(true);
        }
      }
    });
  }
});
