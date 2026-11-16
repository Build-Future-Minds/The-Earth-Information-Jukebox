// Play along: the picture scan and the melody sounds. Practice mode has no NASA image, so the scan
// reads the TEST INPUT picture (three coloured dots with a known answer, audio/scanScore.ts).
// Reads the dev-only log window.__scanNotes: every chime handed to an instrument, with its audio time.
import { expect, test, type Page } from '@playwright/test';
import { followsSchedule, melodyVoices, noteCount, notesAfter, openApp, startWithKeyboard } from './helpers';

interface ScanNote {
  audioTime: number;
  column: number;
  band: number;
  warm: boolean;
  note: number;
  root: number;
  pan: number;
}

test.beforeEach(async ({ page }) => {
  await openApp(page, 'play');
  // The scan's settings and legend are folded away by default (UI pass, 15 Nov); these tests use them.
  for (const name of ['Scan settings', 'What the marks mean']) await page.getByText(name, { exact: true }).click();
});

const scanNotes = (page: Page) => page.evaluate(() => (window as unknown as { __scanNotes?: ScanNote[] }).__scanNotes ?? []);
const playButton = (page: Page) => page.getByRole('button', { name: 'Play the picture' });

async function startScanWithKeyboard(page: Page) {
  await expect(playButton(page)).toBeEnabled();
  await playButton(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/^Scanning the whole picture/)).toBeVisible();
}

test('the scan makes no sound before Play the picture, and says it reads a test picture', async ({ page }) => {
  await expect(playButton(page)).toBeEnabled();
  await page.waitForTimeout(500);
  expect(await scanNotes(page)).toEqual([]);
  await expect(page.getByText('Scan stopped.')).toBeVisible();
  await expect(page.getByText('TEST INPUT — a made-up picture, not NASA data')).toBeVisible();
});

test('the scan plays the test picture by the rule: right dots, right instruments, right times', async ({ page }) => {
  await startScanWithKeyboard(page);
  await page.waitForFunction(() => ((window as unknown as { __scanNotes?: unknown[] }).__scanNotes?.length ?? 0) >= 2, undefined, { timeout: 20_000 });
  const [red, green] = await scanNotes(page);
  // Red dot, low in the picture: column 41, band 1, marimba, G4 (band note G3 + one octave).
  expect([red.column, red.band, red.warm, red.note]).toEqual([41, 1, true, 67]);
  // Green dot, high in the picture: column 81, band 8, bells, E6 (band note E5 + one octave).
  expect([green.column, green.band, green.warm, green.note]).toEqual([81, 8, false, 88]);
  // 40 columns apart at 8 columns a second: 5 seconds.
  expect(Math.abs(green.audioTime - red.audioTime - 5)).toBeLessThan(0.005);
  // Decoration on its timetable: the low root is A1 from 3.75 s and F2 from 7.5 s.
  expect([red.root, green.root]).toEqual([33, 41]);
  // The sound sits where the line is: both dots are in the left half, the first further left.
  expect(red.pan).toBeCloseTo(0.7 * ((2 * 41.5) / 240 - 1), 3);
  expect(green.pan).toBeCloseTo(0.7 * ((2 * 81.5) / 240 - 1), 3);
});

test('what you see follows what you hear: the line shows while playing and a chime leaves a mark', async ({ page }) => {
  const view = page.locator('.scan-view');
  await expect(view).toHaveClass(/stopped/);
  await expect(view.locator('.sweep')).toBeHidden(); // a stopped scan shows the clean picture
  await expect(view.locator('.note-bar')).toHaveCount(13); // the low root and the twelve bands
  await startScanWithKeyboard(page);
  await expect(view).toHaveClass(/playing/);
  await expect(view.locator('.sweep')).toBeVisible(); // the line, its glow and the dimmed part still to play
  // The line is where the audio clock says: after about 2 s it is about 2/30 of the way across.
  await page.waitForTimeout(2000);
  const x = await view.locator('.sweep').evaluate((g) => Number(/translate\(([\d.]+)/.exec(g.getAttribute('transform') ?? '')?.[1]));
  expect(x / 240).toBeGreaterThan(1.5 / 30);
  expect(x / 240).toBeLessThan(3.5 / 30);
  // The first chime (5.1 s) leaves one mark, and its band's bar flashes.
  await expect(view.locator('.trace')).toHaveCount(1, { timeout: 10_000 });
  await expect(view.locator('.note-bar.hit')).toHaveCount(1);
  await expect(page.getByText(/last chime: marimba G4/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(view).toHaveClass(/stopped/);
  await expect(view.locator('.trace')).toHaveCount(0);
});

/** Seconds of chimes compared, from each sound's first chime. */
const SAME_SCORE_SECONDS = 10;

test('every scan sound plays the same score: same dots, same notes, same times, for 10 seconds of chimes', async ({ page }) => {
  test.setTimeout(120_000);
  // Every chime in the 10 s from the first one, as it was handed to an instrument: where, which
  // instrument, which note, over which root, where between the speakers, and when after the first.
  // On the test picture that is the red dot and the green dot, 5 s apart (the blue one is 20 s on).
  const played: Record<string, (Omit<ScanNote, 'audioTime'> & { after: number })[]> = {};
  for (const [label, id] of [['Ocean choir', 'ocean'], ['Music box', 'musicbox'], ['Plain (first instruments)', 'first']]) {
    await page.getByLabel('Scan sound').selectOption({ label });
    const before = (await scanNotes(page)).length;
    await startScanWithKeyboard(page);
    await page.waitForFunction((n) => ((window as unknown as { __scanNotes?: unknown[] }).__scanNotes?.length ?? 0) > n, before, { timeout: 20_000 });
    await page.waitForTimeout((SAME_SCORE_SECONDS + 0.5) * 1000); // chimes are logged when they are scheduled, 0.1 s ahead
    const notes = (await scanNotes(page)).slice(before) as (ScanNote & { sound?: string })[];
    expect(notes.every((n) => n.sound === id), `${label}: a chime was played by another sound`).toBe(true);
    const first = notes[0].audioTime;
    played[id] = notes
      .filter((n) => n.audioTime - first <= SAME_SCORE_SECONDS)
      .map(({ audioTime, column, band, warm, note, root, pan }) => ({ column, band, warm, note, root, pan, after: audioTime - first }));
    await page.keyboard.press('Escape');
    await expect(page.getByText('Scan stopped.')).toBeVisible();
  }
  expect(played.ocean.length, 'more than one chime is compared').toBeGreaterThanOrEqual(2);
  const placeAndNote = (list: typeof played.ocean) => list.map(({ after: _after, ...rest }) => rest);
  for (const id of ['musicbox', 'first']) {
    expect(placeAndNote(played[id]), `${id}: the same chimes as the Ocean choir`).toEqual(placeAndNote(played.ocean));
    played[id].forEach((n, i) => expect(Math.abs(n.after - played.ocean[i].after), `${id}, chime ${i + 1}: at the same time after the first`).toBeLessThan(0.005));
  }
});

test('the legend names the marks and the bars, and follows the scan sound', async ({ page }) => {
  const legend = page.getByRole('list', { name: 'What the marks and bars mean' });
  await expect(legend.getByText(/Round mark: a marimba note/)).toBeVisible();
  await expect(legend.getByText(/Diamond: a bells note/)).toBeVisible();
  await expect(legend.getByText(/First bar: the low note/)).toBeVisible();
  await expect(legend.getByText(/decoration, not data/)).toBeVisible();
  await page.getByLabel('Scan sound').selectOption({ label: 'Music box' });
  await expect(legend.getByText(/Round mark: a kalimba note/)).toBeVisible();
  await expect(legend.getByText(/Diamond: a music box note/)).toBeVisible();
});

/** How far the scan's moving parts have gone: degrees turned (radar) or picture units across (line). */
const sweepValue = (page: Page) =>
  page.locator('.scan-view .sweep').evaluate((g) => {
    const m = /(rotate|translate)\((-?[\d.]+)/.exec(g.getAttribute('transform') ?? '');
    return m ? { kind: m[1], value: Math.abs(Number(m[2])) } : { kind: 'none', value: NaN };
  });
const scanChoice = (page: Page) => page.locator('.scan select').first();

test('the radar needle turns with the sound, shows how far round it is, and chimes where the rule says', async ({ page }) => {
  const view = page.locator('.scan-view');
  await scanChoice(page).selectOption({ label: 'Test circle: a radar turn' });
  await expect(view).toHaveClass(/radar/);
  await expect(view.locator('.sweep')).toBeVisible(); // at rest the needle shows where the turn begins
  await expect(playButton(page)).toBeEnabled();
  await playButton(page).click();
  await expect(page.getByText(/^Scanning the test circle: a radar line turns/)).toBeVisible();
  await page.waitForTimeout(2000);
  const a = await sweepValue(page);
  expect(a.kind).toBe('rotate');
  expect(a.value).toBeGreaterThan(36); // 24 degrees a second: about 48 after 2 s
  expect(a.value).toBeLessThan(66);
  await expect(view.locator('.played-arc')).toHaveAttribute('d', /^M/);
  // The green dot is 145 degrees round and 80% of the way out: one bell, G6, 6 s into the turn.
  await page.waitForFunction(() => ((window as unknown as { __scanNotes?: unknown[] }).__scanNotes?.length ?? 0) >= 1, undefined, { timeout: 15_000 });
  const [bell] = await scanNotes(page);
  expect([bell.column, bell.band, bell.warm, bell.note]).toEqual([48, 9, false, 91]);
  await expect(view.locator('.trace.cool')).toHaveCount(1);
});

test('choosing another scan while one is playing keeps the line moving', async ({ page }) => {
  // The fault this guards against: the sound restarted with the new scan, and the needle stood still.
  await startScanWithKeyboard(page);
  await page.waitForTimeout(1200);
  await scanChoice(page).selectOption({ label: 'Test circle: a radar turn' });
  await expect(page.getByText(/^Scanning the test circle/)).toBeVisible();
  await page.waitForTimeout(600);
  const r0 = await sweepValue(page);
  await page.waitForTimeout(1000);
  const r1 = await sweepValue(page);
  expect(r0.kind).toBe('rotate');
  expect(r1.value - r0.value).toBeGreaterThan(18); // 24 degrees in a second
  expect(r1.value - r0.value).toBeLessThan(30);

  await scanChoice(page).selectOption({ label: 'Whole picture: a line, left to right' });
  await expect(page.getByText(/^Scanning the whole picture/)).toBeVisible();
  await page.waitForTimeout(600);
  const x0 = await sweepValue(page);
  await page.waitForTimeout(1000);
  const x1 = await sweepValue(page);
  expect(x0.kind).toBe('translate');
  expect(x1.value - x0.value).toBeGreaterThan(6); // 8 picture units in a second (240 in 30 s)
  expect(x1.value - x0.value).toBeLessThan(10);
});

test('the explanation of the scan opens by keyboard and says what is decoration', async ({ page }) => {
  const summary = page.getByText('How the picture becomes sound');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Decoration, not data/)).toBeVisible();
  await expect(page.getByText(/steps through C, A, F and G/)).toBeVisible();
});

test('the Earth rhythm is unchanged while the picture scan plays', async ({ page }) => {
  await startWithKeyboard(page);
  await notesAfter(page, 0, 4);
  await startScanWithKeyboard(page);
  const mark = await noteCount(page);
  const during = await notesAfter(page, mark, 16);
  expect(during.every((n) => n.region === 'boundary_current')).toBe(true);
  expect(followsSchedule(during)).toBe(true);
  await expect(page.getByRole('status')).toHaveText(/Playing/); // the page's one status is still the Earth's
});

test('Esc stops the scan too, and Pause holds its place', async ({ page }) => {
  await startScanWithKeyboard(page);
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Pause the scan' }).click();
  await expect(page.getByText(/^Scan paused/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume the scan' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume the scan' }).click();
  await expect(page.getByText(/^Scanning/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Scan stopped.')).toBeVisible();
  await expect(playButton(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop the scan' })).toBeDisabled();
});

test('the speed setting stretches the scan: at half speed the two dots are 10 seconds apart', async ({ page }) => {
  test.setTimeout(90_000);
  // Speed is set on the Listen view and kept when the view changes.
  await openApp(page, 'listen');
  await page.getByRole('button', { name: 'Sound', exact: true }).click();
  await page.getByRole('button', { name: '½×', exact: true }).click();
  await openApp(page, 'play');
  await startScanWithKeyboard(page);
  await page.waitForFunction(() => ((window as unknown as { __scanNotes?: unknown[] }).__scanNotes?.length ?? 0) >= 2, undefined, { timeout: 40_000 });
  const [red, green] = await scanNotes(page);
  expect(Math.abs(green.audioTime - red.audioTime - 10)).toBeLessThan(0.01);
});

test('every melody sound plays and lets go: nothing stuck', async ({ page }) => {
  const pad = page.locator('.pad');
  for (const sound of ['Glass keys', 'Marimba', 'Bells', 'Music box', 'Choir pad', 'Plain tone (first version)']) {
    await page.getByLabel('Melody sound').selectOption({ label: sound });
    await pad.focus();
    await page.keyboard.down('d');
    await expect.poll(() => melodyVoices(page), { message: `${sound}: one voice while the key is down` }).toBe(1);
    await page.keyboard.up('d');
    await page.waitForTimeout(700);
    expect(await melodyVoices(page), `${sound}: no voice left after the key is released`).toBe(0);
  }
});
