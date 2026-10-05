import { ImageResponse } from "next/og";
import { SITE } from "./site";

export const alt = SITE.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social preview: the wordmark and tagline beside a phone mockup on a soft mesh background. */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 96px",
        backgroundColor: "#0e0e10",
        backgroundImage:
          "radial-gradient(circle at 78% 30%, rgba(124,108,246,0.55), transparent 45%), radial-gradient(circle at 92% 85%, rgba(76,201,240,0.4), transparent 40%), radial-gradient(circle at 55% 95%, rgba(232,93,117,0.35), transparent 40%)",
        color: "#fafafa",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: "#18181b",
              border: "2px solid #2a2a2e",
            }}
          >
            <div style={{ width: 22, height: 32, borderRadius: 5, backgroundColor: "#fafafa" }} />
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2 }}>{SITE.name}</div>
        </div>
        <div style={{ marginTop: 36, fontSize: 52, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5 }}>
          Device mockups from screenshots
        </div>
        <div style={{ marginTop: 24, fontSize: 28, lineHeight: 1.4, color: "#a1a1aa" }}>
          iPhone, Android, iPad, MacBook and browser frames. Free, in your browser, no sign-up.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          width: 250,
          height: 510,
          padding: 12,
          borderRadius: 52,
          backgroundColor: "#1c1c20",
          border: "3px solid #3a3a40",
          boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            borderRadius: 40,
            backgroundImage: "linear-gradient(160deg, #f9cfe0 0%, #cfe0fb 50%, #e6d6fa 100%)",
          }}
        />
      </div>
    </div>,
    size,
  );
}
