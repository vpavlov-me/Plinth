import { getAsset, useAsset } from "@/editor/assets";
import { getPhotoPreset, photoSrc } from "@/editor/presets/photo-presets";
import type { BackgroundImageSource } from "@/editor/types";

/** URL of a background image, or null when it is no longer available. */
export function backgroundImageUrl(source: BackgroundImageSource): string | null {
  if (source.kind === "photo") return getPhotoPreset(source.photoId) ? photoSrc(source.photoId) : null;
  return getAsset(source.assetId)?.url ?? null;
}

/** Reactive variant of {@link backgroundImageUrl} (re-renders when uploads load). */
export function useBackgroundImageUrl(source: BackgroundImageSource): string | null {
  const upload = useAsset(source.kind === "upload" ? source.assetId : null);
  if (source.kind === "upload") return upload?.url ?? null;
  return backgroundImageUrl(source);
}
