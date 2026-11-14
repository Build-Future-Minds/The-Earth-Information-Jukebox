"""TEST INPUT generators. Everything made here is synthetic and is NOT NASA data.

Each generator is deterministic: the same arguments (and seed) give the same image.
Images are 8-bit grey unless stated. Angles are on-screen line directions in degrees:
0 = horizontal, 90 = vertical, 45 = rising to the right, counter-clockwise.
"""

from __future__ import annotations

import math
from typing import Optional, Sequence

import cv2
import numpy as np

SUPERSAMPLE = 4  # shapes are drawn at 4x size and averaged down, so edges are smooth


def _to_uint8(image: np.ndarray) -> np.ndarray:
    return np.clip(np.rint(image), 0, 255).astype(np.uint8)


def _phase(height: int, width: int, angle_deg: float, period: float, ss: int = 1) -> np.ndarray:
    """Phase of a pattern that is constant along lines at `angle_deg` (pixel centres)."""
    a = math.radians(angle_deg)
    y, x = np.mgrid[0 : height * ss, 0 : width * ss].astype(np.float64)
    x = (x + 0.5) / ss - width / 2.0
    y = (y + 0.5) / ss - height / 2.0
    # Lines run along (cos a, -sin a) in image coordinates; the pattern varies across them.
    return 2.0 * math.pi * (x * math.sin(a) + y * math.cos(a)) / period


def blank(size: tuple[int, int] = (256, 256), value: int = 0) -> np.ndarray:
    """A featureless image: one grey level everywhere."""
    return np.full(size, value, dtype=np.uint8)


def sine_stripes(
    size: tuple[int, int] = (256, 256),
    angle_deg: float = 0.0,
    period: float = 16.0,
    contrast: float = 100.0,
    mean: float = 128.0,
) -> np.ndarray:
    """Smooth parallel stripes: brightness = mean + contrast * cos(phase)."""
    height, width = size
    return _to_uint8(mean + contrast * np.cos(_phase(height, width, angle_deg, period)))


def line_stripes(
    size: tuple[int, int] = (256, 256),
    angle_deg: float = 0.0,
    period: float = 16.0,
    line_width: float = 3.0,
    brightness: float = 220.0,
    background: float = 20.0,
) -> np.ndarray:
    """Parallel bright lines on a dark background (hard-edged, anti-aliased)."""
    height, width = size
    phase = _phase(height, width, angle_deg, period, SUPERSAMPLE)
    # Distance to the nearest line centre, in pixels.
    distance = np.abs(((phase / (2.0 * math.pi)) + 0.5) % 1.0 - 0.5) * period
    fine = np.where(distance <= line_width / 2.0, brightness, background)
    coarse = fine.reshape(height, SUPERSAMPLE, width, SUPERSAMPLE).mean(axis=(1, 3))
    return _to_uint8(coarse)


def line_field(
    size: tuple[int, int] = (256, 256),
    n_lines: int = 300,
    angle_deg: float = 0.0,
    spread_deg: Optional[float] = 0.0,
    seed: int = 0,
    length: float = 40.0,
    thickness: float = 1.5,
    brightness: int = 220,
    background: int = 20,
) -> np.ndarray:
    """Short straight segments scattered at random positions.

    spread_deg = None   every direction equally likely ("random orientations")
    spread_deg = s      directions drawn from a normal distribution around angle_deg
                        with standard deviation s degrees (s = 0: all parallel)
    """
    height, width = size
    rng = np.random.default_rng(seed)
    ss = SUPERSAMPLE
    pad = int(math.ceil(length))  # segments may start outside the frame and get cut
    canvas = np.full(((height + 2 * pad) * ss, (width + 2 * pad) * ss), background, dtype=np.uint8)
    centre_x = rng.uniform(0, width + 2 * pad, n_lines)
    centre_y = rng.uniform(0, height + 2 * pad, n_lines)
    if spread_deg is None:
        angles = rng.uniform(0.0, 180.0, n_lines)
    else:
        angles = angle_deg + spread_deg * rng.standard_normal(n_lines)
    shift = 4  # sub-pixel precision for cv2.line
    for cx, cy, angle in zip(centre_x, centre_y, angles):
        a = math.radians(angle)
        dx, dy = 0.5 * length * math.cos(a), -0.5 * length * math.sin(a)
        p1 = (int(round((cx - dx) * ss * 2**shift)), int(round((cy - dy) * ss * 2**shift)))
        p2 = (int(round((cx + dx) * ss * 2**shift)), int(round((cy + dy) * ss * 2**shift)))
        cv2.line(
            canvas,
            p1,
            p2,
            int(brightness),
            max(1, int(round(thickness * ss))),
            lineType=cv2.LINE_AA,
            shift=shift,
        )
    small = cv2.resize(canvas, (width + 2 * pad, height + 2 * pad), interpolation=cv2.INTER_AREA)
    return small[pad : pad + height, pad : pad + width].copy()


def two_families(
    size: tuple[int, int] = (256, 256),
    angle_a: float = 0.0,
    angle_b: float = 90.0,
    share_a: float = 0.5,
    period: float = 16.0,
    smooth: bool = True,
    seam_gap: int = 16,
) -> tuple[np.ndarray, np.ndarray]:
    """Two families of parallel lines, one above the other.

    The top `share_a` of the usable rows shows lines at `angle_a`, the rest shows
    `angle_b`. Where the two patterns meet there is a seam, and a seam is itself a
    line in the picture. The returned mask excludes a strip of `seam_gap` rows around
    it so only the two families are measured.

    Returns (image, boolean mask).
    """
    height, width = size
    make = sine_stripes if smooth else line_stripes
    image_a = make(size, angle_a, period)
    image_b = make(size, angle_b, period)
    usable_rows = height - seam_gap
    rows_a = int(round(share_a * usable_rows))
    out = image_b.copy()
    out[:rows_a, :] = image_a[:rows_a, :]
    mask = np.ones(size, dtype=bool)
    mask[rows_a : rows_a + seam_gap, :] = False
    return out, mask


def mixed_horizontal_vertical(size: tuple[int, int] = (256, 256), period: float = 16.0) -> np.ndarray:
    """Checkerboard of horizontal-line and vertical-line patches, equal areas."""
    height, width = size
    horizontal = line_stripes(size, 0.0, period)
    vertical = line_stripes(size, 90.0, period)
    tiles = 4
    y, x = np.mgrid[0:height, 0:width]
    use_h = ((y * tiles // height) + (x * tiles // width)) % 2 == 0
    return np.where(use_h, horizontal, vertical).astype(np.uint8)


def add_noise(image: np.ndarray, sigma: float, seed: int = 0) -> np.ndarray:
    """Add Gaussian noise with standard deviation `sigma` grey levels, then clip to 8 bits."""
    rng = np.random.default_rng(seed)
    return _to_uint8(image.astype(np.float64) + sigma * rng.standard_normal(image.shape))


def scale_contrast(image: np.ndarray, factor: float) -> np.ndarray:
    """Scale brightness differences about the image's own mean."""
    arr = image.astype(np.float64)
    return _to_uint8(arr.mean() + factor * (arr - arr.mean()))


def rotate_about_centre(image: np.ndarray, angle_deg: float) -> np.ndarray:
    """Rotate counter-clockwise by resampling (bilinear). Corners are filled by reflection."""
    height, width = image.shape[:2]
    matrix = cv2.getRotationMatrix2D(((width - 1) / 2.0, (height - 1) / 2.0), angle_deg, 1.0)
    return cv2.warpAffine(
        image, matrix, (width, height), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101
    )


def disc_mask(size: tuple[int, int], margin: int = 0) -> np.ndarray:
    """Boolean mask that keeps a centred disc. Used so rotation tests see the same pixels."""
    height, width = size
    y, x = np.mgrid[0:height, 0:width]
    radius = min(height, width) / 2.0 - margin
    return (x - (width - 1) / 2.0) ** 2 + (y - (height - 1) / 2.0) ** 2 <= radius**2


def centre_crop(image: np.ndarray, size: tuple[int, int]) -> np.ndarray:
    height, width = image.shape[:2]
    h, w = size
    top, left = (height - h) // 2, (width - w) // 2
    return image[top : top + h, left : left + w]


def colourise(gray: np.ndarray, bgr: Sequence[int]) -> np.ndarray:
    """Paint a grey line drawing in one colour on black. Returns a BGR image."""
    scale = gray.astype(np.float64) / 255.0
    return _to_uint8(scale[..., None] * np.asarray(bgr, dtype=np.float64)[None, None, :])


def jpeg_roundtrip(image: np.ndarray, quality: int) -> np.ndarray:
    """Compress to JPEG at the given quality and decode again."""
    ok, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, int(quality)])
    if not ok:
        raise RuntimeError("JPEG encoding failed")
    flag = cv2.IMREAD_GRAYSCALE if image.ndim == 2 else cv2.IMREAD_COLOR
    return cv2.imdecode(buffer, flag)


def motion_blur(image: np.ndarray, length: int, angle_deg: float = 0.0) -> np.ndarray:
    """Smear the image along one direction, as a moving camera would."""
    if length <= 1:
        return image.copy()
    kernel = np.zeros((length, length), dtype=np.float64)
    c = (length - 1) / 2.0
    a = math.radians(angle_deg)
    for i in np.linspace(-c, c, 4 * length):
        x, y = int(round(c + i * math.cos(a))), int(round(c - i * math.sin(a)))
        kernel[y, x] = 1.0
    kernel /= kernel.sum()
    return _to_uint8(cv2.filter2D(image.astype(np.float64), -1, kernel, borderType=cv2.BORDER_REFLECT_101))


def zoom(image: np.ndarray, factor: float) -> np.ndarray:
    """Zoom about the centre and keep the frame size (factor > 1 magnifies)."""
    height, width = image.shape[:2]
    matrix = cv2.getRotationMatrix2D(((width - 1) / 2.0, (height - 1) / 2.0), 0.0, factor)
    interpolation = cv2.INTER_LINEAR if factor >= 1 else cv2.INTER_AREA
    return cv2.warpAffine(
        image, matrix, (width, height), flags=interpolation, borderMode=cv2.BORDER_REFLECT_101
    )


def add_legend(image: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Draw a fake colour bar with tick marks and a text label into the lower-left corner.

    Returns (image with legend, boolean mask that excludes the legend box).
    """
    out = image.copy()
    height, width = out.shape[:2]
    x0, y0 = int(0.06 * width), int(0.72 * height)
    x1, y1 = int(0.62 * width), int(0.94 * height)
    cv2.rectangle(out, (x0, y0), (x1, y1), 0, thickness=-1)
    bar_top, bar_bottom = y0 + int(0.25 * (y1 - y0)), y0 + int(0.55 * (y1 - y0))
    ramp = np.linspace(40, 255, x1 - x0 - 16).astype(np.uint8)
    out[bar_top:bar_bottom, x0 + 8 : x1 - 8] = ramp[None, :]
    for i in range(6):
        tx = x0 + 8 + int(i * (x1 - x0 - 17) / 5)
        cv2.line(out, (tx, bar_top - 4), (tx, bar_bottom + 4), 255, 1)
    cv2.putText(
        out, "TEST LEGEND 0 10 20 30", (x0 + 8, y1 - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.4, 255, 1, cv2.LINE_AA
    )
    mask = np.ones((height, width), dtype=bool)
    mask[y0 : y1 + 1, x0 : x1 + 1] = False
    return out, mask
