// The UI pass for skimming judges (Dev B, 15 Nov, impeccable critique): show state, don't narrate it.
import { expect, test } from '@playwright/test';
import { openApp, startWithKeyboard } from './helpers';

test('the status sentence is for screen readers; the player shows state as a chip', async ({ page }) => {
  await openApp(page);
  const status = page.getByRole('status');
  await expect(status).toHaveText(/Stopped\. Region A selected\./);
  const box = await status.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(1); // visually hidden, still read aloud
  const chip = page.locator('.player .now-chip');
  await expect(chip).toContainText('A');
  await expect(chip).toContainText('Ready');
  await startWithKeyboard(page);
  await expect(chip).toContainText('Playing');
});

test('How it\'s made and Play along do not show the region sentence', async ({ page }) => {
  for (const view of ['how', 'play'] as const) {
    await openApp(page, view);
    await expect(page.getByText('Stopped. Region A selected.')).not.toBeInViewport();
  }
});

test('How it\'s made opens on its title, the honesty lines and the two pipelines, with the NASA credit (P3)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, 'how');
  await expect(page.locator('.how-title')).toBeInViewport();
  await expect(page.locator('.how-honest li')).toHaveCount(3);
  await expect(page.locator('.how-honest li').nth(2)).toBeInViewport();
  await expect(page.locator('.how-route')).toHaveCount(2);
  await expect(page.locator('.how-route').first()).toContainText('Structure tensor');
  // The rule, written from the app's own constants.
  await expect(page.locator('#how-s1-7 .katex-mathml')).toContainText(['0.75']);
  await expect(page.locator('#how-sources')).toContainText('NASA/Goddard Space Flight Center Scientific Visualization Studio');
});

test('Listen numbers the steps: region, then Play (practice data has one picture)', async ({ page }) => {
  await openApp(page);
  const steps = page.locator('.step-mark');
  await expect(steps).toHaveText(['1', '2']);
  await expect(page.locator('.region-group .step-mark')).toHaveText('1');
  await expect(page.locator('.player .step-mark')).toHaveText('2');
  // Marks are decoration: names stay exact.
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Region' })).toBeVisible();
});

test('Explain shows the picture: both regions, crop then beat, and one sentence', async ({ page }) => {
  await openApp(page);
  await startWithKeyboard(page);
  await page.getByRole('button', { name: 'Explain', exact: true }).click();
  await expect(page.locator('.explain-row')).toHaveCount(2);
  await expect(page.locator('.explain-row.playing')).toHaveCount(1);
  await expect(page.locator('.explain-line')).toHaveText(/^Region A's lines .+\. Alignment is \d\.\d\d\.$/);
});

test('Play along has one clear start, folded extras, a play-along panel and a one-line game card', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, 'play');
  const main = page.getByRole('main');
  await expect(main.locator('button.primary, .icon-button.primary').first()).toHaveText(/Play the picture/);
  for (const name of ['Scan settings', 'What the marks mean']) {
    await expect(main.locator('details', { has: page.getByText(name, { exact: true }) })).not.toHaveAttribute('open', '');
  }
  const jam = page.getByRole('region', { name: 'Play along with the Earth rhythm' });
  await expect(jam.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await expect(jam.locator('.pad')).toBeVisible();
  await expect(page.getByRole('link', { name: /Play the listening game/ })).toBeVisible();
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(height).toBeLessThan(1500); // was 1818
});

test('the Globe and Game tabs: the globe is its own view, the game tab opens the game page', async ({ page }) => {
  await openApp(page);
  const tabs = page.getByRole('navigation', { name: 'Pages' });
  await tabs.getByRole('link', { name: 'Globe' }).click();
  await expect(page).toHaveURL(/#globe$/);
  await expect(page.getByRole('region', { name: 'Explore the globe' })).toBeVisible();
  await expect(tabs.getByRole('link', { name: 'Game' })).toHaveAttribute('href', 'tools/listening_game.html');
  await tabs.getByRole('link', { name: 'Game' }).click();
  await expect(page.getByRole('link', { name: /Back to Earth Sonata/ })).toBeVisible();
});

test('on Globe, the playing region\'s button stops it (no keyboard needed)', async ({ page }) => {
  await openApp(page, 'globe');
  await page.getByRole('button', { name: /^Play Region B/ }).click();
  await expect(page.getByRole('status')).toHaveText(/Playing Region B/);
  const stopB = page.getByRole('button', { name: 'Stop Region B' });
  await expect(stopB).toHaveAttribute('aria-pressed', 'true');
  await stopB.click();
  await expect(page.getByRole('status')).toHaveText(/Stopped/);
  await expect(page.getByRole('button', { name: /^Play Region B/ })).toHaveAttribute('aria-pressed', 'false');
});

for (const [w, h] of [[1024, 768], [920, 700], [768, 1024]] as const) {
  test(`no sideways scroll at ${w}x${h}, and all six tabs are on screen`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await openApp(page);
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(sw).toBeLessThanOrEqual(iw);
    for (const name of ['Listen', 'Compare', "How it's made", 'Play along', 'Globe', 'Game']) {
      await expect(page.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name })).toBeInViewport();
    }
  });
}

test('Explain before Play says Press Play and shows no "no data" (nothing is missing)', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Explain', exact: true }).click();
  await expect(page.locator('.explain-line')).toHaveText(/Press Play/);
  await expect(page.locator('.explanation')).not.toContainText('no data');
});

test('Compare says the ticks are drawn in the browser to show what is measured', async ({ page }) => {
  await openApp(page, 'compare');
  await expect(page.locator('.numeral-key')).toContainText('Ticks are drawn in your browser');
});
