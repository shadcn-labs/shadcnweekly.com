import { appendFile, readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const ARCHIVE_DIR = `${ROOT}src/content/archive`;
export const TOOLS_DIR = `${ROOT}src/content/tools`;
export const SITE_URL = (
  process.env.SITE_URL ?? "https://shadcnweekly.com"
).replace(/\/$/u, "");

const USER_AGENT =
  "Mozilla/5.0 (compatible; ShadcnWeeklyBot/1.0; +https://shadcnweekly.com)";
const DAY_MS = 86_400_000;

export type Source = "x" | "directory" | "awesome" | "web" | "github" | "hn";

export interface Candidate {
  source: Source;
  url: string;
  title: string;
  text: string;
  date?: string;
  score?: number;
  links?: string[];
}

export interface Issue {
  issue: number;
  date: string;
  path: string;
  frontmatter: Record<string, unknown>;
  body: string;
}

export const sleep = (ms: number) => {
  const { promise, resolve } = Promise.withResolvers<undefined>();
  setTimeout(resolve, ms);
  return promise;
};

export const log = (message: string) => {
  console.error(`[newsletter] ${message}`);
};

export const warn = (message: string) => {
  console.error(
    process.env.GITHUB_ACTIONS ? `::warning::${message}` : `WARN ${message}`
  );
};

export const request = async (
  url: string,
  init: RequestInit = {},
  { retries = 3, timeoutMs = 30_000 } = {}
): Promise<Response> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- retries are sequential
      await sleep(2 ** attempt * 1000);
    }
    try {
      // oxlint-disable-next-line eslint/no-await-in-loop -- retries are sequential
      const res = await fetch(url, {
        ...init,
        headers: { "User-Agent": USER_AGENT, ...init.headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`${res.status} ${res.statusText} for ${url}`);
        continue;
      }
      return res;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

export const requestJson = async <T>(
  url: string,
  init?: RequestInit,
  options?: { retries?: number; timeoutMs?: number }
): Promise<T> => {
  const res = await request(url, init, options);
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `${res.status} ${res.statusText} for ${url}: ${detail.slice(0, 300)}`
    );
  }
  return (await res.json()) as T;
};

const TRACKING_PARAM = /^(?:utm_|ref$|ref_src$|s$|t$|si$|fbclid$|gclid$)/u;

const dropTracking = (url: URL) => {
  url.search = new URLSearchParams(
    [...url.searchParams].filter(([key]) => !TRACKING_PARAM.test(key))
  ).toString();
};

export const normalizeUrl = (raw: string): string => {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^(?:www|mobile)\./u, "");
    if (url.hostname === "twitter.com") {
      url.hostname = "x.com";
    }
    dropTracking(url);
    const path = url.pathname.replace(/\/+$/u, "");
    return `${url.protocol}//${url.hostname}${path}${url.search}`;
  } catch {
    return raw.trim();
  }
};

export const withoutTracking = (raw: string) => {
  try {
    const url = new URL(raw);
    dropTracking(url);
    return url.href;
  } catch {
    return raw;
  }
};

export const hostOf = (raw: string) => {
  try {
    return new URL(raw).hostname
      .toLowerCase()
      .replace(/^(?:www|mobile|m|old)\./u, "");
  } catch {
    return "";
  }
};

// Posts, reposts and listings *about* a project. Fine as a source, wrong as the
// destination of a project link or a tools directory entry.
const INDIRECT_HOSTS = [
  "alternativeto.net",
  "allshadcn.com",
  "bsky.app",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "mcp.directory",
  "news.ycombinator.com",
  "opensourcealternatives.to",
  "producthunt.com",
  "reddit.com",
  "registry.directory",
  "shadcn.io",
  "threads.com",
  "threads.net",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "youtu.be",
  "youtube.com",
];

export const isIndirectUrl = (raw: string) => {
  const host = hostOf(raw);
  return INDIRECT_HOSTS.some(
    (indirect) => host === indirect || host.endsWith(`.${indirect}`)
  );
};

// Social CDNs sign image URLs (`oe=`, `X-Amz-Expires=`, …); they 403 within days.
const UNSTABLE_IMAGE_HOST =
  /(?:^|\.)(?:cdninstagram\.com|fbcdn\.net|twimg\.com)$/u;
const SIGNED_IMAGE_PARAM =
  /^(?:oe|oh|expires|x-amz-expires|x-amz-signature|x-goog-expires|x-goog-signature|se|sig|signature)$/iu;

export const isStableImageUrl = (raw: string) => {
  try {
    const url = new URL(raw);
    return (
      !UNSTABLE_IMAGE_HOST.test(url.hostname) &&
      ![...url.searchParams.keys()].some((key) => SIGNED_IMAGE_PARAM.test(key))
    );
  } catch {
    return false;
  }
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "");

// "pdfcn: shadcn/ui for Document Generation" -> "pdfcn"
export const entryName = (heading: string) =>
  heading.split(/:\s/u)[0].replaceAll("\\", "").trim();

export const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export const addDays = (isoDate: string, days: number) =>
  toIsoDate(new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS));

const FRONTMATTER = /^---\n(?<yaml>[\s\S]*?)\n---\n?(?<body>[\s\S]*)$/u;

export const splitFrontmatter = (source: string) => {
  const match = FRONTMATTER.exec(source);
  if (!match?.groups) {
    throw new Error("Missing frontmatter");
  }
  return {
    body: match.groups.body,
    frontmatter: (parseYaml(match.groups.yaml) ?? {}) as Record<
      string,
      unknown
    >,
  };
};

export const readIssues = async (): Promise<Issue[]> => {
  const entries = await readdir(ARCHIVE_DIR);
  const files = entries.filter((file) => /\.mdx?$/u.test(file));
  const issues = await Promise.all(
    files.map(async (file) => {
      const path = `${ARCHIVE_DIR}/${file}`;
      const { body, frontmatter } = splitFrontmatter(
        await readFile(path, "utf-8")
      );
      return {
        body,
        date:
          frontmatter.date instanceof Date
            ? toIsoDate(frontmatter.date)
            : String(frontmatter.date),
        frontmatter,
        issue: Number(frontmatter.issue),
        path,
      };
    })
  );
  return issues.toSorted((a, b) => a.issue - b.issue);
};

export interface Tool {
  slug: string;
  title: string;
  url: string;
}

export const readTools = async (): Promise<Tool[]> => {
  const entries = await readdir(TOOLS_DIR);
  const files = entries.filter((file) => /\.mdx?$/u.test(file));
  return Promise.all(
    files.map(async (file) => {
      const { frontmatter } = splitFrontmatter(
        await readFile(`${TOOLS_DIR}/${file}`, "utf-8")
      );
      return {
        slug: file.replace(/\.mdx?$/u, ""),
        title: String(frontmatter.title),
        url: String(frontmatter.url),
      };
    })
  );
};

const URL_PATTERN = /https?:\/\/[^\s)"'<>\]]+/gu;

export const readPublishedUrls = async (): Promise<Set<string>> => {
  const paths = await Promise.all(
    [ARCHIVE_DIR, TOOLS_DIR].map(async (dir) => {
      const files = await readdir(dir);
      return files.map((file) => `${dir}/${file}`);
    })
  );
  const texts = await Promise.all(
    paths.flat().map((path) => readFile(path, "utf-8"))
  );
  const urls = new Set<string>();
  for (const text of texts) {
    for (const match of text.matchAll(URL_PATTERN)) {
      urls.add(normalizeUrl(match[0]));
    }
  }
  return urls;
};

export interface CoveredItem {
  issue: number;
  name: string;
  url: string;
}

// `### [Heading](url)` entries and `- **[Label](url)**` roundup items, as
// rendered by draft.ts. Labels escape brackets with a backslash.
const COVERED_ENTRY =
  /^(?:###\s+|-\s+\*\*)\[(?<label>(?:\\.|[^\]\\])+)\]\((?<url>[^)\s]+)\)/gmu;

export const readCoverage = async (): Promise<CoveredItem[]> => {
  const issues = await readIssues();
  return issues.flatMap((issue) =>
    [...issue.body.matchAll(COVERED_ENTRY)].map((match) => ({
      issue: issue.issue,
      name: entryName(match.groups?.label ?? ""),
      url: match.groups?.url ?? "",
    }))
  );
};

export const setOutput = async (name: string, value: string) => {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) {
    return;
  }
  if (value.includes("\n")) {
    const delimiter = `EOF_${crypto.randomUUID()}`;
    await appendFile(file, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
    return;
  }
  await appendFile(file, `${name}=${value}\n`);
};

export const requireEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
};
