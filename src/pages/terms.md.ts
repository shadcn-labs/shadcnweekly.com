import { markdownResponse } from "@dualmark/core";
import type { APIRoute } from "astro";

import { termsMarkdown } from "@/lib/page-markdown";

export const prerender = true;

const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400";

export const GET: APIRoute = () =>
  markdownResponse(termsMarkdown(), { cacheControl: CACHE_CONTROL });
