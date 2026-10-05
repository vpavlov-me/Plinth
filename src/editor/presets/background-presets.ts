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

/**
 * Plinth's signature gradients. Most are drawn from the palettes of the
 * built-in museum artworks (see photo-presets.ts), so photos and gradients
 * read as one family; a few neutrals cover everyday product shots.
 */
export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: "lake",
    name: "Lake",
    gradient: mesh(
      ["#f3e6cf", "#e9d3b0"],
      [blob(0.12, 0.18, 0.55, "#f2b880cc"), blob(0.9, 0.3, 0.5, "#b8c79acc"), blob(0.5, 0.98, 0.55, "#c9d8dfcc")],
      0.12,
    ),
  },
  {
    id: "tide",
    name: "Tide",
    gradient: mesh(
      ["#2d6f7c", "#5f9c9a"],
      [blob(0.15, 0.85, 0.6, "#a8d8cfcc"), blob(0.85, 0.15, 0.5, "#1f4e5fcc"), blob(0.7, 0.8, 0.4, "#e7f3eeaa")],
      0.14,
    ),
  },
  {
    id: "hills",
    name: "Hills",
    gradient: mesh(
      ["#e3e9da", "#c3d1b2"],
      [blob(0.1, 0.9, 0.55, "#6f9767cc"), blob(0.9, 0.15, 0.5, "#9db8d0cc"), blob(0.55, 0.35, 0.4, "#f4f1e4cc")],
      0.1,
    ),
  },
  {
    id: "lily",
    name: "Lily",
    gradient: mesh(
      ["#f7f0e6", "#e5f0ea"],
      [blob(0.12, 0.2, 0.5, "#f2b49acc"), blob(0.88, 0.3, 0.45, "#9ccdbacc"), blob(0.5, 0.98, 0.5, "#fde3c2cc")],
      0.08,
    ),
  },
  {
    id: "fog",
    name: "Fog",
    gradient: mesh(
      ["#dcd7ec", "#c8cfe8"],
      [blob(0.15, 0.2, 0.55, "#a99bd6cc"), blob(0.85, 0.3, 0.5, "#efe0f0cc"), blob(0.5, 0.95, 0.55, "#9fb4dccc")],
      0.1,
    ),
  },
  {
    id: "clay",
    name: "Clay",
    gradient: mesh(
      ["#efd6c6", "#dcab94"],
      [blob(0.15, 0.85, 0.55, "#c9765bcc"), blob(0.85, 0.2, 0.5, "#f4dcb8cc"), blob(0.8, 0.85, 0.4, "#b8707099")],
      0.12,
    ),
  },
  { id: "paper", name: "Paper", gradient: linear(["#f6f4f0", "#e6e1d8"], 160) },
  {
    id: "dusk",
    name: "Dusk",
    gradient: mesh(
      ["#3a3e50", "#b98463"],
      [blob(0.2, 0.9, 0.6, "#f2b36fcc"), blob(0.85, 0.15, 0.5, "#5d5a7bcc"), blob(0.7, 0.75, 0.35, "#f7d7a6aa")],
      0.16,
    ),
  },
  {
    id: "lacquer",
    name: "Lacquer",
    gradient: mesh(
      ["#0d0b08", "#1a140c"],
      [blob(0.15, 0.2, 0.55, "#b8893fbb"), blob(0.85, 0.85, 0.5, "#6b4a1fbb"), blob(0.75, 0.15, 0.35, "#e2c27a88")],
      0.18,
    ),
  },
  {
    id: "night",
    name: "Night",
    gradient: mesh(
      ["#0b1530", "#0f1838"],
      [blob(0.15, 0.2, 0.55, "#2c4fa3bb"), blob(0.85, 0.3, 0.5, "#5b3f9cbb"), blob(0.55, 0.98, 0.6, "#1d8a9aaa")],
      0.18,
    ),
  },
  { id: "ink", name: "Ink", gradient: linear(["#1c1f26", "#0b0c10"], 180) },
  { id: "sage", name: "Sage", gradient: linear(["#e9efe4", "#b9c9b1"], 160) },
  { id: "mist", name: "Mist", gradient: linear(["#eef2f6", "#cdd8e3"], 160) },
];

export const DEFAULT_GRADIENT = GRADIENT_PRESETS.find((p) => p.id === "lake")!.gradient;

/** Deep copy so presets are never mutated through the scene. */
export function cloneGradient(gradient: GradientConfig): GradientConfig {
  return structuredClone(gradient);
}
