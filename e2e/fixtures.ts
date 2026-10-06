import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Browser, Page } from "@playwright/test";

export const FIXTURE_DIR = join(process.cwd(), "test-results", "fixtures");

const SITE = `<div style="height:64px;display:flex;align-items:center;gap:24px;padding:0 40px;border-bottom:1px solid #eee"><b>Acme</b><span>Product</span><span>Pricing</span></div>
<div style="padding:80px 40px;background:linear-gradient(135deg,#eef4ff,#fff)"><h1 style="font-size:56px;margin:0">Ship faster</h1></div>`;
const APP = `<div style="height:100vh;background:#0f172a;color:#fff;padding:140px 48px;font-size:48px">Good morning</div>`;

/** Renders test screenshots with the browser itself, so no binaries are committed. */
export async function createFixtures(browser: Browser): Promise<void> {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  const page = await browser.newPage();
  const shot = async (name: string, width: number, height: number, html: string, omitBackground = false) => {
    await page.setViewportSize({ width, height });
    await page.setContent(`<html><body style="margin:0;font-family:sans-serif">${html}</body></html>`);
    // After a viewport change the next frame may not be painted yet; a blank
    // capture would make the frame fixture fully transparent.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({
      path: join(FIXTURE_DIR, name),
      omitBackground,
      type: name.endsWith(".jpg") ? "jpeg" : "png",
    });
  };
  await shot("landscape.png", 1440, 900, SITE);
  await shot("portrait.png", 1179, 2556, APP);
  await shot("small.png", 120, 80, `<div style="background:#f60;height:100vh"></div>`);
  await shot(
    "transparent.png",
    800,
    600,
    `<div style="margin:100px;height:400px;border-radius:40px;background:rgba(40,120,255,.85)"></div>`,
    true,
  );
  await shot("large.jpg", 6000, 9000, `<div style="height:100vh;background:linear-gradient(#ffd,#adf)"></div>`);
  // A 600×1000 device frame whose screen (60,60 → 540,940, radius 40) is transparent.
  await shot(
    "frame.png",
    600,
    1000,
    `<svg width="600" height="1000" style="display:block"><path fill-rule="evenodd" fill="#222" d="M80,0 H520 A80,80 0 0 1 600,80 V920 A80,80 0 0 1 520,1000 H80 A80,80 0 0 1 0,920 V80 A80,80 0 0 1 80,0 Z M100,60 H500 A40,40 0 0 1 540,100 V900 A40,40 0 0 1 500,940 H100 A40,40 0 0 1 60,900 V100 A40,40 0 0 1 100,60 Z"/></svg>`,
    true,
  );
  writeFileSync(join(FIXTURE_DIR, "invalid.png"), "definitely not an image");
  await recordVideo(page, "clip.webm", 360, 720, 1500);
  await page.close();
}

/** Records a short animated WebM (a moving bar over changing colours) with MediaRecorder. */
async function recordVideo(page: Page, name: string, width: number, height: number, ms: number): Promise<void> {
  await page.setContent("<html><body></body></html>");
  const base64 = await page.evaluate(
    async ({ width, height, ms }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      const stopped = new Promise((resolve) => (recorder.onstop = resolve));
      const start = performance.now();
      const draw = () => {
        const t = (performance.now() - start) / ms;
        ctx.fillStyle = `hsl(${Math.round(t * 360)}, 70%, 50%)`;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, t * height, width, 40);
        if (t < 1) requestAnimationFrame(draw);
      };
      draw();
      recorder.start(100);
      await new Promise((resolve) => setTimeout(resolve, ms));
      recorder.stop();
      await stopped;
      const buffer = await new Blob(chunks, { type: "video/webm" }).arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(binary);
    },
    { width, height, ms },
  );
  writeFileSync(join(FIXTURE_DIR, name), Buffer.from(base64, "base64"));
}
