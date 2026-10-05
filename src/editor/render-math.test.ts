import { describe, expect, it } from "vitest";
import { extractPalette, hslToHex, hueDistance, matchedBackground, rgbToHsl } from "@/editor/color-match";
import { croppedImageRect, panCrop, quadToCssMatrix } from "@/editor/geometry";
import { getPerspectivePreset, PERSPECTIVE_PRESETS, projectRect } from "@/editor/presets/perspective-presets";

describe("perspective presets", () => {
  it("leaves Front untouched", () => {
    const { corners } = projectRect(100, 200, getPerspectivePreset("front"));
    expect(corners.map((c) => [c.x, c.y, c.w])).toEqual([
      [0, 0, 1],
      [100, 0, 1],
      [100, 200, 1],
      [0, 200, 1],
    ]);
  });

  it("keeps the centre fixed and mirrors left/right presets", () => {
    for (const preset of PERSPECTIVE_PRESETS) {
      const { corners } = projectRect(100, 200, preset);
      // Diagonals of a projected rectangle meet at the projected centre (50, 100).
      const [a, , c] = corners;
      const [, b, , d] = corners;
      const t =
        ((b!.x - a!.x) * (d!.y - b!.y) - (b!.y - a!.y) * (d!.x - b!.x)) /
        ((c!.x - a!.x) * (d!.y - b!.y) - (c!.y - a!.y) * (d!.x - b!.x));
      expect(a!.x + t * (c!.x - a!.x)).toBeCloseTo(50, 6);
      expect(a!.y + t * (c!.y - a!.y)).toBeCloseTo(100, 6);
    }
    const left = projectRect(100, 200, getPerspectivePreset("perspective-left")).corners;
    const right = projectRect(100, 200, getPerspectivePreset("perspective-right")).corners;
    expect(left[0]!.x).toBeCloseTo(100 - right[1]!.x, 6);
    expect(left[0]!.y).toBeCloseTo(right[1]!.y, 6);
  });

  it("makes receding edges shorter", () => {
    const { corners } = projectRect(100, 200, getPerspectivePreset("tilt-left"));
    const leftEdge = corners[3]!.y - corners[0]!.y;
    const rightEdge = corners[2]!.y - corners[1]!.y;
    expect(rightEdge).toBeLessThan(leftEdge);
  });
});

describe("screenshot crop", () => {
  const screen = { x: 10, y: 20, width: 100, height: 200 };
  const tall = { width: 100, height: 400 };

  it("covers the screen, top-aligned, by default", () => {
    expect(croppedImageRect(tall, screen, { zoom: 1, x: 0.5, y: 0 })).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 400,
    });
  });

  it("zooms around the chosen alignment and always covers the screen", () => {
    const rect = croppedImageRect(tall, screen, { zoom: 2, x: 0.5, y: 1 });
    expect(rect).toEqual({ x: -40, y: -580, width: 200, height: 800 });
    expect(rect.x + rect.width).toBeGreaterThanOrEqual(screen.x + screen.width);
    expect(rect.y + rect.height).toBeGreaterThanOrEqual(screen.y + screen.height);
  });

  it("pans only along axes with overflow and clamps to the edges", () => {
    const crop = { zoom: 1, x: 0.5, y: 0 };
    const moved = panCrop(crop, tall, screen, 30, -100);
    expect(moved.x).toBe(0.5); // no horizontal overflow
    expect(moved.y).toBeCloseTo(0.5, 6); // 100 of 200 px overflow
    expect(panCrop(crop, tall, screen, 0, -10_000).y).toBe(1);
    expect(panCrop(crop, tall, screen, 0, 10_000).y).toBe(0);
  });
});

describe("match colors", () => {
  const pixels = (colors: [number, number, number, number][], repeat = 50) =>
    colors.flatMap((c) => Array.from({ length: repeat }, () => c)).flat();

  it("ignores white, black, grey and transparent pixels", () => {
    const palette = extractPalette(
      pixels([
        [255, 255, 255, 255],
        [0, 0, 0, 255],
        [128, 128, 128, 255],
        [255, 0, 0, 10],
        [37, 99, 235, 255],
      ]),
    );
    expect(palette).toHaveLength(1);
    expect(hueDistance(palette[0]!.h, rgbToHsl(37, 99, 235).h)).toBeLessThan(2);
  });

  it("finds distinct hues, strongest first, and is deterministic", () => {
    const data = pixels([
      [79, 70, 229, 255],
      [79, 70, 229, 255],
      [249, 115, 22, 255],
      [16, 185, 129, 255],
    ]);
    const a = extractPalette(data);
    expect(a).toEqual(extractPalette(data));
    expect(a).toHaveLength(3);
    expect(hueDistance(a[0]!.h, rgbToHsl(79, 70, 229).h)).toBeLessThan(2);
    expect(matchedBackground(a, "soft")).toEqual(matchedBackground(extractPalette(data), "soft"));
  });

  it("falls back to a calm neutral for monochrome screenshots", () => {
    const palette = extractPalette(pixels([[200, 200, 200, 255]]));
    expect(palette).toHaveLength(1);
    expect(palette[0]!.s).toBeLessThan(0.3);
  });

  it("produces valid, distinct variants", () => {
    const palette = [rgbToHsl(225, 29, 72), rgbToHsl(249, 115, 22)];
    const soft = matchedBackground(palette, "soft");
    const dark = matchedBackground(palette, "dark");
    for (const g of [soft, dark, matchedBackground(palette, "vivid")]) {
      expect(g.colors.every((c) => /^#[0-9a-f]{6}$/.test(c))).toBe(true);
      expect(g.blobs!.every((b) => /^#[0-9a-f]{8}$/.test(b.color))).toBe(true);
    }
    // Soft is light, Dark is dark.
    expect(rgbToHsl(...hexRgb(soft.colors[0]!)).l).toBeGreaterThan(0.85);
    expect(rgbToHsl(...hexRgb(dark.colors[0]!)).l).toBeLessThan(0.15);
  });

  it("converts HSL to hex", () => {
    expect(hslToHex(0, 1, 0.5)).toBe("#ff0000");
    expect(hslToHex(240, 1, 0.5, 0.5)).toBe("#0000ff80");
  });
});

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

describe("quadToCssMatrix", () => {
  /** Applies a CSS matrix3d to a 2D point (homogeneous divide). */
  const apply = (css: string, x: number, y: number) => {
    const m = css.slice("matrix3d(".length, -1).split(",").map(Number);
    const w = m[3]! * x + m[7]! * y + m[15]!;
    return { x: (m[0]! * x + m[4]! * y + m[12]!) / w, y: (m[1]! * x + m[5]! * y + m[13]!) / w };
  };

  it("maps the box corners onto a projected quad", () => {
    const quad = [
      { x: 30, y: 12 },
      { x: 210, y: 40 },
      { x: 190, y: 330 },
      { x: 10, y: 290 },
    ] as const;
    const css = quadToCssMatrix(200, 400, [...quad]);
    const corners = [apply(css, 0, 0), apply(css, 200, 0), apply(css, 200, 400), apply(css, 0, 400)];
    corners.forEach((c, i) => {
      expect(c.x).toBeCloseTo(quad[i]!.x, 4);
      expect(c.y).toBeCloseTo(quad[i]!.y, 4);
    });
  });

  it("is a plain translation for an unchanged box", () => {
    const css = quadToCssMatrix(100, 50, [
      { x: 5, y: 7 },
      { x: 105, y: 7 },
      { x: 105, y: 57 },
      { x: 5, y: 57 },
    ]);
    expect(apply(css, 50, 25)).toEqual({ x: 55, y: 32 });
  });
});
