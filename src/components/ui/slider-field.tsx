"use client";

import { Slider } from "@base-ui/react/slider";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Formats the value shown next to the label. */
  format?: (value: number) => string;
  /** Fires continuously while dragging. */
  onChange: (value: number) => void;
  /** Fires once when the interaction ends. */
  onCommit: () => void;
};

export function SliderField({ label, value, min, max, step = 1, format = String, onChange, onCommit }: Props) {
  return (
    <Slider.Root
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={(next) => onChange(next)}
      onValueCommitted={() => onCommit()}
      className="grid grid-cols-[64px_1fr_44px] items-center gap-2"
    >
      <Slider.Label className="text-xs text-muted">{label}</Slider.Label>
      <Slider.Control className="flex h-6 w-full touch-none items-center select-none">
        <Slider.Track className="h-1 w-full rounded-full bg-active">
          <Slider.Indicator className="rounded-full bg-ink/70" />
          <Slider.Thumb
            getAriaValueText={(_formatted, v) => format(v)}
            className="size-3.5 rounded-full border border-line-strong bg-panel shadow-[0_1px_3px_rgb(0_0_0/0.2)] outline-offset-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
          />
        </Slider.Track>
      </Slider.Control>
      <span className="text-right text-xs text-muted tabular-nums">{format(value)}</span>
    </Slider.Root>
  );
}
