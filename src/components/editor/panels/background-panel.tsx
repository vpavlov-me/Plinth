"use client";

/* eslint-disable @next/next/no-img-element -- local previews and static thumbnails */
import { Popover } from "@base-ui/react/popover";
import { Plus, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { gradientCss } from "@/components/editor/css-background";
import { pickImageFile } from "@/components/editor/pick-file";
import { Button } from "@/components/ui/button";
import { ColorField } from "@/components/ui/color-field";
import { Section } from "@/components/ui/section";
import { Segmented } from "@/components/ui/segmented";
import { Tooltip } from "@/components/ui/tooltip";
import { importBackgroundImage, matchBackgroundColors } from "@/editor/actions";
import { getAsset, getCachedImage, useAsset, useImage } from "@/editor/assets";
import { MATCH_VARIANTS, matchedBackground, screenshotPalette } from "@/editor/color-match";
import { useActiveDeviceId } from "@/editor/selection";
import { sameGradient, useLibraryStore } from "@/editor/library";
import { cloneGradient, DEFAULT_GRADIENT, GRADIENT_PRESETS, SOLID_SWATCHES } from "@/editor/presets/background-presets";
import { PHOTO_PRESETS, photoThumbSrc } from "@/editor/presets/photo-presets";
import { useEditorStore, useScene } from "@/editor/store";
import type { BackgroundConfig, BackgroundImageSource, BackgroundType, GradientConfig } from "@/editor/types";
import { cn } from "@/lib/cn";

export function BackgroundPanel() {
  const background = useScene((s) => s.background);
  const update = useEditorStore((s) => s.update);
  const commit = useEditorStore((s) => s.commit);
  // Remembers the last configuration of each type so switching tabs is lossless.
  const memory = useRef<Partial<Record<BackgroundType, BackgroundConfig>>>({});
  useEffect(() => {
    memory.current[background.type] = background;
  }, [background]);

  const set = (next: BackgroundConfig, transient = false) =>
    update((scene) => ({ ...scene, background: next }), { transient });

  const switchType = (type: BackgroundType) => {
    if (type === background.type) return;
    const remembered = memory.current[type];
    if (remembered && (remembered.type !== "image" || isAvailable(remembered.source))) return set(remembered);
    if (type === "solid") return set({ type: "solid", color: "#f4f4f5" });
    if (type === "gradient") return set(cloneGradient(DEFAULT_GRADIENT));
    if (type === "transparent") return set({ type: "transparent" });
    const firstPhoto = PHOTO_PRESETS[0];
    const firstUpload = useLibraryStore.getState().images[0];
    if (firstPhoto) return set({ type: "image", source: { kind: "photo", photoId: firstPhoto.id } });
    if (firstUpload) return set({ type: "image", source: { kind: "upload", assetId: firstUpload } });
    pickImageFile((file) => void importBackgroundImage(file));
  };

  return (
    <Section title="Background">
      <MatchColors />
      <Segmented<BackgroundType>
        label="Background type"
        value={background.type}
        onChange={switchType}
        options={[
          { value: "solid", label: "Solid" },
          { value: "gradient", label: "Gradient" },
          { value: "image", label: "Image" },
          { value: "transparent", label: "None" },
        ]}
      />
      {background.type === "solid" ? (
        <SolidTiles
          color={background.color}
          onPick={(color, transient) => set({ type: "solid", color }, transient)}
          onCommit={commit}
        />
      ) : null}
      {background.type === "gradient" ? <GradientTiles gradient={background} onPick={(g) => set(g)} /> : null}
      {background.type === "image" ? (
        <ImageTiles source={background.source} onPick={(source) => set({ type: "image", source })} />
      ) : null}
      {background.type === "transparent" ? (
        <p className="text-xs leading-5 text-muted">Exports as a transparent PNG. JPG exports use white.</p>
      ) : null}
    </Section>
  );
}

/**
 * One click builds a background from the screenshot's colours; the small
 * tiles offer the Soft / Vivid / Dark variations.
 */
function MatchColors() {
  const activeId = useActiveDeviceId();
  const assetId = useScene((scene) => {
    const active = scene.devices.find((d) => d.id === activeId && d.screenshotId);
    return (active ?? scene.devices.find((d) => d.screenshotId))?.screenshotId ?? null;
  });
  const asset = useAsset(assetId);
  // Re-renders once the screenshot is decoded.
  const image = useImage(asset?.url) ?? (asset ? getCachedImage(asset.url) : null);
  const palette = asset && image ? screenshotPalette(asset.id, image) : null;

  return (
    <div className="flex items-center gap-1.5">
      <Button
        className="flex-1"
        disabled={!palette}
        onClick={() => matchBackgroundColors("soft", activeId)}
        title={palette ? "Build a background from the screenshot’s colours" : "Add a screenshot to match its colours"}
      >
        <Sparkles className="size-4" />
        Match colors
      </Button>
      {palette
        ? MATCH_VARIANTS.map((variant) => (
            <Tooltip key={variant.id} label={`Match colors · ${variant.name}`}>
              <button
                type="button"
                aria-label={`Match colors: ${variant.name}`}
                onClick={() => matchBackgroundColors(variant.id, activeId)}
                className="size-8 shrink-0 cursor-default rounded-lg shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] transition hover:brightness-110"
                style={{ background: gradientCss(matchedBackground(palette, variant.id)) }}
              />
            </Tooltip>
          ))
        : null}
    </div>
  );
}

function isAvailable(source: BackgroundImageSource): boolean {
  return source.kind === "photo"
    ? PHOTO_PRESETS.some((p) => p.id === source.photoId)
    : getAsset(source.assetId) !== null;
}

/* -------------------------------------------------------------------------- */
/* Tiles                                                                      */
/* -------------------------------------------------------------------------- */

type TileProps = {
  label: string;
  selected: boolean;
  onSelect: () => void;
  /** Present for the user's own items. */
  onRemove?: () => void;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
};

function Tile({ label, selected, onSelect, onRemove, className, style, children }: TileProps) {
  return (
    <div className="group/tile relative">
      <button
        type="button"
        aria-label={label}
        aria-pressed={selected}
        onClick={onSelect}
        style={style}
        className={cn(
          "block w-full cursor-default overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] transition-[box-shadow,transform] hover:brightness-110",
          selected && "ring-2 ring-ink ring-offset-2 ring-offset-panel",
          className,
        )}
      >
        {children}
      </button>
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 hidden size-5 cursor-default items-center justify-center rounded-full bg-active text-ink shadow-popover group-focus-within/tile:flex group-hover/tile:flex hover:bg-line-strong"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

const ADD_TILE =
  "flex w-full cursor-default items-center justify-center rounded-lg border border-dashed border-line-strong text-muted transition-colors hover:border-muted hover:text-ink";

/** Small square tiles, seven per row, for colours, gradients and images alike. */
function TileGrid({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-7 gap-1.5">
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Solid                                                                      */
/* -------------------------------------------------------------------------- */

function SolidTiles({
  color,
  onPick,
  onCommit,
}: {
  color: string;
  onPick: (color: string, transient?: boolean) => void;
  onCommit: () => void;
}) {
  const saved = useLibraryStore((s) => s.colors);
  const addColor = useLibraryStore((s) => s.addColor);
  const removeColor = useLibraryStore((s) => s.removeColor);
  const inputRef = useRef<HTMLInputElement>(null);

  // The native "change" event fires once, when the picker closes.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const onDone = () => {
      onCommit();
      addColor(input.value);
    };
    input.addEventListener("change", onDone);
    return () => input.removeEventListener("change", onDone);
  }, [addColor, onCommit]);

  return (
    <TileGrid label="Colours">
      <Tooltip label="Add your colour">
        <label className={cn(ADD_TILE, "relative aspect-square")}>
          <Plus className="size-4" />
          <span className="sr-only">Add your colour</span>
          <input
            ref={inputRef}
            type="color"
            defaultValue={color.length === 7 ? color : "#ffffff"}
            onChange={(e) => onPick(e.target.value, true)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      </Tooltip>
      {saved.map((c) => (
        <Tile
          key={`saved-${c}`}
          label={c}
          selected={color === c}
          onSelect={() => onPick(c)}
          onRemove={() => removeColor(c)}
          className="aspect-square"
          style={{ background: c }}
        />
      ))}
      {SOLID_SWATCHES.map((c) => (
        <Tile
          key={c}
          label={c}
          selected={color === c && !saved.includes(c)}
          onSelect={() => onPick(c)}
          className="aspect-square"
          style={{ background: c }}
        />
      ))}
    </TileGrid>
  );
}

/* -------------------------------------------------------------------------- */
/* Gradient                                                                   */
/* -------------------------------------------------------------------------- */

function GradientTiles({ gradient, onPick }: { gradient: GradientConfig; onPick: (g: GradientConfig) => void }) {
  const saved = useLibraryStore((s) => s.gradients);
  const removeGradient = useLibraryStore((s) => s.removeGradient);
  const isSaved = saved.some((g) => sameGradient(g, gradient));

  return (
    <TileGrid label="Gradients">
      <AddGradientTile onAdd={onPick} />
      {saved.map((g, index) => (
        <Tile
          key={`saved-${index}-${g.colors.join()}`}
          label={`Your gradient ${index + 1}`}
          selected={sameGradient(g, gradient)}
          onSelect={() => onPick({ ...g, colors: [...g.colors] })}
          onRemove={() => removeGradient(index)}
          className="aspect-square"
          style={{ background: gradientCss(g) }}
        />
      ))}
      {GRADIENT_PRESETS.map((preset) => (
        <Tile
          key={preset.id}
          label={preset.name}
          selected={!isSaved && sameGradient(preset.gradient, gradient)}
          onSelect={() => onPick(cloneGradient(preset.gradient))}
          className="aspect-square"
          style={{ background: gradientCss(preset.gradient) }}
        />
      ))}
    </TileGrid>
  );
}

const GRADIENT_ANGLE = 135;

function AddGradientTile({ onAdd }: { onAdd: (g: GradientConfig) => void }) {
  const addGradient = useLibraryStore((s) => s.addGradient);
  const [open, setOpen] = useState(false);
  const [colors, setColors] = useState<[string, string]>(["#a5b4fc", "#f0abfc"]);
  const draft: GradientConfig = { type: "gradient", colors, angle: GRADIENT_ANGLE };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tooltip label="Add your gradient">
        <Popover.Trigger aria-label="Add your gradient" className={cn(ADD_TILE, "aspect-square")}>
          <Plus className="size-4" />
        </Popover.Trigger>
      </Tooltip>
      <Popover.Portal>
        <Popover.Positioner side="left" align="start" sideOffset={12}>
          <Popover.Popup className="z-40 flex w-56 flex-col gap-3 rounded-xl border border-line bg-panel p-3 shadow-popover outline-none">
            <Popover.Title className="text-xs font-semibold text-ink">New gradient</Popover.Title>
            <div className="h-16 rounded-lg" style={{ background: gradientCss(draft) }} />
            <ColorField
              label="From"
              value={colors[0]}
              onChange={(c) => setColors([c, colors[1]])}
              onCommit={() => undefined}
            />
            <ColorField
              label="To"
              value={colors[1]}
              onChange={(c) => setColors([colors[0], c])}
              onCommit={() => undefined}
            />
            <Button
              variant="primary"
              onClick={() => {
                addGradient(draft);
                onAdd({ ...draft, colors: [...colors] });
                setOpen(false);
              }}
            >
              Add gradient
            </Button>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Image                                                                      */
/* -------------------------------------------------------------------------- */

function ImageTiles({
  source,
  onPick,
}: {
  source: BackgroundImageSource;
  onPick: (source: BackgroundImageSource) => void;
}) {
  const uploads = useLibraryStore((s) => s.images);
  const removeImage = useLibraryStore((s) => s.removeImage);

  return (
    <TileGrid label="Images">
      <Tooltip label="Upload your image">
        <button
          type="button"
          aria-label="Upload your image"
          onClick={() => pickImageFile((file) => void importBackgroundImage(file))}
          className={cn(ADD_TILE, "aspect-square")}
        >
          <Plus className="size-4" />
        </button>
      </Tooltip>
      {uploads.map((assetId) => (
        <UploadTile
          key={assetId}
          assetId={assetId}
          selected={source.kind === "upload" && source.assetId === assetId}
          onSelect={() => onPick({ kind: "upload", assetId })}
          onRemove={() => removeImage(assetId)}
        />
      ))}
      {PHOTO_PRESETS.map((photo) => (
        <Tooltip key={photo.id} label={photo.author ? `${photo.name} · ${photo.author}, via Unsplash` : photo.name}>
          <div>
            <Tile
              label={photo.name}
              selected={source.kind === "photo" && source.photoId === photo.id}
              onSelect={() => onPick({ kind: "photo", photoId: photo.id })}
              className="aspect-square"
            >
              <img src={photoThumbSrc(photo.id)} alt="" className="size-full object-cover" draggable={false} />
            </Tile>
          </div>
        </Tooltip>
      ))}
    </TileGrid>
  );
}

function UploadTile({
  assetId,
  selected,
  onSelect,
  onRemove,
}: {
  assetId: string;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const asset = useAsset(assetId);
  if (!asset) return null;
  return (
    <Tile label={asset.name} selected={selected} onSelect={onSelect} onRemove={onRemove} className="aspect-square">
      <img src={asset.url} alt="" className="size-full object-cover" draggable={false} />
    </Tile>
  );
}
