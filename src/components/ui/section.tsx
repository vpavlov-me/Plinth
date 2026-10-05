"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  /** Controls shown on the right of the header (stay clickable when collapsed). */
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

/** Inspector section with a header that collapses and expands its controls. */
export function Section({ title, action, defaultOpen = true, children }: Props) {
  return (
    <Collapsible.Root
      defaultOpen={defaultOpen}
      render={<section aria-label={title} />}
      className="border-b border-line px-4 py-3 last:border-b-0"
    >
      <header className="flex h-7 items-center justify-between gap-2">
        <Collapsible.Trigger className="group -ml-1 flex h-7 flex-1 cursor-default items-center gap-1.5 rounded-md px-1 text-left text-xs font-semibold text-ink hover:text-ink/80">
          <ChevronDown className="size-3.5 text-muted transition-transform group-data-[panel-closed]:-rotate-90" />
          {title}
        </Collapsible.Trigger>
        {action}
      </header>
      <Collapsible.Panel className="flex flex-col gap-3 pt-2.5">{children}</Collapsible.Panel>
    </Collapsible.Root>
  );
}
