#!/usr/bin/env node
/**
 * Generates the built-in video backgrounds (`public/backgrounds/videos`): the
 * signature gradients (`GRADIENT_PRESETS`) brought to life as seamless loops —
 * the base gradient sways and every colour light drifts, turns and breathes.
 * Every frame is painted on a canvas in headless Chromium (the same painting as
 * the editor's gradient background) and encoded with ffmpeg twice — VP9 WebM
 * (small; preferred where it plays) and H.264 MP4 (plays everywhere) — plus a
 * JPEG poster for the tiles. Grain is left out: it would flicker and bloat the files.
 *
 * Motion is periodic over the loop, so the last frame meets the first.
 *
 * Usage: node scripts/generate-background-videos.mjs   (needs ffmpeg on PATH)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { GRADIENT_PRESETS } from "../src/editor/presets/background-presets.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "backgrounds", "videos");
const SIZE = 1440;
const FPS = 30;
const SECONDS = 8;

const VIDEOS = GRADIENT_PRESETS.map((preset) => ({ id: preset.id, gradient: preset.gradient }));

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
  const page = await browser.newPage();
  await page.setContent("<html><body style='margin:0'></body></html>");
  for (const video of VIDEOS) {
    const file = join(OUT, `${video.id}.mp4`);
    const ffmpeg = spawn(
      "ffmpeg",
      [
        "-y",
        "-loglevel",
        "error",
        "-f",
        "image2pipe",
        "-framerate",
        String(FPS),
        "-i",
        "-",
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "24",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-an",
        file,
      ],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    const frames = FPS * SECONDS;
    for (let i = 0; i < frames; i++) {
      const base64 = await page.evaluate(paintFrame, { video, size: SIZE, t: i / frames });
      if (!ffmpeg.stdin.write(Buffer.from(base64, "base64"))) await new Promise((r) => ffmpeg.stdin.once("drain", r));
    }
    ffmpeg.stdin.end();
    await new Promise((resolve, reject) =>
      ffmpeg.on("close", (code) => (code ? reject(new Error(`ffmpeg ${code}`)) : resolve())),
    );
    await run("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      file,
      "-c:v",
      "libvpx-vp9",
      "-b:v",
      "0",
      "-crf",
      "30",
      "-row-mt",
      "1",
      "-deadline",
      "good",
      "-cpu-used",
      "2",
      "-pix_fmt",
      "yuv420p",
      "-an",
      join(OUT, `${video.id}.webm`),
    ]);
    await run("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      file,
      "-frames:v",
      "1",
      "-vf",
      "scale=480:480",
      "-q:v",
      "4",
      join(OUT, `${video.id}-thumb.jpg`),
    ]);
    console.log(`${video.id}.mp4`);
  }
  await browser.close();
}

/** Runs in the page: one frame at loop position t (0–1), as a base64 JPEG. */
function paintFrame({ video, size, t }) {
  const canvas = (globalThis.__canvas ??= Object.assign(document.createElement("canvas"), {
    width: size,
    height: size,
  }));
  const ctx = canvas.getContext("2d");
  const { gradient } = video;
  const turn = 2 * Math.PI * t;

  // Base: the preset's linear gradient, its angle swaying ±18°.
  const radians = ((gradient.angle + 18 * Math.sin(turn)) * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const half = (Math.abs(size * dx) + Math.abs(size * dy)) / 2;
  const c = size / 2;
  const colors = gradient.colors.length > 1 ? gradient.colors : [gradient.colors[0], gradient.colors[0]];
  const base = ctx.createLinearGradient(c - dx * half, c - dy * half, c + dx * half, c + dy * half);
  colors.forEach((color, i) => base.addColorStop(i / (colors.length - 1), color));
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Lights: each drifts on its own closed path (phase from its index), turns and breathes.
  (gradient.blobs ?? []).forEach((blob, i) => {
    const phase = i * 2.1 + 0.7;
    const x = blob.x + 0.09 * Math.sin(turn + phase);
    const y = blob.y + 0.07 * Math.sin(2 * turn + phase * 1.3);
    const radius = blob.r * (1 + 0.1 * Math.sin(turn + phase * 0.6)) * size;
    const angle = (blob.angle ?? 0) + 22 * Math.sin(turn + phase * 1.7);
    const stretch = Math.max(0.2, Math.min(5, blob.stretch ?? 1));
    const core = Math.max(0, Math.min(0.9, blob.core ?? 0));
    const solid = blob.color.slice(0, 7);
    ctx.save();
    ctx.translate(x * size, y * size);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.scale(stretch, 1);
    const light = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    light.addColorStop(0, blob.color);
    if (core > 0) light.addColorStop(core, blob.color);
    light.addColorStop(core + (1 - core) * 0.55, `${solid}88`);
    light.addColorStop(1, `${solid}00`);
    ctx.fillStyle = light;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.restore();
  });
  return canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("close", (code) => (code ? reject(new Error(`${command} ${code}`)) : resolve()));
  });
}

await main();
