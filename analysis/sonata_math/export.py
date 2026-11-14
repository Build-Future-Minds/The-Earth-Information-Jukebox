"""Structured output for the app.

Two documents are written from the same measurements:

features.json           The agreed contract (contracts/features.schema.json, version 0.2).
                        The app reads this and makes the sound live.
rhythm_reference.json   A check file. It repeats the measurements, adds the diagnostic
                        numbers, and lists the exact pulse times and notes the rule
                        produces, so the app's live rhythm can be compared with it.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Optional, Sequence

from . import __version__
from .image_analysis import STATUS_MISSING, STATUS_OK, AnalysisParams, blur_radius
from .pipeline import TIME_DECIMALS, StepRecord
from .rhythm import EARTH_VOICE, RhythmParams, beat_timing, events_for_steps, rule_text

FEATURES_SCHEMA_VERSION = "0.2"
RHYTHM_REFERENCE_SCHEMA_VERSION = "0.1"

_FEATURE_STEP_KEYS = {"t", "frame", "source_time", "region", "status", "alignment", "reason"}
_FEATURE_STEP_REQUIRED = {"t", "region", "status", "alignment", "reason"}
_FEATURE_TOP_KEYS = {"schema_version", "is_mock", "scene", "step_seconds", "normalisation", "steps"}
_NORMALISATION_KEYS = {"gradient_threshold", "min_usable_fraction", "smoothing_alpha"}


def features_document(
    records: Sequence[StepRecord],
    *,
    scene: str,
    is_mock: bool,
    step_seconds: float,
    params: AnalysisParams,
    smoothing_alpha: float,
) -> dict:
    """Build features.json exactly as contracts/features.schema.json (0.2) describes it."""
    document = {
        "schema_version": FEATURES_SCHEMA_VERSION,
        "is_mock": bool(is_mock),
        "scene": scene,
        "step_seconds": float(step_seconds),
        "normalisation": {
            "gradient_threshold": float(params.gradient_threshold),
            "min_usable_fraction": float(params.min_usable_fraction),
            "smoothing_alpha": float(smoothing_alpha),
        },
        "steps": [
            {
                "t": r.t,
                "frame": r.frame,
                "source_time": r.source_time,
                "region": r.region,
                "status": r.status,
                "alignment": r.alignment,
                "reason": r.reason,
            }
            for r in records
        ],
    }
    validate_features_document(document)
    return document


def validate_features_document(document: dict) -> None:
    """Check the rules of the features contract. Raises ValueError with what is wrong."""

    def fail(message: str) -> None:
        raise ValueError(f"features document is not valid: {message}")

    if not isinstance(document, dict) or set(document) != _FEATURE_TOP_KEYS:
        fail(f"top-level keys must be exactly {sorted(_FEATURE_TOP_KEYS)}")
    if document["schema_version"] != FEATURES_SCHEMA_VERSION:
        fail(f"schema_version must be {FEATURES_SCHEMA_VERSION!r}")
    if not isinstance(document["is_mock"], bool):
        fail("is_mock must be true or false")
    if not isinstance(document["scene"], str):
        fail("scene must be text")
    step_seconds = document["step_seconds"]
    if not (_is_number(step_seconds) and step_seconds > 0):
        fail("step_seconds must be a number > 0")
    norm = document["normalisation"]
    if not isinstance(norm, dict) or set(norm) != _NORMALISATION_KEYS:
        fail(f"normalisation keys must be exactly {sorted(_NORMALISATION_KEYS)}")
    if not _is_number(norm["gradient_threshold"]):
        fail("gradient_threshold must be a number")
    if not (_is_number(norm["min_usable_fraction"]) and 0 <= norm["min_usable_fraction"] <= 1):
        fail("min_usable_fraction must be in [0, 1]")
    if not (_is_number(norm["smoothing_alpha"]) and 0 < norm["smoothing_alpha"] <= 1):
        fail("smoothing_alpha must be in (0, 1]")
    if not isinstance(document["steps"], list):
        fail("steps must be a list")
    for i, step in enumerate(document["steps"]):
        where = f"steps[{i}]"
        if not isinstance(step, dict):
            fail(f"{where} must be an object")
        if not (_FEATURE_STEP_REQUIRED <= set(step) <= _FEATURE_STEP_KEYS):
            fail(f"{where} has missing or unknown keys")
        if not (_is_number(step["t"]) and step["t"] >= 0):
            fail(f"{where}.t must be a number >= 0")
        if "frame" in step and not (
            isinstance(step["frame"], int) and not isinstance(step["frame"], bool) and step["frame"] >= 0
        ):
            fail(f"{where}.frame must be a whole number >= 0")
        if "source_time" in step and not (
            step["source_time"] is None or isinstance(step["source_time"], str)
        ):
            fail(f"{where}.source_time must be text or null")
        if not isinstance(step["region"], str):
            fail(f"{where}.region must be text")
        if step["status"] == STATUS_OK:
            if not (_is_number(step["alignment"]) and 0 <= step["alignment"] <= 1):
                fail(f"{where}: an ok step needs alignment in [0, 1]")
            if step["reason"] is not None:
                fail(f"{where}: an ok step must have reason null")
        elif step["status"] == STATUS_MISSING:
            if step["alignment"] is not None:
                fail(f"{where}: a missing step must have alignment null, never a number")
            if not (isinstance(step["reason"], str) and step["reason"].strip()):
                fail(f"{where}: a missing step must say why")
        else:
            fail(f"{where}.status must be 'ok' or 'missing'")


def rhythm_reference_document(
    records: Sequence[StepRecord],
    *,
    scene: str,
    is_mock: bool,
    params: AnalysisParams,
    smoothing_alpha: float,
    rhythm: RhythmParams,
    source: Optional[dict] = None,
) -> dict:
    """Build the check file: measurements, diagnostics, pulse times and notes."""
    steps = []
    for r in records:
        if r.alignment is None:
            timing_fields = {
                "long_fraction": None,
                "pulse_times": [],
                "long_interval": None,
                "short_interval": None,
            }
        else:
            timing = beat_timing(r.alignment, rhythm)
            timing_fields = {
                "long_fraction": round(timing.long_fraction, TIME_DECIMALS),
                "pulse_times": [round(r.t + offset, TIME_DECIMALS) for offset in timing.pulse_offsets],
                "long_interval": round(timing.long_interval, TIME_DECIMALS),
                "short_interval": round(timing.short_interval, TIME_DECIMALS),
            }
        steps.append(
            {
                "t": r.t,
                "frame": r.frame,
                "source_time": r.source_time,
                "region": r.region,
                "status": r.status,
                "alignment": r.alignment,
                "alignment_raw": r.alignment_raw,
                "reason": r.reason,
                "reason_code": r.reason_code,
                "usable_fraction": r.usable_fraction,
                "dominant_angle_deg": r.dominant_angle_deg,
                **timing_fields,
            }
        )

    region_ids = list(dict.fromkeys(r.region for r in records))
    events = {
        region: events_for_steps(
            [
                {"t": r.t, "region": r.region, "alignment": r.alignment}
                for r in records
                if r.region == region
            ],
            rhythm,
        )
        for region in region_ids
    }

    return {
        "schema_version": RHYTHM_REFERENCE_SCHEMA_VERSION,
        "is_mock": bool(is_mock),
        "generated_by": f"earth-sonata math engine {__version__}",
        "scene": scene,
        "source": source,
        "measurement": {
            "what": "How strongly the visible lines in the rendered image share one "
            "direction (structure-tensor orientation coherence). Not a physical quantity.",
            "gray_mode": params.gray_mode,
            "blur_sigma_px": params.blur_sigma,
            "blur_radius_px": blur_radius(params.blur_sigma),
            "gradient_operator": "sobel_3x3_div_8",
            "weight_power": params.weight_power,
            "gradient_threshold": params.gradient_threshold,
            "gradient_threshold_units": "grey levels (0-255 scale) per pixel",
            "min_usable_fraction": params.min_usable_fraction,
            "smoothing_alpha": smoothing_alpha,
            "smoothing_rule": "exponential moving average over consecutive ok steps; "
            "starts again after a missing step",
            "same_settings_for_all_regions": True,
        },
        "rhythm": {
            "rule": rule_text(rhythm),
            "beat_seconds": rhythm.beat_seconds,
            "pulses_per_beat": 2,
            "long_fraction_at_alignment_0": rhythm.long_fraction_at_zero,
            "long_fraction_at_alignment_1": rhythm.long_fraction_at_one,
            "voice": EARTH_VOICE,
            "pitch": rhythm.pitch,
            "dur": rhythm.dur,
            "vel": rhythm.vel,
            "carries_data": ["position of the second pulse inside the beat"],
            "fixed_no_data": ["tempo", "pitch", "note length", "loudness"],
            "missing_rule": "a missing step has no pulses",
        },
        "steps": steps,
        "events": events,
    }


def write_json(path: str | Path, document: dict) -> None:
    """Write a document as UTF-8 JSON with a stable layout."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(document, handle, indent=2, ensure_ascii=False, allow_nan=False)
        handle.write("\n")


def _is_number(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
