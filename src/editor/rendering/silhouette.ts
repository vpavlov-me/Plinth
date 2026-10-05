import { traceRoundedRect } from "@/editor/geometry";
import type { Rect, RoundedRect } from "@/editor/types";

/** Shadows are blurred, so a modest resolution is plenty. */
const MAX_SIDE = 1024;

const cache = new WeakMap<HTMLImageElement, { key: string; canvas: HTMLCanvasElement }>();

/**
 * Alpha mask of an image clipped to the screen shape, used to cast
 * alpha-aware shadows for frameless screenshots (e.g. transparent PNGs).
 * The screen rect is in image pixels (frameless screens match the image).
 */
const frameCache = new WeakMap<HTMLImageElement, { key: string; canvas: HTMLCanvasElement }>();

/**
 * Alpha mask of a whole device: the frame artwork with its screen opening
 * filled in. Used for user-uploaded frames, whose outline is arbitrary.
 */
export function getFrameSilhouette(frame: HTMLImageElement, screen: RoundedRect): HTMLCanvasElement {
  const key = JSON.stringify(screen);
  const cached = frameCache.get(frame);
  if (cached?.key === key) return cached.canvas;

  const width = frame.naturalWidth;
  const height = frame.naturalHeight;
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.scale(scale, scale);
    ctx.drawImage(frame, 0, 0, width, height);
    ctx.fillStyle = "#000";
    ctx.beginPath();
    traceRoundedRect(ctx, screen);
    ctx.fill();
  }
  frameCache.set(frame, { key, canvas });
  return canvas;
}

/**
 * `imageRect` is where the (cropped) image is drawn, in the same units as
 * `screen`; the mask covers the screen.
 */
export function getSilhouette(image: HTMLImageElement, screen: RoundedRect, imageRect: Rect): HTMLCanvasElement {
  const key = JSON.stringify([screen, imageRect]);
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
    ctx.drawImage(image, imageRect.x - screen.x, imageRect.y - screen.y, imageRect.width, imageRect.height);
  }
  cache.set(image, { key, canvas });
  return canvas;
}
