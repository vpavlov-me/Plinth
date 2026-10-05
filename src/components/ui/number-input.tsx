"use client";

import { NumberField } from "@base-ui/react/number-field";
import { useId } from "react";

type Props = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** Fires while typing or scrubbing. */
  onChange: (value: number) => void;
  /** Fires on blur, Enter or at the end of a scrub. */
  onCommit: () => void;
};

/**
 * Compact numeric input. Dragging the label scrubs the value, a common
 * pattern in design tools.
 */
export function NumberInput({ label, value, min, max, step = 1, onChange, onCommit }: Props) {
  const id = useId();
  return (
    <NumberField.Root
      id={id}
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={(next) => {
        if (next !== null && Number.isFinite(next)) onChange(next);
      }}
      onValueCommitted={() => onCommit()}
      className="min-w-0"
    >
      <NumberField.Group className="flex h-8 items-center rounded-lg bg-field focus-within:outline-2 focus-within:outline-accent">
        <NumberField.ScrubArea className="flex h-full cursor-ew-resize items-center pr-1 pl-2.5">
          <label htmlFor={id} className="cursor-ew-resize text-xs text-subtle select-none">
            {label}
          </label>
        </NumberField.ScrubArea>
        <NumberField.Input className="h-full w-full min-w-0 bg-transparent pr-2 text-xs text-ink tabular-nums outline-none" />
      </NumberField.Group>
    </NumberField.Root>
  );
}
