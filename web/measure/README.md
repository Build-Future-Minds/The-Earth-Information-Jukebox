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

- `docs/measurements/scan_pictures.md` and `scan_sound.md`: the tables, for people.
- `docs/measurements/scan_pictures.json` and `scan_sound.json`: the same numbers, for checking.
- `docs/measurements/earth_sound.md` and `.json` (from `earth.measure.ts` and `earthTap.ts`): the
  Earth voice's sounds, rendered offline from the app's own code. Whether the band ever strikes
  inside a beat, how far the second pulse stands above it, and loudness. It also writes
  `web/test-results/measure/earth_listen.wav` (not in git) to listen to. Run it alone with
  `npx playwright test -c measure/playwright.config.ts earth.measure.ts`.

It takes about two and a half minutes, because the sound is recorded in real time. Do not edit
those files by hand. Change the rule or the pictures, then run the command again.

## What it measures

- The map sweep on each picture, by colour and by brightness: how many cells sound, how many
  sit at full level, and how many peaks the chime rule leaves out.
- The radar on each approved circle, and each circle's shape on the ground.
- Whether land and empty sea stay silent in the aerosol and rain pictures.
- On the ocean picture: what weighting by latitude would change, where the instrument switches on
  NASA's colour bar, and how far the JPEG still is from the uncompressed frame.

And the sound, recorded from the running app at the last point before the speakers:

- Whether the sound gets louder as the level rises, on a made-up picture with four known levels.
- The loudness and the largest sample of one sweep of each scan of the ocean picture.
- The Earth voice, the scan and a melody chord together, and what is left after Stop.

Nobody listens in any of this. A recording can show that nothing clips and that Stop is silent.
It cannot show that the scan sounds good.

Two runs do not give the same loudness: the same sweep has differed by up to 0.7 LUFS. Quote a
loudness from this tool to the nearest whole number, or give the range.

## Files it needs that are not in git

NASA's frames are downloaded, not committed (`assets/frames/` is git-ignored):

| File in `assets/frames/svs3912/` | Used for | Without it |
| --- | --- | --- |
| `flat_global_ecco2_2028x1024.23000.tif` | The uncompressed frame | That section says "Not run" |
| `sst_ecco2_cbar.png` | NASA's colour bar | That section says "Not run" |

Chromium cannot open a TIFF, so the tool copies the frame to a PNG beside it the first time, using
Python with Pillow. If Python or Pillow is missing, the section says "Not run".

## Rules

- Each picture has its own settings and its own numbers. Never compare one picture's numbers with
  another's.
- The tool repeats one small part of the rule (which cell a pixel falls in) so it can add weights
  and masks. Every run checks that its copy gives exactly the rule's levels, and fails if not.
- The colour bar's end labels, 0 and 32 °C, were read by eye and typed into
  `pictures.measure.ts`. Any temperature in the report depends on them.

## Files

| File | What it is |
| --- | --- |
| `audit.ts` | Runs in the browser: loads the pictures as the app does and measures them |
| `pictures.measure.ts` | Starts that run and writes its report |
| `tap.ts` | Runs in the browser: records what the app sends to the speakers |
| `meter.ts` | Loudness (ITU-R BS.1770-4), largest sample, level in a band of frequencies |
| `meter.test.ts` | The meter on signals with known answers, including three EBU Tech 3341 cases. Runs with `npm test` |
| `sound.measure.ts` | Presses the app's buttons, records, and writes the sound report |
| `playwright.config.ts` | Starts the app with real data on port 5175 |
