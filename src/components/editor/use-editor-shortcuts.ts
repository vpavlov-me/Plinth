"use client";

import { useEffect } from "react";
import { pickImageFile } from "@/components/editor/pick-file";
import { exportScene } from "@/components/editor/export-actions";
import { importScreenshot, removeSelectedDevice } from "@/editor/actions";
import { firstImageFile } from "@/editor/import-image";
import { updateDevice } from "@/editor/scene";
import { getScene, useEditorStore } from "@/editor/store";
import { useUIStore } from "@/editor/ui-store";

function isTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && !["checkbox", "radio", "range", "button", "color"].includes(target.type);
}

function activeDeviceId(): string | null {
  const selected = useUIStore.getState().selectedDeviceId;
  const devices = getScene().devices;
  return devices.find((d) => d.id === selected)?.id ?? devices[0]?.id ?? null;
}

const NUDGE: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * Global keyboard shortcuts, clipboard paste and file-drop protection.
 * Text inputs keep their native behaviour (including their own undo).
 */
export function useEditorShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const editor = useEditorStore.getState();
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (isTextInput(event.target)) return;

      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (mod && key === "y") {
        event.preventDefault();
        editor.redo();
        return;
      }
      if (mod && key === "o") {
        event.preventDefault();
        pickImageFile((file) => void importScreenshot(file, activeDeviceId()), { video: true });
        return;
      }
      if (!mod && event.key === "?") {
        event.preventDefault();
        useUIStore.getState().setDialog("shortcuts");
        return;
      }
      if (mod && key === "e") {
        event.preventDefault();
        void exportScene();
        return;
      }
      if (event.key === "Escape") {
        const ui = useUIStore.getState();
        // First leave crop mode, then clear the selection.
        if (ui.croppingDeviceId) ui.setCropping(null);
        else ui.select(null);
        return;
      }
      if (
        !mod &&
        (event.key === "Delete" || event.key === "Backspace") &&
        useUIStore.getState().selectedDeviceId &&
        getScene().devices.length > 1
      ) {
        event.preventDefault();
        removeSelectedDevice();
        return;
      }

      // Arrow keys nudge the selected device (Shift = 10px). Only while the
      // canvas has a selection, so arrow keys keep working in other widgets.
      const nudge = NUDGE[event.key];
      const selected = useUIStore.getState().selectedDeviceId;
      if (nudge && selected && !mod && (event.target === document.body || event.target === null)) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const { canvas, devices } = getScene();
        const device = devices.find((d) => d.id === selected);
        if (!device) return;
        editor.update(
          (scene) =>
            updateDevice(scene, selected, {
              x: device.x + (nudge[0] * step) / canvas.width,
              y: device.y + (nudge[1] * step) / canvas.height,
            }),
          { transient: true },
        );
      }
    };

    // A run of nudges becomes one undo step.
    const onKeyUp = (event: KeyboardEvent) => {
      if (NUDGE[event.key]) useEditorStore.getState().commit();
    };

    const onPaste = (event: ClipboardEvent) => {
      const file = firstImageFile(event.clipboardData);
      if (!file || !file.type.startsWith("image/")) return;
      if (isTextInput(event.target) && event.clipboardData?.types.includes("text/plain")) return;
      event.preventDefault();
      void importScreenshot(file, activeDeviceId());
    };

    // Dropping a file outside the workspace must not navigate away.
    const preventNavigation = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", preventNavigation);
    window.addEventListener("drop", preventNavigation);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", preventNavigation);
      window.removeEventListener("drop", preventNavigation);
    };
  }, []);
}
