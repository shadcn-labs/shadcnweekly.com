// Prints a Markdown PR comment with ready-to-post X and Reddit copy for an
// issue, plus one-click compose links. Nothing is posted automatically.
//
//   node scripts/newsletter/social.ts <issue> [subreddit,subreddit]
import { readIssues, SITE_URL } from "./lib.ts";

const X_LIMIT = 280;
// X counts every link as 23 characters regardless of length.
const X_URL_LENGTH = 23;

const [issueArg, subredditArg = process.env.REDDIT_SUBREDDITS ?? "shadcn"] =
  process.argv.slice(2);
const issues = await readIssues();
const issue = issues.find((entry) => entry.issue === Number(issueArg));
if (!issue) {
  throw new Error(`Issue #${issueArg} not found in src/content/archive`);
}

const title = String(issue.frontmatter.title);
const description = String(issue.frontmatter.description ?? "");
const highlights = Array.isArray(issue.frontmatter.highlights)
  ? issue.frontmatter.highlights.map(String)
  : [];
// UTM-tagged so signups from these posts show their source in Kit.
const issueUrl = (source: string) =>
  `${SITE_URL}/issues/${issue.issue}?${new URLSearchParams({
    utm_campaign: `issue-${issue.issue}`,
    utm_medium: "social",
    utm_source: source,
  })}`;
const xUrl = issueUrl("x");
const redditUrl = issueUrl("reddit");
const subreddits = subredditArg
  .split(",")
  .map((name) => name.trim().replace(/^r\//u, ""))
  .filter(Boolean);

// Drop highlights from the end until the post fits X's limit.
const buildXPost = () => {
  for (let count = highlights.length; count >= 0; count -= 1) {
    const lines = highlights.slice(0, count).map((item) => `→ ${item}`);
    const head = `Shadcn Weekly #${issue.issue} is out: ${title}`;
    const text = [head, lines.join("\n"), xUrl].filter(Boolean).join("\n\n");
    if (text.length - xUrl.length + X_URL_LENGTH <= X_LIMIT) {
      return text;
    }
  }
  return `Shadcn Weekly #${issue.issue}: ${title}\n\n${xUrl}`;
};

const xPost = buildXPost();
const redditTitle = `Shadcn Weekly #${issue.issue}: ${title}`;
const highlightList = highlights.map((item) => `- ${item}`).join("\n");
const redditBody = [
  description,
  highlightList ? `This week:\n\n${highlightList}` : "",
  `Read the full issue: ${redditUrl}`,
]
  .filter(Boolean)
  .join("\n\n");

const xIntent = `https://x.com/intent/post?text=${encodeURIComponent(xPost)}`;
const submitLink = (subreddit: string) =>
  `https://www.reddit.com/r/${subreddit}/submit?${new URLSearchParams({
    text: redditBody,
    title: redditTitle,
    type: "TEXT",
  })}`;

const fence = (text: string) => `\`\`\`text\n${text}\n\`\`\``;

process.stdout.write(`### 📣 Social posts for #${issue.issue}

Post these **after the issue is sent** (the link 404s until the PR is merged). Edit the issue first? The copy below reflects this PR as drafted.

**X** (@shadcnweekly) · [Open in X](${xIntent})

${fence(xPost)}

**Reddit** · ${subreddits.map((name) => `[Post to r/${name}](${submitLink(name)})`).join(" · ")}

Title:

${fence(redditTitle)}

Body:

${fence(redditBody)}
`);
