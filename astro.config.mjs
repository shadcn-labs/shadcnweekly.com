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
    webAnalytics: {
      enabled: false,
    },
  }),
  fonts: [
    {
      cssVariable: "--font-geist-sans",
      fallbacks: ["sans-serif"],
      name: "Geist",
      provider: fontProviders.fontsource(),
      weights: ["100 900"],
    },
    {
      cssVariable: "--font-geist-mono",
      fallbacks: ["monospace"],
      name: "Geist Mono",
      provider: fontProviders.fontsource(),
      weights: ["100 900"],
    },
    {
      // Static WOFF files for Satori OG images (no WOFF2 or variable font support); never rendered via <Font>.
      cssVariable: "--font-og",
      formats: ["woff"],
      name: "Geist",
      provider: fontProviders.fontsource(),
      styles: ["normal"],
      subsets: ["latin"],
      weights: [400, 700],
    },
  ],
  integrations: [
    mdx(),
    react(),
    sitemap({
      changefreq: "weekly",
      filter: (page) => !page.includes("/sponsor/thanks"),
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
