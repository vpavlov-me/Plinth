import { DEFAULT_DEVICE_ID, getDevice, getVariant } from "@/editor/devices/definitions";
import {
  boundsOf,
  deviceOutline,
  deviceTransform,
  fitScale,
  FIT_PADDING,
  resolveDeviceGeometry,
  type Size,
} from "@/editor/geometry";
import { clampCanvasDimension, getCanvasPreset, originalCanvasSize } from "@/editor/presets/canvas-presets";
import {
  DEFAULT_DEVICE_BY_CATEGORY,
  DEFAULT_LAYOUT_ID,
  getLayoutPreset,
  type LayoutSlot,
} from "@/editor/presets/layout-presets";
import type { ScenePreset } from "@/editor/presets/scene-presets";
import { cloneGradient, DEFAULT_GRADIENT } from "@/editor/presets/background-presets";
import { DEFAULT_SHADOW, SHADOW_PRESETS } from "@/editor/presets/shadow-presets";
import type {
  CanvasConfig,
  CanvasPresetId,
  DeviceInstance,
  PerspectiveId,
  Scene,
  ScreenshotCrop,
} from "@/editor/types";
import { createId } from "@/editor/utils/id";

/**
 * Pure scene operations. Every function returns a new scene and never
 * mutates its input, which keeps undo/redo trivial.
 */

/** Looks up the pixel size of an image asset (screenshots). */
export type AssetSizeLookup = (assetId: string) => Size | null;

export const DEFAULT_TRANSFORM = { x: 0.5, y: 0.5, scale: 1, rotation: 0 } as const;

/** The screenshot covers the screen, centred horizontally and aligned to the top. */
export const DEFAULT_CROP: ScreenshotCrop = { zoom: 1, x: 0.5, y: 0 };

/** Largest screenshot zoom offered by the crop controls. */
export const MAX_CROP_ZOOM = 4;

export function isDefaultCrop(crop: ScreenshotCrop): boolean {
  return crop.zoom === DEFAULT_CROP.zoom && crop.x === DEFAULT_CROP.x && crop.y === DEFAULT_CROP.y;
}

export function createDeviceInstance(
  deviceId = DEFAULT_DEVICE_ID,
  patch: Partial<DeviceInstance> = {},
): DeviceInstance {
  return {
    id: createId("device"),
    deviceId,
    variantId: getDevice(deviceId).variants?.[0]?.id,
    screenshotId: null,
    crop: { ...DEFAULT_CROP },
    perspective: "front",
    ...DEFAULT_TRANSFORM,
    shadow: { ...DEFAULT_SHADOW },
    ...patch,
  };
}

/**
 * The first thing a new user sees: a black phone on the "Blue Hour"
 * gradient in a social-friendly 4:5 canvas — finished-looking and ready for
 * a screenshot.
 */
export function createDefaultScene(): Scene {
  return {
    canvas: { width: 1080, height: 1350, preset: "portrait" },
    background: cloneGradient(DEFAULT_GRADIENT),
    devices: [createDeviceInstance(DEFAULT_DEVICE_ID, { shadow: { ...SHADOW_PRESETS.medium } })],
    layout: DEFAULT_LAYOUT_ID,
    screenshots: [],
  };
}

/**
 * True when the scene is exactly the starting scene (instance ids aside), so
 * there is nothing to reset.
 */
export function isDefaultScene(scene: Scene): boolean {
  const withoutIds = (s: Scene) => ({ ...s, devices: s.devices.map((d) => ({ ...d, id: "" })) });
  return stableJson(withoutIds(scene)) === stableJson(withoutIds(createDefaultScene()));
}

/** JSON with sorted object keys, so key order never affects comparisons. */
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)))
      : v,
  );
}

/** Most screenshots a layout uses; the screenshot list keeps no more. */
export const MAX_SCREENSHOTS = 3;

/**
 * Keeps `scene.screenshots` in sync after a device's screenshot changed
 * from `previous` to `next`: a replaced screenshot keeps its place in the
 * order, a new one is appended, and the oldest unused ones drop off.
 */
function trackScreenshots(scene: Scene, previous: string | null, next: string | null): string[] {
  const used = new Set(scene.devices.flatMap((d) => (d.screenshotId ? [d.screenshotId] : [])));
  let list = [...scene.screenshots];
  if (previous && previous !== next && !used.has(previous)) {
    const index = list.indexOf(previous);
    if (index >= 0) {
      if (next && !list.includes(next)) list[index] = next;
      else list.splice(index, 1);
    }
  }
  if (next && !list.includes(next)) list.push(next);
  while (list.length > MAX_SCREENSHOTS) {
    const unused = list.findIndex((id) => !used.has(id));
    list.splice(unused >= 0 ? unused : 0, 1);
  }
  // Screenshots shown on devices but missing from the list (older projects).
  for (const id of used) if (!list.includes(id) && list.length < MAX_SCREENSHOTS) list.push(id);
  list = list.filter((id, i) => list.indexOf(id) === i);
  return list;
}

export function updateDevice(scene: Scene, deviceId: string, patch: Partial<DeviceInstance>): Scene {
  return {
    ...scene,
    devices: scene.devices.map((d) => (d.id === deviceId ? { ...d, ...patch } : d)),
  };
}

/**
 * The "Original" canvas follows the primary device and its screenshot, so it
 * is recomputed whenever either of them changes. Multi-device compositions
 * keep their canvas: there is no single screenshot to size it by.
 */
export function syncOriginalCanvas(scene: Scene, sizeOf: AssetSizeLookup): Scene {
  if (scene.canvas.preset !== "original" || scene.devices.length !== 1) return scene;
  const primary = scene.devices[0]!;
  const screenshot = primary.screenshotId ? sizeOf(primary.screenshotId) : null;
  const geometry = resolveDeviceGeometry(getDevice(primary.deviceId), screenshot);
  const size = originalCanvasSize(geometry, screenshot);
  if (size.width === scene.canvas.width && size.height === scene.canvas.height) return scene;
  return { ...scene, canvas: { ...scene.canvas, ...size } };
}

/**
 * Device positions are stored relative to the canvas and the fit size, so
 * changing the canvas keeps a single device's composition without any extra
 * work. Several devices are re-fitted as a group so their proportions to each
 * other survive canvases of a different shape.
 */
export function setCanvasPreset(scene: Scene, preset: CanvasPresetId, sizeOf: AssetSizeLookup): Scene {
  if (preset === "original") {
    return syncOriginalCanvas({ ...scene, canvas: { ...scene.canvas, preset } }, sizeOf);
  }
  const size = getCanvasPreset(preset).size ?? { width: scene.canvas.width, height: scene.canvas.height };
  return changeCanvas(scene, { preset, ...size }, sizeOf);
}

export function setCanvasSize(scene: Scene, size: Partial<Size>, sizeOf: AssetSizeLookup): Scene {
  return changeCanvas(
    scene,
    {
      preset: "custom",
      width: clampCanvasDimension(size.width ?? scene.canvas.width),
      height: clampCanvasDimension(size.height ?? scene.canvas.height),
    },
    sizeOf,
  );
}

function changeCanvas(scene: Scene, canvas: CanvasConfig, sizeOf: AssetSizeLookup): Scene {
  if (scene.devices.length < 2 || (canvas.width === scene.canvas.width && canvas.height === scene.canvas.height)) {
    return { ...scene, canvas };
  }
  return refitDevices(scene, canvas, sizeOf);
}

/** Fits the current arrangement of several devices, as a whole, into `canvas`. */
function refitDevices(scene: Scene, canvas: CanvasConfig, sizeOf: AssetSizeLookup): Scene {
  // Express the arrangement in current-canvas pixels, then fit it as a group.
  const items = scene.devices.map((instance) => {
    const geometry = geometryOf(instance, sizeOf);
    const transform = deviceTransform(instance, geometry, scene.canvas);
    return { instance, center: { x: transform.x, y: transform.y }, scale: transform.scale };
  });
  return { ...scene, canvas, devices: composeDevices(items, canvas, sizeOf) };
}

function geometryOf(instance: DeviceInstance, sizeOf: AssetSizeLookup) {
  return resolveDeviceGeometry(
    getDevice(instance.deviceId),
    instance.screenshotId ? sizeOf(instance.screenshotId) : null,
  );
}

type CompositionItem = {
  instance: DeviceInstance;
  /** Centre in arbitrary composition units. */
  center: { x: number; y: number };
  /** Composition units per frame unit. */
  scale: number;
};

/**
 * Scales a group of devices, laid out in arbitrary units, so that the whole
 * group fits the canvas with the standard padding, centred.
 */
function composeDevices(items: CompositionItem[], canvas: CanvasConfig, sizeOf: AssetSizeLookup): DeviceInstance[] {
  const geometries = items.map((item) => geometryOf(item.instance, sizeOf));
  const points = items.flatMap((item, i) =>
    deviceOutline(geometries[i]!, item.instance.perspective, item.instance.rotation, item.scale).map((p) => ({
      x: p.x + item.center.x,
      y: p.y + item.center.y,
    })),
  );
  const bounds = boundsOf(points);
  const fit = Math.min(
    (canvas.width * (1 - FIT_PADDING * 2)) / Math.max(bounds.width, 1e-6),
    (canvas.height * (1 - FIT_PADDING * 2)) / Math.max(bounds.height, 1e-6),
  );
  const middle = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  return items.map((item, i) => ({
    ...item.instance,
    x: (canvas.width / 2 + (item.center.x - middle.x) * fit) / canvas.width,
    y: (canvas.height / 2 + (item.center.y - middle.y) * fit) / canvas.height,
    scale: (item.scale * fit) / fitScale(geometries[i]!, canvas),
  }));
}

/**
 * Arranges the scene's devices by a layout preset (one undo step).
 *
 * Devices are reused where their category matches a slot, so models,
 * colours, shadows and crops survive; missing devices are added with the
 * model already used in the scene for that category, or a sensible default.
 * Screenshots are distributed in order (the selected device's first) and a
 * single screenshot fills every slot. Canvas and background are kept.
 */
export function applyLayout(
  scene: Scene,
  layoutId: string,
  sizeOf: AssetSizeLookup,
  selectedId?: string | null,
): Scene {
  const layout = getLayoutPreset(layoutId);
  const selected = scene.devices.find((d) => d.id === selectedId);
  const ordered = selected ? [selected, ...scene.devices.filter((d) => d !== selected)] : scene.devices;
  const screenshots = scene.screenshots.length > 0 ? scene.screenshots : screenshotOrder(scene);
  const template = ordered[0] ?? createDeviceInstance();
  const pool = [...ordered];

  const bases = layout.slots.map((slot) => {
    const index = slot.category
      ? pool.findIndex((d) => getDevice(d.deviceId).category === slot.category)
      : pool.length > 0
        ? 0
        : -1;
    const reused = index >= 0 ? pool.splice(index, 1)[0]! : null;
    return { reused, device: reused ?? newSlotDevice(scene, slot, template) };
  });
  const assigned = assignScreenshots(layout.slots, bases, screenshots, sizeOf);

  const instances = layout.slots.map((slot, i) => {
    const { reused, device } = bases[i]!;
    const screenshotId = assigned[i] ?? null;
    return {
      ...device,
      screenshotId,
      crop: reused && reused.screenshotId === screenshotId ? reused.crop : { ...DEFAULT_CROP },
      rotation: slot.rotation,
      perspective: slot.perspective,
    };
  });

  const items = instances.map((instance, i) => {
    const slot = layout.slots[i]!;
    const geometry = geometryOf(instance, sizeOf);
    return { instance, center: { x: slot.x, y: slot.y }, scale: slot.size / Math.max(geometry.width, geometry.height) };
  });

  const devices =
    instances.length === 1
      ? // A single device takes the standard centred fit, like a fresh project.
        [{ ...instances[0]!, ...DEFAULT_TRANSFORM, rotation: layout.slots[0]!.rotation }]
      : composeDevices(items, scene.canvas, sizeOf);
  return syncOriginalCanvas({ ...scene, devices, layout: layout.id }, sizeOf);
}

/**
 * Screenshot per slot. "Solo" keeps the device's own screenshot. Layouts of
 * one device type hand screenshots out in order (wrapping around). Mixed
 * layouts (laptop + phone, …) give each device the screenshot whose shape
 * fits its screen best, so a website lands on the laptop and an app on the phone.
 */
function assignScreenshots(
  slots: LayoutSlot[],
  bases: { reused: DeviceInstance | null; device: DeviceInstance }[],
  screenshots: string[],
  sizeOf: AssetSizeLookup,
): (string | null)[] {
  if (screenshots.length === 0) return slots.map(() => null);
  if (slots.length === 1) return [bases[0]!.reused?.screenshotId ?? screenshots[0]!];
  const mixed = new Set(bases.map((b) => getDevice(b.device.deviceId).category)).size > 1;
  if (!mixed || screenshots.length < 2) return slots.map((slot) => screenshots[slot.screenshot % screenshots.length]!);

  const result: (string | null)[] = slots.map(() => null);
  const unused = [...screenshots];
  const byRank = slots.map((slot, i) => ({ slot, i })).sort((a, b) => a.slot.screenshot - b.slot.screenshot);
  for (const { slot, i } of byRank) {
    if (unused.length === 0) {
      result[i] = screenshots[slot.screenshot % screenshots.length]!;
      continue;
    }
    const { screen } = getDevice(bases[i]!.device.deviceId);
    const misfit = (id: string) => {
      const size = sizeOf(id);
      return size ? Math.abs(Math.log(size.height / size.width / (screen.height / screen.width))) : Infinity;
    };
    const best = unused.reduce((a, b) => (misfit(b) < misfit(a) ? b : a));
    unused.splice(unused.indexOf(best), 1);
    result[i] = best;
  }
  return result;
}

/**
 * The user's screenshots in a stable order: devices placed by the current
 * layout are read back by their slot's screenshot index, so switching
 * layouts back and forth never shuffles screenshots.
 */
function screenshotOrder(scene: Scene): string[] {
  const slots = getLayoutPreset(scene.layout).slots;
  const devices =
    slots.length === scene.devices.length
      ? scene.devices
          .map((device, i) => ({ device, rank: slots[i]!.screenshot }))
          .sort((a, b) => a.rank - b.rank)
          .map((entry) => entry.device)
      : scene.devices;
  return [...new Set(devices.flatMap((d) => (d.screenshotId ? [d.screenshotId] : [])))];
}

function newSlotDevice(scene: Scene, slot: LayoutSlot, template: DeviceInstance): DeviceInstance {
  const category = slot.category ?? "phone";
  const sibling = scene.devices.find((d) => getDevice(d.deviceId).category === category);
  const deviceId = sibling?.deviceId ?? DEFAULT_DEVICE_BY_CATEGORY[category];
  return createDeviceInstance(deviceId, {
    variantId: getVariant(getDevice(deviceId), sibling?.variantId ?? template.variantId)?.id,
    shadow: { ...template.shadow },
  });
}

/** Removes a device; the last one always stays. */
export function removeDevice(scene: Scene, instanceId: string): Scene {
  if (scene.devices.length < 2 || !scene.devices.some((d) => d.id === instanceId)) return scene;
  return { ...scene, devices: scene.devices.filter((d) => d.id !== instanceId) };
}

export function setPerspective(scene: Scene, instanceId: string, perspective: PerspectiveId): Scene {
  return updateDevice(scene, instanceId, { perspective });
}

export function changeDeviceModel(scene: Scene, instanceId: string, deviceId: string, sizeOf: AssetSizeLookup): Scene {
  const instance = scene.devices.find((d) => d.id === instanceId);
  if (!instance || instance.deviceId === deviceId) return scene;
  const device = getDevice(deviceId);
  // Keep the colour if the new device offers a variant with the same id.
  const variantId = getVariant(device, instance.variantId)?.id;
  const next = updateDevice(scene, instanceId, { deviceId: device.id, variantId, crop: { ...DEFAULT_CROP } });
  return syncOriginalCanvas(next, sizeOf);
}

export function setScreenshot(
  scene: Scene,
  instanceId: string,
  assetId: string | null,
  sizeOf: AssetSizeLookup,
): Scene {
  const previous = scene.devices.find((d) => d.id === instanceId)?.screenshotId ?? null;
  const next = updateDevice(scene, instanceId, { screenshotId: assetId, crop: { ...DEFAULT_CROP } });
  return syncOriginalCanvas({ ...next, screenshots: trackScreenshots(next, previous, assetId) }, sizeOf);
}

export function resetDeviceTransform(scene: Scene, instanceId: string): Scene {
  return updateDevice(scene, instanceId, { ...DEFAULT_TRANSFORM });
}

/**
 * Scene presets set the canvas and, optionally, the background, a layout, a
 * device model, a perspective and the shadow. Social presets only change the
 * canvas (and centre a single device).
 */
export function applyScenePreset(scene: Scene, preset: ScenePreset, sizeOf: AssetSizeLookup): Scene {
  let next: Scene = {
    ...scene,
    background: preset.background ? structuredClone(preset.background) : scene.background,
  };
  next = changeCanvas(next, { ...preset.canvas }, sizeOf);

  if (preset.layout) {
    if (preset.deviceId && next.devices[0]) next = changeDeviceModel(next, next.devices[0].id, preset.deviceId, sizeOf);
    next = applyLayout(next, preset.layout, sizeOf, next.devices[0]?.id);
  } else if (next.devices.length === 1) {
    next = updateDevice(next, next.devices[0]!.id, { ...DEFAULT_TRANSFORM });
  }

  const { perspective, shadow, transform } = preset;
  next = {
    ...next,
    devices: next.devices.map((d, i) => ({
      ...d,
      ...(i === 0 && transform && next.devices.length === 1 ? transform : {}),
      perspective: perspective ?? d.perspective,
      shadow: shadow ? { ...shadow } : d.shadow,
    })),
  };
  // A different perspective changes the devices' outlines.
  if (perspective && next.devices.length > 1) next = refitDevices(next, next.canvas, sizeOf);
  return syncOriginalCanvas(next, sizeOf);
}

/** All asset ids referenced by a scene. */
export function sceneAssetIds(scene: Scene): string[] {
  const ids = [...scene.screenshots, ...scene.devices.flatMap((d) => (d.screenshotId ? [d.screenshotId] : []))];
  // User-uploaded frames are assets too ("custom:<assetId>").
  for (const d of scene.devices) if (d.deviceId.startsWith("custom:")) ids.push(d.deviceId.slice("custom:".length));
  const { background } = scene;
  if ((background.type === "image" || background.type === "video") && background.source.kind === "upload") {
    ids.push(background.source.assetId);
  }
  return [...new Set(ids)];
}
