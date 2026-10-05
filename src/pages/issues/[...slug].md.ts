import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";

export const prerender = true;

export const getStaticPaths = (async () => {
  const issues = await getCollection("archive");
  return issues.map((issue) => ({
    params: { slug: issue.id },
    props: { issue },
  }));
}) satisfies GetStaticPaths;

const prop = (attributes: string, name: string) =>
  new RegExp(`${name}="(?<value>[^"]*)"`, "u").exec(attributes)?.groups?.value;

// MDX component tags have no meaning outside the site: render the sponsor as
// plain Markdown and drop page-only UI like the subscribe CTA.
const toMarkdown = (body: string) =>
  body
    .replaceAll(
      /^<(?<tag>[A-Z]\w*)(?<attributes>[^>]*)\/>/gmu,
      (_, tag: string, attributes: string) => {
        if (tag !== "ArchiveSponsorSection") {
          return "";
        }
        const website = prop(attributes, "website");
        const name = prop(attributes, "name") ?? website;
        const description = prop(attributes, "description");
        const heading = `## ⚡️ Sponsor: [${name}](${website})`;
        return description ? `${heading}\n\n${description}` : heading;
      }
    )
    .replaceAll(/\n{3,}/gu, "\n\n")
    .trim();

export const GET: APIRoute<{ issue: CollectionEntry<"archive"> }> = ({
  props: { issue },
}) => {
  const date = issue.data.date.toISOString().slice(0, 10);
  const pageUrl = new URL(`${ROUTES.ISSUES}/${issue.id}`, SITE.URL).href;
  const body = `# ${SITE.NAME} #${issue.data.issue}: ${issue.data.title}

> ${issue.data.description}

Published ${date} · ${pageUrl}

${toMarkdown(issue.body ?? "")}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
