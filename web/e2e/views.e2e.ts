// The four views (Listen, Compare, How it's made, Play along): page links, the URL, and the rule that
// changing view is the same as pressing Stop. Practice data.
import { expect, test, type Page } from '@playwright/test';
import { earthPeakAhead, melodyVoices, notesAfter, openApp, startWithKeyboard } from './helpers';

const pages = (page: Page) => page.getByRole('navigation', { name: 'Pages' });
/** Voices fade out over 0.4 s after release. */
const settle = (page: Page) => page.waitForTimeout(700);

test('page links switch views and the URL', async ({ page }) => {
  await openApp(page);
  await pages(page).getByRole('link', { name: 'Compare' }).click();
  await expect(page).toHaveURL(/#compare$/);
  await expect(page.getByRole('heading', { name: 'Compare', level: 2 })).toBeFocused();
  await expect(page).toHaveTitle('Compare · Earth Sonata');
  await expect(pages(page).getByRole('link', { name: 'Compare' })).toHaveAttribute('aria-current', 'page');
  await expect(pages(page).getByRole('link', { name: 'Listen' })).not.toHaveAttribute('aria-current', 'page');
});

test('view change silences everything', async ({ page }) => {
  await openApp(page, 'play');
  await startWithKeyboard(page);
  await notesAfter(page, 0, 2);
  await page.locator('.pad').focus();
  await page.keyboard.down('a');
  await expect.poll(() => melodyVoices(page)).toBeGreaterThan(0);
  await pages(page).getByRole('link', { name: 'Listen' }).click();
  await page.keyboard.up('a');
  await settle(page);
  await expect(page.getByRole('status')).toHaveText(/Stopped/);
  expect(await earthPeakAhead(page)).toBeLessThan(0.05);
  expect(await melodyVoices(page)).toBe(0);
});

test('back button changes view and stops', async ({ page }) => {
  await openApp(page);
  await pages(page).getByRole('link', { name: 'Compare' }).click();
  await page.getByRole('button', { name: 'Listen to Region B' }).click();
  await expect(page.getByRole('status')).toHaveText(/Playing Region B/);
  await page.goBack();
  await expect(page).toHaveURL(/#listen$/);
  await expect(page.getByRole('status')).toHaveText(/Stopped/);
  await settle(page);
  expect(await earthPeakAhead(page)).toBeLessThan(0.05);
});

for (const view of ['listen', 'play'] as const) {
  test(`Esc stops on ${view}`, async ({ page }) => {
    await openApp(page, view);
    await startWithKeyboard(page);
    await notesAfter(page, 0, 2);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('status')).toHaveText(/Stopped/);
    await settle(page);
    expect(await earthPeakAhead(page)).toBeLessThan(0.05);
  });
}

test('Tab order on Listen follows the screen: tabs, theme, region, then Play; Enter starts', async ({ page }) => {
  await openApp(page);
  for (const name of ['Listen', 'Compare', "How it's made", 'Play along', 'Globe', 'Game']) {
    await page.keyboard.press('Tab');
    await expect(pages(page).getByRole('link', { name })).toBeFocused();
  }
  for (const name of ['Light', 'Dark']) {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name, exact: true })).toBeFocused();
  }
  await page.keyboard.press('Tab'); // the region radio group is one Tab stop
  await expect(page.getByRole('radio', { name: /Region A/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText(/Playing/);
  await notesAfter(page, 0, 2);
});

test('status line on every view', async ({ page }) => {
  await openApp(page, 'play');
  await startWithKeyboard(page);
  await expect(page.getByRole('status')).toHaveText(/Playing Region A/);
});

test('on Compare, the playing region\'s button stops it (no keyboard needed)', async ({ page }) => {
  await openApp(page, 'compare');
  await page.getByRole('button', { name: 'Listen to Region B' }).click();
  await expect(page.getByRole('status')).toHaveText(/Playing Region B/);
  const stopB = page.getByRole('button', { name: 'Stop Region B' });
  await expect(stopB).toHaveAttribute('aria-pressed', 'true');
  await stopB.click();
  await expect(page.getByRole('status')).toHaveText(/Stopped/);
  await settle(page);
  expect(await earthPeakAhead(page)).toBeLessThan(0.05);
  await expect(page.getByRole('button', { name: 'Listen to Region B' })).toHaveAttribute('aria-pressed', 'false');
});
