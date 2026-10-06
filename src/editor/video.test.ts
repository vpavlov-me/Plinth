import { afterEach, describe, expect, it } from "vitest";
import { useAssetStore } from "@/editor/assets";
import { createDefaultScene, updateDevice } from "@/editor/scene";
import type { BackgroundConfig, ImageAsset } from "@/editor/types";
import {
  formatDuration,
  MAX_VIDEO_SECONDS,
  sceneHasAnyVideo,
  sceneHasVideo,
  sceneVideoDuration,
  videoDeviceGroups,
  videoExportSize,
} from "@/editor/video";

const video = (id: string, duration: number): ImageAsset => ({
  id,
  kind: "video",
  url: `blob:${id}`,
  width: 1170,
  height: 2532,
  duration,
  name: `${id}.mp4`,
  blob: new Blob(),
});

const videoBackground = (assetId: string): BackgroundConfig => ({
  type: "video",
  source: { kind: "upload", assetId },
});

afterEach(() => useAssetStore.setState({ assets: {} }));

describe("video export size", () => {
  it("fits Full HD on the long side, never more than 2×, with even sides", () => {
    expect(videoExportSize({ width: 1080, height: 1350 })).toEqual({ width: 1536, height: 1920 });
    expect(videoExportSize({ width: 1920, height: 1080 })).toEqual({ width: 1920, height: 1080 });
    expect(videoExportSize({ width: 1080, height: 1920 })).toEqual({ width: 1080, height: 1920 });
    expect(videoExportSize({ width: 800, height: 800 })).toEqual({ width: 1600, height: 1600 });
    expect(videoExportSize({ width: 4000, height: 3000 })).toEqual({ width: 1920, height: 1440 });
    expect(videoExportSize({ width: 1200, height: 627 })).toEqual({ width: 1920, height: 1004 });
  });

  it("scales the long side to 854 or 1280 px for 480p and 720p", () => {
    expect(videoExportSize({ width: 1920, height: 1080 }, 720)).toEqual({ width: 1280, height: 720 });
    expect(videoExportSize({ width: 1920, height: 1080 }, 480)).toEqual({ width: 854, height: 480 });
    expect(videoExportSize({ width: 1080, height: 1350 }, 720)).toEqual({ width: 1024, height: 1280 });
    expect(videoExportSize({ width: 1080, height: 1350 }, 480)).toEqual({ width: 684, height: 854 });
  });
});

describe("video mode", () => {
  it("is on when a device shows a video, and the longest video sets the length", () => {
    const scene = createDefaultScene();
    expect(sceneHasVideo(scene)).toBe(false);
    expect(sceneVideoDuration(scene)).toBe(0);

    useAssetStore.getState().add(video("clip", 12.4));
    const withVideo = updateDevice(scene, scene.devices[0]!.id, { screenshotId: "clip" });
    expect(sceneHasVideo(withVideo)).toBe(true);
    expect(sceneVideoDuration(withVideo)).toBe(12.4);

    useAssetStore.getState().add(video("long", 95));
    const long = updateDevice(scene, scene.devices[0]!.id, { screenshotId: "long" });
    expect(sceneVideoDuration(long)).toBe(MAX_VIDEO_SECONDS);
  });

  it("a video background makes the scene a video without locking anything; device videos set the length", () => {
    useAssetStore.getState().add(video("bg", 8));
    const scene = { ...createDefaultScene(), background: videoBackground("bg") };
    expect(sceneHasVideo(scene)).toBe(false);
    expect(sceneHasAnyVideo(scene)).toBe(true);
    expect(sceneVideoDuration(scene)).toBe(8);

    useAssetStore.getState().add(video("clip", 3));
    const both = updateDevice(scene, scene.devices[0]!.id, { screenshotId: "clip" });
    expect(sceneHasVideo(both)).toBe(true);
    expect(sceneVideoDuration(both)).toBe(3);
  });

  it("built-in video backgrounds have a known length", () => {
    const scene = {
      ...createDefaultScene(),
      background: { type: "video", source: { kind: "preset", videoId: "aurora" } },
    };
    expect(sceneHasAnyVideo(scene as never)).toBe(true);
    expect(sceneVideoDuration(scene as never)).toBe(8);
  });

  it("hides the watch and the spatial window", () => {
    const ids = videoDeviceGroups(true).flatMap((g) => g.devices.map((d) => d.id));
    expect(ids).not.toContain("watch");
    expect(ids).not.toContain("glass-window");
    expect(ids).toContain("phone-pro");
    expect(videoDeviceGroups(true).map((g) => g.label)).not.toContain("Watch");
  });

  it("formats durations as m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(12.4)).toBe("0:12");
    expect(formatDuration(60)).toBe("1:00");
  });
});
