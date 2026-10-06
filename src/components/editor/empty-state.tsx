"use client";

import { ImageUp, Loader2 } from "lucide-react";
import { pickImageFile } from "@/components/editor/pick-file";
import { Tooltip } from "@/components/ui/tooltip";
import { importScreenshot } from "@/editor/actions";
import { getDevice, idealScreenshotSize } from "@/editor/devices/definitions";
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
  const variant = iconOnly ? "icon" : width >= 220 && height >= 200 ? "full" : size >= 110 ? "compact" : "icon";
  const ideal = idealScreenshotSize(getDevice(instance.deviceId));
  const choose = () => pickImageFile((file) => void importScreenshot(file, instance.id), { video: true });
  const icon = busy ? <Loader2 className="animate-spin" /> : <ImageUp />;

  return (
    <div
      className="group/prompt pointer-events-auto absolute flex cursor-pointer items-center justify-center overflow-hidden bg-overlay p-3 text-center backdrop-blur-sm transition-[opacity,background-color] duration-300 starting:opacity-0"
      style={{
        left: 0,
        top: 0,
        width,
        height,
        borderRadius: radius,
        transformOrigin: "0 0",
        transform: quadToCssMatrix(width, height, quad),
      }}
      onClick={busy ? undefined : choose}
    >
      {variant === "icon" ? (
        <div className="flex flex-col items-center">
          <Tooltip label={ideal ? `Add screenshot · ${ideal}` : "Add screenshot"}>
            <button
              type="button"
              aria-label="Add screenshot"
              onClick={(event) => {
                event.stopPropagation();
                choose();
              }}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted transition-colors group-hover/prompt:text-ink [&_svg]:size-5"
            >
              {icon}
            </button>
          </Tooltip>
          {ideal && size >= 110 ? <p className="mt-1 text-2xs text-muted tabular-nums">{ideal}</p> : null}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <span
            className={cn(
              "flex items-center justify-center text-subtle transition-colors group-hover/prompt:text-ink",
              variant === "full" ? "mb-3 [&_svg]:size-6" : "mb-2 [&_svg]:size-5",
            )}
            aria-hidden
          >
            {icon}
          </span>
          <h2 className={cn("font-medium text-ink", variant === "full" ? "text-sm" : "text-xs")}>
            {busy ? "Processing…" : "Drop a screenshot or video"}
          </h2>
          {ideal ? (
            <p className="mt-1 text-2xs text-muted tabular-nums" title="Use this size for a pixel-perfect fit">
              {ideal}
            </p>
          ) : null}
          <p className={cn("text-2xs text-subtle", variant === "full" ? "mt-3" : "mt-2")}>
            <button
              type="button"
              disabled={busy}
              onClick={(event) => {
                event.stopPropagation();
                choose();
              }}
              className="cursor-pointer font-medium text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
            >
              Choose file
            </button>
            {variant === "full" ? ` or paste with ${modKey()}V` : null}
          </p>
        </div>
      )}
    </div>
  );
}
