"""Tests of the sequence pipeline, the JSON output and the features.py command.

All frames are TEST INPUTS written to a temporary folder, not NASA data.
"""

from __future__ import annotations

import json
from dataclasses import replace
from pathlib import Path

import cv2
import jsonschema
import numpy as np
import pytest

import features
import make_practice_scene
from sonata_math import synthetic as S
from sonata_math.export import (
    features_document,
    rhythm_reference_document,
    validate_features_document,
)
from sonata_math.image_analysis import AnalysisParams
from sonata_math.pipeline import FrameProblem, Region, analyse_sequence
from sonata_math.rhythm import RhythmParams

PROJECT = Path(__file__).resolve().parents[2]
CONTRACTS = PROJECT / "contracts"
ANALYSIS = PROJECT / "analysis"
P = AnalysisParams()


def schema(name: str) -> dict:
    return json.loads((CONTRACTS / name).read_text(encoding="utf-8"))


def two_box_frame(seed: int, blank_right: bool = False) -> np.ndarray:
    """Left half: nearly parallel dashes. Right half: dashes in every direction."""
    frame = np.full((128, 256), 20, np.uint8)
    frame[:, :128] = S.line_field((128, 128), n_lines=90, angle_deg=30, spread_deg=5, seed=seed)
    if not blank_right:
        frame[:, 128:] = S.line_field((128, 128), n_lines=90, spread_deg=None, seed=seed + 50)
    return frame


REGIONS = [Region("left", (0, 0, 128, 128)), Region("right", (128, 0, 128, 128))]


def practice_records(alpha: float = 0.3):
    frames = [two_box_frame(0), two_box_frame(1), two_box_frame(2, blank_right=True), two_box_frame(3)]
    return analyse_sequence(frames, REGIONS, P, smoothing_alpha=alpha, step_seconds=1.0)


# ---------------------------------------------------------------------------- pipeline


def test_every_region_gets_every_step_in_order():
    records = practice_records()
    assert [(r.region, r.frame) for r in records] == [
        (region, frame) for region in ("left", "right") for frame in range(4)
    ]
    assert [r.t for r in records if r.region == "left"] == [0.0, 1.0, 2.0, 3.0]


def test_aligned_region_scores_high_and_mixed_region_low():
    records = practice_records()
    left = [r.alignment for r in records if r.region == "left"]
    right = [r.alignment for r in records if r.region == "right" and r.status == "ok"]
    assert min(left) > 0.8
    assert max(right) < 0.3


def test_blank_frame_is_missing_and_keeps_its_place():
    records = practice_records()
    step = [r for r in records if r.region == "right"][2]
    assert (step.status, step.alignment, step.alignment_raw) == ("missing", None, None)
    assert step.reason and step.reason_code == "too_few_edges"
    assert step.frame == 2 and step.t == 2.0


def test_unreadable_frame_is_missing_for_every_region_and_keeps_its_place():
    frames = [two_box_frame(0), FrameProblem("frame_unreadable", "Frame file not found: x.png"), two_box_frame(1)]
    records = analyse_sequence(frames, REGIONS, P)
    assert len(records) == 6
    for region in ("left", "right"):
        mine = [r for r in records if r.region == region]
        assert [r.status for r in mine] == ["ok", "missing", "ok"]
        assert mine[1].reason == "Frame file not found: x.png"


def test_frame_of_the_wrong_size_is_missing():
    frames = [two_box_frame(0), np.zeros((64, 64), np.uint8)]
    records = analyse_sequence(frames, REGIONS, P, expected_size=(128, 256))
    assert [r.status for r in records if r.region == "left"] == ["ok", "missing"]
    assert "64x64" in records[1].reason


def test_smoothing_is_applied_per_region_and_restarts_after_a_gap():
    raw = practice_records(alpha=1.0)
    smooth = practice_records(alpha=0.3)
    left_raw = [r.alignment for r in raw if r.region == "left"]
    left_smooth = [r.alignment for r in smooth if r.region == "left"]
    expected = left_raw[0]
    for i, value in enumerate(left_raw):
        expected = value if i == 0 else 0.3 * value + 0.7 * expected
        assert left_smooth[i] == pytest.approx(expected, abs=2e-4)
    right_raw = [r for r in raw if r.region == "right"]
    right_smooth = [r for r in smooth if r.region == "right"]
    assert right_smooth[3].alignment == right_raw[3].alignment  # first step after the gap
    assert all(s.alignment_raw == r.alignment for s, r in zip(smooth, raw))


def test_a_region_result_does_not_depend_on_the_other_regions():
    """Fair comparison: same settings, and measuring one region cannot affect another."""
    frames = [two_box_frame(i) for i in range(3)]
    both = analyse_sequence(frames, REGIONS, P)
    swapped = analyse_sequence(frames, REGIONS[::-1], P)
    alone = analyse_sequence(frames, REGIONS[:1], P)
    assert [r for r in both if r.region == "left"] == [r for r in swapped if r.region == "left"]
    assert [r for r in both if r.region == "left"] == alone


def test_same_frames_give_the_same_records():
    assert practice_records() == practice_records()


def test_duplicate_region_ids_are_rejected():
    with pytest.raises(ValueError, match="unique"):
        analyse_sequence([two_box_frame(0)], [REGIONS[0], REGIONS[0]], P)


# -------------------------------------------------------------------------------- JSON


def make_features(records=None):
    return features_document(
        records or practice_records(),
        scene="analysis/practice/scene.practice.json",
        is_mock=True,
        step_seconds=1.0,
        params=P,
        smoothing_alpha=0.3,
    )


def test_features_json_matches_the_team_contract():
    jsonschema.validate(make_features(), schema("features.schema.json"))


def test_the_existing_mock_file_passes_our_own_checker():
    mock = json.loads((PROJECT / "fixtures/mock/features.mock.json").read_text(encoding="utf-8"))
    validate_features_document(mock)


def test_missing_steps_are_null_with_a_reason_never_zero():
    document = make_features()
    missing = [s for s in document["steps"] if s["status"] == "missing"]
    assert len(missing) == 1
    assert missing[0]["alignment"] is None and missing[0]["reason"]
    assert all(s["reason"] is None for s in document["steps"] if s["status"] == "ok")


def test_our_checker_refuses_a_zero_for_missing_data():
    document = make_features()
    step = next(s for s in document["steps"] if s["status"] == "missing")
    step["alignment"] = 0.0
    with pytest.raises(ValueError, match="never a number"):
        validate_features_document(document)


def test_settings_are_written_once_for_all_regions():
    document = make_features()
    assert document["normalisation"] == {
        "gradient_threshold": 12.0,
        "min_usable_fraction": 0.05,
        "smoothing_alpha": 0.3,
    }
    assert json.loads(json.dumps(document)) == document  # plain JSON, no NaN


def make_reference(records=None):
    return rhythm_reference_document(
        records or practice_records(),
        scene="analysis/practice/scene.practice.json",
        is_mock=True,
        params=P,
        smoothing_alpha=0.3,
        rhythm=RhythmParams(beat_seconds=1.0),
        source={"svs_id": None, "url": "about:mock", "title": "TEST INPUT", "credit": "team", "data_kind": "synthetic_test_input"},
    )


def test_rhythm_reference_matches_its_schema():
    jsonschema.validate(make_reference(), schema("rhythm-reference.schema.json"))


def test_rhythm_reference_agrees_with_features_and_the_rule():
    records = practice_records()
    reference, feats = make_reference(records), make_features(records)
    assert len(reference["steps"]) == len(feats["steps"])
    for ref, feat in zip(reference["steps"], feats["steps"]):
        assert {k: ref[k] for k in feat} == feat
        if ref["status"] == "ok":
            assert ref["long_fraction"] == pytest.approx(0.75 - 0.25 * ref["alignment"], abs=1e-6)
            assert ref["pulse_times"] == pytest.approx([ref["t"], ref["t"] + ref["long_fraction"]], abs=1e-6)
            assert ref["long_interval"] + ref["short_interval"] == pytest.approx(1.0, abs=1e-6)
        else:
            assert ref["long_fraction"] is None and ref["pulse_times"] == []


def test_rhythm_reference_notes_match_the_music_event_contract():
    reference = make_reference()
    event_schema = schema("music-event.schema.json")
    assert set(reference["events"]) == {"left", "right"}
    for region, events in reference["events"].items():
        ok_steps = [s for s in reference["steps"] if s["region"] == region and s["status"] == "ok"]
        assert len(events) == 2 * len(ok_steps)
        assert [e["t"] for e in events] == [t for s in ok_steps for t in s["pulse_times"]]
        for event in events:
            jsonschema.validate(event, event_schema)
            assert event["why"]["region"] == region


# -------------------------------------------------------------------- features.py command


def write_scene(tmp_path: Path, with_mask: bool = False) -> Path:
    frames_dir = tmp_path / "frames"
    frames_dir.mkdir()
    cv2.imwrite(str(frames_dir / "TEST_INPUT_00000.png"), two_box_frame(0))
    # frame 1 is deliberately absent; frame 2 is not an image
    (frames_dir / "TEST_INPUT_00002.png").write_bytes(b"this is not a picture")
    cv2.imwrite(str(frames_dir / "TEST_INPUT_00003.png"), two_box_frame(3))
    mask_path = None
    if with_mask:
        mask = np.full((128, 256), 255, np.uint8)
        mask[:, 128:] = 0  # excludes the whole right-hand region
        cv2.imwrite(str(tmp_path / "TEST_INPUT_mask.png"), mask)
        mask_path = "TEST_INPUT_mask.png"
    scene = {
        "schema_version": "0.1",
        "is_mock": True,
        "source": {
            "svs_id": None,
            "url": "about:mock",
            "title": "TEST INPUT - NOT NASA DATA",
            "credit": "Synthetic test input",
            "data_kind": "synthetic_test_input",
            "limitations": ["Synthetic test input."],
        },
        "frames": {
            "width": 256,
            "height": 128,
            "count": 4,
            "pattern": "frames/TEST_INPUT_{index:05d}.png",
            "timestamps": ["2007-03-25T12:00Z", "2007-03-25T16:00Z", "2007-03-25T20:00Z", "2007-03-26T00:00Z"],
        },
        "regions": [
            {"id": "left", "name": "Left", "box_px": [0, 0, 128, 128], "mask": None, "description": "aligned"},
            {"id": "right", "name": "Right", "box_px": [128, 0, 128, 128], "mask": mask_path, "description": "mixed"},
        ],
    }
    jsonschema.validate(scene, schema("scene.schema.json"))
    path = tmp_path / "scene.json"
    path.write_text(json.dumps(scene), encoding="utf-8")
    return path


def test_command_writes_valid_files_and_keeps_unusable_frames_in_place(tmp_path, capsys):
    scene_path = write_scene(tmp_path)
    out, rhythm_out = tmp_path / "out" / "features.json", tmp_path / "out" / "rhythm_reference.json"
    code = features.main(
        ["--scene", str(scene_path), "--out", str(out), "--rhythm-out", str(rhythm_out), "--root", str(tmp_path)]
    )
    assert code == 0
    assert "PRACTICE DATA" in capsys.readouterr().out
    document = json.loads(out.read_text(encoding="utf-8"))
    jsonschema.validate(document, schema("features.schema.json"))
    jsonschema.validate(json.loads(rhythm_out.read_text(encoding="utf-8")), schema("rhythm-reference.schema.json"))
    assert document["is_mock"] is True and document["scene"] == "scene.json"
    left = [s for s in document["steps"] if s["region"] == "left"]
    assert [s["status"] for s in left] == ["ok", "missing", "missing", "ok"]
    assert [s["frame"] for s in left] == [0, 1, 2, 3]
    assert "not found" in left[1]["reason"] and "could not be read" in left[2]["reason"]
    assert [s["source_time"] for s in left][0] == "2007-03-25T12:00Z"


def test_command_applies_the_mask_file(tmp_path):
    scene_path = write_scene(tmp_path, with_mask=True)
    document = features.run(scene_path, tmp_path / "features.json", root=tmp_path)
    right = [s for s in document["steps"] if s["region"] == "right"]
    assert right[0]["status"] == "missing" and "mask" in right[0]["reason"].lower()


def test_command_gives_the_same_file_twice(tmp_path):
    scene_path = write_scene(tmp_path)
    a, b = tmp_path / "a.json", tmp_path / "b.json"
    features.run(scene_path, a, root=tmp_path)
    features.run(scene_path, b, root=tmp_path)
    assert a.read_bytes() == b.read_bytes()


def test_command_stops_with_a_clear_message_for_a_bad_box(tmp_path, capsys):
    scene_path = write_scene(tmp_path)
    scene = json.loads(scene_path.read_text(encoding="utf-8"))
    scene["regions"][1]["box_px"] = [200, 0, 128, 128]  # runs off the right edge
    scene_path.write_text(json.dumps(scene), encoding="utf-8")
    code = features.main(["--scene", str(scene_path), "--out", str(tmp_path / "f.json"), "--root", str(tmp_path)])
    assert code == 2
    assert "Region 'right'" in capsys.readouterr().err
    assert not (tmp_path / "f.json").exists()


def test_command_stops_when_a_mask_file_is_absent(tmp_path, capsys):
    """Carrying on without the mask would silently measure the labels it should exclude."""
    scene_path = write_scene(tmp_path)
    scene = json.loads(scene_path.read_text(encoding="utf-8"))
    scene["regions"][0]["mask"] = "no_such_mask.png"
    scene_path.write_text(json.dumps(scene), encoding="utf-8")
    code = features.main(["--scene", str(scene_path), "--out", str(tmp_path / "f.json"), "--root", str(tmp_path)])
    assert code == 2 and "Mask file not found" in capsys.readouterr().err


# ------------------------------------------------------------ the committed practice files


def test_committed_practice_files_are_what_the_engine_produces():
    """analysis/practice/*.json must be real engine output, not hand-written numbers."""
    committed = json.loads((ANALYSIS / "practice/features.practice.json").read_text(encoding="utf-8"))
    jsonschema.validate(committed, schema("features.schema.json"))
    scene = json.loads((ANALYSIS / "practice/scene.practice.json").read_text(encoding="utf-8"))
    jsonschema.validate(scene, schema("scene.schema.json"))
    assert committed["is_mock"] is True and scene["is_mock"] is True

    frames, mask = [], None
    for index in range(make_practice_scene.N_FRAMES):
        frame, mask = make_practice_scene.make_frame(index)
        frames.append(frame)
    regions = [
        Region("aligned_lines", make_practice_scene.BOX_ALIGNED, mask),
        Region("mixed_lines", make_practice_scene.BOX_MIXED),
    ]
    norm = committed["normalisation"]
    params = replace(P, gradient_threshold=norm["gradient_threshold"], min_usable_fraction=norm["min_usable_fraction"])
    records = analyse_sequence(frames, regions, params, norm["smoothing_alpha"], committed["step_seconds"])
    assert len(records) == len(committed["steps"])
    for record, step in zip(records, committed["steps"]):
        assert (record.region, record.frame, record.status) == (step["region"], step["frame"], step["status"])
        if record.status == "ok":
            assert record.alignment == pytest.approx(step["alignment"], abs=2e-4)
        else:
            assert step["alignment"] is None and step["reason"] == record.reason
