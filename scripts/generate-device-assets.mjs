#!/usr/bin/env node
/**
 * Generates the built-in device frames (`public/devices/*.svg`) and their
 * geometry catalog (`src/editor/devices/catalog.json`).
 *
 * All artwork is original and brand-free: no logos, no trademarked names.
 * Devices are described by generic names and modelled on common sizes and
 * screen resolutions. The screen area of every frame is transparent so the
 * editor can draw the screenshot underneath.
 *
 * Usage: npm run devices:generate
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "devices");
const CATALOG = join(ROOT, "src", "editor", "devices", "catalog.json");
const PREVIEW_FILL = "#d9dde5";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const r2 = (n) => Math.round(n * 100) / 100;

/** Rounded rectangle path with per-corner radii [tl, tr, br, bl]. */
function rrect(x, y, w, h, r) {
  const max = Math.min(w, h) / 2;
  const [tl, tr, br, bl] = (Array.isArray(r) ? r : [r, r, r, r]).map((v) => Math.min(v, max));
  return [
    `M${r2(x + tl)},${r2(y)}`,
    `H${r2(x + w - tr)}`,
    tr ? `A${r2(tr)},${r2(tr)} 0 0 1 ${r2(x + w)},${r2(y + tr)}` : "",
    `V${r2(y + h - br)}`,
    br ? `A${r2(br)},${r2(br)} 0 0 1 ${r2(x + w - br)},${r2(y + h)}` : "",
    `H${r2(x + bl)}`,
    bl ? `A${r2(bl)},${r2(bl)} 0 0 1 ${r2(x)},${r2(y + h - bl)}` : "",
    `V${r2(y + tl)}`,
    tl ? `A${r2(tl)},${r2(tl)} 0 0 1 ${r2(x + tl)},${r2(y)}` : "",
    "Z",
  ].join("");
}

const rect = (x, y, w, h, r = 0) => ({ x, y, w, h, r });
const path = (b) => rrect(b.x, b.y, b.w, b.h, b.r);
function inset(b, d) {
  const r = Array.isArray(b.r) ? b.r.map((v) => Math.max(0, v - d)) : Math.max(0, b.r - d);
  return { x: b.x + d, y: b.y + d, w: b.w - 2 * d, h: b.h - 2 * d, r };
}

function svg(width, height, defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(width)}" height="${r2(height)}" viewBox="0 0 ${r2(width)} ${r2(height)}">\n<defs>${defs.join("\n")}</defs>\n${body.join("\n")}\n</svg>\n`;
}

function linear(id, stops, dir = "x") {
  const coords =
    dir === "x"
      ? 'x1="0" y1="0" x2="1" y2="0"'
      : dir === "y"
        ? 'x1="0" y1="0" x2="0" y2="1"'
        : 'x1="0" y1="0" x2="1" y2="1"';
  return `<linearGradient id="${id}" ${coords}>${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ""}/>`)
    .join("")}</linearGradient>`;
}

/** Brushed/polished metal edge: dark rim, thin highlights, soft body. */
function metalStops(m) {
  return [
    [0, m.edge],
    [0.012, m.highlight],
    [0.03, m.mid],
    [0.5, m.light ?? m.mid],
    [0.97, m.mid],
    [0.988, m.highlight],
    [1, m.edge],
  ];
}

/** Top-light / bottom-shade overlay that sells the curvature of an edge. */
const SHEEN = linear(
  "sheen",
  [
    [0, "#ffffff", 0.22],
    [0.08, "#ffffff", 0],
    [0.9, "#000000", 0],
    [1, "#000000", 0.25],
  ],
  "y",
);

/** Very subtle reflection over the glass; drawn above the screenshot. */
const GLARE = linear(
  "glare",
  [
    [0, "#ffffff", 0.07],
    [0.42, "#ffffff", 0.015],
    [0.43, "#ffffff", 0],
    [1, "#ffffff", 0],
  ],
  "xy",
);

const glare = (screen) => `<path fill="url(#glare)" d="${path(screen)}"/>`;
const screenEdge = (screen) =>
  `<path fill="none" stroke="#000" stroke-opacity="0.55" stroke-width="3" d="${path(screen)}"/>`;
const previewFill = (fill, screen) => (fill ? `<path fill="${fill}" d="${path(screen)}"/>` : "");

function lens(cx, cy, r) {
  return [
    `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="#07080b"/>`,
    `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r * 0.62)}" fill="#141a26"/>`,
    `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r * 0.34)}" fill="#1e2a40"/>`,
    `<circle cx="${r2(cx - r * 0.25)}" cy="${r2(cy - r * 0.25)}" r="${r2(r * 0.14)}" fill="#ffffff" fill-opacity="0.35"/>`,
  ].join("");
}

function button(x, y, w, h, color, side) {
  const id = `btn${Math.round(x)}${Math.round(y)}`;
  return {
    def: linear(id, [
      [0, side === "left" ? shade(color, -0.35) : shade(color, 0.25)],
      [0.5, color],
      [1, side === "left" ? shade(color, 0.25) : shade(color, -0.35)],
    ]),
    body: `<path fill="url(#${id})" d="${rrect(x, y, w, h, Math.min(w, 6))}"/>`,
  };
}

/** Lightens (amount > 0) or darkens (amount < 0) a hex colour. */
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount)),
  );
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const metal = (base, { light = 0.18, highlight = 0.45, edge = -0.45 } = {}) => ({
  edge: shade(base, edge),
  mid: base,
  light: shade(base, light),
  highlight: shade(base, highlight),
});

/* -------------------------------------------------------------------------- */
/* Builders                                                                   */
/* Each returns { width, height, screen, body, layout?, render(variant, fill) }  */
/* -------------------------------------------------------------------------- */

/**
 * Phones and tablets: metal band, black glass bezel, camera cut-out, buttons.
 * `bezel` is uniform unless `bezelTop` / `bezelBottom` are given.
 */
function handheld(spec) {
  const pad = spec.pad ?? 12;
  const band = spec.band;
  const bx = spec.bezel;
  const bt = spec.bezelTop ?? bx;
  const bb = spec.bezelBottom ?? bx;
  const bodyW = spec.screen.w + 2 * (band + bx);
  const bodyH = spec.screen.h + band * 2 + bt + bb;
  const width = bodyW + 2 * pad;
  const height = bodyH + 2 * (spec.padY ?? 0);
  const body = rect(pad, spec.padY ?? 0, bodyW, bodyH, spec.outerRadius ?? spec.screen.r + band + bx);
  const screen = rect(pad + band + bx, body.y + band + bt, spec.screen.w, spec.screen.h, spec.screen.r);
  const glass = inset(body, band);

  return {
    width,
    height,
    screen,
    body: [inset(body, 1)],
    render(variant, fill) {
      const defs = [linear("metal", metalStops(variant.metal)), SHEEN, GLARE];
      const out = [previewFill(fill, screen)];
      for (const b of spec.buttons ?? []) {
        const x = b.side === "left" ? pad - 7 : pad + bodyW - 3;
        const btn = button(x, body.y + b.y, 10, b.h, variant.metal.mid, b.side);
        defs.push(btn.def);
        out.push(btn.body);
      }
      out.push(`<path fill-rule="evenodd" fill="url(#metal)" d="${path(body)}${path(glass)}"/>`);
      out.push(`<path fill-rule="evenodd" fill="url(#sheen)" d="${path(body)}${path(glass)}"/>`);
      // Antenna lines on the band.
      if (spec.antennas !== false) {
        for (const y of [0.1, 0.9]) {
          out.push(
            `<rect x="${body.x}" y="${r2(body.y + bodyH * y)}" width="${band}" height="7" fill="${variant.metal.edge}" opacity="0.55"/>`,
          );
          out.push(
            `<rect x="${body.x + bodyW - band}" y="${r2(body.y + bodyH * y)}" width="${band}" height="7" fill="${variant.metal.edge}" opacity="0.55"/>`,
          );
        }
      }
      out.push(`<path fill="none" stroke="#000" stroke-opacity="0.45" stroke-width="2" d="${path(inset(body, 1))}"/>`);
      const front = variant.front ?? "#060607";
      out.push(`<path fill-rule="evenodd" fill="${front}" d="${path(glass)}${path(screen)}"/>`);
      out.push(
        `<path fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="2" d="${path(inset(glass, 1))}"/>`,
      );
      out.push(screenEdge(screen));
      out.push(glare(screen));
      out.push(...cutout(spec.cutout, screen, body, { bt, bb, band, front }));
      return svg(width, height, defs, out);
    },
  };
}

function cutout(kind, screen, body, { bt, bb, band, front }) {
  const cx = screen.x + screen.w / 2;
  switch (kind?.type) {
    case "island": {
      const w = kind.w;
      const h = kind.h;
      const y = screen.y + kind.top;
      return [
        `<path fill="#000" d="${rrect(cx - w / 2, y, w, h, h / 2)}"/>`,
        lens(cx + w / 2 - h / 2, y + h / 2, h * 0.24),
      ];
    }
    case "punch":
      return [
        `<circle cx="${r2(kind.x ?? cx)}" cy="${r2(screen.y + kind.top)}" r="${kind.r}" fill="#000"/>`,
        lens(kind.x ?? cx, screen.y + kind.top, kind.r * 0.6),
      ];
    case "notch": {
      const w = kind.w;
      const h = kind.h;
      return [
        `<path fill="${front}" d="${rrect(cx - w / 2, screen.y - 4, w, h + 4, [0, 0, kind.r, kind.r])}"/>`,
        lens(cx, screen.y + h / 2 - 2, h * 0.16),
      ];
    }
    case "home": {
      const y = body.y + band + bt / 2;
      const yb = screen.y + screen.h + bb / 2;
      const r = bb * 0.3;
      return [
        `<path fill="#1a1b1e" d="${rrect(cx - 70, y - 6, 140, 12, 6)}"/>`,
        lens(cx - 130, y, 14),
        `<circle cx="${r2(cx)}" cy="${r2(yb)}" r="${r2(r)}" fill="none" stroke="#8a8b90" stroke-opacity="0.45" stroke-width="4"/>`,
      ];
    }
    case "dot":
      return [lens(kind.x ?? cx, kind.y ?? body.y + band + bt / 2, kind.r ?? 12)];
    default:
      return [];
  }
}

/** Laptops: aluminium lid, black glass bezel, optional notch, base. */
function laptop(spec) {
  const lidW = spec.screen.w + 2 * spec.bezel;
  const lidH = spec.screen.h + spec.bezelTop + spec.bezelBottom;
  const baseW = Math.round(lidW * spec.baseRatio);
  const width = baseW;
  const lidX = (width - lidW) / 2;
  const lid = rect(lidX, 0, lidW, lidH, [spec.lidRadius, spec.lidRadius, 10, 10]);
  const screen = rect(lidX + spec.bezel, spec.bezelTop, spec.screen.w, spec.screen.h, [
    spec.screenRadius,
    spec.screenRadius,
    0,
    0,
  ]);
  const baseY = lidH - 6;
  const baseH = spec.baseHeight;
  const height = baseY + baseH;
  const base = rect(0, baseY, baseW, baseH, [8, 8, baseH * 0.9, baseH * 0.9]);

  return {
    width,
    height,
    screen,
    body: [inset(lid, 1), inset({ ...base, r: base.r }, 1)],
    render(v, fill) {
      const defs = [
        GLARE,
        linear(
          "deck",
          [
            [0, shade(v.alu, 0.35)],
            [0.18, shade(v.alu, 0.12)],
            [0.55, v.alu],
            [1, shade(v.alu, -0.45)],
          ],
          "y",
        ),
        linear("deckx", [
          [0, "#000", 0.25],
          [0.04, "#000", 0],
          [0.96, "#000", 0],
          [1, "#000", 0.25],
        ]),
        linear(
          "hinge",
          [
            [0, "#000", 0.7],
            [1, "#000", 0],
          ],
          "y",
        ),
        linear("lidedge", metalStops(metal(v.alu))),
      ];
      const glass = inset(lid, spec.rim);
      const out = [previewFill(fill, screen)];
      out.push(`<path fill-rule="evenodd" fill="url(#lidedge)" d="${path(lid)}${path(glass)}"/>`);
      out.push(`<path fill-rule="evenodd" fill="#050506" d="${path(glass)}${path(screen)}"/>`);
      out.push(
        `<path fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" d="${path(inset(glass, 1))}"/>`,
      );
      out.push(screenEdge(screen));
      out.push(glare(screen));
      if (spec.notch) {
        const nx = screen.x + screen.w / 2 - spec.notch.w / 2;
        out.push(
          `<path fill="#050506" d="${rrect(nx, screen.y - 4, spec.notch.w, spec.notch.h + 4, [0, 0, 16, 16])}"/>`,
        );
        out.push(lens(screen.x + screen.w / 2, screen.y + spec.notch.h / 2, 8));
      } else {
        out.push(lens(screen.x + screen.w / 2, spec.bezelTop / 2 + spec.rim / 2, 8));
      }
      // Base: deck, front lip, thumb notch, hinge shadow.
      out.push(`<path fill="url(#deck)" d="${path(base)}"/>`);
      out.push(`<path fill="url(#deckx)" d="${path(base)}"/>`);
      out.push(`<path fill="url(#hinge)" d="${rrect(lidX + 30, baseY, lidW - 60, 16, 0)}"/>`);
      out.push(
        `<path fill="${shade(v.alu, -0.3)}" d="${rrect(width / 2 - baseW * 0.075, baseY, baseW * 0.15, baseH * 0.32, [0, 0, 14, 14])}"/>`,
      );
      out.push(`<path stroke="#fff" stroke-opacity="0.45" stroke-width="2" d="M12,${baseY + 1.5} H${width - 12}"/>`);
      return svg(width, height, defs, out);
    },
  };
}

/** All-in-one / external display on a stand (front view). */
function monitor(spec) {
  const w = spec.screen.w + 2 * spec.bezel;
  const displayH = spec.screen.h + spec.bezel * 2 + (spec.chin ?? 0);
  const neckW = spec.neckW;
  const neckH = spec.neckH;
  const footH = spec.footH;
  const width = w;
  const height = displayH + neckH + footH;
  const display = rect(0, 0, w, displayH, spec.radius);
  const screen = rect(spec.bezel, spec.bezel, spec.screen.w, spec.screen.h, 0);
  const neck = rect((w - neckW) / 2, displayH - 10, neckW, neckH + 10, 0);
  const foot = rect((w - spec.footW) / 2, displayH + neckH - 4, spec.footW, footH + 4, [6, 6, footH / 2, footH / 2]);

  return {
    width,
    height,
    screen,
    body: [inset(display, 1), neck, inset(foot, 1)],
    render(v, fill) {
      const defs = [
        GLARE,
        linear("standg", [
          [0, shade(v.stand, -0.35)],
          [0.15, shade(v.stand, 0.1)],
          [0.5, v.stand],
          [0.85, shade(v.stand, 0.1)],
          [1, shade(v.stand, -0.35)],
        ]),
        linear(
          "neckshade",
          [
            [0, "#000", 0.45],
            [0.25, "#000", 0],
          ],
          "y",
        ),
        linear(
          "chin",
          [
            [0, shade(v.body, 0.18)],
            [1, shade(v.body, -0.12)],
          ],
          "y",
        ),
        linear("rim", metalStops(metal(v.body, { highlight: 0.35, edge: -0.35 }))),
      ];
      const glassFace = rect(spec.rim, spec.rim, w - 2 * spec.rim, spec.screen.h + 2 * spec.bezel - spec.rim, [
        Math.max(0, display.r - spec.rim),
        Math.max(0, display.r - spec.rim),
        0,
        0,
      ]);
      const out = [previewFill(fill, screen)];
      out.push(`<path fill="url(#standg)" d="${path(neck)}"/>`);
      out.push(`<path fill="url(#neckshade)" d="${path(neck)}"/>`);
      out.push(`<path fill="url(#standg)" d="${path(foot)}"/>`);
      out.push(
        `<path fill-rule="evenodd" fill="${spec.chin ? "url(#chin)" : "url(#rim)"}" d="${path(display)}${path(spec.chin ? screen : glassFace)}"/>`,
      );
      if (spec.chin) {
        // Glass face (light bezel) above a coloured chin.
        const face = rect(0, 0, w, spec.screen.h + spec.bezel * 2, [display.r, display.r, 0, 0]);
        out.push(`<path fill-rule="evenodd" fill="${v.bezel}" d="${path(face)}${path(screen)}"/>`);
        out.push(`<path stroke="#000" stroke-opacity="0.12" stroke-width="2" d="M0,${face.h} H${w}"/>`);
      } else {
        out.push(`<path fill-rule="evenodd" fill="#050506" d="${path(glassFace)}${path(screen)}"/>`);
      }
      out.push(
        `<path fill="none" stroke="#000" stroke-opacity="0.3" stroke-width="3" d="${path(inset(display, 1.5))}"/>`,
      );
      out.push(screenEdge(screen));
      out.push(glare(screen));
      out.push(lens(w / 2, spec.bezel / 2, 9));
      return svg(width, height, defs, out);
    },
  };
}

/** Smartwatch: case, crown, button, band. */
function watch(spec) {
  const caseW = spec.screen.w + 2 * (spec.bezel + spec.rim);
  const caseH = spec.screen.h + 2 * (spec.bezel + spec.rim);
  const bandW = Math.round(caseW * 0.78);
  const bandL = spec.bandLength;
  const crown = 26;
  const width = caseW + crown + 4;
  const height = caseH + bandL * 2;
  const kase = rect(0, bandL, caseW, caseH, spec.radius);
  const screen = rect(
    spec.rim + spec.bezel,
    bandL + spec.rim + spec.bezel,
    spec.screen.w,
    spec.screen.h,
    spec.screen.r,
  );
  const bandTop = rect((caseW - bandW) / 2, 0, bandW, bandL + 40, [18, 18, 0, 0]);
  const bandBottom = rect((caseW - bandW) / 2, bandL + caseH - 40, bandW, bandL + 40, [0, 0, 18, 18]);

  return {
    width,
    height,
    screen,
    body: [inset(kase, 1), bandTop, bandBottom],
    render(v, fill) {
      const defs = [
        GLARE,
        SHEEN,
        linear("case", metalStops(metal(v.case))),
        linear("band", [
          [0, shade(v.band, -0.25)],
          [0.12, v.band],
          [0.88, v.band],
          [1, shade(v.band, -0.25)],
        ]),
        linear(
          "bandfade",
          [
            [0, "#000", 0.2],
            [0.5, "#000", 0],
            [1, "#000", 0.2],
          ],
          "y",
        ),
        linear(
          "crown",
          [
            [0, shade(v.case, -0.3)],
            [0.5, shade(v.case, 0.3)],
            [1, shade(v.case, -0.3)],
          ],
          "y",
        ),
      ];
      const glass = inset(kase, spec.rim);
      const out = [previewFill(fill, screen)];
      out.push(`<path fill="url(#band)" d="${path(bandTop)}"/>`);
      out.push(`<path fill="url(#band)" d="${path(bandBottom)}"/>`);
      out.push(`<path fill="url(#bandfade)" d="${rrect(bandTop.x, 0, bandW, height, 18)}"/>`);
      for (let i = 1; i < 6; i++) {
        out.push(
          `<rect x="${bandTop.x + 10}" y="${r2(bandL + caseH + 40 + i * (bandL / 6))}" width="${bandW - 20}" height="2" fill="#000" opacity="0.12"/>`,
        );
      }
      // Crown with ridges and side button.
      const crownY = bandL + caseH * 0.28;
      out.push(`<path fill="url(#crown)" d="${rrect(caseW - 6, crownY, crown, caseH * 0.2, 8)}"/>`);
      for (let i = 1; i < 8; i++) {
        out.push(
          `<rect x="${caseW}" y="${r2(crownY + (i * caseH * 0.2) / 8)}" width="${crown - 6}" height="2" fill="#000" opacity="0.25"/>`,
        );
      }
      out.push(`<path fill="url(#crown)" d="${rrect(caseW - 6, bandL + caseH * 0.58, 14, caseH * 0.2, 6)}"/>`);
      out.push(`<path fill-rule="evenodd" fill="url(#case)" d="${path(kase)}${path(glass)}"/>`);
      out.push(`<path fill-rule="evenodd" fill="url(#sheen)" d="${path(kase)}${path(glass)}"/>`);
      out.push(`<path fill-rule="evenodd" fill="#030304" d="${path(glass)}${path(screen)}"/>`);
      out.push(`<path fill="none" stroke="#fff" stroke-opacity="0.2" stroke-width="2" d="${path(inset(glass, 1))}"/>`);
      out.push(screenEdge(screen));
      out.push(glare(screen));
      return svg(width, height, defs, out);
    },
  };
}

/**
 * Browser and app windows. The screen height follows the screenshot
 * (stretch-y layout); `chrome` draws the toolbar.
 */
function windowFrame(spec) {
  const pad = spec.pad ?? 0;
  const width = spec.screen.w + 2 * (pad + 1);
  const top = spec.toolbar + pad;
  const height = top + spec.screen.h + pad + 1;
  const outer = rect(0, 0, width, height, spec.radius);
  const screen = rect(
    pad + 1,
    top,
    spec.screen.w,
    spec.screen.h,
    pad ? spec.innerRadius : [0, 0, spec.radius - 1, spec.radius - 1],
  );
  const stretch = { start: top + 40, end: height - Math.max(40, spec.radius + pad + 8) };

  return {
    width,
    height,
    screen,
    body: [outer],
    layout: { type: "stretch-y", start: stretch.start, end: stretch.end, minScreenHeight: 360, maxScreenHeight: 3600 },
    render(v, fill) {
      const defs = [];
      if (v.gradient)
        defs.push(
          linear(
            "framebg",
            v.gradient.map((c, i, all) => [i / (all.length - 1), c]),
          ),
        );
      const out = [previewFill(fill, screen)];
      out.push(
        `<path fill-rule="evenodd" fill="${v.gradient ? "url(#framebg)" : v.chrome}" d="${path(outer)}${path(screen)}"/>`,
      );
      out.push(
        `<path fill="none" stroke="${v.border}" stroke-width="1" d="${rrect(0.5, 0.5, width - 1, height - 1, spec.radius)}"/>`,
      );
      if (!pad) out.push(`<path stroke="${v.border}" stroke-width="1" d="M1,${spec.toolbar - 0.5} H${width - 1}"/>`);
      out.push(...spec.chrome(v, width));
      return svg(width, height, defs, out);
    },
  };
}

const traffic = (y, x = 22) => [
  `<circle cx="${x}" cy="${y}" r="6.5" fill="#ff5f57"/>`,
  `<circle cx="${x + 21}" cy="${y}" r="6.5" fill="#febc2e"/>`,
  `<circle cx="${x + 42}" cy="${y}" r="6.5" fill="#28c840"/>`,
];
const icon = (d, color, w = 1.8) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const chevrons = (x, y, color) => [
  icon(`M${x + 5},${y - 6} l-6,6 l6,6`, color),
  icon(`M${x + 25},${y - 6} l6,6 l-6,6`, color),
];
const pill = (x, y, w, h, color, r = h / 2) => `<path fill="${color}" d="${rrect(x, y, w, h, r)}"/>`;

function safariChrome(v, width) {
  const y = 26;
  const fw = 620;
  const fx = (width - fw) / 2;
  return [
    ...traffic(y),
    `<rect x="96" y="${y - 7}" width="18" height="14" rx="3" fill="none" stroke="${v.icon}" stroke-width="1.6"/>`,
    `<path d="M102,${y - 7} V${y + 7}" stroke="${v.icon}" stroke-width="1.6"/>`,
    ...chevrons(132, y, v.icon),
    pill(fx, 10, fw, 32, v.field, 9),
    `<path fill="${v.icon}" d="${rrect(width / 2 - 104, y - 3, 9, 8, 1.5)}"/>`,
    icon(`M${width / 2 - 102},${y - 2.5} v-2.5 a2.5,2.5 0 0 1 5,0 v2.5`, v.icon, 1.5),
    pill(width / 2 - 86, y - 4, 190, 8, v.ink),
    icon(`M${width - 100},${y + 5} v-12 m-5,5 l5,-5 l5,5`, v.icon),
    icon(`M${width - 68},${y} h14 m-7,-7 v14`, v.icon),
    `<rect x="${width - 40}" y="${y - 6}" width="14" height="12" rx="2.5" fill="none" stroke="${v.icon}" stroke-width="1.6"/>`,
  ];
}

function chromeChrome(v, width) {
  const tabY = 8;
  const bar = 42;
  return [
    `<path fill="${v.toolbar}" d="${rrect(1, bar, width - 2, 46, 0)}"/>`,
    ...traffic(22),
    `<path fill="${v.toolbar}" d="M90,${bar} q8,0 8,-8 V${tabY + 10} q0,-10 10,-10 H318 q10,0 10,10 V${bar - 8} q0,8 8,8 Z"/>`,
    pill(118, 20, 14, 14, v.icon, 4),
    pill(142, 23, 120, 8, v.ink),
    icon(`M300,21 l8,8 m0,-8 l-8,8`, v.icon, 1.5),
    icon(`M350,25 h12 m-6,-6 v12`, v.icon),
    ...chevrons(20, bar + 23, v.icon),
    icon(`M84,${bar + 16} a7,7 0 1 0 7,7 m0,-7 v5 h-5`, v.icon),
    pill(112, bar + 8, width - 200, 30, v.field),
    pill(140, bar + 19, 220, 8, v.ink),
    `<circle cx="${width - 52}" cy="${bar + 23}" r="9" fill="${v.icon}" opacity="0.6"/>`,
    icon(`M${width - 24},${bar + 17} v0.1 m0,6 v0.1 m0,6 v0.1`, v.icon, 2.4),
  ];
}

function arcChrome() {
  return [...traffic(20, 18)];
}

function appWindowChrome(v, width) {
  return [...traffic(26), pill(width / 2 - 70, 22, 140, 8, v.ink)];
}

/** Floating glass window (spatial computing style). */
function glassWindow(spec) {
  const g = spec.glass;
  const width = spec.screen.w + 2 * g;
  const winH = spec.screen.h + 2 * g;
  const height = winH + 60;
  const win = rect(0, 0, width, winH, spec.screen.r + g);
  const screen = rect(g, g, spec.screen.w, spec.screen.h, spec.screen.r);
  return {
    width,
    height,
    screen,
    body: [win],
    layout: { type: "stretch-y", start: g + 60, end: winH - g - 60, minScreenHeight: 360, maxScreenHeight: 3600 },
    render(v, fill) {
      const defs = [
        linear(
          "glass",
          [
            [0, "#ffffff", v.alpha + 0.12],
            [0.5, "#ffffff", v.alpha],
            [1, "#ffffff", v.alpha + 0.06],
          ],
          "xy",
        ),
      ];
      return svg(width, height, defs, [
        previewFill(fill, screen),
        `<path fill-rule="evenodd" fill="url(#glass)" d="${path(win)}${path(screen)}"/>`,
        `<path fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2" d="${path(inset(win, 1))}"/>`,
        `<path fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1.5" d="${path(screen)}"/>`,
        pill(width / 2 - 90, winH + 26, 180, 14, "#ffffff", 7).replace(
          'fill="#ffffff"',
          `fill="#ffffff" fill-opacity="${v.alpha + 0.35}"`,
        ),
        `<circle cx="${width / 2 + 120}" cy="${winH + 33}" r="7" fill="#ffffff" fill-opacity="${v.alpha + 0.25}"/>`,
      ]);
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Palettes                                                                   */
/* -------------------------------------------------------------------------- */

const TITANIUM = {
  black: { name: "Black", swatch: "#3b3a38", metal: metal("#3b3a38") },
  white: { name: "White", swatch: "#e3e1dc", metal: metal("#d8d6d0", { light: 0.3 }) },
  natural: { name: "Natural", swatch: "#bab4a9", metal: metal("#aea89d") },
  desert: { name: "Desert", swatch: "#bfa48f", metal: metal("#b39a85") },
};
const ALUMINIUM_PHONE = {
  black: { name: "Black", swatch: "#2e2f33", metal: metal("#34353a") },
  white: { name: "White", swatch: "#eceae6", metal: metal("#dcdad6", { light: 0.3 }) },
  pink: { name: "Pink", swatch: "#e9b9c9", metal: metal("#e2aebf") },
  teal: { name: "Teal", swatch: "#a9cfc8", metal: metal("#9cc4bd") },
  blue: { name: "Blue", swatch: "#8c9fe0", metal: metal("#8597d6") },
};
const COMPACT = {
  midnight: { name: "Midnight", swatch: "#232a33", metal: metal("#2a313a"), front: "#08090a" },
  starlight: { name: "Starlight", swatch: "#f0ebe2", metal: metal("#e4dfd5", { light: 0.3 }), front: "#f4f3f1" },
  red: { name: "Red", swatch: "#b01e2a", metal: metal("#b01e2a"), front: "#08090a" },
};
const PIXEL = {
  obsidian: { name: "Obsidian", swatch: "#2b2d30", metal: metal("#36383c") },
  porcelain: { name: "Porcelain", swatch: "#ebe5da", metal: metal("#e0d9cd", { light: 0.3 }) },
  hazel: { name: "Hazel", swatch: "#a7ad9f", metal: metal("#9da394") },
  rose: { name: "Rose", swatch: "#e8c8c2", metal: metal("#dfbab3") },
};
const ULTRA = {
  black: { name: "Titanium Black", swatch: "#2f3033", metal: metal("#38393d") },
  gray: { name: "Titanium Gray", swatch: "#8f8e8a", metal: metal("#8a8985") },
  violet: { name: "Titanium Violet", swatch: "#5d5470", metal: metal("#5f5674") },
  yellow: { name: "Titanium Yellow", swatch: "#e8dcab", metal: metal("#d8cd9d") },
};
const FOLD = {
  navy: { name: "Navy", swatch: "#2b3448", metal: metal("#30394d") },
  silver: { name: "Silver Shadow", swatch: "#c9cbd0", metal: metal("#bfc1c6") },
  pink: { name: "Pink", swatch: "#e8c4c8", metal: metal("#dbb5b9") },
};
const SLATE = {
  graphite: { name: "Space Black", swatch: "#2f3034", metal: metal("#3a3b40") },
  silver: { name: "Silver", swatch: "#d7d8dc", metal: metal("#c9cacf", { light: 0.3 }) },
};
const MINI = {
  gray: { name: "Space Gray", swatch: "#5c5d61", metal: metal("#5f6065") },
  starlight: { name: "Starlight", swatch: "#e7e1d6", metal: metal("#d9d3c8") },
  purple: { name: "Purple", swatch: "#b7aad3", metal: metal("#ab9dc8") },
  blue: { name: "Blue", swatch: "#9fb4d4", metal: metal("#93a9ca") },
};
const ANDROID_TAB = {
  graphite: { name: "Graphite", swatch: "#3a3b3f", metal: metal("#43444a") },
  beige: { name: "Beige", swatch: "#e2d8c8", metal: metal("#d6ccbc") },
};
const SURFACE = {
  platinum: { name: "Platinum", swatch: "#c9cacd", metal: metal("#bcbdc1") },
  graphite: { name: "Graphite", swatch: "#3d3e42", metal: metal("#46474c") },
};

const LAPTOP_ALU = {
  midnight: { name: "Midnight", swatch: "#2e3641", alu: "#323a46" },
  starlight: { name: "Starlight", swatch: "#e3ddd1", alu: "#d8d1c4" },
  silver: { name: "Silver", swatch: "#d6d7da", alu: "#c8c9cd" },
  gray: { name: "Space Gray", swatch: "#7d7e82", alu: "#7a7b80" },
};
const PRO_ALU = {
  black: { name: "Space Black", swatch: "#2b2b2d", alu: "#303033" },
  silver: { name: "Silver", swatch: "#d6d7da", alu: "#c8c9cd" },
};
const WIN_LAPTOP = {
  graphite: { name: "Graphite", swatch: "#3b3c40", alu: "#3f4045" },
  platinum: { name: "Platinum", swatch: "#d5d6d9", alu: "#c6c7cb" },
};
const ALL_IN_ONE = {
  blue: { name: "Blue", swatch: "#4f7fbd", body: "#5b8ac6", stand: "#6f98cf", bezel: "#eef0f3" },
  green: { name: "Green", swatch: "#4f9a76", body: "#5ba583", stand: "#70b293", bezel: "#eef0f3" },
  pink: { name: "Pink", swatch: "#e0838f", body: "#e48f9b", stand: "#e8a1ab", bezel: "#eef0f3" },
  silver: { name: "Silver", swatch: "#cfd0d4", body: "#d2d3d7", stand: "#dadbdf", bezel: "#eef0f3" },
  orange: { name: "Orange", swatch: "#e9874e", body: "#ec925c", stand: "#efa574", bezel: "#eef0f3" },
};
const DISPLAY = {
  silver: { name: "Silver", swatch: "#cdced2", body: "#c4c5c9", stand: "#cfd0d4" },
  black: { name: "Black", swatch: "#2d2e31", body: "#2f3033", stand: "#3a3b3f" },
};
const WATCH = {
  midnight: { name: "Jet Black", swatch: "#1d1e21", case: "#2b2c30", band: "#1f2125" },
  silver: { name: "Silver", swatch: "#d3d4d8", case: "#c7c8cc", band: "#d9dce3" },
  rose: { name: "Rose Gold", swatch: "#e5c3b6", case: "#d9b3a5", band: "#e9cfc6" },
  blue: { name: "Storm Blue", swatch: "#4b5a75", case: "#c7c8cc", band: "#4b5a75" },
};
const BROWSER_LIGHT = {
  chrome: "#f2f2f4",
  toolbar: "#ffffff",
  border: "#d4d4d9",
  field: "#ffffff",
  ink: "#c6c6cc",
  icon: "#8e8e96",
};
const BROWSER_DARK = {
  chrome: "#26262b",
  toolbar: "#35353b",
  border: "#3c3c43",
  field: "#3a3a41",
  ink: "#56565e",
  icon: "#8d8d97",
};
const SAFARI = {
  light: { name: "Light", swatch: "#f2f2f4", ...BROWSER_LIGHT, field: "#e3e3e8" },
  dark: { name: "Dark", swatch: "#26262b", ...BROWSER_DARK },
};
const CHROMIUM = {
  light: { name: "Light", swatch: "#dfe3ea", ...BROWSER_LIGHT, chrome: "#dfe3ea", field: "#eef1f5" },
  dark: { name: "Dark", swatch: "#1f2023", ...BROWSER_DARK, chrome: "#1f2023", toolbar: "#35363a", field: "#202124" },
};
const ARC = {
  lavender: {
    name: "Lavender",
    swatch: "#b8a6f0",
    gradient: ["#c6b6f5", "#a9c6f7"],
    border: "#a99bd8",
    ink: "#fff",
    icon: "#fff",
  },
  sunset: {
    name: "Sunset",
    swatch: "#f2a48b",
    gradient: ["#f7b59b", "#f08ca0"],
    border: "#d98d82",
    ink: "#fff",
    icon: "#fff",
  },
  midnight: {
    name: "Midnight",
    swatch: "#2a2e45",
    gradient: ["#2b2f48", "#3b2c4a"],
    border: "#3d4160",
    ink: "#fff",
    icon: "#fff",
  },
};
const APP_WINDOW = {
  light: { name: "Light", swatch: "#ececef", ...BROWSER_LIGHT, chrome: "#ececef", ink: "#c6c6cc" },
  dark: { name: "Dark", swatch: "#2a2a2f", ...BROWSER_DARK, chrome: "#2a2a2f" },
};
const GLASS = {
  clear: { name: "Clear", swatch: "#e8ecf2", alpha: 0.22 },
  frosted: { name: "Frosted", swatch: "#c9d1dc", alpha: 0.45 },
};

/* -------------------------------------------------------------------------- */
/* Catalog                                                                    */
/* -------------------------------------------------------------------------- */

const ISLAND = { type: "island", w: 375, h: 110, top: 34 };

const DEVICES = [
  // Phones
  {
    id: "phone-pro",
    name: "Phone Pro 6.3″",
    category: "phone",
    variants: TITANIUM,
    shape: handheld({
      screen: { w: 1206, h: 2622, r: 172 },
      band: 16,
      bezel: 42,
      cutout: ISLAND,
      buttons: [
        { side: "left", y: 400, h: 100 },
        { side: "left", y: 580, h: 200 },
        { side: "left", y: 820, h: 200 },
        { side: "right", y: 680, h: 300 },
        { side: "right", y: 1560, h: 220 },
      ],
    }),
  },
  {
    id: "phone-pro-max",
    name: "Phone Pro Max 6.9″",
    category: "phone",
    variants: TITANIUM,
    shape: handheld({
      screen: { w: 1320, h: 2868, r: 186 },
      band: 17,
      bezel: 44,
      cutout: ISLAND,
      buttons: [
        { side: "left", y: 430, h: 105 },
        { side: "left", y: 620, h: 215 },
        { side: "left", y: 880, h: 215 },
        { side: "right", y: 730, h: 320 },
        { side: "right", y: 1700, h: 240 },
      ],
    }),
  },
  {
    id: "phone",
    name: "Phone 6.1″",
    category: "phone",
    variants: ALUMINIUM_PHONE,
    shape: handheld({
      screen: { w: 1179, h: 2556, r: 166 },
      band: 20,
      bezel: 48,
      cutout: ISLAND,
      buttons: [
        { side: "left", y: 390, h: 95 },
        { side: "left", y: 560, h: 195 },
        { side: "left", y: 800, h: 195 },
        { side: "right", y: 660, h: 290 },
      ],
    }),
  },
  {
    id: "phone-compact",
    name: "Phone Compact (home button)",
    category: "phone",
    variants: COMPACT,
    shape: handheld({
      screen: { w: 750, h: 1334, r: 0 },
      band: 12,
      bezel: 46,
      bezelTop: 210,
      bezelBottom: 210,
      outerRadius: 120,
      cutout: { type: "home" },
      buttons: [
        { side: "left", y: 230, h: 60 },
        { side: "left", y: 340, h: 110 },
        { side: "left", y: 480, h: 110 },
        { side: "right", y: 360, h: 140 },
      ],
    }),
  },
  {
    id: "android-pro",
    name: "Android Pro 6.3″",
    category: "phone",
    variants: PIXEL,
    shape: handheld({
      screen: { w: 1280, h: 2856, r: 150 },
      band: 18,
      bezel: 44,
      cutout: { type: "punch", r: 30, top: 66 },
      buttons: [
        { side: "right", y: 600, h: 170 },
        { side: "right", y: 860, h: 320 },
      ],
    }),
  },
  {
    id: "android-ultra",
    name: "Android Ultra 6.8″",
    category: "phone",
    variants: ULTRA,
    shape: handheld({
      screen: { w: 1440, h: 3120, r: 42 },
      band: 16,
      bezel: 40,
      outerRadius: 96,
      cutout: { type: "punch", r: 26, top: 60 },
      buttons: [
        { side: "right", y: 640, h: 330 },
        { side: "right", y: 1060, h: 190 },
      ],
    }),
  },
  {
    id: "android-fold",
    name: "Android Fold (open)",
    category: "phone",
    variants: FOLD,
    shape: handheld({
      screen: { w: 2176, h: 1812, r: 46 },
      band: 14,
      bezel: 52,
      outerRadius: 92,
      antennas: false,
      cutout: { type: "punch", r: 22, top: 58, x: undefined },
      buttons: [
        { side: "right", y: 240, h: 240 },
        { side: "right", y: 540, h: 160 },
      ],
    }),
  },
  // Tablets
  {
    id: "tablet-pro-13",
    name: "Tablet Pro 13″",
    category: "tablet",
    variants: SLATE,
    shape: handheld({
      screen: { w: 2064, h: 2752, r: 64 },
      band: 12,
      bezel: 80,
      outerRadius: 150,
      antennas: false,
      cutout: { type: "dot", r: 12 },
      buttons: [
        { side: "right", y: 160, h: 120 },
        { side: "right", y: 320, h: 120 },
      ],
    }),
  },
  {
    id: "tablet-pro-13-landscape",
    name: "Tablet Pro 13″ landscape",
    category: "tablet",
    variants: SLATE,
    shape: handheld({
      screen: { w: 2752, h: 2064, r: 64 },
      band: 12,
      bezel: 80,
      outerRadius: 150,
      antennas: false,
      cutout: { type: "dot", r: 12 },
    }),
  },
  {
    id: "tablet-pro-11",
    name: "Tablet Pro 11″",
    category: "tablet",
    variants: SLATE,
    shape: handheld({
      screen: { w: 1668, h: 2420, r: 60 },
      band: 12,
      bezel: 76,
      outerRadius: 142,
      antennas: false,
      cutout: { type: "dot", r: 11 },
      buttons: [
        { side: "right", y: 150, h: 110 },
        { side: "right", y: 300, h: 110 },
      ],
    }),
  },
  {
    id: "tablet-mini",
    name: "Tablet Mini 8.3″",
    category: "tablet",
    variants: MINI,
    shape: handheld({
      screen: { w: 1488, h: 2266, r: 56 },
      band: 12,
      bezel: 84,
      outerRadius: 140,
      antennas: false,
      cutout: { type: "dot", r: 11 },
      buttons: [{ side: "right", y: 150, h: 120 }],
    }),
  },
  {
    id: "android-tablet",
    name: "Android Tablet 11″",
    category: "tablet",
    variants: ANDROID_TAB,
    shape: handheld({
      screen: { w: 1600, h: 2560, r: 40 },
      band: 12,
      bezel: 74,
      outerRadius: 110,
      antennas: false,
      cutout: { type: "dot", r: 11 },
    }),
  },
  {
    id: "tablet-2in1",
    name: "2-in-1 Tablet 13″",
    category: "tablet",
    variants: SURFACE,
    shape: handheld({
      screen: { w: 2880, h: 1920, r: 26 },
      band: 10,
      bezel: 86,
      outerRadius: 70,
      antennas: false,
      cutout: { type: "dot", r: 11 },
    }),
  },
  // Laptops
  {
    id: "laptop-air",
    name: "Laptop Air 13″",
    category: "laptop",
    variants: LAPTOP_ALU,
    shape: laptop({
      screen: { w: 2560, h: 1664 },
      bezel: 56,
      bezelTop: 58,
      bezelBottom: 82,
      rim: 9,
      lidRadius: 56,
      screenRadius: 20,
      baseRatio: 1.12,
      baseHeight: 64,
      notch: { w: 300, h: 64 },
    }),
  },
  {
    id: "laptop-pro-14",
    name: "Laptop Pro 14″",
    category: "laptop",
    variants: PRO_ALU,
    shape: laptop({
      screen: { w: 3024, h: 1964 },
      bezel: 58,
      bezelTop: 60,
      bezelBottom: 96,
      rim: 10,
      lidRadius: 64,
      screenRadius: 24,
      baseRatio: 1.11,
      baseHeight: 86,
      notch: { w: 360, h: 74 },
    }),
  },
  {
    id: "laptop-pro-16",
    name: "Laptop Pro 16″",
    category: "laptop",
    variants: PRO_ALU,
    shape: laptop({
      screen: { w: 3456, h: 2234 },
      bezel: 62,
      bezelTop: 64,
      bezelBottom: 104,
      rim: 10,
      lidRadius: 70,
      screenRadius: 26,
      baseRatio: 1.1,
      baseHeight: 94,
      notch: { w: 380, h: 78 },
    }),
  },
  {
    id: "laptop",
    name: "Laptop 14″",
    category: "laptop",
    variants: WIN_LAPTOP,
    shape: laptop({
      screen: { w: 2880, h: 1800 },
      bezel: 64,
      bezelTop: 92,
      bezelBottom: 124,
      rim: 8,
      lidRadius: 40,
      screenRadius: 0,
      baseRatio: 1.08,
      baseHeight: 84,
    }),
  },
  // Desktops
  {
    id: "all-in-one",
    name: "All-in-One 24″",
    category: "desktop",
    variants: ALL_IN_ONE,
    shape: monitor({
      screen: { w: 4480, h: 2520 },
      bezel: 110,
      chin: 430,
      radius: 90,
      rim: 0,
      neckW: 1260,
      neckH: 720,
      footW: 1500,
      footH: 44,
    }),
  },
  {
    id: "studio-display",
    name: "Studio Display 27″",
    category: "desktop",
    variants: DISPLAY,
    shape: monitor({
      screen: { w: 5120, h: 2880 },
      bezel: 120,
      radius: 60,
      rim: 24,
      neckW: 1000,
      neckH: 860,
      footW: 1500,
      footH: 50,
    }),
  },
  // Watch & other
  {
    id: "watch",
    name: "Watch 46mm",
    category: "watch",
    variants: WATCH,
    shape: watch({ screen: { w: 416, h: 496, r: 112 }, bezel: 26, rim: 24, radius: 168, bandLength: 330 }),
  },
  {
    id: "glass-window",
    name: "Spatial Window",
    category: "other",
    variants: GLASS,
    shape: glassWindow({ screen: { w: 1600, h: 1000, r: 44 }, glass: 26 }),
    screenFill: "#ffffff",
  },
  // Windows
  {
    id: "browser",
    name: "Browser (Safari style)",
    category: "browser",
    variants: SAFARI,
    screenFill: "#ffffff",
    shape: windowFrame({ screen: { w: 1440, h: 900 }, toolbar: 52, radius: 14, chrome: safariChrome }),
  },
  {
    id: "browser-chromium",
    name: "Browser (Chromium style)",
    category: "browser",
    variants: CHROMIUM,
    screenFill: "#ffffff",
    shape: windowFrame({ screen: { w: 1440, h: 900 }, toolbar: 88, radius: 12, chrome: chromeChrome }),
  },
  {
    id: "browser-minimal",
    name: "Browser (minimal)",
    category: "browser",
    variants: ARC,
    screenFill: "#ffffff",
    shape: windowFrame({
      screen: { w: 1440, h: 900 },
      toolbar: 30,
      pad: 10,
      radius: 18,
      innerRadius: 10,
      chrome: arcChrome,
    }),
  },
  {
    id: "app-window",
    name: "App Window",
    category: "browser",
    variants: APP_WINDOW,
    screenFill: "#ffffff",
    shape: windowFrame({ screen: { w: 1440, h: 900 }, toolbar: 52, radius: 14, chrome: appWindowChrome }),
  },
];

/* -------------------------------------------------------------------------- */
/* Output                                                                     */
/* -------------------------------------------------------------------------- */

const toRect = (b) => ({
  x: r2(b.x),
  y: r2(b.y),
  width: r2(b.w),
  height: r2(b.h),
  radius: Array.isArray(b.r) ? b.r.map(r2) : r2(b.r),
});

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const catalog = [];
let bytes = 0;
for (const device of DEVICES) {
  const { shape } = device;
  const variants = [];
  for (const [variantId, variant] of Object.entries(device.variants)) {
    const file = `${device.id}-${variantId}.svg`;
    const content = shape.render(variant, null);
    writeFileSync(join(OUT_DIR, file), content);
    bytes += content.length;
    variants.push({ id: variantId, name: variant.name, swatch: variant.swatch, frameSrc: `/devices/${file}` });
  }
  const first = Object.values(device.variants)[0];
  const preview = shape.render(first, PREVIEW_FILL);
  writeFileSync(join(OUT_DIR, `${device.id}-preview.svg`), preview);
  catalog.push({
    id: device.id,
    name: device.name,
    category: device.category,
    frame: { width: r2(shape.width), height: r2(shape.height) },
    screen: toRect(shape.screen),
    body: shape.body.map(toRect),
    screenFill: device.screenFill ?? "#000000",
    layout: shape.layout ?? { type: "fixed" },
    variants,
    previewSrc: `/devices/${device.id}-preview.svg`,
  });
}

writeFileSync(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(
  `wrote ${catalog.length} devices, ${catalog.reduce((n, d) => n + d.variants.length, 0)} frames (${Math.round(bytes / 1024)} KB) and src/editor/devices/catalog.json`,
);
