import { getAsset, useAssetStore } from "@/editor/assets";
import { matchedBackground, screenshotPalette, type MatchVariant } from "@/editor/color-match";
import { getDevice, suggestDeviceForImage } from "@/editor/devices/definitions";
import { ImageImportError, importImageFile } from "@/editor/import-image";
import { customDeviceId, detectScreen, FrameDetectionError } from "@/editor/custom-frames";
import { getCachedImage } from "@/editor/assets";
import { useLibraryStore } from "@/editor/library";
import { notify } from "@/editor/notify";
import { DEFAULT_LAYOUT_ID, layoutForScreenshotCount } from "@/editor/presets/layout-presets";
import { applyLayout, changeDeviceModel, removeDevice, setScreenshot } from "@/editor/scene";
import { getScene, useEditorStore } from "@/editor/store";
import type { DeviceInstance, ImageAsset } from "@/editor/types";
import { createId } from "@/editor/utils/id";
import { useUIStore } from "@/editor/ui-store";

/**
 * User-level actions that combine asset handling, scene updates and
 * notifications. Components call these instead of orchestrating themselves.
 */

async function importWithFeedback(file: Blob & { name?: string }): Promise<ImageAsset | null> {
  const ui = useUIStore.getState();
  ui.setImporting(true);
  try {
    const { asset, downscaled } = await importImageFile(file);
    useAssetStore.getState().add(asset);
    if (downscaled) {
      notify("Large image downscaled", {
        description: `Resized to ${asset.width} × ${asset.height} to keep the editor responsive.`,
      });
    }
    return asset;
  } catch (error) {
    const message = error instanceof ImageImportError ? error.message : "Something went wrong while reading the image.";
    notify("Couldn’t import image", { description: message, type: "error" });
    return null;
  } finally {
    useUIStore.getState().setImporting(false);
  }
}

/** True when the screenshot would be heavily cropped by the device screen. */
function isPoorFit(instance: DeviceInstance, asset: ImageAsset): boolean {
  const device = getDevice(instance.deviceId);
  if (device.layout.type !== "fixed") return false;
  const screenRatio = device.screen.height / device.screen.width;
  const imageRatio = asset.height / asset.width;
  return Math.abs(Math.log(imageRatio / screenRatio)) > Math.log(1.3);
}

export async function importScreenshot(file: Blob & { name?: string }, instanceId?: string | null): Promise<void> {
  const asset = await importWithFeedback(file);
  if (!asset) return;
  const scene = getScene();
  const target = scene.devices.find((d) => d.id === instanceId) ?? scene.devices[0];
  if (!target) return;

  // Pick a device that suits the screenshot when the current one would crop
  // it badly (e.g. a desktop screenshot dropped onto the phone). Layouts
  // keep their devices: the user chose them deliberately.
  const suggested =
    scene.devices.length === 1 && isPoorFit(target, asset) ? suggestDeviceForImage(asset.width, asset.height) : null;
  useEditorStore.getState().update((current, sizeOf) => {
    let next = setScreenshot(current, target.id, asset.id, sizeOf);
    // In a layout, empty devices show the same screenshot until given their own.
    for (const device of next.devices) {
      if (device.id !== target.id && device.screenshotId === null)
        next = setScreenshot(next, device.id, asset.id, sizeOf);
    }
    return suggested ? changeDeviceModel(next, target.id, suggested, sizeOf) : next;
  });
  useUIStore.getState().select(target.id);
}

/**
 * Several screenshots at once (drop): they fill a layout with one device
 * per screenshot (two → Duo, three or more → Fan). A single file behaves
 * like {@link importScreenshot}.
 */
export async function importScreenshots(files: File[], instanceId?: string | null): Promise<void> {
  if (files.length <= 1) {
    if (files[0]) await importScreenshot(files[0], instanceId);
    return;
  }
  const assets: ImageAsset[] = [];
  for (const file of files.slice(0, 3)) {
    const asset = await importWithFeedback(file);
    if (asset) assets.push(asset);
  }
  if (assets.length === 0) return;
  const layout = layoutForScreenshotCount(assets.length);
  useEditorStore.getState().update((scene, sizeOf) => {
    // Seed the screenshots in drop order, then let the layout distribute them.
    const seeded = { ...scene, devices: scene.devices.slice(0, 1), layout: DEFAULT_LAYOUT_ID };
    const primary = seeded.devices[0]!;
    const withShots = {
      ...seeded,
      devices: [
        { ...primary, screenshotId: assets[0]!.id },
        ...assets.slice(1).map((asset, i) => ({ ...primary, id: `${primary.id}-${i + 1}`, screenshotId: asset.id })),
      ],
    };
    const arranged = applyLayout({ ...withShots, screenshots: assets.map((a) => a.id) }, layout, sizeOf, primary.id);
    // Slots reuse instances by category, so give the copies fresh ids.
    return {
      ...arranged,
      devices: arranged.devices.map((d, i) => (i === 0 ? d : { ...d, id: createId("device") })),
    };
  });
  useUIStore.getState().select(getScene().devices[0]?.id ?? null);
}

/** Arranges the devices by a layout preset (one undo step). */
export function applyLayoutPreset(layoutId: string): void {
  const selected = useUIStore.getState().selectedDeviceId;
  useEditorStore.getState().update((scene, sizeOf) => applyLayout(scene, layoutId, sizeOf, selected));
  const scene = getScene();
  const keep = scene.devices.find((d) => d.id === selected) ?? scene.devices[0];
  useUIStore.getState().select(keep?.id ?? null);
  useUIStore.getState().setCropping(null);
}

/** Removes the selected device when the composition has more than one. */
export function removeSelectedDevice(): void {
  const scene = getScene();
  if (scene.devices.length < 2) return;
  const selected = useUIStore.getState().selectedDeviceId;
  const target = scene.devices.find((d) => d.id === selected) ?? scene.devices.at(-1)!;
  useEditorStore.getState().update((current) => removeDevice(current, target.id));
  useUIStore.getState().select(getScene().devices[0]?.id ?? null);
}

/**
 * Generates a background from the active device's screenshot (or the first
 * screenshot in the scene) and applies it as one undo step.
 */
export function matchBackgroundColors(variant: MatchVariant = "soft", instanceId?: string | null): boolean {
  const scene = getScene();
  const preferred = scene.devices.find((d) => d.id === instanceId && d.screenshotId);
  const source = preferred ?? scene.devices.find((d) => d.screenshotId);
  const asset = getAsset(source?.screenshotId);
  const image = asset ? getCachedImage(asset.url) : null;
  if (!asset || !image) {
    notify("Add a screenshot first", { description: "Match colors builds the background from your screenshot." });
    return false;
  }
  const background = matchedBackground(screenshotPalette(asset.id, image), variant);
  useEditorStore.getState().update((current) => ({ ...current, background }));
  return true;
}

export async function importBackgroundImage(file: Blob & { name?: string }): Promise<void> {
  const asset = await importWithFeedback(file);
  if (!asset) return;
  useLibraryStore.getState().addImage(asset.id);
  useEditorStore.getState().update((scene) => ({
    ...scene,
    background: { type: "image", source: { kind: "upload", assetId: asset.id } },
  }));
}

/**
 * Reads an image through the async Clipboard API (used by the "Paste"
 * button). Keyboard paste goes through the `paste` event instead, which
 * works without extra permissions.
 */
export async function pasteScreenshotFromClipboard(instanceId?: string | null): Promise<void> {
  if (!navigator.clipboard?.read) {
    notify("Clipboard access isn’t available", { description: "Press ⌘V / Ctrl+V to paste instead." });
    return;
  }
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find((t) => t.startsWith("image/"));
      if (type) {
        await importScreenshot(await item.getType(type), instanceId);
        return;
      }
    }
    notify("No image on the clipboard", { description: "Copy a screenshot first, then paste." });
  } catch {
    notify("Clipboard access was blocked", { description: "Press ⌘V / Ctrl+V to paste instead." });
  }
}

/**
 * Adds a user-supplied device frame (PNG/WebP with a transparent screen) to
 * the library and applies it to the active device.
 */
export async function importDeviceFrame(file: Blob & { name?: string }, instanceId?: string | null): Promise<void> {
  const asset = await importWithFeedback(file);
  if (!asset) return;
  const image = getCachedImage(asset.url);
  let screen;
  try {
    if (!image) throw new FrameDetectionError("The image could not be read.");
    screen = detectScreen(image);
  } catch (error) {
    const description = error instanceof FrameDetectionError ? error.message : "The screen area could not be detected.";
    notify("Couldn’t use this frame", { description, type: "error" });
    useAssetStore.getState().prune(Object.keys(useAssetStore.getState().assets).filter((id) => id !== asset.id));
    return;
  }
  const name = (asset.name || "Frame").replace(/\.[a-z0-9]+$/i, "");
  useLibraryStore.getState().addFrame({ assetId: asset.id, name, screen });
  const scene = getScene();
  const target = scene.devices.find((d) => d.id === instanceId) ?? scene.devices[0];
  if (target) {
    useEditorStore
      .getState()
      .update((current, sizeOf) => changeDeviceModel(current, target.id, customDeviceId(asset.id), sizeOf));
  }
  notify("Frame added", { description: `Screen detected: ${screen.width} × ${screen.height} px` });
}
