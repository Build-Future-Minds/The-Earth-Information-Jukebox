# Real material for the app

Put the approved files here. The app uses them automatically, with no code change.

| File | Made by | How |
| --- | --- | --- |
| `scene.json` | Student A | `analysis/prepare_scene.py` |
| `features.json` | Dev A | `analysis/features.py` |
| `rhythm_reference.json` (optional) | Dev A | `analysis/features.py --rhythm-out data/rhythm_reference.json`. The app's tests then check that every note the app plays equals the engine's |
| `preview.jpg` (or `.png`, `.webp`) | Student A | One full frame. It needs the **same aspect ratio** as the frames in `scene.json`, so the region boxes line up. Any resolution; keep it under about 1 MB |

- `scene.json` uses schema **0.2**: every region is a circle with `center_px`, `radius_px` and its
  bounding square `box_px` = `[cx − r, cy − r, 2r, 2r]`. Both regions use the same radius. `npm test` checks all three.
- The app switches to these files only when **both** `scene.json` and `features.json` are here.
  Until then it plays the practice data in `fixtures/mock/`.
- The PRACTICE DATA banner disappears only when both files say `"is_mock": false`.
- Before you push, check the files match the contract: `cd web && npm test`. GitHub runs the
  same check before it publishes.
- If `npm run dev` is already running, **restart it** after adding or removing files here.
- Small files only. Full frame sets stay in `assets/frames/` (not committed).
