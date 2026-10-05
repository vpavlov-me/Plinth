#!/usr/bin/env bash
# Downloads the built-in background photos from Unsplash into public/backgrounds/.
#
# Each photo is saved as <id>.jpg (2560 px wide) and <id>-thumb.jpg (480×360
# crop for the tile). The ids, photographers and photo pages are listed in
# src/editor/presets/photo-presets.ts — keep both lists in sync.
#
#   bash scripts/fetch-backgrounds.sh
set -euo pipefail

OUT="$(cd "$(dirname "$0")/.." && pwd)/public/backgrounds"
mkdir -p "$OUT"

# <id> <images.unsplash.com photo path>
PHOTOS=(
  "lake-painting photo-1694636941182-9e9fd8b3edb5"
  "starry-sea photo-1701293773241-de1a7bff8e3d"
  "green-hills photo-1699002194307-928d94c601fe"
  "lilac-fog photo-1689018161162-34b37b5d0f3d"
  "lilies photo-1687383876768-04a1505ffcdf"
  "gold-flowers photo-1683661649729-1053579e0d22"
)

for entry in "${PHOTOS[@]}"; do
  read -r id path <<<"$entry"
  base="https://images.unsplash.com/$path"
  curl -fsSL "$base?w=2560&fm=jpg&q=80&fit=max" -o "$OUT/$id.jpg"
  curl -fsSL "$base?w=480&h=360&fit=crop&crop=entropy&fm=jpg&q=72" -o "$OUT/$id-thumb.jpg"
  echo "$id $(du -k "$OUT/$id.jpg" | cut -f1)K"
done
