import { writeFile } from "node:fs/promises";

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
  entryName,
  hostOf,
  isIndirectUrl,
  isStableImageUrl,
  log,
  normalizeUrl,
  readCoverage,
  readIssues,
  readTools,
  requestJson,
  requireEnv,
  setOutput,
  slugify,
  toIsoDate,
  TOOLS_DIR,
  warn,
} from "./lib.ts";

const LOOKBACK_DAYS = 7;
const MIN_CANDIDATES = 5;
const STYLE_EXAMPLE_CHARS = 8000;
const ATTEMPTS_PER_MODEL = 3;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash"];

const DEFAULT_SUBSCRIBE_SECTION = `<SubscribeCta class="not-typeset [margin-block:4rem] [scroll-margin-block-start:4rem]" />`;

const entrySchema = z.object({
  body: z.string().min(20),
  heading: z.string().min(3),
  id: z.number().int(),
  link: z.string().optional(),
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

Rules:
- Use ONLY the provided items. Reference them by "id". Never invent facts, numbers, dates or links.
- Link the project itself. When an item's "url" is a social post, repost, Reddit thread, video or listing/alternatives site and one of its "links" is the project's own site or repository, set "link" to it. Prefer the project's homepage over its repository, a docs subpage or a changelog. Otherwise omit "link".
- Never repeat a story from a previous issue (see "Already covered"). The same product, feature or component is a repeat even under a different link: a repost, a directory or alternatives listing, someone else's examples or write-up of it. Include a covered product only when this week's item is a new version or release with new facts, and say what is new.
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

const callModel = async (
  model: string,
  messages: { role: string; content: string }[]
): Promise<string> => {
  const data = await requestJson<{
    choices?: { message?: { content?: string } }[];
  }>(
    GEMINI_URL,
    {
      body: JSON.stringify({
        messages,
        model,
        response_format: { type: "json_object" },
      }),
      headers: {
        Authorization: `Bearer ${requireEnv("GEMINI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
    { retries: 5, timeoutMs: 300_000 }
  );
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Model returned no content");
  }
  return content.replaceAll(/^```(?:json)?\s*|\s*```$/gu, "");
};

// Prefer a direct link whose URL names the project: an alternatives listing
// links many unrelated sites, so "the only link" is not safe to pick blindly.
const directLinkFor = (candidate: Candidate, name: string) => {
  const key = slugify(name).replaceAll("-", "");
  if (key.length < 3) {
    return;
  }
  const matches = (candidate.links ?? []).filter(
    (link) =>
      !isIndirectUrl(link) && slugify(link).replaceAll("-", "").includes(key)
  );
  return matches.find((link) => hostOf(link) !== "github.com") ?? matches[0];
};

const sanitizeDraft = (
  draft: Draft,
  candidates: Candidate[],
  covered: CoveredItem[]
): Draft => {
  const used = new Set<number>();
  const coveredNames = new Map(
    covered.map((item) => [slugify(item.name), item.issue])
  );
  const coveredUrls = new Map(
    covered.map((item) => [normalizeUrl(item.url), item.issue])
  );
  const keep = (
    entry: { id: number; link?: string },
    name: string,
    existingTool?: string | null
  ) => {
    const candidate = candidates[entry.id];
    if (!candidate || used.has(entry.id)) {
      warn(`Dropping entry with unknown or duplicate id ${entry.id}`);
      return false;
    }
    used.add(entry.id);
    if (entry.link && !candidate.links?.includes(entry.link)) {
      delete entry.link;
    }
    const direct =
      !entry.link && isIndirectUrl(candidate.url)
        ? directLinkFor(candidate, name)
        : undefined;
    if (direct) {
      entry.link = direct;
    }
    const nameKey = slugify(name);
    let repeatOf: number | undefined;
    if (!existingTool) {
      repeatOf =
        coveredNames.get(nameKey) ??
        coveredUrls.get(normalizeUrl(entry.link ?? candidate.url));
    } else if (nameKey.startsWith(`${existingTool}-`)) {
      // "ReUI Trace" updating the ReUI tool: "Trace" itself may be covered.
      repeatOf = coveredNames.get(nameKey.slice(existingTool.length + 1));
    }
    if (repeatOf !== undefined) {
      warn(`Dropping "${name}": already covered in #${repeatOf}`);
      return false;
    }
    return true;
  };
  const byHeading = (entry: Entry) => keep(entry, entryName(entry.heading));
  const top = draft.top.filter(byHeading);
  const roundupItems =
    draft.roundup?.items.filter((item) => keep(item, item.label)) ?? [];
  return {
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
  };
};

// Entries the PR reviewer must fix by hand: no direct link could be found.
const reviewNotes = (draft: Draft, candidates: Candidate[]) =>
  [
    ...draft.top.map((entry) => ({ ...entry, label: entry.heading })),
    ...(draft.roundup?.items ?? []),
    ...draft.projects.map((entry) => ({ ...entry, label: entry.heading })),
  ].flatMap((entry) => {
    const url = entry.link ?? candidates[entry.id].url;
    return isIndirectUrl(url)
      ? [
          `"${entryName(entry.label)}" links to ${url}, not the project; replace it with the project's own site`,
        ]
      : [];
  });

const writeDraft = async (
  candidates: Candidate[],
  tools: Tool[],
  covered: CoveredItem[],
  styleExample: string
): Promise<Draft> => {
  const models = process.env.LLM_MODEL
    ? [process.env.LLM_MODEL]
    : DEFAULT_MODELS;
  const items = candidates.map((candidate, id) => ({ id, ...candidate }));
  const errors: string[] = [];

  for (const model of models) {
    const messages = [
      { content: SYSTEM_PROMPT, role: "system" },
      {
        content: `Example of a previous issue (style reference only, do not reuse its items):\n\n${styleExample.slice(0, STYLE_EXAMPLE_CHARS)}\n\nTools already listed on the site:\n\n${JSON.stringify(tools)}\n\nAlready covered in previous issues:\n\n${JSON.stringify(covered)}\n\nThis week's items:\n\n${JSON.stringify(items)}`,
        role: "user",
      },
    ];
    for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt += 1) {
      let content = "";
      try {
        // oxlint-disable-next-line eslint/no-await-in-loop -- each retry feeds back the previous error
        content = await callModel(model, messages);
        const draft = sanitizeDraft(
          draftSchema.parse(JSON.parse(content)),
          candidates,
          covered
        );
        if (draft.top.length === 0) {
          throw new Error('"top" has no valid entries');
        }
        log(`Draft written by ${model} (attempt ${attempt})`);
        return draft;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${model}#${attempt}: ${message.slice(0, 500)}`);
        warn(`Draft attempt failed (${model} #${attempt}): ${message}`);
        if (content) {
          messages.push(
            { content, role: "assistant" },
            {
              content: `That response was invalid: ${message.slice(0, 2000)}\nReturn the corrected JSON object only.`,
              role: "user",
            }
          );
        }
      }
    }
  }
  throw new Error(`Could not produce a valid draft:\n${errors.join("\n")}`);
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
  const host = hostOf(url);
  if (host === "github.com") {
    const [owner = "", repo = ""] = new URL(url).pathname
      .split("/")
      .filter(Boolean);
    return `${host}/${owner}/${repo}`.toLowerCase();
  }
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
  const draft = await writeDraft(
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
  const review = reviewNotes(draft, candidates);
  for (const note of review) {
    warn(note);
  }
  await setOutput("review", review.map((note) => `- ${note}`).join("\n"));
  log(`Wrote ${ARCHIVE_DIR}/${issue}.mdx`);
};

if (process.argv[1] === import.meta.filename) {
  await main();
}
