# Measuring the picture scan

Owner: Developer A. This folder is not part of the app. It exists so that every number written
about the picture scan can be produced again by one command.

```
cd web
npm run measure
```

It starts the app with the **real** pictures in `data/` (the browser tests in `e2e/` use practice
data), opens it in headless Chromium, and runs the app's own rule (`src/audio/scanScore.ts`) on
the stills the app plays. Then it records the app's sound. It writes its reports here:

- `docs/measurements/scan_pictures.md`: the pictures, the colour bar and the stills.
- `docs/measurements/scan_sound.md`: the sound of the running app.
- `docs/measurements/scan_repeat.md`: the same sweep recorded again and again.
- `docs/measurements/scan_spacing.md`: the held notes against the ear's critical bandwidth.
- `docs/measurements/scan_timing.md`: the held notes started at the times of real builds, rendered offline.
- A `.json` beside each: the same numbers, for checking.

It takes about half an hour, because the sound is recorded in real time; the repeated sweeps take
most of it. One part can be run alone, for example `npx playwright test -c measure/playwright.config.ts pictures`
(or `sound`, `repeat`, `spacing`, `timing`). Do not edit those files by hand. Change the rule or the
pictures, then run the command again.

**While it runs, do not edit files under `web/`.** The dev server reloads the page when a file it
serves changes, and the sweep that was playing is lost (this happened twice on 15 Nov; the test
then fails with "No chime was played").

## What it measures

- The map sweep on each picture, by colour and by brightness: how many cells sound, how many
  sit at full level, and how many peaks the chime rule leaves out.
- The radar on each approved circle, and each circle's shape on the ground.
- Whether land and empty sea stay silent in the aerosol and rain pictures.
- On the ocean picture: what weighting by latitude would change, and how far the JPEG still is
  from the uncompressed frame.
- NASA's colour bar: where the instrument switches, where the bar's printed labels sit (and so
  whether its scale is even), and whether the frame's lines use the bar's colours (`audit.ts`,
  `measureBarLabels` and `frameAgainstBar`).
- Which still the scan could read: the app's JPEG, a 4:4:4 JPEG at quality 90, a lossless WebP
  and the uncompressed frame, each scanned by the app's rule and compared chime by chime.
- The globe: each scan of the ocean picture read on Play along and on the Globe tab, compared
  number for number.

And the sound, recorded from the running app at the last point before the speakers:

- Whether the sound gets louder as the level rises, on a made-up picture with four known levels.
- The loudness and the largest sample of one sweep of each scan of the ocean picture.
- The Earth voice, the scan and a melody chord together, and what is left after Stop.
- That all three scan sounds play the same chimes in the first 10 s of the ocean picture.
- One map sweep played on the Globe tab: the same chimes at the same moments as on Play along.
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

NASA's frames are downloaded, not committed (`assets/frames/` is git-ignored):

| File in `assets/frames/svs3912/` | Used for | Without it |
| --- | --- | --- |
| `flat_global_ecco2_2028x1024.23000.tif` | The uncompressed frame | Those sections say "Not run" |
| `sst_ecco2_cbar.png` | NASA's colour bar | Those sections say "Not run" |

The tool makes three more files beside the TIF the first time, using Python with Pillow:

- a PNG of the frame, because Chromium cannot open a TIFF (same pixels);
- `….23000.q90_444.jpg`, a 4:4:4 JPEG at quality 90;
- `….23000.lossless.webp`, a lossless WebP.

If Python or Pillow is missing, those sections say "Not run". The report gives the Pillow and
libjpeg versions used.

The two spacing sources are cited in `spacing.ts` and `docs/DECISIONS.md` (S13, S14). The
critical-bandwidth values were read once from the paper's figure and are written in `spacing.ts`.
The scan of the paper is not needed to run anything.

## Rules

- Each picture has its own settings and its own numbers. Never compare one picture's numbers with
  another's.
- The tool repeats one small part of the rule (which cell a pixel falls in) so it can add weights
  and masks. Every run checks that its copy gives exactly the rule's levels, and fails if not.
- The colour bar's labels, 0, 10, 20 and 32 °C, were read by eye and typed into
  `pictures.measure.ts`. Where they sit on the bar is measured, so whether the scale is even is
  measured too.
- `repeat.measure.ts` replaces the page's random numbers with a fixed sequence for one of its
  conditions. That is in its own test page only; the app is never changed.
- `timing.ts` hands Tone.js's own `start()` an explicit time while it builds the held notes:
  "now", as Tone.js would read it, to record the start times, and those recorded times, offline.
  It puts `start()` back afterwards. That is in its own test page only; the app is never changed.

## Files

| File | What it is |
| --- | --- |
| `audit.ts` | Runs in the browser: loads the pictures as the app does and measures them, the colour bar and the stills |
| `pictures.measure.ts` | Starts that run, makes the extra stills, and writes its report |
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
| `playwright.config.ts` | Starts the app with real data on port 5175 |
