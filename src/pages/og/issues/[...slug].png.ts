import type { APIRoute } from "astro";
import { getEntry } from "astro:content";

import { generateIssueOg } from "@/components/og/issue";

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;

  if (!slug) {
    return new Response("Issue not found", { status: 404 });
  }

  const issue = await getEntry("archive", slug);

  if (!issue) {
    return new Response("Issue not found", { status: 404 });
  }

  const image = await generateIssueOg(issue);
  const body = Uint8Array.from(image).buffer;

  return new Response(body, {
    headers: {
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "Content-Type": "image/png",
    },
  });
};
