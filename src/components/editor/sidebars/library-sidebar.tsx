"use client";

/* eslint-disable @next/next/no-img-element -- static SVG previews, no optimisation needed */
import { ScanLine } from "lucide-react";
import { linearGradientCss } from "@/components/editor/css-background";
import { DEVICES } from "@/editor/devices/definitions";
import { SCENE_PRESETS } from "@/editor/presets/scene-presets";
import { applyScenePreset, changeDeviceModel } from "@/editor/scene";
import { useActiveDeviceId } from "@/editor/selection";
import { useDevice, useEditorStore } from "@/editor/store";
import type { BackgroundConfig, DeviceDefinition } from "@/editor/types";
import { cn } from "@/lib/cn";

export function LibrarySidebar() {
  return (
    <aside
      aria-label="Library"
      className="hidden w-[232px] shrink-0 scrollbar-thin flex-col overflow-y-auto border-r border-line bg-panel xl:flex"
    >
      <DeviceLibrary />
      <PresetLibrary />
    </aside>
  );
}

function SidebarHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="px-4 pt-4 pb-2 text-2xs font-semibold tracking-wide text-subtle uppercase">{children}</h2>;
}

function DeviceLibrary() {
  const activeId = useActiveDeviceId();
  const active = useDevice(activeId);
  const update = useEditorStore((s) => s.update);

  return (
    <section aria-label="Devices">
      <SidebarHeading>Devices</SidebarHeading>
      <div className="grid grid-cols-2 gap-1.5 px-3">
        {DEVICES.map((device) => {
          const selected = active?.deviceId === device.id;
          return (
            <button
              key={device.id}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                activeId && update((scene, sizeOf) => changeDeviceModel(scene, activeId, device.id, sizeOf))
              }
              className={cn(
                "group flex cursor-default flex-col items-center gap-1.5 rounded-lg border p-2 pb-1.5 transition-colors",
                selected ? "border-accent bg-accent-soft" : "border-transparent hover:bg-hover",
              )}
            >
              <DevicePreview device={device} />
              <span
                className={cn("text-2xs font-medium", selected ? "text-accent" : "text-muted group-hover:text-ink")}
              >
                {device.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DevicePreview({ device }: { device: DeviceDefinition }) {
  return (
    <span className="flex h-16 w-full items-center justify-center">
      {device.previewSrc ? (
        <img src={device.previewSrc} alt="" className="max-h-full max-w-full" draggable={false} />
      ) : (
        <span className="flex h-11 w-16 items-center justify-center rounded-md border border-dashed border-line-strong text-subtle">
          <ScanLine className="size-4" />
        </span>
      )}
    </span>
  );
}

function PresetLibrary() {
  const update = useEditorStore((s) => s.update);
  return (
    <section aria-label="Presets" className="pb-4">
      <SidebarHeading>Presets</SidebarHeading>
      <ul className="flex flex-col gap-0.5 px-2">
        {SCENE_PRESETS.map((preset) => (
          <li key={preset.id}>
            <button
              type="button"
              onClick={() => update((scene, sizeOf) => applyScenePreset(scene, preset, sizeOf))}
              className="flex w-full cursor-default items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-hover"
            >
              <PresetThumb background={preset.background} ratio={preset.canvas.width / preset.canvas.height} />
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-ink">{preset.name}</span>
                <span className="block truncate text-2xs text-muted">{preset.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PresetThumb({ background, ratio }: { background: BackgroundConfig; ratio: number }) {
  const width = ratio >= 1 ? 32 : 32 * ratio;
  const height = ratio >= 1 ? 32 / ratio : 32;
  return (
    <span className="flex size-8 shrink-0 items-center justify-center">
      <span
        className="rounded-[4px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]"
        style={{ width, height, background: cssBackground(background) }}
      />
    </span>
  );
}

function cssBackground(background: BackgroundConfig): string {
  if (background.type === "solid") return background.color;
  if (background.type === "gradient") return linearGradientCss(background);
  return "transparent";
}
