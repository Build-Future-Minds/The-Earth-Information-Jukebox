"""Measure every region in every frame of a sequence, with the same settings for all.

An unusable frame keeps its place in the list and is marked `missing` with a reason.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Iterable, Optional, Sequence, Union

import numpy as np

from .image_analysis import (
    REASON_FRAME_SIZE_MISMATCH,
    AlignmentResult,
    AnalysisParams,
    measure_region,
    missing_result,
)
from .smoothing import smooth_sequence

ALIGNMENT_DECIMALS = 4  # exported precision; 0.0001 moves the second pulse by 0.025 ms
TIME_DECIMALS = 6


@dataclass(frozen=True)
class Region:
    """A named box in the frame. `mask` is True where pixels are included."""

    id: str
    box_px: tuple[int, int, int, int]  # x, y, width, height
    mask: Optional[np.ndarray] = None  # frame-sized or box-sized


@dataclass(frozen=True)
class FrameProblem:
    """Stands in for a frame that could not be loaded."""

    reason_code: str
    reason: str


@dataclass(frozen=True)
class StepRecord:
    """One region at one time step: what was measured and why it may be missing."""

    t: float  # seconds from the start of playback
    frame: int
    source_time: Optional[str]
    region: str
    status: str
    alignment: Optional[float]  # after smoothing; this is what the app turns into rhythm
    alignment_raw: Optional[float]  # this frame on its own
    reason: Optional[str]
    reason_code: Optional[str]
    usable_fraction: float
    dominant_angle_deg: Optional[float]

    def to_dict(self) -> dict:
        return asdict(self)


def _round(value: Optional[float], decimals: int) -> Optional[float]:
    return None if value is None else round(float(value), decimals)


def analyse_sequence(
    frames: Iterable[Union[np.ndarray, FrameProblem]],
    regions: Sequence[Region],
    params: AnalysisParams = AnalysisParams(),
    smoothing_alpha: float = 0.3,
    step_seconds: float = 1.0,
    timestamps: Optional[Sequence[Optional[str]]] = None,
    expected_size: Optional[tuple[int, int]] = None,
) -> list[StepRecord]:
    """Measure all regions over a sequence of frames.

    frames          arrays (grey or BGR) or FrameProblem placeholders, in time order
    regions         every region is measured with the same `params`
    smoothing_alpha 1 = no smoothing; smaller = smoother (see smoothing.py)
    step_seconds    playback time between frames (one step = one beat)
    timestamps      optional source timestamp per frame
    expected_size   (height, width) every frame must have; others are marked missing

    Returns records ordered by region, then by time.
    """
    if not regions:
        raise ValueError("at least one region is required")
    if len({r.id for r in regions}) != len(regions):
        raise ValueError("region ids must be unique")
    if not (step_seconds > 0):
        raise ValueError("step_seconds must be > 0")

    per_region: dict[str, list[AlignmentResult]] = {r.id: [] for r in regions}
    n_frames = 0
    for frame in frames:
        n_frames += 1
        for region in regions:
            if isinstance(frame, FrameProblem):
                result = missing_result(frame.reason_code, frame.reason)
            elif expected_size is not None and tuple(frame.shape[:2]) != tuple(expected_size):
                result = missing_result(
                    REASON_FRAME_SIZE_MISMATCH,
                    f"The frame is {frame.shape[1]}x{frame.shape[0]} pixels but the scene "
                    f"says {expected_size[1]}x{expected_size[0]}.",
                )
            else:
                result = measure_region(frame, region.box_px, region.mask, params)
            per_region[region.id].append(result)

    records: list[StepRecord] = []
    for region in regions:
        results = per_region[region.id]
        smoothed = smooth_sequence([r.alignment for r in results], smoothing_alpha)
        for index, (result, value) in enumerate(zip(results, smoothed)):
            source_time = None
            if timestamps is not None and index < len(timestamps):
                source_time = timestamps[index]
            records.append(
                StepRecord(
                    t=round(index * step_seconds, TIME_DECIMALS),
                    frame=index,
                    source_time=source_time,
                    region=region.id,
                    status=result.status,
                    alignment=_round(value, ALIGNMENT_DECIMALS),
                    alignment_raw=_round(result.alignment, ALIGNMENT_DECIMALS),
                    reason=result.reason,
                    reason_code=result.reason_code,
                    usable_fraction=round(result.usable_fraction, ALIGNMENT_DECIMALS),
                    dominant_angle_deg=_round(result.dominant_angle_deg, 1),
                )
            )
    return records
