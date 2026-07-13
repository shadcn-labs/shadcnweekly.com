import type { APIRoute } from "astro";

import { generateOg } from "@/components/og/simple";
import { SITE } from "@/constants/site";

export const GET: APIRoute = async ({ url }) => {
  const title = url.searchParams.get("title")?.trim() || SITE.NAME;
  const description =
    url.searchParams.get("description")?.trim() || SITE.DESCRIPTION.LONG;

  const image = await generateOg({ description, title });
  const body = Uint8Array.from(image).buffer;

  return new Response(body, {
    headers: {
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "Content-Type": "image/png",
    },
  });
};
