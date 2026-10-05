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
  const section = page.getByRole("region", { name: "Screenshot" });
  const replace = section.getByRole("button", { name: "Replace screenshot" });
  const button = (await replace.isVisible()) ? replace : section.getByRole("button", { name: "Add screenshot" });
  // Headless Chrome occasionally drops the first file chooser; click again if it doesn't open.
  for (let attempt = 0; attempt < 3; attempt++) {
    const chooser = page.waitForEvent("filechooser", { timeout: 5000 }).catch(() => null);
    await button.click();
    const opened = await chooser;
    if (opened) return opened.setFiles(join(FIXTURE_DIR, file));
  }
  throw new Error("The file chooser did not open");
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

/** The inspector's Mockup section (the Screenshot section has sliders with the same names). */
const deviceSection = (page: Page) => page.getByRole("region", { name: "Mockup", exact: true });

const canvasSize = (page: Page) => page.getByRole("img", { name: /Mockup canvas/ }).getAttribute("aria-label");

test("main workflow: upload → device → canvas → background → move → export 2x PNG", async ({ page }) => {
  await openScreenshot(page, "portrait.png");
  await expect(page.getByText("portrait.png")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Drop a screenshot" })).toBeHidden();

  await page.getByRole("button", { name: /^Tablets/ }).click();
  await page.getByRole("button", { name: "Tablet Pro 13″", exact: true }).click();
  await expect(page.getByLabel("Device model")).toHaveValue("tablet-pro-13");

  await page.getByRole("radio", { name: /Square/ }).click();
  expect(await canvasSize(page)).toContain("1200 by 1200");

  await page.getByRole("button", { name: "Solid" }).click();
  await page.getByRole("button", { name: "#cdd9ec" }).click();

  const canvas = page.locator("canvas").first();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(deviceSection(page).getByRole("slider", { name: "Horizontal" })).not.toHaveValue("0");

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
  const scale = deviceSection(page).getByRole("slider", { name: "Scale" });
  await scale.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(deviceSection(page).getByText("102%", { exact: true })).toBeVisible();

  await page.keyboard.press("ControlOrMeta+z");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(deviceSection(page).getByText("100%", { exact: true })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(deviceSection(page).getByText("101%", { exact: true })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(deviceSection(page).getByText("102%", { exact: true })).toBeVisible();
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
  await expect(page.getByRole("button", { name: "Lake painting", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const sea = page.getByRole("button", { name: "Starry sea", exact: true });
  await sea.click();
  await expect(sea).toHaveAttribute("aria-pressed", "true");

  expect(pngSize(await exportImage(page, "PNG", 1))).toMatchObject({ width: 1920, height: 1080 });
});

test("uploads a custom device frame and detects its screen", async ({ page }) => {
  await page.getByRole("button", { name: /^Your frames/ }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload a device frame" }).click();
  await (await chooser).setFiles(join(FIXTURE_DIR, "frame.png"));
  const notifications = page.getByRole("region", { name: "Notifications" });
  await expect(notifications.getByText("Screen detected: 480 × 880 px")).toBeVisible();
  await expect(page.getByLabel("Device model")).toHaveValue(/^custom:/);

  await openScreenshot(page, "portrait.png");
  const file = await exportImage(page, "PNG", 1);
  expect(pngSize(file)).toMatchObject({ width: 1080, height: 1350 });

  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByLabel("Device model")).toHaveValue(/^custom:/);
});

test("applies social presets", async ({ page }) => {
  await page.getByRole("button", { name: /^Social/ }).click();
  await page.getByRole("button", { name: /TikTok story/ }).click();
  expect(await canvasSize(page)).toContain("1080 by 1920");
  await page.getByRole("button", { name: /^YouTube thumbnail/ }).click();
  expect(await canvasSize(page)).toContain("1280 by 720");
});

test("hides and shows the side panels and collapses sections", async ({ page }) => {
  await page.getByRole("button", { name: "Hide library" }).click();
  await expect(page.getByRole("complementary", { name: "Library" })).toBeHidden();
  await page.keyboard.press("[");
  await expect(page.getByRole("complementary", { name: "Library" })).toBeVisible();

  await page.getByRole("button", { name: "Hide properties" }).click();
  await expect(page.getByRole("complementary", { name: "Properties" })).toBeHidden();
  await page.getByRole("button", { name: "Show properties" }).click();

  const shadow = page.getByRole("button", { name: "Shadow", exact: true });
  await shadow.click();
  await expect(page.getByRole("button", { name: "Medium", exact: true })).toBeHidden();
  await shadow.click();
  await expect(page.getByRole("button", { name: "Medium", exact: true })).toBeVisible();
});

/* -------------------------------------------------------------------------- */
/* Layouts, crop, perspective, match colors                                   */
/* -------------------------------------------------------------------------- */

/** The Perspective section starts collapsed to keep the first view simple. */
const openPerspective = (page: Page) => page.getByRole("button", { name: "Perspective", exact: true }).click();

const canvasCenter = async (page: Page) => {
  const box = (await page.locator("canvas").first().boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

test("multi-device: Duo → select second device → move → export", async ({ page }) => {
  await openScreenshot(page, "portrait.png");
  await page.getByRole("button", { name: "Duo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Duo", exact: true })).toHaveAttribute("aria-pressed", "true");

  const second = page.getByRole("button", { name: "Device 2", exact: true });
  await second.click();
  await expect(second).toHaveAttribute("aria-pressed", "true");
  const horizontal = deviceSection(page).getByRole("slider", { name: "Horizontal" });
  const before = await horizontal.inputValue();
  await horizontal.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowRight");
  await expect(horizontal).not.toHaveValue(before);

  // Device 1 kept its position.
  await page.getByRole("button", { name: "Device 1", exact: true }).click();
  await expect(deviceSection(page).getByRole("slider", { name: "Horizontal" })).not.toHaveValue("0");

  expect(pngSize(await exportImage(page, "PNG", 2))).toMatchObject({ width: 2160, height: 2700 });

  // A secondary device can be removed; the last one stays.
  await page.getByRole("button", { name: "Remove device" }).click();
  await expect(page.getByRole("button", { name: "Device 2", exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "Remove device" })).toBeHidden();
});

test("crop: zoom and reposition the screenshot inside the screen, then export", async ({ page }) => {
  await openScreenshot(page, "portrait.png");
  await page.getByRole("button", { name: "Adjust on canvas" }).click();
  await expect(page.getByRole("button", { name: "Done" })).toBeVisible();

  const center = await canvasCenter(page);
  await page.mouse.move(center.x, center.y);
  await page.mouse.wheel(0, -400);
  const zoom = page.getByRole("slider", { name: "Zoom" });
  await expect(zoom).not.toHaveValue("100");

  await page.mouse.down();
  await page.mouse.move(center.x - 20, center.y - 60, { steps: 8 });
  await page.mouse.up();
  await expect(
    page.getByRole("region", { name: "Screenshot" }).getByRole("slider", { name: "Vertical" }),
  ).not.toHaveValue("0");
  // Panning moved the screenshot, not the device.
  await expect(deviceSection(page).getByRole("slider", { name: "Horizontal" })).toHaveValue("0");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Adjust on canvas" })).toBeVisible();
  expect(pngSize(await exportImage(page, "PNG", 2))).toMatchObject({ width: 2160, height: 2700 });

  // The drag is one undo step, the wheel zoom another.
  const screenshot = page.getByRole("region", { name: "Screenshot" });
  await page.keyboard.press("ControlOrMeta+z");
  await expect(screenshot.getByRole("slider", { name: "Vertical" })).toHaveValue("0");
  await expect(screenshot.getByRole("slider", { name: "Zoom" })).not.toHaveValue("100");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(screenshot.getByRole("slider", { name: "Zoom" })).toHaveValue("100");
});

test("perspective: Perspective Right exports at every scale and as JPG", async ({ page }) => {
  await openScreenshot(page, "portrait.png");
  await openPerspective(page);
  const right = page.getByRole("radio", { name: "Perspective Right" });
  await right.click();
  await expect(right).toHaveAttribute("aria-checked", "true");
  for (const scale of [1, 3] as const) {
    expect(pngSize(await exportImage(page, "PNG", scale))).toMatchObject({ width: 1080 * scale, height: 1350 * scale });
  }
  const jpg = readFileSync(await exportImage(page, "JPG", 2));
  expect([...jpg.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  await page.getByRole("button", { name: "None" }).first().click();
  expect(pngSize(await exportImage(page, "PNG", 1)).colorType).toBe(6);
});

test("match colors: one click applies a background; undo and redo restore it", async ({ page }) => {
  await openScreenshot(page, "landscape.png");
  const blueHour = page.getByRole("button", { name: "Blue Hour", exact: true });
  await expect(blueHour).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Match colors", exact: true }).click();
  await expect(blueHour).toHaveAttribute("aria-pressed", "false");

  await page.keyboard.press("ControlOrMeta+z");
  await expect(blueHour).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(blueHour).toHaveAttribute("aria-pressed", "false");

  await page.getByRole("button", { name: "Match colors: Dark" }).click();
  expect(pngSize(await exportImage(page, "PNG", 1))).toMatchObject({ width: 1080, height: 1350 });
});

test("persistence: a multi-device composition is restored after reload", async ({ page }) => {
  await openScreenshot(page, "portrait.png");
  await page.getByRole("button", { name: "Fan", exact: true }).click();
  await page.getByRole("button", { name: "Device 3", exact: true }).click();
  await openPerspective(page);
  await page.getByRole("radio", { name: "Tilt Left" }).click();
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByRole("button", { name: "Fan", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Device 3", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("portrait.png")).toBeVisible();
  await openPerspective(page);
  await expect(page.getByRole("radio", { name: "Tilt Left" })).toHaveAttribute("aria-checked", "true");
});

test("showcase presets use layouts", async ({ page }) => {
  await openScreenshot(page, "portrait.png");
  await page.getByRole("button", { name: /^Showcase/ }).click();
  await page.getByRole("button", { name: /^Portfolio hero/ }).click();
  await expect(page.getByRole("button", { name: "Laptop + Phone", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await canvasSize(page)).toContain("1920 by 1080");
  expect(pngSize(await exportImage(page, "PNG", 1))).toMatchObject({ width: 1920, height: 1080 });
});

test("first visit: a starter mockup and a dismissible three-step hint", async ({ page }) => {
  expect(await canvasSize(page)).toContain("1080 by 1350");
  const hint = page.getByRole("complementary", { name: "Getting started" });
  await expect(hint).toBeVisible();
  await expect(page.getByRole("button", { name: "Open screenshot" })).toHaveCount(0);

  await page.getByRole("button", { name: "Dismiss tips" }).click();
  await expect(hint).toBeHidden();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Drop a screenshot" })).toBeVisible();
  await expect(hint).toBeHidden();
});
