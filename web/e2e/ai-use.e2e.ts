// AI use: the tab, the page and its layout. Nothing on it makes a sound.
import { expect, test, type Page } from '@playwright/test';
import { openApp } from './helpers';

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Pages' });

test('the AI use tab opens the page, marks itself current, and moves focus to the heading', async ({ page }) => {
  await openApp(page);
  await tabs(page).getByRole('link', { name: 'AI use' }).click();
  await expect(page).toHaveURL(/#ai$/);
  await expect(page).toHaveTitle('AI use · Earth Sonata');
  await expect(tabs(page).getByRole('link', { name: 'AI use' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'AI use', level: 2 })).toBeFocused();
});

test('a shared #ai link opens the page, with its six sections and the first answer in view', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, 'ai');
  await expect(page.locator('.ai-title')).toBeInViewport();
  await expect(page.locator('.ai-section > h3')).toHaveCount(6);
  await expect(page.locator('.ai-facts > div')).toHaveCount(3);
  await expect(page.locator('.ai-facts > div').first()).toContainText('AI did not make the sound.');
  await expect(page.locator('.ai-facts > div').first()).toBeInViewport();
});

test('the page links to How it’s made, and Home links to the page', async ({ page }) => {
  await openApp(page, 'ai');
  await page.getByRole('main').getByRole('link', { name: 'How it’s made' }).first().click();
  await expect(page).toHaveURL(/#how$/);
  await page.goto('/');
  await page.getByRole('region', { name: 'Quick links' }).getByRole('link', { name: 'AI use', exact: true }).click();
  await expect(page).toHaveURL(/#ai$/);
});

test('the page has no link to the log and says nothing about roles', async ({ page }) => {
  await openApp(page, 'ai');
  const main = page.getByRole('main');
  await expect(main.locator('a[href*="AI_USE"]')).toHaveCount(0);
  for (const word of ['Developer', 'Student', 'Mr. E']) await expect(main).not.toContainText(word);
});

for (const w of [320, 390, 640, 768, 1023, 1024, 1199, 1440, 1600]) {
  test(`at ${w}px wide: no sideways scroll, and every tab is on screen`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 800 });
    await openApp(page, 'ai');
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(sw).toBeLessThanOrEqual(iw);
    for (const name of ['Home', 'Listen', 'Compare', "How it's made", 'Play along', 'Globe', 'AI use', 'Game']) {
      await expect(tabs(page).getByRole('link', { name })).toBeInViewport({ ratio: 1 });
    }
    // The page itself stays inside the window too.
    const right = await page.locator('.ai').evaluate((el) => el.getBoundingClientRect().right);
    expect(right).toBeLessThanOrEqual(iw);
  });
}

// Eight tabs are wide: from 1024px the tabs used to sit on top of the EARTH SONATA title (they did with
// seven), and on a phone "COMPARE" spilled out of its cell. Neither scrolls the page, so the sideways-scroll
// check above cannot see them.
for (const w of [1024, 1100, 1199, 1200, 1280, 1359, 1360, 1440, 1600]) {
  test(`at ${w}px the title, the tabs and the theme switch do not touch`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 800 });
    await openApp(page, 'ai');
    const box = (sel: string) => page.locator(sel).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right };
    });
    // The title is nowrap text inside a box that can shrink, so measure the text itself.
    const title = await box('.brand h1');
    const nav = await box('.page-links');
    const sw = await box('.theme-switch');
    expect(title.right).toBeLessThanOrEqual(nav.left);
    expect(nav.right).toBeLessThanOrEqual(sw.left);
  });
}

for (const w of [320, 360, 390, 414, 430, 640, 768]) {
  test(`at ${w}px every tab's words fit inside its cell`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 800 });
    await openApp(page, 'ai');
    const spill = await tabs(page).locator('a').evaluateAll((links) =>
      links.map((a) => ({ name: a.textContent, over: a.querySelector('span')!.scrollWidth - a.getBoundingClientRect().width })));
    for (const s of spill) expect(s.over, s.name ?? '').toBeLessThanOrEqual(0.5);
  });
}

test('headings sit in a left column on a wide screen, and above their text on a phone', async ({ page }) => {
  const place = () => page.locator('.ai-section').nth(1).evaluate((s) => {
    const h = s.querySelector('h3')!.getBoundingClientRect();
    const b = s.querySelector('.ai-body')!.getBoundingClientRect();
    return { hRight: h.right, hBottom: h.bottom, bLeft: b.left, bTop: b.top };
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, 'ai');
  let p = await place();
  expect(p.hRight).toBeLessThanOrEqual(p.bLeft);
  await page.setViewportSize({ width: 390, height: 844 });
  p = await place();
  expect(p.hBottom).toBeLessThanOrEqual(p.bTop);
});

test('the route has five steps, and three of them are our code', async ({ page }) => {
  await openApp(page, 'ai');
  await expect(page.locator('.ai-route li')).toHaveCount(5);
  await expect(page.locator('.ai-route li.ours')).toHaveCount(3);
  await expect(page.locator('.ai-route .ai-step').first()).toHaveText('NASA’s computers make a picture of the oceans.');
});
