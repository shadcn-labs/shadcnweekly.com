import type { APIRoute } from "astro";

import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";

export const prerender = true;

/** Built from `SITE.URL`, so the sitemap link matches the canonical host. */
export const GET: APIRoute = () =>
  new Response(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /api/",
      // https://contentsignals.org: allow search, AI answers and training.
      "Content-Signal: ai-train=yes, search=yes, ai-input=yes",
      "",
      `Sitemap: ${new URL(ROUTES.SITEMAP, SITE.URL).href}`,
      "",
    ].join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
