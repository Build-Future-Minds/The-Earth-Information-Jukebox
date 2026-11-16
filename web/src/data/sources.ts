// Every NASA picture the app knows, and the rules that keep them apart.
//
//   ocean     SVS 3912, data/           30 frames, regions A and B (EIC visualization, model output)
//   aerosols  SVS 5669, data/aerosols/  one still, regions C and D (a challenge resource, not EIC)
//   imerg     SVS 4285, data/imerg/     30 hourly frames, regions E and F (EIC, satellite observations)
//   practice  fixtures/mock/            test input only, regions A and B
//   <folder>  data/<folder>/            any other picture: it appears by itself (P1, Listen step 1)
//
// A picture is found by its files: data/scene.json for the ocean (the ACTIVE dataset), and every
// data/<folder>/scene.json. PICTURES is every picture with a scene (the globe shows them all).
// SOURCES is the pictures that also have measurements (features.json): the app plays those.
//
// Never compare numbers between pictures (Dev A, 15 Nov): each is drawn and measured with its own
// settings. Every comparison helper here takes ONE source, so two pictures can never meet.
import type { EarthTrack } from '../audio/earthVoice';
import type { PictureFacts } from '../audio/scanChoices';
import { LINE_GRID, RADAR_GRID, STRENGTH_FLOOR, TEST_CIRCLE, type ScanMeasure } from '../audio/scanScore';
import { OCEAN_LAND, type LandRule } from '../globe/geo';
import { ACTIVE, type Dataset } from './dataset';
import type { Features, Region, Scene } from './types';

/** 'ocean', 'practice', or the picture's folder in data/ ('aerosols', 'imerg', ...). */
export type SourceKey = string;

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
  /** Why this picture's floor, full level and instrument switch are what they are, with the
   *  evidence, for "Why the scan sounds like this" (audio/scanChoices.ts). */
  evidence: { floor: string; full: string; switch: string };
}

export interface Picture extends Omit<Dataset, 'features'> {
  key: SourceKey;
  /** One word for the picture button: "Ocean", "Aerosols", "Rain", "Practice". */
  label: string;
  /** The short name on Listen's picture list ("Sea surface currents and temperature"). NASA's own
   *  title is `scene.source.title`, never typed here. */
  short: string;
  /** What kind of data it is, in a few words ("Model output (ECCO2)"). */
  kind: string;
  /** null until Dev A has measured the picture. */
  features: Features | null;
  /** Letter of the picture's first region; the next region gets the next letter. */
  firstLetter: string;
  /** 'hue': violet and rose (DESIGN.md). 'neutral': ink and white, for pictures that use those hues. */
  regionStyle: 'hue' | 'neutral';
  resource: 'eic' | 'challenge' | 'practice' | 'unknown';
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

// ---------- Finding the pictures: every data/<folder>/scene.json ----------

// Written by analysis/prepare_scene.py --source svs5669 / svs4285 (and any later source).
const SCENES = import.meta.glob<{ default: unknown }>('../../../data/*/scene.json', { eager: true });
const FEATURES = import.meta.glob<{ default: unknown }>('../../../data/*/features.json', { eager: true });
const PREVIEWS = import.meta.glob<string>('../../../data/*/preview.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' });
/** Each picture's scan mask, if it has one (analysis/scan_mask.py): white = never read. */
const MASKS = import.meta.glob<string>('../../../data/*/scan_mask.png', { eager: true, query: '?url', import: 'default' });

const folderOf = (path: string) => /\/data\/([^/]+)\//.exec(path)![1];

/** The folders in data/ that hold a scene.json, in name order. */
export const SCENE_FOLDERS: string[] = Object.keys(SCENES).map(folderOf).sort();

function fromFolder(folder: string) {
  const scene = SCENES[`../../../data/${folder}/scene.json`]?.default as Scene | undefined;
  if (!scene) return null;
  const features = (FEATURES[`../../../data/${folder}/features.json`]?.default as Features | undefined) ?? null;
  const preview = Object.entries(PREVIEWS).find(([path]) => folderOf(path) === folder)?.[1] ?? null;
  return { scene, features, imageUrl: preview, origin: 'data/' as const };
}

/** "Model output" for a picture we have no words for yet, from its scene.json. */
const KIND_WORDS: Record<Scene['source']['data_kind'], string> = {
  model_output: 'Model output',
  observation: 'Observations',
  artistic_rendering: 'Artistic rendering',
  synthetic_test_input: 'Test input, not NASA data',
};

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
  evidence: {
    floor:
      'Measured on 15 Nov (docs/measurements/scan_pictures.md, "Ocean"): of the 746 cells that are 90% or more grey land or black sea in the uncompressed frame, none sounds; the largest has a mean of 7.67 of 255.',
    full: 'The most colourful map-sweep cell on the ocean picture measures 0.463, so 0.5 is its full level. Thin lines can fill the small radar cells up to about 0.8 (docs/measurements/scan_pictures.md, "Ocean").',
    switch:
      'On NASA\'s colour bar for the ocean picture the rule switches at 74.4% of the bar\'s length, which is 23.8 °C if the bar\'s scale is even (docs/measurements/scan_pictures.md). Unverified: that the bar\'s scale is even, and that the lines in the frame use the bar\'s colours.',
  },
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

/**
 * The aerosol picture (SVS 5669). Every number below was measured on this picture's own still by
 * `npm run measure` (docs/measurements/scan_pictures.md, "Aerosols"), and set by the procedure at the
 * top of that page, the same for every picture. Never compare them with another picture's.
 *   floor  20/255  Design choice: the commonest colour's strength (8) plus 12 for JPEG noise.
 *   full   0.45 (map sweep: largest cell 0.429), 0.8 (radar: largest cell 0.77). Design choice.
 *   mask   none    Verified: 0 of the 201 cells that are 90% or more grey land sound.
 */
export const AEROSOLS_SCAN: ScanRule = {
  status: 'measured',
  measure: 'colour',
  floor: 20 / 255,
  full: { line: 0.45, radar: 0.8 },
  mask: null,
  // The scene file: a 16:9 world map, 0.094° per pixel east-west and 0.083° north-south.
  worldMap: true,
  instruments: {
    warm: 'black carbon, drawn red-brown on NASA\'s aerosol colour bar',
    cool: 'dust, sea salt and sulfate, drawn purple, grey-green and green',
  },
  still: {
    frame: 'the one still',
    time: '2025-08-19T20:00Z',
    how: 'NASA\'s only frame of this picture; the app\'s still differs from NASA\'s full-size frame by 2.65 grey levels a channel on average',
  },
  measured: {},
  limits: [
    'Sea salt is drawn faint (colour strength 0.145 on NASA\'s bar, against 0.659 for sulfate), so sea salt plays quietly. Region D\'s circle strikes no notes, only soft held ones: its strongest cell is 0.15.',
    'Louder means more vivid colour in the drawing, not more aerosol in the air.',
    'One moment only (19 Aug 2025, 20:00 UTC).',
  ],
  evidence: {
    floor:
      'Measured on 16 Nov (docs/measurements/scan_pictures.md, "Aerosols"): the commonest colour is RGB (62, 69, 61), strength 8 of 255; 12 is added for JPEG noise. Of the 201 cells that are 90% or more grey land, none sounds; the largest has a mean of 10.84 of 255.',
    full: 'Measured on 16 Nov: the most colourful map-sweep cell is 0.429 and the most colourful radar cell 0.77, so 0.45 and 0.8 (rounded up to 0.05, so no cell is clipped).',
    switch:
      'On NASA\'s aerosol colour bar the rule switches at 27.6% of the bar\'s length, between black carbon (warm) and dust (cool) (docs/measurements/scan_pictures.md). The step names were read by eye from the labels on the bar.',
  },
};

const IMERG_MASK = MASKS['../../../data/imerg/scan_mask.png'] ?? null;

/**
 * The rain picture (SVS 4285). Measured on its own still (docs/measurements/scan_pictures.md, "Rain"),
 * set by the same procedure. Its land is a satellite photo, not data, so the scan never reads it.
 *   floor  30/255  Design choice: the commonest colour's strength (18) plus 12 for JPEG noise.
 *   full   0.85 (map sweep: largest cell 0.810), 0.95 (radar: largest cell 0.90). Design choice.
 *   mask   data/imerg/scan_mask.png  Verified: inside each rain circle it marks exactly the pixels
 *          that region's own mask leaves out (analysis/scan_mask.py stops on any difference).
 */
export const IMERG_SCAN: ScanRule | null = IMERG_MASK
  ? {
      status: 'measured',
      measure: 'colour',
      floor: 30 / 255,
      full: { line: 0.85, radar: 0.95 },
      mask: { url: IMERG_MASK, what: 'land and ice, which in this picture are a satellite photo, not rain data' },
      worldMap: true,
      instruments: {
        warm: 'rain drawn yellow to dark red: steps 4 to 10 of NASA\'s rain colour bar, the heavier end',
        cool: 'rain drawn green to yellow-green (steps 1 to 3, the lightest) and all snow (blue)',
      },
      still: {
        frame: 'frame 0',
        time: '2026-11-14T00:00Z',
        how: 'the closest of NASA\'s 30 frames to the app\'s still: 4.48 grey levels a channel apart, against 7.84 for the next closest',
      },
      measured: {},
      limits: [
        'The land is a photo, so the scan never reads it: 40.21% of the picture. Rain over land is not heard.',
        'Colour strength is not rain rate: the heaviest step on NASA\'s bar (0.569) is drawn weaker than the lightest (0.702), so loudness says how much of a band is drawn as rain, not how hard it rains.',
        'One frame of the 30 (frame 0).',
      ],
      evidence: {
        floor:
          'Measured on 16 Nov (docs/measurements/scan_pictures.md, "Rain"): the commonest colour is RGB (2, 5, 20), strength 18 of 255; 12 is added for JPEG noise. Of the 1108 cells that are 90% or more this colour, 1 sounds, at level 0.019.',
        full: 'Measured on 16 Nov: the most colourful map-sweep cell is 0.810 and the most colourful radar cell 0.90, so 0.85 and 0.95 (rounded up to 0.05, so no cell is clipped).',
        switch:
          'On NASA\'s rain colour bar the rule switches at 28.7% of the bar\'s length, between step 3 (yellow-green, cool) and step 4 (yellow, warm); every step of the snow bar is cool (docs/measurements/scan_pictures.md).',
      },
    }
  : null;

/** What the app knows about each picture beyond its scene.json: the words on screen, the region
 *  look, and its scan rule. A folder not listed here still appears, with neutral regions, its
 *  NASA title as its name, and no scan until it has been measured. */
const KNOWN: Record<string, Pick<Picture, 'label' | 'short' | 'kind' | 'firstLetter' | 'regionStyle' | 'resource' | 'landRule' | 'scan'>> = {
  // Aerosol land is dull grey-green (same rule as prepare_scene.py).
  aerosols: { label: 'Aerosols', short: 'Aerosols', kind: 'Model output (GEOS-FP)', firstLetter: 'C', regionStyle: 'neutral', resource: 'challenge', landRule: [30, 95, 12], scan: AEROSOLS_SCAN },
  // Rain: the land is a satellite photo, so no colour rule finds it (prepare_scene.py uses the ocean outline).
  imerg: { label: 'Rain', short: 'Precipitation (GPM IMERG)', kind: 'Satellite estimates', firstLetter: 'E', regionStyle: 'neutral', resource: 'eic', landRule: null, scan: IMERG_SCAN },
};
/** The known pictures come first, in this order; any other folder follows, by name. */
const ORDER = ['aerosols', 'imerg'];

function pickPictures(): Picture[] {
  if (ACTIVE.origin === 'fixtures/mock/') {
    return [{ ...ACTIVE, key: 'practice', label: 'Practice', short: 'Practice picture', kind: 'Test input, not NASA data', firstLetter: 'A', regionStyle: 'hue', resource: 'practice', landRule: OCEAN_LAND, scan: PRACTICE_SCAN }];
  }
  const list: Picture[] = [
    { ...ACTIVE, key: 'ocean', label: 'Ocean', short: 'Sea surface currents and temperature', kind: 'Model output (ECCO2)', firstLetter: 'A', regionStyle: 'hue', resource: 'eic', landRule: OCEAN_LAND, scan: OCEAN_SCAN },
  ];
  const folders = [...ORDER.filter((f) => SCENE_FOLDERS.includes(f)), ...SCENE_FOLDERS.filter((f) => !ORDER.includes(f))];
  const used = new Set(['A', 'C', 'E']);
  for (const folder of folders) {
    const data = fromFolder(folder);
    if (!data) continue;
    const known = KNOWN[folder];
    if (known) {
      list.push({ ...data, key: folder, ...known });
      continue;
    }
    // A picture nobody has described yet: the next free pair of letters, neutral regions (they may
    // share hues with its data), and no scan until `npm run measure` has measured it.
    let letter = 'G';
    while (used.has(letter)) letter = String.fromCharCode(letter.charCodeAt(0) + 2);
    used.add(letter);
    list.push({
      ...data,
      key: folder,
      label: folder,
      short: data.scene.source.title,
      kind: KIND_WORDS[data.scene.source.data_kind] ?? data.scene.source.data_kind,
      firstLetter: letter,
      regionStyle: 'neutral',
      resource: 'unknown',
      landRule: null,
      scan: null,
    });
  }
  return list;
}

// ---------- What the picture scan can play on a picture ----------

/** What the scan reads: the whole picture ('map', the map sweep) or one circle (its id, the radar). */
export type ScanTarget = 'map' | string;

/** The circles the radar can turn in: the picture's regions, or the one test circle on the TEST
 *  INPUT picture that stands in for a NASA picture in practice mode. */
export function scanRegions(p: Picture): Region[] {
  return p.imageUrl ? p.scene.regions : [TEST_CIRCLE];
}

/** "Region C" (the picture's own letters), or "Test circle" on the TEST picture. */
export function targetName(p: Picture, target: ScanTarget): string {
  if (target === 'map') return 'Whole picture';
  if (!p.imageUrl) return 'Test circle';
  return `Region ${regionLetter(p, target)}`;
}

/** The facts "Why the scan sounds like this" lists for a picture's floor, full level and
 *  instrument switch (audio/scanChoices.ts). */
export function factsOf(rule: ScanRule): PictureFacts {
  const own = rule !== OCEAN_SCAN && rule !== PRACTICE_SCAN;
  return { floor: rule.floor, full: rule.full, evidence: rule.evidence, procedure: own };
}

export const PICTURES: Picture[] = pickPictures();
export const SOURCES: Source[] = PICTURES.filter((p): p is Source => p.features !== null);

/** "30 hourly frames", "30 frames", "1 still": how many frames NASA's picture has, from its scene. */
export function framesText(scene: Scene): { count: number; words: string } {
  const count = scene.frames.count;
  if (count <= 1) return { count: 1, words: 'still' };
  const times = (scene.frames.timestamps ?? []).map((t) => Date.parse(t));
  const steps = times.slice(1).map((t, i) => t - times[i]);
  const even = steps.length > 0 && steps.every((s) => Number.isFinite(s) && s === steps[0]);
  const every = even ? ({ 3_600_000: 'hourly ', 86_400_000: 'daily ' } as Record<number, string>)[steps[0]] ?? '' : '';
  return { count, words: `${every}frames` };
}

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
  if (picture.key === 'ocean' || picture.key === 'practice') return 'It describes the picture, not water speed or ocean health.';
  return 'It describes the picture, not the amounts it shows.';
}
