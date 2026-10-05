import type Konva from "konva";
import { Group, Rect } from "react-konva";
import { useAsset, useImage } from "@/editor/assets";
import { coverTopRect, traceRoundedRect } from "@/editor/geometry";
import { ImageShape } from "@/editor/rendering/image-shape";
import type { RoundedRect } from "@/editor/types";

type Props = {
  screen: RoundedRect;
  screenshotId: string | null;
  fill: string;
  /** Extra clip area hidden under the frame, avoids anti-aliasing seams. */
  bleed: number;
};

/** The screen: background fill plus the screenshot, clipped to the screen shape. */
export function ScreenshotNode({ screen, screenshotId, fill, bleed }: Props) {
  const asset = useAsset(screenshotId);
  const image = useImage(asset?.url);
  const area: RoundedRect = {
    x: screen.x - bleed,
    y: screen.y - bleed,
    width: screen.width + bleed * 2,
    height: screen.height + bleed * 2,
    radius:
      typeof screen.radius === "number"
        ? screen.radius + bleed
        : (screen.radius.map((r) => (r ? r + bleed : 0)) as RoundedRect["radius"]),
  };

  const clipFunc = (ctx: Konva.Context) => {
    ctx.beginPath();
    traceRoundedRect(ctx, area);
  };

  return (
    <Group clipFunc={clipFunc} listening={false}>
      <Rect
        x={area.x}
        y={area.y}
        width={area.width}
        height={area.height}
        // A transparent screen still needs a visible placeholder while empty.
        fill={!asset && fill === "transparent" ? "#ffffff" : fill}
        listening={false}
      />
      {asset && image ? (
        <ImageShape
          image={image}
          src={{ x: 0, y: 0, width: asset.width, height: asset.height }}
          dest={coverTopRect(asset, area)}
        />
      ) : null}
    </Group>
  );
}
