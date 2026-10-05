"use client";

import { Toast } from "@base-ui/react/toast";
import { X } from "lucide-react";
import { toastManager } from "@/editor/notify";
import { cn } from "@/lib/cn";

export function Toaster({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager} limit={3}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className={cn(
        "relative rounded-xl border border-line bg-panel py-3 pr-9 pl-3.5 shadow-popover transition-all duration-200 data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0",
        toast.type === "error" && "border-danger/40",
      )}
    >
      <Toast.Title className={cn("text-[13px] font-medium", toast.type === "error" ? "text-danger" : "text-ink")} />
      <Toast.Description className="mt-0.5 text-xs text-muted" />
      <Toast.Close
        aria-label="Dismiss"
        className="absolute top-2.5 right-2.5 rounded-md p-0.5 text-subtle hover:bg-hover hover:text-ink"
      >
        <X className="size-3.5" />
      </Toast.Close>
    </Toast.Root>
  ));
}
