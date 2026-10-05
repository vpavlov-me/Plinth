"use client";

/* eslint-disable @next/next/no-img-element -- local object URL preview */
import { ChevronDown, ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import { pickImageFile } from "@/components/editor/pick-file";
import { Button, IconButton } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { SliderField } from "@/components/ui/slider-field";
import { Tooltip } from "@/components/ui/tooltip";
import { importScreenshot } from "@/editor/actions";
import { useAsset } from "@/editor/assets";
import { DEVICES, getDevice } from "@/editor/devices/definitions";
import { changeDeviceModel, resetDeviceTransform, setScreenshot, updateDevice } from "@/editor/scene";
import { useActiveDeviceId } from "@/editor/selection";
import { useDevice, useEditorStore, useScene } from "@/editor/store";
import type { DeviceInstance } from "@/editor/types";
import { cn } from "@/lib/cn";

export function DevicePanel() {
  const activeId = useActiveDeviceId();
  const instance = useDevice(activeId);
  const canvas = useScene((s) => s.canvas);
  const update = useEditorStore((s) => s.update);
  const commit = useEditorStore((s) => s.commit);
  if (!instance) return null;

  const device = getDevice(instance.deviceId);
  const patch = (values: Partial<DeviceInstance>, transient = false) =>
    update((scene) => updateDevice(scene, instance.id, values), { transient });

  return (
    <Section
      title="Device"
      action={
        <IconButton
          label="Reset position"
          icon={<RotateCcw />}
          className="-mr-1.5 size-7"
          onClick={() => update((scene) => resetDeviceTransform(scene, instance.id))}
        />
      }
    >
      <div className="relative">
        <label htmlFor="device-model" className="sr-only">
          Device model
        </label>
        <select
          id="device-model"
          value={instance.deviceId}
          onChange={(e) => update((scene, sizeOf) => changeDeviceModel(scene, instance.id, e.target.value, sizeOf))}
          className="h-8 w-full cursor-default appearance-none rounded-lg bg-field pr-8 pl-2.5 text-xs font-medium text-ink outline-none focus-visible:outline-2 focus-visible:outline-accent"
        >
          {DEVICES.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-2 right-2.5 size-4 text-muted" />
      </div>

      {device.variants && device.variants.length > 1 ? (
        <div role="radiogroup" aria-label="Frame colour" className="flex items-center gap-2">
          <span className="w-16 text-xs text-muted">Colour</span>
          {device.variants.map((variant) => {
            const selected = (instance.variantId ?? device.variants?.[0]?.id) === variant.id;
            return (
              <Tooltip key={variant.id} label={variant.name}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={variant.name}
                  onClick={() => patch({ variantId: variant.id })}
                  className={cn(
                    "size-5 cursor-default rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.15)] transition-transform hover:scale-110",
                    selected && "ring-2 ring-accent ring-offset-2 ring-offset-panel",
                  )}
                  style={{ background: variant.swatch }}
                />
              </Tooltip>
            );
          })}
        </div>
      ) : null}

      <ScreenshotRow instance={instance} />

      <SliderField
        label="Scale"
        value={Math.round(instance.scale * 100)}
        min={10}
        max={300}
        defaultValue={100}
        format={(v) => `${v}%`}
        onChange={(v) => patch({ scale: v / 100 }, true)}
        onCommit={commit}
      />
      <SliderField
        label="Horizontal"
        value={Math.round((instance.x - 0.5) * canvas.width)}
        min={-Math.round(canvas.width / 2)}
        max={Math.round(canvas.width / 2)}
        defaultValue={0}
        format={(v) => `${v}px`}
        onChange={(v) => patch({ x: 0.5 + v / canvas.width }, true)}
        onCommit={commit}
      />
      <SliderField
        label="Vertical"
        value={Math.round((instance.y - 0.5) * canvas.height)}
        min={-Math.round(canvas.height / 2)}
        max={Math.round(canvas.height / 2)}
        defaultValue={0}
        format={(v) => `${v}px`}
        onChange={(v) => patch({ y: 0.5 + v / canvas.height }, true)}
        onCommit={commit}
      />
    </Section>
  );
}

function ScreenshotRow({ instance }: { instance: DeviceInstance }) {
  const asset = useAsset(instance.screenshotId);
  const update = useEditorStore((s) => s.update);
  const replace = () => pickImageFile((file) => void importScreenshot(file, instance.id));

  if (!asset) {
    return (
      <Button onClick={replace}>
        <ImagePlus className="size-4" />
        Add screenshot
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      <div className="checkerboard size-10 shrink-0 overflow-hidden rounded-md shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)]">
        <img src={asset.url} alt="" className="size-full object-cover object-top" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-ink">{asset.name}</p>
        <p className="text-2xs text-muted tabular-nums">
          {asset.width} × {asset.height}
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
