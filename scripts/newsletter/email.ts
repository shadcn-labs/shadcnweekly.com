import { readFile } from "node:fs/promises";

import { Marked } from "marked";

import { LINKS } from "../../src/constants/links.ts";
import { fetchPageMeta } from "../../src/lib/page-meta.ts";
import type { Issue } from "./lib.ts";
import { SITE_URL } from "./lib.ts";

/**
 * Email rendering mirrors the issue page (`src/pages/issues/[...slug].astro`
 * + typeset styles). Every style is inline because email clients strip
 * `<style>` blocks. The outer frame and the legally required unsubscribe link
 * and address live in `kit-template.html`, a Kit HTML template that wraps this
 * content via `{{ message_content }}`.
 */
export const KIT_TEMPLATE_PATH = new URL("kit-template.html", import.meta.url);

// shadcn neutral tokens from src/styles/global.css, as hex for email clients.
const FG = "#0a0a0a";
const MUTED = "#737373";
const BORDER = "#e5e5e5";
const MUTED_BG = "#f5f5f5";
const UNDERLINE = "#b5b5b5";
const FONT =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";

// Outlook does not inherit fonts through tables, so every block sets its own.
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

/** Reads `name="value"` or `name={"json string"}` from JSX attributes. */
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

/** SVG images are dropped because Gmail and Outlook do not render them. */
const emailImage = (src: string | undefined) =>
  src && !/\.svg(?:$|\?)/iu.test(src) ? src : undefined;

const sponsorSection = async (attributes: string) => {
  const website = prop(attributes, "website");
  if (!website) {
    return "";
  }
  const meta = await fetchPageMeta(website);
  const title = prop(attributes, "title") ?? meta.title;
  const name = prop(attributes, "name") ?? title;
  const description = prop(attributes, "description") ?? meta.description;
  const image = emailImage(prop(attributes, "image") ?? meta.image);
  const href = escapeHtml(website);
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

const togetherWith = async (website: string) => {
  const meta = await fetchPageMeta(website);
  const logo = emailImage(meta.logo);
  const logoHtml = logo
    ? `<img src="${escapeHtml(logo)}" alt="" width="20" height="20" style="vertical-align:middle;border-radius:4px;margin-right:6px" />`
    : "";
  return `<p style="${MUTED_P};margin-top:24px;font-size:14px;line-height:20px;text-align:center">Together with&nbsp;&nbsp;<a href="${escapeHtml(website)}" style="color:${FG};text-decoration:none;font-weight:600">${logoHtml}${escapeHtml(meta.title)}</a></p>`;
};

/** Issue content in the issue page's design; Kit inserts it into the template. */
export const renderEmailHtml = async (issue: Issue, webUrl: string) => {
  // MDX block components start a line; anchoring avoids matching JSX-like
  // text inside code spans (e.g. `<Message>`).
  const sponsorBlocks = [
    ...issue.body.matchAll(/^<ArchiveSponsorSection\b(?<attrs>[\s\S]*?)\/>/gmu),
  ];
  const sponsors = await Promise.all(
    sponsorBlocks.map((match) => sponsorSection(match.groups?.attrs ?? ""))
  );
  let sponsorIndex = 0;
  const source = issue.body
    .replaceAll(/^<ArchiveSponsorSection\b[\s\S]*?\/>/gmu, () => {
      const placeholder = `SPONSOR_PLACEHOLDER_${sponsorIndex}`;
      sponsorIndex += 1;
      return placeholder;
    })
    // Remaining JSX components (e.g. SubscribeSection) are site-only.
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
    `<p style="${TEXT};margin:0;text-align:center"><a href="${SITE_URL}" style="color:${FG};text-decoration:none;font-size:18px;line-height:28px;font-weight:600;letter-spacing:-0.45px"><img src="${SITE_URL}/email-logo.png" alt="" width="24" height="24" style="vertical-align:middle;border-radius:6px;margin-right:8px" />Shadcn Weekly</a></p>`,
    `<p style="${MUTED_P};margin-top:32px;font-size:14px;line-height:20px;text-align:center">Issue #${issue.issue}&nbsp;&nbsp;·&nbsp;&nbsp;${date}&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${webUrl}" style="color:${MUTED};text-decoration:underline;text-underline-offset:3px">Read online</a></p>`,
    `<h1 class="sw-title" style="${TEXT};margin:16px 0 0;font-size:32px;line-height:38px;font-weight:600;letter-spacing:-0.8px;text-align:center">${escapeHtml(title)}</h1>`,
    `<hr style="${HR};margin-top:24px" />`,
    typeof sponsorUrl === "string" ? await togetherWith(sponsorUrl) : "",
    body,
    `<p style="${P};margin-top:40px">Have a link you want to share? Send me an email at <a href="mailto:${LINKS.EMAIL}" style="${LINK}">${LINKS.EMAIL}</a></p>`,
    `<p style="${MUTED_P};margin-top:0">All submissions are appreciated.</p>`,
    `<p style="${MUTED_P}">👋 See you next week!</p>`,
  ].join("\n");
};

/** Full email as subscribers see it: Kit template with this issue's content. */
export const renderEmailPreview = async (issue: Issue, webUrl: string) => {
  const template = await readFile(KIT_TEMPLATE_PATH, "utf-8");
  return template
    .replace("{{ message_content }}", await renderEmailHtml(issue, webUrl))
    .replace("{{ unsubscribe_url }}", "#unsubscribe")
    .replace("{{ address }}", "Your mailing address (from Kit settings)");
};
