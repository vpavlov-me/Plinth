import { describe, expect, it } from "vitest";
import { uploadPrompts } from "@/editor/rendering/device-quad";
import { applyLayout, createDefaultScene, setScreenshot } from "@/editor/scene";

const sizeOf = (id: string) => (id === "shot" ? { width: 1179, height: 2556 } : null);
const layout = (id: string) => applyLayout(createDefaultScene(), id, sizeOf, null);
const ids = (scene: ReturnType<typeof layout>) => uploadPrompts(scene, sizeOf).map((p) => p.id);

describe("upload prompts", () => {
  it("shows one on every empty device", () => {
    const duo = layout("duo");
    expect(duo.devices).toHaveLength(2);
    expect(ids(duo)).toEqual(duo.devices.map((d) => d.id));
  });

  it("skips devices with a screenshot", () => {
    const duo = layout("duo");
    const filled = setScreenshot(duo, duo.devices[0]!.id, "shot", sizeOf);
    expect(ids(filled)).not.toContain(duo.devices[0]!.id);
  });

  it("clips a prompt by the devices in front and skips mostly hidden screens", () => {
    const laptopPhone = layout("laptop-phone");
    const prompts = uploadPrompts(laptopPhone, sizeOf);
    expect(prompts.map((p) => p.id)).toEqual(laptopPhone.devices.map((d) => d.id));
    expect(prompts[0]!.inFront).toHaveLength(1);
    expect(prompts[0]!.partlyCovered).toBe(true);
    expect(prompts[1]!.inFront).toHaveLength(0);

    const stack = layout("stack");
    expect(ids(stack)).toContain(stack.devices.at(-1)!.id);
  });
});
