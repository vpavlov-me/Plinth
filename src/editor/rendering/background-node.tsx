import { Group, Image as KonvaImage, Rect, Shape } from "react-konva";
import { useImage } from "@/editor/assets";
import { useBackgroundImageUrl } from "@/editor/background-image";
import { fitRect } from "@/editor/geometry";
import { getNoiseTexture } from "@/editor/rendering/noise";
import type { BackgroundConfig, BackgroundImageSource, CanvasConfig, GradientConfig, MeshBlob } from "@/editor/types";

type Props = { background: BackgroundConfig; canvas: CanvasConfig };

export function BackgroundNode({ background, canvas }: Props) {
  const { width, height } = canvas;
  switch (background.type) {
    case "solid":
      return <Rect width={width} height={height} fill={background.color} listening={false} />;
    case "gradient":
      return <GradientNode gradient={background} width={width} height={height} />;
    case "image":
      return <BackgroundImage source={background.source} width={width} height={height} />;
    case "transparent":
      return null;
  }
}

/** Linear base, optional soft colour lights ("mesh") and optional film grain. */
function GradientNode({ gradient, width, height }: { gradient: GradientConfig; width: number; height: number }) {
  const grain = gradient.grain ?? 0;
  return (
    <Group listening={false}>
      <Rect width={width} height={height} listening={false} {...linearGradientProps(gradient, width, height)} />
      {gradient.blobs?.map((blob, index) => (
        <Shape
          key={index}
          listening={false}
          perfectDrawEnabled={false}
          sceneFunc={(context) => paintBlob(context._context, blob, width, height)}
        />
      ))}
      {grain > 0 ? (
        <Rect
          width={width}
          height={height}
          listening={false}
          // Konva types the pattern as an <img>, but any CanvasImageSource works (createPattern).
          fillPatternImage={getNoiseTexture() as unknown as HTMLImageElement}
          fillPatternRepeat="repeat"
          opacity={grain}
          globalCompositeOperation="overlay"
        />
      ) : null}
    </Group>
  );
}

/**
 * A soft colour light: a radial gradient that fades to the same colour at zero
 * alpha (no grey fringe), optionally stretched into an ellipse and turned.
 */
export function paintBlob(ctx: CanvasRenderingContext2D, blob: MeshBlob, width: number, height: number): void {
  const radius = blob.r * Math.max(width, height);
  const stretch = Math.max(0.2, Math.min(5, blob.stretch ?? 1));
  const solid = blob.color.slice(0, 7);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  ctx.translate(blob.x * width, blob.y * height);
  ctx.rotate(((blob.angle ?? 0) * Math.PI) / 180);
  ctx.scale(stretch, 1);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  const core = Math.max(0, Math.min(0.9, blob.core ?? 0));
  gradient.addColorStop(0, blob.color);
  if (core > 0) gradient.addColorStop(core, blob.color);
  gradient.addColorStop(core + (1 - core) * 0.55, `${solid}88`);
  gradient.addColorStop(1, `${solid}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

function BackgroundImage({ source, width, height }: { source: BackgroundImageSource; width: number; height: number }) {
  const image = useImage(useBackgroundImageUrl(source));
  if (!image) return null;
  const size = { width: image.naturalWidth, height: image.naturalHeight };
  const rect = fitRect(size, { width, height }, "cover");
  return <KonvaImage image={image} listening={false} {...coverCrop(size, rect, width, height)} />;
}

/** For "cover", draw only the visible part of the image. */
function coverCrop(
  image: { width: number; height: number },
  rect: { x: number; y: number; width: number; height: number },
  width: number,
  height: number,
) {
  const scale = rect.width / image.width;
  return {
    x: 0,
    y: 0,
    width,
    height,
    crop: { x: -rect.x / scale, y: -rect.y / scale, width: width / scale, height: height / scale },
  };
}

/**
 * Konva linear-gradient props reproducing CSS `linear-gradient(<angle>deg, …)`
 * semantics: 0° points up, 90° points right, and the gradient line is long
 * enough for the corners to receive the first and last colours.
 */
export function linearGradientProps(gradient: GradientConfig, width: number, height: number) {
  const radians = (gradient.angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  const cx = width / 2;
  const cy = height / 2;
  const colors =
    gradient.colors.length > 1 ? gradient.colors : [gradient.colors[0] ?? "#ffffff", gradient.colors[0] ?? "#ffffff"];
  return {
    fillLinearGradientStartPoint: { x: cx - dx * half, y: cy - dy * half },
    fillLinearGradientEndPoint: { x: cx + dx * half, y: cy + dy * half },
    fillLinearGradientColorStops: colors.flatMap((color, i) => [i / (colors.length - 1), color]),
  };
}
