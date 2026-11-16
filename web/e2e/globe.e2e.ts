// The picture scan on the globe (Globe tab). Practice mode has no NASA image, so the globe wraps the
// TEST INPUT picture (audio/scanScore.ts, makeTestPicture: 240 × 120, a world-map shape) and the
// scan reads it, with the known answer:
//   red dot    columns 40–47, band 1 (60–75° S, 108–120° W): marimba G4 at column 41, 5.1 s in
//   green dot  columns 80–87, band 8 (30–45° N, 48–60° W):   bells E6 at column 81, 10.1 s in
//   grey block 30° W to 30° E, 60° S to 60° N: grey 70, silent
//   test circle: centre (120, 60), radius 55: the radar's one bell is the green dot, column 48, band 9
// Reads the dev-only hooks window.__globe (what the globe draws, and the colour of a drawn pixel),
// window.__scanScore and window.__scanNotes (every chime handed to an instrument).
import { expect, test, type Page } from '@playwright/test';
import { followsSchedule, noteCount, notesAfter, openApp } from './helpers';
import { FOLLOW_OFFSET, FOLLOW_STEP, pxToLonLat, radarView, scanShade, shadeColour, wrapLongitude } from '../src/globe/geo';

interface ScanNote {
  audioTime: number;
  column: number;
  band: number;
  warm: boolean;
  note: number;
  sound: string;
}
interface GlobeState {
  mode: 'spot' | 'line' | 'radar';
  follow: boolean;
  view: { lon: number; lat: number };
  zoom: number;
  position: number;
  stillSky: boolean;
  size: { width: number; height: number };
  /** The page's clock when this was read, in seconds (added by `state` below). */
  t: number;
}
type Hook = {
  state: () => Omit<GlobeState, 't'>;
  project: (lon: number, lat: number) => { x: number; y: number; depth: number; visible: boolean };
  probe: (lon: number, lat: number) => [number, number, number, number] | null;
  renderer: () => string;
};

const TEST_FRAME = { width: 240, height: 120 };
const TEST_CIRCLE = { center_px: [120, 60] as [number, number], radius_px: 55 };
const GREY = 70;
const GREEN: [number, number, number] = [0, 220, 60];

/** What the globe shows, and when it was read: rates are measured on the page's clock, so a slow
 *  machine (the globe is drawn in software in headless Chromium) does not fail them. */
const state = (page: Page): Promise<GlobeState> =>
  page.evaluate(() => ({ ...(window as unknown as { __globe: Hook }).__globe.state(), t: performance.now() / 1000 }));
/** Sweeps a second at speed 1: the map sweep takes 30 s, a radar turn 15 s. */
const RATE = { line: 1 / 30, radar: 1 / 15 };
/** The line moved at `rate` × `speed` between two readings, within a fifth (a frame's lag at each end). */
function movedAtRate(a: GlobeState, b: GlobeState, rate: number) {
  const moved = (((b.position - a.position) % 1) + 1) % 1;
  const expected = rate * (b.t - a.t);
  expect(moved, `moved ${moved.toFixed(4)} of a sweep in ${(b.t - a.t).toFixed(2)} s`).toBeGreaterThan(expected * 0.8 - 0.004);
  expect(moved, `moved ${moved.toFixed(4)} of a sweep in ${(b.t - a.t).toFixed(2)} s`).toBeLessThan(expected * 1.2 + 0.004);
}
const probe = (page: Page, lon: number, lat: number) =>
  page.evaluate(([lo, la]) => (window as unknown as { __globe: Hook }).__globe.probe(lo, la), [lon, lat] as const);
const scanNotes = (page: Page) => page.evaluate(() => (window as unknown as { __scanNotes?: ScanNote[] }).__scanNotes ?? []);
const playButton = (page: Page) => page.getByRole('button', { name: 'Play the picture' });
const followButton = (page: Page) => page.getByRole('button', { name: 'Turn with the line' });
const scanChoice = (page: Page) => page.locator('.scan select').first();
const lineLon = (s: GlobeState) => s.position * 360 - 180;
/** Degrees the line is east of the middle of the globe. */
const lineOffset = (s: GlobeState) => wrapLongitude(lineLon(s) - s.view.lon);

async function openGlobe(page: Page) {
  await openApp(page, 'globe');
  await page.waitForFunction(() => !!(window as unknown as { __globe?: Hook }).__globe, undefined, { timeout: 15_000 });
  await expect(playButton(page)).toBeEnabled();
}

async function startScan(page: Page) {
  await playButton(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/^Scanning /)).toBeVisible();
}

async function openSettings(page: Page) {
  await page.getByText('Scan settings', { exact: true }).click();
}

/** The score the scan is playing, whole: levels, means and chimes. */
const scoreOf = (page: Page) =>
  page.evaluate(() => {
    const s = (window as unknown as { __scanScore: { shape: string; levels: Float32Array; means: Float32Array; chimes: unknown[]; dropped: unknown[] } }).__scanScore;
    return { shape: s.shape, levels: Array.from(s.levels), means: Array.from(s.means), chimes: s.chimes, dropped: s.dropped };
  });

/** Pause the scan from inside the page at the first frame the line is at or past `position`. */
const pauseAt = (page: Page, position: number) =>
  page.evaluate(
    (p) =>
      new Promise<void>((resolve) => {
        const tick = () => {
          const g = (window as unknown as { __globe: Hook }).__globe;
          if (g.state().position >= p) {
            [...document.querySelectorAll('button')].find((b) => b.textContent === 'Pause the scan')!.click();
            resolve();
          } else requestAnimationFrame(tick);
        };
        tick();
      }),
    position,
  );

const close = (a: number[], b: number[], tolerance: number) => a.every((x, i) => Math.abs(x - b[i]) <= tolerance);

test('the globe draws with WebGL2 and wraps the TEST INPUT picture; no sound before Play the picture', async ({ page }, info) => {
  await openGlobe(page);
  const renderer = await page.evaluate(() => (window as unknown as { __globe: Hook }).__globe.renderer());
  // Logged with the results, so a run on another machine shows what drew the globe (software or GPU).
  info.annotations.push({ type: 'WebGL renderer', description: renderer });
  console.log(`WebGL renderer: ${renderer}`);
  expect(renderer.length).toBeGreaterThan(0);
  await expect(page.locator('.globe-error')).toHaveCount(0);
  await expect(page.getByText('TEST INPUT — a made-up picture, not NASA data')).toBeVisible();
  expect((await state(page)).mode).toBe('spot');
  // The green dot is drawn green where the projection puts it.
  const [r, g, b] = (await probe(page, -54, 37.5))!;
  expect(g).toBeGreaterThan(150);
  expect(g - r).toBeGreaterThan(100);
  expect(g - b).toBeGreaterThan(60);
  await page.waitForTimeout(500);
  expect(await scanNotes(page)).toEqual([]);
  await expect(page.getByText('Scan stopped.')).toBeVisible();
});

test('the flat picture and the globe make the same score from the same pixels, and the globe plays it by the rule', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, 'play');
  await expect(playButton(page)).toBeEnabled();
  const flatLine = await scoreOf(page);
  await openSettings(page);
  await scanChoice(page).selectOption({ label: 'Test circle: a radar turn' });
  await expect(playButton(page)).toBeEnabled();
  const flatRadar = await scoreOf(page);

  await openGlobe(page);
  expect(await scoreOf(page)).toEqual(flatLine);
  await openSettings(page);
  await scanChoice(page).selectOption({ label: 'Test circle: a radar turn' });
  await expect(playButton(page)).toBeEnabled();
  expect(await scoreOf(page)).toEqual(flatRadar);
  expect(flatLine.shape).toBe('line');
  expect(flatRadar.shape).toBe('radar');

  // On the globe the notes sound where and when the rule says, as on the flat picture (scan.e2e.ts).
  await scanChoice(page).selectOption({ label: 'Whole picture: a line, left to right' });
  await startScan(page);
  await page.waitForFunction(() => ((window as unknown as { __scanNotes?: unknown[] }).__scanNotes?.length ?? 0) >= 2, undefined, { timeout: 20_000 });
  const [red, green] = await scanNotes(page);
  expect([red.column, red.band, red.warm, red.note]).toEqual([41, 1, true, 67]);
  expect([green.column, green.band, green.warm, green.note]).toEqual([81, 8, false, 88]);
  expect(Math.abs(green.audioTime - red.audioTime - 5)).toBeLessThan(0.005);
});

test('a drawn pixel: behind the line the picture is as it is, ahead it is dimmed, on the line it is white', async ({ page }) => {
  test.setTimeout(60_000);
  await openGlobe(page);
  await startScan(page);
  // Pause with the line just past the middle of the grey block (0° longitude, 15 s in).
  await pauseAt(page, 0.495);
  await expect(page.getByText(/^Scan paused/)).toBeVisible();
  const s = await state(page);
  const line = lineLon(s);
  // Two places on the grey block, 27° west and 27° east of 0°, clear of its edges (30°). With the line
  // between 9° W and 19° E, the west one is past the line's glow (18° behind it) and the east one past
  // the soft edge of the dimming (7° ahead).
  expect(line).toBeGreaterThan(-9);
  expect(line).toBeLessThan(19);
  const overlay = { mode: 'line' as const, position: s.position, frame: TEST_FRAME };
  const x = (lon: number) => ((lon + 180) * TEST_FRAME.width) / 360;
  const behind = (await probe(page, -27, 0))!;
  const ahead = (await probe(page, 27, 0))!;
  const expectBehind = shadeColour([GREY, GREY, GREY], scanShade(x(-27), 60, overlay));
  const expectAhead = shadeColour([GREY, GREY, GREY], scanShade(x(27), 60, overlay));
  expect(expectBehind[0]).toBeCloseTo(GREY, 6); // the picture's own grey
  expect(expectAhead[0]).toBeCloseTo(GREY * 0.58, 6); // dimmed
  expect(close(behind.slice(0, 3), expectBehind, 3), `behind ${behind} vs ${expectBehind}`).toBe(true);
  expect(close(ahead.slice(0, 3), expectAhead, 3), `ahead ${ahead} vs ${expectAhead}`).toBe(true);
  // The line itself: white, at the equator and at 40° N.
  for (const lat of [0, 40]) {
    const onLine = (await probe(page, line, lat))!;
    expect(Math.min(...onLine.slice(0, 3)), `on the line at ${lat}°`).toBeGreaterThan(240);
  }
});

test('chime marks sit where the projection says, on the dot that made them; marks on the far side are hidden', async ({ page }) => {
  test.setTimeout(60_000);
  await openGlobe(page);
  await startScan(page);
  await page.waitForFunction(() => ((window as unknown as { __scanNotes?: unknown[] }).__scanNotes?.length ?? 0) >= 2, undefined, { timeout: 20_000 });
  await page.waitForTimeout(1500); // the line moves on, past the green dot's glow
  await page.getByRole('button', { name: 'Pause the scan' }).click();
  const mark = page.locator('.globe-marks .trace.cool');
  await expect(mark).toHaveCount(1);
  const where = await mark.evaluate((el) => ({
    x: Number((el as SVGElement).dataset.x),
    y: Number((el as SVGElement).dataset.y),
    transform: el.getAttribute('transform') ?? '',
    hidden: (el as SVGElement).style.visibility === 'hidden',
  }));
  // The green dot's cell: column 81, band 8.
  expect(where.x).toBeCloseTo((81.5 / 240) * 240, 6);
  expect(where.y).toBeCloseTo(120 - (8.5 / 12) * 120, 6);
  const [lon, lat] = pxToLonLat(where.x, where.y, TEST_FRAME.width, TEST_FRAME.height);
  const projected = await page.evaluate(([lo, la]) => (window as unknown as { __globe: Hook }).__globe.project(lo, la), [lon, lat] as const);
  const [tx, ty] = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(where.transform)!.slice(1).map(Number);
  expect(Math.abs(tx - projected.x)).toBeLessThan(0.1);
  expect(Math.abs(ty - projected.y)).toBeLessThan(0.1);
  expect(where.hidden).toBe(false);
  // The GPU draws the green dot at that very place: the projection and the shader agree.
  const s = await state(page);
  const pixel = (await probe(page, lon, lat))!;
  const expected = shadeColour(GREEN, scanShade(where.x, where.y, { mode: 'line', position: s.position, frame: TEST_FRAME }));
  expect(close(pixel.slice(0, 3), expected, 4), `drawn ${pixel} vs ${expected}`).toBe(true);
  // Turn the globe half way round (Turn with the line goes off): the green mark is on the far side and hidden.
  await page.locator('.globe-canvas').focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowRight');
  await expect(followButton(page)).toHaveAttribute('aria-pressed', 'false');
  const behind = await page.evaluate(([lo, la]) => (window as unknown as { __globe: Hook }).__globe.project(lo, la), [lon, lat] as const);
  expect(behind.depth).toBeLessThan(0);
  await expect(mark).toHaveCSS('visibility', 'hidden');
});

test('Turn with the line: the globe turns with the line, the line a little right of the middle', async ({ page }) => {
  await openGlobe(page);
  await startScan(page);
  await expect(followButton(page)).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(1000);
  const s1 = await state(page);
  await page.waitForTimeout(1000);
  const s2 = await state(page);
  for (const s of [s1, s2]) {
    expect(s.mode).toBe('line');
    expect(s.follow).toBe(true);
    expect(Math.abs(lineOffset(s) - FOLLOW_OFFSET)).toBeLessThan(0.5);
    expect(s.stillSky).toBe(true); // the stars hold still while the scan plays
  }
  // 12° of longitude a second at normal speed (360° in 30 s), and the globe turned with it.
  movedAtRate(s1, s2, RATE.line);
  expect(wrapLongitude(s2.view.lon - s1.view.lon)).toBeCloseTo(wrapLongitude(lineLon(s2) - lineLon(s1)), 0);
});

test('dragging the globe while the scan plays turns Turn with the line off; the line and the sound go on; the button brings it back', async ({ page }) => {
  test.setTimeout(60_000);
  await openGlobe(page);
  await startScan(page);
  await page.waitForTimeout(800);
  const canvas = page.locator('.globe-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 120, cy + 10, { steps: 8 });
  await page.mouse.up();
  await expect(followButton(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('Turn with the line is off: the globe stays where you turned it.')).toBeVisible();
  const a = await state(page);
  await page.waitForTimeout(1000);
  const b = await state(page);
  expect(b.follow).toBe(false);
  expect(b.view).toEqual(a.view); // the globe stays where it was turned
  movedAtRate(a, b, RATE.line); // the line goes on
  await expect(page.getByText(/^Scanning the whole picture/)).toBeVisible(); // and so does the sound
  // The red dot still sounds on time, with the globe turned away.
  await page.waitForFunction(() => ((window as unknown as { __scanNotes?: unknown[] }).__scanNotes?.length ?? 0) >= 1, undefined, { timeout: 10_000 });
  expect((await scanNotes(page))[0].column).toBe(41);

  await followButton(page).click();
  await expect(followButton(page)).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(300);
  expect(Math.abs(lineOffset(await state(page)) - FOLLOW_OFFSET)).toBeLessThan(0.5);

  // An arrow key on the globe turns it off too.
  await canvas.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(followButton(page)).toHaveAttribute('aria-pressed', 'false');
});

test('playing a region while the scan plays turns the globe to that region and turns Turn with the line off', async ({ page }) => {
  await openGlobe(page);
  await startScan(page);
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /^Play Region B/ }).click();
  await expect(page.getByRole('status')).toHaveText(/Playing Region B/);
  await expect(followButton(page)).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(300);
  const s = await state(page);
  // Region B of the practice scene: centre (768, 364) on its 2048 × 1024 frame.
  const [lon, lat] = pxToLonLat(768, 364, 2048, 1024);
  expect(s.view.lon).toBeCloseTo(lon, 6);
  expect(s.view.lat).toBeCloseTo(lat, 6);
  await expect(page.getByText(/^Scanning the whole picture/)).toBeVisible(); // the scan goes on
});

test('changing the scan, the scan sound and the speed while it plays: the sound and the line both keep going', async ({ page }) => {
  test.setTimeout(60_000);
  await openGlobe(page);
  await openSettings(page);
  await startScan(page);
  await page.waitForTimeout(1000);

  // The radar: the globe turns to the test circle and zooms to it; the needle turns.
  await scanChoice(page).selectOption({ label: 'Test circle: a radar turn' });
  await expect(page.getByText(/^Scanning the test circle/)).toBeVisible();
  await page.getByLabel('Scan sound').selectOption({ label: 'Music box' });
  await page.waitForTimeout(500);
  const r1 = await state(page);
  const facing = radarView(TEST_CIRCLE, TEST_FRAME.width, TEST_FRAME.height);
  expect(r1.mode).toBe('radar');
  expect(r1.view.lon).toBeCloseTo(facing.lon, 6);
  expect(r1.view.lat).toBeCloseTo(facing.lat, 6);
  expect(r1.zoom).toBeCloseTo(facing.zoom, 6);
  await page.waitForTimeout(1000);
  const r2 = await state(page);
  movedAtRate(r1, r2, RATE.radar); // a turn in 15 s

  // The speed buttons in Scan settings: at ¾× the needle turns slower, and still turns.
  await page.getByRole('group', { name: 'Speed' }).getByRole('button', { name: '¾×' }).click();
  await page.waitForTimeout(300);
  const r3 = await state(page);
  await page.waitForTimeout(1000);
  const r4 = await state(page);
  movedAtRate(r3, r4, RATE.radar * 0.75);
  await expect(page.getByText(/^Scanning the test circle/)).toBeVisible();

  // The radar's one note, the green dot, is struck by the music box, where the rule puts it.
  await page.waitForFunction(() => ((window as unknown as { __scanNotes?: ScanNote[] }).__scanNotes ?? []).some((n) => n.sound === 'musicbox'), undefined, { timeout: 15_000 });
  const bell = (await scanNotes(page)).find((n) => n.sound === 'musicbox')!;
  expect([bell.column, bell.band, bell.warm, bell.note]).toEqual([48, 9, false, 91]);

  // Back to the line: the globe follows it again at the person's zoom.
  await scanChoice(page).selectOption({ label: 'Whole picture: a line, left to right' });
  await expect(page.getByText(/^Scanning the whole picture/)).toBeVisible();
  await page.waitForTimeout(500);
  const l1 = await state(page);
  expect(l1.mode).toBe('line');
  expect(l1.zoom).toBeCloseTo(1, 6);
  expect(Math.abs(lineOffset(l1) - FOLLOW_OFFSET)).toBeLessThan(0.5);
});

test('Esc stops the scan on the globe: the marks go and the spotlight comes back', async ({ page }) => {
  await openGlobe(page);
  await startScan(page);
  await expect(page.locator('.globe-marks .trace')).toHaveCount(1, { timeout: 10_000 }); // the red dot, 5.1 s in
  await page.keyboard.press('Escape');
  await expect(page.getByText('Scan stopped.')).toBeVisible();
  await expect(page.locator('.globe-marks .trace')).toHaveCount(0);
  const s = await state(page);
  expect(s.mode).toBe('spot');
  expect(s.stillSky).toBe(false);
  expect(s.zoom).toBeCloseTo(1, 6);
  const n = (await scanNotes(page)).length;
  await page.waitForTimeout(6000); // the green dot would have sounded by now
  expect((await scanNotes(page)).length).toBe(n);
});

test('reduced motion: the globe only cuts, once per low-note step (45°), and the line moves in whole seconds', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openGlobe(page);
  await openSettings(page);
  await page.getByRole('group', { name: 'Speed' }).getByRole('button', { name: '1¼×' }).click(); // a step every 3 s
  await startScan(page);
  await page.waitForTimeout(300); // the first frames of the scan have turned the globe to the line
  const samples: GlobeState[] = [];
  for (let i = 0; i < 80; i++) {
    samples.push(await state(page));
    await page.waitForTimeout(100);
  }
  const views = samples.map((s) => Math.round(s.view.lon * 1000) / 1000);
  // Every view the globe takes is the middle of one 45° step of the sweep.
  for (const v of views) {
    const k = (v + 180) / FOLLOW_STEP - 0.5;
    expect(Math.abs(k - Math.round(k)), `view ${v}`).toBeLessThan(1e-6);
  }
  // It changes only by one whole step at a time: a cut, never a turn.
  let cuts = 0;
  for (let i = 1; i < views.length; i++) {
    const change = wrapLongitude(views[i] - views[i - 1]);
    if (change !== 0) {
      cuts++;
      expect(change).toBeCloseTo(FOLLOW_STEP, 6);
    }
  }
  expect(cuts).toBeGreaterThanOrEqual(1);
  // The line moves in whole seconds of the sweep (1/30 of it), as on the flat picture.
  for (const s of samples) expect(Math.abs(s.position * 30 - Math.round(s.position * 30))).toBeLessThan(1e-6);
  expect(samples.every((s) => s.stillSky)).toBe(true);
  await expect(page.locator('.globe-marks')).toHaveClass(/still/);
});

test('every control on the Globe tab is reached with Tab, in screen order', async ({ page }) => {
  await openGlobe(page);
  const names = async (count: number) => {
    const seen: string[] = [];
    for (let i = 0; i < count; i++) {
      await page.keyboard.press('Tab');
      seen.push(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el) return '';
          return el.getAttribute('aria-label') ?? (el.tagName === 'SUMMARY' ? el.textContent ?? '' : (el.textContent ?? '').trim());
        }),
      );
    }
    return seen;
  };
  await page.locator('.globe-canvas').focus();
  const stopped = await names(14);
  const order = ['Zoom in', 'Zoom out', '1.0× zoom, reset', 'Play Region A', 'Play Region B', 'Play the picture', 'Turn with the line', 'Scan settings', 'What the marks mean', 'Why the scan sounds like this'];
  let at = -1;
  for (const want of order) {
    const i = stopped.findIndex((n, k) => k > at && n.startsWith(want));
    expect(i, `${want} reached after ${order[order.indexOf(want) - 1] ?? 'the globe'} (seen: ${stopped.join(' | ')})`).toBeGreaterThan(at);
    at = i;
  }
  // While the scan plays, Pause and Stop are reached too, and Esc stops it.
  await playButton(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Pause the scan' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Stop the scan' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(followButton(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Scan stopped.')).toBeVisible();
});

test('the Earth rhythm keeps its schedule while the scan plays on the globe', async ({ page }) => {
  await openGlobe(page);
  await page.getByRole('button', { name: /^Play Region A/ }).click();
  await expect(page.getByRole('status')).toHaveText(/Playing Region A/);
  await notesAfter(page, 0, 4);
  await startScan(page);
  const mark = await noteCount(page);
  const during = await notesAfter(page, mark, 16);
  expect(during.every((n) => n.region === 'boundary_current')).toBe(true);
  expect(followsSchedule(during)).toBe(true);
  await expect(page.getByRole('status')).toHaveText(/Playing/);
});

test('changing view stops the scan; at phone width the Globe tab has no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGlobe(page);
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(sw).toBeLessThanOrEqual(iw);
  await startScan(page);
  await page.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Listen' }).click();
  await expect(page).toHaveURL(/#listen$/);
  const n = (await scanNotes(page)).length;
  await page.waitForTimeout(6000);
  expect((await scanNotes(page)).length).toBe(n);
});
