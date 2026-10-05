"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { COLLAPSE_CHEVRON, COLLAPSE_PANEL, COLLAPSE_TRIGGER } from "@/components/ui/collapse";

type Props = {
  title: string;
  /** Controls shown on the right of the header (stay clickable when collapsed). */
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

/** Inspector section whose header smoothly collapses and expands its controls. */
export function Section({ title, action, defaultOpen = true, children }: Props) {
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
