"""Verification experiments on TEST INPUTS (synthetic images, not NASA data).

Every number is measured when the function runs. Each experiment returns
    {"id", "title", "expected", "columns", "rows"}
so the same data feeds the tables in docs/science_review.md and the figures.
A missing measurement is None; it is never turned into a number.
"""

from __future__ import annotations

import math
from dataclasses import replace
from typing import Callable, Optional

import numpy as np

from . import synthetic as S
from .image_analysis import (
    AnalysisParams,
    eligible_pixels,
    gradients,
    measure_alignment,
    measure_region,
)
from .pipeline import Region, analyse_sequence
from .rhythm import RhythmParams, beat_timing, long_fraction

P = AnalysisParams()

STANDARD: dict[str, Callable[[], np.ndarray]] = {
    "parallel lines": lambda: S.line_stripes(),
    "dashes, 20 deg spread": lambda: S.line_field(spread_deg=20, seed=1),
    "dashes, random": lambda: S.line_field(spread_deg=None, seed=1),
}


def _a(result) -> Optional[float]:
    return None if result.alignment is None else round(result.alignment, 4)


def _mean_sd(values) -> tuple[Optional[float], Optional[float], int]:
    ok = [v for v in values if v is not None]
    if not ok:
        return None, None, len(values)
    return round(float(np.mean(ok)), 4), round(float(np.std(ok)), 4), len(values) - len(ok)


def _experiment(id_, title, expected, columns, rows) -> dict:
    return {"id": id_, "title": title, "expected": expected, "columns": columns, "rows": rows}


def column(experiment: dict, name: str) -> list:
    index = experiment["columns"].index(name)
    return [row[index] for row in experiment["rows"]]


# ------------------------------------------------------------------ the named test cases


def spec_cases() -> dict:
    """The cases of mapping_spec.md plus the extra ones in the task list."""
    stripes = S.line_stripes()
    diagonal = S.line_stripes(angle_deg=45)
    dashes = S.line_field(spread_deg=0, seed=0)
    random_ = S.line_field(spread_deg=None, seed=0)
    base = measure_alignment(stripes, None, P)
    reversed_ = measure_alignment(np.ascontiguousarray(np.rot90(stripes, 2)), None, P)
    again = measure_alignment(stripes.copy(), None, P)
    partly = np.ones(stripes.shape, bool)
    partly[:, 128:] = False

    cases = [
        ("Aligned: parallel horizontal lines", "near 1; even pulses", measure_alignment(stripes, None, P),
         lambda r: r.ok and r.alignment >= 0.99),
        ("Aligned: parallel diagonal lines (45 deg)", "near 1; even pulses", measure_alignment(diagonal, None, P),
         lambda r: r.ok and r.alignment >= 0.99),
        ("Aligned: parallel short dashes (40 px)", "high, below 1: dash ends are edges too", measure_alignment(dashes, None, P),
         lambda r: r.ok and 0.85 <= r.alignment < 0.99),
        ("Mixed: horizontal and vertical lines, equal areas", "near 0; strong short-long", measure_alignment(S.mixed_horizontal_vertical(), None, P),
         lambda r: r.ok and r.alignment <= 0.05),
        ("Mixed: dashes at random angles", "near 0 (about 0.89/sqrt(n)); strong short-long", measure_alignment(random_, None, P),
         lambda r: r.ok and r.alignment <= 0.2),
        ("Reversed: parallel lines turned 180 deg", f"same as aligned ({base.alignment:.4f})", reversed_,
         lambda r: r.ok and abs(r.alignment - base.alignment) < 1e-9),
        ("Blank image", "missing with a reason; no pulses", measure_alignment(S.blank(value=128), None, P),
         lambda r: r.status == "missing" and r.alignment is None and bool(r.reason)),
        ("Masked: everything excluded", "missing with a reason; no pulses", measure_alignment(stripes, np.zeros(stripes.shape, bool), P),
         lambda r: r.status == "missing" and r.reason_code == "all_masked"),
        ("Masked: right half excluded", "same as aligned; fewer pixels vote", measure_alignment(stripes, partly, P),
         lambda r: r.ok and r.alignment >= 0.99 and r.usable_fraction < base.usable_fraction),
        ("Repeated: same image again", f"identical ({base.alignment:.4f})", again,
         lambda r: r == base),
        ("Noise added to parallel lines (sigma 20)", "slightly below 1", measure_alignment(S.add_noise(stripes, 20, 1), None, P),
         lambda r: r.ok and 0.97 <= r.alignment <= 1.0),
        ("Noise added to random dashes (sigma 20)", "still near 0", measure_alignment(S.add_noise(random_, 20, 1), None, P),
         lambda r: r.ok and r.alignment <= 0.2),
        ("Noise only (sigma 20), no lines", "missing: noise is below the edge threshold", measure_alignment(S.add_noise(S.blank(value=128), 20, 1), None, P),
         lambda r: r.status == "missing"),
    ]
    rows = []
    for name, expected, result, agrees in cases:
        fraction = None if result.alignment is None else round(long_fraction(result.alignment), 4)
        rows.append([
            name, expected, result.status, _a(result), result.reason_code or "-",
            round(result.usable_fraction, 3), fraction, "yes" if agrees(result) else "NO",
        ])
    return _experiment(
        "spec_cases", "Named test cases",
        "See the 'expected' column; the rule is long_fraction = 0.75 - 0.25 * alignment.",
        ["case", "expected", "status", "alignment", "reason_code", "usable_fraction", "long_fraction", "agrees"],
        rows,
    )


# -------------------------------------------------------------- quantitative predictions


def two_families() -> dict:
    rows = []
    for delta in (0, 15, 30, 45, 60, 75, 90):
        image, mask = S.two_families(angle_a=0, angle_b=delta)
        observed = _a(measure_alignment(image, mask, P))
        predicted = round(abs(math.cos(math.radians(delta))), 4)
        rows.append([delta, predicted, observed, round(observed - predicted, 4)])
    return _experiment(
        "two_families", "Two equal families of parallel lines, delta degrees apart",
        "alignment = |cos(delta)|",
        ["delta_deg", "predicted", "observed", "difference"], rows,
    )


def spread_law(n_seeds: int = 8) -> dict:
    spreads = (0, 5, 10, 15, 20, 30, 45, 60)
    means = {}
    rows = []
    for spread in spreads:
        values = [_a(measure_alignment(S.line_field(spread_deg=spread, seed=k), None, P)) for k in range(n_seeds)]
        mean, sd, _ = _mean_sd(values)
        means[spread] = mean
        predicted = math.exp(-2.0 * math.radians(spread) ** 2)
        rows.append([spread, round(predicted, 4), mean, sd, round(mean / means[0], 4)])
    return _experiment(
        "spread_law", f"40 px dashes whose angles are normally spread (mean of {n_seeds} images)",
        "alignment = k * exp(-2 s^2), s in radians; k < 1 is the dash-end factor, so "
        "observed / observed(s=0) should equal exp(-2 s^2)",
        ["spread_deg", "exp(-2s^2)", "observed_mean", "observed_sd", "observed / observed(0)"], rows,
    )


def dash_length(n_seeds: int = 3) -> dict:
    counts = {20: 466, 40: 300, 80: 230, 160: 220, 600: 376}  # same total line length in view
    rows = []
    for length, n_lines in counts.items():
        values = [
            _a(measure_alignment(S.line_field(n_lines=n_lines, spread_deg=0, seed=k, length=length), None, P))
            for k in range(n_seeds)
        ]
        mean, sd, _ = _mean_sd(values)
        rows.append([length, mean, sd])
    return _experiment(
        "dash_length", "Perfectly parallel dashes of different lengths",
        "rises toward 1 as dashes get longer: each dash end is an edge across the line direction",
        ["dash_length_px", "observed_mean", "observed_sd"], rows,
    )


def random_floor(n_seeds: int = 30) -> dict:
    values = [_a(measure_alignment(S.line_field(spread_deg=None, seed=k), None, P)) for k in range(n_seeds)]
    n_visible = 300 * (256 / (256 + 2 * 40)) ** 2  # expected dashes centred inside the image
    rows = [[
        n_seeds, round(float(np.mean(values)), 4), round(float(np.std(values)), 4),
        round(float(np.max(values)), 4), round(0.8862 / math.sqrt(n_visible), 4),
    ]]
    return _experiment(
        "random_floor", "Random dashes: how far from 0 does chance leave the score?",
        "mean about 0.886 / sqrt(n) for n independent dashes (about 174 in view here)",
        ["images", "observed_mean", "observed_sd", "observed_max", "0.886/sqrt(n)"], rows,
    )


def noise_formula() -> dict:
    params = AnalysisParams(gradient_threshold=0.0, min_usable_fraction=0.0, blur_sigma=0.0)
    clean = S.sine_stripes(contrast=60).astype(float)
    gx, gy = gradients(clean, 0.0)
    inner = (slice(1, -1), slice(1, -1))
    energy, n = float((gx[inner] ** 2 + gy[inner] ** 2).sum()), gx[inner].size
    rows = []
    for sigma in (2, 5, 10, 20, 40):
        noisy = clean + sigma * np.random.default_rng(3).standard_normal(clean.shape)
        predicted = energy / (energy + 2 * n * (12 / 64) * sigma**2)
        observed = measure_alignment(noisy, None, params).alignment
        rows.append([sigma, round(predicted, 4), round(observed, 4), round(observed - predicted, 4)])
    return _experiment(
        "noise_formula", "Noise on smooth stripes, threshold and blur switched off",
        "alignment = E / (E + 2 N (12/64) sigma^2)",
        ["noise_sigma", "predicted", "observed", "difference"], rows,
    )


def energy_share() -> dict:
    rows = []
    for share in (0.5, 0.6, 0.75, 0.9):
        image, mask = S.two_families(angle_a=0, angle_b=90, share_a=share)
        row_index = np.arange(image.shape[0])[:, None] * np.ones((1, image.shape[1]), int)
        seam = int(np.argmin(mask[:, 0]))
        top = eligible_pixels(image.shape, mask & (row_index < seam), P.blur_sigma).sum()
        bottom = eligible_pixels(image.shape, mask & (row_index > seam), P.blur_sigma).sum()
        f = float(top / (top + bottom))
        observed = _a(measure_alignment(image, mask, P))
        predicted = round(abs(2 * f - 1), 4)
        rows.append([share, round(f, 4), predicted, observed, round(observed - predicted, 4)])
    return _experiment(
        "energy_share", "Horizontal lines above, vertical lines below, in unequal shares",
        "alignment = |2f - 1|, where f is the horizontal share of the voting area",
        ["share of rows", "f (voting area)", "predicted", "observed", "difference"], rows,
    )


def blur() -> dict:
    image = STANDARD["dashes, 20 deg spread"]()
    rows = []
    for sigma in (0.0, 0.5, 1.0, 1.5, 2.0):
        params = replace(P, blur_sigma=sigma)
        clean = measure_alignment(image, None, params)
        noisy = measure_alignment(S.add_noise(image, 20, 2), None, params)
        only = measure_alignment(S.add_noise(S.blank(value=128), 20, 2), None, params)
        rows.append([sigma, _a(clean), round(clean.usable_fraction, 3), _a(noisy), _a(only)])
    return _experiment(
        "blur", "Blur before differentiating (sigma in pixels; 1.0 is the default)",
        "a light blur barely moves a clean picture and makes noise alone fall below the edge threshold",
        ["blur_sigma", "dashes, 20 deg spread", "usable", "same + noise sigma 20", "noise sigma 20 alone"],
        rows,
    )


# --------------------------------------------------- rotation, contrast, cropping, noise


def rotation() -> dict:
    stripes = S.line_stripes(size=(384, 384))
    field = S.line_field(size=(384, 384), n_lines=700, spread_deg=20, seed=5)
    random_ = S.line_field(size=(384, 384), n_lines=700, spread_deg=None, seed=5)
    disc = S.disc_mask((256, 256), margin=2)
    rows = []
    for angle in (0, 15, 30, 45, 60, 75, 90, 120, 150, 180):
        row = [angle]
        for image in (stripes, field, random_):
            turned = S.centre_crop(S.rotate_about_centre(image, angle), (256, 256))
            row.append(_a(measure_alignment(turned, disc, P)))
        redrawn = [
            _a(measure_alignment(S.line_field(angle_deg=angle, spread_deg=20, seed=k), disc, P)) for k in range(6)
        ]
        row.append(_mean_sd(redrawn)[0])
        rows.append(row)
    return _experiment(
        "rotation", "Rotating the picture (resampled, measured inside a disc)",
        "unchanged: the score depends on eigenvalues, which rotation does not alter. "
        "The last column redraws dashes at each angle instead of resampling (mean of 6).",
        ["rotation_deg", "parallel lines", "dashes, 20 deg spread", "dashes, random", "redrawn 20 deg spread"],
        rows,
    )


def contrast() -> dict:
    rows = []
    for factor in (1.0, 0.75, 0.5, 0.35, 0.25, 0.15, 0.1):
        row = [factor]
        for make in STANDARD.values():
            result = measure_alignment(S.scale_contrast(make(), factor), None, P)
            row += [_a(result), round(result.usable_fraction, 3)]
        rows.append(row)
    columns = ["contrast_factor"]
    for name in STANDARD:
        columns += [name, f"usable ({name})"]
    return _experiment(
        "contrast", "Scaling the contrast (1.0 = lines 200 grey levels above the background)",
        "unchanged while edges are well above the threshold; missing (never 0) once they are not",
        columns, rows,
    )


def crop() -> dict:
    field = S.line_field(size=(512, 512), n_lines=1200, spread_deg=20, seed=7)
    random_ = S.line_field(size=(512, 512), n_lines=1200, spread_deg=None, seed=7)
    rng = np.random.default_rng(0)
    rows = []
    for size in (512, 256, 128, 64, 32):
        a, b = [], []
        for _ in range(12):
            x, y = (int(v) for v in rng.integers(0, 512 - size + 1, 2))
            a.append(_a(measure_region(field, (x, y, size, size), None, P)))
            b.append(_a(measure_region(random_, (x, y, size, size), None, P)))
        rows.append([size, *_mean_sd(a), *_mean_sd(b)])
    return _experiment(
        "crop", "Crop size: 12 boxes at random positions in one large field of dashes",
        "same mean for a uniform field, but more scatter and an upward drift for small boxes "
        "(fewer independent dashes leave a larger chance vote)",
        ["box_px", "20 deg spread mean", "sd", "missing", "random mean", "sd ", "missing "], rows,
    )


def noise() -> dict:
    images = dict(STANDARD)
    images["no lines (flat grey)"] = lambda: S.blank(value=128)
    rows = []
    for sigma in (0, 5, 10, 20, 40, 80):
        row = [sigma]
        for make in images.values():
            image = make() if sigma == 0 else S.add_noise(make(), sigma, 1)
            row.append(_a(measure_alignment(image, None, P)))
        rows.append(row)
    return _experiment(
        "noise", "Adding Gaussian noise (sigma in grey levels, default settings)",
        "aligned lines fall slowly; random stays near 0; noise alone is missing until it is "
        "strong enough to pass the edge threshold, where it reads as a low score",
        ["noise_sigma", *images], rows,
    )


# ------------------------------------------- image handling: compression, camera, legend


def jpeg() -> dict:
    images = {
        "parallel lines, 30 deg": lambda: S.line_stripes(angle_deg=30),
        "dashes, 20 deg spread": STANDARD["dashes, 20 deg spread"],
        "dashes, random": STANDARD["dashes, random"],
        "blank": lambda: S.blank(value=128),
    }
    rows = [["uncompressed", *[_a(measure_alignment(make(), None, P)) for make in images.values()]]]
    for quality in (95, 75, 50, 25, 10, 5):
        rows.append([quality, *[_a(measure_alignment(S.jpeg_roundtrip(make(), quality), None, P)) for make in images.values()]])
    return _experiment(
        "jpeg", "JPEG compression of the test images",
        "small changes at normal quality; block edges may add horizontal/vertical votes at very low quality",
        ["jpeg_quality", *images], rows,
    )


def motion_blur() -> dict:
    image = STANDARD["dashes, random"]()
    rows = []
    for length in (1, 3, 5, 9, 15, 25):
        result = measure_alignment(S.motion_blur(image, length), None, P)
        rows.append([length, _a(result), None if result.dominant_angle_deg is None else round(result.dominant_angle_deg, 1)])
    return _experiment(
        "motion_blur", "Horizontal camera smear on random dashes",
        "rises: smearing removes edges across the motion, so lines along the motion dominate",
        ["smear_px", "alignment", "dominant_angle_deg"], rows,
    )


def zoom() -> dict:
    rows = []
    for factor in (0.5, 0.75, 1.0, 1.5, 2.0, 3.0):
        row = [factor]
        for name in ("dashes, 20 deg spread", "dashes, random"):
            row.append(_a(measure_alignment(S.zoom(STANDARD[name](), factor), None, P)))
        rows.append(row)
    return _experiment(
        "zoom", "Zooming the picture inside a fixed box",
        "not constant: zoom changes line width and how many dashes are in view",
        ["zoom_factor", "dashes, 20 deg spread", "dashes, random"], rows,
    )


def legend() -> dict:
    rows = []
    for name, image in (
        ("dashes, 20 deg spread around 60 deg", S.line_field(angle_deg=60, spread_deg=20, seed=1)),
        ("dashes, random", S.line_field(spread_deg=None, seed=1)),
    ):
        with_legend, mask = S.add_legend(image)
        rows.append([
            name,
            _a(measure_alignment(image, None, P)),
            _a(measure_alignment(with_legend, None, P)),
            _a(measure_alignment(with_legend, mask, P)),
            _a(measure_alignment(image, mask, P)),
        ])
    return _experiment(
        "legend", "A colour bar and label drawn into the picture",
        "the legend's own straight edges change the score; with the legend masked the result "
        "equals the clean picture measured with the same mask",
        ["picture", "clean", "with legend", "legend masked", "clean, same mask"], rows,
    )


def colour() -> dict:
    drawing = S.line_field(spread_deg=20, seed=1, background=0, brightness=255)
    luma = replace(P, gray_mode="luma")
    rows = []
    for name, bgr in (("white", (255, 255, 255)), ("yellow", (0, 255, 255)), ("green", (0, 255, 0)),
                      ("red", (0, 0, 255)), ("blue", (255, 0, 0)), ("dark blue", (128, 0, 0))):
        image = S.colourise(drawing, bgr)
        value_result, luma_result = measure_alignment(image, None, P), measure_alignment(image, None, luma)
        rows.append([name, _a(value_result), round(value_result.usable_fraction, 3),
                     _a(luma_result), round(luma_result.usable_fraction, 3)])
    return _experiment(
        "colour", "The same line drawing painted in different colours",
        "'value' (max of R, G, B) treats pure hues alike; 'luma' makes blue lines too faint to count",
        ["line colour", "value mode", "usable (value)", "luma mode", "usable (luma)"], rows,
    )


def weighting() -> dict:
    power_1 = replace(P, weight_power=1)
    two, two_mask = S.two_families(angle_a=0, angle_b=45)
    cases = {
        "parallel lines, 30 deg": (S.line_stripes(angle_deg=30), None),
        "two families 45 deg apart": (two, two_mask),
        "parallel dashes, 20 px": (S.line_field(n_lines=466, spread_deg=0, seed=0, length=20), None),
        "parallel dashes, 40 px": (S.line_field(spread_deg=0, seed=0), None),
        "dashes, 20 deg spread": (STANDARD["dashes, 20 deg spread"](), None),
        "dashes, random": (STANDARD["dashes, random"](), None),
    }
    rows = []
    for name, (image, mask) in cases.items():
        a2, a1 = _a(measure_alignment(image, mask, P)), _a(measure_alignment(image, mask, power_1))
        rows.append([name, a2, a1, round(a1 - a2, 4)])
    return _experiment(
        "weighting", "Weighting each pixel by m^2 (structure tensor) or by m (spec first draft)",
        "the same ordering of pictures; m-weighting gives a little more say to weak edges such as dash ends",
        ["picture", "weight m^2", "weight m", "difference"], rows,
    )


# ------------------------------------------------------------------------ over time


def sequence(n_frames: int = 24, alpha: float = 0.3) -> dict:
    """Two regions over time: one steady, one whose lines drift apart; two blank frames."""
    blank_frames = (10, 11)
    frames = []
    for i in range(n_frames):
        frame = np.full((192, 384), 20, np.uint8)
        frame[:, :192] = S.line_field((192, 192), n_lines=170, angle_deg=30, spread_deg=8, seed=1000 + i)
        if i not in blank_frames:
            spread = 5 + 55 * i / (n_frames - 1)
            frame[:, 192:] = S.line_field((192, 192), n_lines=170, angle_deg=120, spread_deg=spread, seed=2000 + i)
        frames.append(frame)
    regions = [Region("steady", (0, 0, 192, 192)), Region("drifting", (192, 0, 192, 192))]
    records = analyse_sequence(frames, regions, P, smoothing_alpha=alpha, step_seconds=1.0)
    rows = [
        [r.region, r.frame, r.status, r.alignment_raw, r.alignment,
         None if r.alignment is None else round(long_fraction(r.alignment), 4)]
        for r in records
    ]
    return _experiment(
        "sequence", f"Two regions over {n_frames} frames, smoothing alpha = {alpha}",
        "'steady' stays high; 'drifting' falls as its lines spread from 5 to 60 degrees; "
        "frames 10-11 are blank there and must be missing, with smoothing starting again at frame 12",
        ["region", "frame", "status", "alignment_raw", "alignment", "long_fraction"], rows,
    )


def mapping_table(params: RhythmParams = RhythmParams()) -> dict:
    rows = []
    for a in (0.0, 0.25, 1 / 3, 0.5, 0.75, 1.0):
        t = beat_timing(a, params)
        rows.append([
            round(a, 4), round(t.long_fraction, 4), round(t.long_interval, 4), round(t.short_interval, 4),
            round(t.long_interval + t.short_interval, 4), round(t.long_interval / t.short_interval, 3),
        ])
    return _experiment(
        "mapping", f"The rhythm rule at a {params.beat_seconds:g} s beat",
        "long gap + short gap = one beat for every alignment (fixed tempo)",
        ["alignment", "long_fraction", "long_gap_s", "short_gap_s", "sum_s", "long : short"], rows,
    )


ALL = (
    spec_cases, two_families, energy_share, spread_law, dash_length, random_floor, noise_formula, blur,
    rotation, contrast, crop, noise, jpeg, motion_blur, zoom, legend, colour, weighting, sequence,
    mapping_table,
)


def run_all() -> dict[str, dict]:
    return {experiment.__name__: experiment() for experiment in ALL}


def to_markdown(experiment: dict) -> str:
    def cell(value) -> str:
        if value is None:
            return "missing"
        if isinstance(value, float):
            return f"{value:.4f}".rstrip("0").rstrip(".") if value != int(value) else f"{value:.1f}"
        return str(value)

    lines = [
        f"### {experiment['title']}",
        "",
        f"Expected: {experiment['expected']}",
        "",
        "| " + " | ".join(experiment["columns"]) + " |",
        "| " + " | ".join("---" for _ in experiment["columns"]) + " |",
    ]
    lines += ["| " + " | ".join(cell(v) for v in row) + " |" for row in experiment["rows"]]
    return "\n".join(lines) + "\n"
