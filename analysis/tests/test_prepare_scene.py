"""Tests of prepare_scene.py (Student A).

All frames here are TEST INPUTS drawn into a temporary folder, not NASA data:
a 128x64 picture with a grey land strip on the left and orange lines on black ocean.
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import jsonschema
import numpy as np
import pytest

import features
import prepare_scene as P

ROOT = Path(__file__).resolve().parents[2]
INDICES = list(range(100, 129, 4))  # 8 frames, numbered in fours like SVS 3912
W, H, LAND_W = 256, 128, 40
REGIONS = [
    {"id": "near_coast", "name": "TEST INPUT near the coast", "center_px": [60, 40], "radius_px": 24, "role": "test"},
    {"id": "open_water", "name": "TEST INPUT open water", "center_px": [190, 80], "radius_px": 24, "role": "test"},
]


def make_test_input_frame(n: int) -> np.ndarray:
    """TEST INPUT: grey land on the left, orange lines on black ocean. Lines shift a little each frame."""
    rng = np.random.default_rng(n)
    frame = np.zeros((H, W, 3), np.uint8)
    for _ in range(700):
        x, y = int(rng.integers(LAND_W, W)), int(rng.integers(0, H))
        angle = rng.uniform(0, np.pi)
        dx, dy = int(10 * np.cos(angle)), int(10 * np.sin(angle))
        cv2.line(frame, (x, y), (x + dx, y + dy), (0, 140, 255), 1)
    frame[:, :LAND_W] = (49, 49, 49)
    return frame


@pytest.fixture
def project(tmp_path: Path) -> Path:
    """A small project folder laid out like the real one, with TEST INPUT files."""
    frames = tmp_path / "assets/frames/TEST_INPUT_svs3912"
    frames.mkdir(parents=True)
    for n in INDICES:
        cv2.imwrite(str(frames / P.FRAME_NAME.format(index=n)), make_test_input_frame(n))
    (frames / "flat_ecco2_dates.txt").write_text(
        "".join(f"{n}  2007-03-{25 + i:02d}T12:00Z\n" for i, n in enumerate(INDICES)), encoding="utf-8")
    (tmp_path / "assets/regions_draft.json").write_text(json.dumps({"regions": REGIONS}), encoding="utf-8")
    (tmp_path / "assets/source_manifest.json").write_text(json.dumps({"assets": [{
        "svs_id": 3912, "url": "about:test", "title": "TEST INPUT - NOT NASA DATA",
        "credit": "Synthetic test input (analysis/tests/test_prepare_scene.py)",
        "data_kind": "synthetic_test_input", "limitations": ["Synthetic test input."],
    }]}), encoding="utf-8")
    return tmp_path


def run(project: Path, *extra: str) -> int:
    return P.main(["--frames-dir", str(project / "assets/frames/TEST_INPUT_svs3912"),
                   "--regions", str(project / "assets/regions_draft.json"),
                   "--manifest", str(project / "assets/source_manifest.json"),
                   "--out", str(project / "data/scene.json"),
                   "--masks-dir", str(project / "data/masks"),
                   "--first", str(INDICES[0]), "--last", str(INDICES[-1]), "--step", "4", *extra],
                  root=project)


def load_scene(project: Path) -> dict:
    return json.loads((project / "data/scene.json").read_text(encoding="utf-8"))


# ------------------------------------------------------------- 1. a good input

def test_good_input_writes_a_valid_scene(project: Path) -> None:
    assert run(project) == 0
    scene = load_scene(project)
    schema = json.loads((ROOT / "contracts/scene.schema.json").read_text(encoding="utf-8"))
    jsonschema.validate(scene, schema)

    assert scene["frames"]["count"] == len(INDICES)
    assert scene["frames"]["width"] == W and scene["frames"]["height"] == H
    assert scene["schema_version"] == "0.2"
    for region, given in zip(scene["regions"], REGIONS):
        cx, cy = given["center_px"]
        r = given["radius_px"]
        assert region["center_px"] == [cx, cy] and region["radius_px"] == r
        assert region["box_px"] == [cx - r, cy - r, 2 * r, 2 * r]   # schema 0.2: the bounding square
    assert [r["box_px"] for r in scene["regions"]] == [[36, 16, 48, 48], [166, 56, 48, 48]]


def test_every_frame_traces_to_its_file_and_model_time(project: Path) -> None:
    run(project)
    frames = load_scene(project)["frames"]
    for i, n in enumerate(INDICES):
        assert (project / frames["pattern"].format(index=n)).is_file()
        assert frames["timestamps"][i] == f"2007-03-{25 + i:02d}T12:00Z"


def test_mask_is_white_inside_the_circle_and_black_on_land(project: Path) -> None:
    run(project)
    region = load_scene(project)["regions"][0]          # near_coast: box x 36..83, land x < 40 (+3 margin)
    mask = cv2.imread(str(project / region["mask"]), cv2.IMREAD_GRAYSCALE)
    assert mask.shape == (48, 48)                        # box-sized, as features.py accepts
    assert mask[24, 24] == 255                           # open water at the centre
    assert mask[24, 2] == 0                              # land at the left edge of the box (x 38)
    assert mask[24, 6] == 0                              # coast margin (x 42)
    assert mask[0, 0] == 0                               # corner of the box, outside the circle
    open_mask = cv2.imread(str(project / load_scene(project)["regions"][1]["mask"]), cv2.IMREAD_GRAYSCALE)
    assert open_mask[24, 24] == 255 and open_mask[0, 0] == 0
    assert int((open_mask == 255).sum()) == int(sum(
        (x - 24) ** 2 + (y - 24) ** 2 <= 24 ** 2 for y in range(48) for x in range(48)))  # the whole circle


def test_running_twice_gives_identical_files(project: Path) -> None:
    run(project)
    first = (project / "data/scene.json").read_bytes(), (project / "data/masks/mask_near_coast.png").read_bytes()
    run(project)
    assert ((project / "data/scene.json").read_bytes(), (project / "data/masks/mask_near_coast.png").read_bytes()) == first


# ------------------------------------------------------------- 2. bad files: stop with a fix

def _break_dates(p: Path) -> None:
    (p / "assets/frames/TEST_INPUT_svs3912/flat_ecco2_dates.txt").unlink()


def _break_regions_json(p: Path) -> None:
    (p / "assets/regions_draft.json").write_text('{"regions": [', encoding="utf-8")


def _circle_off_frame(p: Path) -> None:
    bad = [dict(REGIONS[0], center_px=[10, 40]), REGIONS[1]]
    (p / "assets/regions_draft.json").write_text(json.dumps({"regions": bad}), encoding="utf-8")


def _circle_on_land(p: Path) -> None:
    bad = [dict(REGIONS[0], center_px=[30, 40]), REGIONS[1]]
    (p / "assets/regions_draft.json").write_text(json.dumps({"regions": bad}), encoding="utf-8")


def _different_radii(p: Path) -> None:
    bad = [REGIONS[0], dict(REGIONS[1], radius_px=20)]
    (p / "assets/regions_draft.json").write_text(json.dumps({"regions": bad}), encoding="utf-8")


def _no_frames(p: Path) -> None:
    for f in (p / "assets/frames/TEST_INPUT_svs3912").glob("*.tif"):
        f.unlink()


@pytest.mark.parametrize("breaker, advice", [
    (_break_dates, "download_frames.sh"),
    (_break_regions_json, "not valid JSON"),
    (_circle_off_frame, "Move the centre"),
    (_circle_on_land, "Move the circle onto open ocean"),
    (_different_radii, "same radius"),
    (_no_frames, "download_frames.sh"),
])
def test_bad_input_stops_with_advice_and_writes_nothing(project: Path, capsys, breaker, advice) -> None:
    breaker(project)
    assert run(project) == 2
    err = capsys.readouterr().err
    assert advice in err
    assert "Traceback" not in err
    assert not (project / "data/scene.json").exists()


# ------------------------------------------------------------- 3. unusable frames keep their place

def test_unusable_frames_keep_their_place_and_are_measured_as_missing(project: Path, capsys) -> None:
    frames = project / "assets/frames/TEST_INPUT_svs3912"
    (frames / P.FRAME_NAME.format(index=108)).write_bytes(b"not an image")               # unreadable
    cv2.imwrite(str(frames / P.FRAME_NAME.format(index=116)), np.zeros((H, W, 3), np.uint8))  # blank
    (frames / P.FRAME_NAME.format(index=124)).unlink()                                      # missing

    assert run(project) == 0
    out = capsys.readouterr().out
    for n in (108, 116, 124):
        assert f"frame {n}" in out and "kept in place but unusable" in out

    scene = load_scene(project)
    assert scene["frames"]["count"] == len(INDICES)                 # nothing dropped
    assert len(scene["frames"]["timestamps"]) == len(INDICES)       # times still line up

    # Dev A's features.py marks those steps missing, with a reason, in the right places.
    doc = features.run(project / "data/scene.json", project / "out/features.json", root=project,
                       first_index=INDICES[0], index_step=4)
    for region in REGIONS:
        steps = [s for s in doc["steps"] if s["region"] == region["id"]]
        assert len(steps) == len(INDICES)
        for i, n in enumerate(INDICES):
            if n in (108, 116, 124):
                assert steps[i]["status"] == "missing" and steps[i]["reason"], (region["id"], n)
                assert steps[i]["alignment"] is None
            else:
                assert steps[i]["status"] == "ok", (region["id"], n, steps[i]["reason"])
