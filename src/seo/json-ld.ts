import { LINKS } from "@/constants/links";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";

const absolute = (path: string) => new URL(path, SITE.URL).href;

const author = {
  "@type": "Person",
  name: SITE.AUTHOR.NAME,
  url: SITE.AUTHOR.URL,
};

const publisher = {
  "@type": "Organization",
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
  name: SITE.NAME,
  publisher,
  url: SITE.URL,
});

export const organizationJsonLd = () => ({
  "@context": SCHEMA_CONTEXT,
  "@type": "Organization",
  description: SITE.DESCRIPTION.LONG,
  founder: author,
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
