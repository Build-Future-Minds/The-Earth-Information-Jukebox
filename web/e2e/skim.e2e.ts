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

test('How it\'s made is three pictures, the rule in one line, three honesty lines and the credit, on one screen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, 'how');
  const steps = page.getByRole('list', { name: 'How a picture becomes a rhythm' }).getByRole('listitem');
  await expect(steps).toHaveCount(3);
  await expect(steps.nth(0)).toContainText('A circle on the NASA picture');
  await expect(steps.nth(1)).toContainText('Which way the lines run');
  await expect(steps.nth(2)).toContainText('Agreement sets the rhythm');
  for (const i of [0, 1, 2]) await expect(steps.nth(i).locator('svg, .how-thumb')).not.toHaveCount(0);
  await expect(page.getByRole('main')).toContainText('0.75 − 0.25 × alignment');
  await expect(page.getByRole('main')).toContainText('The rhythm rule is a choice we made.');
  await expect(page.getByRole('main')).toContainText('It describes the picture, not water speed or ocean health.');
  await expect(page.getByRole('main')).toContainText('Synthetic fixture'); // practice credit
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollHeight, window.innerHeight]);
  expect(scroll).toBeLessThanOrEqual(inner + 2);
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

for (const [w, h] of [[1024, 768], [768, 1024]] as const) {
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
