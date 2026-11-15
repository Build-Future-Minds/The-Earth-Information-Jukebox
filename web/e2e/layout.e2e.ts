// Layout after Dev B saw it live (15 Nov): real tabs, a player bar, and less scrolling.
// Practice data: the picture is drawn as a 2:1 placeholder, the same shape as the ocean map.
import { expect, test, type Page } from '@playwright/test';
import { openApp } from './helpers';

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Pages' });

test('page links are tabs with icons', async ({ page }) => {
  await openApp(page);
  for (const name of ['Listen', 'Compare', "How it's made", 'Play along']) {
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
  const picture = await page.locator('figure.scene').boundingBox();
  expect(picture!.y).toBeLessThan(500);
});

test('the player bar holds the controls and the timeline', async ({ page }) => {
  await openApp(page);
  const bar = page.getByRole('region', { name: 'Playback controls' });
  await expect(bar.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await expect(bar.getByRole('slider', { name: /Rhythm timeline/ })).toBeVisible();
  await expect(bar.getByRole('button', { name: 'Stop', exact: true })).toContainText('Esc');
});
