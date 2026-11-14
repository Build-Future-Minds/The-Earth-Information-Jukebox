"""Tests for build_listening_tasks.py. Owner: Student B.

Run from the earth-sonata folder:
    python -m unittest discover tools -v
"""

import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import build_listening_tasks as blt  # noqa: E402

MOCK_DIR = os.path.join(HERE, "..", "fixtures", "mock")
FEATURES_MOCK = os.path.join(MOCK_DIR, "features.mock.json")
PRACTICE_MOCK = os.path.join(MOCK_DIR, "listening.practice.mock.json")

# Written down BEFORE running the code: at each frame, which region should sound more even.
PRACTICE_EXPECTED = {0: "region_a", 1: "region_b", 5: "region_b"}
PRACTICE_EXCLUDED = {2: "tie", 3: "too close", 4: "missing"}


def step(frame, region, alignment, status="ok", reason=None):
    return {
        "t": frame * 0.5,
        "frame": frame,
        "source_time": None,
        "region": region,
        "status": status,
        "alignment": alignment,
        "reason": reason,
    }


def more_even_region(question):
    """The region the answer key says is more even."""
    return question[question["answer"]]["region"]


class PracticeExamples(unittest.TestCase):
    def setUp(self):
        self.tasks = blt.build_listening_tasks(blt.load_features(PRACTICE_MOCK))

    def test_answers_match_what_we_wrote_down(self):
        got = {q["frame"]: more_even_region(q) for q in self.tasks["questions"]}
        self.assertEqual(got, PRACTICE_EXPECTED)

    def test_tie_weak_and_missing_are_left_out_with_reasons(self):
        got = {e["frame"]: e["reason"] for e in self.tasks["excluded"]}
        self.assertEqual(set(got), set(PRACTICE_EXCLUDED))
        for frame, word in PRACTICE_EXCLUDED.items():
            self.assertIn(word, got[frame])

    def test_output_is_labelled_mock(self):
        self.assertTrue(self.tasks["is_mock"])
        self.assertIn("MOCK", self.tasks["note"])


class TeamMockFile(unittest.TestCase):
    def test_six_questions_two_missing(self):
        tasks = blt.build_listening_tasks(blt.load_features(FEATURES_MOCK))
        self.assertEqual([q["frame"] for q in tasks["questions"]], [0, 1, 2, 5, 6, 7])
        self.assertEqual([e["frame"] for e in tasks["excluded"]], [3, 4])
        for e in tasks["excluded"]:
            self.assertIn("missing", e["reason"])
        for q in tasks["questions"]:
            self.assertEqual(more_even_region(q), "boundary_current")


class Rules(unittest.TestCase):
    def test_answer_always_points_to_higher_alignment(self):
        for seed in range(20):
            tasks = blt.build_listening_tasks(blt.load_features(PRACTICE_MOCK), seed=seed)
            for q in tasks["questions"]:
                other = "second" if q["answer"] == "first" else "first"
                self.assertGreater(q[q["answer"]]["alignment"], q[other]["alignment"])

    def test_regions_are_compared_at_the_same_frame(self):
        # Region B's values are shuffled in time so a wrong pairing would show up.
        features = {"steps": [
            step(0, "a", 0.9), step(1, "a", 0.1),
            step(1, "b", 0.8), step(0, "b", 0.2),
        ]}
        tasks = blt.build_listening_tasks(features)
        pairs = {q["frame"]: {q["first"]["region"]: q["first"]["alignment"],
                              q["second"]["region"]: q["second"]["alignment"]}
                 for q in tasks["questions"]}
        self.assertEqual(pairs, {0: {"a": 0.9, "b": 0.2}, 1: {"a": 0.1, "b": 0.8}})

    def test_missing_is_never_treated_as_zero(self):
        features = {"steps": [step(0, "a", 0.9), step(0, "b", None, "missing", "blank crop")]}
        tasks = blt.build_listening_tasks(features)
        self.assertEqual(tasks["questions"], [])
        self.assertIn("blank crop", tasks["excluded"][0]["reason"])

    def test_region_with_no_step_is_excluded(self):
        features = {"steps": [step(0, "a", 0.9), step(0, "b", 0.1), step(1, "a", 0.9)]}
        tasks = blt.build_listening_tasks(features)
        self.assertEqual(tasks["excluded"], [{"frame": 1, "reason": "b has no step at this moment"}])

    def test_difference_exactly_at_minimum_is_kept(self):
        features = {"steps": [step(0, "a", 0.6), step(0, "b", 0.4)]}
        tasks = blt.build_listening_tasks(features, min_difference=0.2)
        self.assertEqual(len(tasks["questions"]), 1)


class Repeatable(unittest.TestCase):
    def test_same_seed_gives_identical_quiz(self):
        features = blt.load_features(FEATURES_MOCK)
        self.assertEqual(
            blt.build_listening_tasks(features, seed=7),
            blt.build_listening_tasks(features, seed=7),
        )

    def test_different_seeds_can_change_the_order(self):
        features = blt.load_features(FEATURES_MOCK)
        orders = {
            tuple(q["answer"] for q in blt.build_listening_tasks(features, seed=s)["questions"])
            for s in range(10)
        }
        self.assertGreater(len(orders), 1)

    def test_answer_is_not_always_first(self):
        tasks = blt.build_listening_tasks(blt.load_features(FEATURES_MOCK), seed=42)
        answers = {q["answer"] for q in tasks["questions"]}
        self.assertEqual(answers, {"first", "second"})


class RhythmNumbers(unittest.TestCase):
    def test_gaps_match_team_briefing_table(self):
        self.assertEqual(blt.gaps_for(1.0), {"short_gap_s": 0.5, "long_gap_s": 0.5})
        self.assertEqual(blt.gaps_for(0.5), {"short_gap_s": 0.375, "long_gap_s": 0.625})
        self.assertEqual(blt.gaps_for(0.0), {"short_gap_s": 0.25, "long_gap_s": 0.75})


class BadInput(unittest.TestCase):
    def test_missing_file_says_what_to_do(self):
        with self.assertRaises(blt.ListeningTaskError) as caught:
            blt.load_features("no_such_file.json")
        self.assertIn("no_such_file.json", str(caught.exception))
        self.assertIn("Check the path", str(caught.exception))

    def test_broken_json_says_where(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "broken.json")
            with open(path, "w") as f:
                f.write('{"steps": [')
            with self.assertRaises(blt.ListeningTaskError) as caught:
                blt.load_features(path)
            self.assertIn("not valid JSON", str(caught.exception))

    def test_three_regions_is_an_error(self):
        features = {"steps": [step(0, "a", 0.1), step(0, "b", 0.5), step(0, "c", 0.9)]}
        with self.assertRaises(blt.ListeningTaskError):
            blt.build_listening_tasks(features)


class CommandLine(unittest.TestCase):
    def test_writes_output_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "tasks.json")
            self.assertEqual(blt.main([FEATURES_MOCK, "--seed", "1", "--out", out]), 0)
            with open(out, encoding="utf-8") as f:
                self.assertEqual(len(json.load(f)["questions"]), 6)

    def test_bad_path_returns_error_code(self):
        self.assertEqual(blt.main(["no_such_file.json"]), 1)


if __name__ == "__main__":
    unittest.main()
