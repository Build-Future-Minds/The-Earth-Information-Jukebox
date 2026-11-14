"""Figures that explain the measurement and the rhythm rule.

All pictures shown are TEST INPUTS (synthetic), not NASA data. Every plotted number
comes from sonata_math.experiments, i.e. it was measured, not typed in.
"""

from __future__ import annotations

import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.cm import ScalarMappable  # noqa: E402
from matplotlib.colors import LinearSegmentedColormap, Normalize, hsv_to_rgb  # noqa: E402

from . import synthetic as S  # noqa: E402
from .experiments import column  # noqa: E402
from .image_analysis import AnalysisParams, analyse, measure_alignment  # noqa: E402
from .rhythm import RhythmParams, beat_timing, events_for_steps, long_fraction  # noqa: E402

SURFACE = "#fcfcfb"
INK = "#0b0b0b"
INK_2 = "#52514e"
MUTED = "#898781"
GRID = "#e1e0d9"
AXIS = "#c3c2b7"
BLUE, ORANGE, AQUA = "#2a78d6", "#eb6834", "#1baf7a"
DIVERGING = LinearSegmentedColormap.from_list("blue_grey_red", [BLUE, "#f0efec", "#e34948"])
P = AnalysisParams()
TEST_NOTE = "TEST INPUT (synthetic), not NASA data"


def apply_style() -> None:
    plt.rcParams.update({
        "font.family": "sans-serif",
        "font.sans-serif": ["Segoe UI", "Helvetica Neue", "Arial", "DejaVu Sans"],
        "font.size": 10,
        "figure.facecolor": SURFACE,
        "savefig.facecolor": SURFACE,
        "axes.facecolor": SURFACE,
        "axes.edgecolor": AXIS,
        "axes.labelcolor": INK_2,
        "axes.titlecolor": INK,
        "axes.titlesize": 11,
        "axes.titlelocation": "left",
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.grid": True,
        "axes.axisbelow": True,
        "grid.color": GRID,
        "grid.linewidth": 0.8,
        "text.color": INK,
        "xtick.color": MUTED,
        "ytick.color": MUTED,
        "xtick.labelcolor": INK_2,
        "ytick.labelcolor": INK_2,
        "lines.linewidth": 2.0,
        "lines.markersize": 7,
        "legend.frameon": False,
        "figure.dpi": 110,
        "savefig.dpi": 140,
    })


def _save(fig, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path)
    plt.close(fig)
    return path


def _picture(ax, image, **kwargs) -> None:
    ax.imshow(image, **kwargs)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.grid(False)
    for spine in ax.spines.values():
        spine.set_visible(False)


def _line_angle_map(details) -> np.ndarray:
    """Colour every voting pixel by the direction of the line it sits on."""
    angle = (-np.degrees(np.arctan2(details.gy, details.gx)) + 90.0) % 180.0
    hsv = np.dstack([angle / 180.0, np.full(angle.shape, 0.85), np.full(angle.shape, 0.92)])
    rgb = hsv_to_rgb(hsv)
    rgb[~details.voting] = 0.10
    rgb[~details.eligible] = 0.32
    return rgb


def _result_text(result) -> str:
    if result.alignment is None:
        return "missing: silent"
    fraction = long_fraction(result.alignment)
    return f"alignment {result.alignment:.2f}  ->  beat split {100 * fraction:.0f} / {100 * (1 - fraction):.0f}"


# ------------------------------------------------------------------------- figure 1


def fig_pipeline(path: Path) -> Path:
    """From picture to score: image, the two gradients, edge directions, the vote."""
    cases = [
        ("Parallel lines at 30 degrees", S.line_stripes(angle_deg=30)),
        ("Horizontal and vertical lines", S.mixed_horizontal_vertical()),
        ("Dashes at random angles", S.line_field(spread_deg=None, seed=1)),
    ]
    fig, axes = plt.subplots(3, 5, figsize=(15, 9.6), layout="constrained")
    headers = [
        "Test image",
        "Left-right change  dI/dx",
        "Up-down change  dI/dy",
        "Direction of each edge",
        "Share of the vote by direction",
    ]
    bins = np.linspace(0, 180, 19)
    for row, (name, image) in enumerate(cases):
        details = analyse(image, None, P)
        result = details.result
        limit = float(np.abs(np.stack([details.gx, details.gy])).max()) or 1.0
        _picture(axes[row, 0], image, cmap="gray", vmin=0, vmax=255)
        axes[row, 0].set_ylabel(name, fontsize=10, color=INK)
        _picture(axes[row, 1], details.gx, cmap=DIVERGING, vmin=-limit, vmax=limit)
        _picture(axes[row, 2], details.gy, cmap=DIVERGING, vmin=-limit, vmax=limit)
        _picture(axes[row, 3], _line_angle_map(details))

        ax = axes[row, 4]
        angle = (-np.degrees(np.arctan2(details.gy, details.gx)) + 90.0) % 180.0
        weights = (details.magnitude**2)[details.voting]
        share, _ = np.histogram(angle[details.voting], bins=bins, weights=weights)
        share = share / share.sum()
        ax.bar(bins[:-1] + 5, share, width=8.0, color=BLUE)
        ax.set_xlim(0, 180)
        ax.set_xticks([0, 45, 90, 135, 180])
        ax.set_ylim(0, 1.0)
        ax.set_yticks([0, 0.5, 1.0])
        ax.grid(axis="x", visible=False)
        ax.set_title(f"alignment = {result.alignment:.2f}", fontsize=12)
        if row == 2:
            ax.set_xlabel("line direction (degrees)")
        ax.set_ylabel("share of vote")
        if row == 0:
            for col, header in enumerate(headers[:4]):
                axes[0, col].set_title(header)
            ax.set_title(f"{headers[4]}\nalignment = {result.alignment:.2f}", fontsize=11)

    fig.colorbar(
        ScalarMappable(Normalize(-1, 1), DIVERGING), ax=axes[:, 1:3], location="bottom",
        shrink=0.7, aspect=45, pad=0.02, ticks=[-1, 0, 1],
    ).set_label("brightness change per pixel\nblue = falling, grey = none, red = rising (scaled per row)")
    bar = fig.colorbar(
        ScalarMappable(Normalize(0, 180), "hsv"), ax=axes[:, 3], location="bottom",
        shrink=0.9, aspect=22, pad=0.02, ticks=[0, 45, 90, 135, 180],
    )
    bar.set_label("line direction in degrees\n0 = horizontal, 90 = vertical; dark = no clear edge")
    fig.suptitle(
        f"From picture to alignment score   |   {TEST_NOTE}", x=0.01, ha="left", fontsize=13, color=INK
    )
    return _save(fig, path)


# ------------------------------------------------------------------------- figure 2


def fig_gallery(path: Path) -> Path:
    stripes = S.line_stripes()
    random_ = S.line_field(spread_deg=None, seed=0)
    nothing = np.zeros(stripes.shape, bool)
    cases = [
        ("Parallel horizontal lines", stripes, None),
        ("Parallel diagonal lines", S.line_stripes(angle_deg=45), None),
        ("Horizontal + vertical lines", S.mixed_horizontal_vertical(), None),
        ("Dashes at random angles", random_, None),
        ("Blank image", S.blank(value=128), None),
        ("Masked: everything excluded", stripes, nothing),
        ("Parallel lines + noise (sigma 40)", S.add_noise(stripes, 40, 1), None),
        ("Random dashes + noise (sigma 40)", S.add_noise(random_, 40, 1), None),
    ]
    fig, axes = plt.subplots(2, 4, figsize=(13.5, 8.0), layout="constrained")
    fig.get_layout_engine().set(w_pad=0.12, h_pad=0.14)
    for ax, (name, image, mask) in zip(axes.ravel(), cases):
        result = measure_alignment(image, mask, P)
        shown = image if mask is None else (0.25 * image + 0.75 * 200).astype(np.uint8)
        _picture(ax, shown, cmap="gray", vmin=0, vmax=255)
        ax.set_title(f"{name}\n{_result_text(result)}", fontsize=10)
        if mask is not None:
            ax.text(0.5, 0.5, "mask excludes\nevery pixel", transform=ax.transAxes, ha="center",
                    va="center", color=INK, fontsize=11)
    fig.suptitle(
        f"Test images and what the engine reports   |   {TEST_NOTE}", x=0.01, ha="left", fontsize=13
    )
    return _save(fig, path)


# ------------------------------------------------------------------------- figure 3


def fig_spread_law(path: Path, spread_law: dict, two_families: dict) -> Path:
    fig, (left, right) = plt.subplots(1, 2, figsize=(12.5, 4.6), layout="constrained")

    delta = np.array(column(two_families, "delta_deg"), float)
    fine = np.linspace(0, 90, 200)
    left.plot(fine, np.abs(np.cos(np.radians(fine))), color=MUTED, label="predicted: |cos(angle between)|")
    left.plot(delta, column(two_families, "observed"), "o", color=BLUE, label="measured", markeredgecolor=SURFACE, markeredgewidth=2)
    left.set_xlabel("angle between two families of parallel lines (degrees)")
    left.set_ylabel("alignment")
    left.set_title("Two line families")
    left.set_xticks([0, 15, 30, 45, 60, 75, 90])
    left.set_ylim(-0.03, 1.05)
    left.legend(loc="lower left")

    spread = np.array(column(spread_law, "spread_deg"), float)
    mean = np.array(column(spread_law, "observed_mean"), float)
    sd = np.array(column(spread_law, "observed_sd"), float)
    fine = np.linspace(0, 60, 200)
    law = np.exp(-2.0 * np.radians(fine) ** 2)
    right.plot(fine, law, color=MUTED, label=r"predicted for endless lines: $e^{-2s^2}$")
    right.plot(fine, mean[0] * law, color=BLUE, linewidth=1.2, label=f"same curve x {mean[0]:.2f} (dash-end factor)")
    right.errorbar(spread, mean, yerr=sd, fmt="o", color=BLUE, ecolor=BLUE, elinewidth=1.2, capsize=3,
                   markeredgecolor=SURFACE, markeredgewidth=2, label="measured, 40 px dashes (mean, sd of 8)")
    right.set_xlabel("spread of dash directions s (degrees, standard deviation)")
    right.set_ylabel("alignment")
    right.set_title("Dashes with a known spread of directions")
    right.set_ylim(-0.03, 1.05)
    right.legend(loc="upper right")
    fig.suptitle(f"Does the score follow the mathematics?   |   {TEST_NOTE}", x=0.01, ha="left", fontsize=13)
    return _save(fig, path)


# ------------------------------------------------------------------------- figure 4

SERIES = (("parallel lines", BLUE, "o"), ("dashes, 20 deg spread", ORANGE, "s"), ("dashes, random", AQUA, "^"))
MISSING_Y = -0.09


def _series_panel(ax, labels, values_by_series, title, xlabel, errors=None) -> None:
    """Plot series over evenly spaced categories. Missing values sit in a strip below 0.

    A series given as None is not part of that experiment and is not drawn at all.
    """
    x = np.arange(len(labels))
    for index, ((name, colour, marker), values) in enumerate(zip(SERIES, values_by_series)):
        if values is None:
            continue
        y = np.array([np.nan if v is None else v for v in values], float)
        ax.plot(x, y, color=colour, marker=marker, label=name, markeredgecolor=SURFACE, markeredgewidth=1.5)
        if errors is not None:
            sd = np.array([np.nan if v is None else v for v in errors[name]], float)
            ax.errorbar(x, y, yerr=sd, fmt="none", ecolor=colour, elinewidth=1.2, capsize=3)
        gone = np.isnan(y)
        ax.plot(x[gone] + 0.16 * (index - 1), np.full(gone.sum(), MISSING_Y), linestyle="none", marker="x", color=colour, markersize=7, markeredgewidth=2)
    ax.axhspan(-0.16, -0.03, color=GRID, alpha=0.6, linewidth=0)
    ax.set_xticks(x, [str(v) for v in labels])
    ax.set_yticks([MISSING_Y, 0, 0.25, 0.5, 0.75, 1.0], ["missing", "0", "0.25", "0.5", "0.75", "1"])
    ax.set_ylim(-0.16, 1.06)
    ax.set_title(title)
    ax.set_xlabel(xlabel)
    ax.grid(axis="x", visible=False)


def fig_robustness(path: Path, rotation: dict, contrast: dict, crop: dict, noise: dict) -> Path:
    fig, axes = plt.subplots(2, 2, figsize=(12.5, 8.2), layout="constrained", sharey=True)
    names = [s[0] for s in SERIES]

    _series_panel(axes[0, 0], column(rotation, "rotation_deg"), [column(rotation, n) for n in names],
                  "Rotating the picture", "rotation (degrees)")
    _series_panel(axes[0, 1], column(contrast, "contrast_factor"), [column(contrast, n) for n in names],
                  "Lowering the contrast", "contrast factor (1 = original)")
    crop_values = [None, column(crop, "20 deg spread mean"), column(crop, "random mean")]
    crop_errors = {names[1]: column(crop, "sd"), names[2]: column(crop, "sd ")}
    _series_panel(axes[1, 0], column(crop, "box_px"), crop_values,
                  "Shrinking the box (mean and sd of 12 positions)", "box side (pixels)", errors=crop_errors)
    _series_panel(axes[1, 1], column(noise, "noise_sigma"), [column(noise, n) for n in names],
                  "Adding noise", "noise sigma (grey levels)")
    for ax in axes[:, 0]:
        ax.set_ylabel("alignment")
    handles, labels = axes[0, 0].get_legend_handles_labels()
    fig.legend(handles, labels, loc="outside lower center", ncols=3)
    fig.suptitle(
        f"What moves the score besides the lines themselves?   |   {TEST_NOTE}", x=0.01, ha="left", fontsize=13
    )
    return _save(fig, path)


# ------------------------------------------------------------------------- figure 5


def fig_sequence(path: Path, sequence: dict) -> Path:
    fig, (top, bottom) = plt.subplots(2, 1, figsize=(11.5, 6.8), layout="constrained", sharex=True)
    rows = sequence["rows"]
    for region, colour in (("steady", BLUE), ("drifting", ORANGE)):
        mine = [r for r in rows if r[0] == region]
        frame = np.array([r[1] for r in mine], float)
        raw = np.array([np.nan if r[3] is None else r[3] for r in mine], float)
        smooth = np.array([np.nan if r[4] is None else r[4] for r in mine], float)
        fraction = np.array([np.nan if r[5] is None else r[5] for r in mine], float)
        top.plot(frame, raw, linestyle="none", marker="o", markersize=4, color=colour, alpha=0.45)
        top.plot(frame, smooth, color=colour, label=f"'{region}' region (line: smoothed, dots: each frame)")
        bottom.plot(np.append(frame, frame[-1] + 1), np.append(fraction, fraction[-1]), color=colour,
                    drawstyle="steps-post", label=f"'{region}' region")
        gone = frame[np.isnan(raw)]
        if gone.size:
            top.axvspan(gone.min() - 0.5, gone.max() + 0.5, color=GRID, alpha=0.7, linewidth=0)
            bottom.axvspan(gone.min(), gone.max() + 1, color=GRID, alpha=0.7, linewidth=0)
            top.text(gone.mean(), 0.5, "missing:\nno number", ha="center", va="center", color=INK_2, fontsize=9)
            bottom.text(gone.mean() + 0.5, 0.7, "missing:\nsilent", ha="center", va="center", color=INK_2, fontsize=9)
    top.set_ylim(-0.03, 1.05)
    top.set_ylabel("alignment")
    top.set_title("Alignment over a sequence of frames")
    top.legend(loc="lower left")
    bottom.set_ylim(0.48, 0.77)
    bottom.set_yticks([0.5, 0.625, 0.75], ["0.50 (even)", "0.625", "0.75 (uneven)"])
    bottom.set_ylabel("long_fraction")
    bottom.set_xlabel("frame (one frame = one beat, lasting until the next frame)")
    bottom.legend(loc="upper left")
    bottom.set_title("Where the second pulse falls in each beat")
    fig.suptitle(f"Measurement over time, then rhythm   |   {TEST_NOTE}", x=0.01, ha="left", fontsize=13)
    return _save(fig, path)


# ------------------------------------------------------------------------- figure 6


def fig_mapping(path: Path, params: RhythmParams = RhythmParams()) -> Path:
    fig, ax = plt.subplots(figsize=(8.6, 5.2), layout="constrained")
    a = np.linspace(0, 1, 101)
    long_gap = np.array([beat_timing(v, params).long_interval for v in a])
    short_gap = params.beat_seconds - long_gap
    ax.plot(a, long_gap + short_gap, color=MUTED, linewidth=1.2, label="long + short = one beat (tempo fixed)")
    ax.plot(a, long_gap, color=BLUE, label="long gap: pulse 1 to pulse 2")
    ax.plot(a, short_gap, color=ORANGE, label="short gap: pulse 2 to next beat")
    for value, note in ((0.0, "lines disagree:\n0.75 s + 0.25 s"), (0.5, "0.625 s + 0.375 s"), (1.0, "lines agree:\neven, 0.5 s + 0.5 s")):
        timing = beat_timing(value, params)
        ax.plot([value, value], [timing.short_interval, timing.long_interval], color=AXIS, linewidth=1)
        ax.plot(value, timing.long_interval, "o", color=BLUE, markeredgecolor=SURFACE, markeredgewidth=2)
        ax.plot(value, timing.short_interval, "o", color=ORANGE, markeredgecolor=SURFACE, markeredgewidth=2)
        align = {0.0: "left", 0.5: "center", 1.0: "right"}[value]
        ax.annotate(note, (value, timing.long_interval), textcoords="offset points", xytext=(0, 14),
                    ha=align, color=INK_2, fontsize=9)
    ax.set_xlim(-0.02, 1.02)
    ax.set_ylim(0, 1.1 * params.beat_seconds)
    ax.set_xlabel("alignment (0 = lines point every way, 1 = lines share one direction)")
    ax.set_ylabel(f"seconds, inside a {params.beat_seconds:g} s beat")
    ax.set_title("Rhythm rule: long_fraction = 0.75 - 0.25 x alignment  (a design choice)")
    ax.legend(loc="lower right")
    return _save(fig, path)


# ------------------------------------------------------------------------- figure 7


def fig_two_rhythms(path: Path, lanes: list[tuple[str, list[dict], str]], beats: int, params: RhythmParams = RhythmParams()) -> Path:
    """lanes: (label, steps, colour). Each step: {"t", "region", "alignment" or None}."""
    fig, ax = plt.subplots(figsize=(11.5, 1.5 + 1.25 * len(lanes)), layout="constrained")
    for lane, (label, steps, colour) in enumerate(lanes):
        y = len(lanes) - 1 - lane
        for event in events_for_steps(steps, params):
            ax.plot([event["t"], event["t"]], [y - 0.28, y + 0.28], color=colour, linewidth=3.5, solid_capstyle="round")
        for step in steps:
            if step["alignment"] is None:
                ax.fill_between([step["t"], step["t"] + params.beat_seconds], y - 0.3, y + 0.3, color=GRID, linewidth=0)
                ax.text(step["t"] + params.beat_seconds / 2, y, "missing: silent", ha="center", va="center", color=INK_2, fontsize=9)
            else:
                timing = beat_timing(step["alignment"], params)
                ax.text(step["t"] + timing.long_interval / 2, y - 0.42, f"{timing.long_interval:.2f} s", ha="center", va="center", color=INK_2, fontsize=8)
                ax.text(step["t"] + timing.long_interval + timing.short_interval / 2, y - 0.42, f"{timing.short_interval:.2f} s", ha="center", va="center", color=INK_2, fontsize=8)
    ax.set_yticks(range(len(lanes)), [lane[0] for lane in reversed(lanes)])
    ax.tick_params(axis="y", length=0)
    ax.set_ylim(-0.7, len(lanes) - 0.45)
    ax.set_xlim(-0.08, beats * params.beat_seconds + 0.08)
    ax.set_xticks(np.arange(0, beats + 1) * params.beat_seconds)
    ax.set_xlabel("time (seconds); grid lines are beat starts")
    ax.grid(axis="y", visible=False)
    ax.spines["left"].set_visible(False)
    ax.set_title(f"Same tempo, different spacing: each bar is one identical pulse   |   {TEST_NOTE}")
    return _save(fig, path)


# ------------------------------------------------------------------------- figure 8


def fig_limits(path: Path, dash_length: dict, motion_blur: dict, zoom: dict, jpeg: dict) -> Path:
    fig, axes = plt.subplots(2, 2, figsize=(12.5, 8.0), layout="constrained", sharey=True)

    def simple(ax, labels, series, title, xlabel):
        x = np.arange(len(labels))
        for name, colour, marker, values in series:
            y = np.array([np.nan if v is None else v for v in values], float)
            ax.plot(x, y, color=colour, marker=marker, label=name, markeredgecolor=SURFACE, markeredgewidth=1.5)
        ax.set_xticks(x, [str(v) for v in labels])
        ax.set_ylim(-0.03, 1.06)
        ax.set_title(title)
        ax.set_xlabel(xlabel)
        ax.grid(axis="x", visible=False)

    simple(axes[0, 0], column(dash_length, "dash_length_px"),
           [("perfectly parallel dashes", BLUE, "o", column(dash_length, "observed_mean"))],
           "Perfectly parallel dashes: line ends are edges too", "dash length (pixels); 600 = lines cross the whole picture")
    simple(axes[0, 1], column(motion_blur, "smear_px"),
           [("dashes, random", AQUA, "^", column(motion_blur, "alignment"))],
           "Random dashes: camera smear invents alignment", "horizontal smear (pixels)")
    simple(axes[1, 0], column(zoom, "zoom_factor"),
           [("dashes, 20 deg spread", ORANGE, "s", column(zoom, "dashes, 20 deg spread")),
            ("dashes, random", AQUA, "^", column(zoom, "dashes, random"))],
           "Zoom changes the score", "zoom factor inside a fixed box")
    simple(axes[1, 1], column(jpeg, "jpeg_quality"),
           [("parallel lines, 30 deg", BLUE, "o", column(jpeg, "parallel lines, 30 deg")),
            ("dashes, 20 deg spread", ORANGE, "s", column(jpeg, "dashes, 20 deg spread")),
            ("dashes, random", AQUA, "^", column(jpeg, "dashes, random"))],
           "JPEG compression (these test images)", "JPEG quality")
    for ax in axes[1]:
        ax.legend(loc="center right")
    for ax in axes[:, 0]:
        ax.set_ylabel("alignment")
    fig.suptitle(f"Limits: things that change the score but are not in the scene   |   {TEST_NOTE}", x=0.01, ha="left", fontsize=13)
    return _save(fig, path)
