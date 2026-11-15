// Optional melody (separate "user" voice). Real key presses and real mouse presses.
import { expect, test, type Page } from '@playwright/test';
import { followsSchedule, melodyVoices, noteCount, notesAfter, openApp, startWithKeyboard } from './helpers';

test.beforeEach(async ({ page }) => openApp(page, 'play'));

const pad = (page: Page) => page.locator('.pad');
/** Voices fade out over 0.4 s after release. */
const settle = (page: Page) => page.waitForTimeout(700);

test('the Earth rhythm is unchanged while the melody plays', async ({ page }) => {
  await startWithKeyboard(page);
  await notesAfter(page, 0, 4);
  await pad(page).focus();
  const mark = await noteCount(page);
  for (const k of 'asdfghjkjhgfdsa') {
    await page.keyboard.down(k);
    await page.waitForTimeout(100);
    await page.keyboard.up(k);
    await page.waitForTimeout(100);
  }
  const during = await notesAfter(page, mark, 16);
  expect(during.every((n) => n.region === 'boundary_current')).toBe(true);
  expect(followsSchedule(during)).toBe(true);
});

test('letter keys play only while the pad has focus', async ({ page }) => {
  await pad(page).focus();
  await page.keyboard.press('a'); // starts the melody synth
  await settle(page);
  await page.getByRole('button', { name: 'Play', exact: true }).focus();
  for (const k of 'asdfghjk') await page.keyboard.down(k);
  expect(await melodyVoices(page)).toBe(0);
  for (const k of 'asdfghjk') await page.keyboard.up(k);
  await pad(page).focus();
  await page.keyboard.down('a');
  await expect.poll(() => melodyVoices(page)).toBe(1);
  await page.keyboard.up('a');
});

test('a quick first tap does not leave a note stuck', async ({ page }) => {
  await pad(page).focus();
  await page.keyboard.press('d'); // down and up at once, while audio is still starting
  await settle(page);
  expect(await melodyVoices(page)).toBe(0);
});

test('holding a key (auto-repeat) plays one note and releases cleanly', async ({ page }) => {
  await pad(page).focus();
  await page.keyboard.down('d');
  for (let i = 0; i < 5; i++) await page.keyboard.down('d'); // repeat events
  await expect.poll(() => melodyVoices(page)).toBe(1);
  await page.keyboard.up('d');
  await settle(page);
  expect(await melodyVoices(page)).toBe(0);
});

test('Esc while holding, then auto-repeat, then release: nothing stuck', async ({ page }) => {
  await pad(page).focus();
  await page.keyboard.down('f');
  await expect.poll(() => melodyVoices(page)).toBe(1);
  await page.keyboard.press('Escape');
  await page.keyboard.down('f'); // auto-repeat arrives after Stop
  await page.keyboard.up('f');
  await settle(page);
  expect(await melodyVoices(page)).toBe(0);
});

test('on-screen keys play with the mouse', async ({ page }) => {
  const key = page.locator('kbd[data-key=g]');
  await key.hover();
  await page.mouse.down();
  await expect.poll(() => melodyVoices(page)).toBe(1);
  await expect(key).toHaveClass(/down/);
  await page.mouse.up();
  await settle(page);
  expect(await melodyVoices(page)).toBe(0);
  await expect(key).not.toHaveClass(/down/);
});

test('keyboard and mouse on the same note: releasing one keeps it playing', async ({ page }) => {
  await pad(page).focus();
  await page.keyboard.down('g');
  await page.locator('kbd[data-key=g]').hover();
  await page.mouse.down();
  await page.mouse.up();
  await settle(page);
  expect(await melodyVoices(page)).toBe(1); // key still held
  await page.keyboard.up('g');
  await settle(page);
  expect(await melodyVoices(page)).toBe(0);
});

test('leaving the pad releases held notes', async ({ page }) => {
  await pad(page).focus();
  await page.keyboard.down('h');
  await expect.poll(() => melodyVoices(page)).toBe(1);
  await page.keyboard.press('Tab');
  await settle(page);
  expect(await melodyVoices(page)).toBe(0);
  await page.keyboard.up('h');
});
