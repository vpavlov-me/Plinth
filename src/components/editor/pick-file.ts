import { ACCEPT_ATTRIBUTE } from "@/editor/import-image";

/** Opens the system file picker for a single image. */
export function pickImageFile(onFile: (file: File) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ACCEPT_ATTRIBUTE;
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) onFile(file);
  });
  input.click();
}
