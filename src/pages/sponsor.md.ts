import { markdownResponse } from "@dualmark/core";
import type { APIRoute } from "astro";

import { getAudienceStats, getSponsorClickRate } from "@/lib/kit";
import { sponsorMarkdown } from "@/lib/page-markdown";

// Rendered on demand so the audience stats stay fresh, like the HTML page.
export const prerender = false;

const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400";

const formatRate = (rate: number) =>
  `${rate.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;

export const GET: APIRoute = async () => {
  const [audience, sponsorClickRate] = await Promise.all([
    getAudienceStats(),
    getSponsorClickRate(),
  ]);

  const stats = audience
    ? [
        audience.subscribers === null
          ? null
          : {
              label: "Subscribers",
              value: `${audience.subscribers.toLocaleString("en-US")}+`,
            },
        audience.openRate === null
          ? null
          : {
              label: "Avg. open rate",
              value: formatRate(audience.openRate),
            },
        audience.clickRate === null
          ? null
          : {
              label: "Avg. click rate",
              value: formatRate(audience.clickRate),
            },
        sponsorClickRate === null
          ? null
          : {
              label: "Sponsorship CTR",
              value: formatRate(sponsorClickRate),
            },
      ].filter((stat) => stat !== null)
    : [];

  return markdownResponse(sponsorMarkdown(stats), {
    cacheControl: CACHE_CONTROL,
  });
};
