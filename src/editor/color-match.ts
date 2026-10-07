import type { GradientConfig, MeshBlob } from "@/editor/types";

/**
 * "Match colors": a background generated from the screenshot's own colours.
 *
 * Everything is local and deterministic: the screenshot is sampled on a tiny
 * canvas, pixels are bucketed by hue, and the strongest distinct hues drive a
 * mesh gradient whose saturation and lightness are set per variant — raw
 * dominant colours are never used as-is, so the result doesn't turn muddy.
 */

type Hsl = { h: number; s: number; l: number };

export type MatchVariant = "soft" | "vivid" | "dark";

export const MATCH_VARIANTS: { id: MatchVariant; name: string }[] = [
  { id: "soft", name: "Soft" },
  { id: "vivid", name: "Vivid" },
  { id: "dark", name: "Dark" },
];

const HUE_BUCKETS = 24;
const MIN_HUE_DISTANCE = 28;
const MAX_COLORS = 4;

/**
 * Picks up to four distinct, characteristic hues from RGBA pixel data.
 * Near-white, near-black, grey and mostly transparent pixels are ignored; if
 * nothing colourful remains, a neutral palette is derived instead.
 */
export function extractPalette(pixels: ArrayLike<number>): Hsl[] {
  const buckets = Array.from({ length: HUE_BUCKETS }, () => ({ weight: 0, x: 0, y: 0, s: 0, l: 0, n: 0 }));
  let greySum = 0;
  let greyCount = 0;

  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3]! < 128) continue;
    const color = rgbToHsl(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!);
    if (color.l > 0.94 || color.l < 0.06) continue;
    if (color.s < 0.12 || color.s * (1 - Math.abs(2 * color.l - 1)) < 0.06) {
      greySum += color.l;
      greyCount++;
      continue;
    }
    const bucket = buckets[Math.floor((color.h / 360) * HUE_BUCKETS) % HUE_BUCKETS]!;
    // Colourful pixels count more than washed-out ones.
    const weight = color.s * (1 - Math.abs(2 * color.l - 1)) + 0.05;
    const radians = (color.h * Math.PI) / 180;
    bucket.weight += weight;
    bucket.x += Math.cos(radians) * weight;
    bucket.y += Math.sin(radians) * weight;
    bucket.s += color.s * weight;
    bucket.l += color.l * weight;
    bucket.n++;
  }

  const ranked = buckets
    .filter((b) => b.n > 0)
    .map((b) => ({
      weight: b.weight,
      color: {
        h: (Math.atan2(b.y, b.x) * 180) / Math.PI + (b.y < 0 ? 360 : 0),
        s: b.s / b.weight,
        l: b.l / b.weight,
      },
    }))
    .sort((a, b) => b.weight - a.weight || a.color.h - b.color.h);

  const total = ranked.reduce((sum, b) => sum + b.weight, 0);
  const picked: Hsl[] = [];
  for (const { weight, color } of ranked) {
    if (picked.length >= MAX_COLORS) break;
    // Ignore specks (an icon, a badge) unless nothing else is colourful.
    if (picked.length > 0 && weight < total * 0.04) break;
    if (picked.every((p) => hueDistance(p.h, color.h) >= MIN_HUE_DISTANCE)) picked.push(color);
  }

  if (picked.length > 0) return picked;
  // Monochrome screenshot: a calm, slightly cool neutral.
  const l = greyCount > 0 ? greySum / greyCount : 0.5;
  return [{ h: 222, s: 0.18, l }];
}

/** A mesh gradient built from the palette for the chosen variant. */
export function matchedBackground(palette: Hsl[], variant: MatchVariant): GradientConfig {
  const hues = expandHues(palette.map((c) => c.h));
  const saturation = palette.reduce((sum, c) => sum + c.s, 0) / Math.max(1, palette.length);
  // Neutral screenshots stay neutral instead of being forced into colour.
  const colorful = Math.min(1, saturation / 0.35);
  const at = (i: number) => hues[i % hues.length]!;

  const tone = (h: number, s: number, l: number, alpha?: number) => hslToHex(h, s * (0.25 + 0.75 * colorful), l, alpha);

  switch (variant) {
    case "soft":
      return mesh(
        [tone(at(0), 0.55, 0.95), tone(at(1), 0.5, 0.9)],
        [
          blob(0.12, 0.18, 0.55, tone(at(0), 0.7, 0.76, 0.8)),
          blob(0.9, 0.28, 0.5, tone(at(1), 0.7, 0.78, 0.8)),
          blob(0.5, 0.98, 0.55, tone(at(2), 0.65, 0.8, 0.75)),
        ],
        0.08,
      );
    case "vivid":
      return mesh(
        [tone(at(0), 0.7, 0.58), tone(at(1), 0.7, 0.46)],
        [
          blob(0.1, 0.15, 0.55, tone(at(1), 0.9, 0.62, 0.8)),
          blob(0.92, 0.25, 0.5, tone(at(2), 0.9, 0.6, 0.8)),
          blob(0.55, 0.98, 0.6, tone(at(0), 0.85, 0.66, 0.75)),
        ],
        0.12,
      );
    case "dark":
      return mesh(
        [tone(at(0), 0.5, 0.09), tone(at(1), 0.55, 0.05)],
        [
          blob(0.15, 0.2, 0.55, tone(at(0), 0.8, 0.5, 0.73)),
          blob(0.85, 0.25, 0.5, tone(at(1), 0.8, 0.52, 0.73)),
          blob(0.55, 0.98, 0.6, tone(at(2), 0.75, 0.46, 0.67)),
        ],
        0.18,
      );
  }
}

/** Fills a palette up to three hues with harmonious neighbours. */
function expandHues(hues: number[]): number[] {
  if (hues.length >= 3) return hues;
  const base = hues[0] ?? 222;
  if (hues.length === 2) return [hues[0]!, hues[1]!, (base + 36) % 360];
  return [base, (base + 32) % 360, (base + 334) % 360];
}

function mesh(colors: [string, string], blobs: MeshBlob[], grain: number): GradientConfig {
  return { type: "gradient", colors, angle: 160, blobs, grain };
}

const blob = (x: number, y: number, r: number, color: string): MeshBlob => ({ x, y, r, color });

export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s: Math.min(1, s), l };
}

export function hslToHex(h: number, s: number, l: number, alpha?: number): string {
  const sat = Math.min(1, Math.max(0, s));
  const light = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = light - c / 2;
  const hex = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(r1 + m)}${hex(g1 + m)}${hex(b1 + m)}${alpha === undefined ? "" : hex(alpha)}`;
}

/* -------------------------------------------------------------------------- */
/* Browser sampling                                                           */
/* -------------------------------------------------------------------------- */

const SAMPLE_SIDE = 64;
const paletteCache = new Map<string, Hsl[]>();

/** Palette of a decoded screenshot, computed once per asset id. */
export function screenshotPalette(
  assetId: string,
  image: CanvasImageSource & { width: number; height: number },
): Hsl[] {
  const cached = paletteCache.get(assetId);
  if (cached) return cached;
  const scale = Math.min(1, SAMPLE_SIDE / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let palette: Hsl[] = [{ h: 222, s: 0.18, l: 0.5 }];
  if (ctx) {
    ctx.imageSmoothingQuality = "medium";
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    palette = extractPalette(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
  }
  canvas.width = 0;
  canvas.height = 0;
  paletteCache.set(assetId, palette);
  return palette;
}

/** Drops cached palettes of assets that no longer exist. */
export function prunePalettes(keep: Set<string>): void {
  for (const id of paletteCache.keys()) if (!keep.has(id)) paletteCache.delete(id);
}
