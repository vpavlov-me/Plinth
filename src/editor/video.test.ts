import { afterEach, describe, expect, it } from "vitest";
import { useAssetStore } from "@/editor/assets";
import { createDefaultScene, updateDevice } from "@/editor/scene";
import type { ImageAsset } from "@/editor/types";
import {
  formatDuration,
  MAX_VIDEO_SECONDS,
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
