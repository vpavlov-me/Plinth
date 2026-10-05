import type Konva from "konva";
import { Shape } from "react-konva";
import { traceRoundedRect } from "@/editor/geometry";
import { shadowLayers } from "@/editor/presets/shadow-presets";
import type { RoundedRect, ShadowConfig } from "@/editor/types";

type Props = {
  body: RoundedRect[];
  shadow: ShadowConfig;
  /** Frame-to-canvas scale of the device (shadow values are canvas pixels). */
  deviceScale: number;
  /**
   * Optional alpha mask drawn over `body[0]` instead of the solid
   * silhouette, so transparent screenshots cast accurate shadows.
   */
  mask?: CanvasImageSource | null;
};

/**
 * Draws only the shadow of the device silhouette — never the silhouette
 * itself — so transparent screenshots and frames don't reveal a solid shape.
 *
 * Technique: the silhouette is drawn far outside the canvas and the native
 * shadow offset brings the shadow back into place. Offsets and blur are
 * computed in device pixels from the live transform, so the result is
 * identical on screen, on retina displays and in high-resolution exports.
 * Shadow offsets are applied in screen space, so light always comes from
 * above, even for rotated devices.
 */
export function ShadowNode({ body, shadow, deviceScale, mask }: Props) {
  const layers = shadowLayers(shadow);

  const sceneFunc = (context: Konva.Context) => {
    const ctx = context._context;
    const matrix = ctx.getTransform();
    // Device pixels per frame unit, then per canvas pixel.
    const pixelsPerUnit = Math.sqrt(Math.abs(matrix.a * matrix.d - matrix.b * matrix.c));
    const pixelsPerCanvasPx = pixelsPerUnit / deviceScale;

    let maxX = -Infinity;
    for (const rect of body) {
      for (const [px, py] of [
        [rect.x, rect.y],
        [rect.x + rect.width, rect.y],
        [rect.x, rect.y + rect.height],
        [rect.x + rect.width, rect.y + rect.height],
      ] as const) {
        maxX = Math.max(maxX, matrix.a * px + matrix.c * py + matrix.e);
      }
    }

    for (const layer of layers) {
      const blur = layer.blur * pixelsPerCanvasPx;
      const shift = maxX + blur * 3 + 64;
      ctx.save();
      ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e - shift, matrix.f);
      ctx.shadowColor = `rgba(0, 0, 0, ${layer.opacity})`;
      ctx.shadowBlur = blur;
      ctx.shadowOffsetX = shift + layer.offsetX * pixelsPerCanvasPx;
      ctx.shadowOffsetY = layer.offsetY * pixelsPerCanvasPx;
      const maskRect = body[0];
      if (mask && maskRect) {
        ctx.drawImage(mask, maskRect.x, maskRect.y, maskRect.width, maskRect.height);
      } else {
        ctx.fillStyle = "#000";
        ctx.beginPath();
        for (const rect of body) traceRoundedRect(ctx, rect);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  if (layers.length === 0 || body.length === 0) return null;
  return <Shape sceneFunc={sceneFunc} listening={false} perfectDrawEnabled={false} />;
}
