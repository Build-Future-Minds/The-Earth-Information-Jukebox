"""Optional smoothing of a sequence of measurements over time.

Rule: an exponential moving average over each unbroken run of valid measurements.

    s[0] = a[0]
    s[k] = alpha * a[k] + (1 - alpha) * s[k-1]

alpha = 1 switches smoothing off. A missing step stays missing (it is never filled
in), and the average starts again from scratch at the next valid step, so a value
shown after a gap is built only from what was measured after the gap.
"""

from __future__ import annotations

import math
from typing import Optional, Sequence


def smooth_sequence(values: Sequence[Optional[float]], alpha: float) -> list[Optional[float]]:
    """Smooth alignment values in time order. `None` marks a missing step."""
    if not (isinstance(alpha, (int, float)) and math.isfinite(alpha) and 0.0 < alpha <= 1.0):
        raise ValueError("smoothing alpha must be in (0, 1]")
    smoothed: list[Optional[float]] = []
    state: Optional[float] = None
    for value in values:
        if value is None:
            smoothed.append(None)
            state = None
            continue
        if not (math.isfinite(value) and 0.0 <= value <= 1.0):
            raise ValueError(f"alignment values must be in [0, 1], got {value!r}")
        state = float(value) if state is None else alpha * float(value) + (1.0 - alpha) * state
        smoothed.append(state)
    return smoothed
