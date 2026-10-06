"use client";

import { ImageUp, Loader2 } from "lucide-react";
import { pickImageFile } from "@/components/editor/pick-file";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { importScreenshot } from "@/editor/actions";
import { cornerRadii, quadToCssMatrix } from "@/editor/geometry";
import { deviceToCanvas, rectQuad } from "@/editor/rendering/device-quad";
import { useDeviceLayout } from "@/editor/rendering/use-device-layout";
import type { CanvasConfig, DeviceInstance } from "@/editor/types";
import { cn } from "@/lib/cn";
import { modKey } from "@/lib/platform";

type Props = {
  instance: DeviceInstance;
  canvas: CanvasConfig;
  /** CSS pixels per canvas pixel. */
  viewScale: number;
  busy: boolean;
  /** Only the upload icon, for a screen that devices in front partly cover. */
  iconOnly?: boolean;
};

/**
 * Upload prompt drawn inside the device's screen until it has a screenshot.
 * Positioned in the canvas box's CSS pixels and follows the device's
 * position, scale, rotation and perspective. Content adapts to the screen size.
 */
export function EmptyState({ instance, canvas, viewScale, busy, iconOnly = false }: Props) {
  const { geometry, transform } = useDeviceLayout(instance, canvas);
  const { screen } = geometry;

  // Screen corners in the canvas box's CSS pixels, following perspective and rotation.
  const toCanvas = deviceToCanvas(instance, geometry, transform);
  const quad = rectQuad((x, y) => {
    const p = toCanvas(x, y);
    return { x: p.x * viewScale, y: p.y * viewScale };
  }, screen);

  const px = transform.scale * viewScale;
  const width = screen.width * px;
  const height = screen.height * px;
  const radius = cornerRadii(screen.radius)
    .map((r) => `${r * px}px`)
    .join(" ");

  const size = Math.min(width, height);
  const variant = iconOnly ? "icon" : width >= 250 && height >= 230 ? "full" : size >= 110 ? "compact" : "icon";
  const choose = () => pickImageFile((file) => void importScreenshot(file, instance.id));

  return (
    <div
      className="pointer-events-auto absolute flex items-center justify-center overflow-hidden bg-overlay p-3 text-center backdrop-blur-sm transition-opacity duration-300 starting:opacity-0"
      style={{
        left: 0,
        top: 0,
        width,
        height,
        borderRadius: radius,
        transformOrigin: "0 0",
        transform: quadToCssMatrix(width, height, quad),
      }}
    >
      {variant === "icon" ? (
        <Tooltip label={`Add screenshot or paste with ${modKey()}V`}>
          <button
            type="button"
            aria-label="Add screenshot"
            onClick={choose}
            className="relative flex size-9 cursor-default items-center justify-center rounded-xl bg-accent-soft text-accent hover:bg-accent/25"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
          </button>
        </Tooltip>
      ) : (
        <div className="relative flex max-w-[300px] flex-col items-center">
          <div
            className={cn(
              "mb-3 flex items-center justify-center rounded-xl bg-accent-soft text-accent",
              variant === "full" ? "size-11" : "size-9",
            )}
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <ImageUp className="size-5" />}
          </div>
          <h2 className={cn("font-semibold text-ink", variant === "full" ? "text-[15px]" : "text-[13px]")}>
            {busy ? "Processing image…" : "Drop a screenshot"}
          </h2>
          <p className={cn("mt-1 text-muted", variant === "full" ? "text-xs leading-5" : "text-2xs leading-4")}>
            {variant === "full" ? "PNG, JPG or WebP. Drag it anywhere, choose a file, or just " : "Or just "}
            paste an image from your clipboard with <span className="font-medium text-ink">{modKey()}V</span>.
          </p>
          <div className={cn("flex w-full gap-2", variant === "full" ? "mt-5" : "mt-3")}>
            <Button
              variant="primary"
              size={variant === "full" ? "md" : "sm"}
              className="flex-1"
              disabled={busy}
              onClick={choose}
            >
              <ImageUp className="size-4" />
              Choose file
            </Button>
          </div>
          {variant === "full" ? (
            <p className="mt-4 text-2xs text-subtle">Images stay on your device. Nothing is uploaded.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
