import type { GradientConfig } from "@/editor/types";

/** A short, curated set — users add their own colours with the "+" tile. */
export const SOLID_SWATCHES = ["#ffffff", "#f1f1f3", "#e9e4da", "#cdd9ec", "#1c1c1f", "#0a0a0b"];

export type GradientPreset = { id: string; name: string; gradient: GradientConfig };

/**
 * Plinth's signature gradients: saturated bases with layered colour lights —
 * crisp "liquid" shapes, a single spotlight or clean duotones — finished with
 * fine grain. Deliberately few; users add their own with the "+" tile.
 */
export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: "liquid-blue",
    name: "Liquid Blue",
    gradient: {
      type: "gradient",
      colors: ["#0b1cff", "#3d5bff"],
      angle: 160,
      grain: 0.12,
      blobs: [
        { x: 0.05, y: 0.15, r: 0.55, color: "#7fb2ffff", stretch: 1.6, angle: -30, core: 0.55 },
        { x: 0.95, y: 0.45, r: 0.45, color: "#ff7ad9ff", stretch: 1.4, angle: 20, core: 0.6 },
        { x: 0.3, y: 0.95, r: 0.5, color: "#00d4ffff", stretch: 1.8, angle: -15, core: 0.55 },
        { x: 0.75, y: 0.05, r: 0.3, color: "#ffffffdd", stretch: 2.2, angle: 35, core: 0.5 },
      ],
    },
  },
  {
    id: "liquid-mint",
    name: "Liquid Mint",
    gradient: {
      type: "gradient",
      colors: ["#00b39b", "#0057ff"],
      angle: 170,
      grain: 0.12,
      blobs: [
        { x: 0.1, y: 0.1, r: 0.5, color: "#c6ffe4ff", stretch: 1.8, angle: -20, core: 0.55 },
        { x: 0.95, y: 0.35, r: 0.4, color: "#00e5ffff", stretch: 1.4, angle: 30, core: 0.6 },
        { x: 0.45, y: 0.95, r: 0.5, color: "#3b2bffff", stretch: 1.8, angle: -15, core: 0.55 },
      ],
    },
  },
  {
    id: "blue-hour",
    name: "Blue Hour",
    gradient: {
      type: "gradient",
      colors: ["#020410", "#060a1f"],
      angle: 180,
      grain: 0.18,
      blobs: [
        { x: 0.5, y: 1.05, r: 0.75, color: "#2b5cffff", stretch: 1.6 },
        { x: 0.5, y: 1.05, r: 0.4, color: "#9fd0ffee", stretch: 2 },
      ],
    },
  },
  {
    id: "pink-orange",
    name: "Pink Orange",
    gradient: {
      type: "gradient",
      colors: ["#ff2f92", "#ffb11f"],
      angle: 150,
      grain: 0.12,
      blobs: [{ x: 0.3, y: 0.75, r: 0.45, color: "#ff5a3699", stretch: 1.8, angle: 20 }],
    },
  },
  {
    id: "sky-indigo",
    name: "Sky Indigo",
    gradient: {
      type: "gradient",
      colors: ["#7fd6ff", "#2b1fd6"],
      angle: 170,
      grain: 0.12,
      blobs: [{ x: 0.7, y: 0.35, r: 0.45, color: "#ffffff66", stretch: 2, angle: -30 }],
    },
  },
];

/** Background of a new project, and the first gradient offered. */
export const DEFAULT_GRADIENT = GRADIENT_PRESETS.find((p) => p.id === "blue-hour")!.gradient;

/** Deep copy so presets are never mutated through the scene. */
export function cloneGradient(gradient: GradientConfig): GradientConfig {
  return structuredClone(gradient);
}
