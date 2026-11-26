import { markdownResponse } from "@dualmark/core";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import { homeMarkdown } from "@/lib/agent-markdown";

export const prerender = true;

const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400";

export const GET: APIRoute = async () => {
  const archive = await getCollection("archive");
  const [latestIssue] = archive.toSorted((a, b) => b.data.issue - a.data.issue);

  return markdownResponse(
    homeMarkdown(
      latestIssue
        ? {
            description: latestIssue.data.description,
            id: latestIssue.id,
            issue: latestIssue.data.issue,
            title: latestIssue.data.title,
          }
        : undefined
    ),
    { cacheControl: CACHE_CONTROL }
  );
};
