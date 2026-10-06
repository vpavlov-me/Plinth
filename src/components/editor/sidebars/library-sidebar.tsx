"use client";

/* eslint-disable @next/next/no-img-element -- static SVG previews and local object URLs */
import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown, FolderClosed, FolderOpen, Plus, ScanLine, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { gradientCss } from "@/components/editor/css-background";
import { pickImageFile } from "@/components/editor/pick-file";
import { COLLAPSE_CHEVRON, COLLAPSE_PANEL, COLLAPSE_TRIGGER } from "@/components/ui/collapse";
import { LockedTitle } from "@/components/ui/section";
import { Tooltip } from "@/components/ui/tooltip";
import { applyLayoutPreset, importDeviceFrame } from "@/editor/actions";
import { useAsset } from "@/editor/assets";
import { useBackgroundImageUrl } from "@/editor/background-image";
import { customDeviceId, type CustomFrame } from "@/editor/custom-frames";
import { boundsOf, deviceOutline } from "@/editor/geometry";
import { LAYOUT_PRESETS, type LayoutPreset } from "@/editor/presets/layout-presets";
import { useLibraryStore } from "@/editor/library";
import { SCENE_PRESET_GROUPS, SCENE_PRESETS } from "@/editor/presets/scene-presets";
import { applyScenePreset, changeDeviceModel } from "@/editor/scene";
import { useActiveDeviceId } from "@/editor/selection";
import { useDevice, useEditorStore, useScene } from "@/editor/store";
import type { BackgroundConfig, DeviceDefinition } from "@/editor/types";
import { useVideoMode, videoDeviceGroups } from "@/editor/video";
import { cn } from "@/lib/cn";

type LibraryPart = "devices" | "layouts" | "presets";

/**
 * Three parts — devices, layouts and presets — as an accordion: opening one
 * closes the others. Everything stacks from the top; the open part scrolls
 * when its content is taller than the space left.
 */
export function LibrarySidebar() {
  const [open, setOpen] = useState<LibraryPart | null>("devices");
  const toggle = (part: LibraryPart) => setOpen((current) => (current === part ? null : part));
  // A video uses a single device: layouts are locked meanwhile.
  const videoMode = useVideoMode();
  return (
    <aside
      aria-label="Library"
      className="flex h-full w-[248px] flex-col overflow-hidden rounded-2xl bg-panel pb-2 shadow-panel"
    >
      <LibraryPartSection title="Devices" open={open === "devices"} onToggle={() => toggle("devices")}>
        <DeviceLibrary />
      </LibraryPartSection>
      <LibraryPartSection
        title="Layouts"
        open={open === "layouts" && !videoMode}
        locked={videoMode ? "Layouts aren’t available for video" : undefined}
        onToggle={() => toggle("layouts")}
      >
        <LayoutLibrary />
      </LibraryPartSection>
      <LibraryPartSection title="Presets" open={open === "presets"} onToggle={() => toggle("presets")}>
        <PresetLibrary />
      </LibraryPartSection>
    </aside>
  );
}

function LibraryPartSection({
  title,
  open,
  locked,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  /** When set, the part stays closed and shows a lock with this explanation. */
  locked?: string;
  onToggle: () => void;
  children: ReactNode;
}) {
  const id = useId();
  if (locked) {
    return (
      <section aria-label={title} className="flex min-h-11 shrink-0 flex-col">
        <h2 className="flex shrink-0 items-center px-4 pt-3 pb-1">
          <LockedTitle title={title} reason={locked} />
        </h2>
      </section>
    );
  }
  return (
    // Takes its content's height and shrinks (scrolling) when space runs out.
    <section aria-label={title} className="flex min-h-11 shrink flex-col overflow-hidden">
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
      {/* Animates the height through grid rows (0fr ↔ 1fr). */}
      <div
        id={id}
        inert={!open}
        className={cn(
          "grid min-h-0 transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 scrollbar-thin overflow-y-auto">
          <div className="pb-2">{children}</div>
        </div>
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
  // Only the initial state matters; later changes (another device selected) must not reset folders.
  const [initiallyOpen] = useState(defaultOpen);
  return (
    <Collapsible.Root defaultOpen={initiallyOpen} render={<div role="group" aria-label={label} />} className="px-2">
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

/** Tile preview area painted with the current scene background, so previews match the canvas. */
function PreviewBackdrop({ compact = false, children }: { compact?: boolean; children: ReactNode }) {
  const background = useScene((s) => s.background);
  return (
    <BackgroundBox
      background={background}
      className={cn(
        "flex w-full items-center justify-center overflow-hidden rounded-md",
        compact ? "h-11 p-1" : "h-16 p-1.5",
      )}
    >
      {children}
    </BackgroundBox>
  );
}

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
  const videoMode = useVideoMode();

  return (
    <div className="flex flex-col gap-0.5">
      {videoDeviceGroups(videoMode).map((group) => (
        <Folder key={group.label} label={group.label} count={group.devices.length} defaultOpen={false}>
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
      <PreviewBackdrop>
        {device.previewSrc ? (
          <img src={device.previewSrc} alt="" className="max-h-full max-w-full" draggable={false} />
        ) : (
          <span className="flex h-10 w-14 items-center justify-center rounded-md border border-dashed border-line-strong text-subtle">
            <ScanLine className="size-4" />
          </span>
        )}
      </PreviewBackdrop>
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
    <Folder label="Your frames" count={frames.length} defaultOpen={false}>
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
        <PreviewBackdrop>
          <img src={asset.url} alt="" className="max-h-full max-w-full" draggable={false} />
        </PreviewBackdrop>
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
/* Layouts                                                                    */
/* -------------------------------------------------------------------------- */

function LayoutLibrary() {
  const current = useScene((s) => s.layout);
  return (
    <div className="grid grid-cols-3 gap-1 px-2">
      {LAYOUT_PRESETS.map((layout) => (
        <button
          key={layout.id}
          type="button"
          aria-pressed={current === layout.id}
          onClick={() => applyLayoutPreset(layout.id)}
          className={cn(
            "group flex min-w-0 cursor-default flex-col items-center gap-1 rounded-lg border px-1 pt-1.5 pb-1 transition-colors",
            current === layout.id ? "border-accent bg-accent-soft" : "border-transparent hover:bg-hover",
          )}
        >
          <PreviewBackdrop compact>
            <LayoutPreview layout={layout} />
          </PreviewBackdrop>
          <span
            className={cn(
              "w-full truncate text-center text-2xs leading-tight font-medium",
              current === layout.id ? "text-accent" : "text-muted group-hover:text-ink",
            )}
          >
            {layout.name}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Typical proportions per slot category, used only to draw layout previews. */
const PREVIEW_SHAPES = {
  phone: { width: 0.49, height: 1, radius: 0.16 },
  tablet: { width: 0.75, height: 1, radius: 0.08 },
  laptop: { width: 1, height: 0.62, radius: 0.04 },
};

/**
 * SVG path of a polygon with rounded corners (any quad: turned or projected).
 * Each corner is cut at `radius` along both edges and joined with a curve.
 */
function roundedPolygonPath(points: { x: number; y: number }[], radius: number): string {
  const n = points.length;
  const commands = points.map((corner, i) => {
    const prev = points[(i - 1 + n) % n]!;
    const next = points[(i + 1) % n]!;
    const toward = (target: { x: number; y: number }) => {
      const length = Math.hypot(target.x - corner.x, target.y - corner.y) || 1;
      const cut = Math.min(radius, length / 2);
      return {
        x: corner.x + ((target.x - corner.x) / length) * cut,
        y: corner.y + ((target.y - corner.y) / length) * cut,
      };
    };
    const start = toward(prev);
    const end = toward(next);
    const f = (v: number) => v.toFixed(3);
    return `${i === 0 ? "M" : "L"}${f(start.x)},${f(start.y)} Q${f(corner.x)},${f(corner.y)} ${f(end.x)},${f(end.y)}`;
  });
  return `${commands.join(" ")} Z`;
}

/** Schematic preview drawn from the layout data itself (no images). */
function LayoutPreview({ layout }: { layout: LayoutPreset }) {
  const shapes = layout.slots.map((slot) => {
    const shape = PREVIEW_SHAPES[slot.category ?? "phone"];
    const scale = slot.size / Math.max(shape.width, shape.height);
    const points = deviceOutline(shape, slot.perspective, slot.rotation, scale).map((p) => ({
      x: p.x + slot.x,
      y: p.y + slot.y,
    }));
    return { points, radius: shape.radius * scale };
  });
  const bounds = boundsOf(shapes.flatMap((s) => s.points));
  const pad = Math.max(bounds.width, bounds.height) * 0.08;
  return (
    <svg
      viewBox={`${bounds.x - pad} ${bounds.y - pad} ${bounds.width + pad * 2} ${bounds.height + pad * 2}`}
      className="h-9 w-full"
      aria-hidden
    >
      {shapes.map((shape, i) => (
        <path
          key={i}
          d={roundedPolygonPath(shape.points, shape.radius)}
          className="fill-[#d9dde5] stroke-[#1f2023]"
          strokeWidth={Math.max(bounds.width, bounds.height) * 0.025}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Presets                                                                    */
/* -------------------------------------------------------------------------- */

function PresetLibrary() {
  const update = useEditorStore((s) => s.update);
  const currentBackground = useScene((s) => s.background);
  // Showcase presets arrange layouts and perspective, which video mode doesn't use.
  const videoMode = useVideoMode();
  return (
    <div className="flex flex-col gap-0.5">
      {SCENE_PRESET_GROUPS.filter((group) => !videoMode || group.id !== "showcase").map((group) => {
        const presets = SCENE_PRESETS.filter((p) => p.group === group.id);
        return (
          <Folder key={group.id} label={group.label} count={presets.length} defaultOpen={false}>
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
      <BackgroundBox background={background} className="rounded-[4px]" style={{ width, height }} />
    </span>
  );
}

/** A box painted with a scene background, as in the canvas (photos cover it, transparent shows the checkerboard). */
function BackgroundBox({
  background,
  className,
  style,
  children,
}: {
  background: BackgroundConfig;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
}) {
  const imageUrl = useBackgroundImageUrl(
    background.type === "image" ? background.source : { kind: "upload", assetId: "" },
  );
  const paint: React.CSSProperties =
    background.type === "solid"
      ? { background: background.color }
      : background.type === "gradient"
        ? { background: gradientCss(background) }
        : background.type === "image"
          ? imageUrl
            ? { background: `center / cover no-repeat url("${imageUrl}")` }
            : { background: "var(--line-strong)" }
          : {};
  return (
    <span
      className={cn(
        "shadow-[inset_0_0_0_1px_var(--tile-ring)]",
        background.type === "transparent" && "checkerboard",
        className,
      )}
      style={{ ...paint, ...style }}
    >
      {children}
    </span>
  );
}
