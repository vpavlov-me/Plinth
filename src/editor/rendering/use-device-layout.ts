import { useMemo } from "react";
import { useAsset } from "@/editor/assets";
import { getDevice } from "@/editor/devices/definitions";
import { deviceTransform, resolveDeviceGeometry, type DeviceTransform } from "@/editor/geometry";
import type { CanvasConfig, DeviceInstance, ResolvedDeviceGeometry } from "@/editor/types";

/** Resolved geometry and absolute canvas transform of a device instance. */
export function useDeviceLayout(
  instance: DeviceInstance,
  canvas: CanvasConfig,
): { geometry: ResolvedDeviceGeometry; transform: DeviceTransform } {
  const asset = useAsset(instance.screenshotId);
  const width = asset?.width;
  const height = asset?.height;
  const geometry = useMemo(
    () =>
      resolveDeviceGeometry(
        getDevice(instance.deviceId),
        width !== undefined && height !== undefined ? { width, height } : null,
      ),
    [instance.deviceId, width, height],
  );
  return { geometry, transform: deviceTransform(instance, geometry, canvas) };
}
