/** "⌘" on Apple platforms, "Ctrl+" elsewhere. Safe to call during SSR. */
export function modKey(): string {
  if (typeof navigator === "undefined") return "⌘";
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl+";
}
