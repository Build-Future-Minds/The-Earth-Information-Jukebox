// Click or tap the scan's picture to see why a place sounds as it does. What a person does: point at a
// place, read the explanation, and carry on with the keyboard. Practice mode has no NASA image, so the
// scan reads the TEST INPUT picture (audio/scanScore.ts), 240 by 120 picture units:
//   red dot    pixels 40-47 across, rows 100-109: band 2 of 12; its note (marimba G4) is struck in
//              column 41 (0-based), "42 of 240" on the screen, whose centre is (41.5, 105)
//   green dot  inside the test circle: the radar strikes it in column 48, band 9 (bells G6)
// Reads the dev-only log window.__scanNotes (every chime handed to an instrument, with its audio time)
// to check that a click never changes the sound.
import { expect, test, type Page } from '@playwright/test';
import { openApp } from './helpers';

interface ScanNote {
  audioTime: number;
  column: number;
  band: number;
  warm: boolean;
  note: number;
  root: number;
  pan: number;
}

test.beforeEach(async ({ page }) => {
  await openApp(page, 'play');
  await expect(playButton(page)).toBeEnabled(); // the picture is loaded and scored
});

const scanNotes = (page: Page) => page.evaluate(() => (window as unknown as { __scanNotes?: ScanNote[] }).__scanNotes ?? []);
const playButton = (page: Page) => page.getByRole('button', { name: 'Play the picture' });
const picture = (page: Page) => page.locator('.scan-view .scan-picture svg');
const why = (page: Page) => page.locator('.scan-why');
const slider = (page: Page) => page.getByRole('slider', { name: /^Column/ });
const follow = (page: Page) => page.getByRole('checkbox', { name: 'Follow the line while the scan plays' });
const caption = (page: Page) => page.locator('.scan-pick');
const mark = (page: Page) => page.locator('.scan-view .pick-mark');
/** How far the map line has gone, in picture units. */
const lineX = (page: Page) =>
  page.locator('.scan-view .sweep').evaluate((g) => Number(/translate\(([\d.]+)/.exec(g.getAttribute('transform') ?? '')?.[1]));

/** Where a point of the picture (in picture units) is on the screen, with the picture in the middle of
 *  the window so nothing fixed (the phone's tab bar) covers it. */
async function onScreen(page: Page, x: number, y: number) {
  await picture(page).evaluate((svg) => svg.scrollIntoView({ block: 'center' }));
  const p = await picture(page).evaluate((svg, [px, py]) => {
    const q = new DOMPoint(px, py).matrixTransform((svg as SVGSVGElement).getScreenCTM()!);
    return { x: q.x, y: q.y, onPicture: !!document.elementFromPoint(q.x, q.y)?.closest('.scan-picture svg') };
  }, [x, y] as const);
  expect(p.onPicture, `picture point ${x}, ${y} is visible on the screen`).toBe(true);
  return p;
}
async function clickPicture(page: Page, x: number, y: number) {
  const p = await onScreen(page, x, y);
  await page.mouse.click(p.x, p.y);
}
async function startScan(page: Page) {
  await playButton(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/^Scanning the whole picture/)).toBeVisible();
}

test('stopped: a click on the red dot, where its note is struck, explains band 2 and the marimba G4, with no sound', async ({ page }) => {
  await expect(why(page)).not.toHaveAttribute('open');
  await expect(mark(page)).toHaveCount(0);

  await clickPicture(page, 41.5, 105);

  // The fold-out opens on that column and band, as if they had been chosen with its slider and list.
  await expect(why(page)).toHaveAttribute('open');
  await expect(slider(page)).toHaveAttribute('aria-valuetext', 'Column 42 of 240, 17.1% to 17.5% of the way across');
  await expect(why(page).getByLabel('Explain band')).toHaveValue('1');
  const sentence = why(page).locator('.why-band');
  await expect(sentence).toContainText('Band 2, 17.1% to 17.5% of the way across, 8.3% to 16.7% of the way up, 5.1 s into the sweep');
  await expect(sentence).toContainText('so the note is played on the marimba, an octave above the held note: G4');
  // Under the picture, in words: the same cell as the table's row.
  await expect(caption(page)).toContainText('Column 42 of 240, band 2. Held note: G3 at 100%. Struck note: marimba G4.');
  // A place was chosen: the explanation will not follow the line when the scan plays.
  await expect(follow(page)).not.toBeChecked();

  // No sound, and the scan did not start or move.
  expect(await scanNotes(page)).toEqual([]);
  await expect(page.getByText('Scan stopped.')).toBeVisible();
  // Focus was not moved into the explanation or the line under the picture.
  expect(await page.evaluate(() => !!document.activeElement?.closest('.scan-why, .scan-pick'))).toBe(false);
});

test('the middle of the red dot is the exact cell clicked: loud, not a peak, and it names the note the dot made', async ({ page }) => {
  await clickPicture(page, 44.5, 105);
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /^Column 45 of 240,/);
  const sentence = why(page).locator('.why-band');
  await expect(sentence).toContainText('The held note G3 sounds at 100% of its full loudness.');
  await expect(sentence).toContainText('No note is struck here: the cell is not a peak');
  await expect(caption(page).locator('span')).toHaveText(
    'Column 45 of 240, band 2. Held note: G3 at 100%. Struck note: none: not a peak. ' +
      'Nearest struck note in this band: column 42, 3 columns earlier (0.4 s at normal speed): marimba G4.',
  );
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test.describe(`the mark (reduced motion: ${reducedMotion})`, () => {
    test.use({ reducedMotion });
    test('a black-and-white outline of the cell with four ticks; it never moves; the slider moves it', async ({ page }) => {
      await clickPicture(page, 41.5, 105);
      await expect(mark(page)).toHaveCount(1);
      await expect(mark(page)).toHaveAttribute('data-column', '41');
      await expect(mark(page)).toHaveAttribute('data-band', '1');
      // The outline is the cell: the pixels it read, 41 to 42 across and rows 100 to 110.
      const box = () =>
        mark(page).locator('.over path').evaluate((p) => {
          const b = (p as SVGPathElement).getBBox();
          return [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 1000) / 1000);
        });
      expect(await box()).toEqual([41, 100, 1, 10]);
      await expect(mark(page).locator('.over line')).toHaveCount(4);
      // Black and white only: a shape, not a colour.
      const strokes = await mark(page).evaluate((g) => [...new Set([...g.querySelectorAll('path, line')].map((el) => getComputedStyle(el).stroke))]);
      expect(strokes.sort()).toEqual(['rgb(0, 0, 0)', 'rgb(255, 255, 255)']);
      // Nothing animates, and it stays put.
      expect(await mark(page).evaluate((g) => g.getAnimations({ subtree: true }).length)).toBe(0);
      await page.waitForTimeout(400);
      expect(await box()).toEqual([41, 100, 1, 10]);

      // The keyboard route moves the same mark: one column later.
      await slider(page).focus();
      await page.keyboard.press('ArrowRight');
      await expect(mark(page)).toHaveAttribute('data-column', '42');
      expect(await box()).toEqual([42, 100, 1, 10]);
    });
  });
}

test('after a click the keyboard carries on from that column', async ({ page }) => {
  await clickPicture(page, 41.5, 105);
  await slider(page).focus();
  await page.keyboard.press('ArrowRight');
  await expect(why(page).locator('.readout', { hasText: '43 of 240' })).toBeVisible();
  await expect(caption(page)).toContainText('Column 43 of 240, band 2.');
  const earlier = why(page).getByRole('button', { name: 'Earlier column' });
  await earlier.focus();
  await page.keyboard.press('Enter');
  await expect(why(page).locator('.readout', { hasText: '42 of 240' })).toBeVisible();
  await expect(caption(page)).toContainText('Column 42 of 240, band 2. Held note: G3 at 100%. Struck note: marimba G4.');
});

test('on the radar a click inside the circle explains that bearing and distance; outside the circle nothing happens', async ({ page }) => {
  await page.getByText('Scan settings', { exact: true }).click();
  await page.locator('.scan select').first().selectOption({ label: 'Test circle: a radar turn' });
  await expect(page.locator('.scan-view')).toHaveClass(/radar/);

  // In the view's corners, outside the circle (and above the picture's top edge): nothing happens.
  await clickPicture(page, 60, 3);
  await clickPicture(page, 180, -2);
  await expect(why(page)).not.toHaveAttribute('open');
  await expect(mark(page)).toHaveCount(0);
  await expect(caption(page)).toHaveCount(0);

  // The centre of the cell where the radar strikes the green dot: 145.5° round, 43.5 units out.
  const a = (2 * Math.PI * 48.5) / 120;
  const d = (55 * 9.5) / 12;
  await clickPicture(page, 120 + d * Math.cos(a), 60 - d * Math.sin(a));
  await expect(why(page)).toHaveAttribute('open');
  await expect(why(page).locator('caption')).toContainText('144° to 147° round (0° is east, turning anticlockwise)');
  const sentence = why(page).locator('.why-band');
  await expect(sentence).toContainText('Band 10, 144° to 147° round');
  await expect(sentence).toContainText('75% to 83% of the way out from the centre');
  await expect(sentence).toContainText('played on the bells, an octave above the held note: G6');
  await expect(caption(page)).toContainText('Column 49 of 120, band 10.');
  await expect(caption(page)).toContainText('Struck note: bells G6.');
  expect(await scanNotes(page)).toEqual([]);
});

test('while the scan plays a click pins that place; the line and the notes go on exactly as before', async ({ page }) => {
  test.setTimeout(90_000);
  await startScan(page);
  // Before the line reaches the red dot (5.1 s in), pin it.
  await clickPicture(page, 41.5, 105);
  await expect(caption(page)).toContainText('Column 42 of 240, band 2. Held note: G3 at 100%. Struck note: marimba G4.');
  await expect(follow(page)).not.toBeChecked();
  await expect(slider(page)).toBeEnabled(); // not following, so the keyboard can choose too
  await expect(why(page).getByText('Showing the place you chose while the scan plays on.')).toBeVisible();
  await expect(page.getByText(/^Scanning the whole picture/)).toBeVisible();

  // The line keeps moving (8 picture units a second) and the explanation stays on the pinned place.
  const x0 = await lineX(page);
  await page.waitForTimeout(1500);
  expect((await lineX(page)) - x0).toBeGreaterThan(8);
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /^Column 42 of 240,/);

  // The notes are the rule's, at the rule's times: the same checks as scan.e2e.ts makes without a click.
  await page.waitForFunction(() => ((window as unknown as { __scanNotes?: unknown[] }).__scanNotes?.length ?? 0) >= 2, undefined, { timeout: 20_000 });
  const [red, green] = await scanNotes(page);
  expect([red.column, red.band, red.warm, red.note]).toEqual([41, 1, true, 67]);
  expect([green.column, green.band, green.warm, green.note]).toEqual([81, 8, false, 88]);
  expect(Math.abs(green.audioTime - red.audioTime - 5)).toBeLessThan(0.005);
  expect([red.root, green.root]).toEqual([33, 41]);
  expect(red.pan).toBeCloseTo(0.7 * ((2 * 41.5) / 240 - 1), 3);
  expect(green.pan).toBeCloseTo(0.7 * ((2 * 81.5) / 240 - 1), 3);

  // Tick "Follow the line" with the keyboard: the explanation follows the line again.
  await follow(page).focus();
  await page.keyboard.press('Space');
  await expect(follow(page)).toBeChecked();
  await expect(slider(page)).toBeDisabled();
  await expect(mark(page)).toHaveCount(0);
  await expect(caption(page)).toHaveCount(0);
  const table = why(page).locator('caption');
  const first = await table.innerText();
  await page.waitForTimeout(1200);
  expect(await table.innerText()).not.toBe(first);
});

test('while paused a click explains the place without moving or sounding the scan; Resume carries on', async ({ page }) => {
  test.setTimeout(90_000);
  await startScan(page);
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Pause the scan' }).click();
  await expect(page.getByText('Scan paused on the whole picture.')).toBeVisible();
  const x0 = await lineX(page);
  const notes0 = (await scanNotes(page)).length;

  await clickPicture(page, 41.5, 105);
  await expect(caption(page)).toContainText('Column 42 of 240, band 2. Held note: G3 at 100%. Struck note: marimba G4.');
  await expect(why(page).locator('.why-band')).toContainText('played on the marimba, an octave above the held note: G4');
  await page.waitForTimeout(800);
  expect(await lineX(page)).toBe(x0);
  expect((await scanNotes(page)).length).toBe(notes0);
  await expect(page.getByText('Scan paused on the whole picture.')).toBeVisible();

  // Resume: the line goes on from where it was, and the explanation keeps the place chosen.
  await page.getByRole('button', { name: 'Resume the scan' }).click();
  await expect(page.getByText(/^Scanning the whole picture/)).toBeVisible();
  await page.waitForTimeout(800);
  const x1 = await lineX(page);
  expect(x1).toBeGreaterThan(x0);
  expect(x1 - x0).toBeLessThan(16); // about 0.8 s at 8 units a second, not a jump
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /^Column 42 of 240,/);
});

test('keyboard only: while the scan plays, untick "Follow the line" and choose a place with the slider', async ({ page }) => {
  test.setTimeout(90_000);
  const summary = page.getByText('Why the scan sounds like this', { exact: true });
  await summary.focus();
  await page.keyboard.press('Enter');
  await startScan(page);
  await expect(slider(page)).toBeDisabled(); // following the line
  await expect(why(page).getByText('Following the line while the scan plays.')).toBeVisible();

  await follow(page).focus();
  await page.keyboard.press('Space');
  await expect(follow(page)).not.toBeChecked();
  await expect(slider(page)).toBeEnabled();
  await slider(page).focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 41; i++) await page.keyboard.press('ArrowRight');
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /^Column 42 of 240,/);
  // The same place a click on the red dot gives, with the same mark and words.
  await expect(mark(page)).toHaveAttribute('data-column', '41');
  await expect(mark(page)).toHaveAttribute('data-band', '1');
  await expect(caption(page)).toContainText('Column 42 of 240, band 2. Held note: G3 at 100%. Struck note: marimba G4.');
  await expect(page.getByText(/^Scanning the whole picture/)).toBeVisible(); // the scan played on
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('a tap on the red dot explains band 2; the buttons step to the column where its note is struck', async ({ page }) => {
    const p = await onScreen(page, 44, 105);
    await page.touchscreen.tap(p.x, p.y);
    await expect(caption(page)).toContainText(', band 2. Held note: G3 at 100%.');
    // A fingertip is wider than a column here: the tap lands somewhere on the dot (columns 41 to 48).
    const column = Number(/Column (\d+) of 240/.exec(await caption(page).innerText())?.[1]);
    expect(column).toBeGreaterThanOrEqual(41);
    expect(column).toBeLessThanOrEqual(48);
    const step = column > 42 ? 'Earlier column' : 'Later column';
    for (let c = column; c !== 42; c += column > 42 ? -1 : 1) await why(page).getByRole('button', { name: step }).tap();
    await expect(caption(page)).toContainText('Column 42 of 240, band 2. Held note: G3 at 100%. Struck note: marimba G4.');
    await expect(why(page).locator('.why-band')).toContainText('so the note is played on the marimba, an octave above the held note: G4');
    expect(await scanNotes(page)).toEqual([]);
  });

  test('the open explanation fits the phone: the page does not scroll sideways, on the map or the radar', async ({ page }) => {
    const pageWidth = () => page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    const p = await onScreen(page, 41.5, 105);
    await page.touchscreen.tap(p.x, p.y); // opens the explanation, with its wide table
    await expect(why(page).getByRole('table')).toBeVisible();
    const [map, window1] = await pageWidth();
    expect(map).toBeLessThanOrEqual(window1);
    // The radar's band names are longer; its table and band list must fit too.
    await page.getByText('Scan settings', { exact: true }).tap();
    await page.locator('.scan select').first().selectOption({ label: 'Test circle: a radar turn' });
    await expect(page.locator('.scan-view')).toHaveClass(/radar/);
    await expect(why(page).getByRole('table')).toContainText('of the way out from the centre');
    const [radar, window2] = await pageWidth();
    expect(radar).toBeLessThanOrEqual(window2);
    // The table is still all there: it scrolls in its own box.
    expect(await why(page).locator('.why-table').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  });
});

test('a pen works like a mouse or a finger; a drag or a cancelled press picks nothing', async ({ page }) => {
  // A drag: press on the red dot, let go 40 pixels away. Nothing is picked.
  const p = await onScreen(page, 41.5, 105);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 40, p.y, { steps: 4 });
  await page.mouse.up();
  // A press the browser cancels (a finger that starts to scroll the page). Nothing is picked.
  const svg = picture(page);
  const touch = { pointerType: 'touch', pointerId: 5, isPrimary: true, button: 0, clientX: p.x, clientY: p.y };
  await svg.dispatchEvent('pointerdown', { ...touch, buttons: 1 });
  await svg.dispatchEvent('pointercancel', touch);
  await svg.dispatchEvent('pointerup', { ...touch, buttons: 0 });
  await expect(why(page)).not.toHaveAttribute('open');
  await expect(mark(page)).toHaveCount(0);

  // A pen tap (synthetic pointer events of type "pen": no real pen was used).
  const pen = { pointerType: 'pen', pointerId: 7, isPrimary: true, button: 0, clientX: p.x, clientY: p.y };
  await svg.dispatchEvent('pointerdown', { ...pen, buttons: 1 });
  await svg.dispatchEvent('pointerup', { ...pen, buttons: 0 });
  await expect(why(page)).toHaveAttribute('open');
  await expect(caption(page)).toContainText('Column 42 of 240, band 2.');
});

test('in words, not announcements: the picture says it can be clicked, and Read why is the only thing that moves focus', async ({ page }) => {
  // A screen reader hears the picture's description: the click, and the keyboard route.
  await expect(picture(page)).toHaveAccessibleDescription(/Click or tap a place on the picture.*column slider in “Why the scan sounds like this”/);
  await expect(page.locator('.scan-pick-hint')).toBeVisible(); // the same words, on screen for everyone

  await clickPicture(page, 41.5, 105);
  await expect(caption(page)).toBeVisible();
  // Nothing in the explanation or the line under the picture is a live region.
  await expect(why(page).locator('[aria-live], [role="status"], [role="alert"]')).toHaveCount(0);
  expect(await caption(page).evaluate((el) => el.closest('[aria-live], [role="status"], [role="alert"]') === null)).toBe(true);

  // "Read why" takes focus to the full sentence, on request.
  await caption(page).getByRole('button', { name: 'Read why' }).click();
  await expect(why(page).locator('.why-band')).toBeFocused();
  await expect(why(page).locator('.why-band')).toBeInViewport();
});
