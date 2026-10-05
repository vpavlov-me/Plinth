"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/editor/empty-state";
import { OnboardingHint } from "@/components/editor/onboarding-hint";
import { useOnboardingStore } from "@/editor/onboarding";
import { importScreenshot, importScreenshots } from "@/editor/actions";
import { firstImageFile, imageFiles } from "@/editor/import-image";
import { useActiveDeviceId } from "@/editor/selection";
import { useDevice, useScene } from "@/editor/store";
import { useUIStore } from "@/editor/ui-store";
import { cn } from "@/lib/cn";

const CanvasStage = dynamic(() => import("@/components/editor/canvas-stage"), { ssr: false });

/** Space kept around the canvas inside the workspace, in CSS pixels. */
const MARGIN = 40;
/** Extra room under the canvas for the first-visit hint. */
const HINT_SPACE = 44;
const MAX_VIEW_SCALE = 2;

export function Workspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const canvas = useScene((s) => s.canvas);
  const background = useScene((s) => s.background);
  const activeId = useActiveDeviceId();
  const active = useDevice(activeId);
  const hydrated = useUIStore((s) => s.hydrated);
  const importing = useUIStore((s) => s.importing);
  const select = useUIStore((s) => s.select);
  const showHint = useOnboardingStore((s) => s.done === false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const viewScale = size
    ? Math.max(
        0.01,
        Math.min(
          MAX_VIEW_SCALE,
          (size.width - MARGIN * 2) / canvas.width,
          (size.height - MARGIN * 2 - (showHint ? HINT_SPACE : 0)) / canvas.height,
        ),
      )
    : 0;

  const isEmpty = hydrated && active !== null && active.screenshotId === null;

  return (
    <main
      ref={containerRef}
      aria-label="Workspace"
      className="relative min-w-0 flex-1 overflow-hidden"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) select(null);
      }}
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        const files = imageFiles(event.dataTransfer);
        if (files.length > 1) {
          void importScreenshots(files, activeId);
          return;
        }
        const file = files[0] ?? firstImageFile(event.dataTransfer);
        if (file) void importScreenshot(file, activeId);
      }}
    >
      {size && hydrated ? (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: Math.round(canvas.width * viewScale),
            height: Math.round(canvas.height * viewScale),
            // Keep the canvas clear of the hint below it.
            top: showHint ? `calc(50% - ${HINT_SPACE / 2}px)` : undefined,
          }}
        >
          <div
            role="img"
            aria-label={`Mockup canvas, ${canvas.width} by ${canvas.height} pixels`}
            className={cn("size-full shadow-canvas", background.type === "transparent" && "checkerboard")}
          >
            <CanvasStage viewScale={viewScale} />
          </div>
          {isEmpty && !dragging && active ? (
            <EmptyState instance={active} canvas={canvas} viewScale={viewScale} busy={importing} />
          ) : null}
        </div>
      ) : null}

      {dragging ? (
        <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-2xl border-2 border-dashed border-accent bg-accent/8">
          <span className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-accent-ink">
            Drop to add screenshots
          </span>
        </div>
      ) : null}

      {hydrated && !importing && !dragging ? <OnboardingHint /> : null}

      {importing && !isEmpty ? (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-panel px-3 py-1.5 text-xs text-muted shadow-popover"
          role="status"
        >
          Processing image…
        </div>
      ) : null}
    </main>
  );
}
