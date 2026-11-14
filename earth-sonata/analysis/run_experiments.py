"""Run every verification experiment, then draw the figures and write the sound previews.

    python run_experiments.py

Everything used here is a TEST INPUT (synthetic), not NASA data.

Writes
    out/verification.json          every measured number
    out/verification_tables.md     the same as tables
    out/rhythm_*.wav, *.json       two contrasting test rhythms (plain test tones)
    ../docs/figures/math/*.png     the figures used in docs/math_notes.md
    ../docs/science_review.md      its tables are rewritten in place from this run
"""

from __future__ import annotations

import json
import platform
from datetime import date
from pathlib import Path

import cv2
import numpy as np

from sonata_math import experiments, viz
from sonata_math import synthetic as S
from sonata_math.audio import render_pulses
from sonata_math.image_analysis import AnalysisParams, measure_alignment
from sonata_math.rhythm import RhythmParams, events_for_steps

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
FIGURES = HERE.parent / "docs" / "figures" / "math"
REVIEW = HERE.parent / "docs" / "science_review.md"
BEATS = 4


def update_review(results: dict[str, dict]) -> int:
    """Rewrite the tables in docs/science_review.md between their `table:` markers."""
    blocks = {e["id"]: experiments.to_markdown(e) for e in results.values()}
    blocks["environment"] = (
        f"Last run: {date.today().isoformat()} with Python {platform.python_version()}, "
        f"numpy {np.__version__}, OpenCV {cv2.__version__}.\n"
    )
    text = REVIEW.read_text(encoding="utf-8")
    written = 0
    for key, block in blocks.items():
        start, end = f"<!-- table:{key} -->", f"<!-- /table:{key} -->"
        if start in text and end in text:
            head, rest = text.split(start, 1)
            _, tail = rest.split(end, 1)
            text = f"{head}{start}\n{block}{end}{tail}"
            written += 1
    REVIEW.write_text(text, encoding="utf-8", newline="\n")
    return written


def contrasting_rhythms() -> list[tuple[str, list[dict], str]]:
    """Measure two test images and one sequence with a gap; return lanes for the figure."""
    params = AnalysisParams()
    aligned = measure_alignment(S.line_stripes(), None, params).alignment
    mixed = measure_alignment(S.line_field(spread_deg=None, seed=0), None, params).alignment

    def lane(region, values):
        return [{"t": float(i), "region": region, "alignment": v} for i, v in enumerate(values)]

    aligned, mixed = round(aligned, 4), round(mixed, 4)
    return [
        (f"Parallel lines\nalignment {aligned:.2f}", lane("parallel_lines", [aligned] * BEATS), viz.BLUE),
        (f"Random dashes\nalignment {mixed:.2f}", lane("random_dashes", [mixed] * BEATS), viz.ORANGE),
        ("Random dashes,\nbeat 3 blank", lane("random_dashes_gap", [mixed, mixed, None, mixed]), viz.AQUA),
    ]


def main() -> None:
    OUT.mkdir(exist_ok=True)
    results = experiments.run_all()
    with open(OUT / "verification.json", "w", encoding="utf-8", newline="\n") as handle:
        json.dump(results, handle, indent=1)
    with open(OUT / "verification_tables.md", "w", encoding="utf-8", newline="\n") as handle:
        handle.write("\n".join(experiments.to_markdown(e) for e in results.values()))

    disagreements = [row[0] for row in results["spec_cases"]["rows"] if row[-1] != "yes"]
    print(f"named cases: {len(results['spec_cases']['rows'])} run, {len(disagreements)} disagree with expectation")
    for name in disagreements:
        print(f"  DISAGREES: {name}")
    if REVIEW.is_file():
        print(f"science_review.md: {update_review(results)} tables rewritten from this run")

    viz.apply_style()
    lanes = contrasting_rhythms()
    made = [
        viz.fig_pipeline(FIGURES / "01_pipeline.png"),
        viz.fig_gallery(FIGURES / "02_test_gallery.png"),
        viz.fig_spread_law(FIGURES / "03_matches_theory.png", results["spread_law"], results["two_families"]),
        viz.fig_robustness(FIGURES / "04_robustness.png", results["rotation"], results["contrast"], results["crop"], results["noise"]),
        viz.fig_sequence(FIGURES / "05_sequence.png", results["sequence"]),
        viz.fig_mapping(FIGURES / "06_rhythm_rule.png"),
        viz.fig_two_rhythms(FIGURES / "07_two_rhythms.png", lanes, BEATS),
        viz.fig_limits(FIGURES / "08_limits.png", results["dash_length"], results["motion_blur"], results["zoom"], results["jpeg"]),
    ]
    for path in made:
        print(f"figure: {path.relative_to(HERE.parent)}")

    rhythm = RhythmParams()
    for name, (label, steps, _colour) in zip(("parallel_lines", "random_dashes"), lanes):
        # play the four beats twice so the pattern is easy to hear
        events = events_for_steps([{**s, "t": float(i)} for i, s in enumerate(steps * 2)], rhythm)
        with open(OUT / f"rhythm_{name}.json", "w", encoding="utf-8", newline="\n") as handle:
            json.dump({"is_mock": True, "note": "TEST INPUT rhythm, not NASA data", "events": events}, handle, indent=1)
        seconds = render_pulses(events, OUT / f"rhythm_{name}.wav")
        print(f"sound: out/rhythm_{name}.wav ({seconds:.1f} s, {len(events)} pulses)")


if __name__ == "__main__":
    main()
