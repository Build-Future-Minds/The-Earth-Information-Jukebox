# Picture scan: measurements of the sound

Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.

Recorded 2026-11-16 00:33 UTC in Chromium 159.0.8154.6 (headless), on commit cdca469 with uncommitted changes, at 48000 samples a second.
The recording is taken at the last point before the speakers, so every voice and its echo is in it.
Loudness is integrated loudness (ITU-R BS.1770-4) in LUFS. Peaks are the largest sample, in dBFS; 0 is full scale.
Nobody listened: these are measurements of a recording. Scan sound: Ocean choir. Volumes and speed: the app's defaults.

## Does the sound get louder as the level rises?

A made-up picture (TEST INPUT, not NASA data) holds four levels in band 6, 6 s each, with the chime rule switched off.
"Tone" is the level between 481 and 565 Hz, around that band's held note (C5, 523.3 Hz).
If loudness followed the level exactly, each doubling would add 6.02 dB to the tone.

| Level in the score | Tone | Step up from the row above | Whole sound | Loudness |
| --- | --- | --- | --- | --- |
| 0.121 | -45.5 dB |  | -43.5 dB | -44.0 LUFS |
| 0.251 | -39.0 dB | 6.52 dB | -37.2 dB | -37.5 LUFS |
| 0.502 | -32.8 dB | 6.18 dB | -31.0 dB | -31.2 LUFS |
| 1.000 | -26.8 dB | 5.98 dB | -24.7 dB | -25.1 LUFS |

## One sweep of each scan (ocean picture)

| Scan | Seconds | Loudness | Largest sample | Left minus right, first sixth | Left minus right, last sixth |
| --- | --- | --- | --- | --- | --- |
| Whole picture: a line, west to east | 30.0 | -24.4 LUFS | -7.6 dBFS | 9.1 dB | -9.8 dB |
| Region A: a radar turn | 15.0 | -24.2 LUFS | -8.4 dBFS | -8.5 dB | -7.9 dB |
| Region B: a radar turn | 15.0 | -21.6 LUFS | -7.0 dBFS | -9.6 dB | -8.5 dB |

## Everything at once, then Stop

The Earth rhythm, the map sweep and a melody chord of 4 keys (A, S, D, F) held together for 20 s, then Esc.

|  | Loudness | Largest sample | Share of the time recorded |
| --- | --- | --- | --- |
| All three voices | -20.1 LUFS | -5.2 dBFS | 100% |
| The 2 s before Stop | -20.1 LUFS | -6.4 dBFS | 100% |
| From 0.15 s to 2.15 s after Stop | silent | every sample is 0 | 100% |

"After Stop" is timed from the audio clock read just after the Esc key press, so the true stop is a few milliseconds earlier.
"Share of the time recorded": the browser hands the recorder nothing while no sound at all reaches the last point before the speakers. Under 100% there means that part was silent in that way; 100% with every sample 0 means silence was recorded.
