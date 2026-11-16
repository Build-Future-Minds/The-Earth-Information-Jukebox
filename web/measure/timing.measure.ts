// Does it matter when each held oscillator starts? Records the start times of real builds of the
// scan's held notes, then renders the same notes offline, dry, started at exactly those times
// (timing.ts). Writes docs/measurements/scan_timing.*. Nothing here changes the app's sound.
// Run: npm run measure   (from web/). This part takes about a minute; nothing is recorded in real time.
import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../..', import.meta.url));
/** How many real builds are recorded, and so how many start patterns are rendered. */
const BUILDS = 20;

interface Render {
  starts: number;
  lufs: number;
  tones: number[];
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => Math.sqrt(xs.reduce((s, x) => s + (x - mean(xs)) ** 2, 0) / (xs.length - 1));
const stats = (xs: number[]) => ({ mean: mean(xs), sd: sd(xs), min: Math.min(...xs), max: Math.max(...xs), range: Math.max(...xs) - Math.min(...xs) });
/** For each held note, how far its level moved across the renders (largest − smallest), in dB. */
const toneRanges = (renders: Render[]) => renders[0].tones.map((_, k) => Math.max(...renders.map((r) => r.tones[k])) - Math.min(...renders.map((r) => r.tones[k])));
const median = (xs: number[]) => {
  const s = [...xs].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};
const row = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`;
const table = (head: string[], rows: (string | number)[][]) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');

test('the held notes started at the times of real builds, rendered offline', async ({ page, browser }) => {
  test.setTimeout(10 * 60_000);
  await page.goto('/#play');
  await expect(page.getByRole('heading', { name: /Earth Sonata/ })).toBeVisible();

  const live = (await page.evaluate(`import('/measure/timing.ts').then((m) => m.liveStarts(${BUILDS}))`)) as { sampleRate: number; quantumSeconds: number; builds: number[][] };
  const offline = (await page.evaluate(`import('/measure/timing.ts').then((m) => m.startSpread(${JSON.stringify(live.builds)}))`)) as {
    sound: string;
    renderSeconds: number;
    measuredFrom: number;
    notes: string[];
    together: Render[];
    asBuilt: Render[];
    choirAlone: Render[];
  };

  // Start times in quanta (128 samples) after the build's first start.
  const quanta = live.builds.map((b) => b.map((t) => t / live.quantumSeconds));
  const moments = quanta.map((q) => new Set(q.map((x) => Math.round(x * 1000) / 1000)).size);
  const spreadMs = live.builds.map((b) => 1000 * Math.max(...b));
  const offGrid = Math.max(...quanta.flat().map((x) => Math.abs(x - Math.round(x))));
  const distinctPatterns = new Set(quanta.map((q) => q.map((x) => Math.round(x)).join(','))).size;
  const together = Math.abs(offline.together[0].lufs - offline.together[1].lufs);
  const togetherTones = Math.max(...offline.together[0].tones.map((t, k) => Math.abs(t - offline.together[1].tones[k])));
  const asBuilt = { lufs: stats(offline.asBuilt.map((r) => r.lufs)), toneRange: toneRanges(offline.asBuilt) };
  const choirAlone = { lufs: stats(offline.choirAlone.map((r) => r.lufs)), toneRange: toneRanges(offline.choirAlone) };

  // ---------- Report ----------
  const meta = {
    date: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    browser: `Chromium ${browser.version()} (headless)`,
    commit: git('rev-parse', '--short', 'HEAD') || 'unknown',
    dirty: git('status', '--porcelain', '--', 'web/src', 'data') ? 'yes' : '',
  };
  const f1 = (x: number) => x.toFixed(1);
  const f2 = (x: number) => x.toFixed(2);
  const starts = live.builds[0].length;
  const out: string[] = [];
  out.push('# Picture scan: do the held notes\' start times change how loud they are?', '');
  out.push('Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.', '');
  out.push(`Recorded ${meta.date} in ${meta.browser}, on commit ${meta.commit}${meta.dirty ? ' with uncommitted changes' : ''}, at ${live.sampleRate} samples a second.`);
  out.push('The scan starts each held oscillator without a time (`instruments.ts`, ScanChoir and RichBass), and Tone.js reads a missing time as "now". While the audio runs, "now" moves in steps of one render quantum (128 samples) as the oscillators are made, so they need not start together.');
  out.push(`Two oscillators started one quantum apart differ in phase by 360° × frequency × 128 ÷ ${live.sampleRate}: ${(261.6256 * live.quantumSeconds).toFixed(2)} of a cycle at C4. Where two notes share a partial of exactly the same frequency (C3's second harmonic is C4; the low note C2's second and fourth harmonics are C3 and C4), the two add with that phase difference.`);
  out.push('Nobody listened: these are measurements of renders.', '');

  out.push('## Start times in real builds', '');
  out.push(`The held notes of the Ocean choir built as the scan builds them (\`timing.ts\`, liveStarts: the choir's 3 vibrato oscillators and 12 notes, then the low note's 6 oscillators), ${live.builds.length} times in a page of the app with the audio running. Each build's start times are taken from Tone.js's own start(), unchanged.`, '');
  out.push(
    table(
      ['Builds', 'Starts in each build', 'Builds whose starts were not all at one time', 'Different start moments in one build: fewest, most', 'First to last start: middle, largest', 'Different start patterns'],
      [[live.builds.length, starts, `${moments.filter((m) => m > 1).length} of ${live.builds.length}`, `${Math.min(...moments)}, ${Math.max(...moments)}`, `${f1(median(spreadMs))} ms, ${f1(Math.max(...spreadMs))} ms`, `${distinctPatterns} of ${live.builds.length}`]],
    ),
    '',
  );
  out.push(`Every start fell on a whole quantum after the first (largest distance from one: ${offGrid.toFixed(4)} of a quantum).`, '');
  out.push('Each build\'s start times, in quanta after its first start, in build order (vibrato ×3, notes C3 to C6, low note ×6):', '');
  out.push(table(['Build', 'Start times (quanta)'], quanta.map((q, i) => [i + 1, q.map((x) => Math.round(x)).join(' ')])), '');

  out.push('## The same notes rendered offline, started at those times', '');
  out.push(`The ${offline.notes.length} held notes at full level with the tone fully open, and the low note (its first root, C2, with its octave and fifth) at full level, rendered offline and dry (no reverb) for ${offline.renderSeconds} s and measured from ${offline.measuredFrom} s on, as \`repeat.ts\` renders them through its reverbs. Offline, nothing else changes from one render to the next.`, '');
  out.push(
    table(
      ['', 'Renders', 'Loudness: mean', 'Standard deviation', 'Lowest to highest', 'Range'],
      [
        ['All started at one time', offline.together.length, `${f2(mean(offline.together.map((r) => r.lufs)))} LUFS`, '', '', `${together.toFixed(3)} LU`],
        ['Started at the times of the real builds', offline.asBuilt.length, `${f2(asBuilt.lufs.mean)} LUFS`, `${f2(asBuilt.lufs.sd)} LU`, `${f2(asBuilt.lufs.min)} to ${f2(asBuilt.lufs.max)} LUFS`, `${f2(asBuilt.lufs.range)} LU`],
        ['The choir alone (no low note), started at the same times', offline.choirAlone.length, `${f2(choirAlone.lufs.mean)} LUFS`, `${f2(choirAlone.lufs.sd)} LU`, `${f2(choirAlone.lufs.min)} to ${f2(choirAlone.lufs.max)} LUFS`, `${f2(choirAlone.lufs.range)} LU`],
      ],
    ),
    '',
  );
  out.push(`The two renders started at one time differ by ${together.toFixed(3)} LU in loudness and ${togetherTones.toFixed(3)} dB at most in any held note's level.`, '');

  out.push('## How far each held note\'s level moved between renders', '');
  out.push('Largest minus smallest, in dB. The level is taken within 3% of the note, both channels, so other tones that fall there count too.', '');
  out.push(table(['Band', 'Note', 'Started as built', 'Choir alone'], offline.notes.map((note, k) => [k, note, f2(asBuilt.toneRange[k]), f2(choirAlone.toneRange[k])])), '');
  out.push(`Middle (median) of the twelve: started as built ${f2(median(asBuilt.toneRange))} dB, choir alone ${f2(median(choirAlone.toneRange))} dB.`, '');
  out.push('Each render\'s loudness, in order (the start pattern of build 1, 2 …):', '');
  out.push(
    table(
      ['', ...offline.asBuilt.map((_, i) => `${i + 1}`)],
      [
        ['Started as built', ...offline.asBuilt.map((r) => f2(r.lufs))],
        ['Choir alone', ...offline.choirAlone.map((r) => f2(r.lufs))],
      ],
    ),
    '',
  );

  const folder = resolve(repo, 'docs/measurements');
  mkdirSync(folder, { recursive: true });
  writeFileSync(resolve(folder, 'scan_timing.json'), JSON.stringify({ meta, live, offline, together, togetherTones, asBuilt, choirAlone }, null, 1) + '\n');
  writeFileSync(resolve(folder, 'scan_timing.md'), out.join('\n'));
  console.log(out.join('\n'));

  expect(live.builds.every((b) => b.length === starts), 'every build starts the same number of oscillators').toBe(true);
  expect(offline.asBuilt.every((r) => r.starts === starts), 'each offline render uses the whole start pattern').toBe(true);
  expect(offGrid, 'start times fall on whole quanta').toBeLessThan(0.01);
  expect(together, 'two renders started at one time must be the same').toBeLessThan(0.001);
});
