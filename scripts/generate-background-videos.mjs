#!/usr/bin/env node
/**
 * Generates the built-in video backgrounds (`public/backgrounds/videos`):
 * soft colour lights drifting over a base colour, as seamless loops. Every
 * frame is painted on a canvas in headless Chromium and encoded with ffmpeg
 * twice — VP9 WebM (small; preferred where it plays) and H.264 MP4 (plays
 * everywhere) — plus a JPEG poster for the tiles.
 *
 * The artwork is original; paths are periodic so the last frame meets the first.
 *
 * Usage: node scripts/generate-background-videos.mjs   (needs ffmpeg on PATH)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "backgrounds", "videos");
const SIZE = 1440;
const FPS = 30;
const SECONDS = 8;

/** Each light moves on a closed path: x/y = centre + amp·sin(2π·freq·t + phase). */
const VIDEOS = [
  {
    id: "aurora",
    base: "#050816",
    lights: [
      { color: "#2dd4bf", r: 0.55, x: [0.3, 0.18, 1, 0], y: [0.35, 0.12, 2, 1.2], stretch: 1.6 },
      { color: "#6366f1", r: 0.6, x: [0.7, 0.16, 1, 2.1], y: [0.55, 0.15, 1, 0.4], stretch: 1.3 },
      { color: "#a855f7", r: 0.45, x: [0.45, 0.2, 2, 4.2], y: [0.8, 0.1, 1, 2.8], stretch: 1.8 },
      { color: "#0ea5e9", r: 0.4, x: [0.2, 0.12, 1, 3.3], y: [0.75, 0.14, 2, 0.6], stretch: 1.2 },
    ],
  },
  {
    id: "sunset-flow",
    base: "#ff5f6d",
    lights: [
      { color: "#ffc371", r: 0.6, x: [0.25, 0.16, 1, 0.3], y: [0.3, 0.14, 1, 1.7], stretch: 1.4 },
      { color: "#ff3cac", r: 0.55, x: [0.75, 0.15, 1, 2.4], y: [0.4, 0.16, 2, 0.2], stretch: 1.5 },
      { color: "#784ba0", r: 0.5, x: [0.55, 0.2, 2, 4.0], y: [0.85, 0.1, 1, 3.1], stretch: 1.7 },
      { color: "#ffe29f", r: 0.35, x: [0.4, 0.14, 1, 5.1], y: [0.6, 0.18, 1, 2.2], stretch: 1.1 },
    ],
  },
];

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
  ctx.fillStyle = video.base;
  ctx.fillRect(0, 0, size, size);
  const wave = ([centre, amp, freq, phase]) => centre + amp * Math.sin(2 * Math.PI * freq * t + phase);
  for (const light of video.lights) {
    const radius = light.r * size;
    ctx.save();
    ctx.translate(wave(light.x) * size, wave(light.y) * size);
    ctx.rotate(Math.sin(2 * Math.PI * t + light.x[3]) * 0.6);
    ctx.scale(light.stretch, 1);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, light.color);
    gradient.addColorStop(0.55, `${light.color}88`);
    gradient.addColorStop(1, `${light.color}00`);
    ctx.fillStyle = gradient;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.restore();
  }
  return canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("close", (code) => (code ? reject(new Error(`${command} ${code}`)) : resolve()));
  });
}

await main();
