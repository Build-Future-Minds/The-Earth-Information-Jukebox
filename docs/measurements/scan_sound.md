# Picture scan: measurements of the sound

Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.

Recorded 2026-11-16 05:13 UTC in Chromium 159.0.8154.6 (headless), on commit 9e282f1 with uncommitted changes.
The recording is taken at the last point before the speakers, so every voice and its echo is in it.
Loudness is integrated loudness (ITU-R BS.1770-4) in LUFS. Peaks are the largest sample, in dBFS; 0 is full scale.
Nobody listened: these are measurements of a recording. Scan sound: Ocean choir. Volumes and speed: the app's defaults.

**Each picture has its own section. No table holds two pictures: never compare a number in one picture's section with another's.**

## Does the sound get louder as the level rises?

A made-up picture (TEST INPUT, not NASA data) holds four levels in band 6, 6 s each, with the chime rule switched off.
"Tone" is the level between 481 and 565 Hz, around that band's held note (C5, 523.3 Hz).
If loudness followed the level exactly, each doubling would add 6.02 dB to the tone.

| Level in the score | Tone | Step up from the row above | Whole sound | Loudness |
| --- | --- | --- | --- | --- |
| 0.121 | -44.6 dB |  | -43.0 dB | -43.6 LUFS |
| 0.251 | -38.5 dB | 6.20 dB | -36.9 dB | -37.2 LUFS |
| 0.502 | -32.6 dB | 5.82 dB | -30.9 dB | -31.2 LUFS |
| 1.000 | -26.7 dB | 5.92 dB | -24.8 dB | -25.3 LUFS |

## One struck note on each instrument, alone

C6 at full strength on each instrument, at the level its scan sound gives it, recorded for 2.4 s. The scan's volume, left–right position and room are the same for every instrument of a sound, so they are left out. Not a picture: the same for every picture.

| Scan sound | Instrument | Which notes | Level setting | Loudness | Largest sample |
| --- | --- | --- | --- | --- | --- |
| Ocean choir | marimba | warm (round mark) | 0.5 | -18.3 LUFS | -3.7 dBFS |
| Ocean choir | bells | cool (diamond) | 0.3 | -19.5 LUFS | -5.5 dBFS |
| Ocean choir | harp | third, blue side (asterisk) | 0.32 | -19.4 LUFS | -6.8 dBFS |
| Music box | kalimba | warm (round mark) | 0.42 | -20.5 LUFS | -6.6 dBFS |
| Music box | music box | cool (diamond) | 0.26 | -21.6 LUFS | -10.3 dBFS |
| Music box | harp | third, blue side (asterisk) | 0.25 | -21.6 LUFS | -9.1 dBFS |
| Plain (first instruments) | marimba | warm (round mark) | 0.5 | -18.2 LUFS | -3.6 dBFS |
| Plain (first instruments) | bells | cool (diamond) | 0.3 | -19.6 LUFS | -7.5 dBFS |
| Plain (first instruments) | harp | third, blue side (asterisk) | 0.31 | -19.6 LUFS | -7.1 dBFS |

## Ocean

### One sweep of each scan

Each sweep is timed from the audio-clock moment its first column played (the player's own log), so a sweep that strikes no note is measured too.

| Scan | Seconds | Loudness | Largest sample | Left minus right, first sixth | Left minus right, last sixth |
| --- | --- | --- | --- | --- | --- |
| Whole picture: a line, west to east | 30.0 | -24.7 LUFS | -8.8 dBFS | 10.2 dB | -8.7 dB |
| Region A: a radar turn | 15.0 | -24.6 LUFS | -11.1 dBFS | -7.6 dB | -7.2 dB |
| Region B: a radar turn | 15.0 | -21.7 LUFS | -5.7 dBFS | -8.7 dB | -8.1 dB |

### Everything at once, then Stop

The Earth rhythm, this picture's map sweep and a melody chord of 4 keys (A, S, D, F) held together for 20 s, then Esc.

|  | Loudness | Largest sample | Share of the time recorded |
| --- | --- | --- | --- |
| All three voices | -20.0 LUFS | -3.8 dBFS | 100% |
| The 2 s before Stop | -20.5 LUFS | -6.5 dBFS | 100% |
| From 0.15 s to 2.15 s after Stop | silent | every sample is 0 | 100% |

### One sweep on the globe

The whole picture played on the Globe tab, with the line drawn round the globe while it plays.

| Scan | Seconds | Loudness | Largest sample | Chimes | Same chimes as the Play along sweep |
| --- | --- | --- | --- | --- | --- |
| Globe: whole picture, a line | 30.0 | -25.2 LUFS | -8.9 dBFS | 68 | yes: column, band, instrument and note, at the same moment within 1 ms |

The two sweeps are separate recordings, so their loudness differs by as much as any two runs of one sweep do; the chimes are the check.

## Aerosols

### One sweep of each scan

Each sweep is timed from the audio-clock moment its first column played (the player's own log), so a sweep that strikes no note is measured too.

| Scan | Seconds | Loudness | Largest sample | Left minus right, first sixth | Left minus right, last sixth |
| --- | --- | --- | --- | --- | --- |
| Whole picture: a line, west to east | 30.0 | -27.1 LUFS | -10.9 dBFS | 10.3 dB | -9.2 dB |
| Region C: a radar turn | 15.0 | -21.6 LUFS | -5.3 dBFS | -8.7 dB | -9.9 dB |
| Region D: a radar turn | 15.0 | -53.6 LUFS | -36.4 dBFS | -8.2 dB | -8.4 dB |

### Everything at once, then Stop

The Earth rhythm, this picture's map sweep and a melody chord of 4 keys (A, S, D, F) held together for 20 s, then Esc.

|  | Loudness | Largest sample | Share of the time recorded |
| --- | --- | --- | --- |
| All three voices | -20.8 LUFS | -3.9 dBFS | 100% |
| The 2 s before Stop | -20.8 LUFS | -6.8 dBFS | 100% |
| From 0.15 s to 2.15 s after Stop | silent | every sample is 0 | 100% |

### One sweep on the globe

The whole picture played on the Globe tab, with the line drawn round the globe while it plays.

| Scan | Seconds | Loudness | Largest sample | Chimes | Same chimes as the Play along sweep |
| --- | --- | --- | --- | --- | --- |
| Globe: whole picture, a line | 30.0 | -26.9 LUFS | -10.5 dBFS | 36 | yes: column, band, instrument and note, at the same moment within 1 ms |

The two sweeps are separate recordings, so their loudness differs by as much as any two runs of one sweep do; the chimes are the check.

## Rain

### One sweep of each scan

Each sweep is timed from the audio-clock moment its first column played (the player's own log), so a sweep that strikes no note is measured too.

| Scan | Seconds | Loudness | Largest sample | Left minus right, first sixth | Left minus right, last sixth |
| --- | --- | --- | --- | --- | --- |
| Whole picture: a line, west to east | 30.0 | -32.4 LUFS | -14.9 dBFS | 7.8 dB | -9.2 dB |
| Region E: a radar turn | 15.0 | -24.5 LUFS | -8.0 dBFS | -9.4 dB | -10.7 dB |
| Region F: a radar turn | 15.0 | -25.9 LUFS | -10.6 dBFS | -9.8 dB | -11.8 dB |

### Everything at once, then Stop

The Earth rhythm, this picture's map sweep and a melody chord of 4 keys (A, S, D, F) held together for 20 s, then Esc.

|  | Loudness | Largest sample | Share of the time recorded |
| --- | --- | --- | --- |
| All three voices | -21.1 LUFS | -4.8 dBFS | 98% |
| The 2 s before Stop | -20.8 LUFS | -6.0 dBFS | 100% |
| From 0.15 s to 2.15 s after Stop | silent | every sample is 0 | 100% |

### One sweep on the globe

The whole picture played on the Globe tab, with the line drawn round the globe while it plays.

| Scan | Seconds | Loudness | Largest sample | Chimes | Same chimes as the Play along sweep |
| --- | --- | --- | --- | --- | --- |
| Globe: whole picture, a line | 30.0 | -32.0 LUFS | -14.9 dBFS | 16 | yes: column, band, instrument and note, at the same moment within 1 ms |

The two sweeps are separate recordings, so their loudness differs by as much as any two runs of one sweep do; the chimes are the check.

"After Stop" is timed from the audio clock read just after the Esc key press, so the true stop is a few milliseconds earlier.
"Share of the time recorded": the browser hands the recorder nothing while no sound at all reaches the last point before the speakers. Under 100% there means that part was silent in that way; 100% with every sample 0 means silence was recorded.
