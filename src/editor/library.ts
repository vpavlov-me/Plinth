import { create } from "zustand";
import type { CustomFrame } from "@/editor/custom-frames";
import type { GradientConfig } from "@/editor/types";

/**
 * The user's own library: background colours, gradients, images and videos, plus
 * uploaded device frames. Lives next to the built-in presets and persists
 * across sessions (see persistence.ts). Image entries are asset ids.
 */
type LibraryState = {
  colors: string[];
  gradients: GradientConfig[];
  images: string[];
  videos: string[];
  frames: CustomFrame[];
  addColor: (color: string) => void;
  removeColor: (color: string) => void;
  addGradient: (gradient: GradientConfig) => void;
  removeGradient: (index: number) => void;
  addImage: (assetId: string) => void;
  removeImage: (assetId: string) => void;
  addVideo: (assetId: string) => void;
  removeVideo: (assetId: string) => void;
  addFrame: (frame: CustomFrame) => void;
  removeFrame: (assetId: string) => void;
  load: (data: LibraryData) => void;
};

export type LibraryData = Pick<LibraryState, "colors" | "gradients" | "images" | "videos" | "frames">;

/** Each list keeps at most this many items (newest first). */
export const LIBRARY_LIMIT = 24;

const prepend = <T>(list: T[], item: T, same: (a: T, b: T) => boolean) =>
  [item, ...list.filter((existing) => !same(existing, item))].slice(0, LIBRARY_LIMIT);

export const sameGradient = (a: GradientConfig, b: GradientConfig) =>
  a.angle === b.angle &&
  a.colors.join() === b.colors.join() &&
  JSON.stringify(a.blobs ?? []) === JSON.stringify(b.blobs ?? []) &&
  (a.grain ?? 0) === (b.grain ?? 0);

export const useLibraryStore = create<LibraryState>((set) => ({
  colors: [],
  gradients: [],
  images: [],
  videos: [],
  frames: [],
  addColor: (color) => set((s) => ({ colors: prepend(s.colors, color.toLowerCase(), (a, b) => a === b) })),
  removeColor: (color) => set((s) => ({ colors: s.colors.filter((c) => c !== color) })),
  addGradient: (gradient) => set((s) => ({ gradients: prepend(s.gradients, gradient, sameGradient) })),
  removeGradient: (index) => set((s) => ({ gradients: s.gradients.filter((_, i) => i !== index) })),
  addImage: (assetId) => set((s) => ({ images: prepend(s.images, assetId, (a, b) => a === b) })),
  removeImage: (assetId) => set((s) => ({ images: s.images.filter((id) => id !== assetId) })),
  addVideo: (assetId) => set((s) => ({ videos: prepend(s.videos, assetId, (a, b) => a === b) })),
  removeVideo: (assetId) => set((s) => ({ videos: s.videos.filter((id) => id !== assetId) })),
  addFrame: (frame) => set((s) => ({ frames: prepend(s.frames, frame, (a, b) => a.assetId === b.assetId) })),
  removeFrame: (assetId) => set((s) => ({ frames: s.frames.filter((f) => f.assetId !== assetId) })),
  load: (data) => set(data),
}));
