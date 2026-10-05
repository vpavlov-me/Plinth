import type Konva from "konva";
import { forwardRef } from "react";
import { Group, Rect, Shape } from "react-konva";
import { getDevice, getVariant } from "@/editor/devices/definitions";
import { useAsset, useImage } from "@/editor/assets";
import { traceRoundedRect, type DeviceTransform } from "@/editor/geometry";
import { getPerspectivePreset, projectRect } from "@/editor/presets/perspective-presets";
import { drawDeviceArtwork, screenArea, screenshotRect, type DeviceArtwork } from "@/editor/rendering/device-artwork";
import { getPerspectiveImage } from "@/editor/rendering/perspective-render";
import { ShadowNode, type ShadowMask } from "@/editor/rendering/shadow-node";
import { getFrameSilhouette, getSilhouette } from "@/editor/rendering/silhouette";
import type { DeviceInstance, Rect as RectType, ResolvedDeviceGeometry } from "@/editor/types";

type Props = {
  instance: DeviceInstance;
  geometry: ResolvedDeviceGeometry;
  transform: DeviceTransform;
  draggable?: boolean;
  /**
   * Crop mode (editor only): the device is shown flat, with the whole
   * screenshot faintly visible around the screen, so it's clear the content
   * — not the device — is being edited.
   */
  cropping?: boolean;
  onPointerDown?: (event: Konva.KonvaEventObject<PointerEvent>) => void;
  onDblClick?: (event: Konva.KonvaEventObject<MouseEvent>) => void;
  onWheel?: (event: Konva.KonvaEventObject<WheelEvent>) => void;
  onMouseEnter?: (event: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseLeave?: (event: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragStart?: (event: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove?: (event: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (event: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd?: (event: Konva.KonvaEventObject<Event>) => void;
};

/** Device pixels per local unit, read from the context's current transform. */
function pixelsPerUnit(ctx: CanvasRenderingContext2D): number {
  const m = ctx.getTransform();
  return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
}

/**
 * One device: shadow → device artwork (screen + frame, projected when a
 * perspective preset is active), in a group positioned by its centre. The
 * group is the node users drag and transform.
 */
export const DeviceNode = forwardRef<Konva.Group, Props>(function DeviceNode(
  {
    instance,
    geometry,
    transform,
    draggable = false,
    cropping = false,
    onPointerDown,
    onDblClick,
    onWheel,
    onMouseEnter,
    onMouseLeave,
    onDragStart,
    onDragMove,
    onDragEnd,
    onTransformEnd,
  },
  ref,
) {
  const device = getDevice(instance.deviceId);
  const frameSrc = getVariant(device, instance.variantId)?.frameSrc ?? device.frameSrc;
  const frame = useImage(frameSrc);
  const screenshot = useImage(useAsset(instance.screenshotId)?.url);
  const artwork: DeviceArtwork = { device, geometry, frame, screenshot, crop: instance.crop };
  const perspective = cropping ? "front" : instance.perspective;
  const projected = perspective !== "front";

  // Local bounds of what is drawn: the frame, or its projection.
  const bounds: RectType = projected
    ? projectRect(geometry.width, geometry.height, getPerspectivePreset(perspective)).bounds
    : { x: 0, y: 0, width: geometry.width, height: geometry.height };

  const mask: ShadowMask | null = projected
    ? (density) => {
        const image = getPerspectiveImage(artwork, perspective, density);
        return image ? { image: image.canvas, rect: image.rect } : null;
      }
    : device.layout.type === "screenshot" && screenshot
      ? () => ({
          image: getSilhouette(screenshot, geometry.screen, screenshotRect(artwork)!),
          rect: geometry.screen,
        })
      : device.custom && frame
        ? () => ({
            image: getFrameSilhouette(frame, geometry.screen),
            rect: geometry.body[0] ?? { x: 0, y: 0, width: geometry.width, height: geometry.height },
          })
        : null;

  const drawArtwork = (context: Konva.Context) => {
    const ctx = context._context;
    if (projected) {
      const image = getPerspectiveImage(artwork, perspective, pixelsPerUnit(ctx));
      if (image) {
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image.canvas, image.rect.x, image.rect.y, image.rect.width, image.rect.height);
        ctx.restore();
        return;
      }
    }
    drawDeviceArtwork(ctx, artwork);
  };

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
      // Static renders (export) don't listen; in crop mode the device isn't draggable but still takes the pointer.
      listening={draggable || cropping}
      onPointerDown={onPointerDown}
      onDblClick={onDblClick}
      onWheel={onWheel}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    >
      <ShadowNode
        body={projected ? [{ ...bounds, radius: 0 }] : geometry.body}
        shadow={instance.shadow}
        deviceScale={transform.scale}
        mask={mask}
      />
      {cropping ? <CropGhost artwork={artwork} /> : null}
      <Shape sceneFunc={drawArtwork} listening={false} perfectDrawEnabled={false} />
      {cropping ? <CropOutline artwork={artwork} scale={transform.scale} /> : null}
      {/* Hit area: makes the whole device draggable and gives the transformer its bounds. */}
      <Rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="transparent" />
    </Group>
  );
});

/** The whole screenshot, faint, so users see what lies outside the screen while cropping. */
function CropGhost({ artwork }: { artwork: DeviceArtwork }) {
  const rect = screenshotRect(artwork);
  if (!artwork.screenshot || !rect) return null;
  const image = artwork.screenshot;
  return (
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      sceneFunc={(context) => {
        const ctx = context._context;
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
        ctx.restore();
      }}
    />
  );
}

/** Accent outline of the editable screen area. */
function CropOutline({ artwork, scale }: { artwork: DeviceArtwork; scale: number }) {
  const area = screenArea(artwork);
  return (
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      sceneFunc={(context) => {
        const ctx = context._context;
        const unit = 1 / (pixelsPerUnit(ctx) || scale);
        ctx.save();
        ctx.beginPath();
        traceRoundedRect(ctx, area);
        ctx.strokeStyle = "#6b8cff";
        ctx.lineWidth = 2 * unit * (window.devicePixelRatio || 1);
        ctx.setLineDash([6 * unit * (window.devicePixelRatio || 1), 4 * unit * (window.devicePixelRatio || 1)]);
        ctx.stroke();
        ctx.restore();
      }}
    />
  );
}
