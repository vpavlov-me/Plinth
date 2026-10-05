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
  "great-wave photo-1687382130081-ebd36ecd38a9"
  "mountain-lake photo-1546587348-d12660c30c50"
  "lavender-field photo-1600699260716-d5ed9a3f9efe"
  "sand-dunes photo-1639402479478-f5e7881c0ccc"
)

for entry in "${PHOTOS[@]}"; do
  read -r id path <<<"$entry"
  base="https://images.unsplash.com/$path"
  curl -fsSL "$base?w=2560&fm=jpg&q=80&fit=max" -o "$OUT/$id.jpg"
  curl -fsSL "$base?w=480&h=360&fit=crop&crop=entropy&fm=jpg&q=72" -o "$OUT/$id-thumb.jpg"
  echo "$id $(du -k "$OUT/$id.jpg" | cut -f1)K"
done
