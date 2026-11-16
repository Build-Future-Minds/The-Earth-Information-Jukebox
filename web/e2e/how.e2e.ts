// How it's made (P3): formulas with MathML and a plain-words line, every chart with its numbers,
// the honesty lines linked to their evidence, every stage opened by keyboard, and KaTeX loaded only
// when the page is opened.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { HONESTY_LINES } from '../src/data/honesty';
import { openApp as openView } from './helpers';

/** Open every stage, so the charts and formulas inside are laid out. */
async function openAllStages(page: Page) {
  const buttons = page.locator('.how-stage-h button');
  for (let i = 0; i < (await buttons.count()); i++) {
    if ((await buttons.nth(i).getAttribute('aria-expanded')) === 'false') await buttons.nth(i).click();
  }
}

/** Open a view; How it's made loads on demand, so wait for its stages before counting anything. */
async function openApp(page: Page, view: 'listen' | 'how') {
  await openView(page, view);
  if (view === 'how') await expect(page.locator('.how-stage-h button').first()).toBeVisible();
}

test('every formula renders as MathML for screen readers, with its plain-words line', async ({ page }) => {
  await openApp(page, 'how');
  const formulas = page.locator('.how-formula');
  await expect(formulas.first()).toBeAttached();
  const n = await formulas.count();
  expect(n).toBeGreaterThan(10);
  for (let i = 0; i < n; i++) {
    const f = formulas.nth(i);
    await expect(f.locator('.how-math math')).toHaveCount(1); // the words line may hold inline math too
    await expect(f.locator('.how-words')).toContainText(/In words: \w+/);
  }
  // The drawn copy of every formula, inline ones too, is hidden from screen readers; the MathML is read.
  await expect(page.locator('.how .katex')).not.toHaveCount(0);
  await expect(page.locator('.how .katex-html:not([aria-hidden="true"])')).toHaveCount(0);
  await expect(page.locator('.how .katex-mathml math')).toHaveCount(await page.locator('.how .katex').count());
  await expect(page.locator('.katex-error')).toHaveCount(0);
});

test('every chart has a takeaway, a source and a "Show the numbers" table', async ({ page }) => {
  await openApp(page, 'how');
  await openAllStages(page);
  const charts = page.locator('figure.how-chart');
  const n = await charts.count();
  expect(n).toBeGreaterThanOrEqual(8);
  for (let i = 0; i < n; i++) {
    const chart = charts.nth(i);
    await expect(chart.locator('figcaption b')).not.toBeEmpty();
    await expect(chart.locator('figcaption .how-src')).not.toBeEmpty();
    await expect(chart.locator('svg[role="img"]').first()).toHaveAttribute('aria-label', /^.{30,}$/); // a sentence, not a title
    const numbers = chart.locator('details.how-numbers');
    await expect(numbers).toHaveCount(1);
    await numbers.locator('summary').click();
    await expect(numbers.locator('tbody tr').first()).toBeVisible();
  }
});

test('the three honesty lines are at the top, each linked to the section that backs it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, 'how');
  const lines = page.locator('.how-honest li');
  await expect(lines).toHaveCount(3);
  for (const [i, line] of HONESTY_LINES.entries()) {
    await expect(lines.nth(i)).toContainText(line.text);
    const link = lines.nth(i).getByRole('link', { name: line.evidence });
    await expect(link).toHaveAttribute('href', line.href);
  }
  // At 1440 x 900 the lines are in the first screen.
  await expect(lines.nth(2)).toBeInViewport();

  for (const line of HONESTY_LINES) {
    await page.locator('.how-honest').getByRole('link', { name: line.evidence }).click();
    const place = line.href.split('/')[1];
    const target = page.locator(`#how-${place}`);
    await expect(target).toBeInViewport();
    if (place.startsWith('s')) await expect(target.locator('h4 button')).toHaveAttribute('aria-expanded', 'true');
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  // What backs them: the chain diagram, the rule beside the game's rule, the four measured cases.
  await expect(page.locator('#how-chain svg[role="img"]')).toHaveAttribute('aria-label', /Earth.*Our pixels/);
  await expect(page.locator('#how-s1-7 #how-rule-chart')).toContainText('Design choice');
  await expect(page.locator('#how-s1-7 #how-game-rule-chart')).toContainText('Student B');
  await expect(page.locator('#how-drawing .how-cases tbody tr')).toHaveCount(4);
});

test('a link to a stage opens it and moves focus there', async ({ page }) => {
  await page.goto('/#how/s1-5');
  const button = page.locator('#how-s1-5 h4 button');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(button).toBeFocused();
  await expect(page.locator('#how-s1-5')).toBeInViewport();
  await expect(page.getByRole('heading', { name: /Earth Sonata/ })).toBeVisible(); // still the app, on How it's made
  await expect(page.locator('.page-links [aria-current="page"]')).toHaveText("How it's made");
});

test('every stage opens and closes by keyboard', async ({ page }) => {
  await openApp(page, 'how');
  const buttons = page.locator('.how-stage-h button');
  const n = await buttons.count();
  expect(n).toBe(12);
  for (let i = 0; i < n; i++) {
    const button = buttons.nth(i);
    const body = page.locator(`#${await button.getAttribute('aria-controls')}`);
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(body).toBeVisible();
    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(body).toBeHidden();
  }
});

test('KaTeX and the page load only when How it\'s made is opened, not on Listen', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await openApp(page, 'listen');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(requests.filter((u) => /katex|\/src\/how\//i.test(u))).toEqual([]);

  await page.locator('.page-links').getByRole('link', { name: "How it's made" }).click();
  await expect(page.locator('.how-formula').first()).toBeAttached();
  expect(requests.some((u) => /katex/i.test(u))).toBe(true);
});

test('the listening test says "not run yet" and states the pass mark against chance', async ({ page }) => {
  await openApp(page, 'how');
  const listen = page.locator('#how-listening');
  await expect(listen).toContainText('Not run yet.');
  await expect(listen).toContainText('11 of 1024');
});

test('nothing scrolls sideways on a phone, light or dark; wide formulas scroll in their own box', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ['light', 'dark']) {
    await page.addInitScript((t) => localStorage.setItem('es-theme', t), theme);
    await openApp(page, 'how');
    await openAllStages(page);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
    // A formula wider than the column can be scrolled by keyboard.
    for (const box of await page.locator('.how-math').all()) {
      const wide = await box.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      if (wide) await expect(box).toHaveAttribute('tabindex', '0');
    }
  }
});
