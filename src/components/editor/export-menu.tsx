"use client";

import { Popover } from "@base-ui/react/popover";
import { ChevronDown, Copy, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { SliderField } from "@/components/ui/slider-field";
import { cancelVideoExport, copySceneToClipboard, exportScene } from "@/components/editor/export-actions";
import { exportSize, isExportSizeSupported } from "@/editor/export/export-image";
import { useScene } from "@/editor/store";
import { DEFAULT_EXPORT_SETTINGS, useUIStore, type ExportFormat, type ExportScale } from "@/editor/ui-store";
import { getAsset } from "@/editor/assets";
import { formatDuration, MAX_VIDEO_SECONDS, sceneVideoDuration, useVideoMode, videoExportSize } from "@/editor/video";
import { modKey } from "@/lib/platform";

const SCALES: ExportScale[] = [1, 2, 3];

export function ExportMenu() {
  const settings = useUIStore((s) => s.exportSettings);
  const setSettings = useUIStore((s) => s.setExportSettings);
  const exporting = useUIStore((s) => s.exporting);
  const canvas = useScene((s) => s.canvas);
  const transparent = useScene((s) => s.background.type === "transparent");
  const size = exportSize(canvas, settings.scale);
  const videoMode = useVideoMode();

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button variant="primary" size="md" aria-label="Export" className="pr-2">
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        }
      />
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup className="z-40 w-72 rounded-xl border border-line bg-panel p-4 shadow-popover transition-[opacity,transform] outline-none data-[ending-style]:scale-98 data-[ending-style]:opacity-0 data-[starting-style]:scale-98 data-[starting-style]:opacity-0">
            <Popover.Title className="mb-3 text-xs font-semibold text-ink">
              {videoMode ? "Export video" : "Export image"}
            </Popover.Title>
            {videoMode ? (
              <VideoExport />
            ) : (
              <div className="flex flex-col gap-3">
                <Segmented<ExportFormat>
                  label="Format"
                  value={settings.format}
                  onChange={(format) => setSettings({ format })}
                  options={[
                    { value: "png", label: "PNG" },
                    { value: "jpeg", label: "JPG" },
                  ]}
                />
                <Segmented<`${ExportScale}`>
                  label="Scale"
                  value={`${settings.scale}`}
                  onChange={(value) => setSettings({ scale: Number(value) as ExportScale })}
                  options={SCALES.map((scale) => ({ value: `${scale}`, label: `${scale}×` }))}
                />
                {settings.format === "jpeg" ? (
                  <SliderField
                    label="Quality"
                    value={Math.round(settings.quality * 100)}
                    min={50}
                    max={100}
                    defaultValue={Math.round(DEFAULT_EXPORT_SETTINGS.quality * 100)}
                    format={(v) => `${v}%`}
                    onChange={(v) => setSettings({ quality: v / 100 })}
                    onCommit={() => undefined}
                  />
                ) : null}
                <p className="text-xs text-muted tabular-nums">
                  {size.width} × {size.height} px
                  {transparent && settings.format === "jpeg" ? " · JPG has no transparency, white is used" : null}
                  {transparent && settings.format === "png" ? " · transparent background" : null}
                </p>
                {!isExportSizeSupported(canvas, settings.scale) ? (
                  <p className="text-xs text-danger">Too large for the browser to export. Choose a smaller scale.</p>
                ) : null}
                <div className="flex gap-2">
                  <Button variant="primary" className="flex-1" disabled={exporting} onClick={() => void exportScene()}>
                    <Download className="size-4" />
                    Download
                    <kbd className="ml-1 font-sans text-2xs opacity-60">{modKey()}E</kbd>
                  </Button>
                  <Button
                    aria-label="Copy PNG to clipboard"
                    disabled={exporting}
                    onClick={() => void copySceneToClipboard()}
                  >
                    <Copy className="size-4" />
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Video export: fixed format and size (Full HD at most), progress and cancel. */
function VideoExport() {
  const exporting = useUIStore((s) => s.exporting);
  const progress = useUIStore((s) => s.videoProgress);
  const canvas = useScene((s) => s.canvas);
  const duration = useScene(sceneVideoDuration);
  const longest = useScene((s) => Math.max(0, ...s.devices.map((d) => getAsset(d.screenshotId)?.duration ?? 0)));
  const size = videoExportSize(canvas);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-5 text-muted tabular-nums">
        MP4 · {size.width} × {size.height} · {formatDuration(duration)} · no sound
        {longest > MAX_VIDEO_SECONDS ? (
          <span className="block">Only the first {MAX_VIDEO_SECONDS} s are exported.</span>
        ) : null}
      </p>
      {progress !== null ? (
        <div className="flex flex-col gap-1.5">
          <div
            role="progressbar"
            aria-label="Export progress"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 overflow-hidden rounded-full bg-field"
          >
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="text-2xs text-muted tabular-nums">Rendering… {Math.round(progress * 100)}%</p>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" disabled={exporting} onClick={() => void exportScene()}>
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Download video
          {exporting ? null : <kbd className="ml-1 font-sans text-2xs opacity-60">{modKey()}E</kbd>}
        </Button>
        {exporting ? <Button onClick={cancelVideoExport}>Cancel</Button> : null}
      </div>
    </div>
  );
}
