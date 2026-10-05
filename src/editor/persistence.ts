import { getAsset, loadImage, useAssetStore } from "@/editor/assets";
import { DEVICES } from "@/editor/devices/definitions";
import { CANVAS_PRESETS, clampCanvasDimension } from "@/editor/presets/canvas-presets";
import { SHADOW_PRESETS } from "@/editor/presets/shadow-presets";
import { createDefaultScene, sceneAssetIds } from "@/editor/scene";
import type { BackgroundConfig, DeviceInstance, ImageAsset, Scene, ShadowConfig } from "@/editor/types";
import { DEFAULT_EXPORT_SETTINGS, type ExportSettings } from "@/editor/ui-store";

/**
 * Local persistence.
 * - Scene configuration and settings: localStorage (small JSON).
 * - Image blobs: IndexedDB (localStorage is far too small for screenshots).
 * Nothing is ever uploaded.
 */

const SCENE_KEY = "plinth.scene.v1";
const SETTINGS_KEY = "plinth.settings.v1";
const DB_NAME = "plinth";
const STORE = "assets";

type StoredAsset = { id: string; blob: Blob; width: number; height: number; name: string };

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
    const record: StoredAsset = { id, blob: asset.blob, width: asset.width, height: asset.height, name: asset.name };
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
  try {
    await loadImage(url);
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
  return { id, url, width: record.width, height: record.height, name: record.name, blob: record.blob };
}

/* -------------------------------------------------------------------------- */
/* Scene                                                                      */
/* -------------------------------------------------------------------------- */

let saveTimer: number | undefined;

/** Debounced save of the scene and the images it references. */
export function scheduleSave(scene: Scene): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(SCENE_KEY, JSON.stringify({ version: 1, scene }));
    } catch {
      // Storage full or disabled: the editor keeps working without persistence.
    }
    syncStoredAssets(sceneAssetIds(scene)).catch(() => {
      // Screenshots are persisted best-effort (private mode, quota, …).
    });
  }, 400);
}

/** Restores the last scene. Missing images are dropped from the scene. */
export async function loadScene(): Promise<Scene> {
  let scene: Scene | null = null;
  try {
    const raw = localStorage.getItem(SCENE_KEY);
    scene = raw ? sanitizeScene((JSON.parse(raw) as { scene?: unknown }).scene) : null;
  } catch {
    scene = null;
  }
  if (!scene) return createDefaultScene();

  const restored = new Set<string>();
  try {
    const assets = await Promise.all(sceneAssetIds(scene).map((id) => restoreAsset(id)));
    for (const asset of assets) {
      if (!asset) continue;
      useAssetStore.getState().add(asset);
      restored.add(asset.id);
    }
  } catch {
    // IndexedDB unavailable: keep the configuration, drop the images.
  }

  return {
    ...scene,
    background:
      scene.background.type === "image" && !restored.has(scene.background.assetId)
        ? createDefaultScene().background
        : scene.background,
    devices: scene.devices.map((d) =>
      d.screenshotId && !restored.has(d.screenshotId) ? { ...d, screenshotId: null } : d,
    ),
  };
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
  };
}

function sanitizeBackground(bg: Record<string, unknown>): BackgroundConfig | null {
  switch (bg.type) {
    case "solid":
      return isColor(bg.color) ? { type: "solid", color: bg.color } : null;
    case "gradient":
      return Array.isArray(bg.colors) && bg.colors.length >= 2 && bg.colors.every(isColor) && isNumber(bg.angle)
        ? { type: "gradient", colors: bg.colors.slice(0, 4), angle: bg.angle }
        : null;
    case "image":
      return isString(bg.assetId)
        ? { type: "image", assetId: bg.assetId, fit: bg.fit === "contain" ? "contain" : "cover" }
        : null;
    case "transparent":
      return { type: "transparent" };
    default:
      return null;
  }
}

function sanitizeDevice(value: unknown): DeviceInstance | null {
  if (!isRecord(value) || !isString(value.id) || !isString(value.deviceId)) return null;
  if (!DEVICES.some((d) => d.id === value.deviceId)) return null;
  if (![value.x, value.y, value.scale, value.rotation].every(isNumber)) return null;
  return {
    id: value.id,
    deviceId: value.deviceId,
    variantId: isString(value.variantId) ? value.variantId : undefined,
    screenshotId: isString(value.screenshotId) ? value.screenshotId : null,
    x: value.x as number,
    y: value.y as number,
    scale: Math.max(0.05, value.scale as number),
    rotation: value.rotation as number,
    shadow: sanitizeShadow(value.shadow),
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
