"use client";

import { ImageUp, Loader2 } from "lucide-react";
import { pickImageFile } from "@/components/editor/pick-file";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { importScreenshot } from "@/editor/actions";
import { cornerRadii, quadToCssMatrix } from "@/editor/geometry";
import { getPerspectivePreset, perspectiveProjector } from "@/editor/presets/perspective-presets";
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
 * position, scale, rotation and perspective. Content adapts to the screen size.
 */
export function EmptyState({ instance, canvas, viewScale, busy }: Props) {
  const { geometry, transform } = useDeviceLayout(instance, canvas);
  const { screen } = geometry;

  // Screen corners in the device's local units — projected when a
  // perspective preset is active, exactly like the artwork — then mapped to
  // the canvas box's CSS pixels.
  const project =
    instance.perspective === "front"
      ? (x: number, y: number) => ({ x, y })
      : perspectiveProjector(geometry.width, geometry.height, getPerspectivePreset(instance.perspective));
  const angle = (transform.rotation * Math.PI) / 180;
  const [sin, cos] = [Math.sin(angle), Math.cos(angle)];
  const toView = (x: number, y: number) => {
    const p = project(x, y);
    const lx = (p.x - geometry.width / 2) * transform.scale;
    const ly = (p.y - geometry.height / 2) * transform.scale;
    return { x: (transform.x + lx * cos - ly * sin) * viewScale, y: (transform.y + lx * sin + ly * cos) * viewScale };
  };
  const quad = [
    toView(screen.x, screen.y),
    toView(screen.x + screen.width, screen.y),
    toView(screen.x + screen.width, screen.y + screen.height),
    toView(screen.x, screen.y + screen.height),
  ] as const;

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
        left: 0,
        top: 0,
        width,
        height,
        borderRadius: radius,
        transformOrigin: "0 0",
        transform: quadToCssMatrix(width, height, [...quad]),
      }}
    >
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
