"""Tests of the rhythm rule and the time smoothing."""

from __future__ import annotations

import json
import math
from pathlib import Path

import jsonschema
import pytest

from sonata_math.rhythm import (
    RhythmParams,
    alignment_from_long_fraction,
    beat_timing,
    events_for_step,
    events_for_steps,
    long_fraction,
    rule_text,
    second_pulse_shift,
)
from sonata_math.smoothing import smooth_sequence

CONTRACTS = Path(__file__).resolve().parents[2] / "contracts"
R = RhythmParams()
GRID = [i / 100 for i in range(101)]


# ------------------------------------------------------------------------- the rule


def test_rule_end_points_match_the_mapping_spec():
    assert long_fraction(1.0) == pytest.approx(0.5)  # aligned -> even
    assert long_fraction(0.5) == pytest.approx(0.625)  # "about 62 / 38"
    assert long_fraction(0.0) == pytest.approx(0.75)  # mixed -> 75 / 25


def test_the_two_gaps_always_add_up_to_one_beat():
    """This is what keeps the average tempo fixed: two pulses per beat, whatever the data."""
    for a in GRID:
        timing = beat_timing(a)
        assert timing.long_interval + timing.short_interval == pytest.approx(R.beat_seconds, abs=1e-12)
        assert timing.long_interval >= timing.short_interval - 1e-12
        assert timing.short_interval >= 0.25 * R.beat_seconds - 1e-12


def test_rule_equals_the_first_draft_formula_d1_d2():
    """With a 1 s beat: d1 = 0.25 + 0.25*C is the short gap and d2 = 1 - d1 the long gap."""
    for c in GRID:
        timing = beat_timing(c, RhythmParams(beat_seconds=1.0))
        d1 = 0.25 + 0.25 * c
        assert timing.short_interval == pytest.approx(d1, abs=1e-12)
        assert timing.long_interval == pytest.approx(1.0 - d1, abs=1e-12)


def test_more_alignment_always_means_a_more_even_beat():
    fractions = [long_fraction(a) for a in GRID]
    assert all(later < earlier for earlier, later in zip(fractions, fractions[1:]))


def test_the_rule_can_be_read_backwards():
    for a in GRID:
        assert alignment_from_long_fraction(long_fraction(a)) == pytest.approx(a, abs=1e-12)


def test_tempo_changes_the_gaps_but_not_the_split():
    slow, fast = RhythmParams(beat_seconds=2.0, dur=0.1), RhythmParams(beat_seconds=0.5, dur=0.1)
    for a in (0.0, 0.3, 1.0):
        assert long_fraction(a, slow) == long_fraction(a, fast)
        assert beat_timing(a, slow).long_interval == pytest.approx(4 * beat_timing(a, fast).long_interval)


def test_second_pulse_moves_a_quarter_beat_across_the_full_range():
    assert second_pulse_shift(0.0, 1.0) == pytest.approx(0.25 * R.beat_seconds)
    assert second_pulse_shift(0.4, 0.4) == 0.0


@pytest.mark.parametrize("bad", [-0.01, 1.01, float("nan"), float("inf")])
def test_out_of_range_alignment_is_rejected(bad):
    with pytest.raises(ValueError):
        long_fraction(bad)


@pytest.mark.parametrize("bad", [None, "0.5", True])
def test_missing_alignment_has_no_rhythm(bad):
    with pytest.raises(TypeError):
        long_fraction(bad)


@pytest.mark.parametrize(
    "kwargs",
    [
        {"beat_seconds": 0},
        {"long_fraction_at_zero": 1.0},
        {"long_fraction_at_one": 0.4},
        {"long_fraction_at_zero": 0.6, "long_fraction_at_one": 0.7},
        {"dur": 0.3},  # longer than the shortest gap of a 1 s beat (0.25 s)
        {"pitch": 200},
        {"vel": 1.5},
    ],
)
def test_bad_sound_settings_are_rejected(kwargs):
    with pytest.raises(ValueError):
        RhythmParams(**kwargs)


def test_rule_text_is_built_from_the_settings():
    assert rule_text() == "long_fraction = 0.75 - 0.25 * alignment"
    assert rule_text(RhythmParams(long_fraction_at_zero=0.7, long_fraction_at_one=0.5)) == (
        "long_fraction = 0.7 - 0.2 * alignment"
    )


# ------------------------------------------------------------------------ the notes

STEPS = [
    {"t": 0.0, "region": "a", "alignment": 1.0},
    {"t": 1.0, "region": "a", "alignment": 0.0},
    {"t": 2.0, "region": "a", "alignment": None},  # missing
    {"t": 3.0, "region": "a", "alignment": 0.5},
]


def test_notes_fall_where_the_rule_says():
    times = [e["t"] for e in events_for_steps(STEPS)]
    assert times == pytest.approx([0.0, 0.5, 1.0, 1.75, 3.0, 3.625])


def test_missing_step_is_silent():
    assert events_for_step(2.0, "a", None) == []
    events = events_for_steps(STEPS)
    assert not [e for e in events if 2.0 <= e["t"] < 3.0]
    assert len(events) == 2 * 3


def test_average_tempo_is_fixed_whatever_the_data():
    """Any run of n valid beats holds exactly 2n pulses in n beats of time."""
    for values in ([0.0] * 8, [1.0] * 8, [0.1, 0.9, 0.5, 0.33, 0.7, 0.0, 1.0, 0.2]):
        steps = [{"t": float(i), "region": "a", "alignment": a} for i, a in enumerate(values)]
        events = events_for_steps(steps)
        assert len(events) == 16
        assert all(i <= e["t"] < i + 1 for i in range(8) for e in events[2 * i : 2 * i + 2])


def test_pitch_loudness_and_length_carry_no_data():
    events = events_for_steps(STEPS)
    assert {(e["voice"], e["pitch"], e["dur"], e["vel"]) for e in events} == {("earth", 60, 0.1, 0.8)}


def test_notes_never_overlap():
    for a in GRID:
        events = events_for_steps([{"t": float(i), "region": "a", "alignment": a} for i in range(3)])
        gaps = [later["t"] - earlier["t"] for earlier, later in zip(events, events[1:])]
        assert min(gaps) >= R.dur - 1e-9


def test_replay_gives_the_same_notes():
    assert events_for_steps(STEPS) == events_for_steps([dict(s) for s in STEPS])


def test_two_regions_with_the_same_alignment_sound_the_same():
    a = events_for_step(4.0, "region_one", 0.37)
    b = events_for_step(4.0, "region_two", 0.37)
    strip = lambda events: [{k: v for k, v in e.items() if k != "why"} for e in events]
    assert strip(a) == strip(b)
    assert a[0]["why"]["long_fraction"] == b[0]["why"]["long_fraction"]


def test_user_notes_never_change_earth_notes():
    """The engine makes only Earth-voice notes and takes no user input. Mixing a user's
    melody into the same timeline leaves every Earth note exactly as it was."""
    earth = events_for_steps(STEPS)
    user = [{"t": 0.2, "voice": "user", "pitch": 64, "dur": 0.3, "vel": 0.7}]
    timeline = sorted(earth + user, key=lambda e: e["t"])
    assert [e for e in timeline if e["voice"] == "earth"] == earth
    assert all(e["voice"] == "earth" for e in earth)


def test_every_note_explains_itself_and_matches_the_contract():
    schema = json.loads((CONTRACTS / "music-event.schema.json").read_text(encoding="utf-8"))
    for event in events_for_steps(STEPS):
        jsonschema.validate(event, schema)
        why = event["why"]
        assert why["rule"] == rule_text()
        assert why["long_fraction"] == pytest.approx(0.75 - 0.25 * why["alignment"])


# --------------------------------------------------------------------- time smoothing


def test_alpha_1_switches_smoothing_off():
    values = [0.2, 0.9, None, 0.4]
    assert smooth_sequence(values, 1.0) == values


def test_smoothing_follows_the_stated_formula():
    out = smooth_sequence([1.0, 0.0, 0.0], 0.3)
    assert out == pytest.approx([1.0, 0.7, 0.49])


def test_constant_input_is_unchanged():
    assert smooth_sequence([0.42] * 6, 0.3) == pytest.approx([0.42] * 6)


def test_missing_steps_stay_missing_and_restart_the_average():
    out = smooth_sequence([0.8, 0.8, None, None, 0.2, 0.2], 0.3)
    assert out[2] is None and out[3] is None
    assert out[4] == pytest.approx(0.2)  # nothing from before the gap leaks in
    assert out[5] == pytest.approx(0.2)


def test_smoothed_values_stay_in_range_and_calm_the_wobble():
    raw = [0.0, 1.0] * 10
    out = smooth_sequence(raw, 0.3)
    assert all(0.0 <= v <= 1.0 for v in out)
    assert max(out[10:]) - min(out[10:]) < max(raw) - min(raw)


@pytest.mark.parametrize("alpha", [0.0, -0.1, 1.5, float("nan")])
def test_bad_alpha_is_rejected(alpha):
    with pytest.raises(ValueError):
        smooth_sequence([0.5], alpha)


def test_out_of_range_values_are_rejected():
    with pytest.raises(ValueError):
        smooth_sequence([0.5, 1.2], 0.3)
    assert smooth_sequence([], 0.3) == []
    assert not any(math.isnan(v) for v in smooth_sequence([0.1, 0.2], 0.5))
