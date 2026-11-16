# Measuring the picture scan

Owner: Developer A. This folder is not part of the app. It exists so that every number written
about the picture scan can be produced again by one command.

```
cd web
npm run measure
```

It starts the app with the **real** pictures in `data/` (the browser tests in `e2e/` use practice
data), opens it in headless Chromium, and runs the app's own rule (`src/audio/scanScore.ts`) on
the stills the app plays, each with its own scan rule (`src/data/sources.ts`, `scan`). Then it
records the app's sound. It writes its reports here:

- `docs/measurements/scan_pictures.md` and `scan_sound.md`: the tables, for people.
- `docs/measurements/scan_pictures.json` and `scan_sound.json`: the same numbers, for checking. A
  unit test (`src/data/scanRules.test.ts`) fails if a picture's settings or quoted numbers in
  `sources.ts` differ from `scan_pictures.json`.

It takes several minutes, because the sound is recorded in real time. Do not edit those files by
hand. Change the rule, a setting or the pictures, then run the command again. To measure the
pictures only: `npx playwright test -c measure/playwright.config.ts pictures.measure.ts`.
If port 5175 is in use (another copy of the repo measuring), set `MEASURE_PORT`.

## One section per picture

Each picture is measured with its own settings and reported in its own section. **No table holds
two pictures**, and no number of one picture is ever compared with another's.

A picture with a scan rule is measured as played. A picture without one is measured with what the
procedure gives, so its rule can be written from measured numbers:

- **Floor:** the colour strength of the commonest colour among the pixels read, plus 12 grey levels.
- **Full level:** the largest cell mean on that scan (radar: the larger of the two circles),
  rounded up to 0.05.
- **Mask:** the picture's `scan_mask.png` in `data/`, if it has one (`analysis/scan_mask.py`).

Every section also shows what the procedure gives, so a rule that differs from it can be seen
(the ocean keeps the settings it was built with).

## What it measures, for each picture

- Which of NASA's frames the still is (for the rain picture: each of its 30 frames, closest first),
  and how far the still is from it.
- What "nothing drawn" looks like (the commonest colour) and whether cells of that colour stay
  silent; what the floor costs (cells drawn in a colour of NASA's bar that go silent).
- The pixels never read, and how many cells have no data.
- The map sweep, by the picture's measure (and, for the record, by brightness and at the ocean's
  floor), and the radar on each circle.
- What each instrument means in the picture: each struck note's cell, by the colour of NASA's bar
  its pixels are nearest to (by direction of colour, so fading into black or grey does not matter).
- NASA's colour bar(s): where "red is the largest channel" switches, and for bars made of steps,
  each step's colour and instrument (and, for the rain picture, which steps are on the blue side).
- The still against NASA's full frame, and on the ocean picture the uncompressed frame's grey land
  and black sea.
- What weighting by latitude would change; the circles' shape on the ground.

And the sound, recorded from the running app at the last point before the speakers:

- Whether the sound gets louder as the level rises, on a made-up picture with four known levels.
- One struck note on each instrument of each scan sound, alone, at full strength.
- For each picture: the loudness and largest sample of one sweep of each scan, each timed from the
  player's own log of when the sweep began (`window.__scanSweeps`), so a sweep with no struck note
  is measured too; and the Earth voice, the map sweep and a melody chord together, then what is
  left after Stop.

Nobody listens in any of this. A recording can show that nothing clips and that Stop is silent.
It cannot show that the scan sounds good.

Two runs do not give the same loudness: the same sweep has differed by up to 0.7 LUFS. Quote a
loudness from this tool to the nearest whole number, or give the range.

## Files it needs that are not in git

NASA's frames are downloaded, not committed (`assets/frames/` is git-ignored). Run
`bash tools/download_frames.sh` from the repo root. NASA keeps the rain frames only about seven
days (until about 21 Nov 2026); after that, ask Student A for the saved copy.

| File | Used for | Without it |
| --- | --- | --- |
| `svs3912/flat_global_ecco2_2028x1024.23000.tif` | The ocean's uncompressed frame | Those parts say "Not run" |
| `svs3912/sst_ecco2_cbar.png` | The ocean's colour bar | "Not run" |
| `svs5669/Aerosols_2025-08-19T20_00_00_3840x2160.png` | The aerosol picture's full-size still | "Not run" |
| `svs5669/Aerosols_cbar.png` | The aerosol bar (four swatches) | "Not run" |
| `svs4285/imergert_composite.0.png` … `.29.png`, `imerg_dates.txt` | Which frame the rain still is; its full-size frame | "Not run" |
| `svs4285/rainbarwhite2.png`, `snowbarwhite2.png` | The rain and snow bars | "Not run" |

Chromium cannot open a TIFF, so the tool copies the ocean frame to a PNG beside it the first time,
using Python with Pillow. If Python or Pillow is missing, those parts say "Not run".

## Rules

- Each picture has its own settings and its own numbers. Never compare one picture's numbers with
  another's.
- The tool repeats one small part of the rule (which cell a pixel falls in) so it can add weights
  and masks. Every run checks that its copy gives exactly the rule's levels, and fails if not.
- Read by eye and typed into `pictures.measure.ts`: the ocean bar's end labels (0 and 32 °C) and
  the names of the aerosol bar's four swatches. Any temperature or aerosol type in the report
  depends on them.

## Files

| File | What it is |
| --- | --- |
| `audit.ts` | Runs in the browser: loads the pictures as the app does and measures them, one at a time |
| `pictures.measure.ts` | Starts that run, says where NASA's files are, and writes its report |
| `tap.ts` | Runs in the browser: records what the app sends to the speakers |
| `meter.ts` | Loudness (ITU-R BS.1770-4), largest sample, level in a band of frequencies |
| `meter.test.ts` | The meter on signals with known answers, including three EBU Tech 3341 cases. Runs with `npm test` |
| `sound.measure.ts` | Presses the app's buttons, records, and writes the sound report |
| `playwright.config.ts` | Starts the app with real data on port 5175 (or `MEASURE_PORT`) |
