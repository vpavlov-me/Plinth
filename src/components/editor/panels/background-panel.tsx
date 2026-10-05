"use client";

/* eslint-disable @next/next/no-img-element -- local object URL preview */
import { ImagePlus, Minus, Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { linearGradientCss } from "@/components/editor/css-background";
import { pickImageFile } from "@/components/editor/pick-file";
import { Button, IconButton } from "@/components/ui/button";
import { ColorField } from "@/components/ui/color-field";
import { Section } from "@/components/ui/section";
import { Segmented } from "@/components/ui/segmented";
import { SliderField } from "@/components/ui/slider-field";
import { importBackgroundImage } from "@/editor/actions";
import { getAsset, useAsset } from "@/editor/assets";
import { DEFAULT_GRADIENT, GRADIENT_PRESETS, SOLID_SWATCHES } from "@/editor/presets/background-presets";
import { useEditorStore, useScene } from "@/editor/store";
import type { BackgroundConfig, BackgroundType, GradientConfig } from "@/editor/types";
import { cn } from "@/lib/cn";

const MAX_STOPS = 4;

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
    if (remembered && (remembered.type !== "image" || getAsset(remembered.assetId))) return set(remembered);
    if (type === "solid") return set({ type: "solid", color: "#f4f4f5" });
    if (type === "gradient") return set({ ...DEFAULT_GRADIENT, colors: [...DEFAULT_GRADIENT.colors] });
    if (type === "transparent") return set({ type: "transparent" });
    pickImageFile((file) => void importBackgroundImage(file));
  };

  return (
    <Section title="Background">
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
        <>
          <SwatchGrid
            label="Colour swatches"
            items={SOLID_SWATCHES.map((color) => ({
              id: color,
              label: color,
              css: color,
              selected: background.color === color,
            }))}
            onSelect={(color) => set({ type: "solid", color })}
          />
          <ColorField
            label="Colour"
            value={background.color}
            onChange={(color) => set({ type: "solid", color }, true)}
            onCommit={commit}
          />
        </>
      ) : null}
      {background.type === "gradient" ? (
        <GradientControls gradient={background} onChange={set} onCommit={commit} />
      ) : null}
      {background.type === "image" ? (
        <ImageControls assetId={background.assetId} fit={background.fit} onFit={(fit) => set({ ...background, fit })} />
      ) : null}
      {background.type === "transparent" ? (
        <p className="text-xs leading-5 text-muted">Exports as a transparent PNG. JPG exports use white.</p>
      ) : null}
    </Section>
  );
}

type Swatch = { id: string; label: string; css: string; selected: boolean };

function SwatchGrid({ label, items, onSelect }: { label: string; items: Swatch[]; onSelect: (id: string) => void }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-8 gap-1.5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={item.label}
          aria-pressed={item.selected}
          onClick={() => onSelect(item.id)}
          className={cn(
            "aspect-square cursor-default rounded-md shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] transition-transform hover:scale-110",
            item.selected && "ring-2 ring-accent ring-offset-2 ring-offset-panel",
          )}
          style={{ background: item.css }}
        />
      ))}
    </div>
  );
}

function GradientControls({
  gradient,
  onChange,
  onCommit,
}: {
  gradient: GradientConfig;
  onChange: (next: GradientConfig, transient?: boolean) => void;
  onCommit: () => void;
}) {
  const setColor = (index: number, color: string, transient: boolean) =>
    onChange({ ...gradient, colors: gradient.colors.map((c, i) => (i === index ? color : c)) }, transient);

  return (
    <>
      <SwatchGrid
        label="Gradient presets"
        items={GRADIENT_PRESETS.map((preset) => ({
          id: preset.id,
          label: preset.name,
          css: linearGradientCss(preset.gradient),
          selected:
            preset.gradient.angle === gradient.angle && preset.gradient.colors.join() === gradient.colors.join(),
        }))}
        onSelect={(id) => {
          const preset = GRADIENT_PRESETS.find((p) => p.id === id);
          if (preset) onChange({ ...preset.gradient, colors: [...preset.gradient.colors] });
        }}
      />
      <div className="flex flex-col gap-1.5">
        {gradient.colors.map((color, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <div className="min-w-0 flex-1">
              <ColorField
                label={`Gradient colour ${index + 1}`}
                value={color}
                onChange={(next) => setColor(index, next, true)}
                onCommit={onCommit}
              />
            </div>
            <IconButton
              label="Remove colour"
              icon={<Minus />}
              disabled={gradient.colors.length <= 2}
              onClick={() => onChange({ ...gradient, colors: gradient.colors.filter((_, i) => i !== index) })}
            />
          </div>
        ))}
        {gradient.colors.length < MAX_STOPS ? (
          <Button
            size="sm"
            variant="ghost"
            className="self-start text-muted"
            onClick={() => onChange({ ...gradient, colors: [...gradient.colors, gradient.colors.at(-1) ?? "#ffffff"] })}
          >
            <Plus className="size-3.5" />
            Add colour
          </Button>
        ) : null}
      </div>
      <SliderField
        label="Angle"
        value={gradient.angle}
        min={0}
        max={360}
        format={(v) => `${v}°`}
        onChange={(angle) => onChange({ ...gradient, angle }, true)}
        onCommit={onCommit}
      />
    </>
  );
}

function ImageControls({
  assetId,
  fit,
  onFit,
}: {
  assetId: string;
  fit: "cover" | "contain";
  onFit: (fit: "cover" | "contain") => void;
}) {
  const asset = useAsset(assetId);
  return (
    <>
      <div className="flex items-center gap-2.5">
        <div className="checkerboard size-10 shrink-0 overflow-hidden rounded-md shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)]">
          {asset ? <img src={asset.url} alt="" className="size-full object-cover" /> : null}
        </div>
        <span className="min-w-0 flex-1 truncate text-xs text-muted">{asset?.name ?? "Image"}</span>
        <Button size="sm" onClick={() => pickImageFile((file) => void importBackgroundImage(file))}>
          <ImagePlus className="size-3.5" />
          Replace
        </Button>
      </div>
      <Segmented
        label="Image fit"
        value={fit}
        onChange={onFit}
        options={[
          { value: "cover", label: "Fill" },
          { value: "contain", label: "Fit" },
        ]}
      />
    </>
  );
}
