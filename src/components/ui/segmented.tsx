"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SegmentedOption<T extends string> = { value: T; label: string; icon?: ReactNode };

type Props<T extends string> = {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  /** Options take width by their label instead of equal shares (for many options). */
  fitLabels?: boolean;
};

/** Single-choice segmented control (keyboard: arrow keys move between options). */
export function Segmented<T extends string>({ label, value, options, onChange, className, fitLabels }: Props<T>) {
  return (
    <ToggleGroup
      aria-label={label}
      value={[value]}
      onValueChange={(next) => {
        const selected = next[0] as T | undefined;
        if (selected) onChange(selected);
      }}
      className={cn("flex h-8 w-full rounded-lg bg-field p-0.5", className)}
    >
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          aria-label={option.icon ? option.label : undefined}
          className={cn(
            "flex min-w-0 cursor-default items-center justify-center gap-1.5 rounded-md px-1.5 text-xs font-medium text-muted transition-colors select-none hover:text-ink data-[pressed]:bg-panel data-[pressed]:text-ink data-[pressed]:shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--line)] [&_svg]:size-3.5",
            fitLabels ? "flex-auto" : "flex-1",
          )}
        >
          {option.icon}
          <span className="truncate">{option.label}</span>
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
