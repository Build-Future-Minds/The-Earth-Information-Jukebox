"""Measure line alignment for every region and frame of a scene and write features.json.

Run from the `analysis/` folder:

    python features.py --scene practice/scene.practice.json \
        --out practice/features.practice.json \
        --rhythm-out practice/rhythm_reference.practice.json

For the NASA scene (frame numbers 23000, 23004, ... are read from scene.json):

    python features.py --scene ../data/scene.json --out ../data/features.json \
        --rhythm-out ../data/rhythm_reference.json

Paths inside scene.json (frame pattern, masks) are read relative to --root, which
defaults to the project folder that contains `analysis/`.

A region with `center_px` and `radius_px` (scene schema 0.2) is measured on that circle
only: its mask file, if any, is combined with the circle. All circles must have the same
radius, and `box_px` must be the circle's bounding square.

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
    region_mask,
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


def circle_in_box(box: tuple[int, int, int, int], centre: tuple[int, int], radius: int) -> np.ndarray:
    """Box-sized mask, True where pixel (x, y) has (x - cx)^2 + (y - cy)^2 <= r^2.

    The same rule as prepare_scene.py and explore_regions.py, so a mask file that already
    holds the circle is left unchanged when the two are combined.
    """
    x, y, w, h = box
    yy, xx = np.mgrid[y : y + h, x : x + w]
    return (xx - centre[0]) ** 2 + (yy - centre[1]) ** 2 <= radius**2


def _circle(entry: dict, box: tuple[int, int, int, int]) -> Optional[tuple[tuple[int, int], int]]:
    """The region's circle, or None for an old box-only region. A circle that does not
    match its box stops the run, because the engine crops to box_px."""
    has_centre, has_radius = "center_px" in entry, "radius_px" in entry
    if not (has_centre or has_radius):
        return None
    if not (has_centre and has_radius):
        raise ValueError(f"Region '{entry['id']}': give both center_px and radius_px, or neither.")
    cx, cy = (int(v) for v in entry["center_px"])
    r = int(entry["radius_px"])
    expected = (cx - r, cy - r, 2 * r, 2 * r)
    if box != expected:
        raise ValueError(
            f"Region '{entry['id']}': box_px {list(box)} is not the bounding square of the circle "
            f"(centre {[cx, cy]}, radius {r}); it should be {list(expected)}."
        )
    return (cx, cy), r


def build_regions(scene: dict, root: Path) -> list[Region]:
    """Read region boxes, circles and masks. A bad one stops the run with a clear message."""
    frame_shape = (scene["frames"]["height"], scene["frames"]["width"])
    probe = np.zeros(frame_shape, dtype=np.uint8)
    regions, radii = [], {}
    for entry in scene["regions"]:
        box = tuple(int(v) for v in entry["box_px"])
        try:
            crop_box(probe, box)
        except ValueError as error:
            raise ValueError(f"Region '{entry['id']}': {error}") from None
        circle = _circle(entry, box)
        radii[entry["id"]] = None if circle is None else circle[1]
        mask = None
        if entry.get("mask"):
            mask = load_mask(root / entry["mask"])
            if mask.shape not in (frame_shape, (box[3], box[2])):
                raise ValueError(
                    f"Region '{entry['id']}': mask {entry['mask']} is {mask.shape[1]}x{mask.shape[0]} "
                    f"pixels. It must be the frame size ({frame_shape[1]}x{frame_shape[0]}) or "
                    f"the region size ({box[2]}x{box[3]})."
                )
        region_px = None
        if circle is not None:
            inside = circle_in_box(box, *circle)
            mask = inside if mask is None else (region_mask(mask, frame_shape, box) > 0) & inside
            region_px = int(inside.sum())  # the usable gate is judged on the circle
        regions.append(Region(id=entry["id"], box_px=box, mask=mask, region_px=region_px))
    if len(set(radii.values())) > 1:
        shown = ", ".join(f"{k}: {'no circle' if v is None else f'{v} px'}" for k, v in radii.items())
        raise ValueError(
            f"Every region must be a circle of the same radius for a fair comparison ({shown})."
        )
    return regions


def frame_numbering(
    scene: dict, first_index: Optional[int] = None, index_step: Optional[int] = None
) -> tuple[int, int]:
    """File number of the first frame and the gap between numbers.

    Read from scene.json (frames.first_index, frames.index_step) so the scene alone says
    which file each frame came from. A command-line value must agree with the scene.
    """
    frames = scene["frames"]
    resolved = []
    for key, given, default in (("first_index", first_index, 0), ("index_step", index_step, 1)):
        in_scene = frames.get(key)
        if given is not None and in_scene is not None and int(given) != int(in_scene):
            raise ValueError(
                f"--{key.replace('_', '-')} {given} disagrees with frames.{key} = {in_scene} in the "
                "scene. Leave the option out to use the scene's value."
            )
        resolved.append(int(given if given is not None else in_scene if in_scene is not None else default))
    first, step = resolved
    if first < 0:
        raise ValueError("first_index must be 0 or more")
    if step < 1:
        raise ValueError("index_step must be 1 or more")
    return first, step


def check_timestamps(scene: dict) -> Optional[list[str]]:
    """One model time per frame, or none at all. A list of another length would silently
    give some steps no time, or the wrong one, so it stops the run."""
    timestamps = scene["frames"].get("timestamps") or None
    count = scene["frames"]["count"]
    if timestamps is not None and len(timestamps) != count:
        raise ValueError(
            f"frames.timestamps has {len(timestamps)} entries but frames.count is {count}. "
            "Each frame needs exactly one model time; run prepare_scene.py again."
        )
    return timestamps


def iter_frames(
    scene: dict, root: Path, first_index: int, index_step: int = 1
) -> Iterator[Union[np.ndarray, FrameProblem]]:
    """Load frames one at a time. A frame that cannot be read keeps its place.

    File numbers run first_index, first_index + index_step, ... (SVS 3912 counts in fours).
    """
    pattern = scene["frames"]["pattern"]
    for i in range(scene["frames"]["count"]):
        path = root / pattern.format(index=first_index + i * index_step)
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
    first_index: Optional[int] = None,
    index_step: Optional[int] = None,
) -> dict:
    """Measure a scene and write the output file(s). Returns the features document.

    first_index / index_step default to the scene's frames.first_index / frames.index_step
    (then 0 and 1)."""
    scene = load_scene(scene_path)
    first_index, index_step = frame_numbering(scene, first_index, index_step)
    timestamps = check_timestamps(scene)
    regions = build_regions(scene, root)
    records = analyse_sequence(
        iter_frames(scene, root, first_index, index_step),
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
    parser.add_argument("--first-index", type=int, help="number of the first frame file (default: the scene's frames.first_index, else 0)")
    parser.add_argument("--index-step", type=int, help="gap between frame file numbers (default: the scene's frames.index_step, else 1)")
    parser.add_argument("--threshold", type=float, default=defaults.gradient_threshold, help="gradient threshold, grey levels per pixel")
    parser.add_argument("--min-usable", type=float, default=defaults.min_usable_fraction, help="smallest share of the region's pixels (the circle) that must vote")
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
            index_step=args.index_step,
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
