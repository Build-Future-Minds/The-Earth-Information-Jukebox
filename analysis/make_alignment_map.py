"""Whole-picture alignment map for the globe: one frame of the ocean picture, from alignment_map().

For every point of a coarse grid on the NASA picture, this gives the engine's alignment for a
circle of the approved radius centred on that point. It is the same maths as features.py
(explore_regions.alignment_map, which matches measure_alignment), so the globe can look up any
spot and play it with the same rule. Dev B's plan: "the globe's alignment map (one frame, from
alignment_map())".

Run from the `analysis/` folder (the frames come from tools/download_frames.sh):

    python make_alignment_map.py
    python make_alignment_map.py --root C:/other/clone      # if the frames live in another copy

It writes ../data/alignment_map.json (format: contracts/alignment-map.schema.json) and prints a
check: at each approved region's centre the map must equal features.json for the same frame.

Ocean picture (SVS 3912) only: the land rule is that picture's flat grey land. The numbers describe
the drawn picture, not the ocean, and they are measured on the flat map (see "limitations").
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from explore_regions import alignment_map, land_mask
from features import PROJECT_ROOT, frame_numbering, load_scene
from sonata_math.image_analysis import AnalysisParams, load_image, support_radius

SCHEMA_VERSION = "0.1"
OCEAN_SVS_ID = 3912

LIMITATIONS = [
    "Measured on the flat map. East-west distances there are stretched by 1/cos(latitude) "
    "(1.8 times at 56 S), which pulls lines toward horizontal and raises scores away from the "
    "equator (docs/science_review.md section 9). True circles on the globe come later (task L7).",
    "One model frame only: no change over time.",
    "It describes the drawn picture (how strongly the drawn lines share one direction), not water "
    "speed, turbulence or ocean health.",
    "null means no number: land, coast or the frame edge inside the circle, or too little visible "
    "detail. It is never zero.",
]


def compute_map(frame_bgr: np.ndarray, params: AnalysisParams, radius: int):
    """Score, usable share and open-water share for a circle centred on every pixel.

    The flat map's left and right edges are the same meridian (180 degrees, in the Pacific), so the
    picture is wrapped around before measuring: a circle near one edge continues on the other side,
    as it does on the globe. Away from the edges nothing changes. The top and bottom are not wrapped.
    """
    pad = radius + support_radius(params.blur_sigma) + 2
    wrapped = cv2.copyMakeBorder(frame_bgr, 0, 0, pad, pad, cv2.BORDER_WRAP)
    land = land_mask([wrapped])
    score, usable, water = alignment_map(wrapped, land, params, radius)
    return score[:, pad:-pad], usable[:, pad:-pad], water[:, pad:-pad]


def sample_grid(score: np.ndarray, water: np.ndarray, step: int, min_water: float):
    """Values at grid points step/2, step/2 + step, ... in each direction (None = no number)."""
    height, width = score.shape
    xs = list(range(step // 2, width, step))
    ys = list(range(step // 2, height, step))
    rows = []
    for y in ys:
        row: list[Optional[float]] = []
        for x in xs:
            value = score[y, x]
            row.append(round(float(value), 3) if np.isfinite(value) and water[y, x] >= min_water else None)
        rows.append(row)
    return xs, ys, rows


def build_document(scene: dict, scene_ref: str, frame: int, file_number: int, xs, ys, rows, *,
                   radius: int, step: int, min_water: float, params: AnalysisParams, checks: list) -> dict:
    source = scene.get("source") or {}
    timestamps = scene["frames"].get("timestamps") or []
    values = [v for row in rows for v in row if v is not None]
    return {
        "schema_version": SCHEMA_VERSION,
        "is_mock": bool(scene["is_mock"]),
        "generated_by": "analysis/make_alignment_map.py",
        "scene": scene_ref,
        "source": {key: source.get(key) for key in ("svs_id", "url", "title", "credit", "data_kind")},
        "frame": {
            "index": frame,
            "file_number": file_number,
            "source_time": timestamps[frame] if frame < len(timestamps) else None,
        },
        "measurement": {
            "what": "How strongly the visible lines in a circle of the rendered image share one direction "
                    "(structure-tensor orientation coherence, the same as features.py). Not a physical quantity.",
            "radius_px": radius,
            "gradient_threshold": params.gradient_threshold,
            "min_usable_fraction": params.min_usable_fraction,
            "min_open_water": min_water,
            "smoothing": "none (one frame)",
        },
        "grid": {
            "step_px": step,
            "columns": len(xs),
            "rows": len(ys),
            "first_center_px": [xs[0], ys[0]],
            "image_width": scene["frames"]["width"],
            "image_height": scene["frames"]["height"],
            "projection": "equirectangular: lon = x * 360 / image_width - 180, lat = 90 - y * 180 / image_height, "
                          "with x, y the circle centre in pixels",
        },
        "summary": {
            "points": len(xs) * len(ys),
            "with_a_number": len(values),
            "min": min(values) if values else None,
            "max": max(values) if values else None,
        },
        "checked_against_features": checks,
        "limitations": LIMITATIONS,
        "alignment": rows,
    }


def dumps(document: dict) -> str:
    """Stable JSON with one grid row per line, so the file stays readable and diffs stay small."""
    head = {k: v for k, v in document.items() if k != "alignment"}
    text = json.dumps(head, indent=2, ensure_ascii=False)
    rows = ",\n".join("    " + json.dumps(row, separators=(",", ":")) for row in document["alignment"])
    return text[:-2] + ',\n  "alignment": [\n' + rows + "\n  ]\n}\n"


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--scene", type=Path, default=PROJECT_ROOT / "data/scene.json")
    parser.add_argument("--features", type=Path, default=PROJECT_ROOT / "data/features.json",
                        help="checked at each region's centre for the same frame")
    parser.add_argument("--out", type=Path, default=PROJECT_ROOT / "data/alignment_map.json")
    parser.add_argument("--root", type=Path, default=PROJECT_ROOT, help="folder that scene paths are relative to")
    parser.add_argument("--frame", type=int, default=0, help="frame number within the scene (0 = the first)")
    parser.add_argument("--step", type=int, default=16, help="grid spacing in pixels")
    # Design choice (Dev A, 15 Nov): at least half the circle is water. Land pixels never vote, as in
    # features.py; 0.95 is the stricter rule used to pick the approved regions (explore_regions.py).
    parser.add_argument("--min-water", type=float, default=0.5,
                        help="smallest open-water share of the circle for a point to get a number")
    args = parser.parse_args(argv)

    try:
        scene = load_scene(args.scene)
        svs_id = (scene.get("source") or {}).get("svs_id")
        if svs_id != OCEAN_SVS_ID:
            raise ValueError(f"this map uses the ocean picture's land rule (SVS {OCEAN_SVS_ID}); the scene is SVS {svs_id}")
        radii = {int(r["radius_px"]) for r in scene["regions"]}
        if len(radii) != 1:
            raise ValueError(f"the regions must share one radius, found {sorted(radii)}")
        radius = radii.pop()
        if not 0 <= args.frame < scene["frames"]["count"]:
            raise ValueError(f"--frame must be between 0 and {scene['frames']['count'] - 1}")
        first, step = frame_numbering(scene, None, None)
        file_number = first + args.frame * step
        frame_bgr = load_image(args.root / scene["frames"]["pattern"].format(index=file_number))
    except (OSError, ValueError, KeyError) as error:
        print(f"make_alignment_map.py: {error}", file=sys.stderr)
        return 2

    params = AnalysisParams()
    score, _usable, water = compute_map(frame_bgr, params, radius)
    xs, ys, rows = sample_grid(score, water, args.step, args.min_water)

    # The load-bearing check: at each approved centre the map must give the engine's number.
    checks = []
    features = json.loads(args.features.read_text(encoding="utf-8")) if args.features.is_file() else None
    for region in scene["regions"]:
        cx, cy = region["center_px"]
        mine = score[cy, cx]
        theirs = None
        if features:
            step_ = next((s for s in features["steps"] if s["region"] == region["id"] and s["frame"] == args.frame), None)
            theirs = step_["alignment"] if step_ and step_["status"] == "ok" else None
        checks.append({
            "region": region["id"],
            "center_px": [cx, cy],
            "map": round(float(mine), 4) if np.isfinite(mine) else None,
            "features": theirs,
        })
        print(f"check {region['id']:22s} map {mine:.4f}   features.json {theirs}")

    # The scene's path inside the project, e.g. "data/scene.json" (frames may come from another --root).
    scene_ref = args.scene.as_posix()
    for base in (PROJECT_ROOT, args.root):
        try:
            scene_ref = args.scene.resolve().relative_to(base.resolve()).as_posix()
            break
        except ValueError:
            continue
    document = build_document(scene, scene_ref, args.frame, file_number, xs, ys, rows, radius=radius,
                              step=args.step, min_water=args.min_water, params=params, checks=checks)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(dumps(document), encoding="utf-8")
    s = document["summary"]
    print(f"{s['with_a_number']} of {s['points']} grid points have a number ({s['min']} to {s['max']}); "
          f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
