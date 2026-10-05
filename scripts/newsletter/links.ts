// Prints the unique external links of the given issue MDX files, one per line.
// Usage: node scripts/newsletter/links.ts src/content/archive/1.mdx [...]
import { readFile } from "node:fs/promises";

const URL_PATTERNS = [
  // Markdown links and images: [text](https://…) / ![alt](https://…)
  /\]\((?<url>https?:\/\/[^\s)]+)/gu,
  // Autolinks: <https://…>
  /<(?<url>https?:\/\/[^\s>]+)>/gu,
  // Component attributes: href="…" / website="…"
  /\b(?:href|website)=["'{]+(?<url>https?:\/\/[^"'}\s]+)/gu,
  // Frontmatter sponsor URL
  /^sponsor:\s*["']?(?<url>https?:\/\/[^"'\s]+)/gmu,
];

const files = process.argv.slice(2);
if (files.length === 0) {
  throw new Error("Usage: node scripts/newsletter/links.ts <file.mdx>...");
}

const sources = await Promise.all(files.map((file) => readFile(file, "utf-8")));
const links = new Set<string>();
for (const source of sources) {
  for (const pattern of URL_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const url = match.groups?.url;
      if (url) {
        links.add(url);
      }
    }
  }
}

for (const link of [...links].toSorted()) {
  console.log(link);
}
