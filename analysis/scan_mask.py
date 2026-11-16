"""Write the picture scan's mask for the rain picture (SVS 4285): the pixels the scan never reads.

One command, from the repository root:

    python analysis/scan_mask.py            # writes data/imerg/scan_mask.png

Why: in this picture the land is a satellite photo, not data (data/imerg/scene.json, limitations).
The scan reads colour, so a desert would sound like heavy rain. The scan leaves the land out, and
the app draws it as "no data", never as silence that means "no rain".

What counts as land: exactly what prepare_scene.py uses for this source's Earth regions
(`reference_land_mask`): the SVS 3912 ocean map's grey-land outline, scaled to these frames, plus
pixels that are bright and do not change across the 30 frames (ice, the corner mark), grown by the
coast margin. So the scan and the Earth rhythm agree on what land is in this picture.

It reads
    assets/frames/svs4285/          the 30 frames and imerg_dates.txt (bash tools/download_frames.sh)
    assets/frames/svs3912/flat_global_ecco2_2028x1024.23000.tif   the ocean map, for the outline
    data/imerg/scene.json           the two regions, for the check below
    data/imerg/masks/               the regions' own masks, for the check below

and writes
    data/imerg/scan_mask.png        the frames' size (3600 x 1800): white = never read, black = read

Check: inside each rain circle the scan mask must mark exactly the pixels the region's own mask
leaves out. Any difference stops the run with a message, and nothing is written.

Owner: Developer A. A design choice (docs/mapping_spec.md, "Play along: the picture scan").
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np

import prepare_scene as P

ROOT = Path(__file__).resolve().parent.parent
SOURCE = P.SOURCES["svs4285"]
OUT = "data/imerg/scan_mask.png"
SCENE = "data/imerg/scene.json"


def scan_land(root: Path, source: P.Source = SOURCE) -> tuple[np.ndarray, list[P.FrameCheck]]:
    """The land the scan never reads, at the frames' size, made exactly as prepare_scene.py makes it."""
    frames_dir = root / source.frames_dir
    if not frames_dir.is_dir():
        raise P.SceneError(f"Frames folder not found: {frames_dir}\nRun: bash tools/download_frames.sh")
    indices = list(range(source.first, source.last + 1, source.step))
    dates = P.read_dates(frames_dir / source.dates_file) if source.dates_file else {n: source.fixed_time for n in indices}
    checks, usable = P.check_frames(frames_dir, indices, dates, size=None, frame_name=source.frame_name,
                                    dates_name=source.dates_file or "the source preset")
    if not usable:
        raise P.SceneError(f"None of the {len(indices)} frames could be used ({checks[0].reason}).\n"
                           "Run: bash tools/download_frames.sh")
    if source.land_mode != "reference":
        raise P.SceneError(f"{source.key}: its land is drawn grey, not a photo. The scan's floor keeps grey land "
                           "silent, so this source needs no scan mask.")
    return P.reference_land_mask(root, usable, source.land_rule), checks


def region_differences(land: np.ndarray, scene: dict, root: Path) -> dict[str, int]:
    """For each region: pixels inside its circle where the scan mask and the region's own mask disagree."""
    out = {}
    for r in scene["regions"]:
        x, y, w, h = r["box_px"]
        own = cv2.imread(str(root / r["mask"]), cv2.IMREAD_GRAYSCALE)
        if own is None or own.shape != (h, w):
            raise P.SceneError(f"Region mask {r['mask']} is missing or not {w}x{h}. Run prepare_scene.py --source svs4285.")
        inside = P.region_mask(np.zeros_like(land), r["center_px"], r["radius_px"])
        read_by_region = own > 127                      # white: inside the circle and not land
        read_by_scan = inside & ~land[y : y + h, x : x + w]
        out[r["id"]] = int(np.count_nonzero(inside & (read_by_region != read_by_scan)))
    return out


def main(argv: list[str] | None = None, root: Path = ROOT, source: P.Source = SOURCE) -> int:
    parser = argparse.ArgumentParser(description="Write the rain picture's scan mask (pixels never read).")
    parser.add_argument("--out", type=Path, default=root / OUT)
    parser.add_argument("--scene", type=Path, default=root / SCENE)
    args = parser.parse_args(argv)
    try:
        land, checks = scan_land(root, source)
        scene = P.read_json(args.scene, "Scene file")
        diff = region_differences(land, scene, root)
        if any(diff.values()):
            raise P.SceneError(f"The scan mask and the regions' own masks disagree inside a circle {diff}. "
                               "The frames may differ from the ones prepare_scene.py used; do not write the mask.")
        args.out.parent.mkdir(parents=True, exist_ok=True)
        if not cv2.imwrite(str(args.out), land.astype(np.uint8) * 255):
            raise P.SceneError(f"Could not write {args.out}.")
    except P.SceneError as err:
        print(f"scan_mask: {err}", file=sys.stderr)
        return 2
    used = sum(c.usable for c in checks)
    height, width = land.shape
    print(f"Wrote {args.out} ({width}x{height}): {land.mean():.4%} of pixels never read, "
          f"from {used} of {len(checks)} frames. Inside each circle, pixels where it differs from the "
          f"region's own mask: {json.dumps(diff)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
