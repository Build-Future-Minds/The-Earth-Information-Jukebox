// Listen on the real NASA pictures (P1). Runs in the "real" project (playwright.config.ts), whose
// app shows the pictures in data/, not the practice data. For each picture: choose it, its regions
// appear with its own letters, press Play, and the notes logged in window.__scanNotes are that
// picture's own score, made with its own settings; Stop and Esc silence them. Nothing sounds before
// Play, and choosing another picture stops the sound.
// The measured settings are read from docs/measurements/scan_pictures.json (written by
// `npm run measure`). Each picture is checked against its own settings only.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

interface ScanNote { column: number; band: number; warm: boolean }
interface Measured { key: string; settings: { floor: number; full: { line: number; radar: number } } }

const MEASURED: Measured[] = JSON.parse(readFileSync(new URL('../../docs/measurements/scan_pictures.json', import.meta.url), 'utf8')).pictures;

const PICTURES = [
  { key: 'ocean', short: 'Sea surface currents and temperature', title: 'Global Sea Surface Currents and Temperature', letters: ['A', 'B'] },
  { key: 'aerosols', short: 'Aerosols', title: 'GEOS Aerosols (2025)', letters: ['C', 'D'] },
  { key: 'imerg', short: 'Precipitation (GPM IMERG)', title: 'Near Real-Time Global Precipitation', letters: ['E', 'F'] },
];

const notes = (page: Page) => page.evaluate(() => (window as unknown as { __scanNotes?: ScanNote[] }).__scanNotes ?? []);
const score = (page: Page) =>
  page.evaluate(() => {
    const s = (window as unknown as { __scanScore?: { floor: number; shape: string; grid: { fullStrength: number }; chimes: ScanNote[] } | null }).__scanScore;
    return s ? { floor: s.floor, shape: s.shape, full: s.grid.fullStrength, chimes: s.chimes.map((c) => ({ column: c.column, band: c.band, warm: c.warm })) } : null;
  });
const play = (page: Page) => page.getByRole('button', { name: 'Play', exact: true });

/** Wait until `n` notes have been logged after `from`. */
async function notesAfter(page: Page, from: number, n: number, timeout = 35_000) {
  await page.waitForFunction(([f, k]) => ((window as unknown as { __scanNotes?: unknown[] }).__scanNotes?.length ?? 0) >= f + k, [from, n], { timeout });
  return (await notes(page)).slice(from);
}

/** No new note in the next `ms`. */
async function expectSilence(page: Page, ms = 1500) {
  const before = (await notes(page)).length;
  await page.waitForTimeout(ms);
  expect((await notes(page)).length).toBe(before);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/#listen');
  await expect(page.getByRole('heading', { name: /Earth Sonata/ })).toBeVisible();
});

test('step 1 lists every NASA picture, by NASA\'s own title, with a link to its page', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Step 1 of 3: Choose a NASA picture' });
  await expect(group.getByRole('radio')).toHaveCount(PICTURES.length);
  for (const p of PICTURES) {
    await expect(group.getByRole('radio', { name: new RegExp(p.short.replace(/[()]/g, '\\$&')) })).toBeVisible();
    await expect(group.getByRole('link', { name: new RegExp(p.title.replace(/[()]/g, '\\$&')) })).toHaveAttribute('href', /svs\.gsfc\.nasa\.gov/);
  }
});

test('nothing sounds before Play, even after choosing a picture and a region', async ({ page }) => {
  await page.getByRole('radio', { name: /Aerosols/ }).check();
  await page.getByRole('radio', { name: /Region C/ }).check();
  await page.waitForTimeout(1500);
  expect(await notes(page)).toEqual([]);
  await expect(page.getByRole('status')).toHaveText(/^Stopped/);
});

for (const p of PICTURES) {
  test(`${p.key}: choose it, see its regions, Play: its own notes with its own settings; Stop and Esc silence them`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.getByRole('radio', { name: new RegExp(`^${p.short.replace(/[()]/g, '\\$&')}`) }).check();
    const measured = MEASURED.find((m) => m.key === p.key)!.settings;

    // Its regions appear, by name with its own letters, and its circles are drawn on the picture.
    const hear = page.getByRole('group', { name: 'Step 2 of 3: Choose what to hear' });
    await expect(hear.getByRole('radio', { name: /^Whole picture/ })).toBeChecked();
    for (const letter of p.letters) await expect(hear.getByRole('radio', { name: new RegExp(`Region ${letter}:`) })).toBeVisible();
    await expect(page.locator('.listen-figure .box[data-region]')).toHaveCount(p.letters.length);
    await expect(page.locator('.map-tag b')).toHaveText(p.letters);

    // The whole picture: the score is this picture's, with its own floor and full level.
    await expect(play(page)).toBeEnabled();
    const line = await score(page);
    expect(line).not.toBeNull();
    expect([line!.shape, line!.floor, line!.full]).toEqual(['line', measured.floor, measured.full.line]);
    const from = (await notes(page)).length;
    await play(page).click();
    await expect(page.getByRole('status')).toHaveText('Playing the whole picture: a line moves west to east, again until you stop.');
    const heard = await notesAfter(page, from, 1);
    for (const n of heard) expect(line!.chimes).toContainEqual({ column: n.column, band: n.band, warm: n.warm });

    // Stop silences it.
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText(/^Stopped/);
    await expectSilence(page);

    // A region: the radar, with this picture's radar full level. Esc silences it.
    await hear.getByRole('radio', { name: new RegExp(`Region ${p.letters[0]}:`) }).check();
    await expect.poll(async () => (await score(page))?.shape).toBe('radar');
    const radar = (await score(page))!;
    expect([radar.floor, radar.full]).toEqual([measured.floor, measured.full.radar]);
    const from2 = (await notes(page)).length;
    await play(page).click();
    await expect(page.getByRole('status')).toHaveText(new RegExp(`^Playing Region ${p.letters[0]}, `));
    const heard2 = await notesAfter(page, from2, 1);
    for (const n of heard2) expect(radar.chimes).toContainEqual({ column: n.column, band: n.band, warm: n.warm });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('status')).toHaveText(/^Stopped/);
    await expectSilence(page);
  });
}

test('choosing another picture while one plays stops the sound, and the new one waits for Play', async ({ page }) => {
  const from = (await notes(page)).length;
  await play(page).click();
  await notesAfter(page, from, 1);
  await page.getByRole('radio', { name: /^Aerosols/ }).check();
  await expect(page.getByRole('status')).toHaveText(/^Stopped/);
  await expectSilence(page);
  await expect(page.getByRole('radio', { name: /^Whole picture/ })).toBeChecked();
});

test('the rain picture says its land is never read, and its whole-picture scan has cells with no data', async ({ page }) => {
  await page.getByRole('radio', { name: /^Precipitation/ }).check();
  await expect(page.locator('.listen-under')).toContainText('The scan never reads land and ice');
  await expect.poll(async () => page.evaluate(() => {
    const s = (window as unknown as { __scanScore?: { reads: Uint32Array } | null }).__scanScore;
    return s ? Array.from(s.reads).filter((r) => r === 0).length : -1;
  })).toBeGreaterThan(0);
});
