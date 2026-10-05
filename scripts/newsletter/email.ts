import { readFile } from "node:fs/promises";

import { Marked } from "marked";

import { LINKS } from "../../src/constants/links.ts";
import { ROUTES } from "../../src/constants/routes.ts";
import { fetchPageMeta } from "../../src/lib/page-meta.ts";
import { isSvgUrl, sponsorLogoHost } from "../../src/lib/sponsor-logo.ts";
import { withUtm } from "../../src/lib/utm.ts";
import type { Issue } from "./lib.ts";
import { request, SITE_URL } from "./lib.ts";

export const KIT_TEMPLATE_PATH = new URL("kit-template.html", import.meta.url);

const FG = "#0a0a0a";
const MUTED = "#737373";
const BORDER = "#e5e5e5";
const MUTED_BG = "#f5f5f5";
const UNDERLINE = "#b5b5b5";
const FONT =
  "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO =
  "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";

const TEXT = `font-family:${FONT};color:${FG}`;
const P = `${TEXT};margin:16px 0 0;font-size:16px;line-height:28px`;
const MUTED_P = `${P};color:${MUTED}`;
const H2 = `${TEXT};margin:36px 0 0;font-size:20px;line-height:28px;font-weight:600`;
const H3 = `${TEXT};margin:28px 0 0;font-size:18px;line-height:26px;font-weight:600`;
const LINK = `color:${FG};text-decoration:underline;text-decoration-color:${UNDERLINE};text-underline-offset:3px`;
const HR = `border:0;border-top:1px solid ${BORDER};margin:40px 0 0;height:0`;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const markdown = new Marked({
  renderer: {
    codespan({ text }) {
      return `<code style="font-family:${MONO};font-size:13.6px;background:${MUTED_BG};border-radius:4px;padding:2px 4px">${escapeHtml(text)}</code>`;
    },
    heading({ tokens, depth }) {
      const tag = depth <= 2 ? "h2" : "h3";
      return `<${tag} style="${depth <= 2 ? H2 : H3}">${this.parser.parseInline(tokens)}</${tag}>\n`;
    },
    hr() {
      return `<hr style="${HR}" />\n`;
    },
    link({ href, tokens }) {
      return `<a href="${escapeHtml(href)}" style="${LINK}">${this.parser.parseInline(tokens)}</a>`;
    },
    list({ items, ordered }) {
      const tag = ordered ? "ol" : "ul";
      const body = items
        .map(
          (item) =>
            `<li style="${TEXT};margin:8px 0 0;padding-left:6px;font-size:16px;line-height:28px">${this.parser.parse(item.tokens)}</li>`
        )
        .join("\n");
      return `<${tag} style="margin:16px 0 0;padding:0 0 0 24px">\n${body}\n</${tag}>\n`;
    },
    paragraph({ tokens }) {
      return `<p style="${P}">${this.parser.parseInline(tokens)}</p>\n`;
    },
    strong({ tokens }) {
      return `<strong style="font-weight:600">${this.parser.parseInline(tokens)}</strong>`;
    },
  },
});

const prop = (attributes: string, name: string) => {
  const groups = new RegExp(
    `\\b${name}=(?:"(?<plain>[^"]*)"|\\{(?<json>"(?:[^"\\\\]|\\\\.)*")\\})`,
    "u"
  ).exec(attributes)?.groups;
  if (groups?.json) {
    return JSON.parse(groups.json) as string;
  }
  return groups?.plain;
};

const emailImage = (src: string | undefined) =>
  src && !isSvgUrl(src) ? src : undefined;

const sponsorLogo = async (
  website: string,
  logo: string | undefined
): Promise<string | undefined> => {
  if (!logo || !isSvgUrl(logo)) {
    return logo;
  }
  const converted = `${SITE_URL}/email/sponsor-logos/${sponsorLogoHost(website)}.png`;
  try {
    const res = await request(converted, { method: "HEAD" }, { retries: 1 });
    if (res.ok) {
      return converted;
    }
  } catch {
    void 0;
  }
};

// Sponsor links use the shared UTM convention (src/lib/utm.ts).
const sponsorLink = (website: string, issue: number, placement: string) =>
  escapeHtml(
    withUtm(website, {
      campaign: `issue-${issue}`,
      content: placement,
      medium: "newsletter",
    })
  );

const sponsorSection = async (attributes: string, issue: number) => {
  const website = prop(attributes, "website");
  if (!website) {
    return "";
  }
  const meta = await fetchPageMeta(website);
  const title = prop(attributes, "title") ?? meta.title;
  const name = prop(attributes, "name") ?? title;
  const description = prop(attributes, "description") ?? meta.description;
  const image = emailImage(prop(attributes, "image") ?? meta.image);
  const href = sponsorLink(website, issue, "sponsor-block");
  return [
    `<h2 style="${H2}">⚡️ Sponsor: ${escapeHtml(name)}</h2>`,
    image
      ? `<a href="${href}" style="text-decoration:none"><img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;margin:16px 0 0;border:1px solid ${BORDER};border-radius:8px" /></a>`
      : "",
    `<p style="${P}"><a href="${href}" style="color:${FG};text-decoration:none;font-size:18px;font-weight:600">${escapeHtml(title)}</a></p>`,
    description
      ? `<p style="${MUTED_P};margin-top:4px;line-height:24px">${escapeHtml(description)}</p>`
      : "",
  ].join("\n");
};

const togetherWith = async (website: string, issue: number) => {
  const meta = await fetchPageMeta(website);
  const logo = await sponsorLogo(website, meta.logo);
  const logoHtml = logo
    ? `<img src="${escapeHtml(logo)}" alt="" width="20" height="20" style="vertical-align:middle;border-radius:4px;margin-right:6px" />`
    : "";
  return `<p style="${MUTED_P};margin-top:24px;font-size:14px;line-height:20px;text-align:center">Together with&nbsp;&nbsp;<a href="${sponsorLink(website, issue, "together-with")}" style="color:${FG};text-decoration:none;font-weight:600">${logoHtml}${escapeHtml(meta.title)}</a></p>`;
};

export const renderEmailHtml = async (issue: Issue, webUrl: string) => {
  const sponsorBlocks = [
    ...issue.body.matchAll(/^<ArchiveSponsorSection\b(?<attrs>[\s\S]*?)\/>/gmu),
  ];
  const sponsors = await Promise.all(
    sponsorBlocks.map((match) =>
      sponsorSection(match.groups?.attrs ?? "", issue.issue)
    )
  );
  let sponsorIndex = 0;
  const source = issue.body
    .replaceAll(/^<ArchiveSponsorSection\b[\s\S]*?\/>/gmu, () => {
      const placeholder = `SPONSOR_PLACEHOLDER_${sponsorIndex}`;
      sponsorIndex += 1;
      return placeholder;
    })
    .replaceAll(/^<[A-Z][A-Za-z]*\b[\s\S]*?\/>/gmu, "");
  const rendered = await markdown.parse(source);
  const body = rendered.replaceAll(
    /<p style="[^"]*">SPONSOR_PLACEHOLDER_(?<index>\d+)<\/p>/gu,
    (...args) => {
      const groups = args.at(-1) as { index: string };
      return sponsors[Number(groups.index)] ?? "";
    }
  );

  const title = String(issue.frontmatter.title);
  const date = new Date(`${issue.date}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
  const sponsorUrl = issue.frontmatter.sponsor;

  return [
    `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr><td style="vertical-align:middle;padding-right:8px"><a href="${SITE_URL}" style="text-decoration:none"><img src="${SITE_URL}${ROUTES.LOGO}" alt="" width="24" height="24" style="display:block;width:24px;height:24px;border:0" /></a></td><td style="vertical-align:middle"><a href="${SITE_URL}" style="${TEXT};text-decoration:none;font-size:18px;line-height:28px;font-weight:600;letter-spacing:-0.45px">Shadcn Weekly</a></td></tr></table>`,
    `<p style="${MUTED_P};margin-top:32px;font-size:14px;line-height:20px;text-align:center">Issue #${issue.issue}&nbsp;&nbsp;·&nbsp;&nbsp;${date}&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${webUrl}" style="color:${MUTED};text-decoration:underline;text-underline-offset:3px">Read online</a></p>`,
    `<h1 class="sw-title" style="${TEXT};margin:16px 0 0;font-size:32px;line-height:38px;font-weight:600;letter-spacing:-0.8px;text-align:center">${escapeHtml(title)}</h1>`,
    `<hr style="${HR};margin-top:24px" />`,
    typeof sponsorUrl === "string"
      ? await togetherWith(sponsorUrl, issue.issue)
      : "",
    body,
    `<p style="${P};margin-top:40px">Have a link you want to share? Send me an email at <a href="mailto:${LINKS.EMAIL}" style="${LINK}">${LINKS.EMAIL}</a></p>`,
    `<p style="${MUTED_P};margin-top:0">All submissions are appreciated.</p>`,
    `<p style="${MUTED_P}">👋 See you next week!</p>`,
  ].join("\n");
};

export const renderEmailPreview = async (issue: Issue, webUrl: string) => {
  const template = await readFile(KIT_TEMPLATE_PATH, "utf-8");
  return template
    .replace("{{ message_content }}", await renderEmailHtml(issue, webUrl))
    .replace("{{ unsubscribe_url }}", "#unsubscribe")
    .replace("{{ subscriber_preferences_url }}", "#preferences")
    .replace("{{ address }}", "Your mailing address (from Kit settings)");
};
