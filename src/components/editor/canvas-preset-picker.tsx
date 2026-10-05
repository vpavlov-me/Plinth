"use client";

import { NumberInput } from "@/components/ui/number-input";
import { Tooltip } from "@/components/ui/tooltip";
import { CANVAS_MAX_SIZE, CANVAS_MIN_SIZE, CANVAS_PRESETS, type CanvasPreset } from "@/editor/presets/canvas-presets";
import { setCanvasPreset, setCanvasSize } from "@/editor/scene";
import { useEditorStore, useScene } from "@/editor/store";
import { cn } from "@/lib/cn";

/** Canvas size picker, shown at the top of the library's presets. */
export function CanvasPresetPicker() {
  const canvas = useScene((s) => s.canvas);
  const update = useEditorStore((s) => s.update);
  const commit = useEditorStore((s) => s.commit);

  return (
    <div className="flex flex-col gap-2 pr-1">
      <div role="radiogroup" aria-label="Canvas size" className="grid grid-cols-3 gap-1.5">
        {CANVAS_PRESETS.map((preset) => (
          <PresetButton
            key={preset.id}
            preset={preset}
            selected={canvas.preset === preset.id}
            onSelect={() => update((scene, sizeOf) => setCanvasPreset(scene, preset.id, sizeOf))}
          />
        ))}
      </div>
      {canvas.preset === "custom" ? (
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="W"
            value={canvas.width}
            min={CANVAS_MIN_SIZE}
            max={CANVAS_MAX_SIZE}
            onChange={(width) =>
              update((scene, sizeOf) => setCanvasSize(scene, { width }, sizeOf), { transient: true })
            }
            onCommit={commit}
          />
          <NumberInput
            label="H"
            value={canvas.height}
            min={CANVAS_MIN_SIZE}
            max={CANVAS_MAX_SIZE}
            onChange={(height) =>
              update((scene, sizeOf) => setCanvasSize(scene, { height }, sizeOf), { transient: true })
            }
            onCommit={commit}
          />
        </div>
      ) : null}
    </div>
  );
}

function PresetButton({
  preset,
  selected,
  onSelect,
}: {
  preset: CanvasPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Tooltip label={preset.hint} side="bottom">
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={`${preset.label} ${preset.ratio}`}
        onClick={onSelect}
        className={cn(
          "flex h-12 cursor-default flex-col items-center justify-center gap-1 rounded-lg border transition-colors",
          selected
            ? "border-accent bg-accent-soft text-accent"
            : "border-line text-muted hover:bg-hover hover:text-ink",
        )}
      >
        <RatioIcon preset={preset} />
        <span className="text-2xs leading-none font-medium">{preset.ratio}</span>
      </button>
    </Tooltip>
  );
}

function RatioIcon({ preset }: { preset: CanvasPreset }) {
  if (!preset.size) {
    return (
      <span
        className={cn(
          "size-3.5 rounded-[3px] border-[1.5px] border-current",
          preset.id === "custom" ? "border-dashed" : "opacity-80",
        )}
      />
    );
  }
  const ratio = preset.size.width / preset.size.height;
  const width = ratio >= 1 ? 18 : 18 * ratio;
  const height = ratio >= 1 ? 18 / ratio : 18;
  return (
    <span
      className="rounded-[3px] border-[1.5px] border-current"
      style={{ width: width * 0.8, height: height * 0.8 }}
    />
  );
}
