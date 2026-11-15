// Student B's visual features in the app: beat visualizer, both-rhythms plot, close-ups, explainer.
// Practice data (4 s loop: 8 beats of 0.5 s).
import { expect, test } from '@playwright/test';
import { noteCount, notesAfter, openApp, startWithKeyboard } from './helpers';

test.beforeEach(async ({ page }) => openApp(page));

const lane = (page: import('@playwright/test').Page) => page.getByRole('slider', { name: /Rhythm timeline/ });

test('the beat lane is idle until Start, then follows the audio', async ({ page }) => {
  await expect(lane(page)).toHaveAttribute('aria-disabled', 'true');
  await startWithKeyboard(page);
  await notesAfter(page, 0, 6);
  const played = await page.locator('.track .note.played').count();
  expect(played).toBeGreaterThanOrEqual(4); // pulses light up as they sound
  const t1 = Number(await lane(page).getAttribute('aria-valuenow'));
  await page.waitForTimeout(600);
  const t2 = Number(await lane(page).getAttribute('aria-valuenow'));
  expect((t2 - t1 + 4) % 4).toBeGreaterThan(0.3); // the playhead moves with the sound
});

test('clicking the lane moves playback to that point', async ({ page }) => {
  await startWithKeyboard(page);
  await notesAfter(page, 0, 2);
  await lane(page).scrollIntoViewIfNeeded();
  const box = (await lane(page).boundingBox())!;
  const mark = await noteCount(page);
  // 60% of a 4 s loop = 2.4 s. The next pulse after that is the first pulse of the beat at 2.5 s.
  await lane(page).click({ position: { x: box.width * 0.6, y: box.height / 2 } });
  const next = await notesAfter(page, mark, 4);
  const firstNew = next.find((n) => n.trackTime >= 2.4 - 1e-6 && n.trackTime < 4);
  expect(firstNew?.trackTime).toBe(2.5);
  expect(firstNew?.pulse).toBe(0);
});

test('the arrow keys on the lane step through beats', async ({ page }) => {
  await startWithKeyboard(page);
  await page.getByRole('button', { name: 'Pause' }).click();
  await lane(page).focus();
  await page.keyboard.press('Home');
  await expect(lane(page)).toHaveAttribute('aria-valuenow', '0');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(lane(page)).toHaveAttribute('aria-valuenow', '1');
  await page.keyboard.press('ArrowLeft');
  await expect(lane(page)).toHaveAttribute('aria-valuenow', '0.5');
});

test('both rhythms are drawn on one time line, from the same rule as the sound', async ({ page }) => {
  const rows = page.locator('.plot-row');
  await expect(rows).toHaveCount(2);
  // Practice data: Region A is well aligned (about 54/46), Region B is not (about 69/31) and has 2 missing beats.
  await expect(rows.nth(0).locator('.plot-split')).toHaveText(/^5\d\/4\d$/);
  await expect(rows.nth(1).locator('.plot-split')).toHaveText(/^(6|7)\d\/(3|2)\d$/);
  await expect(rows.nth(1).locator('.missing-beat')).toHaveCount(2);
  await expect(rows.nth(0).locator('svg')).toHaveAttribute('aria-label', /second pulse on average/);
});

test('the explainer and close-ups are present; Listen picks a region and plays it', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'What you are looking at' })).toBeVisible();
  await expect(page.locator('.patch')).toHaveCount(2);
  await page.getByRole('button', { name: 'Listen to Region B' }).click();
  await expect(page.getByRole('status')).toHaveText(/Playing Region B/);
  await expect(page.getByRole('button', { name: 'Listening to Region B' })).toHaveAttribute('aria-pressed', 'true');
});

test('the landing page links to Student B\'s listening game, labelled as a separate practice tool', async ({ page }) => {
  const section = page.getByRole('region', { name: 'Practice: test your ear' });
  await expect(section).toBeVisible();
  await expect(section).toContainText('A separate practice tool');
  const game = section.getByRole('link', { name: /Open the listening game/ });
  await expect(game).toHaveAttribute('href', 'tools/listening_game.html');
  await expect(game).not.toHaveAttribute('target', '_blank');
  await expect(section.getByRole('link', { name: 'quiz player' })).toHaveAttribute('href', 'tools/listening_quiz_player.html');
});
