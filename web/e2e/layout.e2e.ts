// Layout after Dev B saw it live (15 Nov): real tabs, a player bar, and less scrolling.
// Listen since P1: three steps, the picture, and the player bar with the scan's sound line.
// Practice data: the scan reads the TEST INPUT picture.
import { expect, test, type Page } from '@playwright/test';
import { openApp, startWithKeyboard } from './helpers';

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Pages' });

test('page links are tabs with icons', async ({ page }) => {
  await openApp(page);
  for (const name of ['Listen', 'Compare', "How it's made", 'Play along', 'Globe', 'Game']) {
    await expect(tabs(page).getByRole('link', { name }).locator('svg')).toHaveCount(1);
  }
});

test('Listen fits one screen at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollHeight, window.innerHeight]);
  expect(scroll).toBeLessThanOrEqual(inner + 2);
});

test('on a phone the tabs sit at the bottom and the picture starts on the first screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  const nav = await tabs(page).boundingBox();
  expect(nav!.y + nav!.height).toBeGreaterThanOrEqual(840);
  const picture = await page.locator('.listen-figure').boundingBox();
  expect(picture!.y).toBeLessThan(500);
});

test('the player bar holds the controls and the sound line, which runs under the picture', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  const bar = page.getByRole('region', { name: 'Step 3 of 3: play' });
  await expect(bar.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await expect(bar.locator('.sound-line')).toBeVisible();
  await expect(bar.getByRole('button', { name: 'Stop', exact: true })).toContainText('Esc');
  // The sound line is the picture's own x axis: same left edge, same width.
  const lane = (await bar.locator('.sl-lane').boundingBox())!;
  const picture = (await page.locator('.listen-figure .chart svg').boundingBox())!;
  expect(Math.abs(lane.x - picture.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(lane.width - picture.width)).toBeLessThanOrEqual(2);
});

// The Earth rhythm's beat lane and its legend left Listen in P1 (decision D1); they come back with
// P4's "Add the Earth rhythm" switch. Kept, not deleted, so P4 turns it back on.
test.fixme('the timeline has a two-mark legend, and the keys are described for screen readers (returns with P4)', async ({ page }) => {
  await openApp(page);
  const legend = page.locator('.track-legend');
  await expect(legend).toContainText('First pulse');
  await expect(legend).toContainText('Second pulse');
  await expect(page.locator('.track-hint')).toHaveCount(0);
  const lane = page.getByRole('slider', { name: /Rhythm timeline/ });
  await expect(lane).toHaveAccessibleDescription(/arrow keys/);
});

test('Listen still fits one screen at 1440x900 while playing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await startWithKeyboard(page);
  await page.waitForTimeout(300);
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollHeight, window.innerHeight]);
  expect(scroll).toBeLessThanOrEqual(inner + 2);
});
