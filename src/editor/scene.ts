import { DEFAULT_DEVICE_ID, getDevice, getVariant } from "@/editor/devices/definitions";
import { resolveDeviceGeometry, type Size } from "@/editor/geometry";
import { cloneGradient, DEFAULT_GRADIENT } from "@/editor/presets/background-presets";
import { clampCanvasDimension, getCanvasPreset, originalCanvasSize } from "@/editor/presets/canvas-presets";
import type { ScenePreset } from "@/editor/presets/scene-presets";
import { DEFAULT_SHADOW } from "@/editor/presets/shadow-presets";
import type { CanvasPresetId, DeviceInstance, Scene } from "@/editor/types";
import { createId } from "@/editor/utils/id";

/**
 * Pure scene operations. Every function returns a new scene and never
 * mutates its input, which keeps undo/redo trivial.
 */

/** Looks up the pixel size of an image asset (screenshots). */
export type AssetSizeLookup = (assetId: string) => Size | null;

export const DEFAULT_TRANSFORM = { x: 0.5, y: 0.5, scale: 1, rotation: 0 } as const;

export function createDeviceInstance(
  deviceId = DEFAULT_DEVICE_ID,
  patch: Partial<DeviceInstance> = {},
): DeviceInstance {
  return {
    id: createId("device"),
    deviceId,
    variantId: getDevice(deviceId).variants?.[0]?.id,
    screenshotId: null,
    ...DEFAULT_TRANSFORM,
    shadow: { ...DEFAULT_SHADOW },
    ...patch,
  };
}

export function createDefaultScene(): Scene {
  return {
    canvas: { width: 1920, height: 1080, preset: "landscape" },
    background: cloneGradient(DEFAULT_GRADIENT),
    devices: [createDeviceInstance()],
  };
}

export function updateDevice(scene: Scene, deviceId: string, patch: Partial<DeviceInstance>): Scene {
  return {
    ...scene,
    devices: scene.devices.map((d) => (d.id === deviceId ? { ...d, ...patch } : d)),
  };
}

/**
 * The "Original" canvas follows the primary device and its screenshot, so it
 * is recomputed whenever either of them changes.
 */
export function syncOriginalCanvas(scene: Scene, sizeOf: AssetSizeLookup): Scene {
  if (scene.canvas.preset !== "original") return scene;
  const primary = scene.devices[0];
  if (!primary) return scene;
  const screenshot = primary.screenshotId ? sizeOf(primary.screenshotId) : null;
  const geometry = resolveDeviceGeometry(getDevice(primary.deviceId), screenshot);
  const size = originalCanvasSize(geometry, screenshot);
  if (size.width === scene.canvas.width && size.height === scene.canvas.height) return scene;
  return { ...scene, canvas: { ...scene.canvas, ...size } };
}

/**
 * Device positions are stored relative to the canvas and the fit size, so
 * changing the canvas keeps the composition without any extra work.
 */
export function setCanvasPreset(scene: Scene, preset: CanvasPresetId, sizeOf: AssetSizeLookup): Scene {
  if (preset === "original") {
    return syncOriginalCanvas({ ...scene, canvas: { ...scene.canvas, preset } }, sizeOf);
  }
  const size = getCanvasPreset(preset).size ?? { width: scene.canvas.width, height: scene.canvas.height };
  return { ...scene, canvas: { preset, ...size } };
}

export function setCanvasSize(scene: Scene, size: Partial<Size>): Scene {
  return {
    ...scene,
    canvas: {
      preset: "custom",
      width: clampCanvasDimension(size.width ?? scene.canvas.width),
      height: clampCanvasDimension(size.height ?? scene.canvas.height),
    },
  };
}

export function changeDeviceModel(scene: Scene, instanceId: string, deviceId: string, sizeOf: AssetSizeLookup): Scene {
  const instance = scene.devices.find((d) => d.id === instanceId);
  if (!instance || instance.deviceId === deviceId) return scene;
  const device = getDevice(deviceId);
  // Keep the colour if the new device offers a variant with the same id.
  const variantId = getVariant(device, instance.variantId)?.id;
  const next = updateDevice(scene, instanceId, { deviceId: device.id, variantId });
  return syncOriginalCanvas(next, sizeOf);
}

export function setScreenshot(
  scene: Scene,
  instanceId: string,
  assetId: string | null,
  sizeOf: AssetSizeLookup,
): Scene {
  return syncOriginalCanvas(updateDevice(scene, instanceId, { screenshotId: assetId }), sizeOf);
}

export function resetDeviceTransform(scene: Scene, instanceId: string): Scene {
  return updateDevice(scene, instanceId, { ...DEFAULT_TRANSFORM });
}

export function applyScenePreset(scene: Scene, preset: ScenePreset, sizeOf: AssetSizeLookup): Scene {
  const devices = scene.devices.map((d) => {
    const patch = preset.device ?? {};
    const deviceId = patch.deviceId ?? d.deviceId;
    return {
      ...d,
      ...patch,
      deviceId,
      variantId: getVariant(getDevice(deviceId), d.variantId)?.id,
      shadow: patch.shadow ? { ...patch.shadow } : d.shadow,
    };
  });
  return syncOriginalCanvas(
    {
      canvas: { ...preset.canvas },
      background: preset.background ? structuredClone(preset.background) : scene.background,
      devices,
    },
    sizeOf,
  );
}

/** All asset ids referenced by a scene. */
export function sceneAssetIds(scene: Scene): string[] {
  const ids = scene.devices.flatMap((d) => (d.screenshotId ? [d.screenshotId] : []));
  // User-uploaded frames are assets too ("custom:<assetId>").
  for (const d of scene.devices) if (d.deviceId.startsWith("custom:")) ids.push(d.deviceId.slice("custom:".length));
  const { background } = scene;
  if (background.type === "image" && background.source.kind === "upload") ids.push(background.source.assetId);
  return ids;
}
