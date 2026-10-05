import type { APIRoute } from "astro";

import { buildFeed, feedResponse } from "@/lib/feed";

export const prerender = true;

export const GET: APIRoute = async () => {
  const feed = await buildFeed();
  return feedResponse(feed.json1(), "application/feed+json");
};
