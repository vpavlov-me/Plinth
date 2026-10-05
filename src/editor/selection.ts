import { useScene } from "@/editor/store";
import { useUIStore } from "@/editor/ui-store";

/**
 * The device the inspector edits: the selected one, or the first device when
 * nothing is selected (the editor currently focuses on a single device).
 */
export function useActiveDeviceId(): string | null {
  const selected = useUIStore((s) => s.selectedDeviceId);
  return useScene((scene) => {
    if (selected && scene.devices.some((d) => d.id === selected)) return selected;
    return scene.devices[0]?.id ?? null;
  });
}
