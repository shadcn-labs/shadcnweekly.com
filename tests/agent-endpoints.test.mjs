import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.join(import.meta.dirname, "..");
const entryPath = path.join(root, ".vercel/output/_functions/entry.mjs");
const clientDir = path.join(root, "dist/client");
const built = existsSync(entryPath) && existsSync(clientDir);

const suite = built ? describe : describe.skip;

const HTML = "text/html";
const MARKDOWN = "text/markdown";
const TEXT = "text/plain";

const CONTENT_TYPE = "content-type";
const MARKDOWN_TYPE = /^text\/markdown/iu;
const HTML_TYPE = /^text\/html/iu;

const MIME = {
  ".html": `${HTML}; charset=utf-8`,
  ".json": "application/json; charset=utf-8",
  ".md": `${MARKDOWN}; charset=utf-8`,
  ".txt": `${TEXT}; charset=utf-8`,
  ".xml": "application/xml; charset=utf-8",
};

let handler = null;
if (built) {
  const entryModule = await import(entryPath);
  handler = entryModule.default;
}

// Mirrors the adapter: static files are served from the filesystem, everything
// else falls through to the Astro server function (which runs middleware).
const readStatic = async (pathname) => {
  const candidates = [
    path.join(clientDir, pathname),
    path.join(clientDir, pathname, "index.html"),
    path.join(clientDir, `${pathname}.html`),
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

const fetchApp = async (urlPath, accept, userAgent) => {
  const staticFile = await readStatic(urlPath);
  if (staticFile) {
    return {
      body: staticFile.body,
      headers: new Headers({ "Content-Type": staticFile.contentType }),
      status: 200,
    };
  }

  const headers = new Headers();
  if (accept) {
    headers.set("Accept", accept);
  }
  if (userAgent) {
    headers.set("User-Agent", userAgent);
  }

  const response = await handler.fetch(
    new Request(`http://localhost${urlPath}`, { headers })
  );

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

// The full AEO header set is applied by markdownResponse() at the origin and
// re-applied by the Vercel edge middleware for pre-built .md assets.
const assertMarkdownHeaders = (headers) => {
  assert.match(headers.get(CONTENT_TYPE) ?? "", MARKDOWN_TYPE);
  assert.match(headers.get("x-markdown-tokens") ?? "", /^\d+$/u);
  assert.equal(headers.get("x-robots-tag"), "noindex");
  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.equal(headers.get("x-aeo-version"), "1.0");
  assertVary(headers, "accept");
  assertVary(headers, "user-agent");
};

const mainTextOf = (body) => {
  const main = body.match(/<main[\s\S]*?<\/main>/iu)?.[0] ?? body;
  return main
    .replaceAll(/<script[\s\S]*?<\/script>/giu, " ")
    .replaceAll(/<style[\s\S]*?<\/style>/giu, " ")
    .replaceAll(/<[^>]+>/gu, " ")
    .replaceAll(/&[a-z#0-9]+;/giu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim();
};

suite("agent endpoints (built output)", () => {
  it("serves Markdown to Accept: text/markdown on /", async () => {
    const { body, headers, status } = await fetchApp("/", MARKDOWN);

    assert.equal(status, 200);
    assertMarkdownHeaders(headers);
    assert.match(body, /^# Shadcn Weekly/u);
    assert.ok(body.length > 500);
    assert.match(body, /## When to use this/u);
    assert.match(body, /append `\.md`/u);
  });

  it("serves HTML to Accept: text/html on /", async () => {
    const { body, headers, status } = await fetchApp("/", HTML);

    assert.equal(status, 200);
    assert.match(headers.get(CONTENT_TYPE) ?? "", HTML_TYPE);
    assertVary(headers, "accept");
    assertVary(headers, "user-agent");
    assert.match(body, /<h1[^>]*>\s*Stay up-to-date on shadcn\s*<\/h1>/u);
  });

  it("serves at least 500 characters of homepage text in raw HTML", async () => {
    const { body } = await fetchApp("/", HTML);
    const text = mainTextOf(body);

    assert.ok(text.length >= 500, `main text was ${text.length} chars`);
    assert.match(text, /shadcn\/ui newsletter/u);
    assert.match(text, /Tailwind CSS/u);
  });

  it("returns a 404 with a Markdown body for agents", async () => {
    const { body, headers, status } = await fetchApp(
      "/__ora-404-probe",
      MARKDOWN
    );

    assert.equal(status, 404);
    assertMarkdownHeaders(headers);
    assert.ok(body.length >= 20);
    assert.match(body, /llms\.txt/u);
    assert.match(body, /sitemap/u);
  });

  it("returns a 404 HTML page for browsers", async () => {
    const { body, headers, status } = await fetchApp("/__ora-404-probe", HTML);

    assert.equal(status, 404);
    assert.match(headers.get(CONTENT_TYPE) ?? "", HTML_TYPE);
    assert.match(body, /Page not found/iu);
  });

  it("serves the advertised /index.md alternate", async () => {
    const { body, headers, status } = await fetchApp("/index.md");

    assert.equal(status, 200);
    assert.match(headers.get(CONTENT_TYPE) ?? "", MARKDOWN_TYPE);
    assert.match(body, /^# Shadcn Weekly/u);
  });

  it("serves issue Markdown alternates", async () => {
    const { body, headers, status } = await fetchApp("/issues/9.md");

    assert.equal(status, 200);
    assert.match(headers.get(CONTENT_TYPE) ?? "", MARKDOWN_TYPE);
    assert.match(body, /^# Shadcn Weekly #9/u);
  });

  const staticTwins = [
    ["/about.md", /^# About/u],
    ["/brand.md", /^# Brand/u],
    ["/contact.md", /^# Contact/u],
    ["/issues.md", /^# Newsletter Archive/u],
    ["/privacy.md", /^# Privacy Policy/u],
    ["/refunds.md", /^# Refund Policy/u],
    ["/terms.md", /^# Terms of Service/u],
    ["/tools.md", /^# Tools/u],
  ];

  for (const [urlPath, heading] of staticTwins) {
    it(`serves the ${urlPath} twin`, async () => {
      const { body, headers, status } = await fetchApp(urlPath);

      assert.equal(status, 200);
      assert.match(headers.get(CONTENT_TYPE) ?? "", MARKDOWN_TYPE);
      assert.match(body, heading);
      assert.ok(body.length > 200);
    });
  }

  it("serves the on-demand /sponsor.md twin with full headers", async () => {
    const { body, headers, status } = await fetchApp("/sponsor.md");

    assert.equal(status, 200);
    assertMarkdownHeaders(headers);
    assert.match(body, /^# Sponsor/u);
    assert.match(body, /## Placements/u);
    assert.match(body, /\$100/u);
  });

  it("lists every issue in /issues.md", async () => {
    const { body } = await fetchApp("/issues.md");

    assert.match(body, /## Issues/u);
    assert.match(body, /#9:/u);
  });

  it("lists tools by category in /tools.md", async () => {
    const { body } = await fetchApp("/tools.md");

    assert.match(body, /## Components/u);
    assert.match(body, /featured in issue #/u);
  });

  it("publishes when-to-use guidance in llms.txt", async () => {
    const { body, headers, status } = await fetchApp("/llms.txt");

    assert.equal(status, 200);
    assert.match(headers.get(CONTENT_TYPE) ?? "", /^text\/plain/iu);
    assert.match(body, /## When to use this/u);
    assert.match(body, /How to use this site/u);
    assert.match(body, /## Markdown/u);
  });

  it("exposes a complete Organization schema on the homepage", async () => {
    const { body } = await fetchApp("/", HTML);

    assert.match(body, /"contactPoint"/u);
    assert.match(body, /"address"/u);
    assert.match(body, /"knowsAbout"/u);
    assert.match(body, /shadcn\/ui newsletter/u);
    assert.match(body, /hello@shadcnweekly\.com/u);
  });

});
