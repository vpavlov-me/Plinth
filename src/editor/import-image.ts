import { loadImage } from "@/editor/assets";
import type { ImageAsset } from "@/editor/types";
import { createId } from "@/editor/utils/id";
import { videoType } from "@/editor/video";

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const ACCEPT_ATTRIBUTE = ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";
export const ACCEPT_VIDEO_ATTRIBUTE = ".mp4,.m4v,.webm,.mov,video/mp4,video/webm,video/quicktime";
/** Screenshots may also be screen recordings. */
export const ACCEPT_SCREENSHOT_ATTRIBUTE = `${ACCEPT_ATTRIBUTE},${ACCEPT_VIDEO_ATTRIBUTE}`;

/** Files larger than this are rejected before decoding. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
/** Images are downscaled so neither side exceeds this. */
export const MAX_IMAGE_SIDE = 8192;
/** …and the total pixel count stays below this (≈ 48 MP). */
export const MAX_IMAGE_PIXELS = 48_000_000;

export class ImageImportError extends Error {
  override name = "ImageImportError";
}

const EXTENSION_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function detectType(file: Blob & { name?: string }): string {
  if (file.type) return file.type;
  const extension = file.name?.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[extension] ?? "";
}

export type ImportResult = { asset: ImageAsset; downscaled: boolean };

/**
 * Validates, decodes and registers an image file. Everything happens
 * locally; the file never leaves the browser.
 */
export async function importImageFile(file: Blob & { name?: string }): Promise<ImportResult> {
  const type = detectType(file);
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type)) {
    throw new ImageImportError("Unsupported file. Use a PNG, JPG or WebP image.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ImageImportError(`That image is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
  }
  if (file.size === 0) {
    throw new ImageImportError("That file is empty.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageImportError("This image could not be decoded. It may be corrupted.");
  }

  let blob: Blob = file;
  let { width, height } = bitmap;
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(width, height), Math.sqrt(MAX_IMAGE_PIXELS / (width * height)));
  const downscaled = scale < 1;
  try {
    if (downscaled) {
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      blob = await resizeBitmap(bitmap, width, height);
    }
  } finally {
    bitmap.close();
  }

  const url = URL.createObjectURL(blob);
  try {
    await loadImage(url);
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageImportError("This image could not be decoded. It may be corrupted.");
  }

  return {
    asset: { id: createId("img"), url, width, height, name: file.name ?? "Pasted image", blob },
    downscaled,
  };
}

async function resizeBitmap(bitmap: ImageBitmap, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageImportError("Your browser could not process this image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new ImageImportError("Your browser could not process this image.");
  return blob;
}

const isMediaFile = (file: File) =>
  file.type.startsWith("image/") ||
  file.type.startsWith("video/") ||
  detectType(file) !== "" ||
  videoType(file) !== null;

/** First image or video file in a DataTransfer (drop or paste), if any. */
export function firstImageFile(data: DataTransfer | null): File | null {
  if (!data) return null;
  for (const file of Array.from(data.files)) {
    if (isMediaFile(file)) return file;
  }
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === "file" && (item.type.startsWith("image/") || item.type.startsWith("video/"))) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return data.files[0] ?? null;
}

/** Every image or video file in a DataTransfer (multi-file drop), in order. */
export function imageFiles(data: DataTransfer | null): File[] {
  if (!data) return [];
  return Array.from(data.files).filter(isMediaFile);
}
