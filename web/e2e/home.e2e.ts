// Home, the landing page (docs/page_plan.md, P0), on the practice data. An empty address shows Home;
// "Start listening" and every quick link open their page; a shared #listen link skips Home; nothing
// sounds before a press. NASA links and credits are read from the same JSON files the app reads.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { melodyVoices, noteCount } from './helpers';

interface SceneSource { svs_id: number | null; url: string; title: string; credit: string }
const readSource = (rel: string): SceneSource =>
  JSON.parse(readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8')).source;

// Every real picture's NASA page: data/scene.json, then each data/<folder>/scene.json (as sources.ts).
const dataDir = new URL('../../data/', import.meta.url);
const NASA = ['data/scene.json', ...readdirSync(dataDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(new URL(`${d.name}/scene.json`, dataDir)))
  .map((d) => `data/${d.name}/scene.json`)
  .sort()]
  .map(readSource)
  .filter((s) => s.svs_id !== null && s.url.startsWith('https://svs.gsfc.nasa.gov/'));
// The browser tests run on practice data, so the opening picture is the practice frame.
const PRACTICE = readSource('fixtures/mock/scene.mock.json');

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Pages' });
const quick = (page: Page) => page.getByRole('region', { name: 'Quick links' });
const scanNotes = (page: Page) => page.evaluate(() => (window as unknown as { __scanNotes?: unknown[] }).__scanNotes?.length ?? 0);
const problem = (page: Page) => page.getByRole('heading', { level: 2, name: /the data stays closed/ });
/** The Earth synth exists only after Play has started the audio (transport.ts, initAudio). */
const audioStarted = (page: Page) => page.evaluate(() => 'undefined' !== typeof (window as unknown as { __earthSynth?: unknown }).__earthSynth);

async function expectListen(page: Page) {
  await expect(page).toHaveURL(/#listen$/);
  await expect(tabs(page).getByRole('link', { name: 'Listen' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
}

test('the site opens on Home when the address has no #', async ({ page }) => {
  await page.goto('/');
  await expect(problem(page)).toBeVisible();
  await expect(page).toHaveTitle('Home · Earth Sonata');
  await expect(tabs(page).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  // Home has no picture or region choice and no player.
  await expect(page.getByRole('group', { name: /Picture/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toHaveCount(0);
});

test('an unknown address shows Home too', async ({ page }) => {
  await page.goto('/#nope');
  await expect(problem(page)).toBeVisible();
});

test('one h1, headings in order, and the picture has a description and the credit', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  const levels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((hs) =>
    hs.filter((h) => (h as HTMLElement).offsetParent !== null || getComputedStyle(h).position === 'fixed').map((h) => Number(h.tagName[1])));
  expect(levels[0]).toBe(1);
  for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
  const picture = page.getByRole('img', { name: new RegExp(`^${PRACTICE.title}, with two circles: Region A, .+; Region B, .+\\.$`) });
  await expect(picture).toBeVisible();
  await expect(page.getByText(`Visualization: ${PRACTICE.credit}`)).toBeVisible();
});

test('"Start listening" opens Listen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Start listening' }).click();
  await expectListen(page);
});

test('a shared #listen link opens Listen directly', async ({ page }) => {
  await page.goto('/#listen');
  await expectListen(page);
  await expect(problem(page)).toHaveCount(0);
});

test('every quick link in the app opens its page', async ({ page }) => {
  for (const [name, hash, tab] of [['Listen', 'listen', 'Listen'], ['Compare', 'compare', 'Compare'], ["How it's made", 'how', "How it's made"]]) {
    await page.goto('/');
    await quick(page).getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${hash}$`));
    await expect(tabs(page).getByRole('link', { name: tab })).toHaveAttribute('aria-current', 'page');
  }
  // The game is its own page, and its way back lands on Home.
  await page.goto('/');
  await quick(page).getByRole('link', { name: 'Game', exact: true }).click();
  await expect(page).toHaveURL(/\/tools\/listening_game\.html$/);
  await page.getByRole('link', { name: /Back to Earth Sonata/ }).click();
  await expect(problem(page)).toBeVisible();
});

test('the NASA quick links are the pages named in each scene.json', async ({ page }) => {
  expect(NASA.map((s) => s.svs_id)).toEqual([3912, 5669, 4285]);
  // Answer NASA's pages here, so the test checks our links without leaving for the internet.
  await page.route('https://svs.gsfc.nasa.gov/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>NASA page</title>' }));
  for (const s of NASA) {
    await page.goto('/');
    const link = quick(page).getByRole('link', { name: new RegExp(`^SVS ${s.svs_id}`) });
    await expect(link).toHaveAttribute('href', s.url);
    await expect(link).toContainText(s.title);
    await link.click();
    await expect(page).toHaveURL(s.url);
  }
});

test('each of the five steps links to its page', async ({ page }) => {
  await page.goto('/');
  const steps = page.getByRole('region', { name: 'How to use it' }).getByRole('link');
  await expect(steps).toHaveCount(5);
  const hrefs = await steps.evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs).toEqual(['#listen', '#listen', '#listen', '#compare', 'tools/listening_game.html']);
  await steps.nth(3).click();
  await expect(tabs(page).getByRole('link', { name: 'Compare' })).toHaveAttribute('aria-current', 'page');
});

test('the Home tab brings focus to the problem sentence', async ({ page }) => {
  await page.goto('/#compare');
  await tabs(page).getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL(/#home$/);
  await expect(problem(page)).toBeFocused();
});

test('no sound starts before a press', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);
  expect(await audioStarted(page)).toBe(false);
  expect(await noteCount(page)).toBe(0);
  expect(await scanNotes(page)).toBe(0);
  expect(await melodyVoices(page)).toBe(0);
  // Home has no player, so no playing status for a screen reader to announce.
  await expect(page.getByRole('status')).toHaveCount(0);
  // Following "Start listening" is not a press of Play: Listen opens silent.
  await page.getByRole('link', { name: 'Start listening' }).click();
  await expectListen(page);
  await page.waitForTimeout(1500);
  expect(await audioStarted(page)).toBe(false);
  expect(await noteCount(page)).toBe(0);
  await expect(page.getByRole('status')).toHaveText(/Stopped/);
  // The check can fail: one press of Play does start the sound. On Listen that sound is the picture
  // scan (decision D1), whose first chime comes a few seconds into the sweep.
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(() => scanNotes(page), { timeout: 20_000 }).toBeGreaterThan(0);
});
