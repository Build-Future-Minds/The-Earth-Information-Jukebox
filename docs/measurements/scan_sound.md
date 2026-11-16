# Picture scan: measurements of the sound

Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.

Recorded 2026-11-16 03:16 UTC in Chromium 159.0.8154.6 (headless), on commit c5520b2 with uncommitted changes.
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
| 0.121 | -44.6 dB |  | -42.7 dB | -43.3 LUFS |
| 0.251 | -38.4 dB | 6.18 dB | -36.8 dB | -37.0 LUFS |
| 0.502 | -32.7 dB | 5.77 dB | -30.8 dB | -31.0 LUFS |
| 1.000 | -27.0 dB | 5.65 dB | -24.8 dB | -25.2 LUFS |

## One struck note on each instrument, alone

C6 at full strength on each instrument, at the level its scan sound gives it, recorded for 2.4 s. The scan's volume, left–right position and room are the same for every instrument of a sound, so they are left out. Not a picture: the same for every picture.

| Scan sound | Instrument | Which notes | Level setting | Loudness | Largest sample |
| --- | --- | --- | --- | --- | --- |
| Ocean choir | marimba | warm (round mark) | 0.5 | -18.2 LUFS | -3.6 dBFS |
| Ocean choir | bells | cool (diamond) | 0.3 | -19.6 LUFS | -5.6 dBFS |
| Ocean choir | harp | third, blue side (asterisk) | 0.32 | -19.4 LUFS | -6.8 dBFS |
| Music box | kalimba | warm (round mark) | 0.42 | -20.4 LUFS | -6.5 dBFS |
| Music box | music box | cool (diamond) | 0.26 | -21.6 LUFS | -10.2 dBFS |
| Music box | harp | third, blue side (asterisk) | 0.25 | -21.5 LUFS | -9.0 dBFS |
| Plain (first instruments) | marimba | warm (round mark) | 0.5 | -18.2 LUFS | -3.6 dBFS |
| Plain (first instruments) | bells | cool (diamond) | 0.3 | -19.6 LUFS | -7.5 dBFS |
| Plain (first instruments) | harp | third, blue side (asterisk) | 0.31 | -19.6 LUFS | -7.1 dBFS |

## Ocean

### One sweep of each scan

Each sweep is timed from the audio-clock moment its first column played (the player's own log), so a sweep that strikes no note is measured too.

| Scan | Seconds | Loudness | Largest sample | Left minus right, first sixth | Left minus right, last sixth |
| --- | --- | --- | --- | --- | --- |
| Whole picture: a line, west to east | 30.0 | -24.9 LUFS | -7.2 dBFS | 8.8 dB | -10.2 dB |
| Region A: a radar turn | 15.0 | -24.4 LUFS | -10.7 dBFS | -9.0 dB | -8.6 dB |
| Region B: a radar turn | 15.0 | -21.9 LUFS | -6.4 dBFS | -10.4 dB | -9.2 dB |

### Everything at once, then Stop

The Earth rhythm, this picture's map sweep and a melody chord of 4 keys (A, S, D, F) held together for 20 s, then Esc.

|  | Loudness | Largest sample | Share of the time recorded |
| --- | --- | --- | --- |
| All three voices | -19.8 LUFS | -5.4 dBFS | 100% |
| The 2 s before Stop | -19.9 LUFS | -5.8 dBFS | 100% |
| From 0.15 s to 2.15 s after Stop | silent | every sample is 0 | 100% |

## Aerosols

### One sweep of each scan

Each sweep is timed from the audio-clock moment its first column played (the player's own log), so a sweep that strikes no note is measured too.

| Scan | Seconds | Loudness | Largest sample | Left minus right, first sixth | Left minus right, last sixth |
| --- | --- | --- | --- | --- | --- |
| Whole picture: a line, west to east | 30.0 | -26.9 LUFS | -11.1 dBFS | 9.2 dB | -10.3 dB |
| Region C: a radar turn | 15.0 | -22.1 LUFS | -6.8 dBFS | -8.9 dB | -10.2 dB |
| Region D: a radar turn | 15.0 | -53.5 LUFS | -38.6 dBFS | -8.5 dB | -9.0 dB |

### Everything at once, then Stop

The Earth rhythm, this picture's map sweep and a melody chord of 4 keys (A, S, D, F) held together for 20 s, then Esc.

|  | Loudness | Largest sample | Share of the time recorded |
| --- | --- | --- | --- |
| All three voices | -20.8 LUFS | -5.4 dBFS | 100% |
| The 2 s before Stop | -21.4 LUFS | -7.2 dBFS | 100% |
| From 0.15 s to 2.15 s after Stop | silent | every sample is 0 | 100% |

## Rain

### One sweep of each scan

Each sweep is timed from the audio-clock moment its first column played (the player's own log), so a sweep that strikes no note is measured too.

| Scan | Seconds | Loudness | Largest sample | Left minus right, first sixth | Left minus right, last sixth |
| --- | --- | --- | --- | --- | --- |
| Whole picture: a line, west to east | 30.0 | -32.0 LUFS | -15.2 dBFS | 9.0 dB | -8.8 dB |
| Region E: a radar turn | 15.0 | -24.1 LUFS | -7.0 dBFS | -9.4 dB | -12.0 dB |
| Region F: a radar turn | 15.0 | -26.1 LUFS | -11.5 dBFS | -9.5 dB | -13.6 dB |

### Everything at once, then Stop

The Earth rhythm, this picture's map sweep and a melody chord of 4 keys (A, S, D, F) held together for 20 s, then Esc.

|  | Loudness | Largest sample | Share of the time recorded |
| --- | --- | --- | --- |
| All three voices | -21.3 LUFS | -5.8 dBFS | 100% |
| The 2 s before Stop | -21.5 LUFS | -6.8 dBFS | 100% |
| From 0.15 s to 2.15 s after Stop | silent | every sample is 0 | 100% |

"After Stop" is timed from the audio clock read just after the Esc key press, so the true stop is a few milliseconds earlier.
"Share of the time recorded": the browser hands the recorder nothing while no sound at all reaches the last point before the speakers. Under 100% there means that part was silent in that way; 100% with every sample 0 means silence was recorded.
