// @ts-check

import react from "@astrojs/react";
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
  integrations: [react()],
  output: "server",
  vite: {
    plugins: [tailwindcss()],
  },
});
