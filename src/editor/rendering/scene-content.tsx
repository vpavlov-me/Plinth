import { Layer } from "react-konva";
import { BackgroundNode } from "@/editor/rendering/background-node";
import { DeviceNode } from "@/editor/rendering/device-node";
import { useDeviceLayout } from "@/editor/rendering/use-device-layout";
import type { CanvasConfig, DeviceInstance, Scene } from "@/editor/types";

/**
 * Static (non-interactive) rendering of a scene. Used by the export
 * renderer; the interactive stage composes the same nodes with handlers.
 */
export function StaticScene({ scene }: { scene: Scene }) {
  return (
    <>
      <Layer listening={false}>
        <BackgroundNode background={scene.background} canvas={scene.canvas} />
      </Layer>
      <Layer listening={false}>
        {scene.devices.map((instance) => (
          <StaticDevice key={instance.id} instance={instance} canvas={scene.canvas} />
        ))}
      </Layer>
    </>
  );
}

function StaticDevice({ instance, canvas }: { instance: DeviceInstance; canvas: CanvasConfig }) {
  const { geometry, transform } = useDeviceLayout(instance, canvas);
  return <DeviceNode instance={instance} geometry={geometry} transform={transform} />;
}
