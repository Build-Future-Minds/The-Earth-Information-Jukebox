"""Measure draft regions on real frames, and map alignment over the whole picture.

    python explore_regions.py            # measure the circles in assets/regions_draft.json
    python explore_regions.py --map      # also score every possible circle position

This is Developer A's tool for approving regions. It reads NASA frames from
assets/frames/svs3912/ (downloaded by tools/download_frames.sh; never committed) and writes
only to analysis/out/. It does not write scene.json or features.json.

The numbers describe the rendered image of ECCO2 model output. They are not water speed,
turbulence or ocean health.
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import replace
from pathlib import Path

import cv2
import numpy as np

from sonata_math.image_analysis import (
    AnalysisParams,
    coherence,
    eligible_pixels,
    gradients,
    load_image,
    measure_alignment,
    support_radius,
    to_gray,
)
from sonata_math.rhythm import long_fraction
from sonata_math.smoothing import smooth_sequence

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "out"
FRAME_NAME = "flat_global_ecco2_2028x1024.{n}.tif"

# Land is drawn as flat grey. Same rule as Student A's analysis/check_motion.py.
LAND_MIN, LAND_MAX, MAX_CHANNEL_SPREAD = 30, 80, 6
COAST_MARGIN_PX = 3


def land_in_frame(frame_bgr: np.ndarray) -> np.ndarray:
    rgb = frame_bgr.astype(np.int16)
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    mean = rgb.mean(axis=2)
    return (spread <= MAX_CHANNEL_SPREAD) & (mean >= LAND_MIN) & (mean <= LAND_MAX)


def land_mask(frames: list[np.ndarray]) -> np.ndarray:
    """Pixels that are land in most frames, grown by a small coast margin."""
    votes = np.mean([land_in_frame(f) for f in frames], axis=0)
    land = (votes > 0.5).astype(np.uint8)
    k = 2 * COAST_MARGIN_PX + 1
    return cv2.dilate(land, np.ones((k, k), np.uint8)).astype(bool)


def disc(shape: tuple[int, int], centre: tuple[int, int], radius: int) -> np.ndarray:
    y, x = np.mgrid[0 : shape[0], 0 : shape[1]]
    return (x - centre[0]) ** 2 + (y - centre[1]) ** 2 <= radius**2


def lonlat(x: float, y: float, width: int, height: int) -> tuple[float, float]:
    """Equirectangular map: see map_geometry in assets/source_manifest.json."""
    return x * 360.0 / width - 180.0, 90.0 - y * 180.0 / height


def measure_circles(frames, land, circles, params):
    """Engine result for every circle in every frame. circles: (id, (cx, cy), radius)."""
    results = {}
    for region_id, (cx, cy), r in circles:
        box = (slice(cy - r, cy + r), slice(cx - r, cx + r))
        mask = (disc(land.shape, (cx, cy), r) & ~land)[box]
        results[region_id] = [measure_alignment(f[box], mask, params) for f in frames]
    return results


def summarise(results) -> dict:
    values = [r.alignment for r in results if r.ok]
    usable = [r.usable_fraction for r in results]
    if not values:
        return {"ok": 0, "missing": len(results), "usable_mean": float(np.mean(usable))}
    return {
        "ok": len(values),
        "missing": len(results) - len(values),
        "mean": float(np.mean(values)),
        "sd": float(np.std(values)),
        "min": float(np.min(values)),
        "max": float(np.max(values)),
        "usable_mean": float(np.mean(usable)),
        "usable_min": float(np.min(usable)),
    }


def alignment_map(frame_bgr, land, params, radius):
    """Engine alignment for a circle centred on every pixel (same maths as measure_alignment)."""
    gray = to_gray(frame_bgr, params.gray_mode)
    gx, gy = gradients(gray, params.blur_sigma)
    magnitude = np.hypot(gx, gy)
    eligible = eligible_pixels(gray.shape, ~land, params.blur_sigma)
    voting = eligible & (magnitude >= params.gradient_threshold) & (magnitude > 0)

    s = support_radius(params.blur_sigma)
    d = np.abs(np.arange(-radius, radius + 1))
    kernel = ((d[None, :] + s) ** 2 + (d[:, None] + s) ** 2 <= radius**2).astype(np.float64)

    def window_sum(a):
        return cv2.filter2D(a.astype(np.float64), cv2.CV_64F, kernel, borderType=cv2.BORDER_CONSTANT)

    jxx = window_sum(np.where(voting, gx * gx, 0.0))
    jyy = window_sum(np.where(voting, gy * gy, 0.0))
    jxy = window_sum(np.where(voting, gx * gy, 0.0))
    n_voting = window_sum(voting)
    usable = n_voting / float((2 * radius) ** 2)
    open_water = window_sum(eligible) / kernel.sum()  # 1 = no land or frame edge near the circle
    with np.errstate(invalid="ignore", divide="ignore"):
        score = np.hypot(jxx - jyy, 2.0 * jxy) / (jxx + jyy + params.epsilon)
    score[(n_voting < 0.5) | (usable < params.min_usable_fraction)] = np.nan
    return np.clip(score, 0.0, 1.0), usable, open_water


def pick_centres(score, valid, radius, count, highest: bool):
    """Best (or worst) circle centres that do not overlap each other."""
    work = np.where(valid, score, np.nan).copy()
    picks = []
    for _ in range(count):
        if not np.isfinite(work).any():
            break
        index = np.nanargmax(work) if highest else np.nanargmin(work)
        y, x = np.unravel_index(index, work.shape)
        picks.append((int(x), int(y), float(work[y, x])))
        work[disc(work.shape, (x, y), 2 * radius)] = np.nan
    return picks


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--regions", type=Path, default=ROOT / "assets/regions_draft.json")
    parser.add_argument("--frames-dir", type=Path, default=ROOT / "assets/frames/svs3912")
    parser.add_argument("--first", type=int, default=23000)
    parser.add_argument("--last", type=int, default=23116)
    parser.add_argument("--step", type=int, default=4)
    parser.add_argument("--alpha", type=float, default=0.3, help="smoothing alpha for the summary")
    parser.add_argument("--also", action="append", default=[], metavar="ID,X,Y",
                        help="measure one more circle of the same radius, e.g. --also equator,271,504")
    parser.add_argument("--radius", type=int, help="try a different radius for every circle")
    parser.add_argument("--write-draft-scene", action="store_true",
                        help="write out/draft/scene.draft.json and masks so features.py can be tried on these circles")
    parser.add_argument("--min-water", type=float, default=0.95,
                        help="smallest open-water share for a map position to count (islands lower it)")
    parser.add_argument("--map", action="store_true", help="score every circle position (about a minute)")
    args = parser.parse_args()

    numbers = list(range(args.first, args.last + 1, args.step))
    paths = [args.frames_dir / FRAME_NAME.format(n=n) for n in numbers]
    absent = [p.name for p in paths if not p.is_file()]
    if absent:
        print(f"{len(absent)} frame(s) not found in {args.frames_dir}, e.g. {absent[0]}.")
        print("Run:  bash tools/download_frames.sh   (from the repository root)")
        return 2
    frames = [load_image(p) for p in paths]
    height, width = frames[0].shape[:2]
    land = land_mask(frames)

    draft = json.loads(args.regions.read_text(encoding="utf-8"))
    circles = [(r["id"], tuple(r["center_px"]), int(r["radius_px"])) for r in draft["regions"]]
    radius = args.radius or circles[0][2]
    circles = [(rid, centre, radius) for rid, centre, _ in circles]
    for extra in args.also:
        name, x, y = extra.split(",")
        circles.append((name, (int(x), int(y)), radius))
    params = AnalysisParams()
    OUT.mkdir(exist_ok=True)

    print(f"{len(frames)} frames ({numbers[0]}-{numbers[-1]}), {width}x{height}, land {land.mean():.1%} of the picture")
    print(f"settings: grayscale {params.gray_mode}, blur {params.blur_sigma}, threshold "
          f"{params.gradient_threshold}, min usable {params.min_usable_fraction}, weight m^{params.weight_power}\n")

    # ---- 1. the draft regions with the default settings
    results = measure_circles(frames, land, circles, params)
    report = {"frames": numbers, "settings": {"gray_mode": params.gray_mode, "blur_sigma": params.blur_sigma,
              "gradient_threshold": params.gradient_threshold, "min_usable_fraction": params.min_usable_fraction,
              "weight_power": params.weight_power}, "regions": {}}
    print("region                    ok/missing   alignment mean  sd     min    max    usable  long_fraction  land in circle  lat")
    for region_id, (cx, cy), r in circles:
        s = summarise(results[region_id])
        circle = disc(land.shape, (cx, cy), r)
        s["land_share"] = float(land[circle].mean())
        s["lonlat"] = [round(v, 1) for v in lonlat(cx, cy, width, height)]
        report["regions"][region_id] = s
        if s["ok"]:
            print(f"{region_id:25s} {s['ok']:2d}/{s['missing']:<2d}        {s['mean']:.3f}           {s['sd']:.3f}  "
                  f"{s['min']:.3f}  {s['max']:.3f}  {s['usable_mean']:.3f}   {long_fraction(s['mean']):.3f}          "
                  f"{s['land_share']:.1%}           {s['lonlat'][1]:+.1f}")
        else:
            print(f"{region_id:25s} {s['ok']:2d}/{s['missing']:<2d}        missing in every frame (usable {s['usable_mean']:.3f})")

    # ---- 1b. rough size of the map-projection effect
    # The map stretches east-west distances by 1/cos(latitude). Undoing that for the gradients
    # (gx -> gx / cos) gives a rough idea of the score on an unstretched picture. It treats
    # latitude as constant across the circle and ignores that blur and threshold act in pixels.
    print("\nmap stretch (rough): score as drawn -> score with east-west distances corrected")
    for region_id, (cx, cy), _ in circles:
        c = math.cos(math.radians(lonlat(cx, cy, width, height)[1]))
        fixed = [coherence(r.jxx / c**2, r.jyy, r.jxy / c) for r in results[region_id] if r.ok]
        if fixed:
            report["regions"][region_id]["unstretched_mean"] = float(np.mean(fixed))
            print(f"{region_id:25s} {report['regions'][region_id]['mean']:.3f} -> {np.mean(fixed):.3f}   (cos latitude = {c:.2f})")

    # ---- 2. how far apart are the regions, frame by frame?
    print("\npair (higher - lower)                              mean gap  smallest gap  2nd pulse apart (1 s beat)")
    report["pairs"] = {}
    ids = [c[0] for c in circles]
    for i, a in enumerate(ids):
        for b in ids[i + 1 :]:
            gaps = [ra.alignment - rb.alignment for ra, rb in zip(results[a], results[b]) if ra.ok and rb.ok]
            if not gaps:
                continue
            mean_gap = float(np.mean(gaps))
            hi, lo = (a, b) if mean_gap >= 0 else (b, a)
            signed = [g if mean_gap >= 0 else -g for g in gaps]
            report["pairs"][f"{hi} - {lo}"] = {"mean_gap": abs(mean_gap), "min_gap": float(np.min(signed))}
            print(f"{hi + ' - ' + lo:50s} {abs(mean_gap):.3f}     {np.min(signed):+.3f}        {250 * abs(mean_gap):.0f} ms")

    # ---- 3. what the settings change
    print("\nsensitivity (mean alignment / mean usable fraction; 'missing' = no usable frame)")
    variants = {
        "default": params,
        "grayscale luma": replace(params, gray_mode="luma"),
        "threshold 8": replace(params, gradient_threshold=8.0),
        "threshold 20": replace(params, gradient_threshold=20.0),
        "no blur": replace(params, blur_sigma=0.0),
        "weight m (spec draft)": replace(params, weight_power=1),
    }
    report["sensitivity"] = {}
    print(f"{'variant':24s}" + "".join(f"{i:>30s}" for i in ids))
    for name, variant in variants.items():
        row = measure_circles(frames, land, circles, variant)
        cells, report["sensitivity"][name] = [], {}
        for region_id in ids:
            s = summarise(row[region_id])
            report["sensitivity"][name][region_id] = s
            cells.append(f"{s['mean']:.3f} / {s['usable_mean']:.3f}" + (f" ({s['missing']} missing)" if s["missing"] else "")
                         if s["ok"] else f"missing / {s['usable_mean']:.3f}")
        print(f"{name:24s}" + "".join(f"{c:>30s}" for c in cells))

    # ---- 4. smoothing
    print(f"\nafter smoothing (alpha {args.alpha}): range of the value the app would play")
    for region_id in ids:
        smooth = [v for v in smooth_sequence([r.alignment for r in results[region_id]], args.alpha) if v is not None]
        if smooth:
            print(f"{region_id:25s} {min(smooth):.3f} to {max(smooth):.3f}  ->  long_fraction "
                  f"{long_fraction(max(smooth)):.3f} to {long_fraction(min(smooth)):.3f}")

    # ---- 5. the whole picture
    if args.map:
        stack, usable_stack, water = [], [], None
        for frame in frames:
            score, usable, water = alignment_map(frame, land, params, radius)
            stack.append(score)
            usable_stack.append(usable)
        stack = np.array(stack)
        ok_share = np.isfinite(stack).mean(axis=0)
        filled = np.where(np.isfinite(stack), stack, 0.0)
        count = np.maximum(np.isfinite(stack).sum(axis=0), 1)
        mean_map = filled.sum(axis=0) / count
        sd_map = np.sqrt(np.maximum((filled**2).sum(axis=0) / count - mean_map**2, 0.0))
        valid = (ok_share == 1.0) & (water >= args.min_water)

        check = max(
            abs(stack[i][cy, cx] - results[rid][i].alignment)
            for rid, (cx, cy), _ in circles for i in range(len(frames)) if results[rid][i].ok
        )
        print(f"\nmap check: largest difference between the map and the engine at the draft centres = {check:.2e}")
        inside = mean_map[valid]
        q = np.percentile(inside, [5, 25, 50, 75, 95])
        print(f"circle positions (radius {radius} px) that are at least {args.min_water:.0%} open water: {valid.sum():,}")
        print("alignment over all of them: 5% {:.3f}  25% {:.3f}  median {:.3f}  75% {:.3f}  95% {:.3f}  max {:.3f}".format(*q, inside.max()))
        for rid, (cx, cy), _ in circles:
            rank = float((inside < mean_map[cy, cx]).mean())
            print(f"  {rid:25s} mean {mean_map[cy, cx]:.3f} is higher than {rank:.0%} of positions")

        report["map"] = {"radius": radius, "positions": int(valid.sum()), "percentiles_5_25_50_75_95": [float(v) for v in q],
                         "most_aligned": [], "least_aligned": []}
        for label, highest, key in (("most aligned", True, "most_aligned"), ("least aligned", False, "least_aligned")):
            print(f"\n{label} open-water circles (no overlap):   x     y     lon     lat    mean   sd     usable")
            for x, y, value in pick_centres(mean_map, valid, radius, 6, highest):
                lon, lat = lonlat(x, y, width, height)
                usable_here = float(np.mean([u[y, x] for u in usable_stack]))
                report["map"][key].append({"center_px": [x, y], "lonlat": [round(lon, 1), round(lat, 1)],
                                           "mean": value, "sd": float(sd_map[y, x]), "usable": usable_here})
                print(f"{'':38s}{x:5d} {y:5d} {lon:7.1f} {lat:6.1f}   {value:.3f}  {sd_map[y, x]:.3f}  {usable_here:.3f}")

        np.save(OUT / "alignment_map_mean.npy", np.where(valid, mean_map, np.nan).astype(np.float32))
        draw_map(mean_map, valid, land, circles, report["map"], frames[0], radius, OUT / "alignment_map.png")
        print(f"\nfigure: {OUT / 'alignment_map.png'}")

    with open(OUT / "regions_report.json", "w", encoding="utf-8", newline="\n") as handle:
        json.dump(report, handle, indent=1)
    print(f"report: {OUT / 'regions_report.json'}")

    if args.write_draft_scene:
        write_draft_scene(args, draft, circles, land, numbers, (height, width))
    return 0


def write_draft_scene(args, draft, circles, land, numbers, frame_shape) -> None:
    """A scene file for trying features.py on these circles. A DRAFT in out/, not data/scene.json."""
    folder = OUT / "draft"
    folder.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((ROOT / "assets/source_manifest.json").read_text(encoding="utf-8"))
    asset = next(a for a in manifest["assets"] if a.get("svs_id") == 3912)
    dates = dict(line.split() for line in (args.frames_dir / "flat_ecco2_dates.txt").read_text().splitlines() if line.strip())
    names = {r["id"]: r["name"] for r in draft["regions"]}

    regions = []
    for region_id, (cx, cy), r in circles:
        mask = disc(land.shape, (cx, cy), r) & ~land
        mask_path = folder / f"mask_{region_id}.png"
        cv2.imwrite(str(mask_path), mask.astype(np.uint8) * 255)
        regions.append({
            "id": region_id,
            "name": names.get(region_id, region_id),
            "box_px": [cx - r, cy - r, 2 * r, 2 * r],
            "mask": mask_path.relative_to(ROOT).as_posix(),
            "description": f"DRAFT circle, radius {r} px, centre {[cx, cy]}; mask = circle minus land.",
        })
    scene = {
        "schema_version": "0.1",
        "is_mock": False,
        "source": {
            "svs_id": 3912,
            "url": asset["url"],
            "title": asset["title"],
            "credit": asset["credit"],
            "data_kind": asset["data_kind"],
            "model_or_instrument": asset["model_or_instrument"],
            "data_start": asset["data_start"],
            "data_end": asset["data_end"],
            "limitations": asset["limitations"] + ["DRAFT regions, not yet approved."],
        },
        "frames": {
            "width": frame_shape[1],
            "height": frame_shape[0],
            "count": len(numbers),
            "pattern": (args.frames_dir.resolve().relative_to(ROOT) / FRAME_NAME.replace("{n}", "{index}")).as_posix(),
            "timestamps": [dates[str(n)] for n in numbers],
            "camera_static_check": asset.get("motion_check", {}).get("result", "see assets/source_manifest.json"),
        },
        "regions": regions,
    }
    scene_path = folder / "scene.draft.json"
    with open(scene_path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(scene, handle, indent=2)
        handle.write("\n")
    print(f"\ndraft scene: {scene_path}")
    print("try it:  python features.py --scene out/draft/scene.draft.json --out out/draft/features.draft.json "
          f"--rhythm-out out/draft/rhythm_reference.draft.json --first-index {numbers[0]} --index-step {args.step}")


def draw_map(mean_map, valid, land, circles, picks, frame, radius, path) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.colors import LinearSegmentedColormap
    from matplotlib.patches import Circle

    from sonata_math import viz

    viz.apply_style()
    ramp = LinearSegmentedColormap.from_list("blue", ["#eef4fd", "#cde2fb", "#86b6ef", "#3987e5", "#1c5cab", "#0d366b"])
    ramp.set_bad("#d9d8d2")
    fig, (top, bottom) = plt.subplots(2, 1, figsize=(13, 13.2), layout="constrained")

    top.imshow(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    top.set_title("Frame 23000 of SVS 3912 (NASA/Goddard Space Flight Center Scientific Visualization Studio; ECCO2 model output)")
    shown = np.where(valid, mean_map, np.nan)
    image = bottom.imshow(shown, cmap=ramp, vmin=0, vmax=float(np.nanmax(shown)))
    bottom.set_title(f"Alignment of a circle (radius {radius} px) centred on each point, mean over the frames. "
                     "Grey: too much land or frame edge inside the circle")
    fig.colorbar(image, ax=bottom, shrink=0.75, pad=0.01).set_label("alignment (lines in the picture; not a physical quantity)")

    def ring(ax, x, y, colour, text, dy=-1):
        ax.add_patch(Circle((x, y), radius, fill=False, edgecolor="#fcfcfb", linewidth=3.2))
        ax.add_patch(Circle((x, y), radius, fill=False, edgecolor=colour, linewidth=1.8))
        ax.annotate(text, (x, y + dy * (radius + 6)), ha="center", va="bottom" if dy < 0 else "top", fontsize=8.5,
                    color=viz.INK, bbox={"boxstyle": "round,pad=0.2", "facecolor": "#fcfcfb", "edgecolor": "none", "alpha": 0.85})

    for ax in (top, bottom):
        for rid, (cx, cy), _ in circles:
            ring(ax, cx, cy, viz.ORANGE, f"draft: {rid}\n{mean_map[cy, cx]:.2f}")
        for i, pick in enumerate(picks["most_aligned"][:4], 1):
            x, y = pick["center_px"]
            ring(ax, x, y, viz.BLUE, f"most aligned #{i}\n{pick['mean']:.2f}", dy=1)
        ax.set_xticks([])
        ax.set_yticks([])
        ax.grid(False)
    fig.savefig(path)
    plt.close(fig)


if __name__ == "__main__":
    raise SystemExit(main())
