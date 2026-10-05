import type { GradientConfig, MeshBlob } from "@/editor/types";

/** A short, curated set — users add their own colours with the "+" tile. */
export const SOLID_SWATCHES = ["#ffffff", "#f1f1f3", "#e9e4da", "#cdd9ec", "#1c1c1f", "#0a0a0b"];

export type GradientPreset = { id: string; name: string; gradient: GradientConfig };

const linear = (colors: string[], angle: number): GradientConfig => ({ type: "gradient", colors, angle });

const blob = (x: number, y: number, r: number, color: string): MeshBlob => ({ x, y, r, color });

/** Soft colour lights over a dark or light base, finished with fine grain. */
const mesh = (base: [string, string], blobs: MeshBlob[], grain = 0.14): GradientConfig => ({
  type: "gradient",
  colors: base,
  angle: 160,
  blobs,
  grain,
});

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: "aurora",
    name: "Aurora",
    gradient: mesh(
      ["#070b1f", "#120a2a"],
      [blob(0.15, 0.2, 0.55, "#3b6cffcc"), blob(0.85, 0.25, 0.5, "#9b5cffcc"), blob(0.55, 0.95, 0.6, "#14d5c7aa")],
    ),
  },
  {
    id: "candy",
    name: "Candy",
    gradient: mesh(
      ["#ffe4ef", "#ffeedd"],
      [blob(0.1, 0.15, 0.55, "#ff7ab6cc"), blob(0.9, 0.3, 0.5, "#ffb27acc"), blob(0.5, 0.95, 0.55, "#b49cffcc")],
      0.1,
    ),
  },
  {
    id: "ocean",
    name: "Ocean",
    gradient: mesh(
      ["#04182e", "#07324d"],
      [blob(0.2, 0.85, 0.6, "#00c2ffbb"), blob(0.85, 0.15, 0.5, "#3d7bffcc"), blob(0.7, 0.75, 0.35, "#7af5d199")],
    ),
  },
  {
    id: "sunrise",
    name: "Sunrise",
    gradient: mesh(
      ["#ffd2ad", "#ffa79a"],
      [blob(0.15, 0.85, 0.55, "#ff5e62cc"), blob(0.85, 0.15, 0.5, "#ffd166dd"), blob(0.75, 0.85, 0.45, "#f78fb3bb")],
      0.12,
    ),
  },
  {
    id: "nebula",
    name: "Nebula",
    gradient: mesh(
      ["#0e0718", "#06040c"],
      [blob(0.8, 0.2, 0.5, "#ff4d8dbb"), blob(0.2, 0.35, 0.55, "#7c3aedcc"), blob(0.5, 1, 0.55, "#2563ebbb")],
      0.18,
    ),
  },
  {
    id: "mint",
    name: "Mint",
    gradient: mesh(
      ["#eefcf6", "#e2f3ff"],
      [blob(0.15, 0.25, 0.5, "#6ee7b7bb"), blob(0.9, 0.2, 0.45, "#93c5fdcc"), blob(0.6, 0.95, 0.5, "#fef08acc")],
      0.08,
    ),
  },
  {
    id: "ember",
    name: "Ember",
    gradient: mesh(
      ["#140404", "#200802"],
      [blob(0.2, 0.9, 0.6, "#ff4d00bb"), blob(0.85, 0.7, 0.45, "#ff9500aa"), blob(0.75, 0.1, 0.45, "#c2185baa")],
      0.18,
    ),
  },
  {
    id: "pearl",
    name: "Pearl",
    gradient: mesh(
      ["#f6f6f8", "#ececf1"],
      [blob(0.15, 0.2, 0.5, "#c7d2fecc"), blob(0.85, 0.35, 0.45, "#fbcfe8cc"), blob(0.45, 0.95, 0.5, "#bae6fdcc")],
      0.08,
    ),
  },
  { id: "mist", name: "Mist", gradient: linear(["#eef2f7", "#cfd8e6"], 160) },
  { id: "peach", name: "Peach", gradient: linear(["#ffd6c2", "#f6a5c0"], 135) },
  { id: "lagoon", name: "Lagoon", gradient: linear(["#a8e6f0", "#5b8def"], 135) },
  { id: "lilac", name: "Lilac", gradient: linear(["#e4d9ff", "#a78bfa"], 150) },
  { id: "meadow", name: "Meadow", gradient: linear(["#e3f7c8", "#7fd1ae"], 135) },
  { id: "ink", name: "Ink", gradient: linear(["#1c1f26", "#0b0c10"], 180) },
];

export const DEFAULT_GRADIENT = GRADIENT_PRESETS.find((p) => p.id === "pearl")!.gradient;

/** Deep copy so presets are never mutated through the scene. */
export function cloneGradient(gradient: GradientConfig): GradientConfig {
  return structuredClone(gradient);
}
