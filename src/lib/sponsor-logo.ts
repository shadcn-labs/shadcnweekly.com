/** Shared by the logo conversion route and the email renderer. */

export const isSvgUrl = (url: string) => /\.svg(?:$|[?#])/iu.test(url);

/** Route param for `/email/sponsor-logos/<host>.png`, e.g. `shadcn-labs.com`. */
export const sponsorLogoHost = (website: string) =>
  new URL(website).hostname.toLowerCase().replace(/^www\./u, "");
