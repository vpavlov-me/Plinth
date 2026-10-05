import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Browser } from "@playwright/test";

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
  writeFileSync(join(FIXTURE_DIR, "invalid.png"), "definitely not an image");
  await page.close();
}
