// "What you hear now, and why" on Compare (NowMatrix.tsx): it follows the sound beat by beat, its
// numbers are the sounding beat's (checked against the Earth note log), missing information is
// "no data", and the band's chord and the Earth sound are shown and can be changed there.
// Practice data: Region A is boundary_current, Region B gyre_interior (frames 4 and 5 missing).
import { expect, test, type Page } from '@playwright/test';
import { openApp, type Note } from './helpers';

const A = 'boundary_current';
const B = 'gyre_interior';
const BEAT = 0.5;
const matrix = (page: Page) => page.getByRole('table', { name: 'What you hear now, and why' });

/** The frame shown and one region's cell in one row, read at the same instant. */
const read = (page: Page, region: string, row: string) =>
  page.evaluate(([r, w]) => ({
    frame: Number(/Frame (\d+) of/.exec(document.querySelector('.now-moment')!.textContent!)![1]),
    cell: document.querySelector(`[headers="now-col-${r} now-row-${w}"]`)!.textContent!,
  }), [region, row]);

test('stopped: frame 1 of the chosen region, and a prompt to press Listen', async ({ page }) => {
  await openApp(page, 'compare');
  await expect(page.locator('.now-moment')).toContainText('Frame 1 of 8');
  await expect(page.locator('.now-moment')).toContainText('Press Listen');
  await expect(matrix(page)).toBeVisible();
  expect((await read(page, A, 'alignment')).cell).toMatch(/^\d\.\d\d/);
});

test('while Region A plays, the matrix moves beat by beat and shows the rule worked out with the sounding beat', async ({ page }) => {
  await openApp(page, 'compare');
  await page.getByRole('button', { name: 'Listen to Region A' }).click();
  await expect(page.getByRole('status')).toHaveText(/Playing Region A/);
  await expect.poll(async () => (await read(page, A, 'rule')).frame, { timeout: 8000 }).toBeGreaterThan(1);

  const seen = new Set<number>();
  for (let i = 0; i < 4; i++) {
    const { frame, cell } = await read(page, A, 'rule');
    seen.add(frame);
    // "0.75 − 0.25 × a = r": the sum adds up, and r is within 0.00125 of the beat the sound played.
    const [, a, r] = /0\.75 − 0\.25 × (\d\.\d\d) = (\d\.\d+)/.exec(cell)!;
    expect(Math.round(Number(r) * 10000)).toBe(7500 - 25 * Math.round(Number(a) * 100));
    const notes = await page.evaluate(() => window.__earthNotes as Note[]);
    const played = notes.find((n) => n.region === A && n.pulse === 0 && Math.abs(n.trackTime - (frame - 1) * BEAT) < 1e-6)!;
    expect(Math.abs(Number(r) - played.longFraction)).toBeLessThanOrEqual(0.00126);
    await page.waitForTimeout(700);
  }
  expect(seen.size).toBeGreaterThan(1); // it moved
});

test('missing information is "no data" in the matrix, never a number', async ({ page }) => {
  await openApp(page, 'compare');
  await page.getByRole('button', { name: 'Listen to Region B' }).click();
  await expect.poll(async () => (await read(page, B, 'alignment')).cell, { timeout: 8000 }).toBe('no data');
  const { cell } = await read(page, B, 'rule');
  expect(cell).not.toMatch(/\d/);
});

test('the chord under E4 is named, and the Earth sound can be changed here, the same setting as Play along', async ({ page }) => {
  await openApp(page, 'compare');
  await page.getByRole('button', { name: 'Listen to Region A' }).click();
  const chord = page.locator('.now-fixed-item').nth(1).locator('.now-fixed-value');
  await expect(chord).toHaveText(/^(C|Am7|Fmaj7|Gsus4) E (is its|adds the) (3rd|5th|6th|7th)$/, { timeout: 8000 });

  const choice = page.locator('.now').getByRole('combobox', { name: 'Earth sound' });
  await expect(choice).toHaveValue('band');
  await choice.selectOption('plain');
  await expect(chord).toHaveText('No band with this Earth sound');
  await expect(page.locator('.now-fixed-item').first()).toContainText('drum-like pulse');

  await page.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Play along' }).click();
  await expect(page.getByRole('combobox', { name: 'Earth sound' })).toHaveValue('plain');
});
