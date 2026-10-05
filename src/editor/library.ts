import { create } from "zustand";
import type { GradientConfig } from "@/editor/types";

/**
 * The user's own background library: colours, gradients and images they
 * added. Lives next to the built-in presets and persists across sessions
 * (see persistence.ts). Image entries are asset ids.
 */
type LibraryState = {
  colors: string[];
  gradients: GradientConfig[];
  images: string[];
  addColor: (color: string) => void;
  removeColor: (color: string) => void;
  addGradient: (gradient: GradientConfig) => void;
  removeGradient: (index: number) => void;
  addImage: (assetId: string) => void;
  removeImage: (assetId: string) => void;
  load: (data: Pick<LibraryState, "colors" | "gradients" | "images">) => void;
};

/** Each list keeps at most this many items (newest first). */
export const LIBRARY_LIMIT = 24;

const prepend = <T>(list: T[], item: T, same: (a: T, b: T) => boolean) =>
  [item, ...list.filter((existing) => !same(existing, item))].slice(0, LIBRARY_LIMIT);

export const sameGradient = (a: GradientConfig, b: GradientConfig) =>
  a.angle === b.angle && a.colors.join() === b.colors.join();

export const useLibraryStore = create<LibraryState>((set) => ({
  colors: [],
  gradients: [],
  images: [],
  addColor: (color) => set((s) => ({ colors: prepend(s.colors, color.toLowerCase(), (a, b) => a === b) })),
  removeColor: (color) => set((s) => ({ colors: s.colors.filter((c) => c !== color) })),
  addGradient: (gradient) => set((s) => ({ gradients: prepend(s.gradients, gradient, sameGradient) })),
  removeGradient: (index) => set((s) => ({ gradients: s.gradients.filter((_, i) => i !== index) })),
  addImage: (assetId) => set((s) => ({ images: prepend(s.images, assetId, (a, b) => a === b) })),
  removeImage: (assetId) => set((s) => ({ images: s.images.filter((id) => id !== assetId) })),
  load: (data) => set(data),
}));
