# Picture scan: measurements of the sound

Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.

Recorded 2026-11-16 06:01 UTC in Chromium 159.0.8154.6 (headless), on commit c88871c with uncommitted changes.
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
| 0.121 | -43.5 dB |  | -42.4 dB | -43.1 LUFS |
| 0.251 | -37.3 dB | 6.27 dB | -36.4 dB | -36.7 LUFS |
| 0.502 | -31.2 dB | 6.05 dB | -30.3 dB | -30.6 LUFS |
| 1.000 | -25.3 dB | 5.90 dB | -24.1 dB | -24.7 LUFS |

## One struck note on each instrument, alone

C6 at full strength on each instrument, at the level its scan sound gives it, recorded for 2.4 s. The scan's volume, left–right position and room are the same for every instrument of a sound, so they are left out. Not a picture: the same for every picture.

| Scan sound | Instrument | Which notes | Level setting | Loudness | Largest sample |
| --- | --- | --- | --- | --- | --- |
| Ocean choir | marimba | warm (round mark) | 0.5 | -18.2 LUFS | -3.6 dBFS |
| Ocean choir | bells | cool (diamond) | 0.3 | -19.5 LUFS | -5.5 dBFS |
| Ocean choir | harp | third, blue side (asterisk) | 0.32 | -19.4 LUFS | -6.8 dBFS |
| Music box | kalimba | warm (round mark) | 0.42 | -20.5 LUFS | -6.5 dBFS |
| Music box | music box | cool (diamond) | 0.26 | -21.6 LUFS | -10.2 dBFS |
| Music box | harp | third, blue side (asterisk) | 0.25 | -21.5 LUFS | -9.0 dBFS |
| Plain (first instruments) | marimba | warm (round mark) | 0.5 | -18.3 LUFS | -3.7 dBFS |
| Plain (first instruments) | bells | cool (diamond) | 0.3 | -19.6 LUFS | -7.5 dBFS |
| Plain (first instruments) | harp | third, blue side (asterisk) | 0.31 | -19.6 LUFS | -7.1 dBFS |

## Ocean

### One sweep of each scan

Each sweep is timed from the audio-clock moment its first column played (the player's own log), so a sweep that strikes no note is measured too.

| Scan | Seconds | Loudness | Largest sample | Left minus right, first sixth | Left minus right, last sixth |
| --- | --- | --- | --- | --- | --- |
| Whole picture: a line, west to east | 30.0 | -24.8 LUFS | -6.6 dBFS | 9.3 dB | -9.8 dB |
| Region A: a radar turn | 15.0 | -24.7 LUFS | -10.9 dBFS | -8.8 dB | -8.5 dB |
| Region B: a radar turn | 15.0 | -21.8 LUFS | -6.7 dBFS | -9.0 dB | -9.0 dB |

### Everything at once, then Stop

The Earth rhythm, this picture's map sweep and a melody chord of 4 keys (A, S, D, F) held together for 20 s, then Esc.

|  | Loudness | Largest sample | Share of the time recorded |
| --- | --- | --- | --- |
| All three voices | -20.5 LUFS | -3.7 dBFS | 100% |
| The 2 s before Stop | -20.5 LUFS | -6.4 dBFS | 100% |
| From 0.15 s to 2.15 s after Stop | silent | every sample is 0 | 100% |

### Every scan sound plays the same score

Each scan sound plays the map sweep of the ocean picture; every chime in its first 10 s (the columns that start before 10 s) is compared with the first sound's: column, band, instrument (warm, cool or blue), note, root and left–right position, and its time from the start of the sweep.

| Scan sound | Chimes in the first 10 s | Same chimes as the first sound | Largest time difference |
| --- | --- | --- | --- |
| Ocean choir | 21 | yes | 0.0 ms |
| Music box | 21 | yes | 0.0 ms |
| Plain (first instruments) | 21 | yes | 0.0 ms |

### One sweep on the globe

The whole picture played on the Globe tab, with the line drawn round the globe while it plays.

| Scan | Seconds | Loudness | Largest sample | Chimes | Same chimes as the Play along sweep |
| --- | --- | --- | --- | --- | --- |
| Globe: whole picture, a line | 30.0 | -24.8 LUFS | -8.0 dBFS | 68 | yes: column, band, instrument and note, at the same moment within 1 ms |

The two sweeps are separate recordings, so their loudness differs by as much as any two runs of one sweep do; the chimes are the check.

## Aerosols

### One sweep of each scan

Each sweep is timed from the audio-clock moment its first column played (the player's own log), so a sweep that strikes no note is measured too.

| Scan | Seconds | Loudness | Largest sample | Left minus right, first sixth | Left minus right, last sixth |
| --- | --- | --- | --- | --- | --- |
| Whole picture: a line, west to east | 30.0 | -27.5 LUFS | -12.1 dBFS | 9.9 dB | -9.8 dB |
| Region C: a radar turn | 15.0 | -22.0 LUFS | -6.1 dBFS | -8.7 dB | -10.3 dB |
| Region D: a radar turn | 15.0 | -54.0 LUFS | -37.7 dBFS | -8.5 dB | -8.5 dB |

### Everything at once, then Stop

The Earth rhythm, this picture's map sweep and a melody chord of 4 keys (A, S, D, F) held together for 20 s, then Esc.

|  | Loudness | Largest sample | Share of the time recorded |
| --- | --- | --- | --- |
| All three voices | -21.5 LUFS | -4.3 dBFS | 100% |
| The 2 s before Stop | -21.6 LUFS | -7.2 dBFS | 100% |
| From 0.15 s to 2.15 s after Stop | silent | every sample is 0 | 100% |

### One sweep on the globe

The whole picture played on the Globe tab, with the line drawn round the globe while it plays.

| Scan | Seconds | Loudness | Largest sample | Chimes | Same chimes as the Play along sweep |
| --- | --- | --- | --- | --- | --- |
| Globe: whole picture, a line | 30.0 | -27.4 LUFS | -12.3 dBFS | 36 | yes: column, band, instrument and note, at the same moment within 1 ms |

The two sweeps are separate recordings, so their loudness differs by as much as any two runs of one sweep do; the chimes are the check.

## Rain

### One sweep of each scan

Each sweep is timed from the audio-clock moment its first column played (the player's own log), so a sweep that strikes no note is measured too.

| Scan | Seconds | Loudness | Largest sample | Left minus right, first sixth | Left minus right, last sixth |
| --- | --- | --- | --- | --- | --- |
| Whole picture: a line, west to east | 30.0 | -32.7 LUFS | -14.4 dBFS | 8.5 dB | -9.1 dB |
| Region E: a radar turn | 15.0 | -23.8 LUFS | -7.8 dBFS | -10.5 dB | -12.3 dB |
| Region F: a radar turn | 15.0 | -25.3 LUFS | -8.7 dBFS | -9.2 dB | -10.3 dB |

### Everything at once, then Stop

The Earth rhythm, this picture's map sweep and a melody chord of 4 keys (A, S, D, F) held together for 20 s, then Esc.

|  | Loudness | Largest sample | Share of the time recorded |
| --- | --- | --- | --- |
| All three voices | -21.9 LUFS | -5.3 dBFS | 100% |
| The 2 s before Stop | -22.5 LUFS | -7.4 dBFS | 100% |
| From 0.15 s to 2.15 s after Stop | silent | every sample is 0 | 100% |

### One sweep on the globe

The whole picture played on the Globe tab, with the line drawn round the globe while it plays.

| Scan | Seconds | Loudness | Largest sample | Chimes | Same chimes as the Play along sweep |
| --- | --- | --- | --- | --- | --- |
| Globe: whole picture, a line | 30.0 | -31.8 LUFS | -14.4 dBFS | 16 | yes: column, band, instrument and note, at the same moment within 1 ms |

The two sweeps are separate recordings, so their loudness differs by as much as any two runs of one sweep do; the chimes are the check.

"After Stop" is timed from the audio clock read just after the Esc key press, so the true stop is a few milliseconds earlier.
"Share of the time recorded": the browser hands the recorder nothing while no sound at all reaches the last point before the speakers. Under 100% there means that part was silent in that way; 100% with every sample 0 means silence was recorded.
