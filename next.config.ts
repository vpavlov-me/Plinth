import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Konva ships a Node entry that requires the optional `canvas` package.
  // The editor only renders Konva in the browser, so alias it away.
  turbopack: {
    resolveAlias: {
      canvas: { browser: "./src/editor/utils/empty-module.ts" },
    },
  },
  // llms.txt is the standard location; also answer the common misspelling.
  async rewrites() {
    return [{ source: "/llm.txt", destination: "/llms.txt" }];
  },
};

export default nextConfig;
