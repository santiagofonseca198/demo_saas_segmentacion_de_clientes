import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Oculta el indicador de desarrollo de Next.js para que no aparezca en una demo.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
