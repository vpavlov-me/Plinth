import { useEffect, useState } from "react";
import { create } from "zustand";
import type { Size } from "@/editor/geometry";
import type { ImageAsset } from "@/editor/types";

/**
 * Runtime registry of binary image assets.
 *
 * The scene only stores asset ids. The blobs live here as object URLs so
 * large images never travel through React state as base64 strings.
 */
type AssetState = {
  assets: Record<string, ImageAsset>;
  add: (asset: ImageAsset) => void;
  /** Revokes object URLs of every asset not in `keep`. */
  prune: (keep: Iterable<string>) => void;
};

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: {},
  add: (asset) => set((state) => ({ assets: { ...state.assets, [asset.id]: asset } })),
  prune: (keep) => {
    const keepSet = new Set(keep);
    const current = get().assets;
    const removed = Object.values(current).filter((a) => !keepSet.has(a.id));
    if (removed.length === 0) return;
    for (const asset of removed) {
      URL.revokeObjectURL(asset.url);
      imageCache.delete(asset.url);
    }
    set({ assets: Object.fromEntries(Object.entries(current).filter(([id]) => keepSet.has(id))) });
  },
}));

export function getAsset(id: string | null | undefined): ImageAsset | null {
  if (!id) return null;
  return useAssetStore.getState().assets[id] ?? null;
}

export const assetSize = (id: string): Size | null => {
  const asset = getAsset(id);
  return asset ? { width: asset.width, height: asset.height } : null;
};

export function useAsset(id: string | null | undefined): ImageAsset | null {
  return useAssetStore((state) => (id ? (state.assets[id] ?? null) : null));
}

/* -------------------------------------------------------------------------- */
/* Decoded image cache                                                        */
/* -------------------------------------------------------------------------- */

type CacheEntry = { promise: Promise<HTMLImageElement>; image: HTMLImageElement | null };

const imageCache = new Map<string, CacheEntry>();

/** Loads and decodes an image once; later calls share the same element. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached.promise;
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  const entry: CacheEntry = {
    image: null,
    promise: image
      .decode()
      .then(() => {
        entry.image = image;
        return image;
      })
      .catch((error: unknown) => {
        imageCache.delete(src);
        throw error;
      }),
  };
  imageCache.set(src, entry);
  return entry.promise;
}

/** Returns the decoded image if it is already in the cache. */
export function getCachedImage(src: string): HTMLImageElement | null {
  return imageCache.get(src)?.image ?? null;
}

/**
 * React hook around {@link loadImage}. Returns the image synchronously when
 * it is cached, which lets the offscreen export renderer draw in one pass.
 */
export function useImage(src: string | null | undefined): HTMLImageElement | null {
  const [loaded, setLoaded] = useState<{ src: string; image: HTMLImageElement } | null>(null);
  const cached = src ? getCachedImage(src) : null;

  useEffect(() => {
    if (!src || getCachedImage(src)) return;
    let active = true;
    loadImage(src)
      .then((image) => {
        if (active) setLoaded({ src, image });
      })
      .catch(() => {
        // Missing artwork renders as an empty frame; the screenshot import
        // path reports decoding errors to the user separately.
      });
    return () => {
      active = false;
    };
  }, [src]);

  if (!src) return null;
  return cached ?? (loaded?.src === src ? loaded.image : null);
}
