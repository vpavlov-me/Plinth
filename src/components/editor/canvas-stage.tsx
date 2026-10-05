"use client";

import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { Layer, Line, Stage, Transformer } from "react-konva";
import { relativeTransform } from "@/editor/geometry";
import { BackgroundNode } from "@/editor/rendering/background-node";
import { DeviceNode } from "@/editor/rendering/device-node";
import { useDeviceLayout } from "@/editor/rendering/use-device-layout";
import { updateDevice } from "@/editor/scene";
import { useEditorStore, useScene } from "@/editor/store";
import type { CanvasConfig, DeviceInstance } from "@/editor/types";
import { useUIStore } from "@/editor/ui-store";

/** Snap distance to the canvas centre lines, in screen pixels. */
const SNAP_DISTANCE = 6;
const ACCENT = "#3462f5";

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
  const select = useUIStore((s) => s.select);
  const transformerRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [guides, setGuides] = useState<Guides>({ vertical: false, horizontal: false });

  // Attach the transformer to the selected device.
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;
    const node = selectedId ? stage.findOne<Konva.Group>(`#${selectedId}`) : undefined;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, devices]);

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
      <Layer>
        {devices.map((instance) => (
          <InteractiveDevice
            key={instance.id}
            instance={instance}
            canvas={canvas}
            viewScale={viewScale}
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
  onSelect: () => void;
  onGuides: (guides: Guides) => void;
};

function InteractiveDevice({ instance, canvas, viewScale, onSelect, onGuides }: DeviceProps) {
  const { geometry, transform } = useDeviceLayout(instance, canvas);
  const update = useEditorStore((s) => s.update);

  const commitNode = (node: Konva.Node) => {
    const next = relativeTransform(
      { x: node.x(), y: node.y(), scale: node.scaleX(), rotation: node.rotation() },
      geometry,
      canvas,
    );
    update((scene) => updateDevice(scene, instance.id, next));
  };

  return (
    <DeviceNode
      instance={instance}
      geometry={geometry}
      transform={transform}
      draggable
      onPointerDown={onSelect}
      onMouseEnter={(event) => setCursor(event.target, "move")}
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
