"use client";

import { Slider } from "@base-ui/react/slider";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { useEffect, useState } from "react";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Value restored by double-clicking the field. */
  defaultValue?: number;
  /** Formats the value shown on the right. */
  format?: (value: number) => string;
  /** Fires continuously while dragging. */
  onChange: (value: number) => void;
  /** Fires once when the interaction ends. */
  onCommit: () => void;
  disabled?: boolean;
};

/**
 * Full-width "field" slider: the whole field is the track, the fill shows the
 * value and a thin handle marks it. Label and value sit inside the field.
 * Hovering shows the value under the pointer (the one a click would pick);
 * double-clicking restores the default value.
 * Keyboard: arrow keys / Page Up / Page Down / Home / End.
 */
export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  defaultValue,
  format = String,
  onChange,
  onCommit,
  disabled = false,
}: Props) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  // The pointer can be released outside the field.
  useEffect(() => {
    if (!dragging) return;
    const end = () => setDragging(false);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [dragging]);

  const valueAt = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(rect.width, 1)));
    const raw = min + ratio * (max - min);
    const snapped = min + Math.round((raw - min) / step) * step;
    // Round away float noise from fractional steps.
    return Math.min(max, Math.max(min, Number(snapped.toFixed(6))));
  };

  const tip = dragging ? value : hoverValue;
  const resetHint = defaultValue !== undefined && defaultValue !== value && !dragging && hoverValue !== null;

  return (
    <BaseTooltip.Root
      open={!disabled && tip !== null}
      onOpenChange={(open) => {
        if (!open && !dragging) setHoverValue(null);
      }}
      trackCursorAxis="x"
    >
      <Slider.Root
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onChange(next)}
        onValueCommitted={() => {
          setDragging(false);
          onCommit();
        }}
        disabled={disabled}
        className="relative data-[disabled]:opacity-40"
      >
        <BaseTooltip.Trigger
          delay={0}
          render={
            <Slider.Control
              className="group relative h-8 w-full cursor-ew-resize touch-none overflow-hidden rounded-lg bg-field select-none"
              onPointerMove={(event) => setHoverValue(valueAt(event))}
              onPointerLeave={() => setHoverValue(null)}
              onPointerDown={() => setDragging(true)}
              onDoubleClick={() => {
                if (disabled || defaultValue === undefined || defaultValue === value) return;
                onChange(defaultValue);
                onCommit();
              }}
            />
          }
        >
          <Slider.Track className="h-full w-full">
            <Slider.Indicator className="h-full bg-field-fill transition-colors group-hover:bg-field-fill-hover" />
            <Slider.Thumb
              getAriaValueText={(_formatted, v) => format(v)}
              className="h-3 w-[2px] rounded-full bg-field-handle outline-none group-hover:bg-field-handle-hover has-[:focus-visible]:bg-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
            />
          </Slider.Track>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-3 text-xs">
            <Slider.Label className="text-muted">{label}</Slider.Label>
            <span className="text-ink/80 tabular-nums">{format(value)}</span>
          </div>
        </BaseTooltip.Trigger>
      </Slider.Root>
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side="top" sideOffset={6}>
          <BaseTooltip.Popup className="pointer-events-none z-50 flex items-center gap-2 rounded-md bg-ink px-2 py-1 text-2xs font-medium text-chrome tabular-nums shadow-popover">
            {tip !== null ? format(tip) : null}
            {resetHint ? <span className="text-subtle">Double-click to reset</span> : null}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
