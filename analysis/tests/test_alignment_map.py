"""Tests of make_alignment_map.py: the globe's alignment map must give the engine's number."""

import json
from pathlib import Path

import jsonschema
import numpy as np
import pytest

import make_alignment_map as M
from sonata_math import synthetic as S
from sonata_math.image_analysis import AnalysisParams, measure_alignment

PROJECT = Path(__file__).resolve().parents[2]
P = AnalysisParams()
SCHEMA = json.loads((PROJECT / "contracts/alignment-map.schema.json").read_text(encoding="utf-8"))


def coloured(gray: np.ndarray) -> np.ndarray:
    """A BGR picture with no 'land': the ocean picture's land is flat grey, so give every pixel a hue."""
    g = gray.astype(np.float64)
    return np.dstack([np.zeros_like(g), g * 0.5, g]).clip(0, 255).astype(np.uint8)


def disc(shape, centre, radius):
    y, x = np.mgrid[0 : shape[0], 0 : shape[1]]
    return (x - centre[0]) ** 2 + (y - centre[1]) ** 2 <= radius**2


def test_the_map_equals_the_engine_away_from_the_edges():
    picture = coloured(S.line_field((256, 512), n_lines=400, spread_deg=40, seed=3))
    radius = 40
    score, _usable, _water = M.compute_map(picture, P, radius)
    for cx, cy in [(128, 128), (256, 100), (380, 160)]:
        circle = disc(score.shape, (cx, cy), radius)
        engine = measure_alignment(picture, circle, P, region_px=int(circle.sum())).alignment
        assert score[cy, cx] == pytest.approx(engine, abs=1e-6)


def test_the_map_wraps_around_the_date_line():
    """The flat map's left and right edges are one meridian: moving the picture half way round
    must move the map with it, including circles that cross the edge."""
    picture = coloured(S.line_field((256, 512), n_lines=400, spread_deg=60, seed=5))
    score, _, water = M.compute_map(picture, P, 40)
    rolled, _, water_r = M.compute_map(np.roll(picture, 256, axis=1), P, 40)
    rows = slice(60, 196)  # top and bottom are not wrapped
    np.testing.assert_allclose(np.roll(score, 256, axis=1)[rows], rolled[rows], atol=1e-9, equal_nan=True)
    np.testing.assert_allclose(np.roll(water, 256, axis=1)[rows], water_r[rows], atol=1e-9)
    assert np.isfinite(score[128, 5]) and np.isfinite(score[128, 507])  # circles on the edge get a number


def test_land_and_blank_water_are_null_never_zero():
    picture = coloured(S.line_field((256, 512), n_lines=400, spread_deg=40, seed=8))
    picture[:, :160] = 50  # flat grey: land in the ocean picture's rule
    picture[:, 352:] = 0  # black water: nothing to measure
    score, _, water = M.compute_map(picture, P, 40)
    xs, ys, rows = M.sample_grid(score, water, 16, 0.5)
    by_x = {x: [row[i] for row in rows] for i, x in enumerate(xs)}
    assert all(v is None for x in xs if x < 120 for v in by_x[x])  # land
    assert all(v is None for x in xs if x > 400 for v in by_x[x])  # no detail
    assert any(v is not None and v > 0 for v in by_x[264])  # the lines in between
    assert 0.0 not in [v for row in rows for v in row]


def test_the_document_matches_the_contract_and_round_trips():
    picture = coloured(S.line_field((128, 256), n_lines=120, spread_deg=30, seed=1))
    score, _, water = M.compute_map(picture, P, 30)
    xs, ys, rows = M.sample_grid(score, water, 16, 0.5)
    scene = {
        "is_mock": True,
        "source": {"svs_id": None, "url": "about:mock", "title": "TEST INPUT - NOT NASA DATA",
                   "credit": "Synthetic test input", "data_kind": "synthetic_test_input"},
        "frames": {"width": 256, "height": 128, "count": 1, "timestamps": ["2007-03-25T12:00Z"]},
    }
    doc = M.build_document(scene, "scene.json", 0, 0, xs, ys, rows, radius=30, step=16, min_water=0.5,
                           params=P, checks=[])
    jsonschema.validate(doc, SCHEMA)
    assert (doc["grid"]["columns"], doc["grid"]["rows"]) == (16, 8)
    assert doc["summary"]["with_a_number"] == sum(v is not None for row in rows for v in row)
    assert json.loads(M.dumps(doc)) == doc


def test_the_command_refuses_a_picture_other_than_the_ocean(tmp_path, capsys):
    out = tmp_path / "map.json"
    code = M.main(["--scene", str(PROJECT / "data/aerosols/scene.json"), "--out", str(out)])
    assert code == 2 and "ocean picture" in capsys.readouterr().err
    assert not out.exists()


def test_the_committed_map_matches_the_contract_and_the_engine():
    """data/alignment_map.json: valid, and at each approved centre equal to features.json."""
    doc = json.loads((PROJECT / "data/alignment_map.json").read_text(encoding="utf-8"))
    jsonschema.validate(doc, SCHEMA)
    assert doc["source"]["svs_id"] == 3912 and doc["scene"] == "data/scene.json"
    assert len(doc["alignment"]) == doc["grid"]["rows"]
    assert all(len(row) == doc["grid"]["columns"] for row in doc["alignment"])
    assert len(doc["checked_against_features"]) == 2
    for check in doc["checked_against_features"]:
        assert check["map"] == pytest.approx(check["features"], abs=1e-3)
