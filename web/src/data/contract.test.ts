// Checks that the data the app plays matches the shared contract in contracts/*.schema.json.
// When real scene/features files arrive, this test catches format drift before the demo does.
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import featuresSchema from '../../../contracts/features.schema.json';
import sceneSchema from '../../../contracts/scene.schema.json';
import musicEventSchema from '../../../contracts/music-event.schema.json';
import { ACTIVE, mockFeatures, mockScene } from './dataset';
import { buildEarthTrack } from '../audio/earthVoice';

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validFeatures = ajv.compile(featuresSchema);
const validScene = ajv.compile(sceneSchema);
const validEvent = ajv.compile(musicEventSchema);

describe('data matches the contract', () => {
  for (const [name, scene, features] of [
    ['practice', mockScene, mockFeatures],
    ['active', ACTIVE.scene, ACTIVE.features],
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
