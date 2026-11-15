# analysis — the math engine

Measures how strongly the visible lines in a picture share one direction (`alignment`, 0 to 1)
and turns that into rhythm timing. It describes the rendered image. It is not a measurement of
water speed, turbulence or ocean health.

Owner: Developer A. `prepare_scene.py` (Student A) will live here too.

## Set up

From this folder, with Python 3.10 or newer:

```
python -m venv .venv
.venv\Scripts\activate          (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
```

## Run

| Command | What it does |
| --- | --- |
| `python -m pytest` | Runs the tests. |
| `python make_practice_scene.py` | Draws the practice frames in `practice/` (TEST INPUT, not NASA data). |
| `python features.py --scene practice/scene.practice.json --out practice/features.practice.json --rhythm-out practice/rhythm_reference.practice.json` | Measures a scene and writes `features.json` plus the optional check file. |
| `python run_experiments.py` | Re-measures every verification experiment, redraws `docs/figures/math/`, rewrites the tables in `docs/science_review.md`, and writes two test-tone rhythms to `out/`. |
| `python explore_regions.py --map` | Measures the draft circles in `assets/regions_draft.json` on the NASA frames and scores every circle position in the picture. Needs `bash tools/download_frames.sh` first. Writes only to `out/`. |
| `python make_alignment_map.py` | The globe's alignment map: the alignment of a 61 px circle centred on every point of a 16 px grid over the first ocean frame, wrapped round at the date line. Writes `../data/alignment_map.json` (`contracts/alignment-map.schema.json`) and checks it equals `features.json` at both region centres. Needs the frames. |

SVS 3912's frame files are numbered 23000, 23004, …. `prepare_scene.py` writes that into
`scene.json` (`frames.first_index`, `frames.index_step`), so `features.py` needs no extra flags.

`features.py --help` lists the settings. Paths inside a scene file are read relative to the
repository root; change that with `--root`.

## What is where

| Path | Contents |
| --- | --- |
| `features.py` | Command: scene in, `features.json` out. |
| `sonata_math/image_analysis.py` | Grayscale, gradients, mask, structure tensor, alignment or `missing`. |
| `sonata_math/smoothing.py` | Optional smoothing over time. |
| `sonata_math/rhythm.py` | The rule `long_fraction = 0.75 − 0.25 × alignment` and the notes it gives. |
| `sonata_math/pipeline.py`, `export.py` | Every region over every frame; the JSON documents. |
| `sonata_math/synthetic.py` | Test-image generators. |
| `sonata_math/experiments.py`, `viz.py`, `audio.py` | Verification runs, figures, test tones. |
| `tests/` | What the engine must do, with the reason for each expectation. |
| `practice/` | A small practice scene and the engine's real output for it (`is_mock: true`). |
| `out/` | Scratch output. Not committed. |

## For Developer B

- `practice/features.practice.json` follows `contracts/features.schema.json` (0.2) and was written
  by the engine. Frames 3 and 4 of `mixed_lines` are `missing` on purpose.
- The rule: one step is one beat of `step_seconds`. Pulse 1 at `t`. Pulse 2 at
  `t + long_fraction × step_seconds`, with `long_fraction = 0.75 − 0.25 × alignment`. A `missing`
  step has no pulses.
- `practice/rhythm_reference.practice.json` lists the pulse times and notes this gives, to compare
  with the app's live output.

## For Student A

- Region boxes: the same size for both regions, at least about 128 pixels on the short side, no
  coast or label inside unless the mask excludes it.
- Masks: white = included. Frame-sized or region-sized. The engine keeps a 5-pixel margin away
  from anything excluded.
- Circles: give `box_px` as the bounding square and a mask that is white inside the circle and
  black on land. `explore_regions.py --write-draft-scene` writes an example to `out/draft/`.
- An unreadable frame keeps its place and becomes `missing`. A named mask file that is absent
  stops the run.

### Prepare the real scene (Student A)

From the repository root, after `bash tools/download_frames.sh`:

    python analysis/prepare_scene.py

It reads `assets/regions_draft.json`, `assets/source_manifest.json` and the frames, and writes
`data/scene.json` plus `data/masks/mask_<id>.png` (white inside the circle, black on land). A bad
input stops with a message saying what to fix; an unusable frame keeps its place and is listed.
The output is checked against `contracts/scene.schema.json` before it is written. Then measure it:

    cd analysis && python features.py --scene ../data/scene.json --out ../data/features.json \
        --rhythm-out ../data/rhythm_reference.json

Second source, SVS 5669 GEOS Aerosols (one still, approved by Dev A on 15 Nov at threshold 6 for
this source only; never compare its numbers with the ocean's):

    python analysis/prepare_scene.py --source svs5669     # writes data/aerosols/scene.json and masks
    cd analysis && python features.py --scene ../data/aerosols/scene.json \
        --out ../data/aerosols/features.json --rhythm-out ../data/aerosols/rhythm_reference.json --threshold 6

Regions: `assets/regions_aerosols.json`. Checks Dev A asked for: `assets/source_manifest.json`, SVS 5669.

Tests: `tests/test_prepare_scene.py` (good input, bad inputs, unusable frames end to end).

Background: `docs/mapping_spec.md` (the rule), `docs/math_notes.md` (why), `docs/science_review.md`
(expected and observed).
