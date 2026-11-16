// How it's made shows no number of its own: each one is a constant the app plays by, or a value in a
// JSON file written by the code that measured it. These tests hold the page to the code that owns
// each number (the way RULE_TEXT holds the rule), so the page cannot disagree with the sound.
import { describe, expect, it } from 'vitest';
import accessibilityLog from '../../../docs/ACCESSIBILITY_LOG.md?raw';
import productMd from '../../../PRODUCT.md?raw';
import listeningGame from '../../../tools/listening_game.html?raw';
import { LONG_AT_A0, LONG_AT_A1, longFraction } from '../audio/earthVoice';
import { GLOCKENSPIEL, MUSIC_BOX } from '../audio/instruments';
import { HONESTY_LINES } from '../data/honesty';
import {
  barRoots,
  CHANCE,
  CHECKS,
  column,
  experiment,
  GAME_RULE,
  gameBaseNote,
  gameHold,
  gameNoteName,
  guessingTail,
  LISTENING_PASS,
  LISTENING_RESULTS,
  MAP,
  NASA,
  NASA_SCENES,
  OCEAN_FEATURES,
  OCEAN_REGIONS,
  SETTINGS,
} from './data';

const FILES: Record<string, string> = {
  'PRODUCT.md': productMd,
  'docs/ACCESSIBILITY_LOG.md': accessibilityLog,
  'tools/listening_game.html': listeningGame,
};
const read = (path: string) => FILES[path].replace(/\r\n/g, '\n');

describe('the engine settings on the page are the ones the app plays', () => {
  it('threshold and evidence gate: the same in the experiments, the played data, the map and the NASA report', () => {
    const { gradient_threshold, min_usable_fraction } = OCEAN_FEATURES.normalisation;
    expect(SETTINGS.gradient_threshold).toBe(gradient_threshold);
    expect(SETTINGS.min_usable_fraction).toBe(min_usable_fraction);
    expect(MAP.measurement.gradient_threshold).toBe(gradient_threshold);
    expect(MAP.measurement.min_usable_fraction).toBe(min_usable_fraction);
    expect(NASA.settings.gradient_threshold).toBe(gradient_threshold);
    expect(NASA.settings.blur_sigma).toBe(SETTINGS.blur_sigma);
  });

  it('the mask margin is the blur plus one pixel of Sobel', () => {
    expect(SETTINGS.blur_radius_px).toBe(Math.ceil(4 * SETTINGS.blur_sigma));
    expect(SETTINGS.support_radius_px).toBe(SETTINGS.blur_radius_px + 1);
    expect(1 / SETTINGS.sobel_scale).toBe(8);
  });

  it('the map uses the regions’ radius', () => {
    for (const { region } of OCEAN_REGIONS) expect(region.radius_px).toBe(MAP.measurement.radius_px);
  });
});

describe('the rule', () => {
  it('the engine and the app share the end points', () => {
    expect(CHECKS.settings.rhythm.long_fraction_at_zero).toBe(LONG_AT_A0);
    expect(CHECKS.settings.rhythm.long_fraction_at_one).toBe(LONG_AT_A1);
  });

  it('every row of the rule table is what the app computes', () => {
    const e = experiment('mapping');
    const a = column(e, 'alignment') as number[];
    const lf = column(e, 'long_fraction') as number[];
    a.forEach((v, i) => expect(longFraction(v)).toBeCloseTo(lf[i], 4));
  });
});

describe('the honesty lines', () => {
  it('are the three lines in PRODUCT.md, and each links into How it’s made', () => {
    const product = read('PRODUCT.md').replace(/\s+/g, ' ');
    expect(HONESTY_LINES).toHaveLength(3);
    for (const line of HONESTY_LINES) {
      expect(product).toContain(line.text);
      expect(line.href).toMatch(/^#how\/[a-z0-9-]+$/);
    }
  });
});

describe('the listening game’s own rule, read back out of the game', () => {
  const game = read('tools/listening_game.html');

  it('base note = round(2 + 13 s) on C pentatonic from C3: E3 to C6', () => {
    const m = /Math\.round\((\d+) \+ spread\(a\) \* (\d+)\)/.exec(game);
    expect(m && [Number(m[1]), Number(m[2])]).toEqual([GAME_RULE.baseOffset, GAME_RULE.baseSpan]);
    expect(game).toContain(`"${GAME_RULE.scale}"[i] + o`);
    expect(game).toContain(`for (let o = ${GAME_RULE.firstOctave};`);
    expect([gameNoteName(gameBaseNote(0)), gameNoteName(gameBaseNote(1))]).toEqual(['E3', 'C6']);
  });

  it('notes are held for 0.95 s plus a random part for swirly patches, at most 0.97', () => {
    const m = /Math\.min\(([\d.]+), ([\d.]+) \* s \+ wobble \* \(([\d.]+) \+ ([\d.]+) \* rand\(\)\)\)/.exec(game);
    expect(m && m.slice(1).map(Number)).toEqual([GAME_RULE.holdCap, GAME_RULE.holdLinedUp, GAME_RULE.holdSwirlyMin, GAME_RULE.holdSwirlyRandom]);
    expect(gameHold(1)).toEqual([GAME_RULE.holdLinedUp, GAME_RULE.holdLinedUp]);
  });
});

describe('the struck bars', () => {
  it('the page’s roots of cos x cosh x = ±1 give the ratios the instruments play', () => {
    const ratios = (roots: number[]) => roots.map((x) => (x / roots[0]) ** 2);
    const free = ratios(barRoots(1, GLOCKENSPIEL.partials.length));
    const clamped = ratios(barRoots(-1, MUSIC_BOX.partials.length));
    GLOCKENSPIEL.partials.forEach((p, i) => expect(free[i]).toBeCloseTo(p.ratio, 3));
    MUSIC_BOX.partials.forEach((p, i) => expect(clamped[i]).toBeCloseTo(p.ratio, 3));
    expect(barRoots(1, 1)[0]).toBeCloseTo(4.73004, 4);
    expect(barRoots(-1, 1)[0]).toBeCloseTo(1.8751, 4);
  });
});

describe('chance and the listening test', () => {
  it('the chance constant is √π / 2, and the experiments use the same', () => {
    expect(CHANCE).toBe('0.886');
    const crop = experiment('crop');
    const n = column(crop, 'dashes in box (about)') as number[];
    const p = column(crop, '0.886/sqrt(n)') as number[];
    n.forEach((v, i) => expect(Math.abs(p[i] - Math.sqrt(Math.PI) / 2 / Math.sqrt(v))).toBeLessThan(2e-3));
  });

  it('guessing 9 or more of 10 right: 11 in 1024', () => {
    expect(guessingTail(10, 9)).toEqual({ ways: 11, of: 1024, p: 11 / 1024 });
  });

  it('the pass mark is the one set in ACCESSIBILITY_LOG.md', () => {
    const log = read('docs/ACCESSIBILITY_LOG.md');
    expect(Number(/answers (\d+) questions/.exec(log)?.[1])).toBe(LISTENING_PASS.questions);
    expect(Number(/(\d+) or more correct counts as hearing the difference/.exec(log)?.[1])).toBe(LISTENING_PASS.correct);
  });

  it('says "not run yet" only while the log has no results', () => {
    const log = read('docs/ACCESSIBILITY_LOG.md');
    // The data rows of the first table under a heading (after its header and --- rows) that hold anything.
    const tableRows = (heading: string): string[] => {
      const lines = (log.split(heading)[1] ?? '').split('\n');
      const table: string[] = [];
      for (let i = lines.findIndex((l) => l.startsWith('|')); i >= 0 && i < lines.length && lines[i].startsWith('|'); i++) table.push(lines[i]);
      return table.slice(2).filter((l: string) => l.split('|').slice(1, -1).some((c) => c.trim() !== ''));
    };
    const results = [...tableRows('### Team members'), ...tableRows('### Outside listeners')];
    // When a listener's result is logged, this fails: show the results on the page (LISTENING_RESULTS).
    expect(results.length > 0).toBe(LISTENING_RESULTS !== null);
  });
});

describe('the pictures', () => {
  it('every NASA picture has a page, a credit and a kind of data, ocean first', () => {
    expect(NASA_SCENES[0].source.svs_id).toBe(3912);
    for (const s of NASA_SCENES) {
      expect(s.source.url).toMatch(/^https:\/\/svs\.gsfc\.nasa\.gov\//);
      expect(s.source.credit.length).toBeGreaterThan(10);
      expect(['model_output', 'observation']).toContain(s.source.data_kind);
    }
  });
});
