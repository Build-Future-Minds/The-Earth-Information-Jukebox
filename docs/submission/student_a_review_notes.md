# Student A — review notes

Practice notes for the review with Mr. E. Not part of the submission.

## Trace any sound back to its picture

Every Earth-voice beat is one **step** in `data/features.json`. Steps count from 0, one per
second of playback, and each region has its own steps.

1. In `data/features.json`, find the step: `"region"` and `"t"` (the step number, in seconds).
   Check `"status"` is `"ok"` and read `"alignment"`.
2. Frame number = `first_index + index_step × t` (both are in `data/scene.json` under `frames`:
   23000 and 4).
3. File = `frames.pattern` with that number:
   `assets/frames/svs3912/flat_global_ecco2_2028x1024.<number>.tif`
4. Model time = `frames.timestamps[t]` in `data/scene.json`. The same time is in the step's
   `"source_time"`, and in `assets/frames/svs3912/flat_ecco2_dates.txt` next to the frame number.
5. Where in the picture = the region's circle in `data/scene.json` (`center_px`, `radius_px`) and
   its mask in `data/masks/`.
6. The sound: `data/rhythm_reference.json` has the same step with `long_fraction` (where the
   second pulse falls in the beat).

### Worked example: step 17

| | Kuroshio eddies | Equatorial Pacific |
| --- | --- | --- |
| Step in `features.json` | `t` 17, `status` ok | `t` 17, `status` ok |
| Alignment | 0.0601 (lines point many ways) | 0.6659 (lines mostly line up) |
| Frame number | 23000 + 4 × 17 = **23068** | same frame |
| File | `flat_global_ecco2_2028x1024.23068.tif` | same file |
| Model time | `timestamps[17]` = **2007-03-28T10:10Z** (matches line `23068` of the dates file) | same |
| Circle | centre [1872, 348], radius 61 | centre [271, 504], radius 61 |
| Second pulse | 0.735 of the beat: strong short–long | 0.584 of the beat: closer to even |

Checked on 14 Nov 2026: both regions have 30 steps, all `ok`.

## The 90 seconds

**One successful run.** "`python analysis/prepare_scene.py` reads the 30 NASA frames, the two
approved circles and our source record. It checks every frame, works out where the land is, and
writes `data/scene.json` with the credit, each frame's file and model time, and the two circles,
plus one mask per circle: white inside the circle, black on land. Before it saves, it checks the
file against the format the whole team agreed in `contracts/`."

**One problem it catches.** "If the dates file is missing, it stops and says *run
tools/download_frames.sh*, and writes nothing. If a single frame is broken or blank, it does not
drop it, because that would shift every later frame to the wrong time. It keeps the frame in its
place and lists it. Then Dev A's code marks that beat as missing, the Earth voice goes quiet and
the app says why. My test breaks three frames on purpose and checks exactly that."

**How it reaches the app.** "`scene.json` goes in `data/`. Dev A's `features.py` reads it, measures
the lines inside each circle and writes `features.json`. Dev B's app loads both files, draws my
circles on the picture and turns each alignment number into a rhythm. `npm test` checks my file
against the team format before anything is published."

Show it: run `python -m pytest tests/test_prepare_scene.py` in `analysis/` (11 passed).
