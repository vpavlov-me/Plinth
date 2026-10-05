import { FIT_PADDING, type Size } from "@/editor/geometry";
import type { CanvasPresetId, ResolvedDeviceGeometry } from "@/editor/types";

export type CanvasPreset = {
  id: CanvasPresetId;
  label: string;
  /** Short ratio label shown in the picker. */
  ratio: string;
  hint: string;
  size: Size | null;
};

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: "original", label: "Original", ratio: "Auto", hint: "Fits the screenshot at native resolution", size: null },
  {
    id: "square",
    label: "Square",
    ratio: "1:1",
    hint: "1200 × 1200 · LinkedIn, social",
    size: { width: 1200, height: 1200 },
  },
  {
    id: "portrait",
    label: "Portrait",
    ratio: "4:5",
    hint: "1080 × 1350 · Instagram",
    size: { width: 1080, height: 1350 },
  },
  {
    id: "landscape",
    label: "Wide",
    ratio: "16:9",
    hint: "1920 × 1080 · Presentation",
    size: { width: 1920, height: 1080 },
  },
  {
    id: "story",
    label: "Story",
    ratio: "9:16",
    hint: "1080 × 1920 · Stories, reels",
    size: { width: 1080, height: 1920 },
  },
  { id: "custom", label: "Custom", ratio: "W×H", hint: "Any size", size: null },
];

export const CANVAS_MIN_SIZE = 100;
export const CANVAS_MAX_SIZE = 8000;
/** "Original" never produces a canvas larger than this on its long side. */
const ORIGINAL_MAX_SIDE = 4000;

export function getCanvasPreset(id: CanvasPresetId): CanvasPreset {
  return CANVAS_PRESETS.find((p) => p.id === id) ?? CANVAS_PRESETS[1]!;
}

/**
 * Canvas size for the "Original" preset: the device is shown with the
 * screenshot at (close to) its native pixel size, plus the standard padding.
 */
export function originalCanvasSize(geometry: ResolvedDeviceGeometry, screenshot: Size | null): Size {
  const native = screenshot
    ? Math.max(screenshot.width / geometry.screen.width, screenshot.height / geometry.screen.height)
    : 1;
  let width = (geometry.width * native) / (1 - FIT_PADDING * 2);
  let height = (geometry.height * native) / (1 - FIT_PADDING * 2);
  const longSide = Math.max(width, height);
  if (longSide > ORIGINAL_MAX_SIDE) {
    width *= ORIGINAL_MAX_SIDE / longSide;
    height *= ORIGINAL_MAX_SIDE / longSide;
  }
  return { width: clampCanvasDimension(width), height: clampCanvasDimension(height) };
}

export function clampCanvasDimension(value: number): number {
  if (!Number.isFinite(value)) return CANVAS_MIN_SIZE;
  return Math.round(Math.min(CANVAS_MAX_SIZE, Math.max(CANVAS_MIN_SIZE, value)));
}
