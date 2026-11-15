// Every NASA picture the app can play, and the rules that keep them apart.
//
//   ocean     SVS 3912, data/           30 frames, regions A and B (an EIC visualization)
//   aerosols  SVS 5669, data/aerosols/  one still, regions C and D (a challenge resource, not EIC)
//   practice  fixtures/mock/            test input only, regions A and B
//
// Never compare numbers between sources (Dev A, 15 Nov): each picture is drawn and measured with
// its own settings. Every comparison helper here takes ONE source, so two pictures can never meet.
import type { EarthTrack } from '../audio/earthVoice';
import { OCEAN_LAND, type LandRule } from '../globe/geo';
import { ACTIVE, type Dataset } from './dataset';
import type { Features, Region, Scene } from './types';

export type SourceKey = 'ocean' | 'aerosols' | 'practice';

export interface Source extends Dataset {
  key: SourceKey;
  /** One word for the picture button: "Ocean", "Aerosols", "Practice". */
  label: string;
  /** Letter of the source's first region; the next region gets the next letter. */
  firstLetter: 'A' | 'C';
  /** 'hue': violet and rose (DESIGN.md). 'neutral': ink and white, for pictures that use those hues. */
  regionStyle: 'hue' | 'neutral';
  resource: 'eic' | 'challenge' | 'practice';
  /** What flat land looks like in this picture (globe land check). */
  landRule: LandRule;
}

// The aerosol source lives in data/aerosols/ (written by analysis/prepare_scene.py --source svs5669).
const aerosolJson = import.meta.glob<{ default: unknown }>('../../../data/aerosols/{scene,features}.json', { eager: true });
const aerosolImages = import.meta.glob<string>('../../../data/aerosols/preview.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

function aerosols(): Source | null {
  const scene = aerosolJson['../../../data/aerosols/scene.json']?.default as Scene | undefined;
  const features = aerosolJson['../../../data/aerosols/features.json']?.default as Features | undefined;
  if (!scene || !features) return null;
  return {
    scene,
    features,
    imageUrl: Object.values(aerosolImages)[0] ?? null,
    origin: 'data/',
    key: 'aerosols',
    label: 'Aerosols',
    firstLetter: 'C',
    regionStyle: 'neutral',
    resource: 'challenge',
    landRule: [30, 95, 12], // dull grey-green land in this picture (same rule as prepare_scene.py)
  };
}

function pickSources(): Source[] {
  if (ACTIVE.origin === 'fixtures/mock/') {
    return [{ ...ACTIVE, key: 'practice', label: 'Practice', firstLetter: 'A', regionStyle: 'hue', resource: 'practice', landRule: OCEAN_LAND }];
  }
  const ocean: Source = { ...ACTIVE, key: 'ocean', label: 'Ocean', firstLetter: 'A', regionStyle: 'hue', resource: 'eic', landRule: OCEAN_LAND };
  const aero = aerosols();
  return aero ? [ocean, aero] : [ocean];
}

export const SOURCES: Source[] = pickSources();

export function sourceByKey(key: SourceKey): Source {
  return SOURCES.find((s) => s.key === key) ?? SOURCES[0];
}

export function regionLetter(source: Source, regionId: string): string {
  const i = source.scene.regions.findIndex((r) => r.id === regionId);
  return String.fromCharCode(source.firstLetter.charCodeAt(0) + i);
}

/** The other region of the same source, for comparisons. Only when the source has exactly two. */
export function otherRegionOf(source: Source, regionId: string): Region | undefined {
  const regions = source.scene.regions;
  if (regions.length !== 2 || !regions.some((r) => r.id === regionId)) return undefined;
  return regions.find((r) => r.id !== regionId);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** One label per track step: "25 Mar" on the first step of each UTC day, else null. */
export function dayLabels(track: EarthTrack): (string | null)[] {
  let lastDay: string | null = null;
  return track.steps.map((s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.step.source_time ?? '');
    if (!m) return null;
    const day = m[0];
    if (day === lastDay) return null;
    lastDay = day;
    return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}`;
  });
}
