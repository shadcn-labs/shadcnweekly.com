import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const staticDir = path.join(root, ".vercel/output/static");
const entryPath = path.join(root, ".vercel/output/_functions/entry.mjs");
const middlewarePath = path.join(root, "middleware.js");
const port = Number(process.env.PORT ?? 4322);
const origin = `http://localhost:${port}`;

const MIME = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".zip": "application/zip",
};

const [{ default: handler }, { default: middleware }] = await Promise.all([
  import(entryPath),
  import(middlewarePath),
]);

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
          body: await readFile(candidate),
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

// The middleware's fetchAsset() calls fetch() for the pre-built .md files.
// Serve those directly so the request does not re-enter the middleware.
const realFetch = globalThis.fetch;
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

  return handler.fetch(new Request(url.toString(), { headers: init?.headers }));
};

const toHeaders = (raw) => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else if (value) {
      headers.set(key, value);
    }
  }
  return headers;
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", origin);
    const headers = toHeaders(request.headers);
    const edgeRequest = new Request(url, {
      headers,
      method: request.method,
    });

    let result = await middleware(edgeRequest, { waitUntil: () => null });

    // Vercel continues to the filesystem/function when middleware calls next().
    if (result.headers.get("x-middleware-next") === "1") {
      const upstream = await serveOrigin(url.pathname, headers);
      for (const [key, value] of result.headers) {
        if (key.toLowerCase() !== "x-middleware-next") {
          upstream.headers.set(key, value);
        }
      }
      result = upstream;
    }

    response.statusCode = result.status;
    for (const [key, value] of result.headers) {
      response.setHeader(key, value);
    }

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    const body = Buffer.from(await result.arrayBuffer());
    response.setHeader("Content-Length", body.byteLength);
    response.end(body);
  } catch (error) {
    console.error(error);
    response.statusCode = 500;
    response.end("Internal Server Error");
  }
});

server.listen(port, () => {
  console.log(`AEO server listening on ${origin}`);
});
