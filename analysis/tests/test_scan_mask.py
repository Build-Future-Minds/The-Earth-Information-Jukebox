"""Tests of scan_mask.py (Developer A): the rain picture's scan mask.

Everything here is TEST INPUT drawn into a temporary folder, not NASA data: a 64x32 "ocean map"
with grey land on its left quarter, and three 128x64 "rain frames" with a bright corner mark that
never moves and a rain streak that does.
"""

from __future__ import annotations

import dataclasses
import json
from pathlib import Path

import cv2
import numpy as np
import pytest

import prepare_scene as P
import scan_mask as S

W, H = 128, 64
CIRCLE = {"id": "TEST_INPUT_circle", "center_px": [80, 32], "radius_px": 12}


@pytest.fixture
def project(tmp_path: Path) -> Path:
    """A made-up repository: the reference ocean map, three rain frames, their dates, one region."""
    ref = np.zeros((32, 64, 3), np.uint8)
    ref[:, :16] = (49, 49, 49)                                     # grey land on the left quarter
    ref_path = tmp_path / P.REFERENCE_LAND_FRAME
    ref_path.parent.mkdir(parents=True)
    cv2.imwrite(str(ref_path), ref)
    frames = tmp_path / "assets/frames/TEST_INPUT_svs4285"
    frames.mkdir(parents=True)
    for i in range(3):
        f = np.zeros((H, W, 3), np.uint8)
        f[60:63, 120:126] = 255                                   # a static bright corner mark
        f[30:34, 60 + i * 5 : 70 + i * 5] = (0, 200, 255)         # rain that moves
        cv2.imwrite(str(frames / f"rain.{i}.png"), f)
    (frames / "dates.txt").write_text("\n".join(f"{i} 2026-11-14T0{i}:00Z" for i in range(3)), encoding="utf-8")
    return tmp_path


def source() -> P.Source:
    return P.Source("svs4285", 4285, "rain.{index}.png", "assets/frames/TEST_INPUT_svs4285", "", "", "",
                    0, 2, 1, {}, (45, 255, 3), dates_file="dates.txt", land_mode="reference")


def test_the_scan_mask_is_the_land_prepare_scene_uses(project: Path) -> None:
    land, checks = S.scan_land(project, source())
    frames = [cv2.imread(str(project / f"assets/frames/TEST_INPUT_svs4285/rain.{i}.png")) for i in range(3)]
    assert np.array_equal(land, P.reference_land_mask(project, frames, (45, 255, 3)))
    assert [c.usable for c in checks] == [True, True, True]


def test_it_is_the_frames_size_and_marks_land_not_rain(project: Path) -> None:
    land, _ = S.scan_land(project, source())
    assert land.shape == (H, W)
    assert land[30, 10]                                           # the ocean map's land, scaled up
    assert land[61, 122]                                          # the corner mark that never moves
    assert not land[32, 75]                                       # moving rain is read
    assert not land[10, 100]                                      # open sea is read


def test_a_source_with_grey_land_needs_no_scan_mask(project: Path) -> None:
    grey = dataclasses.replace(source(), land_mode="grey")
    with pytest.raises(P.SceneError, match="needs no scan mask"):
        S.scan_land(project, grey)


def test_inside_a_circle_it_agrees_with_the_regions_own_mask(project: Path) -> None:
    land, _ = S.scan_land(project, source())
    x, y, w, h = P.circle_box(CIRCLE["center_px"], CIRCLE["radius_px"])
    region = {**CIRCLE, "box_px": [x, y, w, h], "mask": "data/TEST_INPUT_masks/mask.png"}
    own = P.region_mask(land, CIRCLE["center_px"], CIRCLE["radius_px"])
    (project / "data/TEST_INPUT_masks").mkdir(parents=True)
    cv2.imwrite(str(project / region["mask"]), own.astype(np.uint8) * 255)
    assert S.region_differences(land, {"regions": [region]}, project) == {"TEST_INPUT_circle": 0}
    other = land.copy()
    other[32, 80] = True                                          # one pixel of the circle called land
    assert S.region_differences(other, {"regions": [region]}, project) == {"TEST_INPUT_circle": 1}


def test_the_written_mask_is_white_where_never_read(project: Path) -> None:
    land, _ = S.scan_land(project, source())
    x, y, w, h = P.circle_box(CIRCLE["center_px"], CIRCLE["radius_px"])
    (project / "data/TEST_INPUT_masks").mkdir(parents=True)
    cv2.imwrite(str(project / "data/TEST_INPUT_masks/mask.png"),
                P.region_mask(land, CIRCLE["center_px"], CIRCLE["radius_px"]).astype(np.uint8) * 255)
    scene = project / "data/TEST_INPUT_scene.json"
    scene.write_text(json.dumps({"regions": [{**CIRCLE, "box_px": [x, y, w, h], "mask": "data/TEST_INPUT_masks/mask.png"}]}),
                     encoding="utf-8")
    out = project / "data/TEST_INPUT_scan_mask.png"
    assert S.main(["--out", str(out), "--scene", str(scene)], root=project, source=source()) == 0
    written = cv2.imread(str(out), cv2.IMREAD_GRAYSCALE)
    assert written.shape == (H, W)
    assert np.array_equal(written > 127, land)
    assert set(np.unique(written)) <= {0, 255}


def test_a_disagreement_inside_a_circle_writes_nothing(project: Path, capsys) -> None:
    x, y, w, h = P.circle_box(CIRCLE["center_px"], CIRCLE["radius_px"])
    (project / "data/TEST_INPUT_masks").mkdir(parents=True)
    wrong = np.zeros((h, w), np.uint8)                            # a region mask that reads nothing
    cv2.imwrite(str(project / "data/TEST_INPUT_masks/mask.png"), wrong)
    scene = project / "data/TEST_INPUT_scene.json"
    scene.write_text(json.dumps({"regions": [{**CIRCLE, "box_px": [x, y, w, h], "mask": "data/TEST_INPUT_masks/mask.png"}]}),
                     encoding="utf-8")
    out = project / "data/TEST_INPUT_scan_mask.png"
    assert S.main(["--out", str(out), "--scene", str(scene)], root=project, source=source()) == 2
    assert not out.exists()
    assert "disagree" in capsys.readouterr().err
