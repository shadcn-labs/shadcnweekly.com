import { markdownResponse } from "@dualmark/core";
import type { APIRoute } from "astro";

import { contactMarkdown } from "@/lib/page-markdown";

export const prerender = true;

const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400";

export const GET: APIRoute = () =>
  markdownResponse(contactMarkdown(), { cacheControl: CACHE_CONTROL });
