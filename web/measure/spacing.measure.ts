// How far apart the held notes are against the ear's critical bandwidth, and how rough the choir
// is with all twelve notes at full level: the first spacing (the scale a step at a time from C3)
// against the current one. Writes docs/measurements/scan_spacing.*. The formulas and their sources
// are in spacing.ts. This file asks the browser for the choir's real filter response, records the
// real choir to check the model of its partials, and writes the report. Run: npm run measure (from web/).
import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ChoirDef } from '../src/audio/instruments';
import { bandNote } from '../src/audio/scanScore';
import { CURRENT_SPACING, FIRST_SPACING, SETHARES, choirPartials, dissonance, gaps, toMidi, type Partial } from './spacing';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const tap = <T>(page: Page, call: string) => page.evaluate(`import('/measure/tap.ts').then((m) => m.${call})`) as Promise<T>;

/**
 * Gain of the choir's filters at each frequency, from Web Audio's own filters (getFrequencyResponse),
 * set as ScanChoir sets them (instruments.ts): a low-pass (Q 0.6) at `lowpassHz`, and two vowel
 * peaks, 700 Hz (Q 2, +4 dB) and 1150 Hz (Q 3, +3 dB). The recording below checks the result.
 */
function filterGains(page: Page, hz: number[], lowpassHz: number, sampleRate: number): Promise<number[]> {
  return page.evaluate(
    ({ hz, lowpassHz, sampleRate }) => {
      const context = new OfflineAudioContext(1, 128, sampleRate);
      const make = (type: BiquadFilterType, frequency: number, q: number, gain = 0) => {
        const f = context.createBiquadFilter();
        f.type = type;
        f.frequency.value = frequency;
        f.Q.value = q;
        f.gain.value = gain;
        return f;
      };
      const filters = [make('lowpass', lowpassHz, 0.6), make('peaking', 700, 2, 4), make('peaking', 1150, 3, 3)];
      const at = new Float32Array(hz);
      const total = new Array(hz.length).fill(1);
      for (const f of filters) {
        const magnitude = new Float32Array(hz.length);
        f.getFrequencyResponse(at, magnitude, new Float32Array(hz.length));
        magnitude.forEach((m, i) => (total[i] *= m));
      }
      return total;
    },
    { hz, lowpassHz, sampleRate },
  );
}

const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};
const row = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`;
const table = (head: string[], rows: (string | number)[][]) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');
const db = (x: number) => 20 * Math.log10(x);

test('note spacing against critical bandwidth, and the roughness of the choir', async ({ page, browser }) => {
  test.setTimeout(120_000);
  await page.goto('/#play');
  await expect(page.getByRole('heading', { name: /Earth Sonata/ })).toBeVisible();
  const choir = (await page.evaluate(`import('/src/audio/instruments.ts').then((m) => m.scanSound('ocean').choir)`)) as ChoirDef;
  // All twelve bands at full level: the line's mean level is 1, so the tone is fully open.
  const lowpassHz = choir.lowpass[1];

  // ---------- The model, checked against a recording of the real choir ----------
  const recordings = [await tap<Recording>(page, 'recordChoirNote(0)'), await tap<Recording>(page, `recordChoirNote(${CURRENT_SPACING.length - 1})`)];
  const sampleRate = recordings[0].sampleRate;
  const withGains = async (partials: Partial[]) => {
    const gains = await filterGains(page, partials.map((p) => p.hz), lowpassHz, sampleRate);
    return partials.map((p, i) => ({ ...p, amp: p.amp * gains[i] }));
  };
  const checks = [];
  for (const rec of recordings) {
    const model = await withGains(choirPartials([bandNote(rec.band)], choir, () => 1));
    // The model's level at harmonic k: the power of the copies near k times the note, added.
    const level = (k: number) => db(Math.sqrt(model.filter((p) => Math.abs(p.hz / (k * rec.hz) - 1) < 0.015).reduce((s, p) => s + p.amp ** 2, 0)));
    const rows = rec.harmonics.map((h) => ({ k: h.k, hz: h.hz, recorded: h.db - rec.harmonics[0].db, model: level(h.k) - level(1) }));
    const counted = rows.filter((r) => r.model >= -40);
    checks.push({ note: rec.note, rows, counted: counted.length, largest: Math.max(...counted.map((r) => Math.abs(r.recorded - r.model))) });
  }

  // ---------- The two spacings ----------
  const spacings = [];
  for (const [name, notes] of [['First (a step at a time from C3)', FIRST_SPACING], ['Current', CURRENT_SPACING]] as const) {
    const partials = await withGains(choirPartials(toMidi([...notes]), choir, () => 1));
    const all = dissonance(partials, 'all');
    const adjacent = dissonance(partials, 'adjacent');
    const top = Array.from(all.byPair.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, value]) => {
        const [i, j] = key.split('-').map(Number);
        return { pair: `${notes[i]}–${notes[j]}`, share: value / all.between };
      });
    spacings.push({ name, notes: [...notes], partials: partials.length, gaps: gaps([...notes]), all: { ...all, byPair: undefined }, adjacent: { ...adjacent, byPair: undefined }, top });
  }
  const [first, current] = spacings;

  // ---------- Report ----------
  const meta = {
    date: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    browser: `Chromium ${browser.version()} (headless)`,
    commit: git('rev-parse', '--short', 'HEAD') || 'unknown',
    dirty: git('status', '--porcelain', '--', 'web/src', 'data') ? 'yes' : '',
  };
  const f1 = (x: number) => x.toFixed(1);
  const f2 = (x: number) => x.toFixed(2);
  const out: string[] = [];
  out.push('# Picture scan: how far apart the held notes are, and how rough they sound together', '');
  out.push('Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.', '');
  out.push(`Measured ${meta.date} in ${meta.browser}, on commit ${meta.commit}${meta.dirty ? ' with uncommitted changes' : ''}.`);
  out.push('Sources, and what is taken from each, are in `web/measure/spacing.ts` and `docs/DECISIONS.md`: Plomp and Levelt (1965) for the critical bandwidth and the rule of thumb, Sethares for the roughness formula.');
  out.push('**These are calculations from a model of hearing, not a listening test.** Nobody listened. Whether the current spacing sounds clearer is not measured here.', '');

  out.push('## Neighbouring held notes against the critical bandwidth', '');
  out.push('Plomp and Levelt (p. 555): two pure tones are most dissonant when they are 25% of a critical bandwidth apart, and consonant from 100% on. The bandwidth is their Fig. 9, at the geometric mean of the two notes (as they measured it).');
  out.push('"Sethares peak" is where Sethares\'s formula is roughest above the lower note (derived from its constants: spacing.ts, pairPeakHz). Both columns are about pure tones: the choir\'s harmonics come in the next section.', '');
  for (const s of spacings) {
    out.push(`**${s.name}:** ${s.notes.join(' ')}`, '');
    out.push(
      table(
        ['Notes', 'Hz', 'Gap', 'Critical bandwidth', 'Gap ÷ bandwidth', 'Sethares peak'],
        s.gaps.map((g) => [`${g.lower}–${g.upper}`, `${f1(g.lowerHz)}–${f1(g.upperHz)}`, `${f1(g.gapHz)} Hz`, `${f1(g.criticalBandwidth)} Hz`, f2(g.ofBandwidth), `${f1(g.setharesPeakHz)} Hz`]),
      ),
      '',
    );
    const under = (limit: number) => s.gaps.filter((g) => g.ofBandwidth < limit).length;
    out.push(`Of the ${s.gaps.length} neighbouring pairs: ${under(0.5)} closer than half a bandwidth, ${under(1)} closer than one bandwidth.`, '');
  }

  out.push('## Roughness of the choir, all twelve notes at full level', '');
  out.push(`The choir's partials: each note is ${choir.copies} saw waves detuned by ${choir.copies > 1 ? `${-choir.spread / 2} to +${choir.spread / 2}` : '0'} cents, each with harmonics k = 1, 2, 3 … at 1/k up to 12 kHz, times the gain of the choir's filters (Web Audio's own, as ScanChoir sets them: low-pass at ${lowpassHz} Hz, vowel peaks at 700 and 1150 Hz). Vibrato (±${choir.vibratoCents} cents) is left out.`);
  out.push(`Roughness is Sethares's formula (constants ${Object.entries(SETHARES).map(([k, v]) => `${k} = ${v}`).join(', ')}), summed over every pair of partials as his program does, and over neighbouring partials only as Plomp and Levelt did. The units are arbitrary: compare the two spacings, not the numbers with anything else.`, '');
  const ratio = (a: number, b: number) => (a > 0 ? f2(b / a) : 'n/a');
  out.push(
    table(
      ['', 'First spacing', 'Current spacing', 'Current ÷ first'],
      [
        ['Partials', first.partials, current.partials, ''],
        ['All pairs: total', f2(first.all.total), f2(current.all.total), ratio(first.all.total, current.all.total)],
        ['All pairs: between different notes', f2(first.all.between), f2(current.all.between), ratio(first.all.between, current.all.between)],
        ['All pairs: within one note', f2(first.all.within), f2(current.all.within), ratio(first.all.within, current.all.within)],
        [`All pairs: among the three lowest notes (${first.notes.slice(0, 3).join(' ')} / ${current.notes.slice(0, 3).join(' ')})`, f2(first.all.lowest), f2(current.all.lowest), ratio(first.all.lowest, current.all.lowest)],
        ['Neighbouring partials only: total', f2(first.adjacent.total), f2(current.adjacent.total), ratio(first.adjacent.total, current.adjacent.total)],
        ['Neighbouring partials only: between different notes', f2(first.adjacent.between), f2(current.adjacent.between), ratio(first.adjacent.between, current.adjacent.between)],
        ['Neighbouring partials only: among the three lowest notes', f2(first.adjacent.lowest), f2(current.adjacent.lowest), ratio(first.adjacent.lowest, current.adjacent.lowest)],
      ],
    ),
    '',
  );
  for (const s of spacings) out.push(`${s.name}: the note pairs that add most roughness between notes (all pairs): ${s.top.map((t) => `${t.pair} ${(100 * t.share).toFixed(1)}%`).join(', ')}.`);
  out.push('');

  out.push('## Check: the model of the partials against a recording of the real choir', '');
  out.push('The scan\'s own ScanChoir (Ocean choir) holding one note at full level with its tone fully open, recorded dry (without the room) for 8 s. Each harmonic\'s level, relative to the first, against the model\'s. Harmonics the model puts more than 40 dB under the first are left out.', '');
  for (const c of checks) {
    out.push(`**${c.note}:** largest difference ${f2(c.largest)} dB over ${c.counted} harmonics.`, '');
    out.push(table(['k', 'Hz', 'Recorded', 'Model', 'Difference'], c.rows.filter((r) => r.model >= -40).map((r) => [r.k, f1(r.hz), `${f1(r.recorded)} dB`, `${f1(r.model)} dB`, `${f2(r.recorded - r.model)} dB`])), '');
  }

  const folder = resolve(repo, 'docs/measurements');
  mkdirSync(folder, { recursive: true });
  writeFileSync(resolve(folder, 'scan_spacing.json'), JSON.stringify({ meta, choir, lowpassHz, sethares: SETHARES, spacings, checks }, null, 1) + '\n');
  writeFileSync(resolve(folder, 'scan_spacing.md'), out.join('\n'));
  console.log(out.join('\n'));

  for (const c of checks) expect(c.largest, `${c.note}: the model of the partials is more than 1.5 dB from the recording`).toBeLessThan(1.5);
});

interface Recording {
  band: number;
  note: string;
  hz: number;
  sampleRate: number;
  harmonics: { k: number; hz: number; db: number }[];
}
