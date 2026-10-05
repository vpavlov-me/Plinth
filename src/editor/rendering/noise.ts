let texture: HTMLCanvasElement | null = null;

/** Tileable grey noise used for the film-grain overlay (created once). */
export function getNoiseTexture(): HTMLCanvasElement | undefined {
  if (typeof document === "undefined") return undefined;
  if (texture) return texture;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  const image = ctx.createImageData(size, size);
  // Deterministic PRNG so the grain is identical on screen and in exports.
  let seed = 1337;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.round(64 + random() * 128);
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  texture = canvas;
  return texture;
}
