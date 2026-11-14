"""Rhythm mapping: alignment (0..1) -> where the second pulse of each beat falls.

This is a sound rule we chose. It is not what the ocean sounds like.

Each beat lasts `beat_seconds` (T) and holds two identical pulses:

    pulse 1 at the start of the beat
    pulse 2 at  long_fraction * T  after it

    long_fraction = 0.75 - 0.25 * alignment        (0.5 = even, 0.75 = strongly uneven)

So the two gaps are
    long gap  = T * long_fraction          (0.5 T .. 0.75 T)
    short gap = T * (1 - long_fraction)    (0.25 T .. 0.5 T)
and they always add up to T: the tempo never changes, only the spacing inside the beat.

With T = 1 s this is the team's first draft, d1 = 0.25 + 0.25*C (the short gap) and
d2 = 1 - d1 (the long gap).

Tempo, pitch, loudness and note length are fixed and carry no data. A missing
measurement produces no pulses at all. Nothing here reads the user's piano.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional, Sequence

EARTH_VOICE = "earth"


@dataclass(frozen=True)
class RhythmParams:
    """Fixed sound settings, identical for every region.

    beat_seconds           Length of one beat (= one measured step) in seconds.
    long_fraction_at_zero  Where pulse 2 falls when alignment = 0 (share of the beat).
    long_fraction_at_one   Where pulse 2 falls when alignment = 1 (0.5 = even).
    pitch, dur, vel        MIDI note, note length in seconds, loudness 0-1. No data.

    The defaults for pitch, dur and vel are the app's (web/src/audio/earthVoice.ts).
    Like the app, a note is shortened to 90% of the short gap if it would not fit.
    """

    beat_seconds: float = 1.0
    long_fraction_at_zero: float = 0.75
    long_fraction_at_one: float = 0.5
    pitch: int = 64
    dur: float = 0.08
    vel: float = 0.8

    def __post_init__(self) -> None:
        if not (math.isfinite(self.beat_seconds) and self.beat_seconds > 0):
            raise ValueError("beat_seconds must be > 0")
        if not (0.5 <= self.long_fraction_at_one <= self.long_fraction_at_zero < 1.0):
            raise ValueError("need 0.5 <= long_fraction_at_one <= long_fraction_at_zero < 1")
        if not (isinstance(self.pitch, int) and 0 <= self.pitch <= 127):
            raise ValueError("pitch must be a MIDI note 0-127")
        if not (0.0 <= self.vel <= 1.0):
            raise ValueError("vel must be in [0, 1]")
        if not (math.isfinite(self.dur) and self.dur > 0):
            raise ValueError("dur must be > 0")


@dataclass(frozen=True)
class BeatTiming:
    """The timing of one beat, in seconds from the start of the beat."""

    long_fraction: float
    pulse_offsets: tuple[float, float]  # (0, long gap)
    long_interval: float  # gap from pulse 1 to pulse 2
    short_interval: float  # gap from pulse 2 to the next beat's pulse 1


def _check_alignment(alignment: float) -> float:
    if isinstance(alignment, bool) or not isinstance(alignment, (int, float)):
        raise TypeError("alignment must be a number; a missing measurement has no rhythm")
    if not (math.isfinite(alignment) and 0.0 <= alignment <= 1.0):
        raise ValueError(f"alignment must be in [0, 1], got {alignment!r}")
    return float(alignment)


def long_fraction(alignment: float, params: RhythmParams = RhythmParams()) -> float:
    """Share of the beat that passes before the second pulse."""
    a = _check_alignment(alignment)
    span = params.long_fraction_at_zero - params.long_fraction_at_one
    return params.long_fraction_at_zero - span * a


def alignment_from_long_fraction(fraction: float, params: RhythmParams = RhythmParams()) -> float:
    """Inverse of the rule: read the alignment back from a pulse position."""
    span = params.long_fraction_at_zero - params.long_fraction_at_one
    if span == 0:
        raise ValueError("the rule is flat; alignment cannot be recovered")
    return (params.long_fraction_at_zero - fraction) / span


def rule_text(params: RhythmParams = RhythmParams()) -> str:
    """The rule as text, built from the parameters so it always matches the sound."""
    span = params.long_fraction_at_zero - params.long_fraction_at_one
    return f"long_fraction = {params.long_fraction_at_zero:g} - {span:g} * alignment"


def beat_timing(alignment: float, params: RhythmParams = RhythmParams()) -> BeatTiming:
    """Pulse positions and gaps for one beat."""
    fraction = long_fraction(alignment, params)
    long_gap = params.beat_seconds * fraction
    return BeatTiming(
        long_fraction=fraction,
        pulse_offsets=(0.0, long_gap),
        long_interval=long_gap,
        short_interval=params.beat_seconds - long_gap,
    )


def second_pulse_shift(a: float, b: float, params: RhythmParams = RhythmParams()) -> float:
    """How far apart (seconds) the second pulse sits for two alignment values.

    Useful for deciding whether two regions are far enough apart to be told apart by ear.
    """
    return abs(beat_timing(a, params).long_interval - beat_timing(b, params).long_interval)


def events_for_step(
    t: float, region: str, alignment: Optional[float], params: RhythmParams = RhythmParams()
) -> list[dict]:
    """Earth-voice notes for one beat starting at time t. Missing -> no notes."""
    if alignment is None:
        return []
    timing = beat_timing(alignment, params)
    why = {
        "region": region,
        "alignment": float(alignment),
        "long_fraction": round(timing.long_fraction, 6),
        "rule": rule_text(params),
    }
    # Same as the app: never let a note run into the next pulse.
    dur = round(min(params.dur, 0.9 * timing.short_interval), 6)
    return [
        {
            "t": round(float(t) + offset, 6),
            "voice": EARTH_VOICE,
            "pitch": params.pitch,
            "dur": dur,
            "vel": params.vel,
            "why": dict(why),
        }
        for offset in timing.pulse_offsets
    ]


def events_for_steps(steps: Sequence[dict], params: RhythmParams = RhythmParams()) -> list[dict]:
    """Earth-voice notes for a list of steps of one region.

    Each step is a dict with `t` (beat start, seconds), `region` and `alignment`
    (None when missing). One step = one beat of length `params.beat_seconds`.
    """
    events: list[dict] = []
    for step in steps:
        events.extend(events_for_step(step["t"], step["region"], step.get("alignment"), params))
    events.sort(key=lambda e: e["t"])
    return events
