// Compare (Student B's numerals, docs/design/student_b_pictures.html): each region side by side
// with its close-up, numeral, word, play toggle and rhythm row; then the tide table and curves.
import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('each region shows its numeral, word, play toggle and rhythm row; one key; the tide table', async ({ page }) => {
  await openApp(page, 'compare');
  const cards = page.locator('.patch');
  await expect(cards).toHaveCount(2);
  for (const i of [0, 1]) {
    const card = cards.nth(i);
    await expect(card.locator('.numeral')).toHaveText(/^\d\.\d\d$/);
    await expect(card).toContainText(/(Lined up|Partly lined up|Swirly) · second pulse at \d+% of the beat/);
    await expect(card.locator('.plot-row')).toHaveCount(1);
    await expect(card.getByRole('button', { name: /^Listen to Region [AB]$/ })).toBeVisible();
  }
  await expect(page.getByText('thin = swirly · heavy = lined up')).toHaveCount(1);
  await expect(page.locator('.tide-table')).toBeVisible();
  await expect(page.getByRole('table', { name: 'What you hear now, and why' })).toBeVisible();
});

// Was "Compare fits one screen at 1440x900". "What you hear now" (Developer A, 16 Nov) adds the numbers
// behind each beat under the close-ups, so the page now scrolls; the close-ups and the first row of
// those numbers still share the first screen.
test('at 1440x900 the close-ups and the first row of "What you hear now" are on the first screen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, 'compare');
  const bottom = await page.locator('.now-table tbody tr').first().evaluate((el) => el.getBoundingClientRect().bottom);
  expect(bottom).toBeLessThanOrEqual(900);
});
