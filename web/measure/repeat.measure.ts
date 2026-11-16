// Why does the same sweep not give the same loudness twice? Records the same map sweep of the
// ocean picture again and again, under three conditions, and renders the scan's held notes offline
// through many reverbs. Writes docs/measurements/scan_repeat.*. Nothing here changes the app's sound:
// condition B replaces the browser's random numbers with a fixed sequence, in this test page only.
// Run: npm run measure   (from web/). It plays in real time: about 22 minutes. Do not edit files under
// web/ while it runs: the dev server reloads the page, and a sweep is lost.
import { expect, test, type Browser, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { choosePicture } from './choose';

const repo = fileURLToPath(new URL('../..', import.meta.url));
/** How many sweeps under each condition. MEASURE_RUNS=1 gives a quick check that the test works; its numbers mean nothing. */
const RUNS = Number(process.env.MEASURE_RUNS ?? 10);
/** The fixed seed for condition B. */
const SEED = 20261115;

interface Tone {
  band: number;
  note: string;
  hz: number;
  db: number;
}
interface Sweep {
  lufs: number;
  peakDb: number;
  recorded: number;
  seconds: number;
  tones: Tone[];
}

const tap = <T>(page: Page, call: string) => page.evaluate(`import('/measure/tap.ts').then((m) => m.${call})`) as Promise<T>;
const scanNotes = (page: Page) =>
  page.evaluate(() => (window as unknown as { __scanNotes?: { audioTime: number; column: number }[] }).__scanNotes ?? []);
const grid = (page: Page) => page.evaluate(() => (window as unknown as { __scanScore?: { grid: { columns: number; seconds: number } } }).__scanScore!.grid);
const playButton = (page: Page) => page.getByRole('button', { name: 'Play the picture' });

/**
 * A replacement for Math.random that gives the same numbers every time from the same seed
 * (mulberry32). Put into the page before any of its scripts run, so every random number the page
 * asks for (Tone.js builds the reverb's echo and the mallet's noise from them) is the same on every load.
 */
const seeded = (seed: number) => `(() => {
  let s = ${seed} >>> 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;

/** Open the app with the real pictures, ready to record. */
async function open(page: Page) {
  await choosePicture(page, { key: 'ocean', label: 'Ocean' }, 'play'); // the ocean picture, chosen on Listen
  await expect(page.getByRole('heading', { name: /Earth Sonata/ })).toBeVisible();
  await expect(playButton(page)).toBeEnabled();
  await expect(page.getByText('TEST INPUT — a made-up picture, not NASA data')).toHaveCount(0);
  await tap(page, 'startTap()');
}

/** What the page said that might explain a failure: errors, and console messages that are not routine. */
const pageLog = new WeakMap<Page, string[]>();
function watch(page: Page) {
  const log: string[] = [];
  pageLog.set(page, log);
  page.on('pageerror', (e) => log.push(`page error: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') log.push(`console ${m.type()}: ${m.text()}`);
  });
}

/** Press Play the picture, record one whole map sweep, then Esc and let the echo die away. */
async function sweep(page: Page): Promise<Sweep> {
  const before = (await scanNotes(page)).length;
  await tap(page, 'clearTap()');
  await playButton(page).click();
  await expect(page.getByText(/^Scanning the whole picture/)).toBeVisible();
  const { columns, seconds } = await grid(page);
  await page.waitForTimeout((seconds + 1.5) * 1000);
  const first = (await scanNotes(page))[before];
  if (!first) {
    const status = await page.locator('.scan').getByText(/^Scan(ning| stopped| paused)/).first().textContent().catch(() => 'not found');
    const context = await tap<{ state: string; time: number }>(page, 'contextState()').catch(() => null);
    throw new Error(`No chime was played, so the sweep cannot be timed. Scan status: ${status}. Audio: ${JSON.stringify(context)}. Chimes logged: ${(await scanNotes(page)).length} (${before} before). Page log: ${(pageLog.get(page) ?? []).join(' | ') || 'empty'}`);
  }
  // A chime in column c is played c columns after the sweep began.
  const began = first.audioTime - (first.column * seconds) / columns;
  const measured = await tap<Omit<Sweep, 'tones'>>(page, `measureBetween(${began}, ${began + seconds})`);
  const tones = await tap<Tone[]>(page, `measureHeldTones(${began}, ${began + seconds})`);
  await page.keyboard.press('Escape');
  await expect(page.getByText('Scan stopped.')).toBeVisible();
  await page.waitForTimeout(2500);
  return { ...measured, tones };
}

/** One sweep in a page loaded afresh (a new audio context, new instruments, a new reverb). */
async function freshSweep(browser: Browser, baseURL: string, init?: string): Promise<Sweep> {
  const context = await browser.newContext({ baseURL });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  watch(page);
  try {
    await open(page);
    return await sweep(page);
  } finally {
    await context.close();
  }
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => Math.sqrt(xs.reduce((s, x) => s + (x - mean(xs)) ** 2, 0) / (xs.length - 1));
const stats = (xs: number[]) => ({ mean: mean(xs), sd: sd(xs), min: Math.min(...xs), max: Math.max(...xs), range: Math.max(...xs) - Math.min(...xs) });
/** For each held note, how far its level moved across the recordings (largest − smallest), in dB. */
const toneRanges = (runs: { tones: number[] }[]) => runs[0].tones.map((_, k) => Math.max(...runs.map((r) => r.tones[k])) - Math.min(...runs.map((r) => r.tones[k])));

const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};
const row = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`;
const table = (head: string[], rows: (string | number)[][]) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');

test('the same sweep, recorded again and again', async ({ browser }) => {
  test.setTimeout(40 * 60_000);
  const baseURL = test.info().project.use.baseURL!;

  // MEASURE_CONDITIONS=B runs one condition alone, for checking the test; the report then has gaps.
  const only = process.env.MEASURE_CONDITIONS ?? 'ABD';
  // A: as the app is. Each sweep in a page loaded afresh.
  const a: Sweep[] = [];
  for (let i = 0; only.includes('A') && i < RUNS; i++) a.push(await freshSweep(browser, baseURL));
  // B: the same, with the same random numbers on every load.
  const b: Sweep[] = [];
  for (let i = 0; only.includes('B') && i < RUNS; i++) b.push(await freshSweep(browser, baseURL, seeded(SEED)));
  // D: one page, the same sweep played again and again: the same instruments and the same reverb,
  // started at a different moment each time.
  const d: Sweep[] = [];
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  watch(page);
  await open(page);
  for (let i = 0; only.includes('D') && i < RUNS; i++) d.push(await sweep(page));
  // The held notes through 20 reverbs, offline: no timing at all, only the reverb changes.
  const offline = (await page.evaluate(`import('/measure/repeat.ts').then((m) => m.reverbSpread(20))`)) as {
    sound: string;
    renderSeconds: number;
    measuredFrom: number;
    notes: string[];
    room: { wet: number; decay: number };
    dry: { lufs: number; tones: number[] }[];
    wet: { lufs: number; tones: number[] }[];
  };
  // How far the audio clock moves while one set of held instruments is built.
  const builds = (await page.evaluate(`import('/measure/repeat.ts').then((m) => m.buildSpread(20))`)) as { quantumSeconds: number; steps: number[]; milliseconds: number[] };
  await context.close();

  const conditions = [
    { key: 'A', what: 'As the app is: each sweep in a page loaded afresh', runs: a },
    { key: 'B', what: `Each sweep in a page loaded afresh, with the same random numbers every time (seed ${SEED})`, runs: b },
    { key: 'D', what: 'One page, the same sweep played again and again', runs: d },
  ].filter((c) => c.runs.length > 0).map((c) => ({
    ...c,
    lufs: stats(c.runs.map((r) => r.lufs)),
    peak: stats(c.runs.map((r) => r.peakDb)),
    recorded: Math.min(...c.runs.map((r) => r.recorded)),
    toneRange: toneRanges(c.runs.map((r) => ({ tones: r.tones.map((t) => t.db) }))),
    /** Recordings whose held-note levels are all within 1 dB of the first recording's: the same sound, by this fingerprint. */
    sameAsFirst: c.runs.filter((r) => r.tones.every((t, k) => Math.abs(t.db - c.runs[0].tones[k].db) <= 1)).length,
  }));
  const offlineStats = {
    dryDifference: Math.abs(offline.dry[0].lufs - offline.dry[1].lufs),
    lufs: stats(offline.wet.map((w) => w.lufs)),
    toneRange: toneRanges(offline.wet),
  };

  // ---------- Report ----------
  const meta = {
    date: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    browser: `Chromium ${browser.version()} (headless)`,
    commit: git('rev-parse', '--short', 'HEAD') || 'unknown',
    dirty: git('status', '--porcelain', '--', 'web/src', 'data') ? 'yes' : '',
  };
  const notes = offline.notes;
  const f1 = (x: number) => x.toFixed(1);
  const f2 = (x: number) => x.toFixed(2);
  const out: string[] = [];
  out.push('# Picture scan: the same sweep, recorded again and again', '');
  out.push('Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.', '');
  out.push(`Recorded ${meta.date} in ${meta.browser}, on commit ${meta.commit}${meta.dirty ? ' with uncommitted changes' : ''}.`);
  out.push('Each recording is one whole map sweep (30 s) of the ocean picture, Ocean choir, the app\'s default volumes and speed, taken at the last point before the speakers (`tap.ts`).');
  out.push('Loudness is integrated loudness (ITU-R BS.1770-4). "Held-note level" is the level within 3% of a band\'s held note, both channels: other tones fall there too, so it is a fingerprint of the recording, not one note\'s level.');
  out.push('Nobody listened: these are measurements of recordings.', '');

  out.push('## Loudness of the same sweep', '');
  out.push(
    table(
      ['Condition', 'Recordings', 'Loudness: mean', 'Standard deviation', 'Lowest to highest', 'Range', 'Largest sample: range', 'Least share of the time recorded'],
      conditions.map((c) => [`${c.key}. ${c.what}`, c.runs.length, `${f2(c.lufs.mean)} LUFS`, `${f2(c.lufs.sd)} LU`, `${f2(c.lufs.min)} to ${f2(c.lufs.max)} LUFS`, `${f2(c.lufs.range)} LU`, `${f2(c.peak.range)} dB`, `${(100 * c.recorded).toFixed(1)}%`]),
    ),
    '',
  );
  out.push('Each recording, in order:', '');
  out.push(table(['Condition', ...conditions[0].runs.map((_, i) => `${i + 1}`)], conditions.map((c) => [c.key, ...c.runs.map((r) => f2(r.lufs))])), '');

  out.push('## How far each held note\'s level moved between recordings', '');
  out.push('Largest minus smallest across the recordings of one condition, in dB.', '');
  out.push(
    table(
      ['Band', 'Note', ...conditions.map((c) => c.key), 'Offline, 20 reverbs'],
      notes.map((note, k) => [k, note, ...conditions.map((c) => f2(c.toneRange[k])), f2(offlineStats.toneRange[k])]),
    ),
    '',
  );
  out.push(`Middle (median) of the twelve: ${conditions.map((c) => `${c.key} ${f2([...c.toneRange].sort((x, y) => x - y)[6])} dB`).join(', ')}, offline ${f2([...offlineStats.toneRange].sort((x, y) => x - y)[6])} dB.`);
  out.push(`Recordings whose twelve levels are all within 1 dB of the first recording's: ${conditions.map((c) => `${c.key} ${c.sameAsFirst} of ${c.runs.length}`).join(', ')}.`, '');
  out.push('Each recording\'s twelve levels, in dB:', '');
  out.push(table(['Condition', 'Recording', 'Loudness', ...notes], conditions.flatMap((c) => c.runs.map((r, i) => [c.key, i + 1, f2(r.lufs), ...r.tones.map((t) => f1(t.db))]))), '');

  out.push('## How far the audio clock moves while the instruments are built', '');
  out.push('Each oscillator of the held notes starts at "now", read as it is made (Tone.js: a source started without a time starts at the context\'s current time plus its look-ahead). The clock moves in steps of one render quantum (128 samples). If it moves while one set is built, its notes start at different moments.');
  out.push(`The Ocean choir's twelve notes and the low note, built as the scan builds them, ${builds.steps.length} times with the audio running. One quantum is ${(1000 * builds.quantumSeconds).toFixed(2)} ms.`, '');
  const moved = builds.steps.filter((s) => s > 1e-9);
  out.push(table(['Builds', 'The clock moved during the build', 'Largest move', 'Build time: middle, largest'], [[builds.steps.length, `${moved.length} of ${builds.steps.length}`, `${(1000 * Math.max(0, ...builds.steps)).toFixed(2)} ms`, `${f1([...builds.milliseconds].sort((x, y) => x - y)[Math.floor(builds.milliseconds.length / 2)])} ms, ${f1(Math.max(...builds.milliseconds))} ms`]]), '');

  out.push('## The reverb alone, offline', '');
  out.push(`The ${offline.notes.length} held notes of the ${offline.sound === 'ocean' ? 'Ocean choir' : offline.sound}, all at full level, rendered offline for ${offline.renderSeconds} s and measured from ${offline.measuredFrom} s on, through a reverb made as the scan's Room makes it (Tone.Reverb, decay ${offline.room.decay} s, wet ${offline.room.wet}, pre-delay 0.03 s).`);
  out.push('Offline rendering has no clock to vary, so two renders differ only where something random was used. Tone.Reverb builds its echo from random noise.', '');
  out.push(
    table(
      ['', 'Renders', 'Loudness: mean', 'Standard deviation', 'Lowest to highest', 'Range'],
      [
        ['Without a reverb', offline.dry.length, `${f2(mean(offline.dry.map((x) => x.lufs)))} LUFS`, '', '', `${offlineStats.dryDifference.toFixed(3)} LU`],
        ['Through a new reverb each time', offline.wet.length, `${f2(offlineStats.lufs.mean)} LUFS`, `${f2(offlineStats.lufs.sd)} LU`, `${f2(offlineStats.lufs.min)} to ${f2(offlineStats.lufs.max)} LUFS`, `${f2(offlineStats.lufs.range)} LU`],
      ],
    ),
    '',
  );

  const folder = resolve(repo, 'docs/measurements');
  mkdirSync(folder, { recursive: true });
  const finite = (x: number) => (Number.isFinite(x) ? x : null);
  writeFileSync(resolve(folder, 'scan_repeat.json'), JSON.stringify({ meta, runs: RUNS, seed: SEED, conditions, offline, offlineStats, builds }, (_k, v) => (typeof v === 'number' ? finite(v) : v), 1) + '\n');
  writeFileSync(resolve(folder, 'scan_repeat.md'), out.join('\n'));
  console.log(out.join('\n'));

  for (const c of conditions) expect(c.recorded, `${c.key}: part of a sweep was not recorded`).toBeGreaterThan(0.99);
  expect(offlineStats.dryDifference, 'two renders without a reverb must be the same').toBeLessThan(0.001);
});
