import { downloadBlob, ExportError, renderScene } from "@/editor/export/export-image";
import { notify } from "@/editor/notify";
import { completeOnboarding } from "@/editor/onboarding";
import { getScene } from "@/editor/store";
import { useUIStore, type ExportSettings } from "@/editor/ui-store";

async function runExport<T>(
  settings: ExportSettings,
  handle: (result: Awaited<ReturnType<typeof renderScene>>) => Promise<T> | T,
) {
  const ui = useUIStore.getState();
  if (ui.exporting) return;
  ui.setExporting(true);
  try {
    const result = await renderScene(getScene(), settings);
    return await handle(result);
  } catch (error) {
    const description =
      error instanceof ExportError ? error.message : "The image could not be rendered. Try a smaller scale.";
    notify("Export failed", { description, type: "error" });
  } finally {
    useUIStore.getState().setExporting(false);
  }
}

/** Renders the scene with the current export settings and downloads it. */
export function exportScene(): Promise<void> {
  return runExport(useUIStore.getState().exportSettings, ({ blob, fileName, width, height }) => {
    downloadBlob(blob, fileName);
    completeOnboarding();
    notify("Exported", { description: `${fileName} · ${width} × ${height}`, type: "success" });
  });
}

/** Copies a PNG (current scale) to the clipboard. */
export function copySceneToClipboard(): Promise<void> {
  const settings = { ...useUIStore.getState().exportSettings, format: "png" as const };
  return runExport(settings, async ({ blob }) => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      notify("Copied to clipboard", { type: "success" });
    } catch {
      notify("Couldn’t copy", {
        description: "Your browser blocked clipboard access. Use Download instead.",
        type: "error",
      });
    }
  });
}
