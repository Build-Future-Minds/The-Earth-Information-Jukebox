// Every number "How it's made" shows comes from here: a JSON file written by the code that measured
// it, or a constant the app itself plays by. Nothing is typed by hand (how.test.ts checks the
// constants against the code that owns them).
//
//   docs/measurements/math_checks.json   analysis/run_experiments.py   TEST INPUTS (synthetic pictures)
//   docs/measurements/nasa_regions.json  analysis/explore_regions.py   NASA SVS 3912 frames, four circles
//   docs/measurements/scan_pictures.json web/measure (npm run measure) the picture scan on the NASA stills
//   docs/measurements/scan_sound.json    web/measure (npm run measure) recordings of the running app
//   docs/measurements/test_counts.json   web/scripts/count-tests.mjs   a real run of the three test suites
//   data/alignment_map.json, data/features.json, data/scene.json      the NASA ocean picture the app plays
//
// The NASA files are imported directly, not through the app's dataset switch: this page reports what
// was measured on the real picture, even when the rest of the app runs on practice data.
import checksJson from '../../../docs/measurements/math_checks.json';
import nasaJson from '../../../docs/measurements/nasa_regions.json';
import scanPicturesJson from '../../../docs/measurements/scan_pictures.json';
import scanSoundJson from '../../../docs/measurements/scan_sound.json';
import countsJson from '../../../docs/measurements/test_counts.json';
import mapJson from '../../../data/alignment_map.json';
import featuresJson from '../../../data/features.json';
import sceneJson from '../../../data/scene.json';
import type { Features, Scene } from '../data/types';

export type Cell = string | number | null;
export interface Experiment {
  id: string;
  title: string;
  expected: string;
  columns: string[];
  rows: Cell[][];
}

export const CHECKS = checksJson as unknown as {
  run: { date: string; python: string; numpy: string; opencv: string };
  settings: {
    analysis: {
      gradient_threshold: number;
      min_usable_fraction: number;
      gray_mode: string;
      blur_sigma: number;
      weight_power: number;
      epsilon: number;
      sobel_scale: number;
      luma_rgb: [number, number, number];
      blur_radius_px: number;
      support_radius_px: number;
    };
    rhythm: { beat_seconds: number; long_fraction_at_zero: number; long_fraction_at_one: number; note_seconds: number };
  };
  experiments: Record<string, Experiment>;
};
export const SETTINGS = CHECKS.settings.analysis;

/** An experiment by its table id (science_review.md's marker, e.g. "mapping") or its function name. */
export function experiment(id: string): Experiment {
  const found = Object.values(CHECKS.experiments).find((e) => e.id === id) ?? CHECKS.experiments[id];
  if (!found) throw new Error(`math_checks.json has no experiment ${id}`);
  return found;
}

/** One column of an experiment, by its name in the table. */
export function column(e: Experiment, name: string): Cell[] {
  const i = e.columns.indexOf(name);
  if (i < 0) throw new Error(`${e.id} has no column "${name}"`);
  return e.rows.map((row) => row[i]);
}

export const numbers = (cells: Cell[]): number[] => cells.map((c) => (typeof c === 'number' ? c : NaN));

/** The row of an experiment whose first cell is `key`. */
export function row(e: Experiment, key: Cell): Record<string, Cell> {
  const found = e.rows.find((r) => r[0] === key);
  if (!found) throw new Error(`${e.id} has no row ${String(key)}`);
  return Object.fromEntries(e.columns.map((c, i) => [c, found[i]]));
}

interface CircleSummary {
  ok: number;
  missing: number;
  mean: number;
  usable_mean: number;
  lonlat: [number, number];
  unstretched_mean: number;
}
export const NASA = nasaJson as unknown as {
  date: string;
  frames: number[];
  settings: Record<string, number | string>;
  regions: Record<string, CircleSummary>;
  sensitivity: Record<string, Record<string, { ok: number; missing: number; mean: number | null; usable_mean: number }>>;
};

interface ScanCounts { cells: number; sounding: number; peaks: number; afterSpacing: number; chimes: number; warm: number; cool: number; largestCellMean: number }
// One section per picture (scan_pictures.json, `npm run measure`): never read a number of one
// picture as another's. This page is about the ocean picture, so it reads only the ocean's.
export const SCAN = scanPicturesJson as unknown as {
  meta: { date: string; browser: string; commit: string };
  pictures: {
    key: string;
    title: string;
    svs: number;
    line: { colour: ScanCounts };
    regions: { id: string; name: string; radar: ScanCounts }[];
    /** Every measured number the app quotes for this picture, as `npm run measure` wrote it. */
    quoted: Record<string, number>;
  }[];
};
export const OCEAN_SCAN = SCAN.pictures.find((p) => p.key === 'ocean')!;
/** The warm/cool switch in °C on NASA's colour bar: its edge read through the line the bar's four printed labels lie on (web/measure/audit.ts). */
export const BAR_SWITCH_C = OCEAN_SCAN.quoted.bar0SwitchValue;
/** How far the bar's printed labels sit from that straight line, at most, in °C. */
export const BAR_LABELS_OFF_C = OCEAN_SCAN.quoted.bar0LabelsOffC;

/** The ocean's grey land and black sea, measured on NASA's uncompressed frame: the cells that are 90% or more of either. */
export const EXACT_QUIET = {
  least: 0.9,
  cells: OCEAN_SCAN.quoted.exactQuiet90Cells,
  sounding: OCEAN_SCAN.quoted.exactQuiet90Sounding,
  /** The largest mean colour strength among them, 0 to 1 (the report gives it in 255ths). */
  largestStrength: OCEAN_SCAN.quoted.exactQuiet90Largest255 / 255,
};
/** Where the warm and cool instruments switch along NASA's ocean colour bar, as a share of its length. */
export const BAR_SWITCH = OCEAN_SCAN.quoted.bar0SwitchPct / 100;

export const SOUND = scanSoundJson as unknown as {
  meta: { date: string };
  steps: { band: number; note: string; steps: { level: number; toneDb: number }[] };
  pictures: { label: string; sweeps: { name: string; firstSixth: { leftMinusRightDb: number }; lastSixth: { leftMinusRightDb: number } }[] }[];
};
/** The ocean picture's sweeps (one section per picture in scan_sound.json). */
export const OCEAN_SWEEPS = SOUND.pictures.find((p) => p.label === 'Ocean')!.sweeps;

export interface SuiteCount { command: string; total: number; passed: number; failed: number; skipped: number }
export const COUNTS = countsJson as unknown as {
  date: string;
  commit: string;
  uncommitted_changes: boolean;
  suites: { engine: SuiteCount; unit: SuiteCount; browser: SuiteCount | null };
};

export const MAP = mapJson as unknown as {
  frame: { file_number: number; source_time: string };
  measurement: { radius_px: number; gradient_threshold: number; min_usable_fraction: number };
  grid: { step_px: number; columns: number; rows: number; first_center_px: [number, number]; image_width: number; image_height: number };
  summary: { points: number; with_a_number: number; min: number; max: number };
  checked_against_features: { region: string; center_px: [number, number]; map: number; features: number }[];
  alignment: (number | null)[][];
};

export const OCEAN_SCENE = sceneJson as unknown as Scene;
export const OCEAN_FEATURES = featuresJson as unknown as Features;

/** The NASA ocean picture's regions in the app's order, with their letters (A, B). */
export const OCEAN_REGIONS = OCEAN_SCENE.regions.map((region, i) => ({
  region,
  letter: String.fromCharCode(65 + i),
  className: i === 0 ? 'how-region-a' : 'how-region-b',
}));

/** Each region's alignment over the frames, as the app plays it (smoothed by features.py). */
export function regionSeries(regionId: string) {
  return OCEAN_FEATURES.steps.filter((s) => s.region === regionId).sort((a, b) => a.t - b.t);
}

/** "2007-03-25T12:00Z" as "25 Mar 2007, 12:00 UTC", for people. */
export function modelTime(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})Z$/.exec(iso ?? '');
  if (!m) return iso ?? '';
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m[2]) - 1];
  return `${Number(m[3])} ${month} ${m[1]}, ${m[4]}:${m[5]} UTC`;
}

/** "too_few_edges" as "too few edges": a reason code read as words. */
export const reasonWords = (code: string | null | undefined) => (code ?? '').replace(/_/g, ' ');

/** √π / 2 ≈ 0.886: the mean length of a 2-D random walk of n unit steps is this times √n (chance level). */
export const CHANCE = (Math.sqrt(Math.PI) / 2).toFixed(3);

export function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** The p-th percentile (0 to 100) by linear interpolation, as numpy's default does. */
export function percentile(sorted: number[], p: number): number {
  const at = ((sorted.length - 1) * p) / 100;
  const lo = Math.floor(at);
  return lo + 1 < sorted.length ? sorted[lo] + (at - lo) * (sorted[lo + 1] - sorted[lo]) : sorted[lo];
}

// Every NASA picture's scene.json (ocean first), for the chain from the Earth to our pixels and the credits.
export const NASA_SCENES: Scene[] = Object.entries(
  import.meta.glob<{ default: unknown }>(['../../../data/scene.json', '../../../data/*/scene.json'], { eager: true }),
)
  .sort(([a], [b]) => a.split('/').length - b.split('/').length || a.localeCompare(b))
  .map(([, m]) => m.default as Scene);

/**
 * The listening test's pass mark, set before anyone listened (docs/ACCESSIBILITY_LOG.md, "Listening
 * task"): 10 questions per listener, 9 or more right counts as hearing the difference.
 * LISTENING_RESULTS stays null until that log has results; a unit test fails if the log gains a
 * result and this page still says "not run yet".
 */
export const LISTENING_PASS = { questions: 10, correct: 9 } as const;
export const LISTENING_RESULTS: null = null;

/** Chance of `atLeast` or more right out of `n` by guessing (probability 1/2 each): the binomial tail. */
export function guessingTail(n: number, atLeast: number): { ways: number; of: number; p: number } {
  let ways = 0;
  let choose = 1; // C(n, 0)
  for (let k = 0; k <= n; k++) {
    if (k >= atLeast) ways += choose;
    choose = (choose * (n - k)) / (k + 1);
  }
  const of = 2 ** n;
  return { ways, of, p: ways / of };
}

/**
 * The listening game's own rule (Student B's choice; tools/listening_game.html). Besides the team's
 * pulse spacing, the game maps alignment to a base note and to how long notes are held. `s` is
 * alignment placed within the picture's measured range (0 = the 10th percentile, 1 = the 90th).
 *   base note  = round(2 + 13 s) steps up C major pentatonic from C3  (E3 to C6)
 *   held for   = 0.95 s + (1 − s)(0.08 + 0.5 r), at most 0.97, r random in [0, 1)
 * how.test.ts reads these numbers back out of the game's source.
 */
export const GAME_RULE = {
  baseOffset: 2,
  baseSpan: 13,
  holdLinedUp: 0.95,
  holdSwirlyMin: 0.08,
  holdSwirlyRandom: 0.5,
  holdCap: 0.97,
  /** The game's scale, C major pentatonic: the steps within an octave, starting on C3. */
  scale: 'CDEGA',
  firstOctave: 3,
} as const;

export function gameNoteName(index: number): string {
  return `${GAME_RULE.scale[index % 5]}${GAME_RULE.firstOctave + Math.floor(index / 5)}`;
}
export const gameBaseNote = (s: number): number => Math.round(GAME_RULE.baseOffset + s * GAME_RULE.baseSpan);
export const gameHold = (s: number): [number, number] => [
  GAME_RULE.holdLinedUp * s + (1 - s) * GAME_RULE.holdSwirlyMin,
  Math.min(GAME_RULE.holdCap, GAME_RULE.holdLinedUp * s + (1 - s) * (GAME_RULE.holdSwirlyMin + GAME_RULE.holdSwirlyRandom)),
];

/**
 * Roots of cos x · cosh x = ±1, the Euler–Bernoulli beam's mode equation: +1 for a bar free at both
 * ends (bells), −1 for a bar clamped at one end (music box, kalimba). Found by bisection on each
 * sign change, so the page computes the tone ratios itself and the test compares them with
 * instruments.ts.
 */
export function barRoots(sign: 1 | -1, count: number): number[] {
  const f = (x: number) => Math.cos(x) * Math.cosh(x) - sign;
  const roots: number[] = [];
  // A free bar's equation is also solved by x = 0 (the bar not bending); start just above it.
  let a = 0.5;
  while (roots.length < count) {
    const b = a + 0.01;
    if (f(a) * f(b) < 0) {
      let lo = a, hi = b;
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (f(lo) * f(mid) <= 0) hi = mid;
        else lo = mid;
      }
      roots.push((lo + hi) / 2);
    }
    a = b;
  }
  return roots;
}
