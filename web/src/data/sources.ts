// Every NASA picture the app knows, and the rules that keep them apart.
//
//   ocean     SVS 3912, data/           30 frames, regions A and B (EIC visualization, model output)
//   aerosols  SVS 5669, data/aerosols/  one still, regions C and D (a challenge resource, not EIC)
//   imerg     SVS 4285, data/imerg/     30 hourly frames, regions E and F (EIC, satellite observations)
//   practice  fixtures/mock/            test input only, regions A and B
//
// PICTURES is every picture with a scene (the globe shows them all). SOURCES is the pictures that
// have measurements (features.json), which the app can play.
//
// Never compare numbers between pictures (Dev A, 15 Nov): each is drawn and measured with its own
// settings. Every comparison helper here takes ONE source, so two pictures can never meet.
import type { EarthTrack } from '../audio/earthVoice';
import { OCEAN_LAND, type LandRule } from '../globe/geo';
import { ACTIVE, type Dataset } from './dataset';
import type { Features, Region, Scene } from './types';

export type SourceKey = 'ocean' | 'aerosols' | 'imerg' | 'practice';

export interface Picture extends Omit<Dataset, 'features'> {
  key: SourceKey;
  /** One word for the picture button: "Ocean", "Aerosols", "Rain", "Practice". */
  label: string;
  /** null until Dev A has measured the picture. */
  features: Features | null;
  /** Letter of the picture's first region; the next region gets the next letter. */
  firstLetter: 'A' | 'C' | 'E';
  /** 'hue': violet and rose (DESIGN.md). 'neutral': ink and white, for pictures that use those hues. */
  regionStyle: 'hue' | 'neutral';
  resource: 'eic' | 'challenge' | 'practice';
  /** What flat land looks like (globe land check); null when the land is a photo. */
  landRule: LandRule | null;
}

/** A picture the app can play: it has measurements. */
export interface Source extends Picture {
  features: Features;
}

function fromData(folder: 'aerosols' | 'imerg', json: Record<string, { default: unknown }>, images: Record<string, string>) {
  const scene = json[`../../../data/${folder}/scene.json`]?.default as Scene | undefined;
  const features = (json[`../../../data/${folder}/features.json`]?.default as Features | undefined) ?? null;
  return scene ? { scene, features, imageUrl: Object.values(images)[0] ?? null, origin: 'data/' as const } : null;
}

// Written by analysis/prepare_scene.py --source svs5669 / svs4285.
const aerosols = fromData(
  'aerosols',
  import.meta.glob<{ default: unknown }>('../../../data/aerosols/{scene,features}.json', { eager: true }),
  import.meta.glob<string>('../../../data/aerosols/preview.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' }),
);
const imerg = fromData(
  'imerg',
  import.meta.glob<{ default: unknown }>('../../../data/imerg/{scene,features}.json', { eager: true }),
  import.meta.glob<string>('../../../data/imerg/preview.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' }),
);

function pickPictures(): Picture[] {
  if (ACTIVE.origin === 'fixtures/mock/') {
    return [{ ...ACTIVE, key: 'practice', label: 'Practice', firstLetter: 'A', regionStyle: 'hue', resource: 'practice', landRule: OCEAN_LAND }];
  }
  const list: Picture[] = [{ ...ACTIVE, key: 'ocean', label: 'Ocean', firstLetter: 'A', regionStyle: 'hue', resource: 'eic', landRule: OCEAN_LAND }];
  // Aerosol land is dull grey-green (same rule as prepare_scene.py).
  if (aerosols) list.push({ ...aerosols, key: 'aerosols', label: 'Aerosols', firstLetter: 'C', regionStyle: 'neutral', resource: 'challenge', landRule: [30, 95, 12] });
  // Rain: the land is a satellite photo, so no colour rule finds it (prepare_scene.py uses the ocean outline).
  if (imerg) list.push({ ...imerg, key: 'imerg', label: 'Rain', firstLetter: 'E', regionStyle: 'neutral', resource: 'eic', landRule: null });
  return list;
}

export const PICTURES: Picture[] = pickPictures();
export const SOURCES: Source[] = PICTURES.filter((p): p is Source => p.features !== null);

/** A NASA page the app's pictures come from, as its scene.json gives it. */
export interface NasaPage {
  svsId: number;
  url: string;
  title: string;
}

/**
 * The NASA page of every real picture, read from `data/scene.json` and each `data/<folder>/scene.json` (ocean first),
 * never typed by hand. Read from the files even with practice data on: these are the sources, not
 * the data being played. Test input has no SVS page and is left out.
 */
export const NASA_PAGES: NasaPage[] = Object.entries(
  import.meta.glob<{ default: unknown }>(['../../../data/scene.json', '../../../data/*/scene.json'], { eager: true }),
)
  .sort(([a], [b]) => a.split('/').length - b.split('/').length || a.localeCompare(b))
  .map(([, m]) => (m.default as Scene).source)
  .filter((s) => s.svs_id !== null && /^https:\/\/svs\.gsfc\.nasa\.gov\//.test(s.url))
  .map((s) => ({ svsId: s.svs_id!, url: s.url, title: s.title }));

export function sourceByKey(key: SourceKey): Source {
  return SOURCES.find((s) => s.key === key) ?? SOURCES[0];
}

export function regionLetter(picture: Picture, regionId: string): string {
  const i = picture.scene.regions.findIndex((r) => r.id === regionId);
  return String.fromCharCode(picture.firstLetter.charCodeAt(0) + i);
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
    if (m[0] === lastDay) return null;
    lastDay = m[0];
    return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}`;
  });
}

/** "model time" for model output, plain "time" for observations (rain is satellite estimates). */
export function timeWord(picture: { scene: Scene }): 'model time' | 'time' {
  return picture.scene.source.data_kind === 'model_output' ? 'model time' : 'time';
}

/** Honesty line 1, per picture: "A computer model (ECCO2), not a photo." / satellite estimates / test input. */
export function natureLine(p: { scene: Scene }): string {
  const s = p.scene.source;
  const what = s.model_or_instrument && s.model_or_instrument !== 'none' ? ` (${s.model_or_instrument})` : '';
  if (s.data_kind === 'model_output') return `A computer model${what}, not a photo.`;
  if (s.data_kind === 'observation') return `Satellite estimates${what}, drawn as a picture.`;
  return 'Test input made by the team, not NASA data.';
}

/** Honesty line 3, per picture: what the sound does not tell you (PRODUCT.md "Brand Commitments"). */
export function describesLine(picture: { key: SourceKey }): string {
  if (picture.key === 'aerosols') return 'It describes the picture, not air quality or amounts.';
  if (picture.key === 'imerg') return 'It describes the picture, not rainfall amounts.';
  return 'It describes the picture, not water speed or ocean health.';
}
