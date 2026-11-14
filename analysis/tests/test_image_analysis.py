"""Tests of the alignment measurement. All images are TEST INPUTS, not NASA data.

Each test states the behaviour the mathematics predicts, then checks the engine.
Tolerances come from the derivations in docs/math_notes.md; observed values are
recorded in docs/science_review.md.
"""

from __future__ import annotations

import math
from dataclasses import replace

import numpy as np
import pytest

from sonata_math import synthetic as S
from sonata_math.image_analysis import (
    REASON_ALL_MASKED,
    REASON_REGION_TOO_SMALL,
    REASON_TOO_FEW_EDGES,
    AnalysisParams,
    analyse,
    coherence,
    crop_box,
    dominant_line_angle_deg,
    eligible_pixels,
    gradients,
    measure_alignment,
    measure_region,
    support_radius,
    tensor_sums,
    to_gray,
)

P = AnalysisParams()
P_POWER_1 = replace(P, weight_power=1)


def angle_gap(a: float, b: float) -> float:
    """Smallest difference between two line directions (a line at 0 is a line at 180)."""
    d = abs(a - b) % 180.0
    return min(d, 180.0 - d)


def mean_alignment(make, seeds) -> float:
    return float(np.mean([measure_alignment(make(seed), None, P).alignment for seed in seeds]))


# ----------------------------------------------------------------- the formula itself


def test_coherence_is_the_eigenvalue_contrast_of_the_structure_tensor():
    """C must equal (l1 - l2) / (l1 + l2) for the eigenvalues of [[Jxx, Jxy], [Jxy, Jyy]]."""
    rng = np.random.default_rng(0)
    for _ in range(50):
        gx, gy = rng.normal(size=(2, 40, 40)) * rng.uniform(0.1, 30, size=(2, 1, 1))
        jxx, jyy, jxy = tensor_sums(gx, gy, np.ones(gx.shape, bool), 2)
        l2, l1 = np.linalg.eigvalsh(np.array([[jxx, jxy], [jxy, jyy]]))
        assert coherence(jxx, jyy, jxy) == pytest.approx((l1 - l2) / (l1 + l2), abs=1e-10)


@pytest.mark.parametrize("power", [1, 2])
def test_coherence_is_a_doubled_angle_vote(power):
    """C = |sum m^p exp(2i*phi)| / sum m^p: every pixel votes with its doubled angle.

    p = 2 is the structure tensor; p = 1 is the first draft of the mapping spec.
    """
    rng = np.random.default_rng(1)
    gx, gy = rng.normal(size=(2, 60, 60))
    gx = gx * 3.0 + 1.0
    m = np.hypot(gx, gy)
    phi = np.arctan2(gy, gx)
    vote = abs(np.sum(m**power * np.exp(2j * phi))) / np.sum(m**power)
    jxx, jyy, jxy = tensor_sums(gx, gy, np.ones(gx.shape, bool), power)
    assert coherence(jxx, jyy, jxy) == pytest.approx(vote, abs=1e-10)


@pytest.mark.parametrize("blur_sigma", [0.0, 1.0])
def test_sobel_returns_the_slope_in_grey_levels_per_pixel(blur_sigma):
    """A flat ramp I = 3x + 2y has dI/dx = 3 and dI/dy = 2 everywhere."""
    y, x = np.mgrid[0:60, 0:60].astype(float)
    gx, gy = gradients(3.0 * x + 2.0 * y, blur_sigma)
    r = support_radius(blur_sigma)
    inner = (slice(r, -r), slice(r, -r))
    assert np.allclose(gx[inner], 3.0, atol=1e-9)
    assert np.allclose(gy[inner], 2.0, atol=1e-9)


def test_score_stays_between_0_and_1():
    rng = np.random.default_rng(2)
    for _ in range(200):
        jxx, jyy = rng.uniform(0, 100, 2)
        jxy = rng.uniform(-1, 1) * math.sqrt(jxx * jyy)  # a real tensor has Jxy^2 <= Jxx*Jyy
        assert 0.0 <= coherence(jxx, jyy, jxy) <= 1.0


# ----------------------------------------------------- mapping_spec.md: the six cases


@pytest.mark.parametrize("angle", [0, 15, 30, 45, 60, 90, 120, 135, 170])
def test_aligned_parallel_lines_score_near_1_at_any_angle(angle):
    """Expected: all gradients share one axis, so l2 = 0 and C = 1. Sobel reads the
    angle of fine detail with a small bias, so the reported direction may be ~1 degree off."""
    result = measure_alignment(S.line_stripes(angle_deg=angle), None, P)
    assert result.ok
    assert result.alignment >= 0.99
    assert angle_gap(result.dominant_angle_deg, angle) <= 1.5


def test_mixed_horizontal_and_vertical_lines_score_near_0():
    """Expected: equal gradient energy along x and y gives Jxx = Jyy, Jxy = 0, so C = 0,
    even though every single line is perfectly straight."""
    result = measure_alignment(S.mixed_horizontal_vertical(), None, P)
    assert result.ok
    assert result.alignment <= 0.05


def test_random_orientations_score_near_0():
    """Expected: votes cancel. With n independent lines the leftover is about 0.89/sqrt(n),
    so 'near 0' means a few hundredths, not exactly 0."""
    values = [
        measure_alignment(S.line_field(spread_deg=None, seed=seed), None, P).alignment
        for seed in range(10)
    ]
    assert max(values) <= 0.2
    assert np.mean(values) <= 0.12


def test_reversed_image_gives_the_same_score():
    """Expected: turning the picture 180 degrees flips every gradient's sign, and the
    products gx*gx, gy*gy, gx*gy do not change. Mirror images keep the score too."""
    image = S.line_field(spread_deg=20, seed=1)
    base = measure_alignment(image, None, P).alignment
    for other in (np.rot90(image, 2), image[::-1], image[:, ::-1]):
        assert measure_alignment(np.ascontiguousarray(other), None, P).alignment == pytest.approx(
            base, abs=1e-9
        )


@pytest.mark.parametrize("value", [0, 128, 255])
def test_blank_image_is_missing_not_zero(value):
    """Expected: no gradients, so C would be 0/0. That is 'nothing to measure', not 'no alignment'."""
    result = measure_alignment(S.blank(value=value), None, P)
    assert result.status == "missing"
    assert result.alignment is None
    assert result.reason_code == REASON_TOO_FEW_EDGES
    assert "Too few visible lines" in result.reason


def test_fully_masked_image_is_missing_with_a_reason():
    image = S.line_stripes()
    result = measure_alignment(image, np.zeros(image.shape, bool), P)
    assert result.status == "missing"
    assert result.alignment is None
    assert result.reason_code == REASON_ALL_MASKED
    assert result.reason


def test_repeated_measurement_is_identical():
    image = S.add_noise(S.line_field(spread_deg=20, seed=4), 10, seed=4)
    assert measure_alignment(image, None, P) == measure_alignment(image.copy(), None, P)


# ------------------------------------------------- quantitative predictions of the maths


@pytest.mark.parametrize("delta", [15, 30, 45, 60, 75, 90])
def test_two_line_families_score_the_cosine_of_their_angle(delta):
    """Expected: two equal families delta apart are two unit votes 2*delta apart,
    so C = |cos(delta)|."""
    image, mask = S.two_families(angle_a=0, angle_b=delta)
    result = measure_alignment(image, mask, P)
    assert result.alignment == pytest.approx(abs(math.cos(math.radians(delta))), abs=0.02)


@pytest.mark.parametrize("share", [0.6, 0.75, 0.9])
def test_unequal_horizontal_vertical_mix_scores_the_energy_imbalance(share):
    """Expected: with a fraction f of the gradient energy horizontal and 1 - f vertical,
    C = |2f - 1|. Energy is proportional to the area that is allowed to vote."""
    image, mask = S.two_families(angle_a=0, angle_b=90, share_a=share)
    rows = np.arange(image.shape[0])[:, None] * np.ones((1, image.shape[1]), int)
    seam_start = int(np.argmin(mask[:, 0]))
    top = eligible_pixels(image.shape, mask & (rows < seam_start), P.blur_sigma).sum()
    bottom = eligible_pixels(image.shape, mask & (rows > seam_start), P.blur_sigma).sum()
    f = top / (top + bottom)
    result = measure_alignment(image, mask, P)
    assert result.alignment == pytest.approx(abs(2 * f - 1), abs=0.02)


def test_structure_tensors_of_separate_areas_add_up():
    """Expected: J is a sum over pixels, so J(A and B together) = J(A) + J(B)."""
    image, mask = S.two_families(angle_a=20, angle_b=75, share_a=0.6)
    rows = np.arange(image.shape[0])[:, None] * np.ones((1, image.shape[1]), int)
    seam_start = int(np.argmin(mask[:, 0]))
    both = measure_alignment(image, mask, P)
    top = measure_alignment(image, mask & (rows < seam_start), P)
    bottom = measure_alignment(image, mask & (rows > seam_start), P)
    assert both.n_voting == top.n_voting + bottom.n_voting
    for name in ("jxx", "jyy", "jxy"):
        assert getattr(both, name) == pytest.approx(getattr(top, name) + getattr(bottom, name), rel=1e-9)


@pytest.mark.parametrize("spread", [10, 20, 30])
def test_score_falls_with_angular_spread_as_exp_minus_2_s_squared(spread):
    """Expected: if line angles are normally distributed with standard deviation s
    (radians), the doubled-angle mean vote has length exp(-2 s^2). Line ends lower every
    score by a constant factor, so we compare with the s = 0 score of the same dashes."""
    seeds = range(5)
    parallel = mean_alignment(lambda k: S.line_field(spread_deg=0, seed=k), seeds)
    spread_out = mean_alignment(lambda k: S.line_field(spread_deg=spread, seed=k), seeds)
    predicted = math.exp(-2.0 * math.radians(spread) ** 2)
    assert spread_out / parallel == pytest.approx(predicted, abs=0.03)


def test_short_dashes_score_lower_than_long_lines_because_ends_are_edges_too():
    """Expected: at each end of a dash the brightness also changes *along* the line.
    Those edges vote across the main direction. Shorter dashes have relatively more end."""
    def score(length, n_lines):
        return measure_alignment(
            S.line_field(n_lines=n_lines, spread_deg=0, seed=0, length=length), None, P
        ).alignment

    short, medium, long_, endless = score(20, 466), score(40, 300), score(80, 230), score(600, 376)
    assert short < medium < long_ < endless
    assert endless >= 0.98
    assert short <= 0.90


def test_noise_lowers_the_score_as_the_formula_predicts():
    """Expected (no threshold, no blur): noise adds the same gradient energy in every
    direction, sigma_g^2 = (12/64) sigma^2 per pixel and per axis for the /8 Sobel kernel.
    For clean stripes with gradient energy E over N pixels: C = E / (E + 2 N sigma_g^2)."""
    params = AnalysisParams(gradient_threshold=0.0, min_usable_fraction=0.0, blur_sigma=0.0)
    clean = S.sine_stripes(contrast=60).astype(float)
    gx, gy = gradients(clean, 0.0)
    inner = (slice(1, -1), slice(1, -1))
    energy, n = float((gx[inner] ** 2 + gy[inner] ** 2).sum()), gx[inner].size
    for sigma in (2, 5, 10, 20, 40):
        noisy = clean + sigma * np.random.default_rng(3).standard_normal(clean.shape)
        predicted = energy / (energy + 2 * n * (12 / 64) * sigma**2)
        assert measure_alignment(noisy, None, params).alignment == pytest.approx(predicted, abs=0.01)


# --------------------------------------------------------------------------- the mask


def test_excluded_pixels_cannot_change_the_result():
    """Expected: exact equality. A pixel votes only if its whole neighbourhood is included."""
    image = S.line_field(spread_deg=20, seed=2)
    mask = np.ones(image.shape, bool)
    mask[60:140, 80:200] = False
    vandalised = image.copy()
    vandalised[60:140, 80:200] = np.random.default_rng(0).integers(0, 256, (80, 120))
    assert measure_alignment(image, mask, P) == measure_alignment(vandalised, mask, P)


def test_masking_a_legend_restores_the_clean_measurement():
    """A label and colour bar have straight edges of their own. Unmasked they change the
    score; masked, the result equals the clean picture measured with the same mask."""
    clean = S.line_field(angle_deg=60, spread_deg=20, seed=1)
    with_legend, mask = S.add_legend(clean)
    unmasked = measure_alignment(with_legend, None, P).alignment
    assert abs(unmasked - measure_alignment(clean, None, P).alignment) > 0.03
    assert measure_alignment(with_legend, mask, P) == measure_alignment(clean, mask, P)


def test_masking_one_line_family_leaves_the_other():
    image, mask = S.two_families(angle_a=0, angle_b=90, share_a=0.5)
    rows = np.arange(image.shape[0])[:, None] * np.ones((1, image.shape[1]), int)
    top_only = mask & (rows < int(np.argmin(mask[:, 0])))
    assert measure_alignment(image, mask, P).alignment <= 0.05
    result = measure_alignment(image, top_only, P)
    assert result.alignment >= 0.99
    assert angle_gap(result.dominant_angle_deg, 0) <= 1.0


def test_mostly_masked_region_is_missing():
    image = S.line_stripes()
    mask = np.zeros(image.shape, bool)
    mask[:30, :30] = True  # about 1% of the region is left
    result = measure_alignment(image, mask, P)
    assert result.status == "missing"
    assert result.reason_code == REASON_TOO_FEW_EDGES


def test_border_pixels_do_not_vote():
    image = S.line_stripes()
    eligible = analyse(image, None, P).eligible
    r = support_radius(P.blur_sigma)
    assert not eligible[:r].any() and not eligible[-r:].any()
    assert not eligible[:, :r].any() and not eligible[:, -r:].any()
    assert eligible[r:-r, r:-r].all()


def test_region_smaller_than_the_filter_is_missing():
    result = measure_alignment(S.line_stripes()[:6, :6], None, P)
    assert result.status == "missing"
    assert result.reason_code == REASON_REGION_TOO_SMALL


def test_a_small_mask_area_is_too_small_not_all_masked():
    """Some pixels are included, but none survives the blur margin: the honest reason is
    'too small' (Dev B's review). 'all masked' is kept for a mask that includes nothing."""
    image = S.line_stripes()
    mask = np.zeros(image.shape, bool)
    mask[100:106, 100:106] = True  # 6 x 6 included pixels; the margin needs 11 x 11
    result = measure_alignment(image, mask, P)
    assert result.status == "missing" and result.reason_code == REASON_REGION_TOO_SMALL
    assert result.alignment is None and "too small" in result.reason
    nothing = measure_alignment(image, np.zeros(image.shape, bool), P)
    assert nothing.reason_code == REASON_ALL_MASKED


def _circle(size: int) -> np.ndarray:
    yy, xx = np.mgrid[0:size, 0:size]
    c = size // 2
    return (xx - c) ** 2 + (yy - c) ** 2 <= c**2


def test_a_circle_region_is_judged_on_the_circle_not_its_box():
    """Dev B's review: with the box as the denominator a circle was held to a 1.27x stricter
    gate. With region_px = the circle's pixel count the share is of the circle."""
    image = S.line_field((128, 128), n_lines=90, spread_deg=None, seed=3)
    circle = _circle(128)
    as_box = measure_alignment(image, circle, P)
    as_circle = measure_alignment(image, circle, P, region_px=int(circle.sum()))
    assert as_circle.alignment == as_box.alignment  # only the gate changes, never the score
    assert as_circle.usable_fraction == pytest.approx(as_circle.n_voting / int(circle.sum()))
    assert as_box.usable_fraction == pytest.approx(as_box.n_voting / 128**2)

    sparse = np.zeros((128, 128), np.uint8)
    sparse[60:68, 10:118] = S.line_stripes((8, 108), angle_deg=90.0)  # one thin band of short lines
    n = measure_alignment(sparse, circle, P, region_px=int(circle.sum())).n_voting
    params = replace(P, min_usable_fraction=(n / int(circle.sum()) + n / 128**2) / 2)  # gate between the two
    assert measure_alignment(sparse, circle, params, region_px=int(circle.sum())).status == "ok"
    assert measure_alignment(sparse, circle, params).status == "missing"


def test_a_mostly_masked_circle_is_missing():
    """Land the mask removes still counts in the circle: it holds no evidence. So a circle that
    is 95% land is missing, not scored from a sliver of water (why the denominator is not the
    measured area)."""
    image = S.line_stripes((128, 128))
    circle = _circle(128)
    water = circle.copy()
    water[:, 20:] = False  # only a thin strip on the left is open water
    result = measure_alignment(image, water, P, region_px=int(circle.sum()))
    assert result.status == "missing" and result.reason_code == REASON_TOO_FEW_EDGES
    assert result.n_voting > 0  # there were some lines, just too little evidence


def test_region_px_must_fit_the_box():
    with pytest.raises(ValueError, match="region_px"):
        measure_alignment(S.line_stripes((16, 16)), None, P, region_px=16 * 16 + 1)


def test_mask_of_the_wrong_shape_is_an_error():
    with pytest.raises(ValueError, match="does not match"):
        measure_alignment(S.line_stripes(), np.ones((10, 10), bool), P)


# ------------------------------------------- robustness: noise, contrast, colour, crop


def test_noise_alone_is_missing_until_it_is_very_strong():
    """Moderate noise is rejected. Very strong noise looks like lines pointing every way:
    the engine cannot tell those apart, and reports a low score (a known limitation)."""
    flat = S.blank(value=128)
    for sigma in (5, 10, 20):
        assert measure_alignment(S.add_noise(flat, sigma, 1), None, P).status == "missing"
    strong = measure_alignment(S.add_noise(flat, 80, 1), None, P)
    assert strong.ok and strong.alignment < 0.1


def test_aligned_lines_survive_noise():
    scores = [
        measure_alignment(S.add_noise(S.line_stripes(), sigma, 1), None, P).alignment
        for sigma in (0, 10, 20, 40, 80)
    ]
    assert scores[2] >= 0.97  # sigma = 20 grey levels
    assert all(later <= earlier + 1e-3 for earlier, later in zip(scores, scores[1:]))


def test_random_lines_stay_low_under_noise():
    for sigma in (0, 20, 80):
        image = S.add_noise(S.line_field(spread_deg=None, seed=3), sigma, 1)
        assert measure_alignment(image, None, P).alignment <= 0.15


def test_moderate_contrast_change_barely_moves_the_score():
    """Expected: C is a ratio, so scaling all brightness differences cancels. The fixed
    threshold breaks this only when edges get close to the threshold."""
    image = S.line_field(spread_deg=20, seed=1)
    base = measure_alignment(image, None, P).alignment
    assert measure_alignment(S.scale_contrast(image, 0.75), None, P).alignment == pytest.approx(
        base, abs=0.01
    )


def test_very_low_contrast_is_missing_not_zero():
    image = S.scale_contrast(S.line_field(spread_deg=20, seed=1), 0.1)
    result = measure_alignment(image, None, P)
    assert result.status == "missing" and result.alignment is None


def test_brightness_offset_does_not_change_the_score():
    """Expected: adding a constant has zero derivative."""
    image = S.line_field(spread_deg=20, seed=1, brightness=180, background=20)
    brighter = (image.astype(int) + 40).astype(np.uint8)
    assert measure_alignment(brighter, None, P).alignment == pytest.approx(
        measure_alignment(image, None, P).alignment, abs=1e-9
    )


def test_line_colour_does_not_change_the_score_in_value_mode():
    """Blue and yellow lines of the same drawing must be treated alike. With luma
    weights blue is 8x fainter than yellow and falls below the threshold."""
    drawing = S.line_field(spread_deg=20, seed=1, background=0, brightness=255)
    yellow = S.colourise(drawing, (0, 255, 255))
    blue = S.colourise(drawing, (255, 0, 0))
    assert measure_alignment(blue, None, P) == measure_alignment(yellow, None, P)
    luma = replace(P, gray_mode="luma")
    assert measure_alignment(yellow, None, luma).ok
    assert measure_alignment(blue, None, luma).status == "missing"


def test_crops_of_a_uniform_pattern_agree():
    image = S.line_stripes(size=(256, 256), angle_deg=30)
    for box in [(0, 0, 256, 256), (10, 40, 128, 128), (150, 20, 64, 64), (30, 170, 96, 64)]:
        assert measure_region(image, box, None, P).alignment >= 0.99


def test_crop_choice_changes_the_answer_for_a_mixed_picture():
    """The whole checkerboard scores ~0; one tile of it scores ~1. The box is part of the result."""
    image = S.mixed_horizontal_vertical()
    assert measure_region(image, (0, 0, 256, 256), None, P).alignment <= 0.05
    assert measure_region(image, (0, 0, 64, 64), None, P).alignment >= 0.95


def test_small_boxes_inflate_the_score_of_random_lines():
    """Expected: fewer independent lines in the box leave a larger leftover vote
    (about 0.89/sqrt(n)). Regions must therefore be large and equal in size."""
    field = S.line_field(size=(512, 512), n_lines=1200, spread_deg=None, seed=7)
    rng = np.random.default_rng(0)

    def mean_score(size):
        scores = []
        for _ in range(12):
            x, y = rng.integers(0, 512 - size + 1, 2)
            result = measure_region(field, (int(x), int(y), size, size), None, P)
            if result.ok:
                scores.append(result.alignment)
        return float(np.mean(scores))

    assert mean_score(256) < 0.1
    assert mean_score(64) > 2 * mean_score(256)


def test_rotating_the_picture_keeps_the_score():
    """Expected: C depends on eigenvalues, which do not change under rotation. Resampling
    blurs the picture a little, so allow a small drift; the direction must follow."""
    stripes = S.line_stripes(size=(384, 384))
    field = S.line_field(size=(384, 384), n_lines=700, spread_deg=20, seed=5)
    disc = S.disc_mask((256, 256), margin=2)

    def measure(image, angle):
        rotated = S.centre_crop(S.rotate_about_centre(image, angle), (256, 256))
        return measure_alignment(rotated, disc, P)

    field_at_0 = measure(field, 0)
    for angle in (10, 22.5, 45, 67.5, 90, 135, 180):
        assert measure(stripes, angle).alignment >= 0.99
        turned = measure(field, angle)
        assert turned.alignment == pytest.approx(field_at_0.alignment, abs=0.06)
        assert angle_gap(turned.dominant_angle_deg, field_at_0.dominant_angle_deg + angle) <= 3.0


def test_jpeg_compression_barely_moves_these_test_images():
    for image in (S.line_stripes(angle_deg=30), S.line_field(spread_deg=20, seed=1), S.line_field(spread_deg=None, seed=1)):
        base = measure_alignment(image, None, P).alignment
        compressed = measure_alignment(S.jpeg_roundtrip(image, 50), None, P).alignment
        assert compressed == pytest.approx(base, abs=0.01)
    assert measure_alignment(S.jpeg_roundtrip(S.blank(value=128), 10), None, P).status == "missing"


def test_motion_blur_creates_alignment_that_is_not_in_the_scene():
    """A moving camera smears the picture along its path. Random lines then look aligned."""
    image = S.line_field(spread_deg=None, seed=1)
    still = measure_alignment(image, None, P)
    smeared = measure_alignment(S.motion_blur(image, 9), None, P)
    assert smeared.alignment > still.alignment + 0.3
    assert angle_gap(smeared.dominant_angle_deg, 0) <= 5.0


def test_both_weightings_agree_on_the_standard_cases():
    """weight_power 1 (spec first draft) and 2 (structure tensor) tell the same story."""
    assert measure_alignment(S.line_stripes(angle_deg=30), None, P_POWER_1).alignment >= 0.99
    assert measure_alignment(S.mixed_horizontal_vertical(), None, P_POWER_1).alignment <= 0.05
    for seed in range(3):
        image = S.line_field(spread_deg=20, seed=seed)
        a2 = measure_alignment(image, None, P).alignment
        a1 = measure_alignment(image, None, P_POWER_1).alignment
        assert a1 == pytest.approx(a2, abs=0.06)


# ------------------------------------------------------------------ helpers and inputs


@pytest.mark.parametrize(
    "jxx, jyy, jxy, expected",
    [(0, 1, 0, 0.0), (1, 0, 0, 90.0), (1, 1, 1, 45.0), (1, 1, -1, 135.0)],
)
def test_dominant_line_angle_convention(jxx, jyy, jxy, expected):
    """0 = horizontal, 90 = vertical, 45 = rising to the right, as seen on screen."""
    assert angle_gap(dominant_line_angle_deg(jxx, jyy, jxy), expected) < 1e-9


def test_to_gray_accepts_common_image_types():
    bgr = np.zeros((4, 4, 3), np.uint8)
    bgr[..., 0] = 200  # pure blue
    assert np.allclose(to_gray(bgr, "value"), 200)
    assert np.allclose(to_gray(bgr, "luma"), 0.114 * 200)
    bgra = np.dstack([bgr, np.full((4, 4), 255, np.uint8)])
    assert np.allclose(to_gray(bgra, "value"), 200)
    assert np.allclose(to_gray(np.full((4, 4), 65535, np.uint16)), 255)
    with pytest.raises(ValueError):
        to_gray(np.zeros((4, 4, 2), np.uint8))


def test_crop_box_must_fit_inside_the_frame():
    frame = np.zeros((100, 200), np.uint8)
    assert crop_box(frame, (10, 20, 50, 30)).shape == (30, 50)
    for bad in [(180, 0, 50, 50), (0, 90, 50, 50), (-1, 0, 10, 10), (0, 0, 0, 10)]:
        with pytest.raises(ValueError):
            crop_box(frame, bad)


@pytest.mark.parametrize(
    "kwargs",
    [
        {"gradient_threshold": -1},
        {"min_usable_fraction": 1.5},
        {"gray_mode": "hue"},
        {"blur_sigma": -0.5},
        {"weight_power": 3},
        {"epsilon": 0},
    ],
)
def test_bad_settings_are_rejected(kwargs):
    with pytest.raises(ValueError):
        AnalysisParams(**kwargs)
