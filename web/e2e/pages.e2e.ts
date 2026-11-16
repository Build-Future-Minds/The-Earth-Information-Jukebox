// Every published page has a way back to the app; none is a dead end (Dev B, 15 Nov).
import { expect, test } from '@playwright/test';

for (const [name, path] of [
  ['globe', '/globe.html'],
  ['listening game', '/tools/listening_game.html'],
] as const) {
  test(`the ${name} page links back to the app`, async ({ page }) => {
    await page.goto(path);
    const back = page.getByRole('link', { name: /Back to Earth Sonata/ });
    await expect(back).toBeVisible();
    await back.click();
    await expect(page.getByRole('heading', { name: /Earth Sonata/, level: 1 })).toBeVisible();
  });
}
