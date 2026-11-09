import { writeFile } from "node:fs/promises";

import { createGoogle } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { ModelMessage } from "ai";
import {
  APICallError,
  generateText,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
} from "ai";
import { stringify as stringifyYaml } from "yaml";
import { z } from "zod";

import type {
  SponsorBooking,
  SponsorContent,
} from "../../src/constants/sponsor-bookings.ts";
import {
  HOUSE_SPONSOR,
  SPONSOR_BOOKINGS,
  weekStart,
} from "../../src/constants/sponsor-bookings.ts";
import { TOOL_CATEGORIES } from "../../src/constants/tools.ts";
import { fetchPageMeta } from "../../src/lib/page-meta.ts";
import { collectCandidates } from "./collect.ts";
import type { Candidate, CoveredItem, Issue, Tool } from "./lib.ts";
import {
  addDays,
  ARCHIVE_DIR,
  log,
  readCoverage,
  readIssues,
  readTools,
  requestJson,
  setOutput,
  sleep,
  slugify,
  toIsoDate,
  TOOLS_DIR,
  warn,
} from "./lib.ts";
import { entryName } from "./review.ts";
import {
  githubRepo,
  hostOf,
  isIndirectUrl,
  isStableImageUrl,
  namesProject,
  normalizeUrl,
} from "./urls.ts";

const LOOKBACK_DAYS = 7;
const MIN_CANDIDATES = 5;
const STYLE_EXAMPLE_CHARS = 8000;
const ATTEMPTS_PER_MODEL = 3;
// A busy or rate-limited model (429/5xx/timeout) gets one more try after a
// pause, then the next model takes over. Retrying faster only burns the free
// tiers' per-minute and per-day request caps.
const UNAVAILABLE_TRIES = 2;
const UNAVAILABLE_WAIT_MS = 90_000;
const MAX_RETRY_AFTER_MS = 300_000;
const MODEL_TIMEOUT_MS = 300_000;

// Use provider instances, not model-name strings passed directly to AI SDK:
// strings use Vercel AI Gateway, whereas these call the providers directly.
type Provider = "gemini" | "openrouter";

interface ModelRoute {
  provider: Provider;
  model: string;
  // OpenRouter tries these server-side when `model` is down or rate-limited.
  fallbacks?: string[];
}

// Large-context free models that follow JSON instructions well. They come and
// go, so only those still listed are sent; `openrouter/free` (any free model)
// is the last resort because it may pick a small, weak one.
const OPENROUTER_PREFERRED = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3.5-super-vl:free",
];
const OPENROUTER_ANY_FREE = "openrouter/free";

const DEFAULT_SUBSCRIBE_SECTION = `<SubscribeCta class="not-typeset [margin-block:4rem] [scroll-margin-block-start:4rem]" />`;

const entrySchema = z.object({
  body: z.string().min(20),
  heading: z.string().min(3),
  id: z.number().int(),
  link: z.string().optional(),
  newRelease: z.boolean().optional(),
});

const draftSchema = z.object({
  articles: z.array(entrySchema).max(6),
  description: z.string().min(20).max(300),
  highlights: z.array(z.string().min(3)).min(3).max(6),
  projects: z
    .array(
      entrySchema.extend({
        category: z.enum(TOOL_CATEGORIES),
        existingTool: z.string().nullish(),
        name: z.string().min(1),
        toolDescription: z.string().min(20).max(300),
      })
    )
    .max(10),
  related: z.array(entrySchema).max(5),
  roundup: z
    .object({
      heading: z.string().min(3),
      intro: z.string().min(10),
      items: z
        .array(
          z.object({
            id: z.number().int(),
            label: z.string().min(1),
            link: z.string().optional(),
            summary: z.string().min(10),
          })
        )
        .min(2),
    })
    .nullable(),
  title: z.string().min(5).max(80),
  top: z.array(entrySchema).min(1).max(4),
});

export type Draft = z.infer<typeof draftSchema>;

interface Entry {
  id: number;
  heading: string;
  body: string;
  link?: string;
}

const SYSTEM_PROMPT = `You are the editor of Shadcn Weekly, a newsletter about the shadcn/ui ecosystem (components, registries, blocks, templates, tooling, tutorials).

You receive this week's collected items as JSON, each with a numeric "id". Write the next issue as a single JSON object with this exact shape:

{
  "title": "2-4 headline items joined with commas and '&', max 60 chars, e.g. \\"Typeset, TermCN & CSS-in-JS\\"",
  "description": "one sentence summarising the issue",
  "highlights": ["3-6 short highlight phrases"],
  "top": [{ "id": 1, "heading": "Name: Short Tagline", "body": "1-3 short markdown paragraphs" }],
  "roundup": { "heading": "Theme of the Week", "intro": "one sentence", "items": [{ "id": 2, "label": "Name", "summary": "one sentence" }] } or null,
  "articles": [{ "id": 3, "heading": "...", "body": "1-2 sentences" }],
  "projects": [{ "id": 4, "heading": "...", "body": "1-2 sentences", "name": "Project name", "toolDescription": "one-sentence description for a tools directory", "category": "tools directory category", "existingTool": "slug from the listed tools when this is an update to one of them, otherwise null" }],
  "related": [{ "id": 5, "heading": "...", "body": "1-2 sentences" }]
}

Any "top", "articles", "projects" or "related" entry may also set "newRelease": true (see the rules).

Rules:
- Use ONLY the provided items. Reference them by "id". Never invent facts, numbers, dates or links.
- Link the project itself. When an item's "url" is a social post, repost, Reddit thread, video or listing/alternatives site, set "link" to the project's own site or repository from its "links" (written by the author) or "pageLinks" (scraped from the page; most are other projects, so pick one only if it is clearly this project). Prefer the project's homepage over its repository, a docs subpage or a changelog. Otherwise omit "link".
- Never repeat a story from a previous issue (see "Already covered"). The same product, feature or component is a repeat even under a different link: a repost, a directory or alternatives listing, someone else's examples or write-up of it. Include a covered product only when this week's item is a new version or release with new facts: set "newRelease": true on that entry and say what is new.
- Credit the author of the work, not the site that reposted, listed or wrote about it.
- Each id appears at most once in the whole issue.
- "top": 2-4 biggest stories of the week (launches, official shadcn releases, high-engagement posts).
- "roundup": optional group of 3+ related smaller updates around one theme; null if there is no theme.
- "articles": tutorials, blog posts, news coverage. "projects": libraries, registries, blocks, templates, tools (new registry directory entries belong here). "related": adjacent ecosystem items.
- "projects" may cover new releases or updates of tools already listed on the site. When a project is one of the listed tools (same product, even if renamed or linked differently), set "existingTool" to that tool's "slug"; otherwise set it to null.
- Every project sets "category" to exactly one of ${JSON.stringify(TOOL_CATEGORIES)}: "Components" for component libraries, individual components and effects; "Blocks & Templates" for page blocks, starter kits and app templates; "Themes" for theme builders, presets and styling systems; "Registries" for shadcn registries and registry directories; "Tooling" for CLIs, editor or Figma plugins, generators and developer utilities; "AI" for AI-powered tools, MCP servers and agent skills; "Apps" for products and sites built with shadcn/ui.
- Skip anything not about shadcn/ui or its ecosystem (e.g. unrelated "shading"/"shader" results), spam, giveaways, and engagement bait.
- Prefer quality over quantity: leave weak items out.
- Plain markdown only inside strings: no HTML, no JSX, no curly braces.
- Match the tone of the example issue: factual, concise, developer-focused, no hype.`;

const openRouterRoute = async (): Promise<ModelRoute> => {
  let live = new Set<string>();
  try {
    const { data } = await requestJson<{ data: { id: string }[] }>(
      "https://openrouter.ai/api/v1/models",
      {},
      { retries: 1 }
    );
    live = new Set(data.map((model) => model.id));
  } catch (error) {
    warn(`Could not list OpenRouter models: ${String(error)}`);
  }
  const [model = OPENROUTER_ANY_FREE, ...fallbacks] = [
    ...OPENROUTER_PREFERRED.filter((id) => live.has(id)),
    OPENROUTER_ANY_FREE,
  ];
  return { fallbacks, model, provider: "openrouter" };
};

// Routes whose API key is set, in order.
const modelRoutes = async (): Promise<ModelRoute[]> => {
  const routes: ModelRoute[] = [];
  if (process.env.GEMINI_API_KEY) {
    routes.push(
      { model: "gemini-3.8-flash", provider: "gemini" },
      { model: "gemini-2.5-flash-lite", provider: "gemini" }
    );
  } else {
    warn("GEMINI_API_KEY is not set, skipping Gemini");
  }
  if (process.env.OPENROUTER_API_KEY) {
    routes.push(await openRouterRoute());
  } else {
    warn("OPENROUTER_API_KEY is not set, skipping OpenRouter");
  }
  if (routes.length === 0) {
    throw new Error(
      "Set GEMINI_API_KEY or OPENROUTER_API_KEY to draft the issue"
    );
  }
  return routes;
};

const routeName = (route: ModelRoute) => `${route.provider}/${route.model}`;

const callModel = async (route: ModelRoute, messages: ModelMessage[]) => {
  const model =
    route.provider === "gemini"
      ? createGoogle({ apiKey: process.env.GEMINI_API_KEY })(route.model)
      : createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY }).chat(
          route.model,
          { models: route.fallbacks }
        );
  const result = await generateText({
    abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
    instructions: SYSTEM_PROMPT,
    // The outer loop owns paced retries and provider fallback. SDK retries
    // must stay off so one attempt means exactly one API request.
    maxRetries: 0,
    messages,
    model,
    output: Output.object({ schema: draftSchema }),
  });
  const answeredModel = result.finalStep.response.modelId;
  if (answeredModel !== route.model) {
    log(`${routeName(route)} answered with ${answeredModel}`);
  }
  return { draft: result.output, text: result.text };
};

const isModelUnavailable = (error: unknown) =>
  APICallError.isInstance(error)
    ? error.isRetryable
    : error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");

// Retry-After may be seconds or an HTTP date. Do not exceed the workflow's
// time budget by sleeping for a daily quota reset.
const retryDelay = (error: unknown) => {
  const header = APICallError.isInstance(error)
    ? error.responseHeaders?.["retry-after"]
    : undefined;
  const seconds = Number(header);
  const delay = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(header ?? "") - Date.now();
  return Math.min(
    Math.max(UNAVAILABLE_WAIT_MS, Number.isFinite(delay) ? delay : 0),
    MAX_RETRY_AFTER_MS
  );
};

// Whether a link plausibly belongs to the entry: the author wrote it, or it
// (or the GitHub repo it is the homepage of) names the project. Scraped
// listing links to other projects fail this.
const linkFits = (link: string, candidate: Candidate, name: string) =>
  Boolean(candidate.links?.includes(link)) ||
  namesProject(link, name) ||
  namesProject(candidate.homepageOf?.[link] ?? "", name);

const directLinkFor = (candidate: Candidate, name: string) => {
  const matches = [
    ...(candidate.links ?? []),
    ...(candidate.pageLinks ?? []),
  ].filter(
    (link) =>
      namesProject(link, name) ||
      namesProject(candidate.homepageOf?.[link] ?? "", name)
  );
  return matches.find((link) => hostOf(link) !== "github.com") ?? matches[0];
};

interface Dropped {
  name: string;
  issue: number;
}

// Covered names, GitHub repos and URLs -> the issue that covered them.
interface CoverageIndex {
  names: Map<string, number>;
  repos: Map<string, number>;
  urls: Map<string, number>;
}

const indexCoverage = (covered: CoveredItem[]): CoverageIndex => ({
  // Names that slugify to "" (e.g. non-Latin) would all collide; their URLs
  // are still checked.
  names: new Map(
    covered.flatMap((item) => {
      const key = slugify(item.name);
      return key ? [[key, item.issue] as const] : [];
    })
  ),
  repos: new Map(
    covered.flatMap((item) => {
      const repo = githubRepo(item.url);
      return repo ? [[repo, item.issue] as const] : [];
    })
  ),
  urls: new Map(covered.map((item) => [normalizeUrl(item.url), item.issue])),
});

// The issue that already covered this entry, if any.
const findRepeat = (
  index: CoverageIndex,
  entry: { name: string; url: string; offered: string[] },
  existingTool?: string | null
) => {
  const nameKey = slugify(entry.name);
  if (existingTool) {
    // Updates to a listed tool reuse its name and site. A covered feature
    // still repeats: "ReUI Trace" -> "Trace" (#4).
    if (nameKey === existingTool) {
      return;
    }
    const feature = nameKey.startsWith(`${existingTool}-`)
      ? nameKey.slice(existingTool.length + 1)
      : "";
    return index.names.get(nameKey) ?? index.names.get(feature);
  }
  // A renamed project keeping its repo is still the same project.
  const repos = [
    entry.url,
    ...entry.offered.filter((link) => namesProject(link, entry.name)),
  ]
    .map(githubRepo)
    .filter((repo) => repo !== undefined);
  return (
    index.names.get(nameKey) ??
    index.urls.get(normalizeUrl(entry.url)) ??
    repos
      .map((repo) => index.repos.get(repo))
      .find((issue) => issue !== undefined)
  );
};

// Keeps the model's link only if offered and plausibly this project's;
// otherwise picks a direct link that names the project.
const resolveLink = (
  entry: { link?: string },
  candidate: Candidate,
  name: string,
  offered: string[]
) => {
  if (
    entry.link &&
    (!offered.includes(entry.link) || !linkFits(entry.link, candidate, name))
  ) {
    delete entry.link;
  }
  const direct =
    !entry.link && isIndirectUrl(candidate.url)
      ? directLinkFor(candidate, name)
      : undefined;
  if (direct) {
    entry.link = direct;
  }
};

const sanitizeDraft = (
  draft: Draft,
  candidates: Candidate[],
  covered: CoveredItem[]
) => {
  const used = new Set<number>();
  const dropped: Dropped[] = [];
  const notes: string[] = [];
  const index = indexCoverage(covered);

  const keep = (
    entry: { id: number; link?: string; newRelease?: boolean },
    name: string,
    existingTool?: string | null
  ) => {
    const candidate = candidates[entry.id];
    if (!candidate || used.has(entry.id)) {
      warn(`Dropping entry with unknown or duplicate id ${entry.id}`);
      return false;
    }
    used.add(entry.id);
    const offered = [
      ...(candidate.links ?? []),
      ...(candidate.pageLinks ?? []),
    ];
    resolveLink(entry, candidate, name, offered);
    const repeatOf = findRepeat(
      index,
      { name, offered, url: entry.link ?? candidate.url },
      existingTool
    );
    if (repeatOf === undefined) {
      return true;
    }
    if (entry.newRelease) {
      notes.push(
        `"${name}" was covered in #${repeatOf}; kept as a new release, confirm it really is new`
      );
      return true;
    }
    warn(`Dropping "${name}": already covered in #${repeatOf}`);
    dropped.push({ issue: repeatOf, name });
    return false;
  };
  const byHeading = (entry: Entry) => keep(entry, entryName(entry.heading));
  const top = draft.top.filter(byHeading);
  const roundupItems =
    draft.roundup?.items.filter((item) => keep(item, item.label)) ?? [];
  return {
    draft: {
      ...draft,
      articles: draft.articles.filter(byHeading),
      projects: draft.projects.filter((project) =>
        keep(project, project.name, project.existingTool)
      ),
      related: draft.related.filter(byHeading),
      roundup:
        draft.roundup && roundupItems.length >= 2
          ? { ...draft.roundup, items: roundupItems }
          : null,
      top,
    },
    dropped,
    notes,
  };
};

// Dropped repeats the title, description or highlights still announce.
const staleMentions = (draft: Draft, dropped: Dropped[]) => {
  const summary = [draft.title, draft.description, ...draft.highlights]
    .join("\n")
    .toLowerCase();
  return dropped
    .filter((item) => summary.includes(item.name.toLowerCase()))
    .map((item) => `"${item.name}" (#${item.issue})`)
    .join(", ");
};

interface DraftResult {
  draft: Draft;
  notes: string[];
}

// One model response as a sanitized draft; `stale` lists dropped repeats its
// summary still announces.
const parseDraft = (
  output: Draft,
  candidates: Candidate[],
  covered: CoveredItem[]
) => {
  const { draft, dropped, notes } = sanitizeDraft(output, candidates, covered);
  if (draft.top.length === 0) {
    throw new Error('"top" has no valid entries');
  }
  return { draft, notes, stale: staleMentions(draft, dropped) };
};

type Messages = ModelMessage[];

interface RouteContext {
  candidates: Candidate[];
  covered: CoveredItem[];
  errors: string[];
  // A valid draft whose summary still names dropped repeats; used only if
  // no model produces a clean one.
  fallback?: DraftResult;
}

// A model answer as a clean draft; throws when it is invalid or its summary
// still names dropped repeats (keeping that draft as the fallback).
const finishDraft = (output: Draft, context: RouteContext) => {
  const { draft, notes, stale } = parseDraft(
    output,
    context.candidates,
    context.covered
  );
  if (!stale) {
    return { draft, notes };
  }
  context.fallback = {
    draft,
    notes: [
      ...notes,
      `Title, description or highlights still mention ${stale}, dropped as a repeat; rewrite them`,
    ],
  };
  throw new Error(
    `These entries repeat previous issues and were removed: ${stale}. Leave them out and rewrite the title, description and highlights without them.`
  );
};

// Schema-invalid and empty SDK output can be corrected. A rejected API call
// with no generated content (e.g. 401) should move to the next route instead.
const addValidationFeedback = (
  messages: Messages,
  error: unknown,
  content: string,
  message: string
) => {
  const invalidObject = NoObjectGeneratedError.isInstance(error);
  const text = invalidObject ? (error.text ?? "") : content;
  if (!text && !invalidObject && !NoOutputGeneratedError.isInstance(error)) {
    return false;
  }
  if (text) {
    messages.push({ content: text, role: "assistant" });
  }
  messages.push({
    content: `That response was invalid: ${message.slice(0, 2000)}\nReturn the corrected JSON object only.`,
    role: "user",
  });
  return true;
};

// Up to ATTEMPTS_PER_MODEL tries on one model: invalid drafts are retried
// with the error, an unavailable model once after a pause, and an outright
// rejection (bad key, unknown model, prompt too long) moves on.
const draftWithRoute = async (
  route: ModelRoute,
  messages: Messages,
  context: RouteContext
): Promise<DraftResult | undefined> => {
  const name = routeName(route);
  let unavailable = 0;
  let attempt = 1;
  let next = true;
  while (next && attempt <= ATTEMPTS_PER_MODEL) {
    let content = "";
    try {
      // oxlint-disable-next-line eslint/no-await-in-loop -- each retry depends on the previous answer
      const generated = await callModel(route, messages);
      content = generated.text;
      const result = finishDraft(generated.draft, context);
      log(`Draft written by ${name} (attempt ${attempt})`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      context.errors.push(`${name}#${attempt}: ${message.slice(0, 500)}`);
      warn(`Draft attempt failed (${name} #${attempt}): ${message}`);
      if (isModelUnavailable(error)) {
        unavailable += 1;
        next = unavailable < UNAVAILABLE_TRIES && attempt < ATTEMPTS_PER_MODEL;
        if (next) {
          const waitMs = retryDelay(error);
          log(`Waiting ${Math.round(waitMs / 1000)}s before retrying ${name}`);
          // oxlint-disable-next-line eslint/no-await-in-loop -- paced retry
          await sleep(waitMs);
        }
      } else {
        next = addValidationFeedback(messages, error, content, message);
      }
    }
    attempt += 1;
  }
  return undefined;
};

const writeDraft = async (
  candidates: Candidate[],
  tools: Tool[],
  covered: CoveredItem[],
  styleExample: string
): Promise<DraftResult> => {
  const routes = await modelRoutes();
  const items = candidates.map((candidate, id) => ({ id, ...candidate }));
  const prompt = `Example of a previous issue (style reference only, do not reuse its items):\n\n${styleExample.slice(0, STYLE_EXAMPLE_CHARS)}\n\nTools already listed on the site:\n\n${JSON.stringify(tools)}\n\nAlready covered in previous issues:\n\n${JSON.stringify(covered)}\n\nThis week's items:\n\n${JSON.stringify(items)}`;
  const context: RouteContext = { candidates, covered, errors: [] };

  for (const route of routes) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- models are tried in order
    const result = await draftWithRoute(
      route,
      [{ content: prompt, role: "user" }],
      context
    );
    if (result) {
      return result;
    }
  }
  if (context.fallback) {
    warn("Using a draft whose summary still mentions dropped repeats");
    return context.fallback;
  }
  throw new Error(
    `Could not produce a valid draft:\n${context.errors.join("\n")}`
  );
};

const mdxText = (text: string) =>
  text
    .split(/(?<code>`[^`]*`)/u)
    .map((part) =>
      part.startsWith("`")
        ? part
        : part
            .replaceAll("{", "&#123;")
            .replaceAll("}", "&#125;")
            .replaceAll("<", "&lt;")
    )
    .join("")
    .trim();

const linkLabel = (text: string) =>
  mdxText(text).replaceAll("[", "\\[").replaceAll("]", "\\]");

const urlFor = (
  entry: { id: number; link?: string },
  candidates: Candidate[]
) =>
  (entry.link ?? candidates[entry.id].url)
    .replaceAll("(", "%28")
    .replaceAll(")", "%29")
    .replaceAll(" ", "%20");

const entryBlock = (entry: Entry, candidates: Candidate[]) =>
  `### [${linkLabel(entry.heading)}](${urlFor(entry, candidates)})\n\n${mdxText(entry.body)}`;

const section = (heading: string, entries: Entry[], candidates: Candidate[]) =>
  entries.length === 0
    ? []
    : [
        `## ${heading}\n\n${entries.map((entry) => entryBlock(entry, candidates)).join("\n\n")}`,
      ];

const componentPattern = (name: string) =>
  new RegExp(`<${name}\\b[\\s\\S]*?\\/>`, "u");

export interface IssueSponsors {
  primary: SponsorContent;
  primaryBooked: boolean;
  secondary?: SponsorContent;
}

export const pickSponsors = (
  date: string,
  bookings: SponsorBooking[] = SPONSOR_BOOKINGS
): IssueSponsors => {
  const week = weekStart(date);
  const booked = (placement: SponsorBooking["placement"]) => {
    const matches = bookings.filter(
      (booking) =>
        booking.placement === placement &&
        booking.weeks.some((day) => weekStart(day) === week)
    );
    if (matches.length > 1) {
      warn(
        `${matches.length} ${placement} sponsor bookings for the week of ${week}; using the first`
      );
    }
    return matches.at(0);
  };
  const primary = booked("primary");
  return {
    primary: primary ?? HOUSE_SPONSOR,
    primaryBooked: Boolean(primary),
    secondary: booked("secondary"),
  };
};

// Sponsor values may contain quotes; `&quot;` keeps the attribute extractable
// (see src/lib/kit.ts and src/pages/issues/[...slug].md.ts) and MDX decodes it.
const escapeAttribute = (value: string) => value.replaceAll('"', "&quot;");

const sponsorComponent = (sponsor: SponsorContent) => {
  const attributes = (
    ["website", "name", "title", "description", "image"] as const
  )
    .filter((key) => sponsor[key])
    .map((key) => `  ${key}="${escapeAttribute(String(sponsor[key]))}"`);
  return `<ArchiveSponsorSection\n${attributes.join("\n")}\n/>`;
};

export const renderIssueMdx = (
  draft: Draft,
  candidates: Candidate[],
  meta: {
    issue: number;
    date: string;
    sponsors: IssueSponsors;
    previous?: Issue;
  }
): string => {
  const { sponsors } = meta;
  const frontmatter = stringifyYaml({
    date: meta.date,
    description: draft.description,
    highlights: draft.highlights,
    issue: meta.issue,
    sponsor: sponsors.primary.website,
    title: draft.title,
  }).trim();

  const subscribeBlock =
    meta.previous?.body.match(componentPattern("SubscribeCta"))?.[0] ??
    DEFAULT_SUBSCRIBE_SECTION;

  const lead = draft.top.map((entry) => entryBlock(entry, candidates));
  if (draft.roundup) {
    const items = draft.roundup.items.map(
      (item) =>
        `- **[${linkLabel(item.label)}](${urlFor(item, candidates)})** ${mdxText(item.summary)}`
    );
    lead.push(
      `## ${mdxText(draft.roundup.heading)}\n\n${mdxText(draft.roundup.intro)}\n\n${items.join("\n")}`
    );
  }

  const middle = `${sponsorComponent(sponsors.primary)}\n\n${subscribeBlock}`;
  const sections = [
    ...section("📙 Articles, Tutorials & News", draft.articles, candidates),
    ...section("📦 Projects, Packages & Tools", draft.projects, candidates),
    ...(sponsors.secondary ? [sponsorComponent(sponsors.secondary)] : []),
    ...section("🌈 Related", draft.related, candidates),
  ];

  return `---\n${frontmatter}\n---\n\n${lead.join("\n\n---\n\n")}\n\n${middle}\n\n${sections.join("\n\n---\n\n")}\n`;
};

// Identifies a project's site: the GitHub repo, the full URL on hosts shared
// by many projects, otherwise the hostname.
const SHARED_HOSTS = new Set(["figma.com", "gitlab.com", "npmjs.com"]);
const siteKey = (url: string) => {
  const repo = githubRepo(url);
  if (repo) {
    return `github.com/${repo}`;
  }
  const host = hostOf(url);
  return SHARED_HOSTS.has(host) ? normalizeUrl(url) : host;
};

const writeTools = async (
  draft: Draft,
  candidates: Candidate[],
  tools: Tool[],
  issue: number
) => {
  const listedSlugs = new Set(
    tools.flatMap((tool) => [tool.slug, slugify(tool.title)])
  );
  const listedSites = new Set(
    tools
      .filter((tool) => !isIndirectUrl(tool.url))
      .map((tool) => siteKey(tool.url))
  );

  const bySlug = new Map(
    draft.projects.map((project) => [slugify(project.name), project])
  );
  const fresh = [...bySlug].filter(([slug, project]) => {
    const url = project.link ?? candidates[project.id].url;
    if (isIndirectUrl(url)) {
      warn(`Tool ${slug} has no direct link (${url}), not listing it`);
      return false;
    }
    const listed =
      (project.existingTool && listedSlugs.has(project.existingTool)) ||
      listedSlugs.has(slug) ||
      listedSites.has(siteKey(url));
    if (listed) {
      log(`Tool ${project.existingTool ?? slug} already listed, skipping`);
    }
    return slug && !listed;
  });
  await Promise.all(
    fresh.map(async ([slug, project]) => {
      const url = project.link ?? candidates[project.id].url;
      const { image } = await fetchPageMeta(url);
      const frontmatter = stringifyYaml({
        category: project.category,
        description: project.toolDescription,
        ...(image && isStableImageUrl(image) ? { image } : {}),
        issue,
        title: project.name,
        url,
      }).trim();
      await writeFile(`${TOOLS_DIR}/${slug}.md`, `---\n${frontmatter}\n---\n`);
      log(`Wrote tool ${slug}`);
    })
  );
};

const main = async () => {
  const dryRun = process.argv.includes("--dry-run");
  const today = process.env.ISSUE_DATE ?? toIsoDate(new Date());
  const issues = await readIssues();
  const previous = issues.at(-1);

  const existing = issues.find((issue) => issue.date === today);
  if (existing) {
    log(`Issue #${existing.issue} for ${today} already exists, skipping draft`);
    await setOutput("issue", String(existing.issue));
    return;
  }

  const issue = (previous?.issue ?? 0) + 1;
  const floor = addDays(today, -LOOKBACK_DAYS);
  const since = previous && previous.date > floor ? previous.date : floor;
  log(`Drafting issue #${issue} for ${today} from items since ${since}`);

  const candidates = await collectCandidates(since);
  log(`${candidates.length} candidates after dedupe`);
  if (candidates.length < MIN_CANDIDATES) {
    throw new Error(
      `Only ${candidates.length} candidates collected; sources look broken`
    );
  }
  if (dryRun) {
    console.log(JSON.stringify(candidates, null, 2));
    return;
  }

  const [tools, covered] = await Promise.all([readTools(), readCoverage()]);
  const { draft, notes } = await writeDraft(
    candidates,
    tools,
    covered,
    previous?.body ?? ""
  );
  const sponsors = pickSponsors(today);
  await writeFile(
    `${ARCHIVE_DIR}/${issue}.mdx`,
    renderIssueMdx(draft, candidates, {
      date: today,
      issue,
      previous,
      sponsors,
    })
  );
  await writeTools(draft, candidates, tools, issue);
  await setOutput("issue", String(issue));
  await setOutput("title", draft.title.replaceAll("\n", " "));
  await setOutput(
    "sponsors",
    `1st: ${sponsors.primary.website}${sponsors.primaryBooked ? "" : " (house, no booking)"} · 2nd: ${sponsors.secondary?.website ?? "none booked"}`
  );
  for (const note of notes) {
    warn(note);
  }
  await setOutput("notes", notes.map((note) => `- ${note}`).join("\n"));
  log(`Wrote ${ARCHIVE_DIR}/${issue}.mdx`);
};

if (process.argv[1] === import.meta.filename) {
  await main();
}
