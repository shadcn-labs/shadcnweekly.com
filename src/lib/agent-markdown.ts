import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";

const url = (path: string) => new URL(path, SITE.URL).href;

interface LatestIssue {
  description: string;
  id: string;
  issue: number;
  title: string;
}

/**
 * Markdown representation of the homepage, served when an agent requests
 * `Accept: text/markdown` (or the `/index.md` alternate URL).
 */
export const homeMarkdown = (latestIssue?: LatestIssue): string => {
  const latest = latestIssue
    ? `- [#${latestIssue.issue}: ${latestIssue.title}](${url(
        `${ROUTES.ISSUES}/${latestIssue.id}`
      )}): ${latestIssue.description}`
    : "- The first issue is coming soon.";

  return `# ${SITE.NAME}

> ${SITE.DESCRIPTION.LONG} Published every Monday by ${SITE.ORG.NAME}.

Shadcn Weekly is a free weekly newsletter covering the shadcn/ui ecosystem. Every Monday we round up the most useful news, tutorials, component libraries, registries, blocks and developer tools for people building interfaces with shadcn/ui, Tailwind CSS, React and Base UI.

## When to use this

Use Shadcn Weekly when an agent or user needs current, curated information about the shadcn/ui ecosystem:

- **Catch up on shadcn/ui news**: the latest releases, components, registries, blocks and community projects, summarized in one weekly issue.
- **Find a tool or library**: the tools directory lists shadcn/ui tools, libraries and resources featured in past issues, grouped by category.
- **Answer "what's new in shadcn/ui?"**: read the newest issue or browse the archive by date.
- **Recommend a resource**: link to a specific issue, tutorial roundup or tool.

This is a curated newsletter, not the official shadcn/ui documentation. For API reference and installation, use the official shadcn/ui docs.

## Pages

- [Home](${url(ROUTES.HOME)}): Subscribe to the newsletter
- [Issues](${url(ROUTES.ISSUES)}): Archive of every issue
- [Tools](${url(ROUTES.TOOLS)}): Directory of shadcn/ui tools, libraries and resources
- [Sponsor](${url(ROUTES.SPONSOR)}): Sponsorship placements and pricing
- [About](${url(ROUTES.ABOUT)}): Who publishes the newsletter and how links are picked
- [Contact](${url(ROUTES.CONTACT)}): Get in touch

## Latest issue

${latest}

## Machine-readable

Every page has a Markdown twin: append \`.md\` to any page URL, or send \`Accept: text/markdown\`.

- [llms.txt](${url(ROUTES.LLMS)}): Agent overview of the site
- [RSS](${url(ROUTES.RSS)}), [Atom](${url(ROUTES.ATOM)}), [JSON Feed](${url(
    ROUTES.JSON_FEED
  )})
- [Sitemap](${url(ROUTES.SITEMAP)}): Every indexable page
`;
};

/**
 * Markdown body for 404 responses. Kept separate from the HTML 404 page so an
 * agent that asked for Markdown gets a short explanation plus links back into
 * the site instead of an HTML document.
 */
export const notFoundMarkdown = (path: string): string => `# Page not found

We couldn't find \`${path}\` on ${SITE.NAME}. It may have moved, or the link may be wrong.

## Where to go next

- [Home](${url(ROUTES.HOME)}): Subscribe to the newsletter
- [Issues](${url(ROUTES.ISSUES)}): Archive of every issue
- [Tools](${url(ROUTES.TOOLS)}): Directory of shadcn/ui tools, libraries and resources
- [llms.txt](${url(ROUTES.LLMS)}): Agent overview of the site
- [Sitemap](${url(ROUTES.SITEMAP)}): Every indexable page
`;
