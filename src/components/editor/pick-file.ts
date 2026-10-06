import { ACCEPT_ATTRIBUTE, ACCEPT_SCREENSHOT_ATTRIBUTE } from "@/editor/import-image";

/** Opens the system file picker for a single image (or, for screenshots, an image or video). */
export function pickImageFile(onFile: (file: File) => void, options: { video?: boolean } = {}): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = options.video ? ACCEPT_SCREENSHOT_ATTRIBUTE : ACCEPT_ATTRIBUTE;
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) onFile(file);
  });
  input.click();
}
