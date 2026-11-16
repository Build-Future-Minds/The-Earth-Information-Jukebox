# Picture scan: the same sweep, recorded again and again

Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.

Recorded 2026-11-16 04:06 UTC in Chromium 159.0.8154.6 (headless), on commit 1db3619 with uncommitted changes.
Each recording is one whole map sweep (30 s) of the ocean picture, Ocean choir, the app's default volumes and speed, taken at the last point before the speakers (`tap.ts`).
Loudness is integrated loudness (ITU-R BS.1770-4). "Held-note level" is the level within 3% of a band's held note, both channels: other tones fall there too, so it is a fingerprint of the recording, not one note's level.
Nobody listened: these are measurements of recordings.

## Loudness of the same sweep

| Condition | Recordings | Loudness: mean | Standard deviation | Lowest to highest | Range | Largest sample: range | Least share of the time recorded |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A. As the app is: each sweep in a page loaded afresh | 10 | -24.79 LUFS | 0.24 LU | -25.19 to -24.53 LUFS | 0.66 LU | 2.32 dB | 100.0% |
| B. Each sweep in a page loaded afresh, with the same random numbers every time (seed 20261115) | 10 | -24.64 LUFS | 0.11 LU | -24.83 to -24.49 LUFS | 0.34 LU | 3.47 dB | 100.0% |
| D. One page, the same sweep played again and again | 10 | -24.89 LUFS | 0.09 LU | -25.01 to -24.73 LUFS | 0.29 LU | 2.10 dB | 100.0% |

Each recording, in order:

| Condition | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | -24.63 | -24.53 | -24.56 | -24.54 | -24.76 | -25.13 | -24.75 | -25.19 | -24.89 | -24.91 |
| B | -24.54 | -24.55 | -24.49 | -24.65 | -24.83 | -24.64 | -24.63 | -24.80 | -24.68 | -24.64 |
| D | -24.73 | -24.94 | -24.96 | -24.90 | -24.94 | -24.84 | -24.84 | -25.01 | -24.97 | -24.82 |

## How far each held note's level moved between recordings

Largest minus smallest across the recordings of one condition, in dB.

| Band | Note | A | B | D | Offline, 20 reverbs |
| --- | --- | --- | --- | --- | --- |
| 0 | C3 | 13.20 | 8.35 | 0.11 | 5.39 |
| 1 | G3 | 6.15 | 0.85 | 0.91 | 2.90 |
| 2 | C4 | 5.21 | 1.40 | 2.10 | 3.55 |
| 3 | E4 | 2.92 | 0.21 | 0.76 | 2.90 |
| 4 | G4 | 1.88 | 0.74 | 0.92 | 3.85 |
| 5 | A4 | 2.92 | 0.40 | 0.53 | 2.44 |
| 6 | C5 | 2.91 | 1.33 | 1.20 | 3.71 |
| 7 | D5 | 2.22 | 0.15 | 0.32 | 2.64 |
| 8 | E5 | 2.56 | 0.68 | 1.49 | 2.94 |
| 9 | G5 | 4.23 | 2.16 | 2.02 | 2.98 |
| 10 | A5 | 2.74 | 1.76 | 1.94 | 3.21 |
| 11 | C6 | 1.45 | 0.80 | 0.52 | 2.85 |

Middle (median) of the twelve: A 2.92 dB, B 0.85 dB, D 0.92 dB, offline 2.98 dB.
Recordings whose twelve levels are all within 1 dB of the first recording's: A 1 of 10, B 3 of 10, D 2 of 10.

Each recording's twelve levels, in dB:

| Condition | Recording | Loudness | C3 | G3 | C4 | E4 | G4 | A4 | C5 | D5 | E5 | G5 | A5 | C6 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | 1 | -24.63 | -53.3 | -45.5 | -41.4 | -38.3 | -40.5 | -38.6 | -36.6 | -41.9 | -33.4 | -35.0 | -38.2 | -36.0 |
| A | 2 | -24.53 | -53.3 | -47.5 | -42.5 | -38.6 | -39.4 | -37.6 | -35.6 | -40.6 | -33.9 | -33.4 | -39.1 | -36.3 |
| A | 3 | -24.56 | -57.3 | -45.7 | -44.7 | -38.1 | -39.3 | -40.4 | -35.6 | -41.8 | -34.3 | -37.4 | -36.8 | -35.6 |
| A | 4 | -24.54 | -52.6 | -41.5 | -39.5 | -39.9 | -38.8 | -38.2 | -37.1 | -40.7 | -34.6 | -35.5 | -37.4 | -35.7 |
| A | 5 | -24.76 | -52.5 | -47.3 | -44.0 | -37.0 | -39.9 | -38.7 | -35.8 | -41.7 | -33.3 | -36.9 | -39.2 | -36.2 |
| A | 6 | -25.13 | -44.1 | -47.2 | -40.6 | -38.6 | -39.5 | -39.6 | -38.5 | -40.4 | -33.6 | -35.6 | -39.5 | -36.9 |
| A | 7 | -24.75 | -52.6 | -47.6 | -42.3 | -38.3 | -38.7 | -40.3 | -37.3 | -39.9 | -32.5 | -34.3 | -39.0 | -35.9 |
| A | 8 | -25.19 | -55.1 | -46.8 | -42.1 | -39.3 | -39.5 | -40.5 | -37.4 | -42.1 | -33.6 | -34.7 | -38.3 | -36.1 |
| A | 9 | -24.89 | -53.4 | -46.7 | -39.5 | -38.5 | -40.6 | -39.8 | -36.9 | -40.1 | -35.1 | -37.2 | -37.9 | -35.5 |
| A | 10 | -24.91 | -55.3 | -46.8 | -42.9 | -38.8 | -38.9 | -39.9 | -38.0 | -41.0 | -34.0 | -37.6 | -37.3 | -36.1 |
| B | 1 | -24.54 | -53.1 | -44.5 | -42.6 | -36.6 | -39.1 | -39.4 | -36.2 | -41.2 | -32.9 | -35.6 | -37.8 | -35.8 |
| B | 2 | -24.55 | -44.8 | -44.8 | -41.9 | -36.6 | -38.8 | -39.4 | -37.2 | -41.1 | -32.9 | -35.5 | -37.8 | -36.1 |
| B | 3 | -24.49 | -53.1 | -44.3 | -41.7 | -36.6 | -38.8 | -39.4 | -36.2 | -41.2 | -32.9 | -35.6 | -37.6 | -35.9 |
| B | 4 | -24.65 | -53.1 | -44.6 | -41.6 | -36.7 | -38.8 | -39.2 | -37.1 | -41.3 | -33.4 | -35.5 | -37.8 | -35.9 |
| B | 5 | -24.83 | -45.4 | -44.2 | -41.7 | -36.6 | -39.2 | -39.2 | -37.2 | -41.2 | -32.9 | -37.2 | -39.3 | -36.3 |
| B | 6 | -24.64 | -53.1 | -44.7 | -42.0 | -36.7 | -39.1 | -39.2 | -36.2 | -41.1 | -33.6 | -36.1 | -38.9 | -35.9 |
| B | 7 | -24.63 | -44.8 | -44.7 | -42.7 | -36.6 | -38.9 | -39.6 | -36.2 | -41.2 | -32.9 | -37.7 | -39.4 | -35.5 |
| B | 8 | -24.80 | -53.1 | -44.0 | -42.9 | -36.8 | -39.5 | -39.2 | -37.5 | -41.2 | -33.1 | -37.3 | -38.4 | -36.2 |
| B | 9 | -24.68 | -53.1 | -44.2 | -41.5 | -36.6 | -39.3 | -39.2 | -36.2 | -41.2 | -33.1 | -37.5 | -39.4 | -35.9 |
| B | 10 | -24.64 | -53.1 | -44.7 | -42.6 | -36.6 | -38.8 | -39.5 | -36.7 | -41.2 | -33.3 | -37.0 | -39.3 | -35.8 |
| D | 1 | -24.73 | -53.9 | -47.5 | -41.0 | -38.4 | -40.1 | -38.1 | -36.5 | -40.7 | -33.0 | -35.3 | -36.7 | -36.4 |
| D | 2 | -24.94 | -53.9 | -47.8 | -41.1 | -38.7 | -39.9 | -38.4 | -36.1 | -40.7 | -33.9 | -35.5 | -38.2 | -36.5 |
| D | 3 | -24.96 | -53.8 | -47.3 | -40.9 | -38.8 | -40.0 | -38.6 | -36.7 | -40.6 | -34.3 | -36.6 | -37.4 | -36.9 |
| D | 4 | -24.90 | -53.9 | -47.2 | -42.0 | -38.6 | -39.9 | -38.2 | -36.1 | -40.7 | -32.8 | -37.2 | -37.6 | -36.8 |
| D | 5 | -24.94 | -53.8 | -47.4 | -40.7 | -39.0 | -40.0 | -38.4 | -37.3 | -40.7 | -33.1 | -36.6 | -37.5 | -36.6 |
| D | 6 | -24.84 | -53.9 | -47.9 | -42.3 | -38.5 | -39.8 | -38.6 | -36.2 | -40.9 | -34.1 | -35.8 | -37.0 | -36.4 |
| D | 7 | -24.84 | -53.8 | -47.8 | -42.2 | -38.2 | -40.2 | -38.1 | -36.8 | -40.7 | -32.9 | -35.1 | -37.5 | -36.6 |
| D | 8 | -25.01 | -53.8 | -47.1 | -42.8 | -38.8 | -40.3 | -38.3 | -37.1 | -40.7 | -33.0 | -36.2 | -38.7 | -36.6 |
| D | 9 | -24.97 | -53.9 | -47.3 | -40.7 | -38.4 | -40.4 | -38.6 | -36.5 | -40.5 | -34.0 | -35.8 | -37.7 | -36.7 |
| D | 10 | -24.82 | -53.8 | -47.0 | -41.1 | -38.9 | -40.8 | -38.1 | -36.9 | -40.6 | -33.6 | -36.3 | -37.3 | -36.5 |

## How far the audio clock moves while the instruments are built

Each oscillator of the held notes starts at "now", read as it is made (Tone.js: a source started without a time starts at the context's current time plus its look-ahead). The clock moves in steps of one render quantum (128 samples). If it moves while one set is built, its notes start at different moments.
The Ocean choir's twelve notes and the low note, built as the scan builds them, 20 times with the audio running. One quantum is 2.67 ms.

| Builds | The clock moved during the build | Largest move | Build time: middle, largest |
| --- | --- | --- | --- |
| 20 | 20 of 20 | 45.33 ms | 37.4 ms, 44.7 ms |

## The reverb alone, offline

The 12 held notes of the Ocean choir, all at full level, rendered offline for 10 s and measured from 6 s on, through a reverb made as the scan's Room makes it (Tone.Reverb, decay 5 s, wet 0.36, pre-delay 0.03 s).
Offline rendering has no clock to vary, so two renders differ only where something random was used. Tone.Reverb builds its echo from random noise.

|  | Renders | Loudness: mean | Standard deviation | Lowest to highest | Range |
| --- | --- | --- | --- | --- | --- |
| Without a reverb | 2 | -5.91 LUFS |  |  | 0.000 LU |
| Through a new reverb each time | 20 | -6.88 LUFS | 0.16 LU | -7.17 to -6.59 LUFS | 0.58 LU |
