import { getPerspectivePreset, projectRect, type Projection } from "@/editor/presets/perspective-presets";
import { drawDeviceArtwork, type DeviceArtwork } from "@/editor/rendering/device-artwork";
import type { PerspectiveId, Rect } from "@/editor/types";

/**
 * Perspective presets for the 2D (Konva) renderer.
 *
 * Canvas 2D can't draw projective transforms, so a device with a perspective
 * preset is painted flat into an offscreen canvas (with the shared
 * `drawDeviceArtwork`) and then projected by WebGL as one textured quad with
 * perspective-correct interpolation and mipmapped sampling. The result is a
 * plain 2D canvas that Konva draws like any image, so the same code serves the
 * editor, high-resolution exports, shadows and every device type.
 *
 * Rendering happens at the device's real output resolution (read from the
 * context transform), so exports at 3× are rendered at 3×, never upscaled.
 */

export type PerspectiveImage = {
  canvas: HTMLCanvasElement;
  /** Where to draw the canvas, in the device's frame units. */
  rect: Rect;
};

/** Transparent margin around the flat artwork so projected edges are anti-aliased by the texture filter. */
const PAD_PX = 4;
/** Longest side and pixel budget of the offscreen canvases. */
const MAX_SIDE = 8192;
const MAX_PIXELS = 48_000_000;
const CACHE_SIZE = 10;

const cache = new Map<string, PerspectiveImage>();

/**
 * Projected device for the given output density (device pixels per frame
 * unit), or null when WebGL is unavailable (callers then draw it flat).
 */
export function getPerspectiveImage(
  artwork: DeviceArtwork,
  perspective: PerspectiveId,
  pixelsPerUnit: number,
): PerspectiveImage | null {
  // Round up to a quarter octave: smooth zooming reuses renders, exports never upscale.
  const density = Math.pow(2, Math.ceil(Math.log2(Math.max(pixelsPerUnit, 1e-3)) * 4) / 4);
  const key = cacheKey(artwork, perspective, density);
  const cached = cache.get(key);
  if (cached) {
    // Refresh LRU position.
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }
  const image = render(artwork, perspective, density);
  if (!image) return null;
  cache.set(key, image);
  while (cache.size > CACHE_SIZE) {
    const oldest = cache.keys().next().value as string;
    const evicted = cache.get(oldest);
    cache.delete(oldest);
    if (evicted) release(evicted.canvas);
  }
  return image;
}

/** Releases every cached render (after an export, whose renders can be very large). */
export function clearPerspectiveCache(): void {
  for (const image of cache.values()) release(image.canvas);
  cache.clear();
}

function cacheKey(artwork: DeviceArtwork, perspective: PerspectiveId, density: number): string {
  const { geometry, crop } = artwork;
  return JSON.stringify([
    perspective,
    density,
    artwork.device.id,
    artwork.device.screenFill,
    artwork.frame?.src ?? null,
    artwork.screenshot?.src ?? null,
    crop.zoom,
    crop.x,
    crop.y,
    geometry.width,
    geometry.height,
    geometry.screen,
  ]);
}

function release(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

/** Projection of the artwork plus its transparent margin, in frame units. */
function paddedProjection(width: number, height: number, pad: number, perspective: PerspectiveId): Projection {
  const projection = projectRect(width + pad * 2, height + pad * 2, getPerspectivePreset(perspective));
  const shift = (p: { x: number; y: number; w: number }) => ({ ...p, x: p.x - pad, y: p.y - pad });
  return {
    corners: projection.corners.map(shift) as Projection["corners"],
    bounds: { ...projection.bounds, x: projection.bounds.x - pad, y: projection.bounds.y - pad },
  };
}

function render(artwork: DeviceArtwork, perspective: PerspectiveId, density: number): PerspectiveImage | null {
  const gl = getGl();
  if (!gl) return null;
  const { width, height } = artwork.geometry;

  // Near corners are magnified by the projection; render the flat source a
  // little sharper so they stay crisp.
  const probe = paddedProjection(width, height, 0, perspective);
  const magnification = Math.min(1.5, Math.max(1, ...probe.corners.map((c) => 1 / c.w)));
  const maxTexture = Math.min(MAX_SIDE, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number);

  let sourceDensity = density * magnification;
  const limit = Math.min((maxTexture - PAD_PX * 2) / Math.max(width, height), Math.sqrt(MAX_PIXELS / (width * height)));
  sourceDensity = Math.min(sourceDensity, limit);
  let outputDensity = Math.min(density, limit);

  const pad = PAD_PX / sourceDensity;
  const projection = paddedProjection(width, height, pad, perspective);
  const { bounds } = projection;
  outputDensity = Math.min(outputDensity, (maxTexture - 2) / Math.max(bounds.width, bounds.height));

  // 1. Flat artwork with a transparent margin.
  const source = document.createElement("canvas");
  source.width = Math.max(1, Math.ceil((width + pad * 2) * sourceDensity));
  source.height = Math.max(1, Math.ceil((height + pad * 2) * sourceDensity));
  const sctx = source.getContext("2d");
  if (!sctx) return null;
  sctx.setTransform(source.width / (width + pad * 2), 0, 0, source.height / (height + pad * 2), 0, 0);
  sctx.translate(pad, pad);
  drawDeviceArtwork(sctx, artwork);

  // 2. Projected quad.
  const outW = Math.max(1, Math.ceil(bounds.width * outputDensity));
  const outH = Math.max(1, Math.ceil(bounds.height * outputDensity));
  const output = document.createElement("canvas");
  output.width = outW;
  output.height = outH;
  const octx = output.getContext("2d");
  if (!octx || !drawQuad(gl, source, projection, outW, outH)) {
    release(source);
    release(output);
    return null;
  }
  octx.drawImage(gl.canvas as HTMLCanvasElement, 0, 0);
  release(source);

  return { canvas: output, rect: { ...bounds } };
}

/* -------------------------------------------------------------------------- */
/* WebGL                                                                      */
/* -------------------------------------------------------------------------- */

type GlState = {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  texture: WebGLTexture;
  anisotropy: { ext: EXT_texture_filter_anisotropic; max: number } | null;
};

let state: GlState | null | undefined;

const VERTEX = `#version 300 es
in vec4 a_position;
in vec2 a_uv;
out vec2 v_uv;
void main() {
  gl_Position = a_position;
  v_uv = a_uv;
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_texture;
out vec4 color;
void main() {
  color = texture(u_texture, v_uv);
}`;

function getGl(): WebGL2RenderingContext | null {
  if (state !== undefined) return state?.gl ?? null;
  state = null;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  if (!gl) return null;
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  if (!program || !buffer || !texture) return null;
  for (const [type, code] of [
    [gl.VERTEX_SHADER, VERTEX],
    [gl.FRAGMENT_SHADER, FRAGMENT],
  ] as const) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    gl.attachShader(program, shader);
  }
  gl.bindAttribLocation(program, 0, "a_position");
  gl.bindAttribLocation(program, 1, "a_uv");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  const ext = gl.getExtension("EXT_texture_filter_anisotropic");
  state = {
    gl,
    program,
    buffer,
    texture,
    anisotropy: ext ? { ext, max: gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number } : null,
  };
  return gl;
}

function drawQuad(
  gl: WebGL2RenderingContext,
  source: HTMLCanvasElement,
  projection: Projection,
  width: number,
  height: number,
): boolean {
  if (!state) return false;
  const { program, buffer, texture, anisotropy } = state;
  const canvas = gl.canvas as HTMLCanvasElement;
  canvas.width = width;
  canvas.height = height;
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (anisotropy) {
    gl.texParameterf(gl.TEXTURE_2D, anisotropy.ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, anisotropy.max));
  }
  gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);

  // Clip-space positions scaled by the homogeneous depth: the GPU divides
  // them back and interpolates the texture perspective-correctly.
  const { corners, bounds } = projection;
  const uv = [0, 0, 1, 0, 1, 1, 0, 1];
  const data = new Float32Array(
    corners.flatMap((c, i) => {
      const x = ((c.x - bounds.x) / bounds.width) * 2 - 1;
      const y = 1 - ((c.y - bounds.y) / bounds.height) * 2;
      return [x * c.w, y * c.w, 0, c.w, uv[i * 2]!, uv[i * 2 + 1]!];
    }),
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 24, 16);
  gl.disable(gl.BLEND);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  return gl.getError() === gl.NO_ERROR;
}
