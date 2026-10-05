import type Konva from "konva";
import { forwardRef } from "react";
import { Group, Rect } from "react-konva";
import { getDevice, getVariant } from "@/editor/devices/definitions";
import { useAsset, useImage } from "@/editor/assets";
import type { DeviceTransform } from "@/editor/geometry";
import { ImageShape } from "@/editor/rendering/image-shape";
import { ScreenshotNode } from "@/editor/rendering/screenshot-node";
import { ShadowNode } from "@/editor/rendering/shadow-node";
import { getFrameSilhouette, getSilhouette } from "@/editor/rendering/silhouette";
import type { DeviceInstance, ResolvedDeviceGeometry } from "@/editor/types";

type Props = {
  instance: DeviceInstance;
  geometry: ResolvedDeviceGeometry;
  transform: DeviceTransform;
  draggable?: boolean;
  onPointerDown?: (event: Konva.KonvaEventObject<PointerEvent>) => void;
  onMouseEnter?: (event: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseLeave?: (event: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragMove?: (event: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (event: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd?: (event: Konva.KonvaEventObject<Event>) => void;
};

/**
 * One device: shadow → screen (screenshot) → frame artwork, in a group
 * positioned by its centre. The group is the node users drag and transform.
 */
export const DeviceNode = forwardRef<Konva.Group, Props>(function DeviceNode(
  {
    instance,
    geometry,
    transform,
    draggable = false,
    onPointerDown,
    onMouseEnter,
    onMouseLeave,
    onDragMove,
    onDragEnd,
    onTransformEnd,
  },
  ref,
) {
  const device = getDevice(instance.deviceId);
  const frameSrc = getVariant(device, instance.variantId)?.frameSrc ?? device.frameSrc;
  const frameImage = useImage(frameSrc);
  // Frameless screenshots cast an alpha-aware shadow.
  const screenshot = useImage(useAsset(instance.screenshotId)?.url);
  const mask =
    device.layout.type === "screenshot" && screenshot
      ? getSilhouette(screenshot, geometry.screen)
      : device.custom && frameImage
        ? getFrameSilhouette(frameImage, geometry.screen)
        : null;

  return (
    <Group
      ref={ref}
      name="device"
      id={instance.id}
      x={transform.x}
      y={transform.y}
      scaleX={transform.scale}
      scaleY={transform.scale}
      rotation={transform.rotation}
      offsetX={geometry.width / 2}
      offsetY={geometry.height / 2}
      draggable={draggable}
      listening={draggable}
      onPointerDown={onPointerDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    >
      <ShadowNode body={geometry.body} shadow={instance.shadow} deviceScale={transform.scale} mask={mask} />
      <ScreenshotNode
        screen={geometry.screen}
        screenshotId={instance.screenshotId}
        fill={device.screenFill}
        bleed={device.frameSrc ? 2 : 0}
      />
      {frameImage
        ? geometry.frameSlices.map((slice, index) => (
            <ImageShape key={index} image={frameImage} src={slice.src} dest={slice.dest} />
          ))
        : null}
      {/* Hit area: makes the whole device draggable and gives the transformer its bounds. */}
      <Rect width={geometry.width} height={geometry.height} fill="transparent" />
    </Group>
  );
});
