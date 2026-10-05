import { getAsset } from "@/editor/assets";
import { setCustomDevices } from "@/editor/devices/definitions";
import type { DeviceDefinition, ImageAsset, RoundedRect } from "@/editor/types";

/**
 * User-uploaded device frames.
 *
 * Any PNG/WebP with a transparent screen area works — for example official
 * device bezels the user downloaded under their own licence. The frame stays
 * in the user's browser; the screen area is detected automatically.
 */
export type CustomFrame = {
  /** Asset id of the artwork. */
  assetId: string;
  name: string;
  screen: RoundedRect;
};

export const CUSTOM_PREFIX = "custom:";

export class FrameDetectionError extends Error {
  override name = "FrameDetectionError";
}

/** Pixels with alpha below this count as "see-through". */
const ALPHA_THRESHOLD = 24;
/** Analysis is done on a copy no larger than this (long side). */
const ANALYSIS_MAX_SIDE = 2400;

/**
 * Finds the transparent screen opening of a frame: flood-fills the
 * see-through region around the image centre, takes its bounding box and
 * estimates the corner radius from where the diagonal first becomes clear.
 */
export function detectScreen(image: CanvasImageSource & { width: number; height: number }): RoundedRect {
  const scale = Math.min(1, ANALYSIS_MAX_SIDE / Math.max(image.width, image.height));
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new FrameDetectionError("Your browser could not analyse this image.");
  ctx.drawImage(image, 0, 0, w, h);
  const alpha = ctx.getImageData(0, 0, w, h).data;
  canvas.width = 0;
  canvas.height = 0;

  const clear = (x: number, y: number) => alpha[(y * w + x) * 4 + 3]! < ALPHA_THRESHOLD;
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  if (!clear(cx, cy)) {
    throw new FrameDetectionError("The centre of the image isn’t transparent. Use a frame with a see-through screen.");
  }

  const visited = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let top = 0;
  stack[top++] = cy * w + cx;
  visited[cy * w + cx] = 1;
  let minX = cx;
  let maxX = cx;
  let minY = cy;
  let maxY = cy;
  while (top > 0) {
    const index = stack[--top]!;
    const x = index % w;
    const y = (index - x) / w;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
      throw new FrameDetectionError(
        "The transparent area reaches the edge of the image, so no closed screen was found.",
      );
    }
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    for (const next of [index - 1, index + 1, index - w, index + w]) {
      if (visited[next]) continue;
      visited[next] = 1;
      if (alpha[next * 4 + 3]! < ALPHA_THRESHOLD) stack[top++] = next;
    }
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  if (width < w * 0.2 || height < h * 0.2) {
    throw new FrameDetectionError("The transparent screen area is too small.");
  }

  // Corner radius: a rounded corner of radius r leaves the diagonal opaque
  // for r·(1 − 1/√2) pixels.
  let d = 0;
  const limit = Math.min(width, height) / 2;
  while (d < limit && !visited[(minY + d) * w + (minX + d)]) d += 1;
  const radius = Math.min(limit, d / (1 - Math.SQRT1_2));

  const k = 1 / scale;
  return {
    x: Math.round(minX * k),
    y: Math.round(minY * k),
    width: Math.round(width * k),
    height: Math.round(height * k),
    radius: Math.round(radius * k),
  };
}

export function customDeviceId(assetId: string): string {
  return `${CUSTOM_PREFIX}${assetId}`;
}

export function toDeviceDefinition(frame: CustomFrame, asset: ImageAsset): DeviceDefinition {
  return {
    id: customDeviceId(frame.assetId),
    name: frame.name,
    category: "custom",
    frameSrc: asset.url,
    previewSrc: asset.url,
    frame: { width: asset.width, height: asset.height },
    screen: frame.screen,
    body: [{ x: 0, y: 0, width: asset.width, height: asset.height, radius: 0 }],
    screenFill: "#000000",
    layout: { type: "fixed" },
    custom: true,
  };
}

/** Registers the library's frames with the device registry. */
export function registerCustomFrames(frames: CustomFrame[]): void {
  const devices: DeviceDefinition[] = [];
  for (const frame of frames) {
    const asset = getAsset(frame.assetId);
    if (asset) devices.push(toDeviceDefinition(frame, asset));
  }
  setCustomDevices(devices);
}
