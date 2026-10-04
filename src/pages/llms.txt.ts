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

  const body = `# ${SITE.NAME}

> ${SITE.DESCRIPTION.LONG} Published every Monday by ${SITE.ORG.NAME}. Each issue covers top stories, articles and tutorials, new projects and tools, and related work from the shadcn/ui ecosystem.

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

## Optional

- [Source code](${LINKS.GITHUB})
- [X](${LINKS.X})
- [Privacy policy](${url(ROUTES.PRIVACY)})
- [Terms](${url(ROUTES.TERMS)})
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
