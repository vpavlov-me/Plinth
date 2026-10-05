import { describe, expect, it } from "vitest";
import { getDevice } from "@/editor/devices/definitions";
import { sanitizeScene } from "@/editor/persistence";
import { SCENE_PRESETS } from "@/editor/presets/scene-presets";
import {
  applyScenePreset,
  changeDeviceModel,
  createDefaultScene,
  sceneAssetIds,
  setCanvasPreset,
  setCanvasSize,
  setScreenshot,
  updateDevice,
} from "@/editor/scene";

const sizes: Record<string, { width: number; height: number }> = { shot: { width: 1179, height: 2556 } };
const sizeOf = (id: string) => sizes[id] ?? null;

describe("scene operations", () => {
  it("preserves relative composition when the canvas changes", () => {
    const base = createDefaultScene();
    const id = base.devices[0]!.id;
    const moved = updateDevice(base, id, { x: 0.25, scale: 0.8 });
    const next = setCanvasPreset(moved, "story", sizeOf);
    expect(next.canvas).toEqual({ preset: "story", width: 1080, height: 1920 });
    expect(next.devices[0]).toMatchObject({ x: 0.25, scale: 0.8 });
    expect(moved.canvas.preset).toBe("landscape"); // immutable
  });

  it("sizes the Original canvas from the screenshot", () => {
    let scene = createDefaultScene();
    const id = scene.devices[0]!.id;
    scene = setScreenshot(scene, id, "shot", sizeOf);
    scene = setCanvasPreset(scene, "original", sizeOf);
    // The default phone's screen is 1206 wide, so the 1179 px screenshot is
    // shown at (nearly) native size.
    const { frame, screen } = getDevice("phone-pro");
    const native = Math.max(1179 / screen.width, 2556 / screen.height);
    expect(scene.canvas.width).toBe(Math.round((frame.width * native) / 0.82));
    const laptop = changeDeviceModel(scene, id, "laptop-air", sizeOf);
    expect(laptop.canvas.width).not.toBe(scene.canvas.width);
  });

  it("clamps custom sizes", () => {
    const scene = setCanvasSize(createDefaultScene(), { width: 99999, height: 3 });
    expect(scene.canvas).toEqual({ preset: "custom", width: 8000, height: 100 });
  });

  it("applies presets without touching screenshots", () => {
    let scene = createDefaultScene();
    scene = setScreenshot(scene, scene.devices[0]!.id, "shot", sizeOf);
    const next = applyScenePreset(
      scene,
      SCENE_PRESETS.find((p) => p.id === "app-store")!,
      sizeOf,
    );
    expect(next.devices[0]!.screenshotId).toBe("shot");
    expect(next.canvas).toMatchObject({ width: 1290, height: 2796 });
    expect(sceneAssetIds(next)).toEqual(["shot"]);
  });
});

describe("sanitizeScene", () => {
  it("accepts a valid scene", () => {
    const scene = createDefaultScene();
    expect(sanitizeScene(JSON.parse(JSON.stringify(scene)))).toEqual(scene);
  });

  it("rejects malformed data", () => {
    expect(sanitizeScene(null)).toBeNull();
    expect(sanitizeScene({ canvas: {}, background: {}, devices: [] })).toBeNull();
    const scene = createDefaultScene();
    expect(sanitizeScene({ ...scene, devices: [{ ...scene.devices[0], deviceId: "toaster" }] })).toBeNull();
    expect(sanitizeScene({ ...scene, background: { type: "solid", color: "red; evil" } })).toBeNull();
  });
});
