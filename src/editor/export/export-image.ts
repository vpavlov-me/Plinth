import { createElement } from "react";
import { getAsset, loadImage } from "@/editor/assets";
import { backgroundImageUrl } from "@/editor/background-image";
import { getDevice, getVariant } from "@/editor/devices/definitions";
import type { Size } from "@/editor/geometry";
import type { ExportSettings } from "@/editor/ui-store";
import type { Scene } from "@/editor/types";
import { VideoFrameContext, type VideoFrameSource } from "@/editor/rendering/video-frames";

/** Longest side of an exported image. Browsers refuse larger canvases. */
const MAX_EXPORT_SIDE = 16384;
/** Total pixel budget (≈ 400 MB of RGBA). Above this browsers may fail silently. */
const MAX_EXPORT_PIXELS = 100_000_000;

export class ExportError extends Error {
  override name = "ExportError";
}

export type ExportResult = { blob: Blob; width: number; height: number; fileName: string };

export function exportSize(canvas: Size, scale: number): Size {
  return { width: canvas.width * scale, height: canvas.height * scale };
}

export function isExportSizeSupported(canvas: Size, scale: number): boolean {
  const { width, height } = exportSize(canvas, scale);
  return width <= MAX_EXPORT_SIDE && height <= MAX_EXPORT_SIDE && width * height <= MAX_EXPORT_PIXELS;
}

/** Every image URL the scene needs, so it can be decoded before rendering. */
function sceneImageUrls(scene: Scene): string[] {
  const urls: string[] = [];
  for (const instance of scene.devices) {
    const device = getDevice(instance.deviceId);
    const frame = getVariant(device, instance.variantId)?.frameSrc ?? device.frameSrc;
    if (frame) urls.push(frame);
    const shot = getAsset(instance.screenshotId);
    if (shot && shot.kind !== "video") urls.push(shot.url);
  }
  if (scene.background.type === "image") {
    const url = backgroundImageUrl(scene.background.source);
    if (url) urls.push(url);
  }
  return urls;
}

/**
 * Renders the scene into an image at an exact pixel size.
 *
 * The scene is mounted into a dedicated, offscreen Konva stage built from
 * the same React components as the editor, so the export never contains
 * editor UI (selection, guides) and is independent of the current zoom. The
 * output canvas is exactly `canvas.width × scale` by `canvas.height × scale`.
 */
export async function renderScene(scene: Scene, settings: ExportSettings): Promise<ExportResult> {
  const { width, height } = exportSize(scene.canvas, settings.scale);
  if (!isExportSizeSupported(scene.canvas, settings.scale)) {
    throw new ExportError(
      `${width} × ${height} px is larger than browsers can export. Choose a smaller scale or canvas.`,
    );
  }

  const mounted = await mountScene(scene);
  let output: HTMLCanvasElement | null = null;

  try {
    const { stage } = mounted;
    const rendered = stage.toCanvas({
      x: 0,
      y: 0,
      width: scene.canvas.width,
      height: scene.canvas.height,
      pixelRatio: settings.scale,
    });
    if (rendered.width !== width || rendered.height !== height) {
      throw new ExportError("The browser could not allocate a canvas this large.");
    }

    output = rendered;
    if (settings.format === "jpeg") {
      // JPG has no alpha channel: flatten onto white instead of black.
      output = document.createElement("canvas");
      output.width = width;
      output.height = height;
      const ctx = output.getContext("2d");
      if (!ctx) throw new ExportError("The browser could not allocate a canvas this large.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(rendered, 0, 0);
      rendered.width = 0;
      rendered.height = 0;
    }

    const type = settings.format === "jpeg" ? "image/jpeg" : "image/png";
    const blob = await new Promise<Blob | null>((resolve) =>
      output!.toBlob(resolve, type, settings.format === "jpeg" ? settings.quality : undefined),
    );
    if (!blob) throw new ExportError("The browser failed to encode the image.");

    const extension = settings.format === "jpeg" ? "jpg" : "png";
    return { blob, width, height, fileName: `mockup-${width}x${height}.${extension}` };
  } finally {
    await mounted.unmount();
    if (output) {
      // Release the backing store right away instead of waiting for GC.
      output.width = 0;
      output.height = 0;
    }
  }
}

type MountedScene = {
  stage: import("konva").default.Stage;
  unmount: () => Promise<void>;
};

/**
 * Mounts the scene into a dedicated, offscreen Konva stage built from the
 * same React components as the editor (so exports never contain editor UI).
 * Video exports pass `videoFrames` to supply the frame being rendered.
 */
export async function mountScene(scene: Scene, videoFrames?: VideoFrameSource): Promise<MountedScene> {
  await Promise.all(sceneImageUrls(scene).map((url) => loadImage(url)));

  // Loaded lazily: Konva only works in the browser.
  const [{ createRoot }, { Stage }, { StaticScene }] = await Promise.all([
    import("react-dom/client"),
    import("react-konva"),
    import("@/editor/rendering/scene-content"),
  ]);
  type StageHandle = import("konva").default.Stage;

  const container = document.createElement("div");
  const root = createRoot(container);
  const unmount = async () => {
    root.unmount();
    // Perspective renders at export resolution are large; the editor re-renders its own on demand.
    const { clearPerspectiveCache } = await import("@/editor/rendering/perspective-render");
    clearPerspectiveCache();
  };

  try {
    const content = createElement(StaticScene, { scene });
    const stage = await new Promise<StageHandle>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new ExportError("Rendering timed out.")), 15_000);
      root.render(
        createElement(
          Stage,
          {
            // The stage itself stays tiny so its layer canvases cost nothing;
            // the export region is passed explicitly to toCanvas().
            width: 1,
            height: 1,
            ref: (node: StageHandle | null) => {
              if (!node) return;
              window.clearTimeout(timer);
              // Children are committed after the stage ref resolves.
              requestAnimationFrame(() => resolve(node));
            },
          },
          videoFrames ? createElement(VideoFrameContext.Provider, { value: videoFrames }, content) : content,
        ),
      );
    });
    return { stage, unmount };
  } catch (error) {
    await unmount();
    throw error;
  }
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
