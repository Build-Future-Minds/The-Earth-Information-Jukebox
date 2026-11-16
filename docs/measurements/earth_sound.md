# The Earth voice's sounds, measured

Written by `web/measure/earth.measure.ts` (from `web/`: `npx playwright test -c measure/playwright.config.ts earth.measure.ts`).
Do not edit by hand: change `web/src/audio/earthSound.ts` or `earthBand.ts`, then run it again.

The app's own Earth sounds (`earthSound.ts`) are rendered offline in headless Chromium (48000 Hz),
given exactly what the transport would give them: ten beats with alignments 0, 1, 0.5, 0, 0.25, 1, 0, 0.75, 0.5, 0.
So the hardest case, A = 0 (the second pulse only a quarter of a beat after the first), comes four times.
Volume is the app's default, −6 dB. Every sound is rendered with a 1 s beat (the NASA data at 1×) and
with a 0.4 s beat (the practice data at 1¼×: the shortest gap the app ever plays, 0.1 s).

"Jump" is how much louder the 15 ms after a moment are than the 15 ms before it. A struck note
jumps by tens of dB. A slow swell or a fading echo does not.

## 1. The band never strikes between beat starts

The band rendered alone.

| Beat | Smallest jump at a beat start | Largest jump anywhere inside a beat |
| --- | --- | --- |
| 1 s | 2.0 dB | 5.2 dB |
| 0.4 s | -0.2 dB | 5.4 dB |

## 2. The second pulse stands above the band

The Earth notes alone against the band alone, rendered apart, over the 30 ms from each second pulse.

| Beat | Smallest margin over all ten second pulses | At the four with A = 0 |
| --- | --- | --- |
| 1 s | 13.9 dB | 16.6, 17.8, 18.5, 15.1 dB |
| 0.4 s | 7.3 dB | 10.1, 12.2, 10.0, 15.0 dB |

## 3. The second pulse still jumps out of the whole sound

The jump at each second pulse with A = 0, in the full sound (Earth notes, band and room together).

| Sound | Beat | Jumps at the four A = 0 second pulses (dB) | Smallest |
| --- | --- | --- | --- |
| Plain pulse | 1 s | 106.6, 106.6, 106.6, 106.6 | 106.6 |
| Piano only | 1 s | 53.9, 54.5, 54.0, 54.7 | 53.9 |
| Piano and band | 1 s | 16.8, 16.8, 19.1, 16.5 | 16.5 |
| Plain pulse | 0.4 s | 106.7, 106.7, 106.7, 106.7 | 106.7 |
| Piano only | 0.4 s | 26.4, 27.3, 23.7, 27.2 | 23.7 |
| Piano and band | 0.4 s | 9.9, 11.5, 9.8, 16.7 | 9.8 |

## 4. Loudness

Over the ten beats, at the app's default Volume. The musical sounds go through a room and the
limiter that the picture scan and the melody also use; that delays them by the latency shown.
The plain pulse goes straight out.

| Sound | Beat | Loudness (LUFS) | Peak (dBFS) | Latency (ms) |
| --- | --- | --- | --- | --- |
| Plain pulse | 1 s | -23.9 | -8.0 | 0.0 |
| Piano only | 1 s | -24.0 | -13.6 | 6.0 |
| Piano and band | 1 s | -23.5 | -9.3 | 6.0 |
| The band alone | 1 s | -29.6 | -13.8 | 6.1 |
| Plain pulse | 0.4 s | -21.0 | -8.0 | 0.0 |
| Piano only | 0.4 s | -20.0 | -9.8 | 6.0 |
| Piano and band | 0.4 s | -19.1 | -8.5 | 6.0 |
| The band alone | 0.4 s | -26.8 | -14.1 | 6.0 |
