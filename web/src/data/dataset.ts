// The one place that chooses which scene and features the app plays.
// Checkpoint 2: point ACTIVE at the real files from Student A (scene) and Dev A (features).
// Files are bundled at build time, so the app works with Wi-Fi off.

import mockFeaturesJson from '../../../fixtures/mock/features.mock.json';
import mockSceneJson from '../../../fixtures/mock/scene.mock.json';
import type { Features, Scene } from './types';

export const mockFeatures = mockFeaturesJson as unknown as Features; // shape checked by contract.test.ts
export const mockScene = mockSceneJson as unknown as Scene;

export interface Dataset {
  scene: Scene;
  features: Features;
  /** URL of a still image of the scene, or null to draw region boxes only. */
  imageUrl: string | null;
}

export const ACTIVE: Dataset = {
  scene: mockScene,
  features: mockFeatures,
  imageUrl: null,
};

/** Practice data must say so on screen (docs/CONTRACT.md). */
export function isPractice(d: Dataset): boolean {
  return d.scene.is_mock || d.features.is_mock;
}
