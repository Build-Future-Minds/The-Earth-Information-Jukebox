// The NASA pictures the globe can show, taken from the app's one list (data/sources.ts): each is a
// scene.json (circles in that picture's own pixels), its features.json if Dev A has measured it, and
// one picture to wrap on the globe. Never compare alignment numbers between pictures (Dev A, 15 Nov).
import { PICTURES } from '../data/sources';
import type { Features, Scene } from '../data/types';
import type { LandRule } from './geo';

export interface GlobeSource {
  key: string;
  label: string;
  scene: Scene;
  features: Features | null;
  imageUrl: string | null;
  /** null when the land is a photo and a colour rule can't find it (the readout says so). */
  landRule: LandRule | null;
  /** One line under the globe: what the picture is and when. */
  note: string;
  /** Where approved regions for this source are kept. */
  regionsFile: string;
}

const LABEL: Record<string, string> = { ocean: 'Ocean currents', aerosols: 'Aerosols', imerg: 'Rain (IMERG)', practice: 'Practice data' };
const REGIONS_FILE: Record<string, string> = { aerosols: 'assets/regions_aerosols.json', imerg: 'assets/regions_imerg.json' };

function noteFor(key: string, times: string[]): string {
  if (key === 'aerosols')
    return `GEOS-FP model output, one still (${times[0] ?? 'time unknown'}). Measured at its own settings: don't compare its numbers with the ocean's.`;
  if (key === 'imerg')
    return `GPM IMERG satellite rain estimates, first of ${times.length} hourly frames (${times[0] ?? '?'} to ${times[times.length - 1] ?? '?'}). Don't compare its numbers with other sources.`;
  if (key === 'ocean' || key === 'practice') return `ECCO2 model output, first frame of the run (${times[0] ?? 'model time unknown'}).`;
  return `First frame (${times[0] ?? 'time unknown'}). Measured at its own settings: don't compare its numbers with other sources.`;
}

export const GLOBE_SOURCES: GlobeSource[] = PICTURES.map((p) => ({
  key: p.key,
  label: LABEL[p.key] ?? p.label,
  scene: p.scene,
  features: p.features,
  imageUrl: p.imageUrl,
  landRule: p.landRule,
  note: noteFor(p.key, p.scene.frames.timestamps ?? []),
  regionsFile: REGIONS_FILE[p.key] ?? 'assets/regions_draft.json',
}));
