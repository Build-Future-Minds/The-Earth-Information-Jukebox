"""Turn a list of Earth-voice notes into a small WAV file for listening checks.

The sound is a plain decaying sine tone synthesised here, one identical tone per
pulse. It is a test tone for checking the rhythm rule, not the app's sound and not
music from anywhere else.
"""

from __future__ import annotations

import wave
from pathlib import Path
from typing import Sequence

import numpy as np


def midi_to_hz(pitch: int) -> float:
    return 440.0 * 2.0 ** ((pitch - 69) / 12.0)


def render_pulses(
    events: Sequence[dict], path: str | Path, sample_rate: int = 22050, tail_seconds: float = 0.5
) -> float:
    """Write the notes to a 16-bit mono WAV. Returns the length in seconds."""
    if not events:
        raise ValueError("no notes to render (a missing step is silent)")
    end = max(e["t"] + e["dur"] for e in events) + tail_seconds
    audio = np.zeros(int(round(end * sample_rate)), dtype=np.float64)
    for event in events:
        n = int(round(event["dur"] * sample_rate))
        t = np.arange(n) / sample_rate
        envelope = np.exp(-t / 0.03) * np.minimum(1.0, t / 0.002)  # 2 ms attack, 30 ms decay
        tone = event["vel"] * envelope * np.sin(2.0 * np.pi * midi_to_hz(event["pitch"]) * t)
        start = int(round(event["t"] * sample_rate))
        audio[start : start + n] += tone
    peak = float(np.max(np.abs(audio)))
    if peak > 0:
        audio *= 0.8 / peak
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(sample_rate)
        handle.writeframes((audio * 32767).astype("<i2").tobytes())
    return end
