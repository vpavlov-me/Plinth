import { getAsset } from "@/editor/assets";
import { ExportError, mountScene, type ExportResult } from "@/editor/export/export-image";
import type { ImageAsset, Scene } from "@/editor/types";
import { sceneVideoDuration, VIDEO_FPS, videoExportSize } from "@/editor/video";

export class ExportCanceled extends Error {
  override name = "ExportCanceled";
}

type Options = {
  /** Called after every frame with the share done (0–1). */
  onProgress?: (done: number) => void;
  signal?: AbortSignal;
};

/**
 * Renders the scene as a silent video, frame by frame.
 *
 * Each source video is decoded at the exact times needed (shorter ones
 * loop), the scene is drawn with those frames on the offscreen export stage
 * and the result is encoded by the browser: H.264 in MP4 where available,
 * else VP9/VP8 in WebM. Nothing is uploaded.
 */
export async function renderVideo(scene: Scene, { onProgress, signal }: Options = {}): Promise<ExportResult> {
  const duration = sceneVideoDuration(scene);
  if (!(duration > 0)) throw new ExportError("Add a video first.");
  const { width, height } = videoExportSize(scene.canvas);
  const frameCount = Math.max(1, Math.round(duration * VIDEO_FPS));

  const mb = await import("mediabunny");
  const codec = await mb.getFirstEncodableVideoCodec(["avc", "vp9", "vp8"], { width, height });
  if (!codec) throw new ExportError("This browser can’t encode video. Use a recent Chrome, Edge or Safari.");
  const mp4 = codec === "avc";

  const assets = new Map<string, ImageAsset>();
  for (const device of scene.devices) {
    const asset = getAsset(device.screenshotId);
    if (asset?.kind === "video") assets.set(asset.url, asset);
  }

  const inputs: InstanceType<typeof mb.Input>[] = [];
  const streams: { url: string; frames: AsyncGenerator<{ canvas: CanvasImageSource } | null> }[] = [];
  const current = new Map<string, CanvasImageSource>();
  let mounted: Awaited<ReturnType<typeof mountScene>> | null = null;
  let output: InstanceType<typeof mb.Output> | null = null;

  try {
    for (const [url, asset] of assets) {
      const input = new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(asset.blob) });
      inputs.push(input);
      const track = await input.getPrimaryVideoTrack();
      if (!track || !(await track.canDecode())) throw new ExportError("This browser can’t decode the video.");
      const start = await track.getFirstTimestamp();
      const length = Math.max(asset.duration ?? duration, 1 / VIDEO_FPS);
      const sink = new mb.CanvasSink(track, { poolSize: 2 });
      // Shorter videos loop until the longest one ends.
      const times = Array.from({ length: frameCount }, (_, i) => start + ((i / VIDEO_FPS) % length));
      streams.push({ url, frames: sink.canvasesAtTimestamps(times) });
    }

    mounted = await mountScene(scene, (url) => current.get(url) ?? null);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ExportError("The browser could not allocate a canvas this large.");

    output = new mb.Output({
      format: mp4 ? new mb.Mp4OutputFormat({ fastStart: "in-memory" }) : new mb.WebMOutputFormat(),
      target: new mb.BufferTarget(),
    });
    const source = new mb.CanvasSource(canvas, { codec, quality: mb.QUALITY_HIGH });
    output.addVideoTrack(source, { frameRate: VIDEO_FPS });
    await output.start();

    for (let i = 0; i < frameCount; i++) {
      if (signal?.aborted) throw new ExportCanceled("Export canceled");
      for (const stream of streams) {
        const next = await stream.frames.next();
        if (!next.done && next.value) current.set(stream.url, next.value.canvas);
      }
      const rendered = mounted.stage.toCanvas({
        x: 0,
        y: 0,
        width: scene.canvas.width,
        height: scene.canvas.height,
        pixelRatio: width / scene.canvas.width,
      });
      // Video has no alpha channel: transparent backgrounds become white, like JPG.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(rendered, 0, 0, width, height);
      rendered.width = 0;
      rendered.height = 0;
      await source.add(i / VIDEO_FPS, 1 / VIDEO_FPS);
      onProgress?.((i + 1) / frameCount);
    }

    await output.finalize();
    const buffer = (output.target as InstanceType<typeof mb.BufferTarget>).buffer;
    if (!buffer) throw new ExportError("The browser failed to encode the video.");
    const extension = mp4 ? "mp4" : "webm";
    return {
      blob: new Blob([buffer], { type: mp4 ? "video/mp4" : "video/webm" }),
      width,
      height,
      fileName: `mockup-${width}x${height}.${extension}`,
    };
  } catch (error) {
    if (output && output.state !== "finalized" && output.state !== "canceled") {
      await output.cancel().catch(() => undefined);
    }
    throw error;
  } finally {
    for (const stream of streams) await stream.frames.return(undefined).catch(() => undefined);
    for (const input of inputs) input.dispose();
    current.clear();
    await mounted?.unmount();
  }
}
