// Student B's visual features in the app: beat visualizer, both-rhythms plot, close-ups, explainer.
// Practice data (4 s loop: 8 beats of 0.5 s).
import { expect, test } from '@playwright/test';
import { noteCount, notesAfter, openApp, startWithKeyboard } from './helpers';

test.beforeEach(async ({ page }) => openApp(page));

const lane = (page: import('@playwright/test').Page) => page.getByRole('slider', { name: /Rhythm timeline/ });

// The beat lane is the Earth rhythm's timeline on Listen. Since P1 (decision D1) Listen plays the
// picture scan, and the lane comes back with P4's "Add the Earth rhythm" switch. These three tests
// are kept, not deleted, so P4 turns them back on.
test.fixme('the beat lane is idle until Start, then follows the audio (returns with P4)', async ({ page }) => {
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

test.fixme('clicking the lane moves playback to that point (returns with P4)', async ({ page }) => {
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

test.fixme('the arrow keys on the lane step through beats (returns with P4)', async ({ page }) => {
  await startWithKeyboard(page);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
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
  await openApp(page, 'compare');
  const rows = page.locator('.plot-row');
  await expect(rows).toHaveCount(2);
  // Practice data: Region A is well aligned (about 54/46), Region B is not (about 69/31) and has 2 missing beats.
  await expect(rows.nth(0).locator('.plot-split')).toHaveText(/^5\d\/4\d$/);
  await expect(rows.nth(1).locator('.plot-split')).toHaveText(/^(6|7)\d\/(3|2)\d$/);
  await expect(rows.nth(1).locator('.missing-beat')).toHaveCount(2);
  await expect(rows.nth(0).locator('svg')).toHaveAttribute('aria-label', /second pulse on average/);
});

test('the explainer and close-ups are present; Listen picks a region and plays it', async ({ page }) => {
  await openApp(page, 'how');
  await expect(page.locator('.how-route').first()).toContainText('Alignment');
  await openApp(page, 'compare');
  await expect(page.locator('.patch')).toHaveCount(2);
  await page.getByRole('button', { name: 'Listen to Region B' }).click();
  await expect(page.getByRole('status')).toHaveText(/Playing Region B/);
  await expect(page.getByRole('button', { name: 'Stop Region B' })).toHaveAttribute('aria-pressed', 'true');
});

test('Play along links to Student B\'s listening game as a one-line card, with no quiz link', async ({ page }) => {
  await openApp(page, 'play');
  const card = page.getByRole('region', { name: 'Test your ear' });
  await expect(card).toBeVisible();
  const game = card.getByRole('link', { name: 'Play the listening game' });
  await expect(game).toHaveAttribute('href', 'tools/listening_game.html');
  await expect(game).not.toHaveAttribute('target', '_blank');
  await expect(page.getByRole('link', { name: /quiz/i })).toHaveCount(0);
});
