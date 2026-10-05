import { EditorShell } from "@/components/editor/editor-shell";
import { SITE } from "./site";

/** schema.org description of the editor, for search engines. */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  applicationCategory: "DesignApplication",
  operatingSystem: "Any (web browser)",
  browserRequirements: "Requires JavaScript and a desktop or tablet-sized screen.",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@type": "Person", name: SITE.author.name, url: SITE.author.url },
  featureList: [
    "25 built-in device frames: phones, tablets, laptops, desktops, a watch and browser windows",
    "Upload your own device frames",
    "Social media and app store canvas presets",
    "Solid, gradient and photo backgrounds",
    "Export PNG at 1×, 2× or 3×, JPG or transparent PNG",
    "Runs locally in the browser with no uploads",
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD must be inline; the content is static and contains no user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <EditorShell />
    </>
  );
}
