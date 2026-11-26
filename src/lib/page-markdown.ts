import { LINKS } from "@/constants/links";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import { SPONSOR_PLACEMENTS } from "@/constants/sponsor";
import { TOOL_CATEGORIES } from "@/constants/tools";

const url = (path: string) => new URL(path, SITE.URL).href;

interface PageHeader {
  description: string;
  path: string;
  title: string;
}

const header = ({ description, path, title }: PageHeader) =>
  `# ${title}

> ${description}

- **URL**: ${url(path)}`;

export interface IssueSummary {
  date: string;
  description: string;
  id: string;
  issue: number;
  title: string;
}

export interface ToolSummary {
  category: string;
  description: string;
  issue: number;
  title: string;
  url: string;
}

export interface SponsorStat {
  label: string;
  value: string;
}

/** Markdown twin of `/about`. */
export const aboutMarkdown = () =>
  `${header({
    description: `${SITE.NAME} is a weekly newsletter about the shadcn/ui ecosystem, published by ${SITE.ORG.NAME}.`,
    path: ROUTES.ABOUT,
    title: "About",
  })}

${SITE.NAME} is a free weekly newsletter covering the shadcn/ui ecosystem. One email every Monday with what happened that week: new components, registries, blocks, templates, tooling and tutorials. Every issue is also published in the [archive](${url(ROUTES.ISSUES)}), and every project it features lands in the [tools directory](${url(ROUTES.TOOLS)}).

## What you get

- Top stories: the biggest launches and releases of the week
- Articles, tutorials and news from around the community
- Projects, packages and tools, each added to the tools directory
- Related: adjacent work worth knowing about

## Who's behind it

${SITE.NAME} is published by [${SITE.ORG.NAME}](${SITE.ORG.URL}), an independent org building open-source tools for the shadcn/ui ecosystem, and curated by [${SITE.AUTHOR.NAME}](${SITE.AUTHOR.URL}). Links are collected from X, the official shadcn/ui registry directory, awesome-shadcn-ui and the wider web, then reviewed by hand before each issue goes out. The site is [open source](${LINKS.GITHUB}).

## Get involved

- Built something with shadcn/ui? Email [${LINKS.EMAIL}](mailto:${LINKS.EMAIL}) or use the [contact form](${url(ROUTES.CONTACT)}).
- Want to reach the readers? See [sponsorships](${url(ROUTES.SPONSOR)}).
- Chat with the community on [Discord](${LINKS.DISCORD}) or follow [${SITE.AUTHOR.TWITTER}](https://x.com/${SITE.AUTHOR.TWITTER.replace(/^@/u, "")}) on X.
- Read how subscriber data is handled in the [privacy policy](${url(ROUTES.PRIVACY)}).

${SITE.NAME} is not endorsed by or affiliated with [shadcn](https://shadcn.com).
`;

/** Markdown twin of `/brand`. */
export const brandMarkdown = () =>
  `${header({
    description: `Logos, colors and usage guidelines for writing about ${SITE.NAME}.`,
    path: ROUTES.BRAND,
    title: "Brand",
  })}

Logos and colors for writing about ${SITE.NAME}. The logomark is a W built from the shadcn mark and its mirror image; set the name in plain text next to it.

## Logomark

- [Logomark, black (SVG)](${url("/brand/shadcnweekly-logomark-black.svg")})
- [Logomark, black (PNG)](${url("/brand/shadcnweekly-logomark-black.png")})
- [Logomark, white (SVG)](${url("/brand/shadcnweekly-logomark-white.svg")})
- [Logomark, white (PNG)](${url("/brand/shadcnweekly-logomark-white.png")})
- [App icon (SVG)](${url("/brand/shadcnweekly-app-icon.svg")})
- [App icon (PNG)](${url("/brand/shadcnweekly-app-icon-512.png")})

## Colors

- Blue: \`#0082FB\`
- Light blue: \`#41A4FF\`
- Black: \`#0A0A0A\`
- White: \`#FFFFFF\`

Buttons and the app icon use a top-to-bottom gradient from Light blue to Blue.

## Usage

- Write the name as ${SITE.NAME}: two words, capital S and W.
- Keep clear space around the logomark of at least half its height.
- Don't stretch, rotate, recolor outside the palette, or add effects.
- Don't use the mark in a way that suggests we endorse your product.
- ${SITE.NAME} is independent and not affiliated with shadcn/ui.

Questions or a press request? Email [${LINKS.EMAIL}](mailto:${LINKS.EMAIL}).
`;

/** Markdown twin of `/contact`. */
export const contactMarkdown = () =>
  `${header({
    description: `Get in touch with ${SITE.NAME} — send a message or reach us by email and Discord.`,
    path: ROUTES.CONTACT,
    title: "Contact",
  })}

Send a message using the [contact form](${url(ROUTES.CONTACT)}), or reach out directly.

- Email: [${LINKS.EMAIL}](mailto:${LINKS.EMAIL})
- Discord: [Join the Discord](${LINKS.DISCORD})
- X: [@shadcnweekly](${LINKS.X})

For corrections, submissions, sponsorship questions, or privacy requests, email [${LINKS.EMAIL}](mailto:${LINKS.EMAIL}).
`;

/** Markdown twin of `/issues`. */
export const issuesMarkdown = (issues: IssueSummary[]) =>
  `${header({
    description: `Every issue of ${SITE.NAME} in one place. Never miss a roundup.`,
    path: ROUTES.ISSUES,
    title: "Newsletter Archive",
  })}

## Issues

${issues
  .map(
    (issue) =>
      `- [#${issue.issue}: ${issue.title}](${url(
        `${ROUTES.ISSUES}/${issue.id}`
      )}) (${issue.date}): ${issue.description}`
  )
  .join("\n")}
`;

/** Markdown twin of `/privacy`. */
export const privacyMarkdown = () =>
  `${header({
    description: `What ${SITE.NAME} collects, why, and who processes it.`,
    path: ROUTES.PRIVACY,
    title: "Privacy Policy",
  })}
- **Last updated**: October 2026

${SITE.NAME} collects only what it needs to send the newsletter, answer messages and run sponsorships. We never sell or rent your data.

## Newsletter subscribers

Your email address, stored with our email provider [Kit](https://kit.com), which sends the confirmation email and every issue and records basic delivery stats (opens, clicks). You can unsubscribe at any time from the link in every email, and we'll delete your address on request.

## Contact form

Your name, email and message are delivered to our inbox by [FormSubmit](https://formsubmit.co) and used only to reply to you.

## Sponsors

When you book a placement, your email and payment are handled by [Dodo Payments](https://dodopayments.com), our merchant of record; we never see your card details. The sponsor content you submit (name, headline, description, link, image) is published in the issues you booked. Your email address is kept with Dodo Payments and is never published.

## Website

The site is hosted on [Vercel](https://vercel.com). We use [Vercel Web Analytics](https://vercel.com/docs/analytics/privacy-policy) to understand aggregate traffic. It sets no cookies and records each page view anonymously: the page and referrer, approximate location (country, region, city), and your browser, operating system and device type. Visitors are counted with a hash of the request that is discarded after 24 hours, so the data can't identify you or follow you across other sites.

Your light/dark theme choice is saved in your browser only.

## Contact

To access or delete your data, email [${LINKS.EMAIL}](mailto:${LINKS.EMAIL}).
`;

/** Markdown twin of `/refunds`. */
export const refundsMarkdown = () =>
  `${header({
    description: `Cancellations, rescheduling and refunds for ${SITE.NAME} sponsorships.`,
    path: ROUTES.REFUNDS,
    title: "Refund Policy",
  })}
- **Last updated**: October 2026

The newsletter is free, so this policy covers sponsorship placements bought on the [sponsor page](${url(ROUTES.SPONSOR)}). There are no subscriptions or recurring charges.

## Full refunds

- We decline your booking during review.
- You cancel at least 7 days before your first booked issue goes out.
- We can't run an issue you booked, or the week was already taken, and you don't want to move to another week.

## Rescheduling instead of a refund

If you cancel less than 7 days before a booked issue, we can move you to another open week at no cost instead of refunding.

## Bundles

For a four-issue bundle, issues that haven't gone out yet follow the rules above. Issues that already went out aren't refundable; if you cancel the rest of a bundle, we refund the unsent issues at the bundle's per-issue price.

## After an issue goes out

A placement that ran as booked isn't refundable. If we made a mistake in your sponsor block (wrong link, wrong copy), tell us and we'll fix the issue page and either refund or run the corrected block in another issue, your choice.

## How to request one

Email [${LINKS.EMAIL}](mailto:${LINKS.EMAIL}) with the email you paid with. Refunds go back to the original payment method through our payment provider, Dodo Payments, and usually arrive within 5–10 business days depending on your bank.
`;

/** Markdown twin of `/sponsor`. */
export const sponsorMarkdown = (stats: SponsorStat[] = []) =>
  `${header({
    description: `Sponsor ${SITE.NAME} and reach shadcn developers, designers, and builders every week.`,
    path: ROUTES.SPONSOR,
    title: "Sponsor",
  })}

Put your product, library, or service in front of developers who actually build with shadcn/ui every day.

## Why sponsor ${SITE.NAME}?

${SITE.NAME} goes out every Monday. It's a curated newsletter for the shadcn ecosystem — new releases, community projects, tutorials, and tools.

This isn't a generic dev blast with 100k subscribers who never open it. The audience here is builders — people who read the changelog, try new component libraries on weekends, and care about clean UI code. If your product speaks to that crowd, this is the place to be.

Sponsorships are limited and the pricing is fair. No programmatic ad slots, no "sponsored by" walls. Every booking is reviewed before it runs.
${
  stats.length > 0
    ? `
## Stats

${stats.map((stat) => `- **${stat.label}**: ${stat.value}`).join("\n")}

Live from our email provider over the last 90 days.
`
    : ""
}
## Placements

${SPONSOR_PLACEMENTS.map(
  (placement) =>
    `- **${placement.title}** — $${placement.price} for ${placement.issues} issue${
      placement.issues === 1 ? "" : "s"
    }: ${placement.description}`
).join("\n")}

Book a placement on the [sponsor page](${url(ROUTES.SPONSOR)}). Payments are processed securely by [Dodo Payments](https://dodopayments.com). Booking means you agree to the [terms](${url(
    ROUTES.TERMS
  )}) and [refunds](${url(ROUTES.REFUNDS)}).
`;

/** Markdown twin of `/terms`. */
export const termsMarkdown = () =>
  `${header({
    description: `Terms for reading ${SITE.NAME} and for buying sponsorship placements.`,
    path: ROUTES.TERMS,
    title: "Terms of Service",
  })}
- **Last updated**: October 2026

${SITE.NAME} is a free weekly newsletter about the shadcn/ui ecosystem, run by ${SITE.AUTHOR.NAME} as an individual and published under ${SITE.ORG.NAME}. By subscribing, reading the site, or buying a sponsorship you agree to these terms.

## The newsletter

Subscribing is free. One issue goes out every Monday, and every issue is also published in the [archive](${url(ROUTES.ISSUES)}). You can unsubscribe at any time from the link in every email. Linked projects belong to their authors; we don't endorse or guarantee third-party products.

## Sponsorships

The [sponsor page](${url(ROUTES.SPONSOR)}) lists the placements we sell, their prices in USD, and the open issue weeks. When you buy a placement:

- You get your sponsor block (name, headline, description, link and image) in the issue(s) for the week(s) you picked, both in the email and on the issue's page on this site. A bundle covers four issues.
- Every booking is reviewed before it runs. We may ask you to change copy, and we decline content that is misleading, illegal, adult, gambling, crypto-investment, or unrelated to developers. A declined booking is refunded in full.
- You're responsible for your content and confirm you have the right to use the name, text, images and links you submit.
- We don't guarantee a number of opens, clicks or conversions.
- Weeks can be booked at least 3 days ahead. To move a week, email us before that issue goes out.

Cancellations and refunds are covered by the [refund policy](${url(ROUTES.REFUNDS)}).

## Payments

Payments are processed by [Dodo Payments](https://dodopayments.com), which acts as the merchant of record: Dodo Payments is the seller of record for your purchase and handles payment processing, sales tax and VAT, and receipts. Your purchase is also subject to Dodo Payments' buyer terms.

## Changes and contact

We may update these terms; the date above shows the latest version, and bookings already paid keep the terms in place when you bought them. Questions? Email [${LINKS.EMAIL}](mailto:${LINKS.EMAIL}) or use the [contact form](${url(ROUTES.CONTACT)}).
`;

/** Markdown twin of `/tools`. */
export const toolsMarkdown = (tools: ToolSummary[]) => {
  const groups = new Map<string, ToolSummary[]>();

  for (const tool of tools) {
    const group = groups.get(tool.category) ?? [];
    group.push(tool);
    groups.set(tool.category, group);
  }

  const sections = TOOL_CATEGORIES.flatMap((category) => {
    const group = groups.get(category);
    if (!group || group.length === 0) {
      return [];
    }

    return `## ${category}

${group
  .map(
    (tool) =>
      `- [${tool.title}](${tool.url}): ${tool.description} (featured in issue #${tool.issue})`
  )
  .join("\n")}`;
  });

  return `${header({
    description: `Hand-picked shadcn tools, libraries, and resources curated by ${SITE.NAME}.`,
    path: ROUTES.TOOLS,
    title: "Tools",
  })}
- **Tools**: ${tools.length}

Hand-picked tools, libraries, and resources from the shadcn ecosystem. Updated weekly.

${sections.join("\n\n")}
`;
};
