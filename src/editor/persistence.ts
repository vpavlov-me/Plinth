import { getAsset, loadImage, useAssetStore } from "@/editor/assets";
import { MAX_STORED_VIDEO_BYTES } from "@/editor/video";
import { hasDevice } from "@/editor/devices/definitions";
import type { CustomFrame } from "@/editor/custom-frames";
import { useLibraryStore, type LibraryData } from "@/editor/library";
import { CANVAS_PRESETS, clampCanvasDimension } from "@/editor/presets/canvas-presets";
import { DEFAULT_LAYOUT_ID, LAYOUT_PRESETS } from "@/editor/presets/layout-presets";
import { isPerspectiveId } from "@/editor/presets/perspective-presets";
import { getPhotoPreset } from "@/editor/presets/photo-presets";
import { SHADOW_PRESETS } from "@/editor/presets/shadow-presets";
import { createDefaultScene, DEFAULT_CROP, MAX_CROP_ZOOM, MAX_SCREENSHOTS, sceneAssetIds } from "@/editor/scene";
import type {
  BackgroundConfig,
  DeviceInstance,
  GradientConfig,
  ImageAsset,
  MeshBlob,
  Scene,
  ScreenshotCrop,
  ShadowConfig,
} from "@/editor/types";
import { DEFAULT_EXPORT_SETTINGS, useUIStore, type ExportSettings } from "@/editor/ui-store";

/**
 * Local persistence.
 * - Scene configuration and settings: localStorage (small JSON).
 * - Image blobs: IndexedDB (localStorage is far too small for screenshots).
 * Nothing is ever uploaded.
 *
 * Scene format versions (the key stays `plinth.scene.v1`):
 * - 1: single-device era. Devices have no `crop`/`perspective`, scenes no `layout`.
 * - 2: adds per-device `crop` and `perspective`, the scene `layout` and the
 *   selected device. Version 1 data migrates through `sanitizeScene`, which
 *   fills the new fields with their defaults.
 */

const SCENE_KEY = "plinth.scene.v1";
const SCENE_VERSION = 2;
/** Most colour lights a mesh gradient keeps. */
const MAX_BLOBS = 8;
const SETTINGS_KEY = "plinth.settings.v1";
const LIBRARY_KEY = "plinth.library.v1";
const DB_NAME = "plinth";
const STORE = "assets";

type StoredAsset = {
  id: string;
  blob: Blob;
  width: number;
  height: number;
  name: string;
  kind?: "image" | "video";
  duration?: number;
};

/* -------------------------------------------------------------------------- */
/* IndexedDB                                                                  */
/* -------------------------------------------------------------------------- */

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch((error: unknown) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

async function syncStoredAssets(ids: string[]): Promise<void> {
  const stored = new Set((await run("readonly", (s) => s.getAllKeys())).map(String));
  const wanted = new Set(ids);
  for (const id of ids) {
    if (stored.has(id)) continue;
    const asset = getAsset(id);
    if (!asset) continue;
    // Very large videos stay in memory for this session only.
    if (asset.kind === "video" && asset.blob.size > MAX_STORED_VIDEO_BYTES) continue;
    const record: StoredAsset = {
      id,
      blob: asset.blob,
      width: asset.width,
      height: asset.height,
      name: asset.name,
      kind: asset.kind,
      duration: asset.duration,
    };
    await run("readwrite", (s) => s.put(record));
  }
  for (const id of stored) {
    if (!wanted.has(id)) await run("readwrite", (s) => s.delete(id));
  }
}

async function restoreAsset(id: string): Promise<ImageAsset | null> {
  const record = (await run("readonly", (s) => s.get(id))) as StoredAsset | undefined;
  if (!record?.blob) return null;
  const url = URL.createObjectURL(record.blob);
  const base = { id, url, width: record.width, height: record.height, name: record.name, blob: record.blob };
  if (record.kind === "video") {
    // The preview element loads on demand; the video was validated at import.
    return { ...base, kind: "video", duration: record.duration ?? 0 };
  }
  try {
    await loadImage(url);
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
  return base;
}

/* -------------------------------------------------------------------------- */
/* Scene                                                                      */
/* -------------------------------------------------------------------------- */

let saveTimer: number | undefined;

/** Debounced save of the scene, the user's library and the images both reference. */
export function scheduleSave(scene: Scene): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      const selectedDeviceId = useUIStore.getState().selectedDeviceId;
      localStorage.setItem(SCENE_KEY, JSON.stringify({ version: SCENE_VERSION, scene, selectedDeviceId }));
    } catch {
      // Storage full or disabled: the editor keeps working without persistence.
    }
    const library = useLibraryStore.getState();
    try {
      localStorage.setItem(
        LIBRARY_KEY,
        JSON.stringify({
          colors: library.colors,
          gradients: library.gradients,
          images: library.images,
          frames: library.frames,
        }),
      );
    } catch {
      // ignore
    }
    syncStoredAssets([...sceneAssetIds(scene), ...libraryAssetIds()]).catch(() => {
      // Screenshots are persisted best-effort (private mode, quota, …).
    });
  }, 400);
}

/** Restores the user's background library (colours, gradients, uploaded images). */
export async function loadLibrary(): Promise<void> {
  let data: LibraryData = { colors: [], gradients: [], images: [], frames: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? "null") as Record<string, unknown> | null;
    if (isRecord(parsed)) {
      data = {
        colors: Array.isArray(parsed.colors) ? parsed.colors.filter(isColor) : [],
        gradients: Array.isArray(parsed.gradients)
          ? parsed.gradients
              .map((g) => (isRecord(g) ? sanitizeBackground({ ...g, type: "gradient" }) : null))
              .filter((g): g is GradientConfig => g?.type === "gradient")
          : [],
        images: Array.isArray(parsed.images) ? parsed.images.filter(isString) : [],
        frames: Array.isArray(parsed.frames) ? parsed.frames.filter(isCustomFrame) : [],
      };
    }
  } catch {
    // Corrupt data: start with an empty library.
  }
  const restored = new Set<string>();
  for (const id of new Set([...data.images, ...data.frames.map((f) => f.assetId)])) {
    try {
      const asset = await restoreAsset(id);
      if (!asset) continue;
      useAssetStore.getState().add(asset);
      restored.add(id);
    } catch {
      break; // IndexedDB unavailable
    }
  }
  useLibraryStore.getState().load({
    ...data,
    images: data.images.filter((id) => restored.has(id)),
    frames: data.frames.filter((f) => restored.has(f.assetId)),
  });
}

/** Restores the last scene and selected device. Missing images are dropped from the scene. */
export async function loadScene(): Promise<{ scene: Scene; selectedDeviceId: string | null }> {
  let scene: Scene | null = null;
  let selectedDeviceId: string | null = null;
  try {
    const raw = localStorage.getItem(SCENE_KEY);
    const parsed = raw ? (JSON.parse(raw) as { scene?: unknown; selectedDeviceId?: unknown }) : null;
    scene = parsed ? sanitizeScene(parsed.scene) : null;
    if (scene && isString(parsed?.selectedDeviceId)) {
      const id = parsed.selectedDeviceId;
      selectedDeviceId = scene.devices.some((d) => d.id === id) ? id : null;
    }
  } catch {
    scene = null;
  }
  if (!scene) return { scene: createDefaultScene(), selectedDeviceId: null };

  // Assets may already be loaded (e.g. by the library).
  const restored = new Set<string>(sceneAssetIds(scene).filter((id) => getAsset(id)));
  try {
    const missing = sceneAssetIds(scene).filter((id) => !restored.has(id));
    const assets = await Promise.all(missing.map((id) => restoreAsset(id)));
    for (const asset of assets) {
      if (!asset) continue;
      useAssetStore.getState().add(asset);
      restored.add(asset.id);
    }
  } catch {
    // IndexedDB unavailable: keep the configuration, drop the images.
  }

  const restoredScene: Scene = {
    ...scene,
    background:
      scene.background.type === "image" &&
      scene.background.source.kind === "upload" &&
      !restored.has(scene.background.source.assetId)
        ? createDefaultScene().background
        : scene.background,
    devices: scene.devices.map((d) =>
      d.screenshotId && !restored.has(d.screenshotId) ? { ...d, screenshotId: null, crop: { ...DEFAULT_CROP } } : d,
    ),
    screenshots: scene.screenshots.filter((id) => restored.has(id)),
  };
  return { scene: restoredScene, selectedDeviceId };
}

export function loadSettings(): ExportSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_EXPORT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ExportSettings>;
    return {
      format: parsed.format === "jpeg" ? "jpeg" : "png",
      scale: parsed.scale === 1 || parsed.scale === 3 ? parsed.scale : 2,
      quality: isNumber(parsed.quality) ? Math.min(1, Math.max(0.5, parsed.quality)) : DEFAULT_EXPORT_SETTINGS.quality,
    };
  } catch {
    return DEFAULT_EXPORT_SETTINGS;
  }
}

export function saveSettings(settings: ExportSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isColor = (v: unknown): v is string => isString(v) && /^#[0-9a-f]{3,8}$/i.test(v);

function isCustomFrame(v: unknown): v is CustomFrame {
  if (!isRecord(v) || !isString(v.assetId) || !isString(v.name) || !isRecord(v.screen)) return false;
  const { x, y, width, height, radius } = v.screen;
  return [x, y, width, height, radius].every(isNumber);
}

/** Asset ids the user's library keeps alive. */
export function libraryAssetIds(): string[] {
  const { images, frames } = useLibraryStore.getState();
  return [...images, ...frames.map((f) => f.assetId)];
}

/** Validates persisted data; returns null when it can't be trusted. */
export function sanitizeScene(value: unknown): Scene | null {
  if (!isRecord(value) || !isRecord(value.canvas) || !isRecord(value.background) || !Array.isArray(value.devices)) {
    return null;
  }
  const { canvas } = value;
  const preset = CANVAS_PRESETS.find((p) => p.id === canvas.preset)?.id;
  if (!preset || !isNumber(canvas.width) || !isNumber(canvas.height)) return null;

  const background = sanitizeBackground(value.background);
  if (!background) return null;

  const devices = value.devices.map(sanitizeDevice).filter((d): d is DeviceInstance => d !== null);
  if (devices.length === 0) return null;

  return {
    canvas: { preset, width: clampCanvasDimension(canvas.width), height: clampCanvasDimension(canvas.height) },
    background,
    devices,
    layout: LAYOUT_PRESETS.some((l) => l.id === value.layout) ? (value.layout as string) : DEFAULT_LAYOUT_ID,
    // Version 1 has no list: start from the screenshots on the devices.
    screenshots: [
      ...new Set(
        Array.isArray(value.screenshots)
          ? value.screenshots.filter(isString)
          : devices.flatMap((d) => (d.screenshotId ? [d.screenshotId] : [])),
      ),
    ].slice(0, MAX_SCREENSHOTS),
  };
}

function sanitizeBackground(bg: Record<string, unknown>): BackgroundConfig | null {
  switch (bg.type) {
    case "solid":
      return isColor(bg.color) ? { type: "solid", color: bg.color } : null;
    case "gradient": {
      if (!Array.isArray(bg.colors) || bg.colors.length < 2 || !bg.colors.every(isColor) || !isNumber(bg.angle)) {
        return null;
      }
      const gradient: GradientConfig = { type: "gradient", colors: bg.colors.slice(0, 4), angle: bg.angle };
      if (Array.isArray(bg.blobs)) {
        const blobs = bg.blobs
          .filter((b): b is MeshBlob => isRecord(b) && [b.x, b.y, b.r].every(isNumber) && isColor(b.color))
          .map((b) => ({
            x: b.x,
            y: b.y,
            r: b.r,
            color: b.color,
            ...(isNumber(b.stretch) ? { stretch: Math.min(5, Math.max(0.2, b.stretch)) } : {}),
            ...(isNumber(b.angle) ? { angle: b.angle } : {}),
            ...(isNumber(b.core) ? { core: Math.min(0.9, Math.max(0, b.core)) } : {}),
          }));
        if (blobs.length) gradient.blobs = blobs.slice(0, MAX_BLOBS);
      }
      if (isNumber(bg.grain)) gradient.grain = Math.min(1, Math.max(0, bg.grain));
      return gradient;
    }
    case "image": {
      // Legacy format: { assetId, fit }.
      if (isString(bg.assetId)) return { type: "image", source: { kind: "upload", assetId: bg.assetId } };
      const source = isRecord(bg.source) ? bg.source : null;
      if (source?.kind === "upload" && isString(source.assetId)) {
        return { type: "image", source: { kind: "upload", assetId: source.assetId } };
      }
      if (source?.kind === "photo" && isString(source.photoId) && getPhotoPreset(source.photoId)) {
        return { type: "image", source: { kind: "photo", photoId: source.photoId } };
      }
      return null;
    }
    case "transparent":
      return { type: "transparent" };
    default:
      return null;
  }
}

function sanitizeDevice(value: unknown): DeviceInstance | null {
  if (!isRecord(value) || !isString(value.id) || !isString(value.deviceId)) return null;
  if (!hasDevice(value.deviceId)) return null;
  if (![value.x, value.y, value.scale, value.rotation].every(isNumber)) return null;
  return {
    id: value.id,
    deviceId: value.deviceId,
    variantId: isString(value.variantId) ? value.variantId : undefined,
    screenshotId: isString(value.screenshotId) ? value.screenshotId : null,
    crop: sanitizeCrop(value.crop),
    perspective: isPerspectiveId(value.perspective) ? value.perspective : "front",
    x: value.x as number,
    y: value.y as number,
    scale: Math.max(0.05, value.scale as number),
    rotation: value.rotation as number,
    shadow: sanitizeShadow(value.shadow),
  };
}

function sanitizeCrop(value: unknown): ScreenshotCrop {
  if (!isRecord(value) || ![value.zoom, value.x, value.y].every(isNumber)) return { ...DEFAULT_CROP };
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  return {
    zoom: Math.min(MAX_CROP_ZOOM, Math.max(1, value.zoom as number)),
    x: clamp01(value.x as number),
    y: clamp01(value.y as number),
  };
}

function sanitizeShadow(value: unknown): ShadowConfig {
  if (!isRecord(value) || ![value.blur, value.opacity, value.offsetX, value.offsetY].every(isNumber)) {
    return { ...SHADOW_PRESETS.soft };
  }
  const preset = (["none", "soft", "medium", "strong", "custom"] as const).find((p) => p === value.preset) ?? "custom";
  return {
    preset,
    blur: value.blur as number,
    opacity: Math.min(1, Math.max(0, value.opacity as number)),
    offsetX: value.offsetX as number,
    offsetY: value.offsetY as number,
  };
}
