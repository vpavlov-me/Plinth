import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { createFixtures, FIXTURE_DIR } from "./fixtures";

test.beforeAll(async ({ browser }) => {
  await createFixtures(browser);
});

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", { name: "Drop a screenshot" })).toBeVisible();
});

async function openScreenshot(page: Page, file: string) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Open screenshot" }).click();
  await (await chooser).setFiles(join(FIXTURE_DIR, file));
}

function pngSize(path: string) {
  const buffer = readFileSync(path);
  expect(buffer.subarray(1, 4).toString()).toBe("PNG");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), colorType: buffer[25] };
}

async function exportImage(page: Page, format: "PNG" | "JPG", scale: 1 | 2 | 3) {
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("button", { name: format, exact: true }).click();
  await page.getByRole("button", { name: `${scale}×`, exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /^Download/ }).click();
  const path = await (await download).path();
  await page.keyboard.press("Escape");
  return path;
}

const canvasSize = (page: Page) => page.getByRole("img", { name: /Mockup canvas/ }).getAttribute("aria-label");

test("main workflow: upload → device → canvas → background → move → export 2x PNG", async ({ page }) => {
  await openScreenshot(page, "portrait.png");
  await expect(page.getByText("portrait.png")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Drop a screenshot" })).toBeHidden();

  await page.getByRole("button", { name: "Tablet Pro 13″", exact: true }).click();
  await expect(page.getByLabel("Device model")).toHaveValue("tablet-pro-13");

  await page.getByRole("radio", { name: /Square/ }).click();
  expect(await canvasSize(page)).toContain("1200 by 1200");

  await page.getByRole("button", { name: "Solid" }).click();
  await page.getByRole("button", { name: "#bfdbfe" }).click();

  const canvas = page.locator("canvas").first();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByRole("slider", { name: "Horizontal" })).not.toHaveValue("0");

  const file = await exportImage(page, "PNG", 2);
  expect(pngSize(file)).toMatchObject({ width: 2400, height: 2400 });
});

test("exports exact sizes at every scale, JPG and transparent PNG", async ({ page }) => {
  await openScreenshot(page, "landscape.png");
  await page.getByRole("radio", { name: /Wide/ }).click();
  for (const scale of [1, 2, 3] as const) {
    expect(pngSize(await exportImage(page, "PNG", scale))).toMatchObject({ width: 1920 * scale, height: 1080 * scale });
  }
  const jpg = readFileSync(await exportImage(page, "JPG", 1));
  expect([...jpg.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);

  await page.getByRole("button", { name: "None" }).first().click();
  const transparent = pngSize(await exportImage(page, "PNG", 1));
  expect(transparent.colorType).toBe(6); // RGBA
});

test("handles invalid, tiny, transparent and very large images", async ({ page }) => {
  await openScreenshot(page, "invalid.png");
  await expect(page.getByRole("region", { name: "Notifications" }).getByText("Couldn’t import image")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Drop a screenshot" })).toBeVisible();

  await openScreenshot(page, "small.png");
  await expect(page.getByText("120 × 80")).toBeVisible();

  await openScreenshot(page, "transparent.png");
  await expect(page.getByText("800 × 600")).toBeVisible();

  await openScreenshot(page, "large.jpg");
  await expect(page.getByRole("region", { name: "Notifications" }).getByText("Large image downscaled")).toBeVisible();
  await expect(page.getByText("large.jpg")).toBeVisible();
});

test("every canvas preset, frameless, scale and undo/redo", async ({ page }) => {
  await openScreenshot(page, "portrait.png");
  for (const [name, size] of [
    [/Square/, "1200 by 1200"],
    [/Portrait/, "1080 by 1350"],
    [/Wide/, "1920 by 1080"],
    [/Story/, "1080 by 1920"],
  ] as const) {
    await page.getByRole("radio", { name }).click();
    expect(await canvasSize(page)).toContain(size);
  }
  await page.getByRole("radio", { name: /Original/ }).click();
  expect(await canvasSize(page)).not.toContain("1080 by 1920");

  await page.getByLabel("Device model").selectOption("none");
  const scale = page.getByRole("slider", { name: "Scale" });
  await scale.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("102%", { exact: true })).toBeVisible();

  await page.keyboard.press("ControlOrMeta+z");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(page.getByText("101%", { exact: true })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(page.getByText("102%", { exact: true })).toBeVisible();
});

test("restores the project after reload", async ({ page }) => {
  await openScreenshot(page, "landscape.png");
  await page.getByRole("radio", { name: /Story/ }).click();
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByText("landscape.png")).toBeVisible();
  expect(await canvasSize(page)).toContain("1080 by 1920");
});

test("keeps the user's own backgrounds in the library", async ({ page }) => {
  await page.getByRole("button", { name: "Gradient", exact: true }).click();
  await page.getByRole("button", { name: "Add your gradient" }).click();
  await page.getByRole("button", { name: "Add gradient" }).click();
  await expect(page.getByRole("button", { name: "Your gradient 1", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Image", exact: true }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload your image" }).click();
  await (await chooser).setFiles(join(FIXTURE_DIR, "small.png"));
  await expect(page.getByRole("button", { name: "small.png", exact: true })).toBeVisible();

  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByRole("button", { name: "small.png", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gradient", exact: true }).click();
  await expect(page.getByRole("button", { name: "Your gradient 1", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Your gradient 1", exact: true }).hover();
  await page.getByRole("button", { name: "Remove Your gradient 1" }).click();
  await expect(page.getByRole("button", { name: "Your gradient 1", exact: true })).toBeHidden();
});

test("picks a built-in background image and exports it", async ({ page }) => {
  await openScreenshot(page, "landscape.png");
  await page.getByRole("radio", { name: /Wide/ }).click();
  await page.getByRole("button", { name: "Image", exact: true }).click();
  await expect(page.getByRole("button", { name: "Morning haze", exact: true })).toHaveAttribute("aria-pressed", "true");

  const night = page.getByRole("button", { name: "Night bokeh", exact: true });
  await night.click();
  await expect(night).toHaveAttribute("aria-pressed", "true");

  expect(pngSize(await exportImage(page, "PNG", 1))).toMatchObject({ width: 1920, height: 1080 });
});

test("uploads a custom device frame and detects its screen", async ({ page }) => {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload a device frame" }).click();
  await (await chooser).setFiles(join(FIXTURE_DIR, "frame.png"));
  const notifications = page.getByRole("region", { name: "Notifications" });
  await expect(notifications.getByText("Screen detected: 480 × 880 px")).toBeVisible();
  await expect(page.getByLabel("Device model")).toHaveValue(/^custom:/);

  await openScreenshot(page, "portrait.png");
  const file = await exportImage(page, "PNG", 1);
  expect(pngSize(file)).toMatchObject({ width: 1920, height: 1080 });

  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByLabel("Device model")).toHaveValue(/^custom:/);
});

test("applies social presets", async ({ page }) => {
  await page.getByRole("button", { name: /TikTok story/ }).click();
  expect(await canvasSize(page)).toContain("1080 by 1920");
  await page.getByRole("button", { name: /^YouTube thumbnail/ }).click();
  expect(await canvasSize(page)).toContain("1280 by 720");
});
