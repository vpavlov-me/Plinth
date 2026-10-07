import { useEffect, useState } from "react";
import { create } from "zustand";
import { getAsset, useAssetStore } from "@/editor/assets";
import { DEVICE_GROUPS } from "@/editor/devices/definitions";
import { useScene } from "@/editor/store";
import type { Size } from "@/editor/geometry";
import { getVideoPreset, videoPresetFiles, videoPresetSrc } from "@/editor/presets/video-presets";
import type { BackgroundVideoSource, ImageAsset, Scene } from "@/editor/types";
import type { VideoQuality } from "@/editor/ui-store";
import { createId } from "@/editor/utils/id";

/**
 * Videos: a screen recording in a device, a video background, or both.
 *
 * A video in a device switches the editor to "video mode": to keep rendering
 * and export simple, the scene then has one device, no perspective and no
 * colour matching. A video background changes nothing else (screenshots
 * stay still, so layouts and perspective are cheap to keep).
 *
 * Any video makes the export a silent MP4 (WebM where the browser can't
 * encode H.264) at up to Full HD.
 */

const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
const VIDEO_EXTENSIONS: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};
/** Videos larger than this are rejected. */
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
/** Videos larger than this play in the session but aren't saved for the next visit. */
export const MAX_STORED_VIDEO_BYTES = 200 * 1024 * 1024;
/** Exports never run longer than this. */
export const MAX_VIDEO_SECONDS = 60;
export const VIDEO_FPS = 30;
/** Longest side of an exported video per quality: 480p, 720p, Full HD. */
const VIDEO_QUALITY_SIDES: Record<VideoQuality, number> = { 480: 854, 720: 1280, 1080: 1920 };
/** Small canvases are rendered at most this much larger so frames stay sharp. */
const VIDEO_EXPORT_MAX_SCALE = 2;
/** Devices that make no sense for a screen recording and are hidden in video mode. */
export const VIDEO_HIDDEN_DEVICES = new Set(["watch", "glass-window"]);
export const VIDEO_FALLBACK_DEVICE = "phone-pro";

export class VideoImportError extends Error {
  override name = "VideoImportError";
}

/* -------------------------------------------------------------------------- */
/* Scene helpers                                                              */
/* -------------------------------------------------------------------------- */

function isVideoAsset(id: string | null | undefined): boolean {
  return getAsset(id)?.kind === "video";
}

/** True when any device shows a video (video mode). */
export function sceneHasVideo(scene: Pick<Scene, "devices">): boolean {
  return scene.devices.some((d) => isVideoAsset(d.screenshotId));
}

/** What a video background plays: a built-in loop or an uploaded video. */
type BackgroundVideo = {
  url: string;
  width: number;
  height: number;
  duration: number;
  /** The file, for uploads. */
  blob?: Blob;
  /** Built-in loops: files to fetch when exporting, preferred first. */
  files?: string[];
};

export function resolveBackgroundVideo(source: BackgroundVideoSource): BackgroundVideo | null {
  if (source.kind === "preset") {
    const preset = getVideoPreset(source.videoId);
    return preset ? { url: videoPresetSrc(preset.id), files: videoPresetFiles(preset.id), ...preset } : null;
  }
  const asset = getAsset(source.assetId);
  if (asset?.kind !== "video") return null;
  return { url: asset.url, width: asset.width, height: asset.height, duration: asset.duration ?? 0, blob: asset.blob };
}

/** The scene's video background, if it has one. */
export function backgroundVideo(scene: Pick<Scene, "background">): BackgroundVideo | null {
  return scene.background.type === "video" ? resolveBackgroundVideo(scene.background.source) : null;
}

/** True when the scene moves at all: a video in a device or in the background. The export is then a video. */
export function sceneHasAnyVideo(scene: Pick<Scene, "devices" | "background">): boolean {
  return sceneHasVideo(scene) || backgroundVideo(scene) !== null;
}

/**
 * Natural length of the scene's video: the longest device video (a video
 * background loops along), else the background video.
 */
export function sceneLongestVideo(scene: Pick<Scene, "devices" | "background">): number {
  const devices = Math.max(0, ...scene.devices.map((d) => getAsset(d.screenshotId)?.duration ?? 0));
  return devices > 0 ? devices : (backgroundVideo(scene)?.duration ?? 0);
}

/** Length of the exported video: {@link sceneLongestVideo}, capped. */
export function sceneVideoDuration(scene: Pick<Scene, "devices" | "background">): number {
  return Math.min(sceneLongestVideo(scene), MAX_VIDEO_SECONDS);
}

/**
 * Size of the exported video: the canvas scaled so its long side matches the
 * quality (854 / 1280 / 1920 px; at most 2× for small canvases), with even
 * sides for H.264.
 */
export function videoExportSize(canvas: Size, quality: VideoQuality = 1080): Size {
  const longSide = VIDEO_QUALITY_SIDES[quality];
  const scale = Math.min(VIDEO_EXPORT_MAX_SCALE, longSide / Math.max(canvas.width, canvas.height));
  const even = (value: number) => Math.max(2, Math.round((value * scale) / 2) * 2);
  return { width: even(canvas.width), height: even(canvas.height) };
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------- */
/* Import                                                                     */
/* -------------------------------------------------------------------------- */

export function videoType(file: Blob & { name?: string }): string | null {
  if ((VIDEO_TYPES as readonly string[]).includes(file.type)) return file.type;
  if (file.type.startsWith("video/")) return file.type;
  const extension = file.name?.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTENSIONS[extension] ?? null;
}

const UNPLAYABLE =
  "This video can’t be played in your browser. Try an MP4 (H.264) or WebM file, e.g. a screen recording exported from your device.";

/**
 * Reads a video's size and length and checks that the browser can both play
 * it (editor preview) and decode it frame by frame (export).
 */
export async function importVideoFile(file: Blob & { name?: string }): Promise<ImageAsset> {
  if (file.size === 0) throw new VideoImportError("That file is empty.");
  if (file.size > MAX_VIDEO_BYTES) {
    throw new VideoImportError(`That video is larger than ${MAX_VIDEO_BYTES / 1024 / 1024} MB.`);
  }

  const { Input, ALL_FORMATS, BlobSource } = await import("mediabunny");
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  let width: number;
  let height: number;
  let duration: number;
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new VideoImportError("This file has no video track.");
    if (!(await track.canDecode())) throw new VideoImportError(UNPLAYABLE);
    width = track.displayWidth;
    height = track.displayHeight;
    duration = await track.computeDuration();
  } catch (error) {
    if (error instanceof VideoImportError) throw error;
    throw new VideoImportError(UNPLAYABLE);
  } finally {
    input.dispose();
  }
  if (!(width > 0 && height > 0 && duration > 0)) throw new VideoImportError(UNPLAYABLE);

  const url = URL.createObjectURL(file);
  try {
    await loadVideo(url);
  } catch {
    URL.revokeObjectURL(url);
    throw new VideoImportError(UNPLAYABLE);
  }
  return { id: createId("vid"), kind: "video", url, width, height, duration, name: file.name ?? "Video", blob: file };
}

/* -------------------------------------------------------------------------- */
/* Playback                                                                   */
/* -------------------------------------------------------------------------- */

type VideoEntry = { video: HTMLVideoElement; ready: Promise<HTMLVideoElement>; loaded: boolean };
const videos = new Map<string, VideoEntry>();

type PlaybackState = { playing: boolean; setPlaying: (playing: boolean) => void };

/** Play/pause of every preview video (muted, looping). */
export const usePlaybackStore = create<PlaybackState>((set) => ({
  playing: true,
  setPlaying: (playing) => {
    for (const { video } of videos.values()) {
      if (playing) void video.play().catch(() => undefined);
      else video.pause();
    }
    set({ playing });
  },
}));

/** A muted, looping preview element for a video URL, created once; resolves when its first frame is ready. */
function loadVideo(url: string): Promise<HTMLVideoElement> {
  const cached = videos.get(url);
  if (cached) return cached.ready;
  const video = document.createElement("video");
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  const ready = new Promise<HTMLVideoElement>((resolve, reject) => {
    const timer = window.setTimeout(() => fail(), 15_000);
    const done = () => {
      window.clearTimeout(timer);
      const entry = videos.get(url);
      if (entry) entry.loaded = true;
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("error", fail);
      if (usePlaybackStore.getState().playing) void video.play().catch(() => undefined);
      resolve(video);
    };
    function fail() {
      window.clearTimeout(timer);
      videos.delete(url);
      reject(new Error("Video failed to load"));
    }
    video.addEventListener("loadeddata", done);
    video.addEventListener("error", fail);
  });
  video.src = url;
  videos.set(url, { video, ready, loaded: false });
  return ready;
}

/** Stops and forgets a preview element (its asset was released). */
function releaseVideo(url: string): void {
  const entry = videos.get(url);
  if (!entry) return;
  entry.video.pause();
  entry.video.removeAttribute("src");
  entry.video.load();
  videos.delete(url);
}

/** The preview element once it can draw a frame, else null. */
export function useVideo(url: string | null | undefined): HTMLVideoElement | null {
  const [ready, setReady] = useState<{ url: string; video: HTMLVideoElement } | null>(null);
  useEffect(() => {
    if (!url) return;
    let active = true;
    loadVideo(url)
      .then((video) => {
        if (active) setReady({ url, video });
      })
      .catch(() => {
        // Unplayable videos are rejected at import; a stale one simply shows the empty screen.
      });
    return () => {
      active = false;
    };
  }, [url]);
  if (!url) return null;
  // Already loaded (e.g. by the editor): available on the first render, which the exporter relies on.
  const cached = videos.get(url);
  if (cached?.loaded) return cached.video;
  return ready?.url === url ? ready.video : null;
}

/** Rewinds every preview to the start (after the play button, so all videos restart together). */
export function restartVideos(): void {
  for (const { video } of videos.values()) video.currentTime = 0;
}

// Stop preview elements whose video was released (undo history pruned, project reset).
useAssetStore.subscribe((state, previous) => {
  for (const asset of Object.values(previous.assets)) {
    if (asset.kind === "video" && !state.assets[asset.id]) releaseVideo(asset.url);
  }
});

/** Device groups for pickers; video mode leaves out devices that don't suit a screen recording. */
export function videoDeviceGroups(videoMode: boolean) {
  if (!videoMode) return DEVICE_GROUPS;
  return DEVICE_GROUPS.map((group) => ({
    ...group,
    devices: group.devices.filter((d) => !VIDEO_HIDDEN_DEVICES.has(d.id)),
  })).filter((group) => group.devices.length > 0);
}

/** True while a device shows a video (see the module comment for what that locks). */
export function useVideoMode(): boolean {
  return useScene(sceneHasVideo);
}

/** True while anything in the scene is a video: the preview plays and the export is a video. */
export function useAnyVideo(): boolean {
  return useScene(sceneHasAnyVideo);
}
