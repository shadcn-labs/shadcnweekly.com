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
import { fetchPageMeta } from "../../src/lib/page-meta.ts";
import { collectCandidates } from "./collect.ts";
import type { Candidate, Issue, Tool } from "./lib.ts";
import {
  addDays,
  ARCHIVE_DIR,
  log,
  normalizeUrl,
  readIssues,
  readTools,
  requestJson,
  requireEnv,
  setOutput,
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

const DEFAULT_SUBSCRIBE_SECTION = `<SubscribeSection
  class="not-typeset border px-4 py-4 rounded-lg bg-muted [margin-block:calc(var(--typeset-flow)*1.4)] [scroll-margin-block-start:calc(var(--typeset-flow)*1.4)]"
  formClass="mt-3"
/>`;

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
  "projects": [{ "id": 4, "heading": "...", "body": "1-2 sentences", "name": "Project name", "toolDescription": "one-sentence description for a tools directory", "existingTool": "slug from the listed tools when this is an update to one of them, otherwise null" }],
  "related": [{ "id": 5, "heading": "...", "body": "1-2 sentences" }]
}

Rules:
- Use ONLY the provided items. Reference them by "id". Never invent facts, numbers, dates or links.
- Every entry may set "link" to one of that item's "links" when it is the better destination (e.g. the product site an X post announces). Otherwise omit "link".
- Each id appears at most once in the whole issue.
- "top": 2-4 biggest stories of the week (launches, official shadcn releases, high-engagement posts).
- "roundup": optional group of 3+ related smaller updates around one theme; null if there is no theme.
- "articles": tutorials, blog posts, news coverage. "projects": libraries, registries, blocks, templates, tools (new registry directory entries belong here). "related": adjacent ecosystem items.
- "projects" may cover new releases or updates of tools already listed on the site. When a project is one of the listed tools (same product, even if renamed or linked differently), set "existingTool" to that tool's "slug"; otherwise set it to null.
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

const sanitizeDraft = (draft: Draft, candidates: Candidate[]): Draft => {
  const used = new Set<number>();
  const keep = <T extends { id: number; link?: string }>(entry: T) => {
    const candidate = candidates[entry.id];
    if (!candidate || used.has(entry.id)) {
      warn(`Dropping entry with unknown or duplicate id ${entry.id}`);
      return false;
    }
    used.add(entry.id);
    if (entry.link && !candidate.links?.includes(entry.link)) {
      delete entry.link;
    }
    return true;
  };
  const top = draft.top.filter(keep);
  const roundupItems = draft.roundup?.items.filter(keep) ?? [];
  return {
    ...draft,
    articles: draft.articles.filter(keep),
    projects: draft.projects.filter(keep),
    related: draft.related.filter(keep),
    roundup:
      draft.roundup && roundupItems.length >= 2
        ? { ...draft.roundup, items: roundupItems }
        : null,
    top,
  };
};

const writeDraft = async (
  candidates: Candidate[],
  tools: Tool[],
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
        content: `Example of a previous issue (style reference only, do not reuse its items):\n\n${styleExample.slice(0, STYLE_EXAMPLE_CHARS)}\n\nTools already listed on the site:\n\n${JSON.stringify(tools)}\n\nThis week's items:\n\n${JSON.stringify(items)}`,
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
          candidates
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

const sponsorComponent = (sponsor: SponsorContent) => {
  const attributes = (
    ["website", "name", "title", "description", "image"] as const
  )
    .filter((key) => sponsor[key])
    .map((key) => `  ${key}={${JSON.stringify(sponsor[key])}}`);
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
    meta.previous?.body.match(componentPattern("SubscribeSection"))?.[0] ??
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

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "");

const writeTools = async (
  draft: Draft,
  candidates: Candidate[],
  tools: Tool[],
  issue: number
) => {
  const listedSlugs = new Set(
    tools.flatMap((tool) => [tool.slug, slugify(tool.title)])
  );
  const listedUrls = new Set(tools.map((tool) => normalizeUrl(tool.url)));

  const bySlug = new Map(
    draft.projects.map((project) => [slugify(project.name), project])
  );
  const fresh = [...bySlug].filter(([slug, project]) => {
    const url = project.link ?? candidates[project.id].url;
    const listed =
      (project.existingTool && listedSlugs.has(project.existingTool)) ||
      listedSlugs.has(slug) ||
      listedUrls.has(normalizeUrl(url));
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
        description: project.toolDescription,
        ...(image ? { image } : {}),
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

  const tools = await readTools();
  const draft = await writeDraft(candidates, tools, previous?.body ?? "");
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
  log(`Wrote ${ARCHIVE_DIR}/${issue}.mdx`);
};

if (process.argv[1] === import.meta.filename) {
  await main();
}
