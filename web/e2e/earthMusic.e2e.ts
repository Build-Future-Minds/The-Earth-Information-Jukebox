// The Earth voice as music (earthSound.ts, earthBand.ts): the band under the Earth voice plays only
// on beat starts, steps aside while the picture scan plays, and choosing a sound never moves a note.
// Practice data. Reads the dev-only logs window.__earthNotes and window.__earthBand.
import { expect, test, type Page } from '@playwright/test';
import { followsSchedule, noteCount, notesAfter, openApp, startWithKeyboard } from './helpers';

interface BandBeat {
  audioTime: number;
  beat: number;
  missing: boolean;
}
const bandLog = (page: Page) => page.evaluate(() => (window as unknown as { __earthBand: BandBeat[] }).__earthBand);

test('the band strikes only on beat starts, where the first pulse is, never near a second pulse', async ({ page }) => {
  await openApp(page, 'play'); // Listen plays the picture scan (D1); the Earth rhythm is on Play along and Compare
  await startWithKeyboard(page); // Region A: no missing steps
  const notes = await notesAfter(page, 0, 24);
  const band = (await bandLog(page)).filter((b) => b.audioTime <= notes[notes.length - 1].audioTime);
  expect(band.length).toBeGreaterThanOrEqual(10);
  const firsts = notes.filter((n) => n.pulse === 0).map((n) => n.audioTime);
  const seconds = notes.filter((n) => n.pulse === 1).map((n) => n.audioTime);
  for (const b of band) {
    expect(Math.min(...firsts.map((t) => Math.abs(t - b.audioTime)))).toBeLessThan(1e-6);
    expect(Math.min(...seconds.map((t) => Math.abs(t - b.audioTime)))).toBeGreaterThan(0.1); // A = 0 is 0.125 s here
  }
  // Beats are counted from the start of play, one after another.
  expect(band.map((b) => b.beat)).toEqual(band.map((_, i) => band[0].beat + i));
});

test('the band steps aside while the picture scan plays; the Earth rhythm goes on', async ({ page }) => {
  await openApp(page, 'play');
  await startWithKeyboard(page);
  await notesAfter(page, 0, 4);
  expect((await bandLog(page)).length).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Play the picture' }).click();
  await page.waitForTimeout(300); // beats already queued (Tone's look-ahead) may still be logged
  const during = (await bandLog(page)).length;
  const mark = await noteCount(page);
  const notes = await notesAfter(page, mark, 8);
  expect(followsSchedule(notes)).toBe(true);
  expect((await bandLog(page)).length).toBe(during);
});

test('Earth sound: choosing the plain pulse changes the sound, not the notes', async ({ page }) => {
  await openApp(page, 'play');
  const choice = page.getByRole('combobox', { name: 'Earth sound' });
  await expect(choice).toHaveValue('band');
  await startWithKeyboard(page);
  await notesAfter(page, 0, 4);
  await choice.selectOption('plain');
  await page.waitForTimeout(300);
  const bandBefore = (await bandLog(page)).length;
  const mark = await noteCount(page);
  const notes = await notesAfter(page, mark, 12);
  expect(followsSchedule(notes)).toBe(true);
  expect((await bandLog(page)).length).toBe(bandBefore);
});
