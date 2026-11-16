# Picture scan: how far apart the held notes are, and how rough they sound together

Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.

Measured 2026-11-16 03:46 UTC in Chromium 159.0.8154.6 (headless), on commit 1db3619 with uncommitted changes.
Sources, and what is taken from each, are in `web/measure/spacing.ts` and `docs/DECISIONS.md`: Plomp and Levelt (1965) for the critical bandwidth and the rule of thumb, Sethares for the roughness formula.
**These are calculations from a model of hearing, not a listening test.** Nobody listened. Whether the current spacing sounds clearer is not measured here.

## Neighbouring held notes against the critical bandwidth

Plomp and Levelt (p. 555): two pure tones are most dissonant when they are 25% of a critical bandwidth apart, and consonant from 100% on. The bandwidth is their Fig. 9, at the geometric mean of the two notes (as they measured it).
"Sethares peak" is where Sethares's formula is roughest above the lower note (derived from its constants: spacing.ts, pairPeakHz). Both columns are about pure tones: the choir's harmonics come in the next section.

**First (a step at a time from C3):** C3 D3 E3 G3 A3 C4 D4 E4 G4 A4 C5 D5

| Notes | Hz | Gap | Critical bandwidth | Gap ÷ bandwidth | Sethares peak |
| --- | --- | --- | --- | --- | --- |
| C3–D3 | 130.8–146.8 | 16.0 Hz | 89.9 Hz | 0.18 | 19.9 Hz |
| D3–E3 | 146.8–164.8 | 18.0 Hz | 90.1 Hz | 0.20 | 20.2 Hz |
| E3–G3 | 164.8–196.0 | 31.2 Hz | 90.7 Hz | 0.34 | 20.5 Hz |
| G3–A3 | 196.0–220.0 | 24.0 Hz | 91.5 Hz | 0.26 | 21.1 Hz |
| A3–C4 | 220.0–261.6 | 41.6 Hz | 93.2 Hz | 0.45 | 21.6 Hz |
| C4–D4 | 261.6–293.7 | 32.0 Hz | 95.0 Hz | 0.34 | 22.4 Hz |
| D4–E4 | 293.7–329.6 | 36.0 Hz | 97.4 Hz | 0.37 | 23.0 Hz |
| E4–G4 | 329.6–392.0 | 62.4 Hz | 101.1 Hz | 0.62 | 23.7 Hz |
| G4–A4 | 392.0–440.0 | 48.0 Hz | 105.7 Hz | 0.45 | 24.9 Hz |
| A4–C5 | 440.0–523.3 | 83.3 Hz | 111.6 Hz | 0.75 | 25.8 Hz |
| C5–D5 | 523.3–587.3 | 64.1 Hz | 118.0 Hz | 0.54 | 27.4 Hz |

Of the 11 neighbouring pairs: 8 closer than half a bandwidth, 11 closer than one bandwidth.

**Current:** C3 G3 C4 E4 G4 A4 C5 D5 E5 G5 A5 C6

| Notes | Hz | Gap | Critical bandwidth | Gap ÷ bandwidth | Sethares peak |
| --- | --- | --- | --- | --- | --- |
| C3–G3 | 130.8–196.0 | 65.2 Hz | 90.1 Hz | 0.72 | 19.9 Hz |
| G3–C4 | 196.0–261.6 | 65.6 Hz | 92.4 Hz | 0.71 | 21.1 Hz |
| C4–E4 | 261.6–329.6 | 68.0 Hz | 96.1 Hz | 0.71 | 22.4 Hz |
| E4–G4 | 329.6–392.0 | 62.4 Hz | 101.1 Hz | 0.62 | 23.7 Hz |
| G4–A4 | 392.0–440.0 | 48.0 Hz | 105.7 Hz | 0.45 | 24.9 Hz |
| A4–C5 | 440.0–523.3 | 83.3 Hz | 111.6 Hz | 0.75 | 25.8 Hz |
| C5–D5 | 523.3–587.3 | 64.1 Hz | 118.0 Hz | 0.54 | 27.4 Hz |
| D5–E5 | 587.3–659.3 | 71.9 Hz | 124.2 Hz | 0.58 | 28.6 Hz |
| E5–G5 | 659.3–784.0 | 124.7 Hz | 134.1 Hz | 0.93 | 29.9 Hz |
| G5–A5 | 784.0–880.0 | 96.0 Hz | 146.3 Hz | 0.66 | 32.3 Hz |
| A5–C6 | 880.0–1046.5 | 166.5 Hz | 162.1 Hz | 1.03 | 34.1 Hz |

Of the 11 neighbouring pairs: 1 closer than half a bandwidth, 10 closer than one bandwidth.

## Roughness of the choir, all twelve notes at full level

The choir's partials: each note is 3 saw waves detuned by -7 to +7 cents, each with harmonics k = 1, 2, 3 … at 1/k up to 12 kHz, times the gain of the choir's filters (Web Audio's own, as ScanChoir sets them: low-pass at 2400 Hz, vowel peaks at 700 and 1150 Hz). Vibrato (±4 cents) is left out.
Roughness is Sethares's formula (constants dStar = 0.24, s1 = 0.0207, s2 = 18.96, c1 = 5, c2 = -5, a1 = -3.51, a2 = -5.75), summed over every pair of partials as his program does, and over neighbouring partials only as Plomp and Levelt did. The units are arbitrary: compare the two spacings, not the numbers with anything else.

|  | First spacing | Current spacing | Current ÷ first |
| --- | --- | --- | --- |
| Partials | 1742 | 1169 |  |
| All pairs: total | 1329.92 | 651.49 | 0.49 |
| All pairs: between different notes | 1241.46 | 588.73 | 0.47 |
| All pairs: within one note | 88.46 | 62.75 | 0.71 |
| All pairs: among the three lowest notes (C3 D3 E3 / C3 G3 C4) | 155.04 | 77.29 | 0.50 |
| Neighbouring partials only: total | 18.05 | 11.92 | 0.66 |
| Neighbouring partials only: between different notes | 14.91 | 9.15 | 0.61 |
| Neighbouring partials only: among the three lowest notes | 3.18 | 2.02 | 0.63 |

First (a step at a time from C3): the note pairs that add most roughness between notes (all pairs): C3–D3 4.5%, D3–E3 4.1%, C3–E3 3.9%, E3–G3 3.3%, G3–A3 3.0%.
Current: the note pairs that add most roughness between notes (all pairs): C3–G3 5.8%, G3–C4 4.3%, C3–E4 3.5%, G3–E4 3.4%, C4–E4 3.4%.

## Check: the model of the partials against a recording of the real choir

The scan's own ScanChoir (Ocean choir) holding one note at full level with its tone fully open, recorded dry (without the room) for 8 s. Each harmonic's level, relative to the first, against the model's. Harmonics the model puts more than 40 dB under the first are left out.

**C3:** largest difference 0.02 dB over 33 harmonics.

| k | Hz | Recorded | Model | Difference |
| --- | --- | --- | --- | --- |
| 1 | 130.8 | 0.0 dB | 0.0 dB | 0.00 dB |
| 2 | 261.6 | -5.8 dB | -5.8 dB | -0.01 dB |
| 3 | 392.4 | -8.9 dB | -8.8 dB | -0.02 dB |
| 4 | 523.3 | -10.1 dB | -10.1 dB | 0.01 dB |
| 5 | 654.1 | -9.7 dB | -9.8 dB | 0.01 dB |
| 6 | 784.9 | -11.4 dB | -11.4 dB | 0.01 dB |
| 7 | 915.7 | -13.4 dB | -13.4 dB | 0.01 dB |
| 8 | 1046.5 | -13.9 dB | -13.9 dB | 0.01 dB |
| 9 | 1177.3 | -14.5 dB | -14.5 dB | 0.00 dB |
| 10 | 1308.1 | -16.5 dB | -16.5 dB | 0.01 dB |
| 11 | 1438.9 | -18.0 dB | -18.1 dB | 0.01 dB |
| 12 | 1569.8 | -19.1 dB | -19.2 dB | 0.01 dB |
| 13 | 1700.6 | -20.0 dB | -20.0 dB | 0.01 dB |
| 14 | 1831.4 | -20.8 dB | -20.8 dB | 0.01 dB |
| 15 | 1962.2 | -21.6 dB | -21.6 dB | 0.01 dB |
| 16 | 2093.0 | -22.4 dB | -22.4 dB | 0.01 dB |
| 17 | 2223.8 | -23.2 dB | -23.2 dB | 0.01 dB |
| 18 | 2354.6 | -24.2 dB | -24.2 dB | 0.01 dB |
| 19 | 2485.4 | -25.2 dB | -25.2 dB | 0.01 dB |
| 20 | 2616.3 | -26.2 dB | -26.2 dB | 0.01 dB |
| 21 | 2747.1 | -27.3 dB | -27.3 dB | 0.01 dB |
| 22 | 2877.9 | -28.4 dB | -28.4 dB | 0.01 dB |
| 23 | 3008.7 | -29.5 dB | -29.5 dB | 0.01 dB |
| 24 | 3139.5 | -30.6 dB | -30.7 dB | 0.01 dB |
| 25 | 3270.3 | -31.7 dB | -31.8 dB | 0.01 dB |
| 26 | 3401.1 | -32.8 dB | -32.8 dB | 0.01 dB |
| 27 | 3531.9 | -33.9 dB | -33.9 dB | 0.01 dB |
| 28 | 3662.8 | -34.9 dB | -34.9 dB | 0.01 dB |
| 29 | 3793.6 | -35.9 dB | -35.9 dB | 0.01 dB |
| 30 | 3924.4 | -36.9 dB | -36.9 dB | 0.01 dB |
| 31 | 4055.2 | -37.8 dB | -37.9 dB | 0.01 dB |
| 32 | 4186.0 | -38.8 dB | -38.8 dB | 0.01 dB |
| 33 | 4316.8 | -39.7 dB | -39.7 dB | 0.01 dB |

**C6:** largest difference 0.00 dB over 5 harmonics.

| k | Hz | Recorded | Model | Difference |
| --- | --- | --- | --- | --- |
| 1 | 1046.5 | 0.0 dB | 0.0 dB | 0.00 dB |
| 2 | 2093.0 | -8.4 dB | -8.4 dB | -0.00 dB |
| 3 | 3139.5 | -16.7 dB | -16.7 dB | -0.00 dB |
| 4 | 4186.0 | -24.8 dB | -24.8 dB | -0.00 dB |
| 5 | 5232.5 | -31.3 dB | -31.3 dB | -0.00 dB |
