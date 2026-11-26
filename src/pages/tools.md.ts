import { markdownResponse } from "@dualmark/core";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import { toolsMarkdown } from "@/lib/page-markdown";

export const prerender = true;

const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400";

export const GET: APIRoute = async () => {
  const collection = await getCollection("tools");
  const tools = collection
    .toSorted(
      (a, b) =>
        b.data.issue - a.data.issue || a.data.title.localeCompare(b.data.title)
    )
    .map((tool) => ({
      category: tool.data.category,
      description: tool.data.description,
      issue: tool.data.issue,
      title: tool.data.title,
      url: tool.data.url,
    }));

  return markdownResponse(toolsMarkdown(tools), {
    cacheControl: CACHE_CONTROL,
  });
};
