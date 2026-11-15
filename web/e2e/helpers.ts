// Shared helpers for the browser tests. They read two dev-only hooks:
//   window.__earthNotes  every Earth note sent to the synth, with its exact audio time
//   window.__earthSynth / __melodySynth  the synths, to read what will sound next
import { expect, type Page } from '@playwright/test';

export interface Note {
  audioTime: number;
  region: string;
  longFraction: number;
  pulse: number;
  trackTime: number;
}

export const BEAT = 0.5; // step_seconds in the practice data
export const LOOP = 4; // 8 steps per region
export const TOL = 0.0015; // timing grid is 2.6 ms; allow half of that

/** Open the app on one of its views (#listen, #compare, #how, #play). */
export async function openApp(page: Page, view: 'listen' | 'compare' | 'how' | 'play' = 'listen') {
  await page.goto(`/#${view}`);
  await expect(page.getByRole('heading', { name: /Earth Sonata/ })).toBeVisible();
}

/** Start playback with the keyboard: focus Start, press Enter. (Tab order has its own test.) */
export async function startWithKeyboard(page: Page) {
  await page.getByRole('button', { name: 'Start' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText(/Playing/);
}

export const noteCount = (page: Page) => page.evaluate(() => window.__earthNotes?.length ?? 0);

/** Wait until `n` more Earth notes have been scheduled after `from`, then return them. */
export async function notesAfter(page: Page, from: number, n: number): Promise<Note[]> {
  await page.waitForFunction(([f, k]) => (window.__earthNotes?.length ?? 0) >= f + k, [from, n], { timeout: 15_000 });
  return page.evaluate(([f, k]) => window.__earthNotes!.slice(f, f + k), [from, n]);
}

/** Real audio-clock time (no lookahead). */
export const audioNow = (page: Page) =>
  page.evaluate(() => (window as unknown as { __earthSynth: { immediate(): number } }).__earthSynth.immediate());

/** Loudest point of the Earth synth's envelope 60–200 ms from now (1.0 = a full pulse). */
export const earthPeakAhead = (page: Page) =>
  page.evaluate(() => {
    const s = (window as unknown as {
      __earthSynth: { immediate(): number; envelope: { getValueAtTime(t: number): number } };
    }).__earthSynth;
    const t = s.immediate();
    return Math.max(...[0.06, 0.08, 0.1, 0.12, 0.15, 0.2].map((d) => s.envelope.getValueAtTime(t + d)));
  });

export const melodyVoices = (page: Page) =>
  page.evaluate(() => (window as unknown as { __melodySynth?: { activeVoices: number } }).__melodySynth?.activeVoices ?? 0);

/**
 * True when every note matches the Earth schedule exactly: each second pulse sits at
 * long_fraction of the beat after its first pulse, and every note's audio time minus its
 * position in the loop is the same, modulo whole loops (nothing moved, nothing inserted).
 */
export function followsSchedule(notes: Note[], speed = 1): boolean {
  const scale = 1 / speed;
  const tol = TOL * scale; // the tick grid stretches with the tempo
  const offsets = notes.map((n) => n.audioTime - n.trackTime * scale);
  // Measure against a first pulse: those fall on whole beats, so they carry no tick rounding.
  // Second pulses are rounded to the tick grid (half a tick ≈ 1.3 ms at speed 1).
  const anchor = notes.findIndex((n) => n.pulse === 0);
  const base = offsets[anchor === -1 ? 0 : anchor];
  const onGrid = offsets.every((o) => {
    const loops = (o - base) / (LOOP * scale);
    return Math.abs(loops - Math.round(loops)) * LOOP * scale < tol;
  });
  const splits = notes.every((n) => {
    if (n.pulse !== 1) return true;
    const stepStart = n.trackTime - n.longFraction * BEAT;
    return Math.abs(stepStart - Math.round(stepStart / BEAT) * BEAT) < TOL;
  });
  return onGrid && splits;
}

declare global {
  interface Window {
    __earthNotes?: Note[];
  }
}
