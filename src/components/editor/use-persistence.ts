"use client";

import { useEffect } from "react";
import { loadImage, useAssetStore } from "@/editor/assets";
import { prunePalettes } from "@/editor/color-match";
import { DEVICES } from "@/editor/devices/definitions";
import { historyValues } from "@/editor/history";
import { useLibraryStore } from "@/editor/library";
import { registerCustomFrames } from "@/editor/custom-frames";
import {
  libraryAssetIds,
  loadLibrary,
  loadScene,
  loadSettings,
  saveSettings,
  scheduleSave,
} from "@/editor/persistence";
import { sceneAssetIds } from "@/editor/scene";
import { getScene, useEditorStore } from "@/editor/store";
import { useUIStore } from "@/editor/ui-store";

/**
 * Restores the last project, then keeps it saved locally. Also releases
 * image assets that are no longer reachable through the undo history.
 */
export function usePersistence() {
  useEffect(() => {
    let disposed = false;
    const unsubscribers: (() => void)[] = [];

    // Warm the frame artwork so switching devices never flickers.
    for (const device of DEVICES) {
      for (const variant of device.variants ?? []) void loadImage(variant.frameSrc).catch(() => undefined);
    }

    useUIStore.getState().setExportSettings(loadSettings());

    void loadLibrary()
      .then(() => {
        registerCustomFrames(useLibraryStore.getState().frames);
        return loadScene();
      })
      .then(({ scene, selectedDeviceId }) => {
        if (disposed) return;
        useEditorStore.getState().load(scene);
        useUIStore.getState().select(selectedDeviceId);
        useUIStore.getState().setHydrated();

        unsubscribers.push(
          useEditorStore.subscribe((state, previous) => {
            if (state.history === previous.history) return;
            if (state.history.present !== previous.history.present) scheduleSave(state.history.present);
            pruneAssets();
          }),
          useLibraryStore.subscribe((state, previous) => {
            if (state.frames !== previous.frames) registerCustomFrames(state.frames);
            scheduleSave(getScene());
            pruneAssets();
          }),
          useUIStore.subscribe((state, previous) => {
            if (state.exportSettings !== previous.exportSettings) saveSettings(state.exportSettings);
            if (state.selectedDeviceId !== previous.selectedDeviceId) scheduleSave(getScene());
          }),
        );
      });

    return () => {
      disposed = true;
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, []);
}

/** Releases images that neither the undo history nor the library can reach. */
function pruneAssets() {
  const keep = historyValues(useEditorStore.getState().history).flatMap(sceneAssetIds);
  useAssetStore.getState().prune([...keep, ...libraryAssetIds()]);
  prunePalettes(new Set(Object.keys(useAssetStore.getState().assets)));
}
