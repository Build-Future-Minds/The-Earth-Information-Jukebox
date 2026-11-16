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

- `docs/measurements/scan_pictures.md`: each picture in its own section (its settings, the scan, the colour bar, the stills).
- `docs/measurements/scan_sound.md`: the sound of the running app, each picture in its own section.
- `docs/measurements/scan_repeat.md`: the same sweep recorded again and again.
- `docs/measurements/scan_spacing.md`: the held notes against the ear's critical bandwidth.
- `docs/measurements/scan_timing.md`: the held notes started at the times of real builds, rendered offline.
- A `.json` beside each: the same numbers, for checking. A unit test (`src/data/scanRules.test.ts`)
  fails if a picture's settings or the numbers `sources.ts` quotes differ from `scan_pictures.json`.

It takes about half an hour, because the sound is recorded in real time; the repeated sweeps take
most of it. One part can be run alone, for example `npx playwright test -c measure/playwright.config.ts pictures`
(or `sound`, `repeat`, `spacing`, `timing`). Do not edit those files by hand. Change the rule, a
setting or the pictures, then run the command again. If port 5175 is in use (another copy of the
repo measuring), set `MEASURE_PORT`.

**While it runs, do not edit files under `web/`.** The dev server reloads the page when a file it
serves changes, and the sweep that was playing is lost (this happened twice on 15 Nov; the test
then fails with "No chime was played").

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
- The globe: each scan of the picture read on Play along and on the Globe tab, compared number for
  number.

And on the ocean picture only, because only it has these files:

- Where the colour bar's printed labels sit (and so whether its scale is even, and the switch in
  °C), and whether the frame's lines use the bar's colours (`audit.ts`, `measureBarLabels` and
  `frameAgainstBar`).
- Which still the scan could read: the app's JPEG, a 4:4:4 JPEG at quality 90, a lossless WebP
  and the uncompressed frame, each scanned by the app's rule and compared chime by chime.

And the sound, recorded from the running app at the last point before the speakers:

- Whether the sound gets louder as the level rises, on a made-up picture with four known levels.
- One struck note on each instrument of each scan sound, alone, at full strength.
- For each picture: the loudness and largest sample of one sweep of each scan, each timed from the
  player's own log of when the sweep began (`window.__scanSweeps`), so a sweep with no struck note
  is measured too; the Earth voice, the map sweep and a melody chord together, then what is
  left after Stop; and one map sweep played on the Globe tab, with the same chimes at the same
  moments as on Play along.
- That all three scan sounds play the same chimes in the first 10 s of the ocean picture.
- The same map sweep recorded again and again (`repeat.measure.ts`): in a page loaded afresh each
  time, the same with the page's random numbers fixed, and in one page; plus the held notes
  rendered offline through many reverbs, and how far the audio clock moves while the instruments
  are built.
- The held notes' start times (`timing.measure.ts`): the start times of 20 real builds are
  recorded, and the held notes are rendered offline, without a reverb, started at exactly those
  times. With `repeat`, this found the two causes of the run-to-run loudness (in
  `docs/mapping_spec.md`, under "Measured again").
- The note spacing (`spacing.measure.ts`): each pair of neighbouring held notes against the
  critical bandwidth, a roughness model of the choir for the first spacing and the current one,
  and a recording of the real choir that checks the model of its partials.

Nobody listens in any of this. A recording can show that nothing clips and that Stop is silent.
It cannot show that the scan sounds good, and the spacing figures come from a model of hearing.

The same sweep does not give the same loudness twice. `scan_repeat.md` gives the mean and the
spread over many recordings; the causes are written in `docs/mapping_spec.md`. Quote a loudness
from this tool with its spread, not to the decimal of one recording.

## Files it needs that are not in git

NASA's frames are downloaded, not committed (`assets/frames/` is git-ignored). Run
`bash tools/download_frames.sh` from the repo root. NASA keeps the rain frames only about seven
days (until about 21 Nov 2026); after that, ask Student A for the saved copy.

| File | Used for | Without it |
| --- | --- | --- |
| `svs3912/flat_global_ecco2_2028x1024.23000.tif` | The ocean's uncompressed frame, and the stills made from it | Those parts say "Not run" |
| `svs3912/sst_ecco2_cbar.png` | The ocean's colour bar | "Not run" |
| `svs5669/Aerosols_2025-08-19T20_00_00_3840x2160.png` | The aerosol picture's full-size still | "Not run" |
| `svs5669/Aerosols_cbar.png` | The aerosol bar (four swatches) | "Not run" |
| `svs4285/imergert_composite.0.png` … `.29.png`, `imerg_dates.txt` | Which frame the rain still is; its full-size frame | "Not run" |
| `svs4285/rainbarwhite2.png`, `snowbarwhite2.png` | The rain and snow bars | "Not run" |

The tool makes three more files beside the ocean TIF the first time, using Python with Pillow:

- a PNG of the frame, because Chromium cannot open a TIFF (same pixels);
- `….23000.q90_444.jpg`, a 4:4:4 JPEG at quality 90;
- `….23000.lossless.webp`, a lossless WebP.

If Python or Pillow is missing, those parts say "Not run". The report gives the Pillow and
libjpeg versions used.

The two spacing sources are cited in `spacing.ts` and `docs/DECISIONS.md` (S13, S14). The
critical-bandwidth values were read once from the paper's figure and are written in `spacing.ts`.
The scan of the paper is not needed to run anything.

## Rules

- Each picture has its own settings and its own numbers. Never compare one picture's numbers with
  another's.
- The tool repeats one small part of the rule (which cell a pixel falls in) so it can add weights
  and masks. Every run checks that its copy gives exactly the rule's levels, and fails if not.
- Read by eye and typed into `pictures.measure.ts`: the numbers printed under the ocean's colour bar
  (0, 10, 20 and 32 °C), and the names of the aerosol bar's four swatches. Where the ocean bar's
  labels sit is measured, so whether its scale is even is measured too; the swatch names are not
  checked. Any temperature or aerosol type in the report depends on them.
- `repeat.measure.ts` replaces the page's random numbers with a fixed sequence for one of its
  conditions. That is in its own test page only; the app is never changed.
- `timing.ts` hands Tone.js's own `start()` an explicit time while it builds the held notes:
  "now", as Tone.js would read it, to record the start times, and those recorded times, offline.
  It puts `start()` back afterwards. That is in its own test page only; the app is never changed.

## Files

| File | What it is |
| --- | --- |
| `audit.ts` | Runs in the browser: loads the pictures as the app does and measures them, one at a time: the scan, the colour bars and, for the ocean, the stills |
| `pictures.measure.ts` | Starts that run, says where NASA's files are, makes the extra stills, and writes its report |
| `choose.ts` | Lists the pictures on Listen (step 1) and chooses one there; every view plays the picture chosen on Listen, and the choice is kept when the view changes. The picture and sound scripts use it |
| `tap.ts` | Runs in the browser: records what the app sends to the speakers, and the choir alone |
| `meter.ts` | Loudness (ITU-R BS.1770-4), largest sample, level in a band of frequencies (one at a time, or many at once by a Fourier transform) |
| `meter.test.ts` | The meter on signals with known answers, including three EBU Tech 3341 cases. Runs with `npm test` |
| `sound.measure.ts` | Presses the app's buttons, records, and writes the sound report |
| `repeat.ts` | Runs in the browser: the held notes rendered offline through many reverbs; how far the clock moves while instruments are built |
| `repeat.measure.ts` | Records the same sweep again and again and writes `scan_repeat.md` |
| `spacing.ts` | Critical bandwidth (Plomp and Levelt), Sethares's roughness formula, the choir's partials. Pure functions |
| `spacing.test.ts` | Those functions against what their sources say. Runs with `npm test` |
| `spacing.measure.ts` | The choir's real filter response and a recording of the choir; writes `scan_spacing.md` |
| `timing.ts` | Runs in the browser: records when each held oscillator starts in real builds, and renders the held notes offline started at those times |
| `timing.measure.ts` | Runs that and writes `scan_timing.md` |
| `playwright.config.ts` | Starts the app with real data on port 5175 (or `MEASURE_PORT`) |
