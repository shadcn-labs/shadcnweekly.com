// Flags lead, roundup and project entries of an issue that link a post or
// listing instead of the project itself, and keeps the "Fix before merging"
// section of the draft PR description in sync with them.
// Usage: node scripts/newsletter/review.ts src/content/archive/6.mdx < body.md
// Prints the PR description with that section replaced (or removed).
import { readFile } from "node:fs/promises";
import { text } from "node:stream/consumers";

import { isIndirectUrl } from "./urls.ts";

// "pdfcn: shadcn/ui for Document Generation" -> "pdfcn"
export const entryName = (heading: string) =>
  heading.split(/:\s/u)[0].replaceAll("\\", "").trim();

type Section = "lead" | "articles" | "projects" | "related";

export interface IssueEntry {
  name: string;
  url: string;
  section: Section;
}

// `### [Heading](url)` entries and `- **[Label](url)**` roundup items, as
// rendered by draft.ts. Labels escape brackets with a backslash.
const ENTRY =
  /^(?:###\s+|-\s+\*\*)\[(?<label>(?:\\.|[^\]\\])+)\]\((?<url>[^)\s]+)\)/u;
const SECTION_HEADING = /^##\s.*\b(?<section>Articles|Projects|Related)\b/u;

export const issueEntries = (body: string): IssueEntry[] => {
  let section: Section = "lead";
  const entries: IssueEntry[] = [];
  for (const line of body.split("\n")) {
    const heading = SECTION_HEADING.exec(line)?.groups?.section;
    if (heading) {
      section = heading.toLowerCase() as Section;
      continue;
    }
    const entry = ENTRY.exec(line)?.groups;
    if (entry) {
      entries.push({
        name: entryName(entry.label),
        section,
        url: entry.url,
      });
    }
  }
  return entries;
};

// Articles and related items may legitimately be a post or video.
export const linkReviewNotes = (body: string) =>
  issueEntries(body)
    .filter(
      (entry) =>
        (entry.section === "lead" || entry.section === "projects") &&
        isIndirectUrl(entry.url)
    )
    .map(
      (entry) =>
        `"${entry.name}" links to ${entry.url}, not the project; replace it with the project's own site`
    );

const START = "<!-- link-review:start -->";
const END = "<!-- link-review:end -->";
const SECTION = new RegExp(`\\n*${START}[\\s\\S]*?${END}\\n*`, "u");

export const withLinkReview = (description: string, notes: string[]) => {
  const rest = description.replace(SECTION, "\n\n").trimEnd();
  if (notes.length === 0) {
    return `${rest}\n`;
  }
  const list = notes.map((note) => `- ${note}`).join("\n");
  return `${rest}\n\n${START}\n**Fix before merging** (no direct project link):\n\n${list}\n${END}\n`;
};

if (process.argv[1] === import.meta.filename) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    throw new Error(
      "Usage: node scripts/newsletter/review.ts <issue.mdx>... < description.md"
    );
  }
  const bodies = await Promise.all(
    files.map((file) => readFile(file, "utf-8"))
  );
  const description = await text(process.stdin);
  process.stdout.write(
    withLinkReview(description, bodies.flatMap(linkReviewNotes))
  );
}
