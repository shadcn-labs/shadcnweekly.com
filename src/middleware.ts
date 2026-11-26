import { defineMiddleware } from "astro:middleware";

import {
  appendVaryAccept,
  appendVaryUserAgent,
  prefersMarkdown,
} from "@/lib/content-negotiation";

export const onRequest = defineMiddleware(async (context, next) => {
  // Request headers are not available while prerendering at build time.
  context.locals.prefersMarkdown = context.isPrerendered
    ? false
    : prefersMarkdown(context.request.headers.get("accept"));

  // oxlint-disable-next-line node/callback-return -- The response is returned below, after Vary is added.
  const response = await next();
  const contentType = response.headers.get("Content-Type") ?? "";

  // Only negotiated representations need to vary on Accept.
  if (
    contentType.includes("text/html") ||
    contentType.includes("text/markdown")
  ) {
    appendVaryAccept(response.headers);
    appendVaryUserAgent(response.headers);
  }

  return response;
});
