import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import sharp from "sharp";

import { HOUSE_SPONSOR, SPONSOR_BOOKINGS } from "@/constants/sponsor-bookings";
import { fetchPageMeta } from "@/lib/page-meta";
import { isSvgUrl, sponsorLogoHost } from "@/lib/sponsor-logo";

export const prerender = true;

const LOGO_SIZE = 96;
const FETCH_TIMEOUT_MS = 8000;

export const getStaticPaths = (async () => {
  const issues = await getCollection("archive");
  const websites = new Set([
    HOUSE_SPONSOR.website,
    ...SPONSOR_BOOKINGS.map((booking) => booking.website),
    ...issues.flatMap((issue) => issue.data.sponsor ?? []),
  ]);
  const byHost = new Map(
    [...websites].map((website) => [sponsorLogoHost(website), website])
  );

  const paths = await Promise.all(
    [...byHost].map(async ([host, website]) => {
      const { logo } = await fetchPageMeta(website);
      if (!logo || !isSvgUrl(logo)) {
        return [];
      }
      try {
        const response = await fetch(logo, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!response.ok) {
          return [];
        }
        const svg = new Uint8Array(await response.arrayBuffer());
        return [{ params: { host }, props: { svg } }];
      } catch {
        return [];
      }
    })
  );
  return paths.flat();
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await sharp(props.svg as Uint8Array, { density: 384 })
    .resize(LOGO_SIZE, LOGO_SIZE, {
      background: { alpha: 0, b: 0, g: 0, r: 0 },
      fit: "contain",
    })
    .png()
    .toBuffer();
  return new Response(Uint8Array.from(png).buffer, {
    headers: { "Content-Type": "image/png" },
  });
};
