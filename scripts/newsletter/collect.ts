import type { Candidate } from "./lib.ts";
import {
  log,
  normalizeUrl,
  readPublishedUrls,
  request,
  requestJson,
  warn,
} from "./lib.ts";

const MAX_PER_SOURCE = 60;

const toUnix = (isoDate: string) =>
  Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 1000);

interface FxPost {
  url: string;
  text: string;
  raw_text?: { facets?: { type: string; replacement?: string }[] };
  author: { screen_name: string; name: string };
  likes: number;
  reposts: number;
  created_timestamp: number;
  replying_to: string | null;
}

interface FxPage {
  results?: FxPost[];
  cursor?: { bottom?: string };
}

const X_QUERIES = [
  "shadcn filter:links -filter:replies min_faves:15",
  "shadcn -filter:replies min_faves:80",
  '"shadcn/ui" -filter:replies min_faves:10',
  "shadcn registry -filter:replies min_faves:5",
];
const X_ACCOUNTS = ["shadcn"];
const X_PAGES_PER_QUERY = 3;
const FX_API = "https://api.fxtwitter.com/2";

const fxPostToCandidate = (post: FxPost): Candidate => ({
  date: new Date(post.created_timestamp * 1000).toISOString(),
  links: (post.raw_text?.facets ?? [])
    .filter((facet) => facet.type === "url" && facet.replacement)
    .map((facet) => facet.replacement as string),
  score: post.likes + 2 * post.reposts,
  source: "x",
  text: post.text.slice(0, 600),
  title: `${post.author.name} (@${post.author.screen_name})`,
  url: post.url,
});

const collectX = async (since: string): Promise<Candidate[]> => {
  const sinceTs = toUnix(since);
  const searchPages = async (query: string) => {
    const posts: FxPost[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < X_PAGES_PER_QUERY; page += 1) {
      const params = new URLSearchParams({ q: `${query} since:${since}` });
      if (cursor) {
        params.set("cursor", cursor);
      }
      // oxlint-disable-next-line eslint/no-await-in-loop -- cursor pagination is sequential
      const data = await requestJson<FxPage>(`${FX_API}/search?${params}`);
      posts.push(...(data.results ?? []));
      cursor = data.cursor?.bottom;
      if (!cursor || !data.results?.length) {
        break;
      }
    }
    return posts;
  };
  const accountPosts = async (account: string) => {
    const data = await requestJson<FxPage>(
      `${FX_API}/profile/${account}/statuses`
    );
    return data.results ?? [];
  };
  const results = await Promise.all([
    ...X_QUERIES.map(searchPages),
    ...X_ACCOUNTS.map(accountPosts),
  ]);

  return results
    .flat()
    .filter((post) => !post.replying_to && post.created_timestamp >= sinceTs)
    .map(fxPostToCandidate);
};

interface DirectoryEntry {
  name: string;
  homepage: string;
  description: string;
}

const DIRECTORY_REPO = "shadcn-ui/ui";
const DIRECTORY_PATH = "apps/v4/registry/directory.json";

const githubHeaders = (): Record<string, string> =>
  process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {};

const collectDirectory = async (since: string): Promise<Candidate[]> => {
  const commits = await requestJson<{ sha: string }[]>(
    `https://api.github.com/repos/${DIRECTORY_REPO}/commits?path=${DIRECTORY_PATH}&until=${since}T00:00:00Z&per_page=1`,
    { headers: githubHeaders() }
  );
  const baseline = commits[0]?.sha;
  if (!baseline) {
    throw new Error(`No ${DIRECTORY_PATH} commit before ${since}`);
  }
  const raw = (ref: string) =>
    requestJson<DirectoryEntry[]>(
      `https://raw.githubusercontent.com/${DIRECTORY_REPO}/${ref}/${DIRECTORY_PATH}`
    );
  const [before, current] = await Promise.all([raw(baseline), raw("main")]);
  const known = new Set(before.map((entry) => entry.name));

  return current
    .filter((entry) => !known.has(entry.name))
    .map((entry) => ({
      source: "directory",
      text: entry.description,
      title: `${entry.name} (new in the official shadcn/ui registry directory)`,
      url: entry.homepage,
    }));
};

const AWESOME_README =
  "https://raw.githubusercontent.com/birobirobiro/awesome-shadcn-ui/main/README.md";
const AWESOME_ROW =
  /^\|\s*(?<name>[^|]+?)\s*\|\s*(?<description>[^|]*?)\s*\|\s*\[Link\]\((?<url>[^)]+)\)\s*\|\s*(?<date>[^|]+?)\s*\|$/u;

const collectAwesome = async (since: string): Promise<Candidate[]> => {
  const res = await request(AWESOME_README);
  if (!res.ok) {
    throw new Error(`${res.status} fetching awesome-shadcn-ui README`);
  }
  const sinceMs = Date.parse(`${since}T00:00:00Z`);
  const candidates: Candidate[] = [];
  let category = "";

  const readme = await res.text();
  for (const line of readme.split("\n")) {
    if (line.startsWith("## ")) {
      category = line.slice(3).trim();
      continue;
    }
    const row = AWESOME_ROW.exec(line)?.groups;
    if (row && Date.parse(row.date) >= sinceMs) {
      candidates.push({
        date: row.date,
        source: "awesome",
        text: row.description,
        title: `${row.name} (awesome-shadcn-ui: ${category})`,
        url: row.url,
      });
    }
  }
  return candidates;
};

const WEB_QUERIES = [
  "shadcn",
  "shadcn/ui",
  "shadcn ui components",
  "shadcn registry",
  "shadcn tutorial",
];

interface TinyFishResult {
  title: string;
  snippet?: string;
  url: string;
  date?: string;
}

const searchTinyFish = async (
  apiKey: string,
  since: string
): Promise<Candidate[]> => {
  const searches = [
    ...WEB_QUERIES.map((query) => ({ domain_type: "web", query })),
    { domain_type: "news", query: "shadcn" },
  ];
  const pages = await Promise.all(
    searches.map((search) => {
      const params = new URLSearchParams({ ...search, after_date: since });
      return requestJson<{ results?: TinyFishResult[] }>(
        `https://api.search.tinyfish.ai?${params}`,
        { headers: { "X-API-Key": apiKey } }
      );
    })
  );
  return pages.flatMap((page) =>
    (page.results ?? []).map((result) => ({
      date: result.date,
      source: "web" as const,
      text: result.snippet ?? "",
      title: result.title,
      url: result.url,
    }))
  );
};

const searchFirecrawl = async (apiKey: string): Promise<Candidate[]> => {
  const pages = await Promise.all(
    WEB_QUERIES.map((query) =>
      requestJson<{
        data?: {
          web?: { url: string; title: string; description?: string }[];
        };
      }>("https://api.firecrawl.dev/v2/search", {
        body: JSON.stringify({ limit: 10, query, tbs: "qdr:w" }),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      })
    )
  );
  return pages.flatMap((page) =>
    (page.data?.web ?? []).map((result) => ({
      source: "web" as const,
      text: result.description ?? "",
      title: result.title,
      url: result.url,
    }))
  );
};

const collectSearch = async (since: string): Promise<Candidate[]> => {
  const tinyfishKey = process.env.TINYFISH_API_KEY;
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (tinyfishKey) {
    try {
      return await searchTinyFish(tinyfishKey, since);
    } catch (error) {
      if (!firecrawlKey) {
        throw error;
      }
      warn(`TinyFish failed, falling back to Firecrawl: ${String(error)}`);
    }
  }
  if (firecrawlKey) {
    return searchFirecrawl(firecrawlKey);
  }
  throw new Error("Set TINYFISH_API_KEY (or FIRECRAWL_API_KEY) for web search");
};

interface HnHit {
  objectID: string;
  title: string;
  url: string | null;
  points: number;
  created_at: string;
}

const collectHackerNews = async (since: string): Promise<Candidate[]> => {
  const data = await requestJson<{ hits: HnHit[] }>(
    `https://hn.algolia.com/api/v1/search_by_date?query=shadcn&tags=story&hitsPerPage=50&numericFilters=created_at_i>${toUnix(since)}`
  );
  return data.hits.map((hit) => ({
    date: hit.created_at,
    score: hit.points,
    source: "hn",
    text: `Hacker News story (${hit.points} points)`,
    title: hit.title,
    url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
  }));
};

interface GithubRepo {
  html_url: string;
  full_name: string;
  description: string | null;
  homepage: string | null;
  stargazers_count: number;
  created_at: string;
}

const MIN_REPO_STARS = 10;

const collectGithub = async (since: string): Promise<Candidate[]> => {
  const data = await requestJson<{ items: GithubRepo[] }>(
    `https://api.github.com/search/repositories?q=shadcn+created:>=${since}&sort=stars&order=desc&per_page=30`,
    { headers: githubHeaders() }
  );
  return data.items
    .filter((repo) => repo.stargazers_count >= MIN_REPO_STARS)
    .map((repo) => ({
      date: repo.created_at,
      links: repo.homepage ? [repo.homepage] : [],
      score: repo.stargazers_count,
      source: "github",
      text: `${repo.description ?? ""} (${repo.stargazers_count} stars)`,
      title: repo.full_name,
      url: repo.html_url,
    }));
};

const COLLECTORS = {
  awesome: collectAwesome,
  directory: collectDirectory,
  github: collectGithub,
  hn: collectHackerNews,
  web: collectSearch,
  x: collectX,
} satisfies Record<string, (since: string) => Promise<Candidate[]>>;

export const collectCandidates = async (
  since: string
): Promise<Candidate[]> => {
  const entries = Object.entries(COLLECTORS);
  const settled = await Promise.allSettled(
    entries.map(([, collect]) => collect(since))
  );

  const published = await readPublishedUrls();
  const byUrl = new Map<string, Candidate>();

  for (const [index, result] of settled.entries()) {
    const [name] = entries[index];
    if (result.status === "rejected") {
      warn(`Source "${name}" failed: ${String(result.reason)}`);
      continue;
    }
    log(`Source "${name}": ${result.value.length} items`);
    for (const candidate of result.value) {
      const alreadyPublished = [candidate.url, ...(candidate.links ?? [])].some(
        (url) => published.has(normalizeUrl(url))
      );
      if (alreadyPublished) {
        continue;
      }
      const key = normalizeUrl(candidate.url);
      const existingScore = byUrl.get(key)?.score ?? -1;
      if ((candidate.score ?? 0) > existingScore) {
        byUrl.set(key, candidate);
      }
    }
  }

  const bySource = Map.groupBy(byUrl.values(), (candidate) => candidate.source);
  return [...bySource.values()].flatMap((items) =>
    items
      .toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, MAX_PER_SOURCE)
  );
};
