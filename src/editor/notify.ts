import { Toast } from "@base-ui/react/toast";

/** Global toast manager so non-React code (imports, export) can report status. */
export const toastManager = Toast.createToastManager();

type NotifyType = "info" | "success" | "error";

export function notify(title: string, options: { description?: string; type?: NotifyType } = {}): void {
  toastManager.add({
    title,
    description: options.description,
    type: options.type ?? "info",
    timeout: options.type === "error" ? 6000 : 3500,
    priority: options.type === "error" ? "high" : "low",
  });
}
