#!/usr/bin/env node
/**
 * Generates the original placeholder device frames in `public/devices`.
 *
 * Every frame is a plain SVG whose coordinate system matches the geometry
 * declared in `src/editor/devices/definitions.ts`. The screen area is left
 * transparent so the editor can draw the screenshot underneath the frame.
 *
 * The frames are deliberately generic (no brand marks) and can be replaced
 * with any PNG/SVG of the same dimensions without touching editor code.
 *
 * Usage: npm run devices:generate
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "devices");

/** Rounded rectangle path with per-corner radii [tl, tr, br, bl]. */
function rrect(x, y, w, h, r) {
  const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  return [
    `M${x + tl},${y}`,
    `H${x + w - tr}`,
    tr ? `A${tr},${tr} 0 0 1 ${x + w},${y + tr}` : "",
    `V${y + h - br}`,
    br ? `A${br},${br} 0 0 1 ${x + w - br},${y + h}` : "",
    `H${x + bl}`,
    bl ? `A${bl},${bl} 0 0 1 ${x},${y + h - bl}` : "",
    `V${y + tl}`,
    tl ? `A${tl},${tl} 0 0 1 ${x + tl},${y}` : "",
    "Z",
  ].join("");
}

function inset(rect, d) {
  const radius = Array.isArray(rect.r) ? rect.r.map((v) => Math.max(0, v - d)) : Math.max(0, rect.r - d);
  return { x: rect.x + d, y: rect.y + d, w: rect.w - d * 2, h: rect.h - d * 2, r: radius };
}

const path = (rect) => rrect(rect.x, rect.y, rect.w, rect.h, rect.r);

/** Library previews fill the screen so the device reads as a solid shape. */
const screen_ = (fill, screen) => (fill ? `<path fill="${fill}" d="${path(screen)}"/>\n` : "");
const PREVIEW_FILL = "#dfe3ea";

function svg(width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${body}\n</svg>\n`;
}

function metalGradient(id, { edge, mid, highlight }, direction = "horizontal") {
  const coords = direction === "horizontal" ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="0" x2="0" y2="1"';
  return `<linearGradient id="${id}" ${coords}>
  <stop offset="0" stop-color="${edge}"/>
  <stop offset="0.035" stop-color="${highlight}"/>
  <stop offset="0.5" stop-color="${mid}"/>
  <stop offset="0.965" stop-color="${highlight}"/>
  <stop offset="1" stop-color="${edge}"/>
</linearGradient>`;
}

/* -------------------------------------------------------------------------- */
/* Phone                                                                      */
/* -------------------------------------------------------------------------- */

const PHONE_VARIANTS = {
  graphite: { edge: "#1f1f22", mid: "#2c2c30", highlight: "#55555b", button: "#2a2a2e" },
  silver: { edge: "#a9a9b0", mid: "#d4d4d9", highlight: "#f2f2f4", button: "#bdbdc3" },
  sand: { edge: "#8d857a", mid: "#b5ad9f", highlight: "#d9d2c5", button: "#a39b8e" },
  ocean: { edge: "#1e2a3a", mid: "#33445a", highlight: "#5d7189", button: "#2d3c50" },
};

function phone(variant, fill) {
  const pad = 10;
  const screen = { x: 82, y: 72, w: 1179, h: 2556, r: 160 };
  const body = { x: pad, y: 0, w: 1323, h: 2700, r: 232 };
  const band = inset(body, 16);
  const width = body.w + pad * 2;
  const buttons = [
    { x: 0, y: 440, w: 14, h: 110 },
    { x: 0, y: 650, w: 14, h: 210 },
    { x: 0, y: 900, w: 14, h: 210 },
    { x: width - 14, y: 780, w: 14, h: 330 },
  ];
  const island = { x: screen.x + screen.w / 2 - 186, y: screen.y + 36, w: 372, h: 110, r: 55 };
  return svg(
    width,
    body.h,
    `${screen_(fill, screen)}<defs>${metalGradient("metal", variant)}</defs>
${buttons
  .map(
    (b) =>
      `<path d="${rrect(
        b.x,
        b.y,
        b.w,
        b.h,
        [4, 0, 0, 4].map((v, i) => (b.x === 0 ? v : [0, 4, 4, 0][i])),
      )}" fill="${variant.button}"/>`,
  )
  .join("\n")}
<path fill-rule="evenodd" fill="url(#metal)" d="${path(body)}${path(band)}"/>
<path fill-rule="evenodd" fill="#08080a" d="${path(band)}${path(screen)}"/>
<path fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2" d="${path(inset(band, 1))}"/>
<path fill="#000" d="${path(island)}"/>
<circle cx="${island.x + island.w - 70}" cy="${island.y + island.h / 2}" r="20" fill="#0d1117"/>`,
  );
}

/* -------------------------------------------------------------------------- */
/* Tablet                                                                     */
/* -------------------------------------------------------------------------- */

const TABLET_VARIANTS = {
  graphite: { edge: "#26262a", mid: "#38383d", highlight: "#606067" },
  silver: { edge: "#b3b3b9", mid: "#d8d8dd", highlight: "#f3f3f5" },
};

function tablet(variant, orientation, fill) {
  const portrait = orientation === "portrait";
  const sw = portrait ? 2048 : 2732;
  const sh = portrait ? 2732 : 2048;
  const bezel = 120;
  const body = { x: 0, y: 0, w: sw + bezel * 2, h: sh + bezel * 2, r: 150 };
  const band = inset(body, 12);
  const screen = { x: bezel, y: bezel, w: sw, h: sh, r: 50 };
  return svg(
    body.w,
    body.h,
    `${screen_(fill, screen)}<defs>${metalGradient("metal", variant)}</defs>
<path fill-rule="evenodd" fill="url(#metal)" d="${path(body)}${path(band)}"/>
<path fill-rule="evenodd" fill="#0a0a0c" d="${path(band)}${path(screen)}"/>
<path fill="none" stroke="#ffffff" stroke-opacity="0.07" stroke-width="2" d="${path(inset(band, 1))}"/>
<circle cx="${body.w / 2}" cy="${bezel / 2 + 4}" r="13" fill="#15181d"/>
<circle cx="${body.w / 2}" cy="${bezel / 2 + 4}" r="6" fill="#222833"/>`,
  );
}

/* -------------------------------------------------------------------------- */
/* Laptop                                                                     */
/* -------------------------------------------------------------------------- */

const LAPTOP_VARIANTS = {
  graphite: { lid: "#3a3a3f", deckTop: "#55555b", deck: "#3d3d42", deckBottom: "#232326", notch: "#2a2a2e" },
  silver: { lid: "#c4c4ca", deckTop: "#e6e6ea", deck: "#c9c9cf", deckBottom: "#9d9da4", notch: "#adadb4" },
};

function laptop(variant, fill) {
  const width = 3120;
  const lid = { x: 220, y: 0, w: 2680, h: 1814, r: [64, 64, 0, 0] };
  const bezel = inset(lid, 8);
  const screen = { x: 280, y: 64, w: 2560, h: 1664, r: [18, 18, 0, 0] };
  const baseY = lid.h;
  const baseH = 96;
  return svg(
    width,
    baseY + baseH,
    `${screen_(fill, screen)}<defs>
<linearGradient id="deck" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${variant.deckTop}"/>
  <stop offset="0.3" stop-color="${variant.deck}"/>
  <stop offset="1" stop-color="${variant.deckBottom}"/>
</linearGradient>
<linearGradient id="hinge" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#000" stop-opacity="0.55"/>
  <stop offset="1" stop-color="#000" stop-opacity="0"/>
</linearGradient>
</defs>
<path fill-rule="evenodd" fill="${variant.lid}" d="${path(lid)}${path(bezel)}"/>
<path fill-rule="evenodd" fill="#0b0b0d" d="${path(bezel)}${path(screen)}"/>
<circle cx="${width / 2}" cy="32" r="8" fill="#1b1f26"/>
<path fill="url(#deck)" d="${rrect(0, baseY, width, baseH, [10, 10, 64, 64])}"/>
<path fill="url(#hinge)" d="${rrect(lid.x + 40, baseY, lid.w - 80, 22, 0)}"/>
<path fill="${variant.notch}" d="${rrect(width / 2 - 230, baseY, 460, 24, [0, 0, 22, 22])}"/>
<path fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2" d="M14,${baseY + 2} H${width - 14}"/>`,
  );
}

/* -------------------------------------------------------------------------- */
/* Browser window                                                             */
/* -------------------------------------------------------------------------- */

const BROWSER_VARIANTS = {
  light: { chrome: "#f2f2f4", border: "#d6d6db", field: "#ffffff", ink: "#c3c3c9", icon: "#9a9aa2" },
  dark: { chrome: "#26262b", border: "#3b3b42", field: "#35353c", ink: "#55555e", icon: "#7c7c86" },
};

function browser(variant, fill) {
  const width = 1442;
  const toolbar = 56;
  const height = toolbar + 900 + 1;
  const outer = { x: 0.5, y: 0.5, w: width - 1, h: height - 1, r: 14 };
  const screen = { x: 1, y: toolbar, w: 1440, h: 900, r: [0, 0, 13, 13] };
  const fieldW = 600;
  const fieldX = (width - fieldW) / 2;
  const chevron = (x, dir) =>
    `<path d="M${x + (dir < 0 ? 5 : -1)},${toolbar / 2 - 6} l${dir * 6},6 l${-dir * 6},6" fill="none" stroke="${variant.icon}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  return svg(
    width,
    height,
    `${screen_(fill, screen)}<path fill-rule="evenodd" fill="${variant.chrome}" d="${rrect(0, 0, width, height, 14)}${path(screen)}"/>
<path fill="none" stroke="${variant.border}" stroke-width="1" d="${path(outer)}"/>
<path stroke="${variant.border}" stroke-width="1" d="M1,${toolbar - 0.5} H${width - 1}"/>
<circle cx="24" cy="${toolbar / 2}" r="6.5" fill="#ff5f57"/>
<circle cx="45" cy="${toolbar / 2}" r="6.5" fill="#febc2e"/>
<circle cx="66" cy="${toolbar / 2}" r="6.5" fill="#28c840"/>
${chevron(104, -1)}
${chevron(132, 1)}
<path fill="${variant.field}" stroke="${variant.border}" stroke-width="1" d="${rrect(fieldX + 0.5, 12.5, fieldW - 1, 31, 9)}"/>
<path fill="${variant.icon}" d="${rrect(width / 2 - 104, 24, 9, 8, 1.5)}"/>
<path fill="none" stroke="${variant.icon}" stroke-width="1.6" d="M${width / 2 - 102},24.5 v-2.5 a2.5,2.5 0 0 1 5,0 v2.5"/>
<path fill="${variant.ink}" d="${rrect(width / 2 - 86, 24, 190, 8, 4)}"/>`,
  );
}

/* -------------------------------------------------------------------------- */

const files = {};
for (const [name, v] of Object.entries(PHONE_VARIANTS)) files[`phone-${name}.svg`] = phone(v);
files["phone-preview.svg"] = phone(PHONE_VARIANTS.graphite, PREVIEW_FILL);
files["tablet-portrait-preview.svg"] = tablet(TABLET_VARIANTS.graphite, "portrait", PREVIEW_FILL);
files["tablet-landscape-preview.svg"] = tablet(TABLET_VARIANTS.graphite, "landscape", PREVIEW_FILL);
files["laptop-preview.svg"] = laptop(LAPTOP_VARIANTS.graphite, PREVIEW_FILL);
files["browser-preview.svg"] = browser(BROWSER_VARIANTS.light, PREVIEW_FILL);
for (const [name, v] of Object.entries(TABLET_VARIANTS)) {
  files[`tablet-portrait-${name}.svg`] = tablet(v, "portrait");
  files[`tablet-landscape-${name}.svg`] = tablet(v, "landscape");
}
for (const [name, v] of Object.entries(LAPTOP_VARIANTS)) files[`laptop-${name}.svg`] = laptop(v);
for (const [name, v] of Object.entries(BROWSER_VARIANTS)) files[`browser-${name}.svg`] = browser(v);

mkdirSync(OUT_DIR, { recursive: true });
for (const [file, content] of Object.entries(files)) {
  writeFileSync(join(OUT_DIR, file), content);
  console.log(`wrote public/devices/${file}`);
}
