import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

import { renderEmailPreview } from "./email.ts";
import { readIssues, SITE_URL } from "./lib.ts";

// Usage: pnpm newsletter:preview [issue]  (defaults to the latest issue)
const issues = await readIssues();
const issue = process.argv[2]
  ? issues.find((entry) => entry.issue === Number(process.argv[2]))
  : issues.at(-1);
if (!issue) {
  throw new Error(`Issue "${process.argv[2]}" not found`);
}

const path = `${tmpdir()}/shadcn-weekly-${issue.issue}.html`;
await writeFile(
  path,
  await renderEmailPreview(issue, `${SITE_URL}/issues/${issue.issue}`)
);
console.log(path);
