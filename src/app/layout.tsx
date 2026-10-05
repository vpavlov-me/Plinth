import type { Metadata, Viewport } from "next";
import "./globals.css";
import { YandexMetrika } from "./yandex-metrika";

export const metadata: Metadata = {
  title: "Plinth — Device mockups from screenshots",
  description: "Drop a screenshot, pick a device, export a polished mockup. Runs entirely in your browser.",
};

export const viewport: Viewport = {
  themeColor: "#0e0e10",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <YandexMetrika />
      </body>
    </html>
  );
}
