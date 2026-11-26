import { createAEOMiddleware } from "@dualmark/vercel";
import type { VercelEdgeContext } from "@dualmark/vercel";

const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400";

// Everything Vercel should pass through untouched: APIs, framework assets,
// legacy redirects, image endpoints and the post-checkout page.
const SKIP_PREFIXES = [
  "/admin",
  "/api",
  "/_",
  "/archive",
  "/og",
  "/sponsor/thanks",
];

// The middleware's defaults, plus the other asset types this site emits.
const SKIP_EXTENSIONS = [
  ".js",
  ".css",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".xml",
  ".json",
  ".txt",
  ".pdf",
  ".webmanifest",
  ".zip",
  ".map",
  ".avif",
  ".mp4",
];

const dualmark = createAEOMiddleware({
  enableLinkHeader: true,
  fetchAsset: (url, init) => fetch(url.toString(), init),
  headers: { cacheControl: CACHE_CONTROL },
  skip: {
    extensions: SKIP_EXTENSIONS,
    prefixes: SKIP_PREFIXES,
  },
  trailingSlash: "never",
  upstream: () =>
    new Response(null, {
      headers: { "x-middleware-next": "1" },
    }),
});

// Bot detection chooses Markdown from the User-Agent, so shared caches must
// vary on it in addition to Accept.
const appendVaryUserAgent = (headers: Headers): void => {
  const existing = headers.get("Vary");
  if (!existing) {
    headers.set("Vary", "User-Agent");
    return;
  }

  const tokens = existing.split(",").map((value) => value.trim().toLowerCase());
  if (!tokens.includes("user-agent")) {
    headers.set("Vary", `${existing}, User-Agent`);
  }
};

export default async function middleware(
  request: Request,
  context?: VercelEdgeContext
): Promise<Response> {
  const response = await dualmark(request, context);
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType || /text\/(?:html|markdown)/iu.test(contentType)) {
    appendVaryUserAgent(response.headers);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_astro|_vercel|api|archive|og|sponsor/thanks).*)"],
};
