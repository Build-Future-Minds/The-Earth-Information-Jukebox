"""Make a small practice scene. TEST INPUT - everything written here is synthetic, NOT NASA data.

    python make_practice_scene.py

Writes into analysis/practice/:
    frames/TEST_INPUT_frame_00000.png ...   8 frames, 512x256
    TEST_INPUT_mask_aligned.png             mask that excludes a fake legend
    scene.practice.json                     scene file (is_mock: true)

Left box  "aligned_lines": dashes that nearly share one direction, plus a fake legend
          that the mask excludes.
Right box "mixed_lines":   dashes in every direction. Frames 3 and 4 are blank there,
          so those steps come out `missing`.
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np

from sonata_math import synthetic

HERE = Path(__file__).resolve().parent
PRACTICE = HERE / "practice"
N_FRAMES = 8
FRAME_SIZE = (256, 512)  # height, width
BOX_ALIGNED = (16, 16, 224, 224)  # x, y, width, height
BOX_MIXED = (272, 16, 224, 224)
BLANK_FRAMES = (3, 4)


def make_frame(index: int) -> tuple[np.ndarray, np.ndarray]:
    """One practice frame and the mask for the aligned box (frame-sized)."""
    frame = np.full(FRAME_SIZE, 20, dtype=np.uint8)
    box_size = (BOX_ALIGNED[3], BOX_ALIGNED[2])

    aligned = synthetic.line_field(box_size, n_lines=260, angle_deg=20.0, spread_deg=6.0, seed=100 + index)
    aligned, box_mask = synthetic.add_legend(aligned)
    x, y, w, h = BOX_ALIGNED
    frame[y : y + h, x : x + w] = aligned

    if index not in BLANK_FRAMES:
        mixed = synthetic.line_field(box_size, n_lines=260, spread_deg=None, seed=200 + index)
        x, y, w, h = BOX_MIXED
        frame[y : y + h, x : x + w] = mixed

    mask = np.ones(FRAME_SIZE, dtype=bool)
    x, y, w, h = BOX_ALIGNED
    mask[y : y + h, x : x + w] = box_mask
    return frame, mask


def main() -> None:
    frames_dir = PRACTICE / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    mask = None
    for index in range(N_FRAMES):
        frame, mask = make_frame(index)
        cv2.imwrite(str(frames_dir / f"TEST_INPUT_frame_{index:05d}.png"), frame)
    cv2.imwrite(str(PRACTICE / "TEST_INPUT_mask_aligned.png"), mask.astype(np.uint8) * 255)

    scene = {
        "schema_version": "0.1",
        "is_mock": True,
        "source": {
            "svs_id": None,
            "url": "about:mock",
            "title": "PRACTICE SCENE - TEST INPUT - NOT NASA DATA",
            "credit": "Synthetic test input made by the Earth Sonata team (analysis/make_practice_scene.py)",
            "data_kind": "synthetic_test_input",
            "model_or_instrument": "none",
            "data_start": None,
            "data_end": None,
            "limitations": [
                "Computer-drawn dashes for testing the math engine. It describes no real data.",
                "Frames 3 and 4 are blank in the right-hand box on purpose, to practise missing information.",
            ],
        },
        "frames": {
            "width": FRAME_SIZE[1],
            "height": FRAME_SIZE[0],
            "count": N_FRAMES,
            "pattern": "analysis/practice/frames/TEST_INPUT_frame_{index:05d}.png",
            "timestamps": [],
            "camera_static_check": "not applicable (synthetic test input)",
        },
        "regions": [
            {
                "id": "aligned_lines",
                "name": "Aligned lines box (practice)",
                "box_px": list(BOX_ALIGNED),
                "mask": "analysis/practice/TEST_INPUT_mask_aligned.png",
                "description": "Dashes that nearly share one direction. A fake legend is masked out.",
            },
            {
                "id": "mixed_lines",
                "name": "Mixed lines box (practice)",
                "box_px": list(BOX_MIXED),
                "mask": None,
                "description": "Dashes pointing every which way. Blank in frames 3 and 4.",
            },
        ],
    }
    with open(PRACTICE / "scene.practice.json", "w", encoding="utf-8", newline="\n") as handle:
        json.dump(scene, handle, indent=2)
        handle.write("\n")
    print(f"wrote {N_FRAMES} TEST INPUT frames, a mask and scene.practice.json to {PRACTICE}")


if __name__ == "__main__":
    main()
