// Records the running app in headless Chromium and measures the picture scan's sound.
// Writes docs/measurements/scan_sound.*. The recording and the meter are in tap.ts and meter.ts;
// this file presses the buttons a person would press and writes the report.
// Run: npm run measure   (from web/). It plays in real time, so it takes several minutes (about ten).
//
// Each picture is recorded with its own scan rule and reported in its own section: no table holds
// two pictures, and no number of one picture is compared with another's.
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
interface Sweep {
  audioTime: number;
  shape: string;
  columns: number;
  seconds: number;
}
/** One chime handed to an instrument (scanPlayer.ts, dev only). */
interface ScanNote {
  audioTime: number;
  column: number;
  band: number;
  colour: string;
  note: number;
  root: number;
  pan: number;
}
/** The chimes of one sweep, timed from its start (seconds). */
interface SweepChime {
  column: number;
  band: number;
  colour: string;
  note: number;
  at: number;
}

/** Run a function of tap.ts in the page. A string, so the import runs in the page exactly as written. */
const tap = <T>(page: Page, call: string) => page.evaluate(`import('/measure/tap.ts').then((m) => m.${call})`) as Promise<T>;
/** Each sweep's start on the audio clock (scanPlayer.ts, dev only): a sweep with no struck note is timed too. */
const sweepLog = (page: Page) => page.evaluate(() => (window as unknown as { __scanSweeps?: Sweep[] }).__scanSweeps ?? []);
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
/** The chimes of one sweep that began at `began` (audio seconds), timed from its start. */
const sweepNotes = (notes: ScanNote[], began: number, seconds: number): SweepChime[] =>
  notes
    .filter((n) => n.audioTime >= began - 1e-6 && n.audioTime < began + seconds - 1e-6)
    .map((n) => ({ column: n.column, band: n.band, colour: n.colour, note: n.note, at: n.audioTime - began }));
/** The same chimes, in the same order: column, band, instrument and note, at the same moment within 1 ms. */
const sameChimes = (a: SweepChime[], b: SweepChime[]) =>
  a.length === b.length && a.every((n, i) => n.column === b[i].column && n.band === b[i].band && n.colour === b[i].colour && n.note === b[i].note && Math.abs(n.at - b[i].at) < 0.001);

/** Open "Scan settings" if it is folded away (it is, by default). */
async function openSettings(page: Page) {
  const open = await page.locator('details.scan-settings').evaluate((d) => (d as HTMLDetailsElement).open);
  if (!open) await page.getByText('Scan settings', { exact: true }).click();
}

/** Every scan of the picture now on Play along: one sweep each, measured whole and in sixths. */
async function sweepEach(page: Page) {
  await openSettings(page);
  const choice = page.locator('.scan select').first();
  const names = await choice.locator('option').allTextContents();
  const sweeps: { name: string; measured: Measured; firstSixth: Measured; lastSixth: Measured }[] = [];
  /** The whole picture's sweep (the first scan): its chimes, for the globe to be compared with. */
  let wholePicture: SweepChime[] = [];
  for (let index = 0; index < names.length; index++) {
    await choice.selectOption({ index });
    await expect(playButton(page)).toBeEnabled();
    const before = (await sweepLog(page)).length;
    const notesBefore = (await scanNotes(page)).length;
    await tap(page, 'clearTap()');
    await playButton(page).click();
    const { seconds } = await grid(page);
    await page.waitForTimeout((seconds + 1.5) * 1000);
    const start = (await sweepLog(page))[before];
    expect(start, `${names[index]}: the sweep's start was not logged`).toBeTruthy();
    const began = start.audioTime;
    if (index === 0) wholePicture = sweepNotes((await scanNotes(page)).slice(notesBefore), began, seconds);
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
  return { sweeps, wholePicture };
}

/** The Earth rhythm, this picture's map sweep and a held melody chord together, then Esc. */
async function everythingThenStop(page: Page) {
  await page.locator('.scan select').first().selectOption({ index: 0 });
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
  await page.waitForTimeout(2500); // let the echo die away
  return { keys, seconds: together.seconds, allVoices, beforeStop, afterStop };
}

const SAME_SCORE_SECONDS = 10;
interface SameScore {
  sound: string;
  chimes: number;
  same: boolean;
  /** Largest gap between a chime's time from the start of its sweep and the same chime's in the first sound, in seconds. */
  largestTimeDifference: number;
}

/**
 * Every scan sound plays the same score: the first 10 s of the map sweep of the picture now on
 * Play along, once with each scan sound. The browser test (e2e/scan.e2e.ts) compares the sounds on
 * the test picture, which has only two chimes in 10 s; here, the real picture. Run for the ocean
 * picture only: the sounds differ only in instruments, not in what a picture says.
 */
async function sameScoreEachSound(page: Page): Promise<SameScore[]> {
  await openSettings(page);
  await page.locator('.scan select').first().selectOption({ index: 0 }); // the whole picture
  const sounds = page.getByLabel('Scan sound');
  const soundNames = await sounds.locator('option').allTextContents();
  const scores: { sound: string; chimes: { column: number; band: number; colour: string; note: number; root: number; pan: number; at: number }[] }[] = [];
  for (const sound of soundNames) {
    await sounds.selectOption({ label: sound });
    await expect(playButton(page)).toBeEnabled();
    const before = (await scanNotes(page)).length;
    const sweepsBefore = (await sweepLog(page)).length;
    await playButton(page).click();
    const { columns, seconds } = await grid(page);
    await page.waitForTimeout((SAME_SCORE_SECONDS + 1) * 1000);
    const start = (await sweepLog(page))[sweepsBefore];
    expect(start, `${sound}: the sweep's start was not logged`).toBeTruthy();
    const notes = (await scanNotes(page)).slice(before);
    expect(notes.length, `${sound}: no chime was played`).toBeGreaterThan(0);
    const began = start.audioTime;
    // The first 10 s are the columns that start before 10 s, chosen by column: a chime can start at
    // exactly 10.000 s, and a time worked out from the audio clock can land a hair either side of it.
    const lastColumn = Math.ceil((SAME_SCORE_SECONDS * columns) / seconds) - 1;
    scores.push({
      sound,
      chimes: notes
        .filter((n) => n.column <= lastColumn)
        .map((n) => ({ column: n.column, band: n.band, colour: n.colour, note: n.note, root: n.root, pan: n.pan, at: n.audioTime - began })),
    });
    await page.keyboard.press('Escape');
    await expect(page.getByText('Scan stopped.')).toBeVisible();
    await page.waitForTimeout(2500);
  }
  const without = (c: (typeof scores)[number]['chimes'][number]) => [c.column, c.band, c.colour, c.note, c.root, c.pan];
  return scores.map((s) => ({
    sound: s.sound,
    chimes: s.chimes.length,
    same: s.chimes.length === scores[0].chimes.length && s.chimes.every((c, i) => JSON.stringify(without(c)) === JSON.stringify(without(scores[0].chimes[i]))),
    largestTimeDifference: Math.max(0, ...s.chimes.map((c, i) => (scores[0].chimes[i] ? Math.abs(c.at - scores[0].chimes[i].at) : Infinity))),
  }));
}

/**
 * One map sweep of the picture now chosen, on the Globe tab: the same score and the same player as
 * Play along, so it must strike the same notes at the same moments. Leaves the page on Globe.
 */
async function globeSweep(page: Page, wholePicture: SweepChime[]) {
  await page.goto('/#globe'); // changing view is the same as Stop
  await page.waitForFunction(() => !!(window as unknown as { __globe?: unknown }).__globe, undefined, { timeout: 15_000 });
  await expect(playButton(page)).toBeEnabled();
  const before = (await sweepLog(page)).length;
  const notesBefore = (await scanNotes(page)).length;
  await tap(page, 'clearTap()');
  await playButton(page).click();
  const { seconds } = await grid(page);
  await page.waitForTimeout((seconds + 1.5) * 1000);
  const start = (await sweepLog(page))[before];
  expect(start, 'the globe sweep was not logged, so its start cannot be timed').toBeTruthy();
  const began = start.audioTime;
  const sweep = await tap<Measured>(page, `measureBetween(${began}, ${began + seconds})`);
  const chimes = sweepNotes((await scanNotes(page)).slice(notesBefore), began, seconds);
  await page.keyboard.press('Escape');
  await expect(page.getByText('Scan stopped.')).toBeVisible();
  return { sweep, chimes: chimes.length, flatChimes: wholePicture.length, same: sameChimes(chimes, wholePicture) };
}

test('measure the sound of the picture scan', async ({ page, browser }) => {
  test.setTimeout(1_800_000);
  await page.goto('/#play');
  await expect(page.getByRole('heading', { name: /Earth Sonata/ })).toBeVisible();
  await expect(playButton(page)).toBeEnabled();
  await expect(page.getByText('TEST INPUT — a made-up picture, not NASA data')).toHaveCount(0); // the real picture, not practice data

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

  // ---------- 2. One struck note on each instrument, alone ----------
  const strikes = await tap<{ note: string; strikes: { sound: string; colour: string; name: string; level: number; lufs: number; peakDb: number }[] }>(page, 'strikeEach()');

  // ---------- 3. Each picture: one sweep of each scan, everything at once and Stop, then the globe ----------
  await tap(page, 'startTap()');
  const labels = await page.locator('.source-choice .source-label').allTextContents();
  const pictures: {
    label: string;
    sweeps: Awaited<ReturnType<typeof sweepEach>>['sweeps'];
    together: Awaited<ReturnType<typeof everythingThenStop>> & { attempts: number };
    /** Every scan sound plays the same score: the ocean picture only, else null. */
    sameScore: SameScore[] | null;
    globe: Awaited<ReturnType<typeof globeSweep>>;
  }[] = [];
  for (const label of labels.length ? labels : ['Ocean']) {
    await page.goto('/#play'); // the picture is chosen here, and kept when the view changes to Globe and back
    if (labels.length) {
      await page.getByRole('radio', { name: label }).check();
      await expect(page.getByText(/^Reading the /)).toContainText(label === 'Ocean' ? 'ocean' : label.toLowerCase());
    }
    const { sweeps, wholePicture } = await sweepEach(page);
    // A gap in this recording is a dropped block, not silence, and the largest sample could hide in
    // it (a picture with a big still keeps the page busy). Record this take again, up to three more times.
    let together = await everythingThenStop(page);
    let attempts = 1;
    while (together.allVoices.recorded <= 0.99 && attempts < 4) {
      together = await everythingThenStop(page);
      attempts++;
    }
    const sameScore = label === 'Ocean' ? await sameScoreEachSound(page) : null;
    const globe = await globeSweep(page, wholePicture);
    pictures.push({ label, sweeps, together: { ...together, attempts }, sameScore, globe });
  }

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
  out.push(`Recorded ${meta.date} in ${meta.browser}, on commit ${meta.commit}${meta.dirty ? ' with uncommitted changes' : ''}.`);
  out.push('The recording is taken at the last point before the speakers, so every voice and its echo is in it.');
  out.push('Loudness is integrated loudness (ITU-R BS.1770-4) in LUFS. Peaks are the largest sample, in dBFS; 0 is full scale.');
  out.push('Nobody listened: these are measurements of a recording. Scan sound: Ocean choir. Volumes and speed: the app\'s defaults.', '');
  out.push('**Each picture has its own section. No table holds two pictures: never compare a number in one picture\'s section with another\'s.**', '');

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

  out.push('## One struck note on each instrument, alone', '');
  out.push(`${strikes.note} at full strength on each instrument, at the level its scan sound gives it, recorded for 2.4 s. The scan's volume, left–right position and room are the same for every instrument of a sound, so they are left out. Not a picture: the same for every picture.`, '');
  out.push(
    table(
      ['Scan sound', 'Instrument', 'Which notes', 'Level setting', 'Loudness', 'Largest sample'],
      strikes.strikes.map((s) => [s.sound, s.name, s.colour === 'warm' ? 'warm (round mark)' : s.colour === 'cool' ? 'cool (diamond)' : 'third, blue side (asterisk)', s.level, lufs(s.lufs), dbfs(s.peakDb)]),
    ),
    '',
  );

  for (const p of pictures) {
    out.push(`## ${p.label}`, '');
    out.push('### One sweep of each scan', '');
    out.push('Each sweep is timed from the audio-clock moment its first column played (the player\'s own log), so a sweep that strikes no note is measured too.', '');
    out.push(
      table(
        ['Scan', 'Seconds', 'Loudness', 'Largest sample', 'Left minus right, first sixth', 'Left minus right, last sixth'],
        p.sweeps.map((s) => [s.name, s.measured.seconds.toFixed(1), lufs(s.measured.lufs), dbfs(s.measured.peakDb), `${num(s.firstSixth.leftMinusRightDb)} dB`, `${num(s.lastSixth.leftMinusRightDb)} dB`]),
      ),
      '',
    );
    const t = p.together;
    out.push('### Everything at once, then Stop', '');
    out.push(`The Earth rhythm, this picture's map sweep and a melody chord of ${t.keys.length} keys (${t.keys.join(', ').toUpperCase()}) held together for ${t.seconds} s, then Esc.`, '');
    if (t.attempts > 1) out.push(`This take was recorded ${t.attempts} times: the browser dropped audio blocks from the first ${t.attempts - 1}, and a gap could hide the largest sample, so only a whole recording (more than 99% of the time) is reported.`, '');
    out.push(
      table(
        ['', 'Loudness', 'Largest sample', 'Share of the time recorded'],
        [
          ['All three voices', lufs(t.allVoices.lufs), dbfs(t.allVoices.peakDb), `${num(100 * t.allVoices.recorded, 0)}%`],
          ['The 2 s before Stop', lufs(t.beforeStop.lufs), dbfs(t.beforeStop.peakDb), `${num(100 * t.beforeStop.recorded, 0)}%`],
          ['From 0.15 s to 2.15 s after Stop', lufs(t.afterStop.lufs), dbfs(t.afterStop.peakDb), `${num(100 * t.afterStop.recorded, 0)}%`],
        ],
      ),
      '',
    );
    if (p.sameScore) {
      out.push('### Every scan sound plays the same score', '');
      out.push(
        `Each scan sound plays the map sweep of the ${p.label.toLowerCase()} picture; every chime in its first ${SAME_SCORE_SECONDS} s (the columns that start before ${SAME_SCORE_SECONDS} s) is compared with the first sound's: column, band, instrument (warm, cool or blue), note, root and left–right position, and its time from the start of the sweep.`,
        '',
      );
      out.push(
        table(
          ['Scan sound', `Chimes in the first ${SAME_SCORE_SECONDS} s`, 'Same chimes as the first sound', 'Largest time difference'],
          p.sameScore.map((s) => [s.sound, s.chimes, s.same ? 'yes' : 'no', Number.isFinite(s.largestTimeDifference) ? `${(1000 * s.largestTimeDifference).toFixed(1)} ms` : 'a chime is missing']),
        ),
        '',
      );
    }
    const g = p.globe;
    out.push('### One sweep on the globe', '');
    out.push('The whole picture played on the Globe tab, with the line drawn round the globe while it plays.', '');
    out.push(
      table(
        ['Scan', 'Seconds', 'Loudness', 'Largest sample', 'Chimes', 'Same chimes as the Play along sweep'],
        [[
          'Globe: whole picture, a line',
          g.sweep.seconds.toFixed(1),
          lufs(g.sweep.lufs),
          dbfs(g.sweep.peakDb),
          g.chimes,
          g.same ? 'yes: column, band, instrument and note, at the same moment within 1 ms' : `**no** (Play along had ${g.flatChimes})`,
        ]],
      ),
      '',
    );
    out.push('The two sweeps are separate recordings, so their loudness differs by as much as any two runs of one sweep do; the chimes are the check.', '');
  }
  out.push('"After Stop" is timed from the audio clock read just after the Esc key press, so the true stop is a few milliseconds earlier.');
  out.push('"Share of the time recorded": the browser hands the recorder nothing while no sound at all reaches the last point before the speakers. Under 100% there means that part was silent in that way; 100% with every sample 0 means silence was recorded.', '');

  const folder = resolve(repo, 'docs/measurements');
  mkdirSync(folder, { recursive: true });
  const finite = (x: number) => (Number.isFinite(x) ? x : null); // JSON has no −Infinity
  writeFileSync(resolve(folder, 'scan_sound.json'), JSON.stringify({ meta, steps, strikes, pictures }, (_k, v) => (typeof v === 'number' ? finite(v) : v), 1) + '\n');
  writeFileSync(resolve(folder, 'scan_sound.md'), out.join('\n'));
  console.log(out.join('\n'));

  // The claims under test: more level, more sound; nothing clips; Stop leaves silence; every scan
  // sound plays the same score; the globe plays what Play along plays.
  for (let i = 1; i < steps.steps.length; i++) {
    expect(steps.steps[i].toneDb, `level ${steps.steps[i].level} must be louder than ${steps.steps[i - 1].level}`).toBeGreaterThan(steps.steps[i - 1].toneDb);
  }
  for (const p of pictures) {
    for (const s of p.sweeps) expect(s.measured.peakDb, `${p.label}, ${s.name}: a sample at full scale`).toBeLessThan(0);
    // Three voices are sounding, so the recording must be whole: a gap there is a dropped block, not
    // silence, and the largest sample could be in it.
    expect(p.together.allVoices.recorded, `${p.label}: part of the recording of all three voices is missing; run again`).toBeGreaterThan(0.99);
    expect(p.together.allVoices.peakDb, `${p.label}: all voices together reach full scale`).toBeLessThan(0);
    expect(Number.isFinite(p.together.afterStop.peakDb) ? p.together.afterStop.peakDb : -Infinity, `${p.label}: sound after Stop`).toBeLessThan(-80);
    for (const s of p.sameScore ?? []) {
      expect(s.same, `${p.label}, ${s.sound}: not the same chimes as ${p.sameScore![0].sound}`).toBe(true);
      expect(s.largestTimeDifference, `${p.label}, ${s.sound}: a chime at another time`).toBeLessThan(0.005);
    }
    expect(p.globe.same, `${p.label}: the globe sweep has ${p.globe.chimes} chimes, Play along ${p.globe.flatChimes}`).toBe(true);
  }
});
