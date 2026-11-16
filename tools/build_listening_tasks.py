"""Build listening questions from a features file.

Owner: Student B.

What this does
--------------
For every moment (frame) where both regions have a usable measurement, it writes one
two-choice question: "Listen to rhythm 1, then rhythm 2. Which one has the more even pulse?"

The correct answer is the region with the higher alignment, because our rhythm rule
(docs/mapping_spec.md) makes more aligned lines sound more even. That rule is a design
choice we made; it describes the rendered image, not water speed or ocean health.

Pairs are left out of the quiz (with a written reason) when:
  * either region is missing at that moment (the Earth voice is silent), or
  * the two alignments are equal or too close to hear reliably.

The order (which region plays first) is shuffled with a seed, so the answer is not always
"first", and the same seed always gives the same quiz.

Run:
    python tools/build_listening_tasks.py fixtures/mock/features.mock.json --seed 42
"""

import argparse
import json
import random
import sys

OUTPUT_SCHEMA_VERSION = "0.1"
DEFAULT_SEED = 42
DEFAULT_MIN_DIFFERENCE = 0.20  # starting value; agree the final number with Dev A
BASE_GAP_SECONDS = 0.5  # "T" in the Team Briefing, page 2
PROMPT = "Listen to rhythm 1, then rhythm 2. Which one has the more even pulse?"


class ListeningTaskError(Exception):
    """A problem with the input that the person running the script can fix."""


def load_features(path):
    """Read a features JSON file, with errors that say what to do."""
    try:
        with open(path, encoding="utf-8") as f:
            features = json.load(f)
    except FileNotFoundError:
        raise ListeningTaskError(
            f"Cannot find the features file '{path}'. Check the path, or try "
            "fixtures/mock/features.mock.json for practice."
        )
    except json.JSONDecodeError as e:
        raise ListeningTaskError(
            f"'{path}' is not valid JSON (line {e.lineno}, column {e.colno}). "
            "Ask whoever made the file to re-export it."
        )
    if not isinstance(features, dict) or not features.get("steps"):
        raise ListeningTaskError(f"'{path}' has no 'steps' list, so there is nothing to compare.")
    return features


def find_regions(steps):
    """Return the two region ids, in the order they first appear."""
    regions = []
    for step in steps:
        if step["region"] not in regions:
            regions.append(step["region"])
    if len(regions) != 2:
        raise ListeningTaskError(
            f"Expected exactly 2 regions to compare but found {len(regions)}: {regions}."
        )
    return regions


def group_by_moment(steps):
    """Group steps by source moment, so we only ever compare regions at the same frame.

    Returns a list of (moment, {region_id: step}) in time order.
    Uses 'frame' when present, otherwise the playback time 't'.
    """
    moments = {}
    for step in steps:
        moment = step.get("frame", step["t"])
        moments.setdefault(moment, {})[step["region"]] = step
    return sorted(moments.items())


def is_usable(step):
    """A step can make a rhythm only if it is 'ok' and has a number."""
    return step is not None and step["status"] == "ok" and step["alignment"] is not None


def gaps_for(alignment):
    """The two gaps between pulses, in seconds, at base speed.

    Team Briefing page 2: d = (1 - Cs) / 2, gaps are T(1 - d) and T(1 + d).
    Alignment 1.0 gives 0.5 s and 0.5 s (even); 0.0 gives 0.25 s and 0.75 s, which the app
    plays long gap first (long-short).
    """
    d = (1 - alignment) / 2
    return {
        "short_gap_s": round(BASE_GAP_SECONDS * (1 - d), 3),
        "long_gap_s": round(BASE_GAP_SECONDS * (1 + d), 3),
    }


def why_excluded(step_a, step_b, region_a, region_b, min_difference):
    """Return a reason this pair cannot be a fair question, or None if it can."""
    for region, step in ((region_a, step_a), (region_b, step_b)):
        if step is None:
            return f"{region} has no step at this moment"
        if not is_usable(step):
            reason = step.get("reason") or "no reason given"
            return f"{region} is missing ({reason}); the Earth voice is silent"

    difference = round(abs(step_a["alignment"] - step_b["alignment"]), 6)
    if difference == 0:
        return "tie: both regions have the same alignment, so there is no right answer"
    if difference < min_difference:
        return (
            f"too close to hear: difference {difference:.2f} is below "
            f"the minimum {min_difference:.2f}"
        )
    return None


def describe(step):
    """What the listener hears for one region, with the numbers that made it."""
    return {"region": step["region"], "alignment": step["alignment"], **gaps_for(step["alignment"])}


def build_question(number, moment, step_a, step_b, rng):
    """One two-choice question. The seeded coin flip decides which region plays first."""
    first, second = (step_a, step_b) if rng.random() < 0.5 else (step_b, step_a)
    answer = "first" if first["alignment"] > second["alignment"] else "second"
    return {
        "id": f"q{number}",
        "frame": moment,
        "t": step_a["t"],
        "source_time": step_a.get("source_time"),
        "prompt": PROMPT,
        "first": describe(first),
        "second": describe(second),
        "answer": answer,
        "difference": round(abs(first["alignment"] - second["alignment"]), 3),
    }


def build_listening_tasks(features, seed=DEFAULT_SEED, min_difference=DEFAULT_MIN_DIFFERENCE):
    """Turn a features dict into questions plus a list of excluded moments."""
    steps = features["steps"]
    region_a, region_b = find_regions(steps)
    rng = random.Random(seed)

    questions, excluded = [], []
    for moment, by_region in group_by_moment(steps):
        step_a, step_b = by_region.get(region_a), by_region.get(region_b)
        reason = why_excluded(step_a, step_b, region_a, region_b, min_difference)
        if reason:
            excluded.append({"frame": moment, "reason": reason})
        else:
            questions.append(build_question(len(questions) + 1, moment, step_a, step_b, rng))

    result = {
        "schema_version": OUTPUT_SCHEMA_VERSION,
        "is_mock": features.get("is_mock", False),
        "features": features.get("scene"),
        "seed": seed,
        "min_difference": min_difference,
        "regions": [region_a, region_b],
        "questions": questions,
        "excluded": excluded,
    }
    if result["is_mock"]:
        result["note"] = "MOCK - built from practice data, not NASA data"
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description="Build two-choice listening questions.")
    parser.add_argument("features", help="path to a features JSON file")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="same seed, same quiz")
    parser.add_argument(
        "--min-difference",
        type=float,
        default=DEFAULT_MIN_DIFFERENCE,
        help="smallest alignment difference that counts as audible",
    )
    parser.add_argument("--out", help="write the questions here (default: print them)")
    args = parser.parse_args(argv)

    try:
        tasks = build_listening_tasks(load_features(args.features), args.seed, args.min_difference)
    except ListeningTaskError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    text = json.dumps(tasks, indent=2)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(text + "\n")
    else:
        print(text)
    print(
        f"{len(tasks['questions'])} questions, {len(tasks['excluded'])} excluded",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
