import { downloadBlob, ExportError, renderScene } from "@/editor/export/export-image";
import { notify } from "@/editor/notify";
import { completeOnboarding } from "@/editor/onboarding";
import { getScene } from "@/editor/store";
import { useUIStore, type ExportSettings } from "@/editor/ui-store";
import { sceneHasAnyVideo } from "@/editor/video";

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

let videoAbort: AbortController | null = null;

/** Renders the scene's video (MP4, or WebM where H.264 isn't available) and downloads it. */
async function exportVideo(): Promise<void> {
  const ui = useUIStore.getState();
  if (ui.exporting) return;
  ui.setExporting(true);
  ui.setVideoProgress(0);
  videoAbort = new AbortController();
  try {
    const { renderVideo } = await import("@/editor/export/export-video");
    const { blob, fileName, width, height } = await renderVideo(getScene(), {
      quality: useUIStore.getState().exportSettings.videoQuality,
      signal: videoAbort.signal,
      onProgress: (done) => useUIStore.getState().setVideoProgress(done),
    });
    downloadBlob(blob, fileName);
    completeOnboarding();
    notify("Exported", { description: `${fileName} · ${width} × ${height}`, type: "success" });
  } catch (error) {
    if (error instanceof Error && error.name === "ExportCanceled") return;
    const description = error instanceof ExportError ? error.message : "The video could not be rendered.";
    notify("Export failed", { description, type: "error" });
  } finally {
    videoAbort = null;
    useUIStore.getState().setVideoProgress(null);
    useUIStore.getState().setExporting(false);
  }
}

/** Stops a running video export. */
export function cancelVideoExport(): void {
  videoAbort?.abort();
}

/** Renders the scene with the current export settings and downloads it (a video when the scene has one). */
export function exportScene(): Promise<void> {
  if (sceneHasAnyVideo(getScene())) return exportVideo();
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
