"""Prepare the NASA material for the app: write data/scene.json and one mask per region.

One command, from the repository root:

    python analysis/prepare_scene.py                     # SVS 3912 ocean currents (default)
    python analysis/prepare_scene.py --source svs5669    # SVS 5669 GEOS Aerosols (one still)
    python analysis/prepare_scene.py --source svs4285    # SVS 4285 IMERG precipitation (30 hours)

It reads
    assets/frames/svs3912/          the downloaded frames (bash tools/download_frames.sh)
    assets/regions_draft.json       the circle regions Dev A approved
    assets/source_manifest.json     source, credit, limitations, motion check

and writes
    data/scene.json                 source, frame list with model times, legend, regions
    data/masks/mask_<id>.png        white inside the circle, black on land (box-sized)

Then Dev A measures it:
    cd analysis && python features.py --scene ../data/scene.json --out ../data/features.json \
        --rhythm-out ../data/rhythm_reference.json
(the frame numbers 23000, 23004, ... are written into scene.json, so no extra flags)

What it checks
    A bad input (missing dates file, broken regions file, circle off the map...) stops the run
    with a message that says what to do. Nothing is written.
    An unusable frame (missing, unreadable, wrong size, blank) keeps its place in the frame
    list and its model time. It is reported here, and features.py marks it `missing` with a
    reason. The land mask is built only from the usable frames.

The aerosol source writes data/aerosols/scene.json and data/aerosols/masks/ instead. Dev A
measures it at threshold 6 (approved for this source only; never compare numbers across sources):
    cd analysis && python features.py --scene ../data/aerosols/scene.json \
        --out ../data/aerosols/features.json --threshold 6

Owner: Student A. The numbers describe the rendered image, not the ocean or the air itself.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from sonata_math.image_analysis import load_image

ROOT = Path(__file__).resolve().parent.parent
FRAME_NAME = "flat_global_ecco2_2028x1024.{index}.tif"
SVS_ID = 3912

# Land is drawn as flat grey (same rule as analysis/check_motion.py and Dev A's explore_regions.py).
LAND_MIN, LAND_MAX, MAX_CHANNEL_SPREAD = 30, 80, 6
COAST_MARGIN_PX = 3
MIN_WATER_SHARE = 0.5   # a circle that is mostly land is a mistake, not a region
BLANK_STD = 1.0         # a frame this flat has no picture in it

# Colour key, as recorded from the source page in assets/source_manifest.json ("legend").
LEGEND = {
    "quantity": "Modelled sea surface temperature (colour of the flow lines)",
    "units": "degrees C",
    "stops": [
        {"colour": "blue", "value": "0 C"},
        {"colour": "green", "value": "10-20 C"},
        {"colour": "yellow", "value": "about 25 C"},
        {"colour": "red", "value": "32 C"},
    ],
}


# Colour key of SVS 5669, as written on its source page.
AEROSOL_LEGEND = {
    "quantity": "Aerosol type (colour of the plumes), GEOS-FP model",
    "units": "type, not amount",
    "stops": [
        {"colour": "blue", "value": "sea salt"},
        {"colour": "pink/magenta", "value": "dust"},
        {"colour": "orange/red", "value": "smoke from fires"},
        {"colour": "green", "value": "sulfates from pollution and volcanoes"},
    ],
}


# Colour key of SVS 4285, from its colour bars (rainbarwhite2.png, snowbarwhite2.png on the page).
IMERG_LEGEND = {
    "quantity": "Precipitation rate from GPM IMERG (liquid: green to dark red; frozen: cyan to purple)",
    "units": "mm per hour",
    "stops": [
        {"colour": "green", "value": "0.1-0.3 mm/h rain"},
        {"colour": "yellow", "value": "0.5-1 mm/h rain"},
        {"colour": "orange", "value": "2-3 mm/h rain"},
        {"colour": "red to dark red", "value": "5-50 mm/h rain"},
        {"colour": "cyan to purple", "value": "0.1-50 mm/h snow"},
    ],
}


@dataclass(frozen=True)
class Source:
    """Everything that differs between NASA sources. The method is the same for all of them."""
    key: str
    svs_id: int
    frame_name: str                 # may contain {index}
    frames_dir: str
    regions: str
    out: str
    masks_dir: str
    first: int
    last: int
    step: int
    legend: dict
    land_rule: tuple[int, int, int]  # (mean min, mean max, max channel spread): what flat grey land looks like
    dates_file: str | None = None    # per-frame times, '<frame number> <time>' per line
    fixed_time: str | None = None    # or one time for a single still
    # "grey": land is flat grey in the frames (land_rule). "reference": the land is a photo, so use
    # the land outline of the SVS 3912 ocean map (same world, same flat map) plus anything bright
    # that never changes across the frames (ice, a corner mark).
    land_mode: str = "grey"


SOURCES = {
    "svs3912": Source("svs3912", 3912, FRAME_NAME, "assets/frames/svs3912", "assets/regions_draft.json",
                      "data/scene.json", "data/masks", 23000, 23116, 4, LEGEND,
                      (LAND_MIN, LAND_MAX, MAX_CHANNEL_SPREAD), dates_file="flat_ecco2_dates.txt"),
    # One still (19 Aug 2025 20:00 UTC, time from the file name and the source page). Land is
    # dull grey-green; both approved circles are open ocean, so the rule only guards against mistakes.
    "svs5669": Source("svs5669", 5669, "Aerosols_2025-08-19T20_00_00_3840x2160.png", "assets/frames/svs5669",
                      "assets/regions_aerosols.json", "data/aerosols/scene.json", "data/aerosols/masks",
                      0, 0, 1, AEROSOL_LEGEND, (30, 95, 12), fixed_time="2025-08-19T20:00Z"),
    # 30 hourly frames saved from NASA's rolling 7-day folder (14 Nov 00:00 to 15 Nov 05:00 UTC),
    # renumbered 0-29; assets/imerg_frames.txt links each number to its time and NASA file name.
    "svs4285": Source("svs4285", 4285, "imergert_composite.{index}.png", "assets/frames/svs4285",
                      "assets/regions_imerg.json", "data/imerg/scene.json", "data/imerg/masks",
                      0, 29, 1, IMERG_LEGEND, (45, 255, 3), dates_file="imerg_dates.txt", land_mode="reference"),
}
REFERENCE_LAND_FRAME = "assets/frames/svs3912/flat_global_ecco2_2028x1024.23000.tif"


class SceneError(Exception):
    """A problem with the inputs. The message says what to do."""


@dataclass
class FrameCheck:
    index: int
    timestamp: str
    usable: bool
    reason: str | None = None


# ---------------------------------------------------------------- reading inputs

def read_json(path: Path, what: str) -> dict:
    if not path.is_file():
        raise SceneError(f"{what} not found: {path}\nCheck the path, or pull the latest main.")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as err:
        raise SceneError(f"{what} is not valid JSON: {path} (line {err.lineno}: {err.msg}).\n"
                         "Fix that line, then run again.") from None


def read_dates(path: Path) -> dict[int, str]:
    """flat_ecco2_dates.txt: one line per frame, '<frame number>  <model time>'."""
    if not path.is_file():
        raise SceneError(f"Dates file not found: {path}\nRun: bash tools/download_frames.sh")
    dates: dict[int, str] = {}
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        parts = line.split()
        if len(parts) != 2 or not parts[0].isdigit():
            raise SceneError(f"{path.name} line {number} is not '<frame number> <model time>': {line!r}\n"
                             "Download the file again: bash tools/download_frames.sh")
        dates[int(parts[0])] = parts[1]
    return dates


def read_regions(path: Path) -> list[dict]:
    draft = read_json(path, "Regions file")
    regions = draft.get("regions")
    if not isinstance(regions, list) or not regions:
        raise SceneError(f"{path.name} has no 'regions' list. Add the approved circles, then run again.")
    seen = set()
    for i, r in enumerate(regions):
        for key in ("id", "name", "center_px", "radius_px"):
            if key not in r:
                raise SceneError(f"{path.name}: region {i + 1} has no '{key}'. Add it, then run again.")
        centre, radius = r["center_px"], r["radius_px"]
        if (not isinstance(centre, list) or len(centre) != 2 or not all(isinstance(v, int) for v in centre)
                or not isinstance(radius, int) or radius < 1):
            raise SceneError(f"{path.name}: region '{r['id']}' needs center_px [x, y] and radius_px as whole "
                             f"numbers of pixels (got {centre}, {radius}).")
        if r["id"] in seen:
            raise SceneError(f"{path.name}: region id '{r['id']}' is used twice. Give each region its own id.")
        seen.add(r["id"])
    radii = {r["radius_px"] for r in regions}
    if len(radii) > 1:
        raise SceneError(f"{path.name}: the regions have different radii {sorted(radii)}. "
                         "Use the same radius for every region so the comparison is fair.")
    return regions


def source_entry(manifest_path: Path, svs_id: int = SVS_ID) -> dict:
    manifest = read_json(manifest_path, "Source manifest")
    for asset in manifest.get("assets", []):
        if asset.get("svs_id") == svs_id:
            for key in ("url", "title", "credit", "data_kind", "limitations"):
                if not asset.get(key):
                    raise SceneError(f"{manifest_path.name}: the SVS {svs_id} entry has no '{key}'. "
                                     "Fill it in from the source page, then run again.")
            return asset
    raise SceneError(f"{manifest_path.name} has no entry with svs_id {svs_id}. Add it, then run again.")


# ---------------------------------------------------------------- frames and masks

def is_land(frame_bgr: np.ndarray, rule: tuple[int, int, int] = (LAND_MIN, LAND_MAX, MAX_CHANNEL_SPREAD)) -> np.ndarray:
    low, high, max_spread = rule
    rgb = frame_bgr.astype(np.int16)
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    mean = rgb.mean(axis=2)
    return (spread <= max_spread) & (mean >= low) & (mean <= high)


def check_frames(frames_dir: Path, indices: list[int], dates: dict[int, str],
                 size: tuple[int, int] | None, frame_name: str = FRAME_NAME,
                 dates_name: str = "flat_ecco2_dates.txt") -> tuple[list[FrameCheck], list[np.ndarray]]:
    """Check every frame. Unusable frames keep their place; usable ones are returned for the land mask."""
    missing_dates = [n for n in indices if n not in dates]
    if missing_dates:
        raise SceneError(f"No model time for frame(s) {missing_dates[:5]} in {dates_name}.\n"
                         "Check --first/--last/--step, or download the dates file again.")
    checks, usable = [], []
    for n in indices:
        path = frames_dir / frame_name.format(index=n)
        check = FrameCheck(index=n, timestamp=dates[n], usable=False)
        try:
            frame = load_image(path)
        except FileNotFoundError:
            check.reason = f"Frame file not found: {path.name}"
        except ValueError:
            check.reason = f"Frame file could not be read: {path.name}"
        else:
            h, w = frame.shape[:2]
            if size is None:
                size = (h, w)
            if (h, w) != size:
                check.reason = f"Frame is {w}x{h} pixels but the others are {size[1]}x{size[0]}"
            elif float(frame.std()) < BLANK_STD:
                check.reason = "Frame is blank (one flat colour)"
            else:
                check.usable = True
                usable.append(frame)
        checks.append(check)
    return checks, usable


def land_mask(frames: list[np.ndarray], rule: tuple[int, int, int] = (LAND_MIN, LAND_MAX, MAX_CHANNEL_SPREAD)) -> np.ndarray:
    """Pixels that are land in most usable frames, grown by a small coast margin."""
    votes = np.mean([is_land(f, rule) for f in frames], axis=0)
    land = (votes > 0.5).astype(np.uint8)
    k = 2 * COAST_MARGIN_PX + 1
    return cv2.dilate(land, np.ones((k, k), np.uint8)).astype(bool)


def reference_land_mask(root: Path, frames: list[np.ndarray], rule: tuple[int, int, int]) -> np.ndarray:
    """Land for sources whose land is a photo: the SVS 3912 land outline, resized, plus static bright pixels."""
    ref_path = root / REFERENCE_LAND_FRAME
    try:
        ref = load_image(ref_path)
    except (FileNotFoundError, ValueError):
        raise SceneError(f"Reference land map not found: {ref_path}\nRun: bash tools/download_frames.sh") from None
    height, width = frames[0].shape[:2]
    outline = is_land(ref).astype(np.uint8)
    outline = cv2.resize(outline, (width, height), interpolation=cv2.INTER_NEAREST).astype(bool)
    stack = np.stack([f.astype(np.int16) for f in frames])
    still = (stack.max(axis=0) - stack.min(axis=0)).max(axis=2) <= rule[2]
    bright = stack[0].mean(axis=2) >= rule[0]
    land = (outline | (still & bright)).astype(np.uint8)
    k = 2 * COAST_MARGIN_PX * 2 + 1   # a wider margin: the outline is resized
    return cv2.dilate(land, np.ones((k, k), np.uint8)).astype(bool)


def circle_box(centre: list[int], radius: int) -> list[int]:
    """The square around the circle: [x, y, width, height]."""
    return [centre[0] - radius, centre[1] - radius, 2 * radius, 2 * radius]


def region_mask(land: np.ndarray, centre: list[int], radius: int) -> np.ndarray:
    """Box-sized mask: True inside the circle and not on land."""
    x, y, w, h = circle_box(centre, radius)
    yy, xx = np.mgrid[y : y + h, x : x + w]
    inside = (xx - centre[0]) ** 2 + (yy - centre[1]) ** 2 <= radius**2
    return inside & ~land[y : y + h, x : x + w]


# ---------------------------------------------------------------- the scene

def build_scene(*, root: Path, frames_dir: Path, regions_path: Path, manifest_path: Path,
                first: int, last: int, step: int, masks_dir: Path,
                source: Source = SOURCES["svs3912"]) -> tuple[dict, dict[str, np.ndarray], list[FrameCheck]]:
    """Everything except writing files. Raises SceneError with a fix for any bad input."""
    if step < 1 or last < first:
        raise SceneError(f"Frame range {first}..{last} step {step} is empty. Use --first <= --last and --step >= 1.")
    if not frames_dir.is_dir():
        raise SceneError(f"Frames folder not found: {frames_dir}\nRun: bash tools/download_frames.sh")
    indices = list(range(first, last + 1, step))
    if source.dates_file:
        dates = read_dates(frames_dir / source.dates_file)
    else:
        dates = {n: source.fixed_time for n in indices}
    regions = read_regions(regions_path)
    asset = source_entry(manifest_path, source.svs_id)

    checks, usable = check_frames(frames_dir, indices, dates, size=None, frame_name=source.frame_name,
                                  dates_name=source.dates_file or "the source preset")
    if not usable:
        raise SceneError(f"None of the {len(indices)} frames {first}..{last} could be used "
                         f"({checks[0].reason}).\nRun: bash tools/download_frames.sh")
    height, width = usable[0].shape[:2]
    if source.land_mode == "reference":
        land = reference_land_mask(root, usable, source.land_rule)
    else:
        land = land_mask(usable, source.land_rule)

    masks, scene_regions = {}, []
    for r in regions:
        centre, radius = r["center_px"], r["radius_px"]
        x, y, w, h = circle_box(centre, radius)
        if x < 0 or y < 0 or x + w > width or y + h > height:
            raise SceneError(f"Region '{r['id']}' (centre {centre}, radius {radius}) runs off the "
                             f"{width}x{height} frame. Move the centre at least {radius} px from every edge.")
        mask = region_mask(land, centre, radius)
        inside = region_mask(np.zeros_like(land), centre, radius)
        water = float(mask.sum() / inside.sum())
        if water < MIN_WATER_SHARE:
            raise SceneError(f"Region '{r['id']}' is {1 - water:.0%} land. Move the circle onto open ocean.")
        masks[r["id"]] = mask
        mask_rel = (masks_dir / f"mask_{r['id']}.png").resolve().relative_to(root.resolve()).as_posix()
        scene_regions.append({
            "id": r["id"],
            "name": r["name"],
            "center_px": [int(centre[0]), int(centre[1])],
            "radius_px": int(radius),
            "box_px": [x, y, w, h],
            "mask": mask_rel,
            "description": r.get("description") or (
                f"A circle {2 * radius} pixels across, centred at x {centre[0]}, y {centre[1]} on the "
                f"map. Only lines inside the circle are measured; land is left out "
                f"({1 - water:.0%} of the circle)."),
        })

    pattern = (frames_dir.resolve().relative_to(root.resolve()) / source.frame_name).as_posix()
    source_block = {k: asset[k] for k in ("url", "title", "credit", "data_kind", "limitations")}
    source_block = {"svs_id": source.svs_id, **source_block}
    for key in ("model_or_instrument", "data_start", "data_end"):
        if key in asset:
            source_block[key] = asset[key]
    motion = asset.get("motion_check", {})
    scene = {
        "schema_version": "0.2",
        "is_mock": False,
        "source": source_block,
        "frames": {
            "width": width,
            "height": height,
            "count": len(indices),
            "pattern": pattern,
            "timestamps": [c.timestamp for c in checks],
            "first_index": first,  # frame i is file number first + i * step
            "index_step": step,
            "camera_static_check": (f"{motion['method']}: {motion['result']}" if motion
                                    else "see assets/source_manifest.json"),
        },
        "legend": source.legend,
        "regions": scene_regions,
    }
    return scene, masks, checks


def validate(scene: dict) -> None:
    """Check the scene against contracts/scene.schema.json (the format the app and features.py share)."""
    import jsonschema

    schema = json.loads((ROOT / "contracts/scene.schema.json").read_text(encoding="utf-8"))
    errors = sorted(jsonschema.Draft202012Validator(schema).iter_errors(scene), key=lambda e: list(e.path))
    if errors:
        e = errors[0]
        raise SceneError(f"The scene does not match contracts/scene.schema.json at "
                         f"{'/'.join(map(str, e.path)) or '(top)'}: {e.message}")


def write_outputs(scene: dict, masks: dict[str, np.ndarray], root: Path, out_path: Path) -> None:
    for region in scene["regions"]:
        mask_path = root / region["mask"]
        mask_path.parent.mkdir(parents=True, exist_ok=True)
        if not cv2.imwrite(str(mask_path), masks[region["id"]].astype(np.uint8) * 255):
            raise SceneError(f"Could not write {mask_path}. Check the folder exists and is writable.")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(scene, handle, indent=2)
        handle.write("\n")


def main(argv: list[str] | None = None, root: Path = ROOT) -> int:
    parser = argparse.ArgumentParser(description="Write a scene.json and region masks from the NASA frames.")
    parser.add_argument("--source", choices=sorted(SOURCES), default="svs3912",
                        help="which NASA source (sets the defaults below)")
    parser.add_argument("--frames-dir", type=Path)
    parser.add_argument("--regions", type=Path)
    parser.add_argument("--manifest", type=Path, default=root / "assets/source_manifest.json")
    parser.add_argument("--out", type=Path)
    parser.add_argument("--masks-dir", type=Path)
    parser.add_argument("--first", type=int)
    parser.add_argument("--last", type=int)
    parser.add_argument("--step", type=int, help="SVS 3912 frame numbers go up in fours")
    args = parser.parse_args(argv)
    src = SOURCES[args.source]
    args.frames_dir = args.frames_dir or root / src.frames_dir
    args.regions = args.regions or root / src.regions
    args.out = args.out or root / src.out
    args.masks_dir = args.masks_dir or root / src.masks_dir
    args.first = src.first if args.first is None else args.first
    args.last = src.last if args.last is None else args.last
    args.step = src.step if args.step is None else args.step

    try:
        scene, masks, checks = build_scene(root=root, frames_dir=args.frames_dir, regions_path=args.regions,
                                           manifest_path=args.manifest, first=args.first, last=args.last,
                                           step=args.step, masks_dir=args.masks_dir, source=src)
        validate(scene)
        write_outputs(scene, masks, root, args.out)
    except SceneError as err:
        print(f"prepare_scene: {err}", file=sys.stderr)
        return 2

    bad = [c for c in checks if not c.usable]
    print(f"Wrote {args.out} ({len(checks)} frames {checks[0].index}-{checks[-1].index}, "
          f"{len(scene['regions'])} regions) and {len(masks)} mask(s) in {args.masks_dir}")
    for c in bad:
        print(f"  frame {c.index} ({c.timestamp}) kept in place but unusable: {c.reason}")
    out_rel = args.out.resolve().relative_to(root.resolve())
    extra = " --threshold 6" if src.key == "svs5669" else ""
    print(f"Next (Dev A): cd analysis && python features.py --scene ../{out_rel.as_posix()} "
          f"--out ../{(out_rel.parent / 'features.json').as_posix()} "
          f"--rhythm-out ../{(out_rel.parent / 'rhythm_reference.json').as_posix()}{extra}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
