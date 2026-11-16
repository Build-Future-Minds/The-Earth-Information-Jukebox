// Visual-first controls (team rule, 15 Nov): icon buttons with a one-word label that is also the
// accessible name, and the sound settings behind one "Sound" button. Practice data.
// Listen's player bar plays the picture scan (P1, decision D1): no Replay (Stop then Play does it).
import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test.beforeEach(async ({ page }) => openApp(page));

const player = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Step 3 of 3: play' });

test('play controls are icon buttons with one-word names', async ({ page }) => {
  const controls = player(page);
  for (const name of ['Play', 'Stop', 'Explain', 'Sound']) {
    const button = controls.getByRole('button', { name, exact: true });
    await expect(button).toBeVisible();
    await expect(button.locator('svg')).toHaveCount(1);
  }
  await expect(controls.getByRole('button', { name: 'Replay', exact: true })).toHaveCount(0);
  await expect(controls.getByRole('button', { name: 'Stop', exact: true })).toHaveAttribute('aria-keyshortcuts', 'Escape');
});

test('Play turns into Pause while playing, and back after Pause', async ({ page }) => {
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(/Playing/);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(/Paused/);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});

test('Sound shows speed, volume and the instruments, with no decibel numbers', async ({ page }) => {
  const sound = page.getByRole('button', { name: 'Sound', exact: true });
  await expect(sound).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('slider', { name: 'Volume' })).toBeHidden();
  await sound.click();
  await expect(sound).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: '1×', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '½×', exact: true }).click();
  await expect(page.getByRole('button', { name: '½×', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('slider', { name: 'Volume' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Instruments' })).toBeVisible();
  await expect(player(page)).not.toContainText('dB');
});

test('pressing a circle on the picture chooses it in step 2', async ({ page }) => {
  await page.locator('.listen-figure .box[data-region]').first().click();
  await expect(page.getByRole('status')).toHaveText(/Stopped\. Test circle selected\./);
  await expect(page.getByRole('radio', { name: /Test circle/ })).toBeChecked();
});

test('practice data has one picture: step 1 lists it, labelled as test input', async ({ page }) => {
  const step1 = page.getByRole('group', { name: 'Step 1 of 3: Choose a NASA picture' });
  await expect(step1.getByRole('radio')).toHaveCount(1);
  await expect(step1.getByRole('radio')).toBeChecked();
  await expect(step1).toContainText('Test input, not NASA data');
});
