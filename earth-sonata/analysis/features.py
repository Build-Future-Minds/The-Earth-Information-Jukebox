"""Measure line alignment for every region and frame of a scene and write features.json.

Run from the `analysis/` folder:

    python features.py --scene practice/scene.practice.json \
        --out practice/features.practice.json \
        --rhythm-out practice/rhythm_reference.practice.json

Paths inside scene.json (frame pattern, masks) are read relative to --root, which
defaults to the project folder that contains `analysis/`.

The numbers describe the rendered image. They are not water speed, turbulence or
ocean health.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Iterator, Optional, Union

import numpy as np

from sonata_math.export import features_document, rhythm_reference_document, write_json
from sonata_math.image_analysis import (
    REASON_FRAME_UNREADABLE,
    AnalysisParams,
    crop_box,
    load_image,
    load_mask,
)
from sonata_math.pipeline import FrameProblem, Region, analyse_sequence
from sonata_math.rhythm import RhythmParams

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def load_scene(path: Path) -> dict:
    with open(path, encoding="utf-8") as handle:
        scene = json.load(handle)
    for key in ("is_mock", "frames", "regions"):
        if key not in scene:
            raise ValueError(f"{path}: scene is missing '{key}'")
    return scene


def build_regions(scene: dict, root: Path) -> list[Region]:
    """Read region boxes and masks. A bad box or mask stops the run with a clear message."""
    frame_shape = (scene["frames"]["height"], scene["frames"]["width"])
    probe = np.zeros(frame_shape, dtype=np.uint8)
    regions = []
    for entry in scene["regions"]:
        box = tuple(int(v) for v in entry["box_px"])
        try:
            crop_box(probe, box)
        except ValueError as error:
            raise ValueError(f"Region '{entry['id']}': {error}") from None
        mask = None
        if entry.get("mask"):
            mask = load_mask(root / entry["mask"])
            if mask.shape not in (frame_shape, (box[3], box[2])):
                raise ValueError(
                    f"Region '{entry['id']}': mask {entry['mask']} is {mask.shape[1]}x{mask.shape[0]} "
                    f"pixels. It must be the frame size ({frame_shape[1]}x{frame_shape[0]}) or "
                    f"the region size ({box[2]}x{box[3]})."
                )
        regions.append(Region(id=entry["id"], box_px=box, mask=mask))
    return regions


def iter_frames(scene: dict, root: Path, first_index: int) -> Iterator[Union[np.ndarray, FrameProblem]]:
    """Load frames one at a time. A frame that cannot be read keeps its place."""
    pattern = scene["frames"]["pattern"]
    for i in range(scene["frames"]["count"]):
        path = root / pattern.format(index=first_index + i)
        try:
            yield load_image(path)
        except FileNotFoundError:
            yield FrameProblem(REASON_FRAME_UNREADABLE, f"Frame file not found: {path.name}")
        except ValueError:
            yield FrameProblem(REASON_FRAME_UNREADABLE, f"Frame file could not be read: {path.name}")


def _relative_to_root(path: Path, root: Path) -> str:
    try:
        return path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return path.as_posix()


def run(
    scene_path: Path,
    out_path: Path,
    rhythm_out_path: Optional[Path] = None,
    root: Path = PROJECT_ROOT,
    params: AnalysisParams = AnalysisParams(),
    smoothing_alpha: float = 0.3,
    step_seconds: float = 1.0,
    first_index: int = 0,
) -> dict:
    """Measure a scene and write the output file(s). Returns the features document."""
    scene = load_scene(scene_path)
    regions = build_regions(scene, root)
    timestamps = scene["frames"].get("timestamps") or None
    records = analyse_sequence(
        iter_frames(scene, root, first_index),
        regions,
        params=params,
        smoothing_alpha=smoothing_alpha,
        step_seconds=step_seconds,
        timestamps=timestamps,
        expected_size=(scene["frames"]["height"], scene["frames"]["width"]),
    )
    scene_ref = _relative_to_root(scene_path, root)
    features = features_document(
        records,
        scene=scene_ref,
        is_mock=scene["is_mock"],
        step_seconds=step_seconds,
        params=params,
        smoothing_alpha=smoothing_alpha,
    )
    write_json(out_path, features)
    if rhythm_out_path is not None:
        source = scene.get("source") or {}
        reference = rhythm_reference_document(
            records,
            scene=scene_ref,
            is_mock=scene["is_mock"],
            params=params,
            smoothing_alpha=smoothing_alpha,
            rhythm=RhythmParams(beat_seconds=step_seconds),
            source={
                key: source.get(key) for key in ("svs_id", "url", "title", "credit", "data_kind")
            },
        )
        write_json(rhythm_out_path, reference)
    return features


def main(argv: Optional[list[str]] = None) -> int:
    defaults = AnalysisParams()
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--scene", required=True, type=Path, help="scene.json written by prepare_scene.py")
    parser.add_argument("--out", required=True, type=Path, help="where to write features.json")
    parser.add_argument("--rhythm-out", type=Path, help="also write the rhythm check file here")
    parser.add_argument("--root", type=Path, default=PROJECT_ROOT, help="folder that scene paths are relative to")
    parser.add_argument("--step-seconds", type=float, default=1.0, help="playback seconds per frame (= one beat)")
    parser.add_argument("--first-index", type=int, default=0, help="number of the first frame file")
    parser.add_argument("--threshold", type=float, default=defaults.gradient_threshold, help="gradient threshold, grey levels per pixel")
    parser.add_argument("--min-usable", type=float, default=defaults.min_usable_fraction, help="smallest share of pixels that must vote")
    parser.add_argument("--alpha", type=float, default=0.3, help="smoothing alpha in (0, 1]; 1 = off")
    parser.add_argument("--gray-mode", choices=("value", "luma"), default=defaults.gray_mode)
    parser.add_argument("--blur-sigma", type=float, default=defaults.blur_sigma)
    args = parser.parse_args(argv)

    try:
        params = AnalysisParams(
            gradient_threshold=args.threshold,
            min_usable_fraction=args.min_usable,
            gray_mode=args.gray_mode,
            blur_sigma=args.blur_sigma,
        )
        features = run(
            args.scene,
            args.out,
            args.rhythm_out,
            root=args.root,
            params=params,
            smoothing_alpha=args.alpha,
            step_seconds=args.step_seconds,
            first_index=args.first_index,
        )
    except (OSError, ValueError, KeyError) as error:
        print(f"features.py: {error}", file=sys.stderr)
        return 2

    steps = features["steps"]
    for region in dict.fromkeys(s["region"] for s in steps):
        mine = [s for s in steps if s["region"] == region]
        ok = [s["alignment"] for s in mine if s["status"] == "ok"]
        summary = f"alignment {min(ok):.3f} to {max(ok):.3f}" if ok else "no usable steps"
        print(f"{region}: {len(ok)} ok, {len(mine) - len(ok)} missing, {summary}")
    print(f"wrote {args.out}" + (f" and {args.rhythm_out}" if args.rhythm_out else ""))
    if features["is_mock"]:
        print("PRACTICE DATA: this scene is a test input, not NASA data.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
