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
  /** Engagement signal (likes, stars, points); higher is more notable. */
  score?: number;
  /** Extra links found alongside the item (e.g. URLs inside a post). */
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

// Logs go to stderr so stdout stays clean for `--dry-run` JSON output.
export const log = (message: string) => {
  console.error(`[newsletter] ${message}`);
};

export const warn = (message: string) => {
  // GitHub Actions renders `::warning::` as an annotation on the run.
  console.error(
    process.env.GITHUB_ACTIONS ? `::warning::${message}` : `WARN ${message}`
  );
};

/** fetch with timeout and exponential backoff on network errors, 429 and 5xx. */
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

/** Canonical form used for deduplication; never shown to readers. */
export const normalizeUrl = (raw: string): string => {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^(?:www|mobile)\./u, "");
    if (url.hostname === "twitter.com") {
      url.hostname = "x.com";
    }
    url.search = new URLSearchParams(
      [...url.searchParams].filter(([key]) => !TRACKING_PARAM.test(key))
    ).toString();
    const path = url.pathname.replace(/\/+$/u, "");
    return `${url.protocol}//${url.hostname}${path}${url.search}`;
  } catch {
    return raw.trim();
  }
};

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

/** All archive issues, oldest first. */
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

const URL_PATTERN = /https?:\/\/[^\s)"'<>\]]+/gu;

/** Every URL already published in an issue or listed as a tool. */
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

/** Expose a step output to later GitHub Actions steps; no-op locally. */
export const setOutput = async (name: string, value: string) => {
  const file = process.env.GITHUB_OUTPUT;
  if (file) {
    await appendFile(file, `${name}=${value}\n`);
  }
};

export const requireEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
};
