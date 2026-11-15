// Visual-first controls (team rule, 15 Nov): icon buttons with a one-word label that is also the
// accessible name, and the sound settings behind one "Sound" button. Practice data.
import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test.beforeEach(async ({ page }) => openApp(page));

test('play controls are icon buttons with one-word names', async ({ page }) => {
  const controls = page.getByRole('region', { name: 'Playback controls' });
  for (const name of ['Play', 'Stop', 'Replay', 'Explain', 'Sound']) {
    const button = controls.getByRole('button', { name, exact: true });
    await expect(button).toBeVisible();
    await expect(button.locator('svg')).toHaveCount(1);
  }
  await expect(controls.getByRole('button', { name: 'Stop', exact: true })).toHaveAttribute('aria-keyshortcuts', 'Escape');
});

test('Play turns into Pause while playing, and back after Pause', async ({ page }) => {
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(/Playing/);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(/Paused/);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});

test('Sound shows speed and volume, with no decibel numbers', async ({ page }) => {
  const sound = page.getByRole('button', { name: 'Sound', exact: true });
  await expect(sound).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('slider', { name: 'Volume' })).toBeHidden();
  await sound.click();
  await expect(sound).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: '1×', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '½×', exact: true }).click();
  await expect(page.getByRole('button', { name: '½×', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('slider', { name: 'Volume' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Playback controls' })).not.toContainText('dB');
});

test('pressing a circle on the picture selects that region', async ({ page }) => {
  await page.locator('.box[data-region]').nth(1).click();
  await expect(page.getByRole('status')).toHaveText(/Stopped\. Region B selected\./);
  await expect(page.getByRole('radio', { name: /Region B/ })).toBeChecked();
});

test('practice data has one picture, so there is no picture choice', async ({ page }) => {
  await expect(page.getByRole('group', { name: 'Picture' })).toHaveCount(0);
});
