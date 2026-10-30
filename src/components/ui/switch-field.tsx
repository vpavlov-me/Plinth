"use client";

import { Switch } from "@base-ui/react/switch";
import { useId } from "react";

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** Full-width on/off field: the label on the left, the switch on the right; the whole field toggles. */
export function SwitchField({ label, checked, onChange }: Props) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex h-8 w-full cursor-default items-center justify-between rounded-lg bg-field px-3 text-xs select-none"
    >
      <span className="text-muted">{label}</span>
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={(next) => onChange(next)}
        className="relative flex h-4 w-7 shrink-0 cursor-default rounded-full bg-field-fill-hover p-0.5 transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-[checked]:bg-accent"
      >
        <Switch.Thumb className="size-3 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-transform data-[checked]:translate-x-3" />
      </Switch.Root>
    </label>
  );
}
