import { croppedImageRect, traceRoundedRect } from "@/editor/geometry";
import type { DeviceDefinition, ResolvedDeviceGeometry, RoundedRect, ScreenshotCrop } from "@/editor/types";

/** Everything needed to paint a device, in its own frame units. */
export type DeviceArtwork = {
  device: DeviceDefinition;
  geometry: ResolvedDeviceGeometry;
  /** Decoded frame artwork, or null while loading / for frameless devices. */
  frame: HTMLImageElement | null;
  /** Decoded screenshot, or null when the device is empty. */
  screenshot: HTMLImageElement | null;
  crop: ScreenshotCrop;
};

/** Extra clip area hidden under the frame; avoids anti-aliasing seams at the screen edge. */
export function screenArea(artwork: Pick<DeviceArtwork, "device" | "geometry">): RoundedRect {
  const { screen } = artwork.geometry;
  const bleed = artwork.device.frameSrc ? 2 : 0;
  return {
    x: screen.x - bleed,
    y: screen.y - bleed,
    width: screen.width + bleed * 2,
    height: screen.height + bleed * 2,
    radius:
      typeof screen.radius === "number"
        ? screen.radius + bleed
        : (screen.radius.map((r) => (r ? r + bleed : 0)) as RoundedRect["radius"]),
  };
}

/** Where the screenshot lands, in frame units (it may extend beyond the screen). */
export function screenshotRect(artwork: DeviceArtwork) {
  const image = artwork.screenshot;
  if (!image) return null;
  return croppedImageRect(
    { width: image.naturalWidth, height: image.naturalHeight },
    screenArea(artwork),
    artwork.crop,
  );
}

/**
 * Paints the screen (fill + cropped screenshot, clipped to the screen shape)
 * and the frame artwork on top. This is the single drawing routine for
 * devices: the editor, the exporter and the perspective renderer all use it,
 * so they can't drift apart. The context is expected in frame units.
 */
export function drawDeviceArtwork(ctx: CanvasRenderingContext2D, artwork: DeviceArtwork): void {
  const area = screenArea(artwork);
  const fill =
    !artwork.screenshot && artwork.device.screenFill === "transparent" ? "#ffffff" : artwork.device.screenFill;

  ctx.save();
  ctx.beginPath();
  traceRoundedRect(ctx, area);
  ctx.clip();
  if (fill !== "transparent") {
    ctx.fillStyle = fill;
    ctx.fillRect(area.x, area.y, area.width, area.height);
  }
  const rect = screenshotRect(artwork);
  if (artwork.screenshot && rect) {
    // The browser default ("low") makes downscaled screenshots look aliased, especially text.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(artwork.screenshot, rect.x, rect.y, rect.width, rect.height);
  }
  ctx.restore();

  if (artwork.frame) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    for (const { src, dest } of artwork.geometry.frameSlices) {
      ctx.drawImage(artwork.frame, src.x, src.y, src.width, src.height, dest.x, dest.y, dest.width, dest.height);
    }
    ctx.restore();
  }
}
