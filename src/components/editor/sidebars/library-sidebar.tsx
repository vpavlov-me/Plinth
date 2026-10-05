"use client";

/* eslint-disable @next/next/no-img-element -- static SVG previews and local object URLs */
import { Plus, ScanLine, X } from "lucide-react";
import { linearGradientCss } from "@/components/editor/css-background";
import { pickImageFile } from "@/components/editor/pick-file";
import { Tooltip } from "@/components/ui/tooltip";
import { importDeviceFrame } from "@/editor/actions";
import { useAsset } from "@/editor/assets";
import { customDeviceId, type CustomFrame } from "@/editor/custom-frames";
import { DEVICE_GROUPS } from "@/editor/devices/definitions";
import { useLibraryStore } from "@/editor/library";
import { SCENE_PRESET_GROUPS, SCENE_PRESETS } from "@/editor/presets/scene-presets";
import { applyScenePreset, changeDeviceModel } from "@/editor/scene";
import { useActiveDeviceId } from "@/editor/selection";
import { useDevice, useEditorStore, useScene } from "@/editor/store";
import type { BackgroundConfig, DeviceDefinition } from "@/editor/types";
import { cn } from "@/lib/cn";

export function LibrarySidebar() {
  return (
    <aside
      aria-label="Library"
      className="hidden w-[248px] shrink-0 scrollbar-thin flex-col overflow-y-auto rounded-2xl bg-panel pb-4 shadow-panel xl:flex"
    >
      <DeviceLibrary />
      <PresetLibrary />
    </aside>
  );
}

function SidebarHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="px-4 pt-4 pb-1 text-2xs font-semibold tracking-wide text-subtle uppercase">{children}</h2>;
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="px-4 pt-3 pb-1.5 text-2xs font-medium text-muted">{children}</h3>;
}

/* -------------------------------------------------------------------------- */
/* Devices                                                                    */
/* -------------------------------------------------------------------------- */

function useSelectDevice() {
  const activeId = useActiveDeviceId();
  const update = useEditorStore((s) => s.update);
  return (deviceId: string) => {
    if (activeId) update((scene, sizeOf) => changeDeviceModel(scene, activeId, deviceId, sizeOf));
  };
}

function DeviceLibrary() {
  const activeId = useActiveDeviceId();
  const active = useDevice(activeId);
  const select = useSelectDevice();

  return (
    <section aria-label="Devices">
      <SidebarHeading>Devices</SidebarHeading>
      {DEVICE_GROUPS.map((group) => (
        <div key={group.label} role="group" aria-label={group.label}>
          <GroupHeading>{group.label}</GroupHeading>
          <div className="grid grid-cols-2 gap-1.5 px-3">
            {group.devices.map((device) => (
              <DeviceTile
                key={device.id}
                device={device}
                selected={active?.deviceId === device.id}
                onSelect={() => select(device.id)}
              />
            ))}
          </div>
        </div>
      ))}
      <CustomFrames selectedId={active?.deviceId ?? null} onSelect={select} />
    </section>
  );
}

function DeviceTile({
  device,
  selected,
  onSelect,
}: {
  device: DeviceDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "group flex min-w-0 cursor-default flex-col items-center gap-1.5 rounded-lg border p-2 pb-1.5 transition-colors",
        selected ? "border-accent bg-accent-soft" : "border-transparent hover:bg-hover",
      )}
    >
      <span className="flex h-14 w-full items-center justify-center">
        {device.previewSrc ? (
          <img src={device.previewSrc} alt="" className="max-h-full max-w-full" draggable={false} />
        ) : (
          <span className="flex h-10 w-14 items-center justify-center rounded-md border border-dashed border-line-strong text-subtle">
            <ScanLine className="size-4" />
          </span>
        )}
      </span>
      <span
        className={cn(
          "line-clamp-2 w-full text-center text-2xs leading-tight font-medium",
          selected ? "text-accent" : "text-muted group-hover:text-ink",
        )}
      >
        {device.name}
      </span>
    </button>
  );
}

function CustomFrames({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const frames = useLibraryStore((s) => s.frames);
  const removeFrame = useLibraryStore((s) => s.removeFrame);
  const activeId = useActiveDeviceId();

  return (
    <div role="group" aria-label="Your frames">
      <GroupHeading>Your frames</GroupHeading>
      <div className="grid grid-cols-2 gap-1.5 px-3">
        <Tooltip label="PNG or WebP with a transparent screen, e.g. official bezels you downloaded">
          <button
            type="button"
            aria-label="Upload a device frame"
            onClick={() => pickImageFile((file) => void importDeviceFrame(file, activeId))}
            className="flex h-[88px] cursor-default flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line-strong text-2xs text-muted transition-colors hover:border-muted hover:text-ink"
          >
            <Plus className="size-4" />
            Upload frame
          </button>
        </Tooltip>
        {frames.map((frame) => (
          <CustomFrameTile
            key={frame.assetId}
            frame={frame}
            selected={selectedId === customDeviceId(frame.assetId)}
            onSelect={() => onSelect(customDeviceId(frame.assetId))}
            onRemove={() => removeFrame(frame.assetId)}
          />
        ))}
      </div>
    </div>
  );
}

function CustomFrameTile({
  frame,
  selected,
  onSelect,
  onRemove,
}: {
  frame: CustomFrame;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const asset = useAsset(frame.assetId);
  if (!asset) return null;
  return (
    <div className="group/tile relative">
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={cn(
          "flex w-full min-w-0 cursor-default flex-col items-center gap-1.5 rounded-lg border p-2 pb-1.5 transition-colors",
          selected ? "border-accent bg-accent-soft" : "border-transparent hover:bg-hover",
        )}
      >
        <span className="flex h-14 w-full items-center justify-center">
          <img src={asset.url} alt="" className="max-h-full max-w-full" draggable={false} />
        </span>
        <span
          className={cn(
            "line-clamp-2 w-full text-center text-2xs leading-tight font-medium",
            selected ? "text-accent" : "text-muted",
          )}
        >
          {frame.name}
        </span>
      </button>
      <button
        type="button"
        aria-label={`Remove ${frame.name}`}
        onClick={onRemove}
        className="absolute -top-1 -right-1 hidden size-5 cursor-default items-center justify-center rounded-full bg-active text-ink shadow-popover group-focus-within/tile:flex group-hover/tile:flex hover:bg-line-strong"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Presets                                                                    */
/* -------------------------------------------------------------------------- */

function PresetLibrary() {
  const update = useEditorStore((s) => s.update);
  const currentBackground = useScene((s) => s.background);
  return (
    <section aria-label="Presets">
      <SidebarHeading>Presets</SidebarHeading>
      {SCENE_PRESET_GROUPS.map((group) => (
        <div key={group.id} role="group" aria-label={group.label}>
          <GroupHeading>{group.label}</GroupHeading>
          <ul className="flex flex-col gap-0.5 px-2">
            {SCENE_PRESETS.filter((p) => p.group === group.id).map((preset) => (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => update((scene, sizeOf) => applyScenePreset(scene, preset, sizeOf))}
                  className="flex w-full cursor-default items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-hover"
                >
                  <PresetThumb
                    background={preset.background ?? currentBackground}
                    ratio={preset.canvas.width / preset.canvas.height}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-ink">{preset.name}</span>
                    <span className="block truncate text-2xs text-muted tabular-nums">{preset.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function PresetThumb({ background, ratio }: { background: BackgroundConfig; ratio: number }) {
  const width = ratio >= 1 ? 32 : 32 * ratio;
  const height = ratio >= 1 ? 32 / ratio : 32;
  return (
    <span className="flex size-8 shrink-0 items-center justify-center">
      <span
        className="rounded-[4px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]"
        style={{ width, height, background: cssBackground(background) }}
      />
    </span>
  );
}

function cssBackground(background: BackgroundConfig): string {
  if (background.type === "solid") return background.color;
  if (background.type === "gradient") return linearGradientCss(background);
  return "#3a3a40";
}
