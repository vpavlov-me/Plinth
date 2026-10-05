"use client";

import { Slider } from "@base-ui/react/slider";

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
  return (
    <Slider.Root
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={(next) => onChange(next)}
      onValueCommitted={() => onCommit()}
      disabled={disabled}
      className="relative data-[disabled]:opacity-40"
    >
      <Slider.Control
        className="group relative h-8 w-full cursor-ew-resize touch-none overflow-hidden rounded-lg bg-field select-none"
        onDoubleClick={() => {
          if (disabled || defaultValue === undefined || defaultValue === value) return;
          onChange(defaultValue);
          onCommit();
        }}
      >
        <Slider.Track className="h-full w-full">
          <Slider.Indicator className="h-full bg-white/[0.06] transition-colors group-hover:bg-white/[0.08]" />
          <Slider.Thumb
            getAriaValueText={(_formatted, v) => format(v)}
            className="h-3 w-[2px] rounded-full bg-white/35 outline-none group-hover:bg-white/60 has-[:focus-visible]:bg-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
          />
        </Slider.Track>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-3 text-xs">
          <Slider.Label className="text-muted">{label}</Slider.Label>
          <span className="text-ink/80 tabular-nums">{format(value)}</span>
        </div>
      </Slider.Control>
    </Slider.Root>
  );
}
