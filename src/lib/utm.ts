// One UTM convention for every outbound link we control, on the site and in
// emails, so partners see Shadcn Weekly traffic consistently:
//   utm_source=shadcnweekly
//   utm_medium=newsletter (emails) | referral (website)
//   utm_campaign=issue-N for issue placements, else the site area (footer, tools)
//   utm_content=the placement (together-with, sponsor-block, tool-card, …)
// Kept dependency-free so scripts/newsletter can import it.

export const UTM_SOURCE = "shadcnweekly";

interface UtmTags {
  medium: "newsletter" | "referral";
  campaign: string;
  content?: string;
}

export const FOOTER_UTM: UtmTags = { campaign: "footer", medium: "referral" };

/** Adds UTM tags to an external URL; params the target already set are kept. */
export const withUtm = (
  url: string,
  { campaign, content, medium }: UtmTags,
  siteHost?: string
) => {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return url;
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return url;
  }
  const host = target.hostname.replace(/^www\./u, "");
  if (host === siteHost?.replace(/^www\./u, "")) {
    return url;
  }
  const tags = {
    utm_campaign: campaign,
    utm_content: content,
    utm_medium: medium,
    utm_source: UTM_SOURCE,
  };
  for (const [key, value] of Object.entries(tags)) {
    if (value && !target.searchParams.has(key)) {
      target.searchParams.set(key, value);
    }
  }
  return target.href;
};

/** `issue-N` for pages under /issues/N, else null. */
export const issueCampaign = (pathname: string) => {
  const issue = /^\/issues\/(?<issue>\d+)/u.exec(pathname)?.groups?.issue;
  return issue ? `issue-${issue}` : null;
};
