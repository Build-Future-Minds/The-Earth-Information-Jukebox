"""The numbers the web page "How it's made" shows, written to one JSON file by the run that measured them.

    docs/measurements/math_checks.json

It holds every verification experiment (the same tables as docs/science_review.md sections 1 to 5,
measured on TEST INPUTS, not NASA data) and the engine's settings, read from the code's own
defaults. The page imports this file, so it shows no number that a run did not write.
analysis/tests/test_math_checks.py checks the file against the code and against science_review.md.
"""

from __future__ import annotations

import json
import platform
from dataclasses import asdict
from datetime import date
from pathlib import Path

import cv2
import numpy as np

from .image_analysis import LUMA_RGB, SOBEL_SCALE, AnalysisParams, blur_radius, support_radius
from .rhythm import RhythmParams

CHECKS_SCHEMA_VERSION = "0.1"


def engine_settings() -> dict:
    """The analysis and rhythm settings every table uses: the code's defaults, nothing typed."""
    params = AnalysisParams()
    rhythm = RhythmParams()
    return {
        "analysis": {
            **asdict(params),
            "sobel_scale": SOBEL_SCALE,
            "luma_rgb": list(LUMA_RGB),
            "blur_radius_px": blur_radius(params.blur_sigma),
            "support_radius_px": support_radius(params.blur_sigma),
        },
        "rhythm": {
            "beat_seconds": rhythm.beat_seconds,
            "long_fraction_at_zero": rhythm.long_fraction_at_zero,
            "long_fraction_at_one": rhythm.long_fraction_at_one,
            "note_seconds": rhythm.dur,
        },
    }


def build_checks(results: dict[str, dict]) -> dict:
    return {
        "schema_version": CHECKS_SCHEMA_VERSION,
        "note": "TEST INPUTS (synthetic images), not NASA data. Written by analysis/run_experiments.py; "
        "do not edit by hand.",
        "generated_by": "analysis/run_experiments.py",
        "run": {
            "date": date.today().isoformat(),
            "python": platform.python_version(),
            "numpy": np.__version__,
            "opencv": cv2.__version__,
        },
        "settings": engine_settings(),
        "experiments": results,
    }


def write_checks(results: dict[str, dict], path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(build_checks(results), handle, indent=1)
        handle.write("\n")
    return path
