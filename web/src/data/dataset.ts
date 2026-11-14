// The one place that chooses which scene and features the app plays.
//
// Real material goes in the repo-root `data/` folder (see docs/CONTRACT.md, "Where files go"):
//   data/scene.json     from Student A's analysis/prepare_scene.py
//   data/features.json  from Dev A's analysis/features.py
//   data/preview.(jpg|png|webp)  optional: one full frame, same aspect ratio as the scene frames
// When both JSON files exist the app uses them; otherwise it plays the practice fixtures.
// Everything is bundled at build time, so the app works with Wi-Fi off.

import mockFeaturesJson from '../../../fixtures/mock/features.mock.json';
import mockSceneJson from '../../../fixtures/mock/scene.mock.json';
import type { Features, Scene } from './types';

export const mockFeatures = mockFeaturesJson as unknown as Features; // shape checked by contract.test.ts
export const mockScene = mockSceneJson as unknown as Scene;

// import.meta.glob returns {} when a file is absent, so a missing data/ folder is not a build error.
const realJson = import.meta.glob<{ default: unknown }>('../../../data/{scene,features}.json', { eager: true });
const realImages = import.meta.glob<string>('../../../data/preview.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export interface Dataset {
  scene: Scene;
  features: Features;
  /** URL of a still image of the scene, or null to draw region boxes only. */
  imageUrl: string | null;
  /** Where the data came from, shown to the team in tests and the footer. */
  origin: 'data/' | 'fixtures/mock/';
}

function pick(): Dataset {
  const scene = realJson['../../../data/scene.json']?.default as Scene | undefined;
  const features = realJson['../../../data/features.json']?.default as Features | undefined;
  if (scene && features) {
    return { scene, features, imageUrl: Object.values(realImages)[0] ?? null, origin: 'data/' };
  }
  return { scene: mockScene, features: mockFeatures, imageUrl: null, origin: 'fixtures/mock/' };
}

export const ACTIVE: Dataset = pick();

/** Practice data must say so on screen (docs/CONTRACT.md). */
export function isPractice(d: Dataset): boolean {
  return d.scene.is_mock || d.features.is_mock;
}
