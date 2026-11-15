// The NASA sources the globe can show. Each is a scene.json (circles in that picture's own pixels),
// its features.json if Dev A has measured it, and one picture to wrap on the globe.
// Never compare alignment numbers between sources (Dev A, 15 Nov): each source has its own settings.
import { ACTIVE } from '../data/dataset';
import type { Features, Scene } from '../data/types';
import type { LandRule } from './geo';
import { OCEAN_LAND } from './geo';

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

// The aerosol source lives in data/aerosols/ (written by analysis/prepare_scene.py --source svs5669).
const aerosolJson = import.meta.glob<{ default: unknown }>('../../../data/aerosols/{scene,features}.json', { eager: true });
const aerosolImages = import.meta.glob<string>('../../../data/aerosols/preview.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

function oceanSource(): GlobeSource {
  return {
    key: 'ocean',
    label: 'Ocean currents',
    scene: ACTIVE.scene,
    features: ACTIVE.features,
    imageUrl: ACTIVE.imageUrl,
    landRule: OCEAN_LAND,
    note: `ECCO2 model output, first frame of the run (${ACTIVE.scene.frames.timestamps?.[0] ?? 'model time unknown'}).`,
    regionsFile: 'assets/regions_draft.json',
  };
}

function aerosolSource(): GlobeSource | null {
  const scene = aerosolJson['../../../data/aerosols/scene.json']?.default as Scene | undefined;
  if (!scene) return null;
  const features = (aerosolJson['../../../data/aerosols/features.json']?.default as Features | undefined) ?? null;
  return {
    key: 'aerosols',
    label: 'Aerosols',
    scene,
    features,
    imageUrl: Object.values(aerosolImages)[0] ?? null,
    landRule: [30, 95, 12], // dull grey-green land in this picture (same rule as prepare_scene.py)
    note: `GEOS-FP model output, one still (${scene.frames.timestamps?.[0] ?? 'time unknown'}). Measured at its own settings: don't compare its numbers with the ocean's.`,
    regionsFile: 'assets/regions_aerosols.json',
  };
}

export const GLOBE_SOURCES: GlobeSource[] = [oceanSource(), aerosolSource()].filter((s): s is GlobeSource => s !== null);
