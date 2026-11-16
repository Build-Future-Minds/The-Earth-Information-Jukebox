# Picture scan: measurements of the sound

Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.

Recorded 2026-11-16 04:49 UTC in Chromium 159.0.8154.6 (headless), on commit 5049697 with uncommitted changes, at 48000 samples a second.
The recording is taken at the last point before the speakers, so every voice and its echo is in it.
Loudness is integrated loudness (ITU-R BS.1770-4) in LUFS. Peaks are the largest sample, in dBFS; 0 is full scale.
Nobody listened: these are measurements of a recording. Scan sound: Ocean choir. Volumes and speed: the app's defaults.

## Does the sound get louder as the level rises?

A made-up picture (TEST INPUT, not NASA data) holds four levels in band 6, 6 s each, with the chime rule switched off.
"Tone" is the level between 481 and 565 Hz, around that band's held note (C5, 523.3 Hz).
If loudness followed the level exactly, each doubling would add 6.02 dB to the tone.

| Level in the score | Tone | Step up from the row above | Whole sound | Loudness |
| --- | --- | --- | --- | --- |
| 0.121 | -45.5 dB |  | -43.6 dB | -44.2 LUFS |
| 0.251 | -39.1 dB | 6.40 dB | -37.5 dB | -37.7 LUFS |
| 0.502 | -32.9 dB | 6.22 dB | -31.2 dB | -31.5 LUFS |
| 1.000 | -26.9 dB | 6.01 dB | -25.0 dB | -25.4 LUFS |

## One sweep of each scan (ocean picture)

| Scan | Seconds | Loudness | Largest sample | Left minus right, first sixth | Left minus right, last sixth |
| --- | --- | --- | --- | --- | --- |
| Whole picture: a line, west to east | 30.0 | -24.9 LUFS | -9.0 dBFS | 8.3 dB | -10.2 dB |
| Region A: a radar turn | 15.0 | -24.2 LUFS | -9.8 dBFS | -8.8 dB | -8.7 dB |
| Region B: a radar turn | 15.0 | -21.6 LUFS | -5.0 dBFS | -9.9 dB | -9.3 dB |

## Everything at once, then Stop

The Earth rhythm, the map sweep and a melody chord of 4 keys (A, S, D, F) held together for 20 s, then Esc.

|  | Loudness | Largest sample | Share of the time recorded |
| --- | --- | --- | --- |
| All three voices | -20.1 LUFS | -4.9 dBFS | 100% |
| The 2 s before Stop | -19.6 LUFS | -5.6 dBFS | 100% |
| From 0.15 s to 2.15 s after Stop | silent | every sample is 0 | 100% |

"After Stop" is timed from the audio clock read just after the Esc key press, so the true stop is a few milliseconds earlier.
"Share of the time recorded": the browser hands the recorder nothing while no sound at all reaches the last point before the speakers. Under 100% there means that part was silent in that way; 100% with every sample 0 means silence was recorded.

## Every scan sound plays the same score

Each scan sound plays the map sweep of the ocean picture; every chime in its first 10 s (the columns that start before 10 s) is compared with the first sound's: column, band, instrument side (warm or cool), note, root and left–right position, and its time from the start of the sweep.

| Scan sound | Chimes in the first 10 s | Same chimes as the first sound | Largest time difference |
| --- | --- | --- | --- |
| Ocean choir | 21 | yes | 0.0 ms |
| Music box | 21 | yes | 0.0 ms |
| Plain (first instruments) | 21 | yes | 0.0 ms |

## One sweep on the globe (ocean picture)

The whole picture played on the Globe tab, with the line drawn round the globe while it plays.

| Scan | Seconds | Loudness | Largest sample | Chimes | Same chimes as the Play along sweep |
| --- | --- | --- | --- | --- | --- |
| Globe: whole picture, a line | 30.0 | -24.9 LUFS | -7.3 dBFS | 68 | yes: column, band, instrument and note, at the same moment within 1 ms |

The two sweeps are separate recordings, so their loudness differs by as much as any two runs do (see above); the chimes are the check.
