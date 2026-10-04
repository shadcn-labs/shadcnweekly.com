import { SITE } from "@/constants/site";

export const withUtm = (url: string, placement: string): string => {
  const target = new URL(url);
  target.searchParams.set("utm_medium", "referral");
  target.searchParams.set(
    "utm_source",
    new URL(SITE.URL).hostname.replace(/^www\./u, "")
  );
  target.searchParams.set("utm_campaign", placement);
  return target.toString();
};
