// Play along with each picture's own scan rule, on made-up pictures (TEST INPUTS, not NASA data).
// Served with VITE_DATASET=practice-pictures (playwright.config.ts, project "pictures"): the
// practice data plus a rain picture and an aerosol picture read with the REAL rain and aerosol
// rules (data/sources.ts). Each made-up picture's answer is worked out in data/testPictures.ts.
// Reads the dev-only logs window.__scanNotes (every struck note) and window.__scanScore.
import { expect, test, type Page } from '@playwright/test';
import { followsSchedule, noteCount, notesAfter, openApp, startWithKeyboard } from './helpers';

interface ScanNote {
  audioTime: number;
  column: number;
  band: number;
  warm: boolean;
  colour: 'warm' | 'cool' | 'blue';
  note: number;
  sound: string;
}
interface Score {
  chimes: { column: number; band: number; colour: string }[];
  reads: ArrayLike<number>;
  levels: ArrayLike<number>;
  floor: number;
  grid: { bands: number };
}

const scanNotes = (page: Page) => page.evaluate(() => (window as unknown as { __scanNotes?: ScanNote[] }).__scanNotes ?? []);
const score = (page: Page) =>
  page.evaluate(() => {
    const s = (window as unknown as { __scanScore?: Score }).__scanScore;
    return s ? { chimes: s.chimes.map((c) => [c.column, c.band, c.colour]), reads: Array.from(s.reads), levels: Array.from(s.levels), floor: s.floor, bands: s.grid.bands } : null;
  });
const playButton = (page: Page) => page.getByRole('button', { name: 'Play the picture' });
const waitForNotes = (page: Page, n: number, timeout = 40_000) =>
  page.waitForFunction((k) => ((window as unknown as { __scanNotes?: unknown[] }).__scanNotes?.length ?? 0) >= k, n, { timeout });

/** Choose a picture with the picture buttons on Play along, as a person would, and open the scan's settings and legend. */
async function choosePicture(page: Page, name: 'Practice' | 'Aerosols' | 'Rain') {
  await page.getByRole('radio', { name }).check();
  await expect(page.getByRole('radio', { name })).toBeChecked();
  // Choosing a picture starts the scan afresh, with its settings folded away.
  for (const fold of ['Scan settings', 'What the marks mean']) await page.getByText(fold, { exact: true }).click();
}

async function startScanWithKeyboard(page: Page) {
  await expect(playButton(page)).toBeEnabled();
  await playButton(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/^Scanning the whole picture/)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await openApp(page, 'play');
});

test('the rain picture plays by its own rule: the navy sea is silent, its land is never read, rain and snow have their own instruments', async ({ page }) => {
  test.setTimeout(90_000);
  await choosePicture(page, 'Rain');
  await expect(page.getByText('TEST INPUT — a made-up picture, not NASA data')).toBeVisible();
  // No data is drawn as such, and said in words, not by the hatch alone.
  await expect(page.locator('.scan-view .nodata-hatch')).toHaveCount(1);
  await expect(page.getByText(/The hatched part is never read: the block that stands for land/)).toBeVisible();
  const legend = page.getByRole('list', { name: 'What the marks and bars mean' });
  await expect(legend.getByText(/Asterisk: a harp note/)).toBeVisible();
  await expect(legend).toContainText('In this picture: snow, drawn cyan to purple');
  await expect(legend.getByText(/Hatched: never read/)).toBeVisible();

  // The score, by the real rain rule: three notes, on three instruments; the land block read nothing.
  const s = (await score(page))!;
  expect(s.floor).toBeCloseTo(30 / 255, 10);
  expect(s.chimes).toEqual([[41, 1, 'cool'], [81, 8, 'warm'], [201, 5, 'blue']]);
  expect(s.reads[120 * s.bands + 5]).toBe(0); // inside the block: no data
  expect(s.levels[10 * s.bands + 5]).toBe(0); // navy sea: silent

  // Play it: the notes come in that order, each on its instrument, and leave their marks.
  await startScanWithKeyboard(page);
  await waitForNotes(page, 3);
  const notes = await scanNotes(page);
  expect(notes.slice(0, 3).map((n) => [n.column, n.band, n.colour])).toEqual([[41, 1, 'cool'], [81, 8, 'warm'], [201, 5, 'blue']]);
  await expect(page.locator('.scan-view .trace.blue')).toHaveCount(1);
  await expect(page.getByText(/last chime: harp/)).toBeVisible();
});

test('changing the picture while the scan plays stops everything, and the new picture plays by its own rule', async ({ page }) => {
  await choosePicture(page, 'Rain');
  await startWithKeyboard(page); // the Earth rhythm
  await startScanWithKeyboard(page);
  await waitForNotes(page, 1, 15_000);

  await page.getByRole('radio', { name: 'Aerosols' }).check();
  await expect(page.getByText('Scan stopped.')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText(/^Stopped/); // the Earth rhythm stopped too
  const after = (await scanNotes(page)).length;
  await page.waitForTimeout(1500);
  expect((await scanNotes(page)).length).toBe(after); // nothing more sounds
  await expect(page.locator('.scan-view .trace')).toHaveCount(0);
  await expect(page.locator('.scan-view .nodata-hatch')).toHaveCount(0); // the aerosol rule reads every pixel

  // The aerosol rule: its own floor, two instruments, sea salt too faint to strike.
  const s = (await score(page))!;
  expect(s.floor).toBeCloseTo(20 / 255, 10);
  expect(s.chimes).toEqual([[41, 1, 'warm'], [81, 8, 'cool'], [201, 5, 'cool']]);
  expect(s.levels[150 * s.bands + 3]).toBeGreaterThan(0); // the sea-salt dot holds a note...
  for (let column = 148; column < 160; column++) expect(s.chimes.some(([c]) => c === column)).toBe(false); // ...but strikes none
  await page.getByText('What the marks mean', { exact: true }).click();
  await expect(page.getByRole('list', { name: 'What the marks and bars mean' }).getByText(/Asterisk/)).toHaveCount(0);

  // And it plays: the first note is black carbon, on the warm instrument.
  await startScanWithKeyboard(page);
  await waitForNotes(page, after + 1, 15_000);
  const first = (await scanNotes(page))[after];
  expect([first.column, first.band, first.colour]).toEqual([41, 1, 'warm']);
});

test('changing the scan sound while the rain scan plays: the same notes, and each instrument keeps its meaning', async ({ page }) => {
  test.setTimeout(90_000);
  await choosePicture(page, 'Rain');
  await page.getByLabel('Scan sound').selectOption({ label: 'Music box' });
  const legend = page.getByRole('list', { name: 'What the marks and bars mean' });
  await expect(legend.getByText(/Round mark: a kalimba note/)).toBeVisible();
  await expect(legend).toContainText('In this picture: rain drawn yellow, orange or red');
  await expect(legend.getByText(/Asterisk: a harp note/)).toBeVisible();

  await startScanWithKeyboard(page);
  await waitForNotes(page, 1, 15_000);
  const [first] = await scanNotes(page);
  expect([first.column, first.colour, first.sound]).toEqual([41, 'cool', 'musicbox']);
  await page.getByLabel('Scan sound').selectOption({ label: 'Plain (first instruments)' });
  await expect(page.getByText(/^Scanning the whole picture/)).toBeVisible(); // it keeps playing
  await waitForNotes(page, 2, 15_000);
  const second = (await scanNotes(page))[1];
  expect([second.column, second.colour, second.sound]).toEqual([81, 'warm', 'first']);
  await expect(legend).toContainText('In this picture: rain drawn yellow, orange or red');
});

test('the radar on the rain picture: the block that is never read is no data in the table and on the bars', async ({ page }) => {
  await choosePicture(page, 'Rain');
  await page.locator('.scan select').first().selectOption({ label: 'Test circle: a radar turn' });
  await page.getByText('Why the scan sounds like this', { exact: true }).click();
  // Walk to column 61 (180°, due west of the centre, into the block) with the arrow keys.
  const slider = page.getByRole('slider', { name: 'Column' });
  await slider.focus();
  for (let k = 0; k < 60; k++) await page.keyboard.press('ArrowRight');
  const table = page.getByRole('table');
  await expect(table.locator('caption')).toContainText('column 61');
  await expect(table).toContainText('none: no data');
  await expect(table).toContainText('silent: no data');
  // Choose a band with no data: its sentence says so, and never calls it a zero.
  await page.getByLabel('Explain band').selectOption({ index: 0 });
  await expect(page.locator('.why-band')).toContainText('The line read nothing there');
  await expect(page.locator('.why-band')).toContainText('This is not a zero');

  // Play to about 180° and pause: the bars of the bands with no data are hatched, not empty.
  await playButton(page).click();
  await page.waitForTimeout(7700); // 24° a second
  await page.getByRole('button', { name: 'Pause the scan' }).click();
  await expect(page.locator('.scan-view .note-bar.nodata').first()).toBeVisible();
  expect(await page.locator('.scan-view .note-bar.nodata').count()).toBeGreaterThanOrEqual(3);
});

test('reduced motion: the rain scan still plays, the line jumps once a second and the hatch stays still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.getByRole('heading', { name: /Earth Sonata/ })).toBeVisible();
  await choosePicture(page, 'Rain');
  await expect(page.locator('.scan-view')).toHaveClass(/still/);
  await expect(page.locator('.scan-view .nodata-hatch')).toHaveCount(1);
  await startScanWithKeyboard(page);
  await waitForNotes(page, 1, 15_000);
  const [first] = await scanNotes(page);
  expect([first.column, first.colour]).toEqual([41, 'cool']);
  // The line stands on whole seconds: 8 columns a second, so its position is a multiple of 8 columns.
  const x = await page.locator('.scan-view .sweep').evaluate((g) => Number(/translate\(([\d.]+)/.exec(g.getAttribute('transform') ?? '')?.[1]));
  expect(x % 8).toBeCloseTo(0, 6);
});

test('the explanation speaks of this picture, with its own numbers, and nothing in it is announced', async ({ page }) => {
  await choosePicture(page, 'Rain');
  await page.getByText('Why the scan sounds like this', { exact: true }).click();
  const fixed = page.getByRole('region', { name: 'Fixed by us, for this picture' });
  await expect(fixed).toContainText('30 of 255');
  await expect(fixed).toContainText('Pixels never read');
  await expect(fixed).toContainText('the third, snow');
  await expect(fixed).not.toContainText('12 of 255');
  await expect(page.locator('.scan-why [aria-live], .scan-why [role="status"], .scan-why [role="alert"]')).toHaveCount(0);

  await page.getByRole('radio', { name: 'Aerosols' }).check();
  await page.getByText('Why the scan sounds like this', { exact: true }).click();
  const aerosols = page.getByRole('region', { name: 'Fixed by us, for this picture' });
  await expect(aerosols).toContainText('20 of 255');
  await expect(aerosols).not.toContainText('Pixels never read');
  await expect(aerosols).not.toContainText('30 of 255');
});

test('the Earth rhythm keeps its schedule while the rain picture is scanned', async ({ page }) => {
  await choosePicture(page, 'Rain');
  await startWithKeyboard(page);
  await notesAfter(page, 0, 4);
  await startScanWithKeyboard(page);
  const mark = await noteCount(page);
  const during = await notesAfter(page, mark, 16);
  expect(during.every((n) => n.region === 'boundary_current')).toBe(true);
  expect(followsSchedule(during)).toBe(true);
  await expect(page.getByRole('status')).toHaveText(/Playing/);
});

test('every picture: choose it, press Play, its notes sound; Esc silences them', async ({ page }) => {
  test.setTimeout(90_000);
  for (const name of ['Practice', 'Aerosols', 'Rain'] as const) {
    await choosePicture(page, name);
    const before = (await scanNotes(page)).length;
    await startScanWithKeyboard(page);
    await waitForNotes(page, before + 1, 15_000);
    expect((await scanNotes(page))[before].column).toBe(41); // every made-up picture's first dot
    await page.keyboard.press('Escape');
    await expect(page.getByText('Scan stopped.')).toBeVisible();
    const stopped = (await scanNotes(page)).length;
    await page.waitForTimeout(1000);
    expect((await scanNotes(page)).length, `${name}: a note after Esc`).toBe(stopped);
  }
});
