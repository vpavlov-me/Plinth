"use client";

import { ImageUp, Loader2 } from "lucide-react";
import { pickImageFile } from "@/components/editor/pick-file";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { importScreenshot } from "@/editor/actions";
import { cornerRadii } from "@/editor/geometry";
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
};

/**
 * Upload prompt drawn inside the device's screen until it has a screenshot.
 * Positioned in the canvas box's CSS pixels and follows the device's
 * position, scale and rotation. Content adapts to the screen size.
 */
export function EmptyState({ instance, canvas, viewScale, busy }: Props) {
  const { geometry, transform } = useDeviceLayout(instance, canvas);
  const { screen } = geometry;

  // Screen centre relative to the frame centre, rotated, in canvas pixels.
  const dx = (screen.x + screen.width / 2 - geometry.width / 2) * transform.scale;
  const dy = (screen.y + screen.height / 2 - geometry.height / 2) * transform.scale;
  const angle = (transform.rotation * Math.PI) / 180;
  const cx = (transform.x + dx * Math.cos(angle) - dy * Math.sin(angle)) * viewScale;
  const cy = (transform.y + dx * Math.sin(angle) + dy * Math.cos(angle)) * viewScale;
  const px = transform.scale * viewScale;
  const width = screen.width * px;
  const height = screen.height * px;
  const radius = cornerRadii(screen.radius)
    .map((r) => `${r * px}px`)
    .join(" ");

  const size = Math.min(width, height);
  const variant = width >= 250 && height >= 230 ? "full" : size >= 110 ? "compact" : "icon";
  const choose = () => pickImageFile((file) => void importScreenshot(file, instance.id));

  return (
    <div
      className="absolute flex items-center justify-center overflow-hidden bg-[#141417]/92 p-3 text-center backdrop-blur-sm transition-opacity duration-300 starting:opacity-0"
      style={{
        left: cx - width / 2,
        top: cy - height / 2,
        width,
        height,
        borderRadius: radius,
        transform: `rotate(${transform.rotation}deg)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-[6%] rounded-[inherit] border border-dashed border-white/15"
        aria-hidden
      />
      {variant === "icon" ? (
        <Tooltip label="Add screenshot">
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
          {variant === "full" ? (
            <p className="mt-1 text-xs leading-5 text-muted">
              PNG, JPG or WebP. Drag it anywhere, paste with {modKey()}V, or choose a file.
            </p>
          ) : null}
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
