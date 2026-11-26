import { markdownResponse } from "@dualmark/core";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import { issuesMarkdown } from "@/lib/page-markdown";

export const prerender = true;

const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400";

export const GET: APIRoute = async () => {
  const archive = await getCollection("archive");
  const issues = archive
    .toSorted((a, b) => b.data.issue - a.data.issue)
    .map((issue) => ({
      date: issue.data.date.toISOString().slice(0, 10),
      description: issue.data.description,
      id: issue.id,
      issue: issue.data.issue,
      title: issue.data.title,
    }));

  return markdownResponse(issuesMarkdown(issues), {
    cacheControl: CACHE_CONTROL,
  });
};
