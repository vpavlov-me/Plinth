"use client";

import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { Layer, Line, Stage, Transformer } from "react-konva";
import { getAsset } from "@/editor/assets";
import { getDevice } from "@/editor/devices/definitions";
import { clamp, panCrop, relativeTransform } from "@/editor/geometry";
import { BackgroundNode } from "@/editor/rendering/background-node";
import { screenArea } from "@/editor/rendering/device-artwork";
import { DeviceNode } from "@/editor/rendering/device-node";
import { useDeviceLayout } from "@/editor/rendering/use-device-layout";
import { MAX_CROP_ZOOM, updateDevice } from "@/editor/scene";
import { getScene, useEditorStore, useScene } from "@/editor/store";
import type { CanvasConfig, DeviceInstance } from "@/editor/types";
import { useUIStore } from "@/editor/ui-store";
import { usePlaybackStore, useVideoMode } from "@/editor/video";

/** Snap distance to the canvas centre lines, in screen pixels. */
const SNAP_DISTANCE = 6;
const ACCENT = "#6b8cff";

type Guides = { vertical: boolean; horizontal: boolean };

/**
 * Interactive Konva stage. It renders the scene at the current view scale;
 * exports use a separate offscreen stage (see export-image.ts), so editor
 * affordances such as the transformer and guides never leak into images.
 */
export default function CanvasStage({ viewScale }: { viewScale: number }) {
  const canvas = useScene((s) => s.canvas);
  const background = useScene((s) => s.background);
  const devices = useScene((s) => s.devices);
  const selectedId = useUIStore((s) => s.selectedDeviceId);
  const croppingId = useUIStore((s) => s.croppingDeviceId);
  const select = useUIStore((s) => s.select);
  const transformerRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [guides, setGuides] = useState<Guides>({ vertical: false, horizontal: false });
  const devicesLayerRef = useRef<Konva.Layer>(null);
  const videoMode = useVideoMode();
  const playing = usePlaybackStore((s) => s.playing);

  // Video preview: redraw the devices every frame while it plays.
  useEffect(() => {
    if (!videoMode || !playing) return;
    let frame = requestAnimationFrame(function tick() {
      devicesLayerRef.current?.batchDraw();
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [videoMode, playing]);

  // Attach the transformer to the selected device.
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;
    // No transform handles while the screenshot (not the device) is edited.
    const node = selectedId && selectedId !== croppingId ? stage.findOne<Konva.Group>(`#${selectedId}`) : undefined;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, croppingId, devices]);

  const width = Math.max(1, Math.round(canvas.width * viewScale));
  const height = Math.max(1, Math.round(canvas.height * viewScale));

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      scaleX={width / canvas.width}
      scaleY={height / canvas.height}
      onPointerDown={(event) => {
        if (event.target === event.target.getStage()) select(null);
      }}
    >
      <Layer listening={false}>
        <BackgroundNode background={background} canvas={canvas} />
      </Layer>
      <Layer ref={devicesLayerRef}>
        {devices.map((instance) => (
          <InteractiveDevice
            key={instance.id}
            instance={instance}
            canvas={canvas}
            viewScale={viewScale}
            cropping={croppingId === instance.id}
            onSelect={() => select(instance.id)}
            onGuides={(next) =>
              setGuides((prev) =>
                prev.vertical === next.vertical && prev.horizontal === next.horizontal ? prev : next,
              )
            }
          />
        ))}
        <Transformer
          ref={transformerRef}
          keepRatio
          flipEnabled={false}
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          rotationSnaps={[0, 90, 180, 270]}
          rotationSnapTolerance={4}
          rotateAnchorOffset={22}
          anchorSize={9}
          anchorCornerRadius={2}
          anchorStroke={ACCENT}
          anchorFill="#ffffff"
          borderStroke={ACCENT}
          borderStrokeWidth={1.25}
          ignoreStroke
          boundBoxFunc={(oldBox, newBox) =>
            Math.abs(newBox.width) < 24 || Math.abs(newBox.height) < 24 ? oldBox : newBox
          }
        />
        {guides.vertical ? (
          <Line
            points={[canvas.width / 2, 0, canvas.width / 2, canvas.height]}
            stroke={ACCENT}
            strokeWidth={1 / viewScale}
            dash={[4 / viewScale, 4 / viewScale]}
            listening={false}
          />
        ) : null}
        {guides.horizontal ? (
          <Line
            points={[0, canvas.height / 2, canvas.width, canvas.height / 2]}
            stroke={ACCENT}
            strokeWidth={1 / viewScale}
            dash={[4 / viewScale, 4 / viewScale]}
            listening={false}
          />
        ) : null}
      </Layer>
    </Stage>
  );
}

type DeviceProps = {
  instance: DeviceInstance;
  canvas: CanvasConfig;
  viewScale: number;
  cropping: boolean;
  onSelect: () => void;
  onGuides: (guides: Guides) => void;
};

function InteractiveDevice({ instance, canvas, viewScale, cropping, onSelect, onGuides }: DeviceProps) {
  const { geometry, transform } = useDeviceLayout(instance, canvas);
  const update = useEditorStore((s) => s.update);
  const commit = useEditorStore((s) => s.commit);
  const setCropping = useUIStore((s) => s.setCropping);
  const zoomCommit = useRef<number | undefined>(undefined);

  const commitNode = (node: Konva.Node) => {
    const next = relativeTransform(
      { x: node.x(), y: node.y(), scale: node.scaleX(), rotation: node.rotation() },
      geometry,
      canvas,
    );
    update((scene) => updateDevice(scene, instance.id, next));
  };

  /** Converts a canvas-space movement into the device's local (frame) units. */
  const toLocal = (dx: number, dy: number) => {
    const radians = (-transform.rotation * Math.PI) / 180;
    const [sin, cos] = [Math.sin(radians), Math.cos(radians)];
    return { x: (dx * cos - dy * sin) / transform.scale, y: (dx * sin + dy * cos) / transform.scale };
  };

  // Crop mode: dragging pans the screenshot (one undo step per drag).
  const startPan = (event: Konva.KonvaEventObject<PointerEvent>) => {
    const asset = getAsset(instance.screenshotId);
    const stage = event.target.getStage();
    if (!asset || !stage) return;
    event.cancelBubble = true;
    // A pending wheel zoom becomes its own undo step now, so its delayed
    // commit can't split this drag in two.
    if (zoomCommit.current !== undefined) {
      window.clearTimeout(zoomCommit.current);
      zoomCommit.current = undefined;
      commit();
    }
    const area = screenArea({ device: getDevice(instance.deviceId), geometry });
    const scale = stage.scaleX();
    const start = { x: event.evt.clientX, y: event.evt.clientY };
    const startCrop = instance.crop;
    const move = (e: PointerEvent) => {
      const local = toLocal((e.clientX - start.x) / scale, (e.clientY - start.y) / scale);
      update((scene) => updateDevice(scene, instance.id, { crop: panCrop(startCrop, asset, area, local.x, local.y) }), {
        transient: true,
      });
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      commit();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  // Crop mode: the wheel zooms the screenshot; a burst of wheel events is one undo step.
  const zoom = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const current = getScene().devices.find((d) => d.id === instance.id);
    if (!current) return;
    const factor = Math.exp(-event.evt.deltaY * 0.0015);
    const next = clamp(current.crop.zoom * factor, 1, MAX_CROP_ZOOM);
    update((scene) => updateDevice(scene, instance.id, { crop: { ...current.crop, zoom: next } }), { transient: true });
    window.clearTimeout(zoomCommit.current);
    zoomCommit.current = window.setTimeout(() => {
      zoomCommit.current = undefined;
      commit();
    }, 300);
  };

  return (
    <DeviceNode
      instance={instance}
      geometry={geometry}
      transform={transform}
      draggable={!cropping}
      cropping={cropping}
      onPointerDown={(event) => {
        onSelect();
        if (cropping) startPan(event);
      }}
      onDblClick={() => {
        if (instance.screenshotId) setCropping(cropping ? null : instance.id);
      }}
      onWheel={cropping ? zoom : undefined}
      onMouseEnter={(event) => setCursor(event.target, cropping ? "grab" : "move")}
      onMouseLeave={(event) => setCursor(event.target, "")}
      onDragMove={(event) => {
        const node = event.target;
        const threshold = SNAP_DISTANCE / viewScale;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const vertical = Math.abs(node.x() - cx) < threshold;
        const horizontal = Math.abs(node.y() - cy) < threshold;
        if (vertical) node.x(cx);
        if (horizontal) node.y(cy);
        onGuides({ vertical, horizontal });
      }}
      onDragEnd={(event) => {
        onGuides({ vertical: false, horizontal: false });
        commitNode(event.target);
      }}
      onTransformEnd={(event) => commitNode(event.target)}
    />
  );
}

function setCursor(node: Konva.Node, cursor: string) {
  const container = node.getStage()?.container();
  if (container) container.style.cursor = cursor;
}
