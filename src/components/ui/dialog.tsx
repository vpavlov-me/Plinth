"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Centred modal with a title, an optional description and a close button. */
export function Dialog({ open, onOpenChange, title, description, className, children }: Props) {
  // Focus the dialog itself, so the close button doesn't show a focus ring on open.
  const popupRef = useRef<HTMLDivElement>(null);
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-backdrop transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <BaseDialog.Popup
          ref={popupRef}
          initialFocus={popupRef}
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-48px)] w-[440px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-line bg-panel shadow-popover transition-[opacity,scale] duration-200 outline-none data-[ending-style]:scale-98 data-[ending-style]:opacity-0 data-[starting-style]:scale-98 data-[starting-style]:opacity-0",
            className,
          )}
        >
          <header className="flex items-start justify-between gap-4 px-5 pt-4">
            <div className="min-w-0">
              <BaseDialog.Title className="text-[15px] font-semibold text-ink">{title}</BaseDialog.Title>
              {description ? (
                <BaseDialog.Description className="mt-1 text-xs leading-5 text-muted">
                  {description}
                </BaseDialog.Description>
              ) : null}
            </div>
            <BaseDialog.Close
              aria-label="Close"
              className="-mr-2 flex size-7 shrink-0 cursor-default items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-ink"
            >
              <X className="size-4" />
            </BaseDialog.Close>
          </header>
          <div className="min-h-0 scrollbar-thin overflow-y-auto px-5 pt-3 pb-5">{children}</div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

/** A key cap, e.g. <Kbd>⌘</Kbd>. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line bg-field px-1.5 font-sans text-2xs font-medium text-ink">
      {children}
    </kbd>
  );
}
