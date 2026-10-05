import type Konva from "konva";
import { Shape } from "react-konva";
import type { Rect } from "@/editor/types";

type Props = {
  image: CanvasImageSource;
  /** Source rectangle in image pixels. */
  src: Rect;
  /** Destination rectangle in local units. */
  dest: Rect;
};

/**
 * Draws (part of) an image with high-quality resampling. Konva's built-in
 * Image node uses the browser default ("low") smoothing quality, which makes
 * downscaled screenshots look aliased — especially text.
 */
export function ImageShape({ image, src, dest }: Props) {
  const sceneFunc = (context: Konva.Context) => {
    const ctx = context._context;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, src.x, src.y, src.width, src.height, dest.x, dest.y, dest.width, dest.height);
  };
  return <Shape sceneFunc={sceneFunc} x={0} y={0} listening={false} perfectDrawEnabled={false} />;
}
