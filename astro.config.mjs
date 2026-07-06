// @ts-check

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";

// https://astro.build/config
export default defineConfig({
  adapter: vercel({
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
    react(),
    sitemap({
      changefreq: "weekly",
      lastmod: new Date(),
      priority: 0.7,
    }),
  ],
  output: "server",
  site: "https://shadcnweekly.com",
  vite: {
    plugins: [tailwindcss()],
  },
});
