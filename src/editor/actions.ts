import { useAssetStore } from "@/editor/assets";
import { getDevice, suggestDeviceForImage } from "@/editor/devices/definitions";
import { ImageImportError, importImageFile } from "@/editor/import-image";
import { useLibraryStore } from "@/editor/library";
import { notify } from "@/editor/notify";
import { changeDeviceModel, setScreenshot } from "@/editor/scene";
import { getScene, useEditorStore } from "@/editor/store";
import type { DeviceInstance, ImageAsset } from "@/editor/types";
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
  // it badly (e.g. a desktop screenshot dropped onto the phone).
  const suggested = isPoorFit(target, asset) ? suggestDeviceForImage(asset.width, asset.height) : null;
  useEditorStore.getState().update((current, sizeOf) => {
    const withShot = setScreenshot(current, target.id, asset.id, sizeOf);
    return suggested ? changeDeviceModel(withShot, target.id, suggested, sizeOf) : withShot;
  });
  useUIStore.getState().select(target.id);
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
