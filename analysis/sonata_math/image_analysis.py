"""Image analysis: how strongly do the visible lines in a picture share one direction?

Pipeline for one region of one frame (derivations in docs/math_notes.md):

    colour image -> grayscale -> light blur -> Sobel gradients (gx, gy)
                 -> keep pixels that are (a) allowed by the mask and (b) on a clear edge
                 -> add up gradient products  Jxx, Jyy, Jxy
                 -> alignment = sqrt((Jxx - Jyy)^2 + 4 Jxy^2) / (Jxx + Jyy)

The result is `ok` with a number in [0, 1], or `missing` with a reason.
`missing` is never reported as 0: "the lines disagree" and "there is nothing to
measure" are different statements.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional, Sequence

import cv2
import numpy as np

STATUS_OK = "ok"
STATUS_MISSING = "missing"

# Machine-readable reasons for a missing measurement.
REASON_EMPTY_REGION = "empty_region"
REASON_REGION_TOO_SMALL = "region_too_small"
REASON_ALL_MASKED = "all_masked"
REASON_TOO_FEW_EDGES = "too_few_edges"
REASON_FRAME_UNREADABLE = "frame_unreadable"
REASON_FRAME_SIZE_MISMATCH = "frame_size_mismatch"

GRAY_MODES = ("value", "luma")

# The 3x3 Sobel kernel's weights add up to 8 on each side, so this makes a slope of 1 grey level per
# pixel read as exactly 1 (docs/math_notes.md section 3). The web page "How it's made" shows it.
SOBEL_SCALE = 1.0 / 8.0

# Rec.601 luma weights for red, green and blue: the "usual" grayscale we do not use (gray_mode
# "luma"). It makes a pure blue line (0.114) about 8 times fainter than a yellow one (0.299 + 0.587).
LUMA_RGB = (0.299, 0.587, 0.114)


@dataclass(frozen=True)
class AnalysisParams:
    """Every setting that can change a measurement. One object is used for all regions.

    gradient_threshold   Smallest gradient that counts as a clear edge, in grey levels
                         (0-255 scale) per pixel. Weaker pixels do not vote.
    min_usable_fraction  Smallest share of the region's pixels that must vote (have a clear
                         edge). The region is the circle for a circle region (pass
                         `region_px`), else the whole box. Masked-out pixels count in the
                         region but cannot vote, so a mostly masked region is `missing`.
                         It measures the amount of evidence. Below it: `missing`.
    gray_mode            "value" = max(R, G, B): a line's brightness regardless of its
                         hue. "luma" = Rec.601 weighted sum, which makes blue lines
                         about 8x fainter than yellow ones.
    blur_sigma           Gaussian blur (pixels) applied before differentiating. 0 = off.
    weight_power         2 = structure tensor (each pixel weighs m^2).
                         1 = each pixel weighs m (the first draft of the mapping spec).
    epsilon              Guards the division; only matters when nothing votes, and that
                         case is already reported as `missing`.
    """

    gradient_threshold: float = 12.0
    min_usable_fraction: float = 0.05
    gray_mode: str = "value"
    blur_sigma: float = 1.0
    weight_power: int = 2
    epsilon: float = 1e-12

    def __post_init__(self) -> None:
        if not (math.isfinite(self.gradient_threshold) and self.gradient_threshold >= 0):
            raise ValueError("gradient_threshold must be a finite number >= 0")
        if not (0.0 <= self.min_usable_fraction <= 1.0):
            raise ValueError("min_usable_fraction must be between 0 and 1")
        if self.gray_mode not in GRAY_MODES:
            raise ValueError(f"gray_mode must be one of {GRAY_MODES}")
        if not (math.isfinite(self.blur_sigma) and self.blur_sigma >= 0):
            raise ValueError("blur_sigma must be a finite number >= 0")
        if self.weight_power not in (1, 2):
            raise ValueError("weight_power must be 1 or 2")
        if not (self.epsilon > 0):
            raise ValueError("epsilon must be > 0")


@dataclass(frozen=True)
class AlignmentResult:
    """One measurement. `alignment` is None exactly when `status` is "missing"."""

    status: str
    alignment: Optional[float]
    reason: Optional[str]
    reason_code: Optional[str]
    usable_fraction: float  # voting pixels / pixels in the region (the circle, else the box)
    eligible_fraction: float  # pixels the mask (and safety margin) allow / pixels in the region
    dominant_angle_deg: Optional[float]  # on-screen line direction, 0 = horizontal, counter-clockwise, [0, 180)
    jxx: float
    jyy: float
    jxy: float
    n_region: int
    n_eligible: int
    n_voting: int

    @property
    def ok(self) -> bool:
        return self.status == STATUS_OK

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class AnalysisDetails:
    """The intermediate images behind a result, for figures and debugging."""

    result: AlignmentResult
    gray: np.ndarray
    gx: np.ndarray
    gy: np.ndarray
    magnitude: np.ndarray
    eligible: np.ndarray
    voting: np.ndarray


# --------------------------------------------------------------------------- loading


def load_image(path: str | Path) -> np.ndarray:
    """Read an image file as 8-bit BGR. Raises FileNotFoundError or ValueError."""
    path = Path(path)
    if not path.is_file():
        raise FileNotFoundError(f"Image file not found: {path}")
    data = np.fromfile(str(path), dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR) if data.size else None
    if image is None:
        raise ValueError(f"File is not a readable image: {path}")
    return image


def load_mask(path: str | Path) -> np.ndarray:
    """Read a mask image. White (>= 128) = included. Returns a boolean array."""
    path = Path(path)
    if not path.is_file():
        raise FileNotFoundError(f"Mask file not found: {path}")
    data = np.fromfile(str(path), dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_GRAYSCALE) if data.size else None
    if image is None:
        raise ValueError(f"File is not a readable mask image: {path}")
    return image >= 128


def crop_box(array: np.ndarray, box_px: Sequence[int]) -> np.ndarray:
    """Cut [x, y, width, height] out of a frame. The box must lie inside the frame."""
    x, y, w, h = (int(v) for v in box_px)
    height, width = array.shape[:2]
    if w <= 0 or h <= 0:
        raise ValueError(f"Region box {list(box_px)} has no area")
    if x < 0 or y < 0 or x + w > width or y + h > height:
        raise ValueError(
            f"Region box {list(box_px)} does not fit inside a {width}x{height} frame"
        )
    return array[y : y + h, x : x + w]


# ------------------------------------------------------------------------- operators


def to_gray(image: np.ndarray, mode: str = "value") -> np.ndarray:
    """Collapse an image to one brightness number per pixel, on a 0-255 float scale.

    Accepts a 2-D array (already grey) or an OpenCV BGR / BGRA array. uint16 input is
    rescaled to 0-255; float input is assumed to be on the 0-255 scale already.
    """
    if mode not in GRAY_MODES:
        raise ValueError(f"gray_mode must be one of {GRAY_MODES}")
    arr = np.asarray(image)
    scale = 1.0 / 257.0 if arr.dtype == np.uint16 else 1.0
    if arr.ndim == 2:
        gray = arr.astype(np.float64)
    elif arr.ndim == 3 and arr.shape[2] in (3, 4):
        bgr = arr[..., :3].astype(np.float64)
        if mode == "value":
            gray = bgr.max(axis=2)
        else:  # Rec.601 luma; OpenCV's channels are B, G, R
            r, g, b = LUMA_RGB
            gray = b * bgr[..., 0] + g * bgr[..., 1] + r * bgr[..., 2]
    else:
        raise ValueError(f"Expected a grey or BGR image, got shape {arr.shape}")
    return gray * scale


def blur_radius(blur_sigma: float) -> int:
    """Half-width of the Gaussian kernel, in pixels (4 sigma, rounded up)."""
    return int(math.ceil(4.0 * blur_sigma)) if blur_sigma > 0 else 0


def support_radius(blur_sigma: float) -> int:
    """How far one gradient value reaches: blur half-width plus 1 pixel of Sobel."""
    return blur_radius(blur_sigma) + 1


def gradients(gray: np.ndarray, blur_sigma: float = 1.0) -> tuple[np.ndarray, np.ndarray]:
    """Estimate dI/dx and dI/dy in grey levels per pixel.

    The 3x3 Sobel kernel is divided by 8 so a ramp that rises 1 level per pixel gives
    exactly 1. x grows to the right, y grows downward (image convention).
    """
    g = np.asarray(gray, dtype=np.float64)
    if blur_sigma > 0:
        k = 2 * blur_radius(blur_sigma) + 1
        g = cv2.GaussianBlur(
            g, (k, k), sigmaX=blur_sigma, sigmaY=blur_sigma, borderType=cv2.BORDER_REFLECT_101
        )
    gx = cv2.Sobel(g, cv2.CV_64F, 1, 0, ksize=3, scale=SOBEL_SCALE, borderType=cv2.BORDER_REFLECT_101)
    gy = cv2.Sobel(g, cv2.CV_64F, 0, 1, ksize=3, scale=SOBEL_SCALE, borderType=cv2.BORDER_REFLECT_101)
    return gx, gy


def eligible_pixels(
    shape: tuple[int, int], mask: Optional[np.ndarray], blur_sigma: float
) -> np.ndarray:
    """Pixels that are allowed to vote.

    A gradient at one pixel is computed from its neighbours (blur + Sobel). A pixel may
    vote only if *every* pixel in that neighbourhood is inside the region and included
    by the mask. So nothing outside the crop and nothing the mask excludes (a label, a
    coastline, the colour bar) can leak into the measurement.
    """
    height, width = shape
    if mask is None:
        included = np.ones((height, width), dtype=np.uint8)
    else:
        included = np.asarray(mask)
        if included.shape != (height, width):
            raise ValueError(
                f"Mask shape {included.shape} does not match region shape {(height, width)}"
            )
        included = (included > 0).astype(np.uint8)
    r = support_radius(blur_sigma)
    padded = np.pad(included, r, mode="constant", constant_values=0)
    kernel = np.ones((2 * r + 1, 2 * r + 1), dtype=np.uint8)
    eroded = cv2.erode(padded, kernel)
    return eroded[r : r + height, r : r + width].astype(bool)


def tensor_sums(
    gx: np.ndarray, gy: np.ndarray, voting: np.ndarray, weight_power: int = 2
) -> tuple[float, float, float]:
    """Add up the gradient products over the voting pixels.

    weight_power = 2:  Jxx = sum gx^2,  Jyy = sum gy^2,  Jxy = sum gx*gy
    weight_power = 1:  the same products divided by the gradient length m, so each
                       pixel weighs m instead of m^2.
    """
    gxv = gx[voting]
    gyv = gy[voting]
    if weight_power == 2:
        w = 1.0
    else:
        m = np.hypot(gxv, gyv)
        w = np.divide(1.0, m, out=np.zeros_like(m), where=m > 0)
    jxx = float(np.sum(w * gxv * gxv))
    jyy = float(np.sum(w * gyv * gyv))
    jxy = float(np.sum(w * gxv * gyv))
    return jxx, jyy, jxy


def coherence(jxx: float, jyy: float, jxy: float, epsilon: float = 1e-12) -> float:
    """Orientation coherence C = sqrt((Jxx - Jyy)^2 + 4 Jxy^2) / (Jxx + Jyy + eps).

    Equal to (l1 - l2) / (l1 + l2) for the eigenvalues l1 >= l2 of [[Jxx, Jxy], [Jxy, Jyy]].
    1 = every gradient points along one axis. 0 = no preferred axis.
    """
    value = math.hypot(jxx - jyy, 2.0 * jxy) / (jxx + jyy + epsilon)
    return min(1.0, max(0.0, value))


def dominant_line_angle_deg(jxx: float, jyy: float, jxy: float) -> float:
    """Direction the lines run on screen, in degrees within [0, 180).

    0 = horizontal, 90 = vertical, 45 = rising to the right ("/"). Counter-clockwise
    as seen on screen. Only meaningful when the coherence is clearly above 0.
    """
    # Axis of the strongest gradient, in image coordinates (y down).
    gradient_axis = 0.5 * math.atan2(2.0 * jxy, jxx - jyy)
    # Flip to screen convention (y up), then turn 90 degrees: lines run across the gradient.
    line = math.degrees(-gradient_axis) + 90.0
    line %= 180.0
    return 0.0 if abs(line - 180.0) < 1e-9 else line


# ----------------------------------------------------------------------- measurement


def _missing(code: str, reason: str, *, n_region=0, n_eligible=0, n_voting=0) -> AlignmentResult:
    return AlignmentResult(
        status=STATUS_MISSING,
        alignment=None,
        reason=reason,
        reason_code=code,
        usable_fraction=(n_voting / n_region) if n_region else 0.0,
        eligible_fraction=(n_eligible / n_region) if n_region else 0.0,
        dominant_angle_deg=None,
        jxx=0.0,
        jyy=0.0,
        jxy=0.0,
        n_region=n_region,
        n_eligible=n_eligible,
        n_voting=n_voting,
    )


def missing_result(code: str, reason: str) -> AlignmentResult:
    """A `missing` result for a frame that could not be measured at all."""
    return _missing(code, reason)


def analyse(
    image: np.ndarray,
    mask: Optional[np.ndarray] = None,
    params: AnalysisParams = AnalysisParams(),
    region_px: Optional[int] = None,
) -> AnalysisDetails:
    """Measure one region and keep the intermediate images.

    region_px  How many pixels the region has. The usable-fraction gate divides by it.
               Default: every pixel of the image (a box region). For a circle region pass
               the circle's pixel count, so the gate is judged on the circle, not on its
               bounding square. Masked-out parts of the circle (land) still count in it:
               they hold no evidence, and a mostly masked circle should go `missing`.
    """
    gray = to_gray(image, params.gray_mode)
    height, width = gray.shape
    n_box = height * width
    if region_px is not None and not (0 < int(region_px) <= n_box):
        raise ValueError(f"region_px must be between 1 and the box's {n_box} pixels (got {region_px})")
    n_region = n_box if region_px is None else int(region_px)
    gx, gy = (
        gradients(gray, params.blur_sigma)
        if n_box
        else (np.zeros_like(gray), np.zeros_like(gray))
    )
    magnitude = np.hypot(gx, gy)

    def details(result: AlignmentResult, eligible, voting) -> AnalysisDetails:
        return AnalysisDetails(result, gray, gx, gy, magnitude, eligible, voting)

    nothing = np.zeros((height, width), dtype=bool)
    if n_box == 0:
        return details(
            _missing(REASON_EMPTY_REGION, "The region has no pixels to measure."), nothing, nothing
        )

    eligible = eligible_pixels((height, width), mask, params.blur_sigma)
    n_eligible = int(eligible.sum())
    if n_eligible == 0:
        if mask is not None and not bool(np.any(np.asarray(mask) > 0)):
            code, reason = (
                REASON_ALL_MASKED,
                "The mask leaves no pixels to measure in this region.",
            )
        else:
            # Some pixels are included, but none is far enough from the region's edge or the
            # mask's edge for the blur and Sobel to see only included pixels.
            margin = support_radius(params.blur_sigma)
            code, reason = (
                REASON_REGION_TOO_SMALL,
                "The area left to measure is too small: no included pixel is at least "
                f"{margin} px inside the region and the mask.",
            )
        return details(_missing(code, reason, n_region=n_region), eligible, nothing)

    voting = eligible & (magnitude >= params.gradient_threshold) & (magnitude > 0)
    n_voting = int(voting.sum())
    usable_fraction = n_voting / n_region
    if n_voting == 0 or usable_fraction < params.min_usable_fraction:
        reason = (
            f"Too few visible lines: {100 * usable_fraction:.1f}% of the region has clear "
            f"edges; at least {100 * params.min_usable_fraction:.1f}% is needed."
        )
        return details(
            _missing(
                REASON_TOO_FEW_EDGES,
                reason,
                n_region=n_region,
                n_eligible=n_eligible,
                n_voting=n_voting,
            ),
            eligible,
            voting,
        )

    jxx, jyy, jxy = tensor_sums(gx, gy, voting, params.weight_power)
    result = AlignmentResult(
        status=STATUS_OK,
        alignment=coherence(jxx, jyy, jxy, params.epsilon),
        reason=None,
        reason_code=None,
        usable_fraction=usable_fraction,
        eligible_fraction=n_eligible / n_region,
        dominant_angle_deg=dominant_line_angle_deg(jxx, jyy, jxy),
        jxx=jxx,
        jyy=jyy,
        jxy=jxy,
        n_region=n_region,
        n_eligible=n_eligible,
        n_voting=n_voting,
    )
    return details(result, eligible, voting)


def measure_alignment(
    image: np.ndarray,
    mask: Optional[np.ndarray] = None,
    params: AnalysisParams = AnalysisParams(),
    region_px: Optional[int] = None,
) -> AlignmentResult:
    """Measure one region. `image` is a grey or BGR array; `mask` is True where included.
    `region_px`: the region's pixel count when it is not the whole image (see `analyse`)."""
    return analyse(image, mask, params, region_px).result


def region_mask(
    mask: Optional[np.ndarray], frame_shape: tuple[int, int], box_px: Sequence[int]
) -> Optional[np.ndarray]:
    """Fit a mask to a region. The mask may be frame-sized or already box-sized."""
    if mask is None:
        return None
    x, y, w, h = (int(v) for v in box_px)
    mask = np.asarray(mask)
    if mask.shape[:2] == tuple(frame_shape[:2]):
        return crop_box(mask, box_px)
    if mask.shape[:2] == (h, w):
        return mask
    raise ValueError(
        f"Mask shape {mask.shape[:2]} matches neither the frame {tuple(frame_shape[:2])} "
        f"nor the region box {(h, w)} (height, width)"
    )


def measure_region(
    frame: np.ndarray,
    box_px: Sequence[int],
    mask: Optional[np.ndarray] = None,
    params: AnalysisParams = AnalysisParams(),
    region_px: Optional[int] = None,
) -> AlignmentResult:
    """Measure the box [x, y, width, height] of a frame, with an optional mask.
    `region_px`: the region's pixel count when it is a circle inside the box (see `analyse`)."""
    crop = crop_box(frame, box_px)
    return measure_alignment(crop, region_mask(mask, frame.shape[:2], box_px), params, region_px)
