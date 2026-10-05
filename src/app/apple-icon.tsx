import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The icon.svg mark as a PNG for iOS home screens, which don't accept SVG. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#18181b",
      }}
    >
      <div style={{ width: 52, height: 75, borderRadius: 12, backgroundColor: "#fafafa" }} />
      <div style={{ marginTop: 7, width: 90, height: 15, borderRadius: 8, backgroundColor: "rgba(250,250,250,0.7)" }} />
    </div>,
    size,
  );
}
