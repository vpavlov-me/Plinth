import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE } from "./site";
import { YandexMetrika } from "./yandex-metrika";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [SITE.author],
  creator: SITE.author.name,
  keywords: [
    "mockup generator",
    "device mockup",
    "screenshot mockup",
    "iPhone mockup",
    "Android mockup",
    "iPad mockup",
    "MacBook mockup",
    "browser mockup",
    "app store screenshots",
    "social media mockup",
  ],
  category: "design",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.shortDescription,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.shortDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  appleWebApp: { title: SITE.name, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
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
