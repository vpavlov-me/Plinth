"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ReactElement } from "react";

type Props = {
  label: string;
  shortcut?: string;
  side?: "top" | "bottom" | "left" | "right";
  /** Element that receives the tooltip trigger behaviour. */
  children: ReactElement<Record<string, unknown>>;
};

export function Tooltip({ label, shortcut, side = "bottom", children }: Props) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={6}>
          <BaseTooltip.Popup className="z-50 flex items-center gap-2 rounded-md bg-ink px-2 py-1 text-2xs font-medium text-chrome shadow-popover transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            {label}
            {shortcut ? <kbd className="font-sans text-subtle">{shortcut}</kbd> : null}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

export const TooltipProvider = BaseTooltip.Provider;
