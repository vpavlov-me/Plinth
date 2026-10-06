"use client";

/* eslint-disable @next/next/no-img-element -- local object URL preview */
import { Crop, ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import { pickImageFile } from "@/components/editor/pick-file";
import { Button, IconButton } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { SliderField } from "@/components/ui/slider-field";
import { importScreenshot } from "@/editor/actions";
import { useAsset } from "@/editor/assets";
import { getDevice } from "@/editor/devices/definitions";
import { cropOverflow } from "@/editor/geometry";
import { screenArea } from "@/editor/rendering/device-artwork";
import { useDeviceLayout } from "@/editor/rendering/use-device-layout";
import { DEFAULT_CROP, isDefaultCrop, MAX_CROP_ZOOM, setScreenshot, updateDevice } from "@/editor/scene";
import { useActiveDeviceId } from "@/editor/selection";
import { useDevice, useEditorStore, useScene } from "@/editor/store";
import type { DeviceInstance, ScreenshotCrop } from "@/editor/types";
import { useUIStore } from "@/editor/ui-store";
import { formatDuration } from "@/editor/video";

/** The active device's screenshot: replace/remove, and where it sits inside the screen. */
export function ScreenshotPanel() {
  const activeId = useActiveDeviceId();
  const instance = useDevice(activeId);
  const update = useEditorStore((s) => s.update);
  if (!instance) return null;

  return (
    <Section
      title="Screenshot"
      action={
        instance.screenshotId && !isDefaultCrop(instance.crop) ? (
          <Button
            size="sm"
            variant="secondary"
            className="-mr-1"
            onClick={() => update((scene) => updateDevice(scene, instance.id, { crop: { ...DEFAULT_CROP } }))}
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        ) : null
      }
    >
      <ScreenshotRow instance={instance} />
      {instance.screenshotId ? <CropControls instance={instance} /> : null}
    </Section>
  );
}

function ScreenshotRow({ instance }: { instance: DeviceInstance }) {
  const asset = useAsset(instance.screenshotId);
  const update = useEditorStore((s) => s.update);
  const replace = () => pickImageFile((file) => void importScreenshot(file, instance.id), { video: true });

  if (!asset) {
    return (
      <Button onClick={replace}>
        <ImagePlus className="size-4" />
        Add screenshot or video
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      <div className="checkerboard size-10 shrink-0 overflow-hidden rounded-md shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)]">
        {asset.kind === "video" ? (
          // A paused, muted element shows the first frame as the thumbnail.
          <video src={asset.url} muted playsInline preload="metadata" className="size-full object-cover object-top" />
        ) : (
          <img src={asset.url} alt="" className="size-full object-cover object-top" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-ink">{asset.name}</p>
        <p className="text-2xs text-muted tabular-nums">
          {asset.width} × {asset.height}
          {asset.kind === "video" ? ` · ${formatDuration(asset.duration ?? 0)}` : null}
        </p>
      </div>
      <IconButton label="Replace screenshot" icon={<ImagePlus />} onClick={replace} />
      <IconButton
        label="Remove screenshot"
        icon={<Trash2 />}
        onClick={() => update((scene, sizeOf) => setScreenshot(scene, instance.id, null, sizeOf))}
      />
    </div>
  );
}

function CropControls({ instance }: { instance: DeviceInstance }) {
  const asset = useAsset(instance.screenshotId);
  const canvas = useScene((s) => s.canvas);
  const { geometry } = useDeviceLayout(instance, canvas);
  const update = useEditorStore((s) => s.update);
  const commit = useEditorStore((s) => s.commit);
  const cropping = useUIStore((s) => s.croppingDeviceId === instance.id);
  const setCropping = useUIStore((s) => s.setCropping);
  if (!asset) return null;

  const area = screenArea({ device: getDevice(instance.deviceId), geometry });
  const overflow = cropOverflow(instance.crop, asset, area);
  const patch = (crop: Partial<ScreenshotCrop>) =>
    update((scene) => updateDevice(scene, instance.id, { crop: { ...instance.crop, ...crop } }), { transient: true });

  return (
    <>
      <Button
        variant={cropping ? "primary" : "secondary"}
        aria-pressed={cropping}
        onClick={() => setCropping(cropping ? null : instance.id)}
      >
        <Crop className="size-4" />
        {cropping ? "Done" : "Adjust on canvas"}
      </Button>
      {cropping ? (
        <p className="text-2xs leading-4 text-muted">
          Drag to move the {asset.kind === "video" ? "video" : "screenshot"}, scroll to zoom. Esc to finish.
        </p>
      ) : null}
      <SliderField
        label="Zoom"
        value={Math.round(instance.crop.zoom * 100)}
        min={100}
        max={MAX_CROP_ZOOM * 100}
        defaultValue={100}
        format={(v) => `${v}%`}
        onChange={(v) => patch({ zoom: v / 100 })}
        onCommit={commit}
      />
      <SliderField
        label="Horizontal"
        value={Math.round(instance.crop.x * 100)}
        min={0}
        max={100}
        defaultValue={50}
        format={(v) => `${v}%`}
        disabled={!overflow.x}
        onChange={(v) => patch({ x: v / 100 })}
        onCommit={commit}
      />
      <SliderField
        label="Vertical"
        value={Math.round(instance.crop.y * 100)}
        min={0}
        max={100}
        defaultValue={0}
        format={(v) => `${v}%`}
        disabled={!overflow.y}
        onChange={(v) => patch({ y: v / 100 })}
        onCommit={commit}
      />
    </>
  );
}
