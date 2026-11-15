// Dev B checklist (docs/roles/developer-b.md), on the practice data.
import { expect, test } from '@playwright/test';
import {
  BEAT,
  audioNow,
  earthPeakAhead,
  followsSchedule,
  noteCount,
  notesAfter,
  openApp,
  startWithKeyboard,
  TOL,
} from './helpers';

test.beforeEach(async ({ page }) => openApp(page));

test('no sound before Start', async ({ page }) => {
  await page.waitForTimeout(1500);
  expect(await noteCount(page)).toBe(0);
  await expect(page.getByRole('status')).toHaveText(/Stopped/);
});

test('practice data is labelled as practice', async ({ page }) => {
  await expect(page.getByText('PRACTICE DATA')).toBeVisible();
});

test('Start by keyboard; each beat is split by the rule', async ({ page }) => {
  await startWithKeyboard(page);
  const notes = await notesAfter(page, 0, 16);
  expect(notes.every((n) => n.region === 'boundary_current')).toBe(true);
  expect(followsSchedule(notes)).toBe(true);
  for (let i = 0; i + 1 < notes.length; i++) {
    if (notes[i].pulse === 0 && notes[i + 1].pulse === 1) {
      const gap = notes[i + 1].audioTime - notes[i].audioTime;
      expect(Math.abs(gap - notes[i].longFraction * BEAT)).toBeLessThan(TOL);
    }
  }
});

test('Replay gives the same Earth rhythm', async ({ page }) => {
  await startWithKeyboard(page);
  const first = await notesAfter(page, 0, 16);
  const mark = await noteCount(page);
  const clickedAt = await audioNow(page);
  await page.getByRole('button', { name: 'Replay' }).click();
  const after = (await notesAfter(page, mark, 24)).filter((n) => n.audioTime > clickedAt + 0.01).slice(0, 16);
  const shape = (ns: typeof first) => ns.map((n) => [+(n.audioTime - ns[0].audioTime).toFixed(3), n.longFraction, n.pulse]);
  expect(shape(after)).toEqual(shape(first));
  expect(after[0].trackTime).toBe(0); // starts from the beginning
});

test('missing information: Earth voice quiet and a message shown', async ({ page }) => {
  await page.getByRole('radio', { name: /Region B/ }).check();
  await startWithKeyboard(page);
  const notes = await notesAfter(page, 0, 12);
  expect(followsSchedule(notes)).toBe(true);
  const stepStarts = notes.filter((n) => n.pulse === 0).map((n) => n.trackTime);
  expect(stepStarts).toEqual([0, 0.5, 1, 2.5, 3, 3.5]); // steps at 1.5 s and 2.0 s are missing
  await expect(page.getByRole('alert')).toContainText('Missing information', { timeout: 6000 });
  await expect(page.getByRole('alert')).toBeHidden({ timeout: 6000 });
});

test('Stop (Esc) and Pause leave no sound, at random moments', async ({ page }) => {
  await startWithKeyboard(page);
  await notesAfter(page, 0, 2);
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(300 + Math.random() * 500);
    if (i % 2 === 0) await page.keyboard.press('Escape');
    else await page.getByRole('button', { name: 'Pause', exact: true }).click();
    expect(await earthPeakAhead(page)).toBeLessThan(0.01);
    const mark = await noteCount(page);
    await page.waitForTimeout(700);
    expect(await noteCount(page)).toBe(mark);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText(/Playing/);
  }
});

test('the explanation follows the sound: reset on Stop, never the old region after a switch', async ({ page }) => {
  await startWithKeyboard(page);
  await page.getByRole('button', { name: 'Explain', exact: true }).click();
  const explanation = page.locator('.explanation p').first();
  await page.getByRole('radio', { name: /Region A/ }).focus();
  let region = 1;
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(300 + Math.random() * 500);
    region = region === 1 ? 2 : 1;
    await page.keyboard.press(String(region));
    await page.waitForTimeout(120);
    const m = (await explanation.textContent())?.match(/Alignment is ([0-9.]+)/);
    if (m) expect(region === 1 ? +m[1] > 0.5 : +m[1] < 0.5).toBe(true);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await expect(explanation).toHaveText(/Press Play/);
});

test('switching region keeps the position, on the beat', async ({ page }) => {
  await startWithKeyboard(page);
  await notesAfter(page, 0, 6);
  const mark = await noteCount(page);
  await page.getByRole('radio', { name: /Region A/ }).focus();
  await page.keyboard.press('2');
  const around = await notesAfter(page, Math.max(0, mark - 4), 16);
  const firsts = around.filter((n) => n.pulse === 0);
  expect(new Set(firsts.map((n) => n.region))).toEqual(new Set(['boundary_current', 'gyre_interior']));
  // consecutive beats are whole beats apart: no gap, no restart, no double hit
  for (let i = 1; i < firsts.length; i++) {
    const d = (firsts[i].audioTime - firsts[i - 1].audioTime) / BEAT;
    expect(Math.abs(d - Math.round(d))).toBeLessThan(TOL / BEAT);
    expect(Math.round(d)).toBeGreaterThanOrEqual(1);
  }
  const b = around.filter((n) => n.region === 'gyre_interior');
  expect(b[0].trackTime).toBeGreaterThan(0); // continued mid-loop, not from the start
});

test('half speed doubles the beat and keeps the split', async ({ page }) => {
  await startWithKeyboard(page);
  await page.getByRole('button', { name: 'Sound', exact: true }).click();
  await page.getByRole('button', { name: '½×', exact: true }).click();
  await page.waitForTimeout(1200);
  const notes = await notesAfter(page, await noteCount(page), 10);
  expect(followsSchedule(notes, 0.5)).toBe(true);
  for (let i = 0; i + 1 < notes.length; i++) {
    if (notes[i].pulse === 0 && notes[i + 1].pulse === 1) {
      const gap = notes[i + 1].audioTime - notes[i].audioTime;
      expect(Math.abs(gap - notes[i].longFraction * BEAT * 2)).toBeLessThan(TOL * 2);
    }
  }
});

test('1 / 2 only act on the Region choice (WCAG 2.1.4), and focus follows', async ({ page }) => {
  const checked = () => page.locator('input[name=region]:checked').getAttribute('value');
  await page.getByRole('button', { name: 'Play', exact: true }).focus();
  await page.keyboard.press('2');
  expect(await checked()).toBe('boundary_current');
  await page.getByRole('radio', { name: /Region A/ }).focus();
  await page.keyboard.press('2');
  expect(await checked()).toBe('gyre_interior');
  await expect(page.getByRole('radio', { name: /Region B/ })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  expect(await checked()).toBe('boundary_current');
});

test('the explanation opens by keyboard and receives focus', async ({ page }) => {
  await page.getByRole('button', { name: 'Explain', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.explanation')).toBeFocused();
  await expect(page.locator('.explanation')).toContainText('Press Play');
  // The honesty lines are said once, on How it's made, not repeated in every explanation.
  await expect(page.locator('.explanation')).not.toContainText('computer model');
  await openApp(page, 'how');
  await expect(page.getByRole('main')).toContainText('not water speed or ocean health');
});
