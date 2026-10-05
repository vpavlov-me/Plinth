"use client";

import { ChevronDown, RotateCcw, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { Segmented } from "@/components/ui/segmented";
import { SliderField } from "@/components/ui/slider-field";
import { Tooltip } from "@/components/ui/tooltip";
import { removeSelectedDevice } from "@/editor/actions";
import { customDeviceId } from "@/editor/custom-frames";
import { DEVICE_GROUPS, getDevice } from "@/editor/devices/definitions";
import { useLibraryStore } from "@/editor/library";
import { changeDeviceModel, resetDeviceTransform, updateDevice } from "@/editor/scene";
import { useActiveDeviceId } from "@/editor/selection";
import { useDevice, useEditorStore, useScene } from "@/editor/store";
import type { DeviceInstance } from "@/editor/types";
import { useUIStore } from "@/editor/ui-store";
import { cn } from "@/lib/cn";

export function DevicePanel() {
  const activeId = useActiveDeviceId();
  const instance = useDevice(activeId);
  const canvas = useScene((s) => s.canvas);
  const update = useEditorStore((s) => s.update);
  const commit = useEditorStore((s) => s.commit);
  const frames = useLibraryStore((s) => s.frames);
  const deviceIds = useScene((s) => s.devices.map((d) => d.id).join(" "));
  const select = useUIStore((s) => s.select);
  if (!instance) return null;
  const ids = deviceIds.split(" ");

  const device = getDevice(instance.deviceId);
  const patch = (values: Partial<DeviceInstance>, transient = false) =>
    update((scene) => updateDevice(scene, instance.id, values), { transient });

  return (
    <Section
      title="Mockup"
      action={
        <div className="-mr-1 flex items-center gap-1">
          {ids.length > 1 ? (
            <IconButton label="Remove device" shortcut="⌫" icon={<Trash2 />} onClick={removeSelectedDevice} />
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            disabled={instance.x === 0.5 && instance.y === 0.5 && instance.scale === 1 && instance.rotation === 0}
            onClick={() => update((scene) => resetDeviceTransform(scene, instance.id))}
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        </div>
      }
    >
      {ids.length > 1 ? (
        <Segmented
          label="Edited device"
          value={instance.id}
          onChange={(id) => select(id)}
          options={ids.map((id, index) => ({ value: id, label: `Device ${index + 1}` }))}
        />
      ) : null}
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
          {DEVICE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </optgroup>
          ))}
          {frames.length > 0 ? (
            <optgroup label="Your frames">
              {frames.map((f) => (
                <option key={f.assetId} value={customDeviceId(f.assetId)}>
                  {f.name}
                </option>
              ))}
            </optgroup>
          ) : null}
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
