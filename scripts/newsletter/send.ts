import { renderEmailHtml } from "./email.ts";
import {
  log,
  readIssues,
  request,
  requestJson,
  requireEnv,
  SITE_URL,
  sleep,
  warn,
} from "./lib.ts";

const KIT_API = "https://api.kit.com/v4";
/** Name of the Kit HTML template created from `kit-template.html`. */
const KIT_TEMPLATE_NAME = "Shadcn Weekly";
const LIVE_TIMEOUT_MS = 20 * 60_000;
const LIVE_POLL_MS = 20_000;
const SEND_DELAY_MS = 5 * 60_000;

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
  // The issue number is explicit (from the merged PR), so editing an older
  // issue later can never resend it.
  const number = Number(process.argv[2]);
  const issues = await readIssues();
  const issue = issues.find((entry) => entry.issue === number);
  if (!issue) {
    throw new Error(
      `Usage: newsletter:send <issue>; issue "${process.argv[2]}" not found`
    );
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

  const { email_templates: templates } = await requestJson<{
    email_templates: { id: number; name: string }[];
  }>(`${KIT_API}/email_templates`, { headers });
  const template = templates.find((entry) => entry.name === KIT_TEMPLATE_NAME);
  if (!template) {
    warn(
      `Kit email template "${KIT_TEMPLATE_NAME}" not found; using the account default template`
    );
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
  // Re-run the send workflow instead; the duplicate check makes that safe.
  const now = Date.now();
  const { broadcast } = await requestJson<{
    broadcast: { id: number; send_at: string };
  }>(
    `${KIT_API}/broadcasts`,
    {
      body: JSON.stringify({
        content: await renderEmailHtml(issue, webUrl),
        ...(template ? { email_template_id: template.id } : {}),
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
