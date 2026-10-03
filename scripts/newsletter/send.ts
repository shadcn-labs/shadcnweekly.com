import { marked } from "marked";

import { fetchPageMeta } from "../../src/lib/page-meta.ts";
import type { Issue } from "./lib.ts";
import {
  addDays,
  log,
  readIssues,
  request,
  requestJson,
  requireEnv,
  SITE_URL,
  sleep,
  toIsoDate,
  warn,
} from "./lib.ts";

const KIT_API = "https://api.kit.com/v4";
/** Only issues this recent are sent, so a manual run never resends history. */
const MAX_ISSUE_AGE_DAYS = 3;
const LIVE_TIMEOUT_MS = 20 * 60_000;
const LIVE_POLL_MS = 20_000;
const SEND_DELAY_MS = 5 * 60_000;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const prop = (attributes: string, name: string) =>
  new RegExp(`\\b${name}="(?<value>[^"]*)"`, "u").exec(attributes)?.groups
    ?.value;

const sponsorHtml = async (attributes: string) => {
  const website = prop(attributes, "website");
  if (!website) {
    return "";
  }
  const meta = await fetchPageMeta(website);
  const title = prop(attributes, "title") ?? meta.title;
  const name = prop(attributes, "name") ?? title;
  const description = prop(attributes, "description") ?? meta.description;
  const href = escapeHtml(website);
  return [
    `<h2>⚡️ Sponsor: ${escapeHtml(name)}</h2>`,
    meta.image
      ? `<p><a href="${href}"><img src="${escapeHtml(meta.image)}" alt="${escapeHtml(title)}" style="max-width:100%;border-radius:6px" /></a></p>`
      : "",
    `<p><a href="${href}"><strong>${escapeHtml(title)}</strong></a><br />${escapeHtml(description)}</p>`,
  ].join("\n");
};

/** Converts an archive MDX issue into email HTML for a Kit Classic template. */
export const renderEmailHtml = async (issue: Issue, webUrl: string) => {
  const sponsorMatch = /<ArchiveSponsorSection\b(?<attrs>[\s\S]*?)\/>/u.exec(
    issue.body
  );
  const sponsor = sponsorMatch?.groups
    ? await sponsorHtml(sponsorMatch.groups.attrs)
    : "";
  const markdown = issue.body
    .replace(/<ArchiveSponsorSection\b[\s\S]*?\/>/u, "SPONSOR_PLACEHOLDER")
    // Remaining JSX components (e.g. SubscribeSection) are site-only.
    .replaceAll(/<[A-Z][A-Za-z]*\b[\s\S]*?\/>/gu, "");
  const html = await marked.parse(markdown);
  const body = html.replace(/<p>SPONSOR_PLACEHOLDER<\/p>/u, sponsor);
  const description = String(issue.frontmatter.description ?? "");

  return [
    `<p>${escapeHtml(description)}</p>`,
    `<p><a href="${webUrl}">Read this issue on the web →</a></p>`,
    "<hr />",
    body,
    "<hr />",
    `<p>You're receiving this because you subscribed to <a href="${SITE_URL}">Shadcn Weekly</a>. Browse past issues at <a href="${SITE_URL}/issues">${SITE_URL.replace(/^https?:\/\//u, "")}/issues</a>.</p>`,
  ].join("\n");
};

const isLive = async (url: string) => {
  try {
    const res = await request(url, {}, { retries: 0 });
    return res.ok;
  } catch {
    return false;
  }
};

const waitUntilLive = async (url: string) => {
  const deadline = Date.now() + LIVE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- polling is sequential
    if (await isLive(url)) {
      return true;
    }
    // oxlint-disable-next-line eslint/no-await-in-loop -- polling is sequential
    await sleep(LIVE_POLL_MS);
  }
  return false;
};

const main = async () => {
  const apiKey = requireEnv("KIT_API_KEY");
  const today = toIsoDate(new Date());
  const issues = await readIssues();
  const issue = issues.at(-1);
  if (!issue || issue.date < addDays(today, -MAX_ISSUE_AGE_DAYS)) {
    warn(`No issue from the last ${MAX_ISSUE_AGE_DAYS} days to send`);
    return;
  }

  const title = String(issue.frontmatter.title);
  const subject = `Shadcn Weekly #${issue.issue}: ${title}`;
  const headers = {
    "Content-Type": "application/json",
    "X-Kit-Api-Key": apiKey,
  };

  const { broadcasts } = await requestJson<{
    broadcasts: { id: number; subject: string }[];
  }>(`${KIT_API}/broadcasts?slim=true&per_page=100`, { headers });
  const duplicate = broadcasts.find(
    (broadcast) => broadcast.subject === subject
  );
  if (duplicate) {
    log(`Kit broadcast ${duplicate.id} already exists for "${subject}"`);
    return;
  }

  const webUrl = `${SITE_URL}/issues/${issue.issue}`;
  if (await waitUntilLive(webUrl)) {
    log(`${webUrl} is live`);
  } else {
    warn(
      `${webUrl} not live after ${LIVE_TIMEOUT_MS / 60_000} min; sending anyway`
    );
  }

  // No automatic retry: a 5xx after Kit stored the broadcast would double-send.
  // The workflow's second Monday run retries safely via the duplicate check.
  const now = Date.now();
  const { broadcast } = await requestJson<{
    broadcast: { id: number; send_at: string };
  }>(
    `${KIT_API}/broadcasts`,
    {
      body: JSON.stringify({
        content: await renderEmailHtml(issue, webUrl),
        description: `Issue #${issue.issue}`,
        preview_text: String(issue.frontmatter.description ?? ""),
        public: false,
        published_at: new Date(now).toISOString(),
        send_at: new Date(now + SEND_DELAY_MS).toISOString(),
        subject,
      }),
      headers,
      method: "POST",
    },
    { retries: 0 }
  );
  log(`Scheduled Kit broadcast ${broadcast.id} for ${broadcast.send_at}`);
};

if (process.argv[1] === import.meta.filename) {
  await main();
}
