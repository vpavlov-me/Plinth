import { describe, expect, it } from "vitest";
import { getDevice } from "@/editor/devices/definitions";
import { deviceTransform, fitScale, relativeTransform, resolveDeviceGeometry } from "@/editor/geometry";
import { createDeviceInstance } from "@/editor/scene";

const canvas = { width: 1920, height: 1080, preset: "landscape" as const };

describe("geometry", () => {
  it("keeps fixed devices unchanged", () => {
    const phone = getDevice("phone-pro");
    const g = resolveDeviceGeometry(phone, { width: 100, height: 100 });
    expect(g.width).toBe(phone.frame.width);
    expect(g.screen).toEqual(phone.screen);
  });

  it("stretches the browser to the screenshot aspect ratio", () => {
    const browser = getDevice("browser");
    const g = resolveDeviceGeometry(browser, { width: 2880, height: 3600 });
    expect(g.screen.height).toBe(1800);
    expect(g.height).toBe(browser.frame.height + 900);
    const middle = g.frameSlices[1]!;
    expect(middle.dest.height - middle.src.height).toBe(900);
    expect(g.frameSlices[2]!.dest.y + g.frameSlices[2]!.dest.height).toBe(g.height);
  });

  it("clamps very tall screenshots", () => {
    const g = resolveDeviceGeometry(getDevice("browser"), { width: 1000, height: 50000 });
    expect(g.screen.height).toBe(3600);
  });

  it("uses the screenshot size for frameless", () => {
    const g = resolveDeviceGeometry(getDevice("none"), { width: 800, height: 600 });
    expect([g.width, g.height]).toEqual([800, 600]);
  });

  it("fits with padding and round-trips transforms", () => {
    const g = resolveDeviceGeometry(getDevice("laptop-air"), null);
    const scale = fitScale(g, canvas);
    expect(g.width * scale).toBeLessThanOrEqual(canvas.width * 0.82 + 0.001);
    const instance = { ...createDeviceInstance("laptop-air"), x: 0.3, y: 0.6, scale: 1.4, rotation: 12 };
    const abs = deviceTransform(instance, g, canvas);
    expect(relativeTransform(abs, g, canvas)).toEqual({ x: 0.3, y: 0.6, scale: 1.4, rotation: 12 });
  });
});
