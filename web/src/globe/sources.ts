// The NASA sources the globe can show, taken from the app's one list (data/sources.ts): each is a
// scene.json (circles in that picture's own pixels), its features.json, and one picture to wrap on
// the globe. Never compare alignment numbers between sources (Dev A, 15 Nov).
import { SOURCES } from '../data/sources';
import type { Features, Scene } from '../data/types';
import type { LandRule } from './geo';

export interface GlobeSource {
  key: string;
  label: string;
  scene: Scene;
  features: Features | null;
  imageUrl: string | null;
  landRule: LandRule;
  /** One line under the globe: what the picture is and when. */
  note: string;
  /** Where approved regions for this source are kept. */
  regionsFile: string;
}

const LABEL: Record<string, string> = { ocean: 'Ocean currents', aerosols: 'Aerosols', practice: 'Practice data' };

export const GLOBE_SOURCES: GlobeSource[] = SOURCES.map((s) => {
  const when = s.scene.frames.timestamps?.[0];
  return {
    key: s.key,
    label: LABEL[s.key],
    scene: s.scene,
    features: s.features,
    imageUrl: s.imageUrl,
    landRule: s.landRule,
    note:
      s.key === 'aerosols'
        ? `GEOS-FP model output, one still (${when ?? 'time unknown'}). Measured at its own settings: don't compare its numbers with the ocean's.`
        : `ECCO2 model output, first frame of the run (${when ?? 'model time unknown'}).`,
    regionsFile: s.key === 'aerosols' ? 'assets/regions_aerosols.json' : 'assets/regions_draft.json',
  };
});
