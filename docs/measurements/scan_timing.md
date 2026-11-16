# Picture scan: do the held notes' start times change how loud they are?

Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.

Recorded 2026-11-16 04:09 UTC in Chromium 159.0.8154.6 (headless), on commit 1db3619 with uncommitted changes, at 48000 samples a second.
The scan starts each held oscillator without a time (`instruments.ts`, ScanChoir and RichBass), and Tone.js reads a missing time as "now". While the audio runs, "now" moves in steps of one render quantum (128 samples) as the oscillators are made, so they need not start together.
Two oscillators started one quantum apart differ in phase by 360° × frequency × 128 ÷ 48000: 0.70 of a cycle at C4. Where two notes share a partial of exactly the same frequency (C3's second harmonic is C4; the low note C2's second and fourth harmonics are C3 and C4), the two add with that phase difference.
Nobody listened: these are measurements of renders.

## Start times in real builds

The held notes of the Ocean choir built as the scan builds them (`timing.ts`, liveStarts: the choir's 3 vibrato oscillators and 12 notes, then the low note's 6 oscillators), 20 times in a page of the app with the audio running. Each build's start times are taken from Tone.js's own start(), unchanged.

| Builds | Starts in each build | Builds whose starts were not all at one time | Different start moments in one build: fewest, most | First to last start: middle, largest | Different start patterns |
| --- | --- | --- | --- | --- | --- |
| 20 | 21 | 20 of 20 | 8, 14 | 61.3 ms, 90.7 ms | 20 of 20 |

Every start fell on a whole quantum after the first (largest distance from one: 0.0000 of a quantum).

Each build's start times, in quanta after its first start, in build order (vibrato ×3, notes C3 to C6, low note ×6):

| Build | Start times (quanta) |
| --- | --- |
| 1 | 0 4 4 11 11 15 18 19 19 19 23 23 26 30 30 30 30 31 34 34 34 |
| 2 | 0 4 7 7 7 11 11 11 12 15 15 15 16 19 19 19 22 22 22 23 24 |
| 3 | 0 4 4 6 8 8 9 12 12 12 14 15 16 19 19 22 23 23 23 23 23 |
| 4 | 0 4 7 7 7 7 11 11 11 13 15 15 19 19 19 20 21 22 22 22 22 |
| 5 | 0 3 7 7 7 10 13 14 14 16 18 18 18 21 22 22 22 22 23 24 25 |
| 6 | 0 4 11 11 15 15 15 19 19 19 22 22 26 26 26 30 30 30 30 30 30 |
| 7 | 0 4 7 7 7 11 11 14 15 15 22 22 25 26 26 30 30 30 30 30 30 |
| 8 | 0 0 4 4 5 8 8 8 11 12 12 13 15 15 18 19 19 19 19 19 19 |
| 9 | 0 3 6 6 7 10 10 10 14 14 17 18 18 18 21 21 21 21 21 21 21 |
| 10 | 0 4 8 8 11 15 23 23 26 26 26 27 30 30 31 34 34 34 34 34 34 |
| 11 | 0 3 7 7 7 10 10 11 14 14 14 18 18 18 18 22 22 22 22 22 25 |
| 12 | 0 4 7 7 7 7 9 11 11 14 15 15 18 19 20 22 22 22 22 22 22 |
| 13 | 0 3 3 7 8 11 11 11 13 15 15 18 18 18 21 22 22 22 22 22 22 |
| 14 | 0 2 4 5 7 7 15 15 19 19 19 20 22 22 22 26 26 26 26 26 26 |
| 15 | 0 4 5 7 7 8 11 11 11 13 15 15 16 19 22 22 22 22 22 23 24 |
| 16 | 0 2 6 6 6 8 10 10 10 14 14 14 17 17 17 17 18 19 20 21 21 |
| 17 | 0 2 4 5 8 8 8 11 12 12 15 15 15 19 19 20 21 22 23 23 23 |
| 18 | 0 4 7 8 8 8 10 11 11 13 15 15 18 19 19 20 20 21 22 23 23 |
| 19 | 0 3 3 3 6 7 7 8 11 11 15 15 15 15 18 18 18 18 18 18 19 |
| 20 | 0 1 5 5 5 8 8 12 12 12 16 16 16 17 20 20 20 20 20 20 21 |

## The same notes rendered offline, started at those times

The 12 held notes at full level with the tone fully open, and the low note (its first root, C2, with its octave and fifth) at full level, rendered offline and dry (no reverb) for 10 s and measured from 6 s on, as `repeat.ts` renders them through its reverbs. Offline, nothing else changes from one render to the next.

|  | Renders | Loudness: mean | Standard deviation | Lowest to highest | Range |
| --- | --- | --- | --- | --- | --- |
| All started at one time | 2 | -5.09 LUFS |  |  | 0.000 LU |
| Started at the times of the real builds | 20 | -4.49 LUFS | 0.24 LU | -4.97 to -4.06 LUFS | 0.91 LU |
| The choir alone (no low note), started at the same times | 20 | -5.53 LUFS | 0.15 LU | -5.88 to -5.25 LUFS | 0.63 LU |

The two renders started at one time differ by 0.000 LU in loudness and 0.000 dB at most in any held note's level.

## How far each held note's level moved between renders

Largest minus smallest, in dB. The level is taken within 3% of the note, both channels, so other tones that fall there count too.

| Band | Note | Started as built | Choir alone |
| --- | --- | --- | --- |
| 0 | C3 | 9.89 | 0.03 |
| 1 | G3 | 6.16 | 0.00 |
| 2 | C4 | 6.64 | 0.56 |
| 3 | E4 | 0.01 | 0.00 |
| 4 | G4 | 1.65 | 0.67 |
| 5 | A4 | 0.00 | 0.00 |
| 6 | C5 | 4.68 | 3.84 |
| 7 | D5 | 0.03 | 0.03 |
| 8 | E5 | 1.44 | 1.39 |
| 9 | G5 | 3.31 | 3.40 |
| 10 | A5 | 2.11 | 2.11 |
| 11 | C6 | 4.04 | 4.10 |

Middle (median) of the twelve: started as built 2.71 dB, choir alone 0.62 dB.

Each render's loudness, in order (the start pattern of build 1, 2 …):

|  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Started as built | -4.52 | -4.56 | -4.29 | -4.06 | -4.59 | -4.97 | -4.65 | -4.39 | -4.32 | -4.73 | -4.63 | -4.63 | -4.40 | -4.53 | -4.49 | -4.10 | -4.11 | -4.62 | -4.32 | -4.80 |
| Choir alone | -5.28 | -5.53 | -5.71 | -5.25 | -5.42 | -5.64 | -5.42 | -5.64 | -5.54 | -5.59 | -5.44 | -5.48 | -5.65 | -5.41 | -5.49 | -5.88 | -5.64 | -5.39 | -5.55 | -5.62 |
