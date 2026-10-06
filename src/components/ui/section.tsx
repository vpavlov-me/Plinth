"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { COLLAPSE_CHEVRON, COLLAPSE_PANEL, COLLAPSE_TRIGGER } from "@/components/ui/collapse";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  /** Controls shown on the right of the header (stay clickable when collapsed). */
  action?: ReactNode;
  defaultOpen?: boolean;
  /** When set, the section stays collapsed and shows a lock with this explanation. */
  locked?: string;
  children: ReactNode;
};

/** Inspector section whose header smoothly collapses and expands its controls. */
export function Section({ title, action, defaultOpen = true, locked, children }: Props) {
  if (locked) {
    return (
      <section aria-label={title} className="px-4 py-2.5">
        <header className="flex h-7 items-center justify-between gap-2">
          <LockedTitle title={title} reason={locked} />
        </header>
      </section>
    );
  }
  return (
    <Collapsible.Root defaultOpen={defaultOpen} render={<section aria-label={title} />} className="px-4 py-2.5">
      <header className="flex h-7 items-center justify-between gap-2">
        <Collapsible.Trigger className={COLLAPSE_TRIGGER}>
          {title}
          <ChevronDown className={COLLAPSE_CHEVRON} />
        </Collapsible.Trigger>
        {action}
      </header>
      <Collapsible.Panel className={COLLAPSE_PANEL}>
        <div className="flex flex-col gap-2 pt-2 pb-2">{children}</div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

/** A collapsed, unavailable heading: muted title and a lock whose tooltip says why. */
export function LockedTitle({ title, reason, className }: { title: string; reason: string; className?: string }) {
  return (
    <Tooltip label={reason} side="top">
      <button
        type="button"
        aria-disabled
        aria-label={`${title} (${reason})`}
        className={cn(
          "flex h-7 cursor-default items-center gap-1.5 rounded-md text-left text-xs font-semibold text-subtle",
          className,
        )}
      >
        {title}
        <Lock className="size-3 shrink-0" />
      </button>
    </Tooltip>
  );
}
