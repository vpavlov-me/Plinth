#!/usr/bin/env bash
# Generates the built-in background "photos" in public/backgrounds/.
#
# Each background is painted as a few soft shapes on a small canvas, blurred
# heavily, upscaled and given a light grain so it reads like an out-of-focus
# photo and doesn't band. Requires ImageMagick 6 (`convert`).
#
#   bash scripts/generate-backgrounds.sh
set -euo pipefail

OUT="$(cd "$(dirname "$0")/.." && pwd)/public/backgrounds"
mkdir -p "$OUT"

W=640
H=400
FULL=2560x1600

# render <id> <blur sigma> <convert args painting the small canvas...>
render() {
  local id="$1" sigma="$2"
  shift 2
  convert -size "${W}x${H}" "$@" \
    -blur "0x${sigma}" \
    -resize "$FULL!" \
    -seed 7 -attenuate 0.35 +noise Gaussian \
    -strip -interlace JPEG -sampling-factor 4:2:0 -quality 82 \
    "$OUT/$id.jpg"
  convert "$OUT/$id.jpg" -resize 480x360^ -gravity center -extent 480x360 \
    -strip -quality 72 "$OUT/$id-thumb.jpg"
  echo "$id $(du -k "$OUT/$id.jpg" | cut -f1)K"
}

ellipse() { echo "fill $1 ellipse $2,$3 $4,$5 0,360"; }

# Light, versatile default: pale sky fading into a warm haze.
render morning-haze 38 \
  gradient:'#c4ddf3-#f6e0d2' \
  -draw "$(ellipse '#ffffff' 120 90 220 120)" \
  -draw "$(ellipse '#fde9d7' 520 330 260 120)" \
  -draw "$(ellipse '#dcecf9' 560 60 180 90)" \
  -draw "$(ellipse '#fbf4ee' 300 260 200 90)"

# Soft pastel bokeh.
render pastel-bokeh 16 \
  gradient:'#f6eef7-#e8f1fb' \
  -draw "$(ellipse '#f9cfe0' 110 110 70 70)" \
  -draw "$(ellipse '#cfe0fb' 300 70 55 55)" \
  -draw "$(ellipse '#fde3c8' 500 140 80 80)" \
  -draw "$(ellipse '#d9f0e4' 200 300 65 65)" \
  -draw "$(ellipse '#e6d6fa' 420 320 75 75)" \
  -draw "$(ellipse '#ffffff' 590 300 45 45)" \
  -draw "$(ellipse '#fbd5d0' 40 340 50 50)" \
  -draw "$(ellipse '#ffffff' 360 190 35 35)"

# Blue sky seen through out-of-focus leaves.
render sky-leaves 26 \
  gradient:'#8ec5f0-#d9eefc' \
  -draw "$(ellipse '#2f5d34' 0 0 170 120)" \
  -draw "$(ellipse '#4c7d3c' 130 40 90 60)" \
  -draw "$(ellipse '#3d6b39' 640 0 150 110)" \
  -draw "$(ellipse '#6f9a4a' 520 60 80 55)" \
  -draw "$(ellipse '#35603a' 610 400 160 110)" \
  -draw "$(ellipse '#7ba653' 40 380 110 70)" \
  -draw "$(ellipse '#e8f6ff' 360 230 260 110)"

# Soft white fabric with diagonal folds of shadow.
render white-fabric 26 \
  gradient:'#f4f2ef-#e7e3de' \
  -draw "fill #d6d1ca polygon -50,120 700,-60 700,10 -50,190" \
  -draw "fill #fbfaf8 polygon -50,200 700,40 700,110 -50,270" \
  -draw "fill #dcd7d0 polygon -50,330 700,170 700,230 -50,400" \
  -draw "fill #ffffff polygon -50,420 700,260 700,320 -50,470"

# Warm landscape at golden hour.
render golden-hour 30 \
  gradient:'#f6b26b-#f9e0b8' \
  -draw "$(ellipse '#fff2c9' 420 210 120 60)" \
  -draw "$(ellipse '#ef8f5b' 80 60 260 90)" \
  -draw "fill #b9774f polygon 0,290 160,250 330,275 500,240 640,265 640,400 0,400" \
  -draw "fill #7f5440 polygon 0,345 200,315 420,340 640,310 640,400 0,400"

# Motion-blurred green field under a bright sky.
render green-field 4 \
  gradient:'#e4f1e0-#9cc785' \
  -draw "fill #d8ecf6 rectangle 0,0 640,150" \
  -draw "fill #b7d79c rectangle 0,150 640,190" \
  -draw "fill #79ad5e rectangle 0,230 640,260" \
  -draw "fill #5f9548 rectangle 0,300 640,330" \
  -draw "fill #4b7d3a rectangle 0,360 640,400" \
  -motion-blur 0x60+0 -blur 0x18

# Lilac mist.
render lavender-mist 40 \
  gradient:'#e5dcf5-#f6ecf1' \
  -draw "$(ellipse '#cdbdf0' 140 300 230 120)" \
  -draw "$(ellipse '#ffffff' 470 110 200 100)" \
  -draw "$(ellipse '#f3d4e4' 560 340 170 90)"

# Dark abstract light streak.
render dark-streak 28 \
  gradient:'#0d1224-#1b1430' \
  -draw "$(ellipse '#4a2a8a' 110 70 200 110)" \
  -draw "fill #2f4fc0 polygon -40,340 700,10 700,120 -40,440" \
  -draw "fill #a9cbff polygon -40,380 700,50 700,74 -40,404" \
  -draw "$(ellipse '#112a52' 520 340 160 80)"

# Night city bokeh.
render night-bokeh 12 \
  gradient:'#10131d-#1d1a26' \
  -draw "$(ellipse '#f2a541' 90 120 42 42)" \
  -draw "$(ellipse '#e85d75' 250 260 50 50)" \
  -draw "$(ellipse '#4cc9f0' 420 110 38 38)" \
  -draw "$(ellipse '#f7d488' 560 280 55 55)" \
  -draw "$(ellipse '#7b6cf6' 330 60 30 30)" \
  -draw "$(ellipse '#f08a4b' 470 350 34 34)" \
  -draw "$(ellipse '#5ad1b0' 120 330 36 36)" \
  -draw "$(ellipse '#ffe7b0' 610 90 28 28)"

# Deep teal and violet glow.
render aurora 45 \
  gradient:'#06141c-#0b0d1f' \
  -draw "$(ellipse '#13806f' 200 140 230 90)" \
  -draw "$(ellipse '#5a3fb8' 470 270 220 100)" \
  -draw "$(ellipse '#1fb39a' 520 90 120 50)"
