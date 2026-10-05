import { traceRoundedRect } from "@/editor/geometry";
import type { RoundedRect } from "@/editor/types";

/** Shadows are blurred, so a modest resolution is plenty. */
const MAX_SIDE = 1024;

const cache = new WeakMap<HTMLImageElement, { key: string; canvas: HTMLCanvasElement }>();

/**
 * Alpha mask of an image clipped to the screen shape, used to cast
 * alpha-aware shadows for frameless screenshots (e.g. transparent PNGs).
 * The screen rect is in image pixels (frameless screens match the image).
 */
export function getSilhouette(image: HTMLImageElement, screen: RoundedRect): HTMLCanvasElement {
  const key = JSON.stringify(screen);
  const cached = cache.get(image);
  if (cached?.key === key) return cached.canvas;

  const scale = Math.min(1, MAX_SIDE / Math.max(screen.width, screen.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(screen.width * scale));
  canvas.height = Math.max(1, Math.round(screen.height * scale));
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.scale(scale, scale);
    ctx.beginPath();
    traceRoundedRect(ctx, { ...screen, x: 0, y: 0 });
    ctx.clip();
    ctx.drawImage(image, 0, 0, screen.width, screen.height);
  }
  cache.set(image, { key, canvas });
  return canvas;
}
