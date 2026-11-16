"""The two files the web page "How it's made" reads, checked against the code that wrote them.

docs/measurements/math_checks.json   run_experiments.py (TEST INPUTS)
docs/measurements/nasa_regions.json  explore_regions.py --report-out (NASA SVS 3912 frames)

The page shows no number that is not in one of these files or in the app's own constants, so these
tests are what stops the page and the engine from drifting apart.
"""

import json
import math
from pathlib import Path

from sonata_math import experiments
from sonata_math.checks import CHECKS_SCHEMA_VERSION, engine_settings
from sonata_math.image_analysis import AnalysisParams, blur_radius, support_radius

ROOT = Path(__file__).resolve().parents[2]
CHECKS = ROOT / "docs" / "measurements" / "math_checks.json"
NASA = ROOT / "docs" / "measurements" / "nasa_regions.json"
REVIEW = ROOT / "docs" / "science_review.md"


def checks() -> dict:
    return json.loads(CHECKS.read_text(encoding="utf-8"))


def test_the_settings_on_the_page_are_the_engines_defaults():
    data = checks()
    assert data["schema_version"] == CHECKS_SCHEMA_VERSION
    assert data["settings"] == json.loads(json.dumps(engine_settings()))


def test_the_mask_margin_is_the_blur_plus_one_pixel_of_sobel():
    analysis = checks()["settings"]["analysis"]
    assert analysis["blur_radius_px"] == blur_radius(AnalysisParams().blur_sigma) == math.ceil(4 * analysis["blur_sigma"])
    assert analysis["support_radius_px"] == support_radius(AnalysisParams().blur_sigma) == analysis["blur_radius_px"] + 1


def test_every_experiment_is_the_same_table_as_in_the_science_review():
    review = REVIEW.read_text(encoding="utf-8").replace("\r\n", "\n")
    found = checks()["experiments"]
    assert set(found) == {f.__name__ for f in experiments.ALL}
    not_in_review = {"sequence"}  # 24 frames x 2 regions: shown as a figure there, and on the page as a chart
    for experiment in found.values():
        start, end = f"<!-- table:{experiment['id']} -->\n", f"<!-- /table:{experiment['id']} -->"
        if experiment["id"] in not_in_review:
            assert start not in review
            continue
        assert start in review, f"science_review.md has no table {experiment['id']}"
        block = review.split(start, 1)[1].split(end, 1)[0]
        assert block == experiments.to_markdown(experiment), f"table {experiment['id']} differs: run run_experiments.py"


def test_the_chance_level_column_is_the_formula_for_the_dashes_in_each_box():
    crop = checks()["experiments"]["crop"]
    n_col, predicted_col = crop["columns"].index("dashes in box (about)"), crop["columns"].index("0.886/sqrt(n)")
    for row in crop["rows"]:
        assert row[predicted_col] == round(0.8862 / math.sqrt(row[n_col]), 4) or abs(
            row[predicted_col] - 0.8862 / math.sqrt(row[n_col])
        ) < 2e-3  # n is rounded to 0.1 in the table


def test_the_nasa_report_holds_the_approved_pair_and_the_map_stretch_estimate():
    report = json.loads(NASA.read_text(encoding="utf-8"))
    regions = report["regions"]
    for region_id in ("kuroshio_eddies", "equator_pacific", "southern_ocean_streaks"):
        assert regions[region_id]["ok"] == len(report["frames"]) and regions[region_id]["missing"] == 0
        assert 0.0 <= regions[region_id]["unstretched_mean"] <= 1.0
    # Undoing the stretch lowers the score far from the equator and leaves the equator alone.
    assert regions["southern_ocean_streaks"]["unstretched_mean"] < regions["southern_ocean_streaks"]["mean"]
    assert abs(regions["equator_pacific"]["unstretched_mean"] - regions["equator_pacific"]["mean"]) < 1e-3
    assert report["settings"] == {
        k: v for k, v in checks()["settings"]["analysis"].items()
        if k in ("gray_mode", "blur_sigma", "gradient_threshold", "min_usable_fraction", "weight_power")
    }
