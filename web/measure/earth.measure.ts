// Measures the Earth voice's sounds (src/audio/earthSound.ts) and writes docs/measurements/earth_sound.*.
// The app's own sounds are rendered offline (earthTap.ts), so this takes about a minute, not real time.
// Run alone, from web/: npx playwright test -c measure/playwright.config.ts earth.measure.ts
// Also writes web/test-results/measure/earth_listen.wav (not committed): the real ocean regions on
// the plain pulse, then piano only, then piano and band, for listening.
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TakeResult } from './earthTap';

const repo = fileURLToPath(new URL('../..', import.meta.url));

/** Run a function of earthTap.ts in a freshly loaded page (one render per page). */
async function tap<T>(page: Page, call: string): Promise<T> {
  await page.goto('/');
  return page.evaluate(`import('/measure/earthTap.ts').then((m) => m.${call})`) as Promise<T>;
}

const db = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '—');
const row = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`;
const table = (head: string[], rows: (string | number)[][]) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');
const min = (xs: number[]) => Math.min(...xs);
const A0 = [0, 3, 6, 9]; // the beats with A = 0 in earthTap.ts ALIGNMENTS

const NAMES = ['plain', 'piano', 'band', 'bandOnly', 'plainFast', 'pianoFast', 'bandFast', 'bandOnlyFast'];
const LABEL: Record<string, string> = {
  plain: 'Plain pulse', piano: 'Piano only', band: 'Piano and band', bandOnly: 'The band alone',
  plainFast: 'Plain pulse', pianoFast: 'Piano only', bandFast: 'Piano and band', bandOnlyFast: 'The band alone',
};

test('measure the Earth sounds', async ({ page }) => {
  const takes: Record<string, TakeResult> = {};
  for (const name of NAMES) takes[name] = await tap<TakeResult>(page, `measureTake('${name}')`);
  const over = (piano: string, band: string) => takes[piano].secondPulseLevelDb.map((l, i) => l - takes[band].secondPulseLevelDb[i]);
  const margins = { piano: over('piano', 'bandOnly'), pianoFast: over('pianoFast', 'bandOnlyFast') };

  // The listening file: the three sounds one after another.
  const parts: Buffer[] = [];
  let sampleRate = 48000;
  for (const id of ['plain', 'piano', 'band']) {
    const r = await tap<{ sampleRate: number; pcm: string }>(page, `listeningPcm('${id}')`);
    sampleRate = r.sampleRate;
    parts.push(Buffer.from(r.pcm, 'base64'));
  }
  const pcm = Buffer.concat(parts);
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + pcm.length, 4); head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22);
  head.writeUInt32LE(sampleRate, 24); head.writeUInt32LE(sampleRate * 4, 28);
  head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(pcm.length, 40);
  const out = resolve(repo, 'web/test-results/measure');
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, 'earth_listen.wav'), Buffer.concat([head, pcm]));

  const docs = resolve(repo, 'docs/measurements');
  mkdirSync(docs, { recursive: true });
  writeFileSync(resolve(docs, 'earth_sound.json'), JSON.stringify({ takes, pulseOverBandDb: margins }, null, 2) + '\n');

  const md = `# The Earth voice's sounds, measured

Written by \`web/measure/earth.measure.ts\` (from \`web/\`: \`npx playwright test -c measure/playwright.config.ts earth.measure.ts\`).
Do not edit by hand: change \`web/src/audio/earthSound.ts\` or \`earthBand.ts\`, then run it again.

The app's own Earth sounds (\`earthSound.ts\`) are rendered offline in headless Chromium (${takes.plain.sampleRate} Hz),
given exactly what the transport would give them: ten beats with alignments 0, 1, 0.5, 0, 0.25, 1, 0, 0.75, 0.5, 0.
So the hardest case, A = 0 (the second pulse only a quarter of a beat after the first), comes four times.
Volume is the app's default, −6 dB. Every sound is rendered with a 1 s beat (the NASA data at 1×) and
with a 0.4 s beat (the practice data at 1¼×: the shortest gap the app ever plays, 0.1 s).

"Jump" is how much louder the 15 ms after a moment are than the 15 ms before it. A struck note
jumps by tens of dB. A slow swell or a fading echo does not.

## 1. The band never strikes between beat starts

The band rendered alone.

${table(
  ['Beat', 'Smallest jump at a beat start', 'Largest jump anywhere inside a beat'],
  ['bandOnly', 'bandOnlyFast'].map((n) => [`${takes[n].beat} s`, `${db(min(takes[n].riseAtBeatDb!))} dB`, `${db(takes[n].riseInsideBeatDb!)} dB`]),
)}

## 2. The second pulse stands above the band

The Earth notes alone against the band alone, rendered apart, over the 30 ms from each second pulse.

${table(
  ['Beat', 'Smallest margin over all ten second pulses', 'At the four with A = 0'],
  [['piano', 1], ['pianoFast', 0.4]].map(([n, beat]) => {
    const all = margins[n as 'piano' | 'pianoFast'];
    return [`${beat} s`, `${db(min(all))} dB`, A0.map((i) => db(all[i])).join(', ') + ' dB'];
  }),
)}

## 3. The second pulse still jumps out of the whole sound

The jump at each second pulse with A = 0, in the full sound (Earth notes, band and room together).

${table(
  ['Sound', 'Beat', 'Jumps at the four A = 0 second pulses (dB)', 'Smallest'],
  ['plain', 'piano', 'band', 'plainFast', 'pianoFast', 'bandFast'].map((n) => [
    LABEL[n], `${takes[n].beat} s`, takes[n].secondPulseRiseDb.map(db).join(', '), db(min(takes[n].secondPulseRiseDb)),
  ]),
)}

## 4. Loudness

Over the ten beats, at the app's default Volume. The musical sounds go through a room and the
limiter that the picture scan and the melody also use; that delays them by the latency shown.
The plain pulse goes straight out.

${table(
  ['Sound', 'Beat', 'Loudness (LUFS)', 'Peak (dBFS)', 'Latency (ms)'],
  NAMES.map((n) => [LABEL[n], `${takes[n].beat} s`, db(takes[n].lufs), db(takes[n].peakDb), takes[n].latencyMs.toFixed(1)]),
)}
`;
  writeFileSync(resolve(docs, 'earth_sound.md'), md);

  // The promises the code makes (earthBand.ts), checked on the rendered sound.
  for (const n of ['bandOnly', 'bandOnlyFast']) expect(takes[n].riseInsideBeatDb!, `${n}: a note starts inside a beat`).toBeLessThan(6);
  for (const n of ['piano', 'pianoFast'] as const) expect(min(margins[n]), `${n}: a second pulse is not above the band`).toBeGreaterThan(6);
});
