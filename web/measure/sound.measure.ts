// Records the running app in headless Chromium and measures the picture scan's sound.
// Writes docs/measurements/scan_sound.*. The recording and the meter are in tap.ts and meter.ts;
// this file presses the buttons a person would press and writes the report.
// Run: npm run measure   (from web/). It plays in real time, so it takes about three minutes.
import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../..', import.meta.url));

interface Measured {
  seconds: number;
  sampleRate: number;
  /** Share of the window for which blocks arrived, 0 to 1. */
  recorded: number;
  lufs: number;
  peakDb: number;
  levelDb: number;
  leftMinusRightDb: number;
}
interface ScanNote {
  audioTime: number;
  column: number;
}

/** Run a function of tap.ts in the page. A string, so the import runs in the page exactly as written. */
const tap = <T>(page: Page, call: string) => page.evaluate(`import('/measure/tap.ts').then((m) => m.${call})`) as Promise<T>;
const scanNotes = (page: Page) => page.evaluate(() => (window as unknown as { __scanNotes?: ScanNote[] }).__scanNotes ?? []);
const grid = (page: Page) => page.evaluate(() => (window as unknown as { __scanScore?: { grid: { columns: number; seconds: number } } }).__scanScore!.grid);
const playButton = (page: Page) => page.getByRole('button', { name: 'Play the picture' });

const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};
const num = (x: number, digits = 1) => x.toFixed(digits);
/** A loudness or a peak with its unit; a recording whose every sample is 0 has neither. */
const lufs = (x: number) => (Number.isFinite(x) ? `${x.toFixed(1)} LUFS` : 'silent');
const dbfs = (x: number) => (Number.isFinite(x) ? `${x.toFixed(1)} dBFS` : 'every sample is 0');
const row = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`;
const table = (head: string[], rows: (string | number)[][]) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');

test('measure the sound of the picture scan', async ({ page, browser }) => {
  await page.goto('/#play');
  await expect(page.getByRole('heading', { name: /Earth Sonata/ })).toBeVisible();
  await expect(playButton(page)).toBeEnabled();
  await expect(page.getByText('TEST INPUT — a made-up picture, not NASA data')).toHaveCount(0); // the real picture, not practice data
  // The scan's settings are folded away by default (UI pass, 15 Nov); the sweeps below choose a scan there.
  await page.getByText('Scan settings', { exact: true }).click();

  // ---------- 1. Does the sound get louder as the level rises? ----------
  const steps = await tap<{
    band: number;
    note: string;
    hz: number;
    secondsEach: number;
    chimes: number;
    steps: { target: number; level: number; toneDb: number; levelDb: number; lufs: number }[];
  }>(page, 'levelSteps()');
  expect(steps.chimes, 'the level picture must play no chimes').toBe(0);

  // ---------- 2. One sweep of each scan of the ocean picture, at the app's own settings ----------
  await tap(page, 'startTap()');
  const sweeps: { name: string; measured: Measured; firstSixth: Measured; lastSixth: Measured }[] = [];
  const choice = page.locator('.scan select').first();
  const names = await choice.locator('option').allTextContents();
  for (let index = 0; index < names.length; index++) {
    await choice.selectOption({ index });
    await expect(playButton(page)).toBeEnabled();
    const before = (await scanNotes(page)).length;
    await tap(page, 'clearTap()');
    await playButton(page).click();
    const { columns, seconds } = await grid(page);
    await page.waitForTimeout((seconds + 1.5) * 1000);
    const first = (await scanNotes(page))[before];
    expect(first, `${names[index]}: no chime was played, so the sweep's start cannot be timed`).toBeTruthy();
    // A chime in column c is played c columns after the sweep began.
    const began = first.audioTime - (first.column * seconds) / columns;
    sweeps.push({
      name: names[index],
      measured: await tap<Measured>(page, `measureBetween(${began}, ${began + seconds})`),
      firstSixth: await tap<Measured>(page, `measureBetween(${began}, ${began + seconds / 6})`),
      lastSixth: await tap<Measured>(page, `measureBetween(${began + (5 * seconds) / 6}, ${began + seconds})`),
    });
    await page.keyboard.press('Escape');
    await expect(page.getByText('Scan stopped.')).toBeVisible();
    await page.waitForTimeout(2500); // let the echo die away before the next one
  }

  // ---------- 3. Everything at once, then Stop ----------
  await choice.selectOption({ index: 0 });
  await tap(page, 'clearTap()');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(/Playing/);
  await playButton(page).click();
  const pad = page.locator('.pad');
  const keys = (await pad.locator('[data-key]').evaluateAll((els) => els.map((e) => e.getAttribute('data-key')!))).slice(0, 4);
  await pad.focus();
  for (const key of keys) await page.keyboard.down(key);
  const together = { from: await tap<number>(page, 'audioNow()'), seconds: 20 };
  await page.waitForTimeout(together.seconds * 1000);
  const allVoices = await tap<Measured>(page, `measureBetween(${together.from}, ${together.from + together.seconds})`);
  await page.keyboard.press('Escape');
  const stopped = await tap<number>(page, 'audioNow()'); // read just after the key press: the stop is a little before this
  await page.waitForTimeout(2600);
  const afterStop = await tap<Measured>(page, `measureBetween(${stopped + 0.15}, ${stopped + 2.15})`);
  const beforeStop = await tap<Measured>(page, `measureBetween(${stopped - 2}, ${stopped - 0.2})`);
  for (const key of keys) await page.keyboard.up(key);

  // ---------- Report ----------
  const meta = {
    date: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    browser: `Chromium ${browser.version()} (headless)`,
    commit: git('rev-parse', '--short', 'HEAD') || 'unknown',
    dirty: git('status', '--porcelain', '--', 'web/src', 'data') ? 'yes' : '',
  };
  const out: string[] = [];
  out.push('# Picture scan: measurements of the sound', '');
  out.push('Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.', '');
  out.push(`Recorded ${meta.date} in ${meta.browser}, on commit ${meta.commit}${meta.dirty ? ' with uncommitted changes' : ''}, at ${allVoices.sampleRate} samples a second.`);
  out.push('The recording is taken at the last point before the speakers, so every voice and its echo is in it.');
  out.push('Loudness is integrated loudness (ITU-R BS.1770-4) in LUFS. Peaks are the largest sample, in dBFS; 0 is full scale.');
  out.push('Nobody listened: these are measurements of a recording. Scan sound: Ocean choir. Volumes and speed: the app\'s defaults.', '');

  out.push('## Does the sound get louder as the level rises?', '');
  out.push(`A made-up picture (TEST INPUT, not NASA data) holds four levels in band ${steps.band}, ${steps.secondsEach} s each, with the chime rule switched off.`);
  out.push(`"Tone" is the level between ${(steps.hz * 0.92).toFixed(0)} and ${(steps.hz * 1.08).toFixed(0)} Hz, around that band's held note (${steps.note}, ${steps.hz.toFixed(1)} Hz).`);
  out.push('If loudness followed the level exactly, each doubling would add 6.02 dB to the tone.', '');
  out.push(
    table(
      ['Level in the score', 'Tone', 'Step up from the row above', 'Whole sound', 'Loudness'],
      steps.steps.map((s, i) => [s.level.toFixed(3), `${num(s.toneDb)} dB`, i ? `${num(s.toneDb - steps.steps[i - 1].toneDb, 2)} dB` : '', `${num(s.levelDb)} dB`, lufs(s.lufs)]),
    ),
    '',
  );

  out.push('## One sweep of each scan (ocean picture)', '');
  out.push(
    table(
      ['Scan', 'Seconds', 'Loudness', 'Largest sample', 'Left minus right, first sixth', 'Left minus right, last sixth'],
      sweeps.map((s) => [s.name, s.measured.seconds.toFixed(1), lufs(s.measured.lufs), dbfs(s.measured.peakDb), `${num(s.firstSixth.leftMinusRightDb)} dB`, `${num(s.lastSixth.leftMinusRightDb)} dB`]),
    ),
    '',
  );

  out.push('## Everything at once, then Stop', '');
  out.push(`The Earth rhythm, the map sweep and a melody chord of ${keys.length} keys (${keys.join(', ').toUpperCase()}) held together for ${together.seconds} s, then Esc.`, '');
  out.push(
    table(
      ['', 'Loudness', 'Largest sample', 'Share of the time recorded'],
      [
        ['All three voices', lufs(allVoices.lufs), dbfs(allVoices.peakDb), `${num(100 * allVoices.recorded, 0)}%`],
        ['The 2 s before Stop', lufs(beforeStop.lufs), dbfs(beforeStop.peakDb), `${num(100 * beforeStop.recorded, 0)}%`],
        ['From 0.15 s to 2.15 s after Stop', lufs(afterStop.lufs), dbfs(afterStop.peakDb), `${num(100 * afterStop.recorded, 0)}%`],
      ],
    ),
    '',
  );
  out.push('"After Stop" is timed from the audio clock read just after the Esc key press, so the true stop is a few milliseconds earlier.');
  out.push('"Share of the time recorded": the browser hands the recorder nothing while no sound at all reaches the last point before the speakers. Under 100% there means that part was silent in that way; 100% with every sample 0 means silence was recorded.', '');

  const folder = resolve(repo, 'docs/measurements');
  mkdirSync(folder, { recursive: true });
  const finite = (x: number) => (Number.isFinite(x) ? x : null); // JSON has no −Infinity
  writeFileSync(resolve(folder, 'scan_sound.json'), JSON.stringify({ meta, steps, sweeps, keys, allVoices, beforeStop, afterStop }, (_k, v) => (typeof v === 'number' ? finite(v) : v), 1) + '\n');
  writeFileSync(resolve(folder, 'scan_sound.md'), out.join('\n'));
  console.log(out.join('\n'));

  // The claim under test: more level, more sound.
  for (let i = 1; i < steps.steps.length; i++) {
    expect(steps.steps[i].toneDb, `level ${steps.steps[i].level} must be louder than ${steps.steps[i - 1].level}`).toBeGreaterThan(steps.steps[i - 1].toneDb);
  }
});
