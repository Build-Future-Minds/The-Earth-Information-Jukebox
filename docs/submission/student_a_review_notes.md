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
| Second pulse | 0.735 of the beat: strong long–short | 0.584 of the beat: closer to even |

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

## Measurement check with Mr. E

Dev A's numbers are in `docs/science_review.md`, section 10. What to go through:

| Region | Steps ok | Alignment the app plays | Second pulse lands at |
| --- | --- | --- | --- |
| Kuroshio eddies (A) | 30 of 30 | 0.059 to 0.093, mean 0.072 | 73% of the beat (long–short) |
| Equatorial Pacific (B) | 30 of 30 | 0.660 to 0.685, mean 0.672 | 58% of the beat (more even) |

- At the same moment the gap is 0.600 on average and never below 0.567, so the second pulses land
  about 150 ms apart at a 1 s beat.
- All 30 model times in `data/scene.json` match NASA's dates file (check one yourself, e.g. step 17).
- The masks are the exact circle, minus 27 land pixels (0.2%) in the Kuroshio circle.
- Check it yourself before the meeting: `cd analysis && python -m pytest -q` (all pass) and
  `cd web && npm test` (the app's notes equal the engine's).

**How to say it:** "The Equatorial Pacific circle's lines share one direction much more than the
Kuroshio circle's, in this rendering of ECCO2 model output." Not: calmer, more turbulent, faster
or healthier.
