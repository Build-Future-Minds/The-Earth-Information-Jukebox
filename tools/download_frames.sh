#!/usr/bin/env bash
# Download the SVS 3912 frames Student A uses into assets/frames/svs3912/ (git-ignored).
# Source: https://svs.gsfc.nasa.gov/3912 — NASA/Goddard Space Flight Center Scientific Visualization Studio.
# ECCO2 model output, 'orig' 2048x1024 frame set. About 190 MB. Files already present are skipped.
#
# Usage (from the repo root):  bash tools/download_frames.sh

set -euo pipefail

BASE=https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912
DEST="$(cd "$(dirname "$0")/.." && pwd)/assets/frames/svs3912"
mkdir -p "$DEST"

fetch() {  # fetch URL FILENAME
  if [ -s "$DEST/$2" ]; then echo "have  $2"; return; fi
  echo "get   $2"
  curl -sSf -o "$DEST/$2.part" "$1" && mv "$DEST/$2.part" "$DEST/$2" \
    || { rm -f "$DEST/$2.part"; echo "FAILED $2 — check your connection and run the script again." >&2; exit 1; }
}

fetch "$BASE/flat_ecco2_dates.txt" flat_ecco2_dates.txt
fetch "$BASE/sst_ecco2_cbar.png" sst_ecco2_cbar.png

# Short run: frames 23000-23116 (30 frames, about 5 model days), plus 25000 for the motion check.
for n in $(seq 23000 4 23116) 25000; do
  f="flat_global_ecco2_2028x1024.$n.tif"
  fetch "$BASE/frames/2048x1024_1x1_30p/orig/$f" "$f"
done

echo "Done: $(ls "$DEST" | wc -l | tr -d ' ') files in $DEST"
