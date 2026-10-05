import type { GradientConfig } from "@/editor/types";

export const SOLID_SWATCHES = [
  "#ffffff",
  "#f4f4f5",
  "#e7e5e4",
  "#d4d4d8",
  "#18181b",
  "#0b0b0f",
  "#fde68a",
  "#fecaca",
  "#bfdbfe",
  "#bbf7d0",
  "#ddd6fe",
  "#1e3a8a",
];

export type GradientPreset = { id: string; name: string; gradient: GradientConfig };

const gradient = (colors: string[], angle: number): GradientConfig => ({ type: "gradient", colors, angle });

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: "mist", name: "Mist", gradient: gradient(["#eef2f7", "#cfd8e6"], 160) },
  { id: "peach", name: "Peach", gradient: gradient(["#ffd6c2", "#f6a5c0"], 135) },
  { id: "lagoon", name: "Lagoon", gradient: gradient(["#a8e6f0", "#5b8def"], 135) },
  { id: "lilac", name: "Lilac", gradient: gradient(["#e4d9ff", "#a78bfa"], 150) },
  { id: "meadow", name: "Meadow", gradient: gradient(["#e3f7c8", "#7fd1ae"], 135) },
  { id: "sunset", name: "Sunset", gradient: gradient(["#ffb36b", "#ff5f6d", "#a83279"], 135) },
  { id: "dusk", name: "Dusk", gradient: gradient(["#2b2f55", "#5b3e8c", "#d06a8c"], 145) },
  { id: "ink", name: "Ink", gradient: gradient(["#1c1f26", "#0b0c10"], 180) },
];

export const DEFAULT_GRADIENT = GRADIENT_PRESETS[0]!.gradient;
