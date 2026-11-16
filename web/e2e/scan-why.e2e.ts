// "Why the scan sounds like this": what a person sees and does. Practice mode has no NASA image, so
// the scan reads the TEST INPUT picture: three coloured dots with a known answer (audio/scanScore.ts):
//   red   column 41 (0-based), band 2 of 12: a marimba G4, 5.1 s into the sweep
//   green column 81, band 9: bells E6, 10.1 s
//   blue  column 201, band 6: bells
// The page numbers columns from 1, so column 41 (0-based) is "42 of 240" on the screen.
import { expect, test, type Page } from '@playwright/test';
import { notesAfter, noteCount, openApp, startWithKeyboard } from './helpers';

test.beforeEach(async ({ page }) => {
  await openApp(page, 'play');
  await page.getByText('Scan settings', { exact: true }).click(); // folded away by default (UI pass, 15 Nov)
});

interface ScanNote {
  audioTime: number;
  column: number;
}
const scanNotes = (page: Page) => page.evaluate(() => (window as unknown as { __scanNotes?: ScanNote[] }).__scanNotes ?? []);
const playButton = (page: Page) => page.getByRole('button', { name: 'Play the picture' });
const why = (page: Page) => page.locator('.scan-why');
const slider = (page: Page) => page.getByRole('slider', { name: /^Column/ });

async function openWhyWithKeyboard(page: Page) {
  const summary = page.getByText('Why the scan sounds like this', { exact: true });
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(why(page).getByRole('heading', { name: 'From the picture' })).toBeVisible();
}
async function startScan(page: Page) {
  await expect(playButton(page)).toBeEnabled();
  await playButton(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/^Scanning the whole picture/)).toBeVisible();
}
/** How far the scan's line has gone, in picture units (240 across the test picture). */
const lineX = (page: Page) =>
  page.locator('.scan-view .sweep').evaluate((g) => Number(/translate\(([\d.]+)/.exec(g.getAttribute('transform') ?? '')?.[1]));

test('the explanation opens by keyboard and explains the red dot in words, without a sound', async ({ page }) => {
  await openWhyWithKeyboard(page);
  await expect(why(page).getByText('No note has been struck in this sweep yet.')).toBeVisible();

  // Walk to the red dot with the keyboard: 41 presses on the slider.
  await slider(page).focus();
  for (let i = 0; i < 41; i++) await page.keyboard.press('ArrowRight');
  await expect(why(page).locator('.readout', { hasText: '42 of 240' })).toBeVisible();
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /^Column 42 of 240, 17\.1% to 17\.5% of the way across$/);

  const table = why(page).getByRole('table', { name: /column 42 of 240/ });
  await expect(table).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(13); // the header and twelve bands
  // Band 2 is the second row from the bottom of the table: the highest band is first.
  const band2 = table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: '2', exact: true }) });
  await expect(band2).toContainText('marimba G4');
  await expect(band2).toContainText('G3 at 100%');

  // The sentence for the loudest struck note in this column is the red dot's.
  const sentence = why(page).locator('.why-band');
  await expect(sentence).toContainText('Band 2, 17.1% to 17.5% of the way across, 8.3% to 16.7% of the way up, 5.1 s into the sweep');
  await expect(sentence).toContainText('so the note is played on the marimba, an octave above the held note: G4');
  await expect(why(page).getByText(/^Low note A1, fixed by a timetable and not by the picture/)).toBeVisible();

  // Looking at a column makes no sound and does not start the scan.
  expect(await scanNotes(page)).toEqual([]);
  await expect(page.getByText('Scan stopped.')).toBeVisible();
});

test('explain any band: a loud cell that is not a peak says so, and a silent band says it is silent', async ({ page }) => {
  await openWhyWithKeyboard(page);
  await slider(page).focus();
  for (let i = 0; i < 44; i++) await page.keyboard.press('ArrowRight'); // column 44 (0-based): inside the red dot (columns 40 to 47), after its first peak
  await why(page).getByLabel('Explain band').selectOption({ label: '2: G3, 8.3% to 16.7% of the way up' });
  await expect(why(page).locator('.why-band')).toContainText('The held note G3 sounds at 100% of its full loudness.');
  await expect(why(page).locator('.why-band')).toContainText('No note is struck here: the cell is not a peak');
  await why(page).getByLabel('Explain band').selectOption({ label: '12: C6, 91.7% to 100% of the way up' });
  await expect(why(page).locator('.why-band')).toContainText('The held note C6 is silent here.');
  await expect(why(page).locator('.why-band')).toContainText('has no colour to speak of');
});

test('while the scan plays the explanation follows the line, the controls rest, and nothing is announced', async ({ page }) => {
  await openWhyWithKeyboard(page);
  await startScan(page);
  await expect(why(page).getByText('Following the line while the scan plays.')).toBeVisible();
  await expect(slider(page)).toBeDisabled();
  await expect(why(page).getByRole('button', { name: 'Later column' })).toBeDisabled();
  await expect(why(page).locator('[aria-live], [role="status"], [role="alert"]')).toHaveCount(0);

  // The column in the table's caption moves with the line, which the audio clock sets.
  const caption = why(page).locator('caption');
  const first = await caption.innerText();
  await page.waitForTimeout(2500);
  const second = await caption.innerText();
  expect(second).not.toBe(first);
  const columnNow = Number(/column (\d+) of 240/.exec(second)?.[1]);
  const x = await lineX(page);
  expect(Math.abs(columnNow - 1 - x)).toBeLessThan(10); // within a second of the line (8 columns a second)

  // The first chime (5.1 s) fills in "Last struck note", in the words of the note that sounded.
  const last = why(page).locator('.why-last');
  await expect(last).toContainText('Band 2', { timeout: 10_000 });
  await expect(last).toContainText('played on the marimba, an octave above the held note: G4');

  // Esc stops the scan and clears it.
  await page.keyboard.press('Escape');
  await expect(page.getByText('Scan stopped.')).toBeVisible();
  await expect(last).toHaveText('No note has been struck in this sweep yet.');
  await expect(slider(page)).toBeEnabled();
});

test('changing the scan sound while it plays: the line keeps moving, and a note already played keeps its own instrument', async ({ page }) => {
  test.setTimeout(90_000);
  await openWhyWithKeyboard(page);
  await startScan(page);
  const last = why(page).locator('.why-last');
  // The red dot, 5.1 s in. The sound must be changed before the green dot sounds at 10.1 s.
  await expect(last).toContainText('played on the marimba', { timeout: 10_000 });

  await page.getByLabel('Scan sound').selectOption({ label: 'Music box' });
  // The note that already sounded was a marimba note, and the explanation still says so.
  await expect(last).toContainText('played on the marimba');
  const x0 = await lineX(page);
  await page.waitForTimeout(1000);
  expect((await lineX(page)) - x0).toBeGreaterThan(5); // 8 picture units a second: the line did not stop

  // The next note (the green dot, 10.1 s) is struck by the music box, and says so.
  await expect(last).toContainText('played on the music box, an octave above the held note: E6', { timeout: 15_000 });
  await expect(last).not.toContainText('marimba');
});

test('on the radar a place is a bearing and a distance from the centre', async ({ page }) => {
  await page.locator('.scan select').first().selectOption({ label: 'Test circle: a radar turn' });
  await openWhyWithKeyboard(page);
  await expect(why(page).locator('caption')).toContainText('0° to 3° round (0° is east, turning anticlockwise)');
  await expect(why(page).getByRole('table')).toContainText('75% to 83% of the way out from the centre');
  // The explanation says nothing about the ground: a circle on a flat map is not a circle on the globe.
  await expect(why(page).locator('.why-band')).not.toContainText('globe');
});

test('the fixed choices are listed apart from the picture, each with a reason, evidence and a tag', async ({ page }) => {
  await openWhyWithKeyboard(page);
  const fixed = why(page).getByRole('region', { name: 'Fixed by us' });
  await expect(fixed.getByRole('heading', { name: 'Rules for reading the picture' })).toBeVisible();
  await expect(fixed.getByRole('heading', { name: 'Decoration: carries no data' })).toBeVisible();
  const items = fixed.getByRole('listitem');
  expect(await items.count()).toBeGreaterThanOrEqual(10);
  for (const item of await items.all()) {
    await expect(item).toContainText('Why:');
    await expect(item).toContainText('Evidence:');
    await expect(item).toContainText(/\[(Verified|Design choice|Unverified)\]/);
  }
  // Honest about what is not known: the spacing has a source for its reason, but nobody has listened.
  const spacing = fixed.getByRole('listitem').filter({ hasText: 'Which note a band plays' });
  await expect(spacing).toContainText('[Design choice]');
  await expect(spacing).toContainText('Unverified: that the new spacing sounds clearer');
  // The scale and the low note are decoration, listed under that heading.
  const decoration = fixed.locator('h5:has-text("Decoration") + ul');
  await expect(decoration).toContainText('C major pentatonic');
  await expect(decoration).toContainText('I, VIm, IV, V in C (C2, A1, F2, G2)');
});

test('the legend keeps what comes from the picture apart from what is fixed by us', async ({ page }) => {
  await page.getByText('What the marks mean', { exact: true }).click();
  const legend = page.getByRole('list', { name: 'What the marks and bars mean' });
  await expect(legend.getByText('From the picture', { exact: true })).toBeVisible();
  await expect(legend.getByText('Fixed by us, not from the picture', { exact: true })).toBeVisible();
  const text = await legend.innerText();
  expect(text.indexOf('First bar: the low note')).toBeGreaterThan(text.indexOf('Fixed by us, not from the picture'));
  expect(text.indexOf('Round mark')).toBeLessThan(text.indexOf('Fixed by us, not from the picture'));
});

test('the Earth rhythm is unchanged while the explanation follows the scan', async ({ page }) => {
  await openApp(page, 'play');
  await startWithKeyboard(page);
  await notesAfter(page, 0, 4);
  await page.getByText('Scan settings', { exact: true }).click();
  await openWhyWithKeyboard(page);
  await startScan(page);
  const mark = await noteCount(page);
  const during = await notesAfter(page, mark, 8);
  expect(during.every((n) => n.region === 'boundary_current')).toBe(true);
  await expect(page.getByRole('status')).toHaveText(/Playing/);
});
