import { ACCEPT_ATTRIBUTE, ACCEPT_SCREENSHOT_ATTRIBUTE, ACCEPT_VIDEO_ATTRIBUTE } from "@/editor/import-image";

/**
 * Opens the system file picker for a single image; screenshots also take
 * videos (`video: true`), video backgrounds take only videos (`video: "only"`).
 */
export function pickImageFile(onFile: (file: File) => void, options: { video?: boolean | "only" } = {}): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept =
    options.video === "only" ? ACCEPT_VIDEO_ATTRIBUTE : options.video ? ACCEPT_SCREENSHOT_ATTRIBUTE : ACCEPT_ATTRIBUTE;
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) onFile(file);
  });
  input.click();
}
