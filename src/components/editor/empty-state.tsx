"use client";

import { ClipboardPaste, ImageUp, Loader2 } from "lucide-react";
import { pickImageFile } from "@/components/editor/pick-file";
import { Button } from "@/components/ui/button";
import { importScreenshot, pasteScreenshotFromClipboard } from "@/editor/actions";
import { modKey } from "@/lib/platform";

/** Shown over the canvas until the active device has a screenshot. */
export function EmptyState({ deviceId, busy }: { deviceId: string | null; busy: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
      <div className="pointer-events-auto flex w-full max-w-[340px] flex-col items-center rounded-2xl border border-line bg-panel/95 px-6 py-7 text-center shadow-popover backdrop-blur">
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImageUp className="size-5" />}
        </div>
        <h1 className="text-[15px] font-semibold text-ink">{busy ? "Processing image…" : "Drop a screenshot"}</h1>
        <p className="mt-1 text-xs leading-5 text-muted">
          PNG, JPG or WebP. Drag it anywhere, paste with {modKey()}V, or choose a file.
        </p>
        <div className="mt-5 flex w-full gap-2">
          <Button
            variant="primary"
            className="flex-1"
            disabled={busy}
            onClick={() => pickImageFile((file) => void importScreenshot(file, deviceId))}
          >
            <ImageUp className="size-4" />
            Choose file
          </Button>
          <Button disabled={busy} onClick={() => void pasteScreenshotFromClipboard(deviceId)}>
            <ClipboardPaste className="size-4" />
            Paste
          </Button>
        </div>
        <p className="mt-4 text-2xs text-subtle">Images stay on your device. Nothing is uploaded.</p>
      </div>
    </div>
  );
}
