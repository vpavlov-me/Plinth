"use client";

import { useEffect } from "react";
import { loadImage, useAssetStore } from "@/editor/assets";
import { DEVICES } from "@/editor/devices/definitions";
import { historyValues } from "@/editor/history";
import { loadScene, loadSettings, saveSettings, scheduleSave } from "@/editor/persistence";
import { sceneAssetIds } from "@/editor/scene";
import { useEditorStore } from "@/editor/store";
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

    void loadScene().then((scene) => {
      if (disposed) return;
      useEditorStore.getState().load(scene);
      useUIStore.getState().setHydrated();

      unsubscribers.push(
        useEditorStore.subscribe((state, previous) => {
          if (state.history === previous.history) return;
          if (state.history.present !== previous.history.present) scheduleSave(state.history.present);
          useAssetStore.getState().prune(historyValues(state.history).flatMap(sceneAssetIds));
        }),
        useUIStore.subscribe((state, previous) => {
          if (state.exportSettings !== previous.exportSettings) saveSettings(state.exportSettings);
        }),
      );
    });

    return () => {
      disposed = true;
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, []);
}
