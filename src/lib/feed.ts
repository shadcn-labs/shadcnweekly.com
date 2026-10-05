import { getCollection } from "astro:content";
import { Feed } from "feed";

import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";

const url = (path: string) => new URL(path, SITE.URL).href;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

// One feed definition rendered as RSS 2.0, Atom 1.0 and JSON Feed 1.0.
export const buildFeed = async () => {
  const archive = await getCollection("archive");
  const issues = archive.toSorted((a, b) => b.data.issue - a.data.issue);
  const author = { link: SITE.AUTHOR.URL, name: SITE.AUTHOR.NAME };

  const feed = new Feed({
    author,
    copyright: `© ${new Date().getFullYear()} ${SITE.ORG.NAME}`,
    description: SITE.DESCRIPTION.LONG,
    favicon: url(ROUTES.FAVICON_PNG),
    feedLinks: {
      atom: url(ROUTES.ATOM),
      json: url(ROUTES.JSON_FEED),
      rss: url(ROUTES.RSS),
    },
    id: url(ROUTES.HOME),
    image: url(ROUTES.LOGO),
    language: "en",
    link: url(ROUTES.HOME),
    title: SITE.NAME,
    updated: issues[0]?.data.date,
  });

  for (const issue of issues) {
    const link = url(`${ROUTES.ISSUES}/${issue.id}`);
    const { summary } = issue.data;
    const bullets = (summary?.bullets ?? [])
      .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
      .join("");
    const content = [
      `<p>${escapeHtml(summary?.overview ?? issue.data.description)}</p>`,
      bullets ? `<ul>${bullets}</ul>` : "",
      `<p><a href="${link}">Read issue #${issue.data.issue} on ${escapeHtml(SITE.NAME)}</a></p>`,
    ].join("");

    feed.addItem({
      author: [author],
      category: issue.data.highlights.map((name) => ({ name })),
      content,
      date: issue.data.date,
      description: issue.data.description,
      id: link,
      image: url(`/og/issues/${issue.id}.png`),
      link,
      title: `#${issue.data.issue}: ${issue.data.title}`,
    });
  }

  return feed;
};

export const feedResponse = (body: string, contentType: string) =>
  new Response(body, {
    headers: { "Content-Type": `${contentType}; charset=utf-8` },
  });
