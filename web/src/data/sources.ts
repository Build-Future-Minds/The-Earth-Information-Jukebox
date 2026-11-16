// Every NASA picture the app knows, and the rules that keep them apart.
//
//   ocean     SVS 3912, data/           30 frames, regions A and B (EIC visualization, model output)
//   aerosols  SVS 5669, data/aerosols/  one still, regions C and D (a challenge resource, not EIC)
//   imerg     SVS 4285, data/imerg/     30 hourly frames, regions E and F (EIC, satellite observations)
//   <folder>  data/<folder>/            any other picture: it appears by itself (P1, Listen step 1)
//   practice  fixtures/mock/            test input only, regions A and B
//
// A picture is found by its files: data/scene.json for the ocean (the ACTIVE dataset), and every
// data/<folder>/scene.json. PICTURES is every picture with a scene (the globe shows them all).
// SOURCES is the pictures that also have measurements (features.json): the app plays those.
//
// Never compare numbers between pictures (Dev A, 15 Nov): each is drawn and measured with its own
// settings. Every comparison helper here takes ONE source, so two pictures can never meet.
import type { EarthTrack } from '../audio/earthVoice';
import { LINE_GRID, RADAR_GRID, STRENGTH_FLOOR, TEST_CIRCLE, type Pixels, type ScanMeasure } from '../audio/scanScore';
import { OCEAN_LAND, type LandRule } from '../globe/geo';
import { ACTIVE, type Dataset } from './dataset';
import { makeAerosolTestPicture, makeRainTestMask, makeRainTestPicture } from './testPictures';
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
  /** What each instrument means in this picture's own legend. `blue`, when present, gives colours
   *  on the blue side their own instrument (a third class: scanScore.ts, isBlue). */
  instruments: { warm: string; cool: string; blue?: string };
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
  /** TEST INPUT only (practice data): the made-up picture the scan reads in place of a NASA still,
   *  and the pixels it never reads. */
  test?: { pixels: () => Pixels; mask?: () => Uint8Array };
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

/** The rain picture's scan mask (analysis/scan_mask.py): its land, a photo, is never read. */
const imergMask: string | null = MASKS['../../../data/imerg/scan_mask.png'] ?? null;

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
  measured: {
    floor255: 12,
    exactQuiet90Cells: 746,
    exactQuiet90Sounding: 0,
    exactQuiet90Largest255: 7.67,
    largestLineMean: 0.463,
    largestRadarMean: 0.8,
    linePeaks: 112,
    lineLeftOut: 44,
    radar0Peaks: 102,
    radar0LeftOut: 46,
    radar1Peaks: 187,
    radar1LeftOut: 115,
    bar0SwitchPct: 74.4,
    bar0SwitchValue: 23.6,
    bar0LabelsOffC: 0.07,
    bar0HueSamePct: 99.65,
    stillDifference: 6.93,
  },
  limits: [
    'Lines of some colours are drawn paler than others (light blue the most), so the same amount of line sounds a little quieter in those colours.',
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

/**
 * The aerosol picture. Settings from the procedure in docs/measurements/scan_pictures.md (floor: its
 * commonest colour, the grey-green land, plus 12 grey levels; full levels: its largest cell means,
 * rounded up to 0.05). No mask: aerosol over land is data. Approved by Developer A, 15 Nov, with
 * its limits: sea salt is quiet and dust rings the same instrument as sea salt and sulfate.
 */
const AEROSOLS_MEASURED = {
  floor255: 20,
  backgroundSpread: 8,
  quiet90Cells: 194,
  quiet90Sounding: 0,
  quiet90Largest255: 11.07,
  greyLand90Cells: 201,
  greyLand90Sounding: 0,
  largestLineMean: 0.429,
  largestRadarMean: 0.77,
  linePeaks: 47,
  lineLeftOut: 11,
  lineWarm: 3,
  lineCool: 33,
  radar0Peaks: 55,
  radar0LeftOut: 21,
  radar1Peaks: 0,
  radar1LeftOut: 0,
  radar1LargestMean: 0.15,
  bar0Steps: 4,
  bar0WarmSteps: 1,
  stillDifference: 2.65,
};
export const AEROSOLS_SCAN: ScanRule = {
  status: 'measured',
  measure: 'colour',
  floor: 20 / 255,
  full: { line: 0.45, radar: 0.8 },
  mask: null,
  worldMap: true,
  instruments: {
    warm: 'black carbon (smoke from fires), drawn orange-red',
    cool: 'dust (lilac), sea salt (pale grey-teal) and sulfate (green)',
  },
  still: { frame: 'the one still', time: '2025-08-19T20:00Z', how: 'NASA\'s only frame of this picture, scaled down for the app' },
  measured: AEROSOLS_MEASURED,
  limits: [
    `Sea salt is drawn pale grey-teal, barely coloured, so it is nearly silent: the sea-salt circle strikes no note, and its most colourful cell measures ${AEROSOLS_MEASURED.radar1LargestMean}, so its loudest held note is about a tenth of full loudness.`,
    'Dust, sea salt and sulfate all ring the same instrument. Only black carbon (smoke) strikes the other.',
    'Loudness is how strongly coloured the drawing is, not how much aerosol there is.',
  ],
};

/**
 * The rain picture. Its land is a satellite photo, so it is masked (analysis/scan_mask.py); its
 * empty sea is drawn navy, so the floor is the navy's own strength plus 12 grey levels. Snow, drawn
 * cyan to purple, has its own instrument (Developer A, 15 Nov). Null when the mask is missing.
 */
const IMERG_MEASURED = {
  floor255: 30,
  backgroundSpread: 18.2,
  quiet90Cells: 1108,
  quiet90Sounding: 1,
  largestLineMean: 0.81,
  largestRadarMean: 0.9,
  linePeaks: 18,
  lineLeftOut: 2,
  lineChimes: 16,
  lineBlue: 5,
  radar0Peaks: 50,
  radar0LeftOut: 19,
  radar1Peaks: 11,
  radar1LeftOut: 4,
  maskPct: 40.21,
  legend10Cells: 742,
  legend10Sounding: 510,
  bar0Steps: 10,
  bar0WarmSteps: 7,
  bar0SwitchStep: 4,
  bar0BlueSteps: 0,
  bar1Steps: 10,
  bar1WarmSteps: 0,
  bar1BlueSteps: 10,
  stillDifference: 4.48,
  stillRunnerUpDifference: 7.84,
  stillCandidates: 30,
};
export const IMERG_SCAN: ScanRule | null = imergMask
  ? {
      status: 'measured',
      measure: 'colour',
      floor: 30 / 255,
      full: { line: 0.85, radar: 0.95 },
      mask: { url: imergMask, what: 'land, which in this picture is a satellite photo, not rain data' },
      worldMap: true,
      instruments: {
        warm: 'rain drawn yellow, orange or red (steps 4 to 10 of NASA\'s rain bar)',
        cool: 'rain drawn green or yellow-green (steps 1 to 3 of the rain bar)',
        blue: 'snow, drawn cyan to purple (every step of NASA\'s snow bar)',
      },
      still: { frame: 'frame 0', time: '2026-11-14T00:00Z', how: 'the first of the 30 hourly frames, found by comparing the still with each of them' },
      measured: IMERG_MEASURED,
      limits: [
        `Over land the scan reads nothing: land is a photo here (${IMERG_MEASURED.maskPct}% of the map). No data there, not "no rain".`,
        `The empty sea is drawn navy, so the floor sits above it, and thin or faint rain at sea can be too faint to sound: of the ${IMERG_MEASURED.legend10Cells} map cells that are 10% or more rain or snow colour, ${IMERG_MEASURED.legend10Sounding} sound.`,
        'NASA\'s rain bar has no numbers on it. Its legend calls yellow 0.5 to 1 mm an hour, so the warm instrument starts at about 0.5 mm an hour: read from the legend\'s words, not measured (Unverified).',
        'It describes the drawn rain picture, not how much it rains.',
      ],
    }
  : null;

/**
 * TEST INPUT pictures for the browser tests (VITE_DATASET=practice-pictures): the practice data,
 * plus a made-up rain picture and a made-up aerosol picture read with the REAL rain and aerosol
 * rules. Only the still (and the rain picture's mask) are made up; the settings are the real ones.
 */
function practicePictures(practice: Picture): Picture[] {
  const list: Picture[] = [practice];
  const testRule = (rule: ScanRule, mask: string | null): ScanRule => ({
    ...rule,
    status: 'test input',
    worldMap: false,
    mask: mask ? { url: '', what: mask } : null,
    still: { frame: 'TEST INPUT', time: null, how: 'made up by the code (data/testPictures.ts), not NASA data' },
    limits: ['A made-up picture with a known answer, for testing. Not NASA data.'],
  });
  list.push({
    ...practice,
    key: 'aerosols',
    label: 'Aerosols',
    short: 'Aerosols',
    kind: 'Test input, not NASA data',
    firstLetter: 'C',
    regionStyle: 'neutral',
    scan: testRule(AEROSOLS_SCAN, null),
    test: { pixels: makeAerosolTestPicture },
  });
  if (IMERG_SCAN) {
    list.push({
      ...practice,
      key: 'imerg',
      label: 'Rain',
      short: 'Rain',
      kind: 'Test input, not NASA data',
      firstLetter: 'E',
      regionStyle: 'neutral',
      scan: testRule(IMERG_SCAN, 'the block that stands for land'),
      test: { pixels: makeRainTestPicture, mask: makeRainTestMask },
    });
  }
  return list;
}

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
    const practice: Picture = {
      ...ACTIVE,
      key: 'practice',
      label: 'Practice',
      short: 'Practice picture',
      kind: 'Test input, not NASA data',
      firstLetter: 'A',
      regionStyle: 'hue',
      resource: 'practice',
      landRule: OCEAN_LAND,
      scan: PRACTICE_SCAN,
    };
    return import.meta.env.VITE_DATASET === 'practice-pictures' ? practicePictures(practice) : [practice];
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
  if (picture.key === 'ocean' || picture.key === 'practice') return 'It describes the picture, not water speed or ocean health.';
  return 'It describes the picture, not the amounts it shows.';
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
