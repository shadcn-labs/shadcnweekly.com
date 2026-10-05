export const isSvgUrl = (url: string) => /\.svg(?:$|[?#])/iu.test(url);

export const sponsorLogoHost = (website: string) =>
  new URL(website).hostname.toLowerCase().replace(/^www\./u, "");
