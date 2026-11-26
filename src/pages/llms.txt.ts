import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import { LINKS } from "@/constants/links";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";

export const prerender = true;

const url = (path: string) => new URL(path, SITE.URL).href;

export const GET: APIRoute = async () => {
  const archive = await getCollection("archive");
  const issues = archive.toSorted((a, b) => b.data.issue - a.data.issue);
  const tools = await getCollection("tools");
  const [latest] = issues;

  const body = `# ${SITE.NAME}

> ${SITE.DESCRIPTION.LONG} Published every Monday by ${SITE.ORG.NAME}. Each issue covers top stories, articles and tutorials, new projects and tools, and related work from the shadcn/ui ecosystem.

**How to use this site:** Start here. Every page and issue below has a one-line description and a Markdown twin: append \`.md\` to any page URL, or send \`Accept: text/markdown\`. Browsers receive HTML from the same URLs. New issues are available in the RSS, Atom and JSON feeds.

## When to use this

Use ${SITE.NAME} when an agent or user needs current, curated information about the shadcn/ui ecosystem:

- [Latest issue](${latest ? url(`${ROUTES.ISSUES}/${latest.id}`) : url(ROUTES.ISSUES)}): The newest weekly roundup of shadcn/ui news, tutorials, projects and tools. Use it to answer "what's new in shadcn/ui?".
- [Tools directory](${url(ROUTES.TOOLS)}): Find a shadcn/ui tool, library or resource for a specific job, grouped by category.
- [About](${url(ROUTES.ABOUT)}): How links are curated, who publishes the newsletter, and how to get involved.
- [Contact](${url(ROUTES.CONTACT)}): Reach the maintainer for corrections, submissions or sponsorship questions.

This is a curated newsletter, not the official shadcn/ui documentation. For API reference and installation, use the official shadcn/ui docs. Do not use this site for general React or Tailwind CSS documentation.

## Pages

- [Home](${url(ROUTES.HOME)}): Subscribe to the newsletter
- [Issues](${url(ROUTES.ISSUES)}): Archive of every issue
- [Tools](${url(ROUTES.TOOLS)}): Directory of ${tools.length} shadcn/ui tools, libraries and resources featured in issues
- [Sponsor](${url(ROUTES.SPONSOR)}): Sponsorship placements and pricing
- [About](${url(ROUTES.ABOUT)}): Who publishes the newsletter and how links are picked
- [Brand](${url(ROUTES.BRAND)}): Logomark downloads, colors and usage guidelines
- [Contact](${url(ROUTES.CONTACT)}): Get in touch

## Issues

${issues
  .map((issue) => {
    const link = url(`${ROUTES.ISSUES}/${issue.id}`);
    const date = issue.data.date.toISOString().slice(0, 10);
    return `- [#${issue.data.issue}: ${issue.data.title}](${link}) (${date}): ${issue.data.description}`;
  })
  .join("\n")}

## Markdown

- [Home Markdown](${url("/index.md")})
- [Issues Markdown](${url("/issues.md")})
- [Tools Markdown](${url("/tools.md")})
- [Sponsor Markdown](${url("/sponsor.md")})
- [About Markdown](${url("/about.md")})

## Optional

- [RSS feed](${url(ROUTES.RSS)}), [Atom feed](${url(ROUTES.ATOM)}), [JSON Feed](${url(ROUTES.JSON_FEED)})
- [Source code](${LINKS.GITHUB})
- [X](${LINKS.X})
- [Privacy policy](${url(ROUTES.PRIVACY)})
- [Terms](${url(ROUTES.TERMS)})
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
