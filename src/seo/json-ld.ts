import { LINKS } from "@/constants/links";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";

const absolute = (path: string) => new URL(path, SITE.URL).href;

const author = {
  "@type": "Person",
  name: SITE.AUTHOR.NAME,
  url: SITE.AUTHOR.URL,
};

// Public location from the maintainer's professional profiles. The street
// address is intentionally omitted: it is not published anywhere on the site.
const address = {
  "@type": "PostalAddress",
  addressCountry: "IN",
  addressLocality: "Mumbai",
  addressRegion: "Maharashtra",
};

const contactPoint = {
  "@type": "ContactPoint",
  availableLanguage: ["English"],
  contactType: "customer support",
  email: LINKS.EMAIL,
  url: absolute(ROUTES.CONTACT),
};

// Product terms agents can use to understand what this site covers. Kept in
// sync with the homepage copy and SITE.KEYWORDS.
const KNOWS_ABOUT = [
  "shadcn/ui",
  "shadcn/ui newsletter",
  "Shadcn Weekly newsletter",
  "Tailwind CSS",
  "React components",
  "UI component libraries",
  "design systems",
];

const publisher = {
  "@type": "Organization",
  address,
  contactPoint,
  logo: { "@type": "ImageObject", url: absolute(ROUTES.LOGO) },
  name: SITE.NAME,
  url: SITE.URL,
};

const SCHEMA_CONTEXT = "https://schema.org";

export const websiteJsonLd = () => ({
  "@context": SCHEMA_CONTEXT,
  "@type": "WebSite",
  description: SITE.DESCRIPTION.LONG,
  inLanguage: "en-US",
  keywords: SITE.KEYWORDS.join(", "),
  name: SITE.NAME,
  publisher,
  url: SITE.URL,
});

export const organizationJsonLd = () => ({
  "@context": SCHEMA_CONTEXT,
  "@type": "Organization",
  address,
  contactPoint,
  description: SITE.DESCRIPTION.LONG,
  founder: author,
  keywords: SITE.KEYWORDS.join(", "),
  knowsAbout: KNOWS_ABOUT,
  logo: absolute(ROUTES.LOGO),
  name: SITE.NAME,
  parentOrganization: {
    "@type": "Organization",
    name: SITE.ORG.NAME,
    url: SITE.ORG.URL,
  },
  sameAs: [LINKS.X, LINKS.GITHUB],
  url: SITE.URL,
});

export const breadcrumbJsonLd = (items: { name: string; path: string }[]) => ({
  "@context": SCHEMA_CONTEXT,
  "@type": "BreadcrumbList",
  itemListElement: [{ name: "Home", path: ROUTES.HOME }, ...items].map(
    (item, index) => ({
      "@type": "ListItem",
      item: absolute(item.path),
      name: item.name,
      position: index + 1,
    })
  ),
});

export const issueJsonLd = (issue: {
  date: Date;
  description: string;
  image: string;
  number: number;
  path: string;
  title: string;
}) => ({
  "@context": SCHEMA_CONTEXT,
  "@type": "NewsArticle",
  author,
  dateModified: issue.date.toISOString(),
  datePublished: issue.date.toISOString(),
  description: issue.description,
  headline: issue.title,
  image: [absolute(issue.image)],
  isPartOf: {
    "@type": "PublicationIssue",
    isPartOf: { "@type": "Periodical", name: SITE.NAME, url: SITE.URL },
    issueNumber: issue.number,
  },
  mainEntityOfPage: absolute(issue.path),
  publisher,
});
