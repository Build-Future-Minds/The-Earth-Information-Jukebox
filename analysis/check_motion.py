"""Check that the map does not move between two frames (no zoom, pan, fade or overlay).

Land in the SVS 3912 'orig' frames is drawn as flat grey (about RGB 49,49,49). If the
camera never moves, the same pixels are land in every frame and their colour stays the same.

Usage:
    python3 analysis/check_motion.py FRAME_A FRAME_B

Example:
    python3 analysis/check_motion.py \
        assets/frames/svs3912/flat_global_ecco2_2028x1024.23000.tif \
        assets/frames/svs3912/flat_global_ecco2_2028x1024.25000.tif
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

# A pixel counts as land if it is grey (R, G, B nearly equal) and in the land brightness band.
LAND_MIN, LAND_MAX = 30, 80
MAX_CHANNEL_SPREAD = 6

# Pass limits. Flow lines touching coasts cause a few differences, so allow a little.
MAX_MASK_DISAGREEMENT = 0.01   # share of land pixels that are land in only one frame
MAX_MEAN_LAND_CHANGE = 3.0     # average brightness change on shared land (0-255 scale)


def load_rgb(path: Path) -> np.ndarray:
    if not path.exists():
        sys.exit(f"File not found: {path}\nCheck the path, or download the frame first.")
    try:
        return np.asarray(Image.open(path).convert("RGB"), dtype=np.int16)
    except Exception as err:
        sys.exit(f"Could not read {path} as an image ({err}).\nRe-download it; it may be incomplete.")


def land_mask(rgb: np.ndarray) -> np.ndarray:
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    mean = rgb.mean(axis=2)
    return (spread <= MAX_CHANNEL_SPREAD) & (mean >= LAND_MIN) & (mean <= LAND_MAX)


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    path_a, path_b = Path(sys.argv[1]), Path(sys.argv[2])
    a, b = load_rgb(path_a), load_rgb(path_b)
    if a.shape != b.shape:
        print(f"FAIL: frames are different sizes {a.shape[:2]} vs {b.shape[:2]}")
        return 1

    land_a, land_b = land_mask(a), land_mask(b)
    either = land_a | land_b
    both = land_a & land_b
    disagreement = (either.sum() - both.sum()) / max(either.sum(), 1)
    mean_change = float(np.abs(a[both] - b[both]).mean()) if both.any() else float("nan")

    print(f"Frame A: {path_a.name}  land pixels: {land_a.sum():,}")
    print(f"Frame B: {path_b.name}  land pixels: {land_b.sum():,}")
    print(f"Land in only one frame: {disagreement:.2%} (limit {MAX_MASK_DISAGREEMENT:.0%})")
    print(f"Mean brightness change on shared land: {mean_change:.2f} (limit {MAX_MEAN_LAND_CHANGE})")

    ok = disagreement <= MAX_MASK_DISAGREEMENT and mean_change <= MAX_MEAN_LAND_CHANGE
    print("PASS: land is fixed; no camera motion, fade or overlay detected." if ok
          else "FAIL: land moved or changed. Look at both frames side by side before using them.")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
