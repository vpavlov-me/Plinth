"use client";

/* eslint-disable @next/next/no-img-element -- static SVG previews and local object URLs */
import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown, FolderClosed, FolderOpen, Plus, ScanLine, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { gradientCss } from "@/components/editor/css-background";
import { CanvasPresetPicker } from "@/components/editor/canvas-preset-picker";
import { pickImageFile } from "@/components/editor/pick-file";
import { COLLAPSE_CHEVRON, COLLAPSE_PANEL, COLLAPSE_TRIGGER } from "@/components/ui/collapse";
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

/**
 * Two halves — devices and presets — each with its own scroll. A collapsed
 * half shrinks to its header and the other one smoothly takes the space.
 */
export function LibrarySidebar() {
  const [open, setOpen] = useState({ devices: true, presets: true });
  return (
    <aside
      aria-label="Library"
      className="flex h-full w-[248px] flex-col overflow-hidden rounded-2xl bg-panel shadow-panel"
    >
      <LibraryHalf title="Devices" open={open.devices} onToggle={() => setOpen((o) => ({ ...o, devices: !o.devices }))}>
        <DeviceLibrary />
      </LibraryHalf>
      <LibraryHalf title="Presets" open={open.presets} onToggle={() => setOpen((o) => ({ ...o, presets: !o.presets }))}>
        <PresetLibrary />
      </LibraryHalf>
    </aside>
  );
}

function LibraryHalf({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-label={title}
      className="flex min-h-11 basis-0 flex-col overflow-hidden transition-[flex-grow] duration-300 ease-out motion-reduce:transition-none"
      style={{ flexGrow: open ? 1 : 0.0001 }}
    >
      <h2 className="flex shrink-0 items-center px-4 pt-3 pb-1">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          {...(open ? { "data-panel-open": "" } : {})}
          className={COLLAPSE_TRIGGER}
        >
          {title}
          <ChevronDown className={COLLAPSE_CHEVRON} />
        </button>
      </h2>
      <div
        id={id}
        inert={!open}
        className={cn(
          "min-h-0 flex-1 scrollbar-thin overflow-y-auto pb-3 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** A folder in the library tree: icon, name, count and an animated body. */
function Folder({
  label,
  count,
  defaultOpen,
  children,
}: {
  label: string;
  count?: number;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  return (
    <Collapsible.Root defaultOpen={defaultOpen} render={<div role="group" aria-label={label} />} className="px-2">
      <Collapsible.Trigger className={cn(COLLAPSE_TRIGGER, "w-full gap-2 px-2 hover:bg-hover")}>
        <FolderClosed className="size-3.5 shrink-0 text-subtle group-data-[panel-open]:hidden" />
        <FolderOpen className="hidden size-3.5 shrink-0 text-subtle group-data-[panel-open]:block" />
        <span className="truncate">{label}</span>
        {count !== undefined ? <span className="text-2xs font-normal text-subtle tabular-nums">{count}</span> : null}
        <ChevronDown className={COLLAPSE_CHEVRON} />
      </Collapsible.Trigger>
      <Collapsible.Panel className={COLLAPSE_PANEL}>
        <div className="ml-[15px] border-l border-line pt-1 pb-2 pl-2">{children}</div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
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
    <div className="flex flex-col gap-0.5">
      {DEVICE_GROUPS.map((group, index) => (
        <Folder
          key={group.label}
          label={group.label}
          count={group.devices.length}
          defaultOpen={group.devices.some((d) => d.id === active?.deviceId) || (index === 0 && !active)}
        >
          <div className="grid grid-cols-2 gap-1">
            {group.devices.map((device) => (
              <DeviceTile
                key={device.id}
                device={device}
                selected={active?.deviceId === device.id}
                onSelect={() => select(device.id)}
              />
            ))}
          </div>
        </Folder>
      ))}
      <CustomFrames selectedId={active?.deviceId ?? null} onSelect={select} />
    </div>
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
    <Folder
      label="Your frames"
      count={frames.length}
      defaultOpen={frames.some((f) => customDeviceId(f.assetId) === selectedId)}
    >
      <div className="grid grid-cols-2 gap-1">
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
    </Folder>
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
    <div className="flex flex-col gap-0.5">
      <Folder label="Canvas" defaultOpen>
        <CanvasPresetPicker />
      </Folder>
      {SCENE_PRESET_GROUPS.map((group) => {
        const presets = SCENE_PRESETS.filter((p) => p.group === group.id);
        return (
          <Folder key={group.id} label={group.label} count={presets.length} defaultOpen={group.id === "social"}>
            <ul className="flex flex-col gap-0.5">
              {presets.map((preset) => (
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
          </Folder>
        );
      })}
    </div>
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
  if (background.type === "gradient") return gradientCss(background);
  return "#3a3a40";
}
