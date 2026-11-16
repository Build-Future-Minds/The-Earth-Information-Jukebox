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
import { LINE_GRID, RADAR_GRID, STRENGTH_FLOOR, type ScanMeasure } from '../audio/scanScore';
import { OCEAN_LAND, type LandRule } from '../globe/geo';
import { ACTIVE, type Dataset } from './dataset';
import type { Features, Region, Scene } from './types';

export type SourceKey = 'ocean' | 'aerosols' | 'imerg' | 'practice';

/**
 * How the picture scan ("Play along") reads one picture. Every picture has its own: the settings
 * were measured on that picture's own still by `npm run measure` (web/measure), and its numbers are
 * never compared with another picture's. The scan plays a picture only when it has one.
 * The rule itself, the same for every picture, is audio/scanScore.ts.
 */
export interface ScanRule {
  /** 'measured': every setting here was measured on the still (docs/measurements/scan_pictures.md).
   *  'test input': the made-up practice picture, whose answers the unit tests know. */
  status: 'measured' | 'test input';
  /** What counts as light: colour strength, or brightness. */
  measure: ScanMeasure;
  /** A cell mean at or below this plays nothing (0–1). */
  floor: number;
  /** A cell mean at or above this plays at full level, for the map sweep and the radar. */
  full: { line: number; radar: number };
  /** Pixels never read, as a picture the size of the frames (white = never read), and what they
   *  are, in words for the screen. null: every pixel is read. */
  mask: { url: string; what: string } | null;
  /** A whole-world map, 180° W to 180° E and 90° N to 90° S: places are longitudes and latitudes.
   *  Stated for each picture, from its map check (assets/source_manifest.json). */
  worldMap: boolean;
  /** What each instrument means in this picture's own legend. */
  instruments: { warm: string; cool: string };
  /** Which still the scan reads, and how we know. */
  still: { frame: string; time: string | null; how: string };
  /** Every measured number the app quotes for this picture, exactly as `npm run measure` wrote it
   *  (docs/measurements/scan_pictures.json, `quoted`). A unit test checks they are the same. */
  measured: Record<string, number>;
  /** What the scan cannot tell you about this picture. */
  limits: string[];
}

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
  /** How the picture scan reads this picture; null until it has been measured (the scan does not
   *  play it). */
  scan: ScanRule | null;
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

// ---------- The picture scan's rule for each picture ----------

/** The ocean picture: the settings the scan was built with on 15 Nov. Design choices, each measured
 *  on this still (docs/measurements/scan_pictures.md, "Ocean"). */
export const OCEAN_SCAN: ScanRule = {
  status: 'measured',
  measure: 'colour',
  floor: STRENGTH_FLOOR,
  full: { line: LINE_GRID.fullStrength, radar: RADAR_GRID.fullStrength },
  mask: null,
  worldMap: true,
  instruments: {
    warm: 'lines drawn red or orange, the warm end of NASA\'s colour bar',
    cool: 'lines drawn yellow-green, green or blue, the rest of the bar',
  },
  still: { frame: 'frame 23000', time: '2007-03-25T12:00Z', how: 'the first of the 30 frames the Earth rhythm plays (data/scene.json)' },
  measured: {},
  limits: [
    'Warm colours are drawn stronger than cold ones, so warm water sounds louder than cold water with the same amount of line.',
    'The still is a compressed copy of NASA\'s frame, which blurs its finest lines.',
  ],
};

/** The practice picture: TEST INPUT, a made-up picture with known answers, read with the ocean's settings. */
export const PRACTICE_SCAN: ScanRule = {
  ...OCEAN_SCAN,
  status: 'test input',
  worldMap: false,
  instruments: { warm: 'the red dot', cool: 'the green and blue dots' },
  still: { frame: 'TEST INPUT', time: null, how: 'made up by the code (audio/scanScore.ts, makeTestPicture), not NASA data' },
  measured: {},
  limits: ['A made-up picture with a known answer, for testing. Not NASA data.'],
};

function pickPictures(): Picture[] {
  if (ACTIVE.origin === 'fixtures/mock/') {
    return [{ ...ACTIVE, key: 'practice', label: 'Practice', firstLetter: 'A', regionStyle: 'hue', resource: 'practice', landRule: OCEAN_LAND, scan: PRACTICE_SCAN }];
  }
  const list: Picture[] = [{ ...ACTIVE, key: 'ocean', label: 'Ocean', firstLetter: 'A', regionStyle: 'hue', resource: 'eic', landRule: OCEAN_LAND, scan: OCEAN_SCAN }];
  // Aerosol land is dull grey-green (same rule as prepare_scene.py).
  // Scan: not measured yet, so the scan does not play this picture.
  if (aerosols) list.push({ ...aerosols, key: 'aerosols', label: 'Aerosols', firstLetter: 'C', regionStyle: 'neutral', resource: 'challenge', landRule: [30, 95, 12], scan: null });
  // Rain: the land is a satellite photo, so no colour rule finds it (prepare_scene.py uses the ocean outline).
  // Scan: not measured yet, so the scan does not play this picture.
  if (imerg) list.push({ ...imerg, key: 'imerg', label: 'Rain', firstLetter: 'E', regionStyle: 'neutral', resource: 'eic', landRule: null, scan: null });
  return list;
}

export const PICTURES: Picture[] = pickPictures();
export const SOURCES: Source[] = PICTURES.filter((p): p is Source => p.features !== null);

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

/** Honesty line 3, per picture: what the sound does not tell you (PRODUCT.md "Brand Commitments"). */
export function describesLine(picture: { key: SourceKey }): string {
  if (picture.key === 'aerosols') return 'It describes the picture, not air quality or amounts.';
  if (picture.key === 'imerg') return 'It describes the picture, not rainfall amounts.';
  return 'It describes the picture, not water speed or ocean health.';
}
