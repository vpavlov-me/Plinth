import { create } from "zustand";
import { assetSize } from "@/editor/assets";
import { commitTransient, createHistory, pushState, redo, undo, type History } from "@/editor/history";
import { createDefaultScene, type AssetSizeLookup } from "@/editor/scene";
import type { DeviceInstance, Scene } from "@/editor/types";

/**
 * Document store: the scene plus its undo history.
 *
 * UI-only state (selection, export settings, …) lives in `ui-store.ts` so
 * that panels re-render only for the data they actually read.
 */
type SceneRecipe = (scene: Scene, sizeOf: AssetSizeLookup) => Scene;

type EditorState = {
  history: History<Scene>;
  /**
   * Applies a change. `transient` updates (continuous drags) are folded into
   * a single history entry by the next {@link EditorState.commit}.
   */
  update: (recipe: SceneRecipe, options?: { transient?: boolean }) => void;
  commit: () => void;
  undo: () => void;
  redo: () => void;
  /** Replaces the scene without recording history (hydration, new project). */
  load: (scene: Scene) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  history: createHistory(createDefaultScene()),
  update: (recipe, options) =>
    set((state) => ({ history: pushState(state.history, recipe(state.history.present, assetSize), options) })),
  commit: () => set((state) => ({ history: commitTransient(state.history) })),
  undo: () => set((state) => ({ history: undo(state.history) })),
  redo: () => set((state) => ({ history: redo(state.history) })),
  load: (scene) => set({ history: createHistory(scene) }),
}));

export const getScene = (): Scene => useEditorStore.getState().history.present;

export function useScene<T>(selector: (scene: Scene) => T): T {
  return useEditorStore((state) => selector(state.history.present));
}

export function useDevice(instanceId: string | null): DeviceInstance | null {
  return useScene((scene) => scene.devices.find((d) => d.id === instanceId) ?? null);
}

export const useCanUndo = () =>
  useEditorStore((state) => state.history.past.length > 0 || state.history.pendingBase !== null);
export const useCanRedo = () => useEditorStore((state) => state.history.future.length > 0);
