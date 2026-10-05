import { describe, expect, it } from "vitest";
import { getDevice } from "@/editor/devices/definitions";
import { boundsOf, deviceOutline, deviceTransform, resolveDeviceGeometry } from "@/editor/geometry";
import { sanitizeScene } from "@/editor/persistence";
import { LAYOUT_PRESETS } from "@/editor/presets/layout-presets";
import { SCENE_PRESETS } from "@/editor/presets/scene-presets";
import {
  applyLayout,
  applyScenePreset,
  createDefaultScene,
  removeDevice,
  setCanvasPreset,
  setScreenshot,
} from "@/editor/scene";
import type { Scene } from "@/editor/types";

const sizes: Record<string, { width: number; height: number }> = {
  app: { width: 1179, height: 2556 },
  app2: { width: 1179, height: 2556 },
  site: { width: 2880, height: 1800 },
};
const sizeOf = (id: string) => sizes[id] ?? null;

function withScreenshot(id = "app"): Scene {
  const scene = createDefaultScene();
  return setScreenshot(scene, scene.devices[0]!.id, id, sizeOf);
}

/** Every device's drawn outline, in canvas pixels. */
function outlines(scene: Scene) {
  return scene.devices.flatMap((instance) => {
    const geometry = resolveDeviceGeometry(
      getDevice(instance.deviceId),
      instance.screenshotId ? sizeOf(instance.screenshotId) : null,
    );
    const t = deviceTransform(instance, geometry, scene.canvas);
    return deviceOutline(geometry, instance.perspective, t.rotation, t.scale).map((p) => ({
      x: p.x + t.x,
      y: p.y + t.y,
    }));
  });
}

describe("layouts", () => {
  it.each(LAYOUT_PRESETS.map((l) => [l.id, l.slots.length] as const))(
    "%s places %i device(s) inside the canvas",
    (id, count) => {
      for (const preset of ["landscape", "story", "square"] as const) {
        const scene = applyLayout(setCanvasPreset(withScreenshot(), preset, sizeOf), id, sizeOf);
        expect(scene.devices).toHaveLength(count);
        expect(scene.layout).toBe(id);
        const bounds = boundsOf(outlines(scene));
        expect(bounds.x).toBeGreaterThanOrEqual(-0.5);
        expect(bounds.y).toBeGreaterThanOrEqual(-0.5);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(scene.canvas.width + 0.5);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(scene.canvas.height + 0.5);
      }
    },
  );

  it("duplicates a single screenshot into every device and keeps canvas and background", () => {
    const base = withScreenshot();
    const fan = applyLayout(base, "fan", sizeOf);
    expect(fan.devices.map((d) => d.screenshotId)).toEqual(["app", "app", "app"]);
    expect(fan.canvas).toEqual(base.canvas);
    expect(fan.background).toEqual(base.background);
    // The original device is reused, so its id survives.
    expect(fan.devices.some((d) => d.id === base.devices[0]!.id)).toBe(true);
  });

  it("distributes screenshots in the order they were added and keeps them through Solo", () => {
    let scene = applyLayout(withScreenshot("app"), "duo", sizeOf);
    scene = setScreenshot(scene, scene.devices[1]!.id, "app2", sizeOf);
    expect(scene.screenshots).toEqual(["app", "app2"]);

    const solo = applyLayout(scene, "solo", sizeOf, scene.devices[0]!.id);
    expect(solo.devices).toHaveLength(1);
    expect(solo.devices[0]!.screenshotId).toBe("app");

    const duo = applyLayout(solo, "duo", sizeOf);
    expect(duo.devices.map((d) => d.screenshotId)).toEqual(["app", "app2"]);
  });

  it("puts each screenshot on the device whose screen fits it in mixed layouts", () => {
    let scene = withScreenshot("app");
    scene = applyLayout(scene, "duo", sizeOf);
    scene = setScreenshot(scene, scene.devices[1]!.id, "site", sizeOf);
    const mixed = applyLayout(scene, "laptop-phone", sizeOf);
    const laptop = mixed.devices.find((d) => getDevice(d.deviceId).category === "laptop")!;
    const phone = mixed.devices.find((d) => getDevice(d.deviceId).category === "phone")!;
    expect(laptop.screenshotId).toBe("site");
    expect(phone.screenshotId).toBe("app");
  });

  it("re-fits several devices as a group when the canvas changes shape", () => {
    const scene = applyLayout(withScreenshot(), "laptop-phone", sizeOf);
    const story = setCanvasPreset(scene, "story", sizeOf);
    const bounds = boundsOf(outlines(story));
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(1080.5);
    expect(bounds.width / 1080).toBeGreaterThan(0.8);
  });

  it("removes secondary devices but never the last one", () => {
    const duo = applyLayout(withScreenshot(), "duo", sizeOf);
    const one = removeDevice(duo, duo.devices[1]!.id);
    expect(one.devices).toHaveLength(1);
    expect(removeDevice(one, one.devices[0]!.id)).toBe(one);
  });

  it("applies showcase presets with layouts and perspective", () => {
    const hunt = applyScenePreset(
      withScreenshot(),
      SCENE_PRESETS.find((p) => p.id === "product-hunt")!,
      sizeOf,
    );
    expect(hunt.devices).toHaveLength(2);
    expect(hunt.devices.every((d) => d.perspective === "tilt-left")).toBe(true);
    const hero = applyScenePreset(
      hunt,
      SCENE_PRESETS.find((p) => p.id === "portfolio-hero")!,
      sizeOf,
    );
    expect(hero.devices.map((d) => getDevice(d.deviceId).category)).toEqual(["laptop", "phone"]);
    const store = applyScenePreset(
      hero,
      SCENE_PRESETS.find((p) => p.id === "app-store")!,
      sizeOf,
    );
    expect(store.devices).toHaveLength(1);
    expect(store.devices[0]).toMatchObject({ deviceId: "phone-pro", perspective: "front", y: 0.56 });
  });
});

describe("persistence migration", () => {
  it("upgrades a version 1 scene with defaults for the new fields", () => {
    const v1 = {
      canvas: { width: 1920, height: 1080, preset: "landscape" },
      background: { type: "solid", color: "#ffffff" },
      devices: [
        {
          id: "device_1",
          deviceId: "phone-pro",
          screenshotId: "app",
          x: 0.5,
          y: 0.5,
          scale: 1,
          rotation: 0,
          shadow: { preset: "soft", blur: 60, opacity: 0.16, offsetX: 0, offsetY: 24 },
        },
      ],
    };
    const scene = sanitizeScene(v1)!;
    expect(scene.layout).toBe("solo");
    expect(scene.screenshots).toEqual(["app"]);
    expect(scene.devices[0]).toMatchObject({ perspective: "front", crop: { zoom: 1, x: 0.5, y: 0 } });
  });

  it("keeps the shape of mesh lights and clamps them", () => {
    const scene = createDefaultScene();
    const stored = {
      ...scene,
      background: {
        type: "gradient",
        colors: ["#0b1cff", "#3d5bff"],
        angle: 160,
        blobs: [
          { x: 0.1, y: 0.2, r: 0.5, color: "#7fb2ffff", stretch: 1.6, angle: -30, core: 0.55 },
          { x: 0.5, y: 0.5, r: 0.3, color: "#ffffff", stretch: 99, core: 3 },
        ],
      },
    };
    const background = sanitizeScene(stored)!.background;
    expect(background.type === "gradient" && background.blobs).toEqual([
      { x: 0.1, y: 0.2, r: 0.5, color: "#7fb2ffff", stretch: 1.6, angle: -30, core: 0.55 },
      { x: 0.5, y: 0.5, r: 0.3, color: "#ffffff", stretch: 5, core: 0.9 },
    ]);
  });

  it("round-trips a multi-device composition and clamps bad crop values", () => {
    const scene = applyLayout(withScreenshot(), "fan", sizeOf);
    const stored = JSON.parse(JSON.stringify(scene)) as Scene;
    expect(sanitizeScene(stored)).toEqual(scene);
    stored.devices[0]!.crop = { zoom: 99, x: -3, y: 7 };
    stored.devices[1]!.perspective = "upside-down" as never;
    const cleaned = sanitizeScene(stored)!;
    expect(cleaned.devices[0]!.crop).toEqual({ zoom: 4, x: 0, y: 1 });
    expect(cleaned.devices[1]!.perspective).toBe("front");
  });
});
