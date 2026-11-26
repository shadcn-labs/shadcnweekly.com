import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { after, describe, it } from "node:test";

const root = path.join(import.meta.dirname, "..");
const entryPath = path.join(root, ".vercel/output/_functions/entry.mjs");
const staticDir = path.join(root, ".vercel/output/static");
const middlewarePath = path.join(root, "middleware.js");
const built =
  existsSync(entryPath) && existsSync(staticDir) && existsSync(middlewarePath);

const suite = built ? describe : describe.skip;

const ACCEPT = "accept";
const CONTENT_TYPE = "content-type";
const HOME = "/";
const HTML = "text/html";
const MARKDOWN = "text/markdown";
const NEXT = "1";
const NEXT_HEADER = "x-middleware-next";
const TEXT = "text/plain";
const USER_AGENT_HEADER = "user-agent";

const origin = "http://localhost";

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": `${HTML}; charset=utf-8`,
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": `${MARKDOWN}; charset=utf-8`,
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": `${TEXT}; charset=utf-8`,
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml; charset=utf-8",
};

let handler = null;
let middleware = null;
const realFetch = globalThis.fetch;

if (built) {
  const [entryModule, middlewareModule] = await Promise.all([
    import(entryPath),
    import(middlewarePath),
  ]);
  handler = entryModule.default;
  middleware = middlewareModule.default;

  // The middleware fetches its pre-built .md assets from the same origin.
  // Serve them directly so the request does not re-enter the middleware.
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    if (url.origin !== origin) {
      return realFetch(input, init);
    }

    const file = await readStatic(url.pathname);
    if (file) {
      return new Response(file.body, {
        headers: { "Content-Type": file.contentType },
      });
    }

    return handler.fetch(
      new Request(url.toString(), { headers: init?.headers })
    );
  };
}

after(() => {
  globalThis.fetch = realFetch;
});

const readStatic = async (pathname) => {
  const candidates = [
    path.join(staticDir, pathname),
    path.join(staticDir, pathname, "index.html"),
    path.join(staticDir, `${pathname}.html`),
  ];

  const results = await Promise.all(
    candidates.map(async (candidate) => {
      try {
        const info = await stat(candidate);
        if (!info.isFile()) {
          return null;
        }
        return {
          body: await readFile(candidate, "utf-8"),
          contentType:
            MIME[path.extname(candidate)] ?? "application/octet-stream",
        };
      } catch {
        return null;
      }
    })
  );

  return results.find((result) => result !== null) ?? null;
};

const serveOrigin = async (pathname, headers) => {
  const file = await readStatic(pathname);
  if (file) {
    return new Response(file.body, {
      headers: { "Content-Type": file.contentType },
    });
  }

  return handler.fetch(new Request(`${origin}${pathname}`, { headers }));
};

// Simulates Vercel: middleware first, then filesystem/function when it calls
// next(), with the middleware's headers merged onto the final response.
const runEdge = async (pathname, headers = {}) => {
  const requestHeaders = new Headers(headers);
  const request = new Request(`${origin}${pathname}`, {
    headers: requestHeaders,
  });
  let response = await middleware(request, { waitUntil: () => null });

  if (response.headers.get(NEXT_HEADER) === NEXT) {
    const upstream = await serveOrigin(pathname, requestHeaders);
    for (const [key, value] of response.headers) {
      if (key.toLowerCase() !== NEXT_HEADER) {
        upstream.headers.set(key, value);
      }
    }
    response = upstream;
  }

  return {
    body: await response.text(),
    headers: response.headers,
    status: response.status,
  };
};

const assertVary = (headers, token) => {
  assert.match(
    headers.get("vary") ?? "",
    new RegExp(`(?:^|,\\s*)${token}(?:$|,)`, "iu")
  );
};

const assertMarkdownHeaders = (headers) => {
  assert.match(headers.get(CONTENT_TYPE) ?? "", /^text\/markdown/iu);
  assert.match(headers.get("x-markdown-tokens") ?? "", /^\d+$/u);
  assert.equal(headers.get("x-robots-tag"), "noindex");
  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.equal(headers.get("x-aeo-version"), "1.0");
  assertVary(headers, ACCEPT);
  assertVary(headers, USER_AGENT_HEADER);
};

suite("edge middleware (built output)", () => {
  it("serves Markdown for Accept: text/markdown", async () => {
    const { body, headers, status } = await runEdge(HOME, {
      Accept: MARKDOWN,
    });

    assert.equal(status, 200);
    assertMarkdownHeaders(headers);
    assert.match(body, /^# Shadcn Weekly/u);
  });

  it("serves Markdown to a known AI bot", async () => {
    const { body, headers, status } = await runEdge(HOME, {
      "User-Agent": "GPTBot/1.0",
    });

    assert.equal(status, 200);
    assertMarkdownHeaders(headers);
    assert.match(body, /^# Shadcn Weekly/u);
  });

  it("does not let bot detection override an explicit HTML Accept", async () => {
    const { body, headers, status } = await runEdge(HOME, {
      Accept: HTML,
      "User-Agent": "GPTBot/1.0",
    });

    assert.equal(status, 200);
    assert.match(headers.get(CONTENT_TYPE) ?? "", /^text\/html/iu);
    assert.match(body, /<h1[^>]*>\s*Stay up-to-date on shadcn\s*<\/h1>/u);
  });

  it("returns 406 for an unacceptable Accept header", async () => {
    const { headers, status } = await runEdge(HOME, {
      Accept: "application/json",
    });

    assert.equal(status, 406);
    assert.match(headers.get(CONTENT_TYPE) ?? "", /^text\/plain/iu);
    assertVary(headers, ACCEPT);
  });

  it("advertises the Markdown twin on HTML responses", async () => {
    const { headers, status } = await runEdge(HOME, { Accept: HTML });

    assert.equal(status, 200);
    assert.match(headers.get("link") ?? "", /<\/index\.md>/u);
    assertVary(headers, ACCEPT);
    assertVary(headers, USER_AGENT_HEADER);
  });

  it("advertises the right twin for a marketing page", async () => {
    const { headers, status } = await runEdge("/about", { Accept: HTML });

    assert.equal(status, 200);
    assert.match(headers.get("link") ?? "", /<\/about\.md>/u);
  });

  it("serves a direct .md twin with the full header set", async () => {
    const { body, headers, status } = await runEdge("/about.md");

    assert.equal(status, 200);
    assertMarkdownHeaders(headers);
    assert.match(body, /^# About/u);
  });

  it("redirects trailing slashes to the canonical path", async () => {
    const { headers, status } = await runEdge("/about/", { Accept: HTML });

    assert.equal(status, 301);
    assert.equal(headers.get("location"), `${origin}/about`);
  });

  it("leaves non-HTML machine files alone", async () => {
    const { body, headers, status } = await runEdge("/llms.txt");

    assert.equal(status, 200);
    assert.match(headers.get(CONTENT_TYPE) ?? "", /^text\/plain/iu);
    assert.equal(headers.get("x-markdown-tokens"), null);
    assert.match(body, /## When to use this/u);
  });

  it("passes fetchAsset subrequests through to the asset", async () => {
    const request = new Request(`${origin}/index.md`, {
      headers: { "x-dualmark-subrequest": NEXT },
    });

    const response = await middleware(request, { waitUntil: () => null });

    assert.equal(response.headers.get(NEXT_HEADER), NEXT);
  });
});
