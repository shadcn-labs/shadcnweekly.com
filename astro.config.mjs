// @ts-check

import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";

const isDev =
  process.env.NODE_ENV === "development" || process.argv.includes("dev");

const getSite = () => {
  if (isDev) {
    return "http://localhost:4321";
  }

  if (process.env.SITE_URL) {
    return process.env.SITE_URL;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  return "https://shadcnweekly.com";
};

const site = getSite();

// https://astro.build/config
export default defineConfig({
  adapter: vercel({
    includeFiles: [
      "src/assets/fonts/inter-latin-400-normal.woff",
      "src/assets/fonts/inter-latin-700-normal.woff",
    ],
    webAnalytics: {
      enabled: false,
    },
  }),
  fonts: [
    {
      cssVariable: "--font-sans",
      fallbacks: ["sans-serif"],
      name: "Inter",
      provider: fontProviders.fontsource(),
    },
  ],
  integrations: [
    mdx(),
    react(),
    sitemap({
      changefreq: "weekly",
      lastmod: new Date(),
      priority: 0.7,
    }),
  ],
  output: "server",
  redirects: {
    "/archive": "/issues",
    "/archive/[...slug]": "/issues/[...slug]",
  },
  site,
  vite: {
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
    plugins: [tailwindcss()],
    ssr: {
      external: ["@resvg/resvg-js"],
    },
  },
});
